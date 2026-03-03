// tests/migration-scripts.test.js
// Tests for migration scripts — idempotency and key steps.
//
// Scope:
//   - Schema SQL migration idempotency (run migrate.sql twice)
//   - seed.js idempotency (already covered by seed.test.js; here we verify ON CONFLICT)
//   - migrate-v2.js Step C: search_vector refresh for pages missing it
//   - migrate-v2.js helpers: extractTitle (tested inline), scanVault (tested with tmp dir)
//   - migrate-nocodb.js: mapType function tested inline
//
// Step A (vault file → DB) and Step B (DB page → vault file) require VAULT_DIR
// and are integration-tested via vault-sync.test.js.

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { Pool } = require('pg');
const db   = require('../services/database');

const SCHEMA = 'knowledge_base';

// ── Schema migration idempotency ─────────────────────────────

describe('schema migration', () => {
  test('migrate.sql is idempotent — running it again does not throw', async () => {
    const { Pool: PgPool } = require('pg');
    const pool = new PgPool({ connectionString: process.env.DATABASE_URL });
    const sql = fs.readFileSync(path.join(__dirname, '../scripts/migrate.sql'), 'utf8');
    try {
      await pool.query(sql);
    } finally {
      await pool.end();
    }
    // If we reach here, the migration was idempotent
    expect(true).toBe(true);
  });

  test('all 12 tables exist after migration', async () => {
    const pool = db.getPool();
    const res = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'knowledge_base'
      ORDER BY table_name
    `);
    const tables = res.rows.map(r => r.table_name);
    const expected = [
      'api_tokens', 'asset_relationships', 'asset_versions',
      'assets', 'page_versions', 'pages', 'sections',
      'sessions', 'settings', 'templates', 'users', 'workspaces',
    ];
    for (const t of expected) {
      expect(tables).toContain(t);
    }
  });
});

// ── Seed idempotency ─────────────────────────────────────────

describe('seed idempotency', () => {
  test('inserting a workspace twice via ON CONFLICT does not create a duplicate', async () => {
    const pool = db.getPool();
    // Insert workspace that already exists
    await pool.query(`
      INSERT INTO ${SCHEMA}.workspaces (name, slug, icon, sort_order)
      VALUES ('Operations', 'operations', 'monitor', 1)
      ON CONFLICT (slug) DO NOTHING
    `);
    const res = await pool.query(
      `SELECT COUNT(*) FROM ${SCHEMA}.workspaces WHERE slug = 'operations'`
    );
    expect(Number(res.rows[0].count)).toBe(1);
  });
});

// ── Step C: search_vector refresh ────────────────────────────
//
// search_vector is GENERATED ALWAYS AS (to_tsvector(...)) STORED, so it is
// never NULL and cannot be manually set. Step C in migrate-v2.js is a safe
// no-op on this schema: the WHERE search_vector IS NULL clause matches 0 rows.
// These tests verify the GENERATED column behaviour and Step C idempotency.

describe('migrate-v2 Step C — search_vector refresh', () => {
  let testPageId;

  beforeAll(async () => {
    const pool = db.getPool();
    const sec = await pool.query(`SELECT id FROM ${SCHEMA}.sections LIMIT 1`);
    const sectionId = sec.rows[0].id;

    // Insert a normal page — search_vector is auto-generated (cannot be NULL)
    const res = await pool.query(`
      INSERT INTO ${SCHEMA}.pages
        (section_id, title, slug, content, status, created_by)
      VALUES ($1, $2, $3, $4, 'draft', 'user')
      RETURNING id
    `, [sectionId, 'Step C Test Page', 'step-c-test-' + Date.now(), '# Step C test content']);
    testPageId = res.rows[0].id;
  });

  afterAll(async () => {
    if (testPageId) {
      await db.getPool().query(`DELETE FROM ${SCHEMA}.pages WHERE id = $1`, [testPageId]);
    }
  });

  test('search_vector is always populated — GENERATED ALWAYS AS never null', async () => {
    // The column is GENERATED ALWAYS AS — inserting any page auto-populates it
    const pool = db.getPool();
    const res = await pool.query(
      `SELECT search_vector IS NOT NULL AS has_vector FROM ${SCHEMA}.pages WHERE id = $1`,
      [testPageId]
    );
    expect(res.rows[0].has_vector).toBe(true);
  });

  test('Step C query finds zero pages with null search_vector', async () => {
    // Because search_vector is GENERATED ALWAYS AS, WHERE search_vector IS NULL
    // matches nothing — Step C is a safe no-op on this schema
    const pool = db.getPool();
    const res = await pool.query(`
      SELECT id FROM ${SCHEMA}.pages
      WHERE deleted_at IS NULL AND search_vector IS NULL
    `);
    expect(res.rowCount).toBe(0);
  });

  test('Step C is idempotent — a second check also finds zero null search_vectors', async () => {
    const pool = db.getPool();
    const res = await pool.query(`
      SELECT id FROM ${SCHEMA}.pages
      WHERE deleted_at IS NULL AND search_vector IS NULL
    `);
    expect(res.rowCount).toBe(0);
  });
});

// ── Helper: extractTitle ─────────────────────────────────────

describe('extractTitle (inline test)', () => {
  // Replicate the helper from migrate-v2.js to test in isolation
  function extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  test('extracts H1 from markdown', () => {
    expect(extractTitle('# My Title\n\nBody text.')).toBe('My Title');
  });

  test('returns null when no H1', () => {
    expect(extractTitle('## Subtitle\n\nBody.')).toBeNull();
    expect(extractTitle('Body without heading.')).toBeNull();
  });

  test('handles leading spaces in H1', () => {
    expect(extractTitle('#   Spaced Title  \nBody')).toBe('Spaced Title');
  });
});

// ── Helper: scanVault ────────────────────────────────────────

describe('scanVault (inline test)', () => {
  // Replicate the helper from migrate-v2.js to test in isolation
  function scanVault(dir, base = dir) {
    const results = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...scanVault(abs, base));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(path.relative(base, abs));
        }
      }
    } catch { /* skip unreadable dirs */ }
    return results;
  }

  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-vault-'));
    fs.mkdirSync(path.join(tmpDir, 'workspace1', 'section1'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'workspace1', 'section1', 'page.md'), '# Page');
    fs.writeFileSync(path.join(tmpDir, 'workspace1', 'readme.md'), '# Readme');
    fs.writeFileSync(path.join(tmpDir, 'workspace1', 'section1', 'image.png'), 'data');
    fs.mkdirSync(path.join(tmpDir, '.hidden'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.hidden', 'secret.md'), 'hidden');
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('finds markdown files recursively', () => {
    const files = scanVault(tmpDir);
    expect(files).toContain(path.join('workspace1', 'section1', 'page.md'));
    expect(files).toContain(path.join('workspace1', 'readme.md'));
  });

  test('excludes non-markdown files', () => {
    const files = scanVault(tmpDir);
    const hasNonMd = files.some(f => !f.endsWith('.md'));
    expect(hasNonMd).toBe(false);
  });

  test('excludes hidden directories', () => {
    const files = scanVault(tmpDir);
    const hasHidden = files.some(f => f.includes('.hidden'));
    expect(hasHidden).toBe(false);
  });
});

// ── mapType (from migrate-nocodb.js) ────────────────────────

describe('mapType (inline test)', () => {
  function mapType(nocoType) {
    const map = {
      'skill': 'skill', 'config': 'config', 'configuration': 'config',
      'decision': 'decision', 'session': 'session', 'session-log': 'session',
      'image': 'image', 'file': 'file', 'link': 'link', 'miro': 'miro',
      'agent': 'file', 'plan': 'file', 'reference': 'file', 'deliverable': 'file',
    };
    return map[nocoType?.toLowerCase()] || 'file';
  }

  test('maps known types correctly', () => {
    expect(mapType('skill')).toBe('skill');
    expect(mapType('configuration')).toBe('config');
    expect(mapType('session-log')).toBe('session');
    expect(mapType('agent')).toBe('file');
  });

  test('falls back to file for unknown types', () => {
    expect(mapType('unknown')).toBe('file');
    expect(mapType(null)).toBe('file');
    expect(mapType(undefined)).toBe('file');
  });

  test('case insensitive', () => {
    expect(mapType('SKILL')).toBe('skill');
    expect(mapType('Config')).toBe('config');
  });
});
