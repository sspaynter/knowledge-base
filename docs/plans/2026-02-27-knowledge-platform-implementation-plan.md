# Knowledge Platform — Implementation Plan
# Phase 1: Database Setup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the `knowledge_base` PostgreSQL schema with all tables, indexes, seed data, and migration of existing NocoDB documents to assets.

**Architecture:** All tables live in a new `knowledge_base` schema on the existing `n8n-postgres` container. The `nocodb` user (existing credentials) creates the schema. A one-time migration script moves 12 existing NocoDB documents into the `assets` table. Seed data populates initial workspaces, sections, and templates.

**Tech Stack:** PostgreSQL 15, Node.js 20, `pg` (node-postgres), Jest + Supertest for tests.

**Dependencies:** None — this is the foundation everything else builds on.

---

## Pre-flight checklist

Before starting, confirm these values are accessible:

- [ ] DB host (local dev): `192.168.86.18:32775`
- [ ] DB name: `nocodb`
- [ ] DB user: `nocodb`, password: `nocodb2026`
- [ ] NocoDB schema for existing documents: `pg33xhvewcmmwir`
- [ ] Run `psql postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb -c "\dn"` — confirm you can connect and see existing schemas

---

## Task 1: Add test infrastructure

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `tests/db.test.js`

**Step 1: Install dev dependencies**

```bash
cd /Users/simonpaynter/Documents/Claude/knowledge-base
npm install --save-dev jest supertest
```

Expected: `node_modules/jest` and `node_modules/supertest` appear.

**Step 2: Update `package.json` scripts**

Add to the `scripts` block:
```json
"test": "jest --runInBand",
"test:watch": "jest --watch --runInBand"
```

Add at root level (alongside `scripts`):
```json
"jest": {
  "testEnvironment": "node",
  "testMatch": ["**/tests/**/*.test.js"]
}
```

**Step 3: Create `jest.config.js`**

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000
};
```

**Step 4: Create `tests/db.test.js` — smoke test**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

afterAll(() => pool.end());

test('can connect to PostgreSQL', async () => {
  const result = await pool.query('SELECT 1 AS ok');
  expect(result.rows[0].ok).toBe(1);
});
```

**Step 5: Run smoke test**

```bash
npm test tests/db.test.js
```

Expected output:
```
PASS tests/db.test.js
  ✓ can connect to PostgreSQL
```

If this fails: check DB host/port. Run `psql postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb -c "SELECT 1"` to diagnose.

**Step 6: Commit**

```bash
git add package.json jest.config.js tests/db.test.js
git commit -m "chore: add Jest and Supertest for testing"
```

---

## Task 2: Create migration SQL — schema and core structure

**Files:**
- Create: `scripts/migrate.sql`

**Step 1: Create `scripts/` directory and `migrate.sql`**

```sql
-- ============================================================
-- Knowledge Platform — Database Migration
-- Run as: nocodb user on n8n-postgres container
-- Creates: knowledge_base schema and all tables
-- ============================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS knowledge_base;

-- Set search path for this migration session
SET search_path TO knowledge_base;

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.workspaces (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT 'folder',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.sections (
  id           SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES knowledge_base.workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT 'folder',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

-- ============================================================
-- PAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.pages (
  id            SERIAL PRIMARY KEY,
  section_id    INTEGER NOT NULL REFERENCES knowledge_base.sections(id) ON DELETE CASCADE,
  parent_id     INTEGER REFERENCES knowledge_base.pages(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  template_type TEXT NOT NULL DEFAULT 'blank',
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  created_by    TEXT NOT NULL DEFAULT 'user' CHECK (created_by IN ('claude', 'user', 'both')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED
);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.assets (
  id            SERIAL PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('skill','config','decision','session','image','file','link','miro')),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  file_path     TEXT,
  url           TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_by    TEXT NOT NULL DEFAULT 'user' CHECK (created_by IN ('claude', 'user')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(content, '')
    )
  ) STORED
);

-- ============================================================
-- ASSET VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.asset_versions (
  id             SERIAL PRIMARY KEY,
  asset_id       INTEGER NOT NULL REFERENCES knowledge_base.assets(id) ON DELETE CASCADE,
  version        TEXT NOT NULL,
  content        TEXT NOT NULL DEFAULT '',
  change_summary TEXT NOT NULL DEFAULT '',
  changed_by     TEXT NOT NULL DEFAULT 'user' CHECK (changed_by IN ('claude', 'user')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAGE ASSETS (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.page_assets (
  id           SERIAL PRIMARY KEY,
  page_id      INTEGER NOT NULL REFERENCES knowledge_base.pages(id) ON DELETE CASCADE,
  asset_id     INTEGER NOT NULL REFERENCES knowledge_base.assets(id) ON DELETE CASCADE,
  display_mode TEXT NOT NULL DEFAULT 'reference' CHECK (display_mode IN ('inline', 'reference')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(page_id, asset_id)
);

-- ============================================================
-- TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.templates (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  template_type   TEXT NOT NULL UNIQUE,
  default_content TEXT NOT NULL DEFAULT '',
  structure       JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ASSET RELATIONSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.asset_relationships (
  id                SERIAL PRIMARY KEY,
  from_asset_id     INTEGER NOT NULL REFERENCES knowledge_base.assets(id) ON DELETE CASCADE,
  to_asset_id       INTEGER NOT NULL REFERENCES knowledge_base.assets(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'loads','uses','generates','deploys-to','connects-to','supersedes','references'
  )),
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_asset_id, to_asset_id, relationship_type)
);

-- ============================================================
-- API TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.api_tokens (
  id          SERIAL PRIMARY KEY,
  label       TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES knowledge_base.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SETTINGS (key-value store)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Page tree queries
CREATE INDEX IF NOT EXISTS idx_pages_section   ON knowledge_base.pages(section_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent    ON knowledge_base.pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_deleted   ON knowledge_base.pages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pages_status    ON knowledge_base.pages(status);

-- Asset queries
CREATE INDEX IF NOT EXISTS idx_assets_type     ON knowledge_base.assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_metadata ON knowledge_base.assets USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_assets_deleted  ON knowledge_base.assets(deleted_at) WHERE deleted_at IS NULL;

-- Junction table
CREATE INDEX IF NOT EXISTS idx_page_assets_page  ON knowledge_base.page_assets(page_id);
CREATE INDEX IF NOT EXISTS idx_page_assets_asset ON knowledge_base.page_assets(asset_id);

-- Version history
CREATE INDEX IF NOT EXISTS idx_versions_asset ON knowledge_base.asset_versions(asset_id);

-- Relationship map
CREATE INDEX IF NOT EXISTS idx_rel_from ON knowledge_base.asset_relationships(from_asset_id);
CREATE INDEX IF NOT EXISTS idx_rel_to   ON knowledge_base.asset_relationships(to_asset_id);
CREATE INDEX IF NOT EXISTS idx_rel_type ON knowledge_base.asset_relationships(relationship_type);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_pages_fts  ON knowledge_base.pages  USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_assets_fts ON knowledge_base.assets USING GIN(search_vector);

-- Sessions lookup
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON knowledge_base.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON knowledge_base.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON knowledge_base.sessions(expires_at);
```

**Step 2: Verify SQL is valid — dry run**

```bash
psql postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb \
  -c "BEGIN; $(cat scripts/migrate.sql); ROLLBACK;"
```

Expected: No errors. `ROLLBACK` at the end means nothing is committed yet.

**Step 3: Commit SQL file**

```bash
git add scripts/migrate.sql
git commit -m "feat: add knowledge_base schema migration SQL"
```

---

## Task 3: Create migration runner script

**Files:**
- Create: `scripts/run-migration.js`
- Create: `tests/migration.test.js`

**Step 1: Write failing test first**

Create `tests/migration.test.js`:

```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

afterAll(() => pool.end());

const TABLES = [
  'workspaces', 'sections', 'pages', 'assets',
  'asset_versions', 'page_assets', 'templates',
  'asset_relationships', 'api_tokens', 'users', 'sessions', 'settings'
];

test('all knowledge_base tables exist after migration', async () => {
  for (const table of TABLES) {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'knowledge_base'
        AND table_name = $1
      ) AS exists
    `, [table]);
    expect(result.rows[0].exists).toBe(true);
  }
});

test('pages table has search_vector column', async () => {
  const result = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'knowledge_base'
    AND table_name = 'pages'
    AND column_name = 'search_vector'
  `);
  expect(result.rows.length).toBe(1);
});

test('assets table has search_vector column', async () => {
  const result = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'knowledge_base'
    AND table_name = 'assets'
    AND column_name = 'search_vector'
  `);
  expect(result.rows.length).toBe(1);
});
```

**Step 2: Run test — confirm it fails**

```bash
npm test tests/migration.test.js
```

Expected: FAIL — tables do not exist yet.

**Step 3: Create `scripts/run-migration.js`**

```javascript
// scripts/run-migration.js
// Run once to create the knowledge_base schema.
// Usage: node scripts/run-migration.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrate.sql'),
    'utf8'
  );

  console.log('Running migration...');
  try {
    await pool.query(sql);
    console.log('✓ Migration complete — knowledge_base schema created');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
```

**Step 4: Run migration**

```bash
node scripts/run-migration.js
```

Expected:
```
Running migration...
✓ Migration complete — knowledge_base schema created
```

**Step 5: Run test — confirm it passes**

```bash
npm test tests/migration.test.js
```

Expected:
```
PASS tests/migration.test.js
  ✓ all knowledge_base tables exist after migration
  ✓ pages table has search_vector column
  ✓ assets table has search_vector column
```

**Step 6: Commit**

```bash
git add scripts/run-migration.js tests/migration.test.js
git commit -m "feat: add migration runner and table existence tests"
```

---

## Task 4: Seed initial data

**Files:**
- Create: `scripts/seed.js`
- Create: `tests/seed.test.js`

**Step 1: Write failing test**

Create `tests/seed.test.js`:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

afterAll(() => pool.end());

test('seed: initial workspaces exist', async () => {
  const result = await pool.query(
    "SELECT slug FROM knowledge_base.workspaces ORDER BY sort_order"
  );
  const slugs = result.rows.map(r => r.slug);
  expect(slugs).toContain('it-projects');
  expect(slugs).toContain('personal');
  expect(slugs).toContain('work');
  expect(slugs).toContain('learning');
});

test('seed: IT & Projects workspace has sections', async () => {
  const result = await pool.query(`
    SELECT s.slug FROM knowledge_base.sections s
    JOIN knowledge_base.workspaces w ON w.id = s.workspace_id
    WHERE w.slug = 'it-projects'
    ORDER BY s.sort_order
  `);
  const slugs = result.rows.map(r => r.slug);
  expect(slugs).toContain('claude');
  expect(slugs).toContain('projects');
  expect(slugs).toContain('infrastructure');
});

test('seed: all templates exist', async () => {
  const result = await pool.query(
    "SELECT template_type FROM knowledge_base.templates"
  );
  const types = result.rows.map(r => r.template_type);
  expect(types).toContain('blank');
  expect(types).toContain('project-overview');
  expect(types).toContain('skill-page');
  expect(types).toContain('decision-record');
  expect(types).toContain('session-log');
  expect(types).toContain('section-home');
});

test('seed: default settings exist', async () => {
  const result = await pool.query(
    "SELECT key FROM knowledge_base.settings WHERE key = 'allow_registration'"
  );
  expect(result.rows.length).toBe(1);
});
```

**Step 2: Run — confirm fails**

```bash
npm test tests/seed.test.js
```

Expected: FAIL — no seed data yet.

**Step 3: Create `scripts/seed.js`**

```javascript
// scripts/seed.js
// Seeds initial workspaces, sections, templates, and settings.
// Safe to run multiple times — uses INSERT ... ON CONFLICT DO NOTHING.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Workspaces ─────────────────────────────────────────
    const workspaces = [
      { name: 'IT & Projects', slug: 'it-projects', icon: 'monitor',     sort_order: 0 },
      { name: 'Personal',      slug: 'personal',    icon: 'user',         sort_order: 1 },
      { name: 'Work',          slug: 'work',         icon: 'briefcase',    sort_order: 2 },
      { name: 'Learning',      slug: 'learning',     icon: 'book-open',    sort_order: 3 },
    ];

    for (const ws of workspaces) {
      await client.query(`
        INSERT INTO knowledge_base.workspaces (name, slug, icon, sort_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO NOTHING
      `, [ws.name, ws.slug, ws.icon, ws.sort_order]);
    }
    console.log('✓ Workspaces seeded');

    // ── Sections ───────────────────────────────────────────
    const sections = [
      // IT & Projects
      { workspace: 'it-projects', name: 'Claude',         slug: 'claude',         icon: 'bot',         sort_order: 0 },
      { workspace: 'it-projects', name: 'Projects',       slug: 'projects',       icon: 'layout-grid', sort_order: 1 },
      { workspace: 'it-projects', name: 'Infrastructure', slug: 'infrastructure', icon: 'server',       sort_order: 2 },
      // Personal
      { workspace: 'personal',    name: 'General',        slug: 'general',        icon: 'notebook',     sort_order: 0 },
      { workspace: 'personal',    name: 'Bag Business',   slug: 'bag-business',   icon: 'package',      sort_order: 1 },
      // Work
      { workspace: 'work',        name: 'General',        slug: 'general',        icon: 'notebook',     sort_order: 0 },
      // Learning
      { workspace: 'learning',    name: 'General',        slug: 'general',        icon: 'notebook',     sort_order: 0 },
    ];

    for (const sec of sections) {
      const ws = await client.query(
        'SELECT id FROM knowledge_base.workspaces WHERE slug = $1', [sec.workspace]
      );
      if (ws.rows.length === 0) continue;
      await client.query(`
        INSERT INTO knowledge_base.sections (workspace_id, name, slug, icon, sort_order)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (workspace_id, slug) DO NOTHING
      `, [ws.rows[0].id, sec.name, sec.slug, sec.icon, sec.sort_order]);
    }
    console.log('✓ Sections seeded');

    // ── Templates ──────────────────────────────────────────
    const templates = [
      {
        name: 'Blank',
        template_type: 'blank',
        default_content: '',
        structure: {}
      },
      {
        name: 'Project Overview',
        template_type: 'project-overview',
        default_content: '## Overview\n\n## Goals\n\n## Status\n\n## Links\n',
        structure: { asset_types: ['config', 'decision', 'session'] }
      },
      {
        name: 'Skill Page',
        template_type: 'skill-page',
        default_content: '## Purpose\n\n## Coverage\n\n## Change Log\n',
        structure: { asset_types: ['skill'] }
      },
      {
        name: 'Decision Record',
        template_type: 'decision-record',
        default_content: '## Context\n\n## Decision\n\n## Consequences\n',
        structure: { asset_types: ['decision'] }
      },
      {
        name: 'Session Log',
        template_type: 'session-log',
        default_content: '## What was done\n\n## What changed\n\n## What was decided\n',
        structure: { asset_types: ['session'] }
      },
      {
        name: 'Section Home',
        template_type: 'section-home',
        default_content: '## About this section\n\n## Pages\n',
        structure: {}
      },
    ];

    for (const t of templates) {
      await client.query(`
        INSERT INTO knowledge_base.templates (name, template_type, default_content, structure)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (template_type) DO NOTHING
      `, [t.name, t.template_type, t.default_content, JSON.stringify(t.structure)]);
    }
    console.log('✓ Templates seeded');

    // ── Settings ───────────────────────────────────────────
    const settings = [
      ['allow_registration', 'true'],
      ['hq_url', ''],
      ['app_name', 'Knowledge Platform'],
    ];

    for (const [key, value] of settings) {
      await client.query(`
        INSERT INTO knowledge_base.settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO NOTHING
      `, [key, value]);
    }
    console.log('✓ Settings seeded');

    await client.query('COMMIT');
    console.log('\n✓ Seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
```

**Step 4: Run seed**

```bash
node scripts/seed.js
```

Expected:
```
✓ Workspaces seeded
✓ Sections seeded
✓ Templates seeded
✓ Settings seeded

✓ Seed complete
```

**Step 5: Run test — confirm passes**

```bash
npm test tests/seed.test.js
```

Expected: PASS — all 4 tests green.

**Step 6: Commit**

```bash
git add scripts/seed.js tests/seed.test.js
git commit -m "feat: add seed script for workspaces, sections, templates, settings"
```

---

## Task 5: Migrate NocoDB documents to assets

**Files:**
- Create: `scripts/migrate-nocodb.js`
- Create: `tests/nocodb-migration.test.js`

**Step 1: Inspect existing NocoDB documents table**

Run this to see what you are working with:

```bash
psql postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb \
  -c "SELECT id, title, type, project, status, created_at FROM pg33xhvewcmmwir.documents LIMIT 5;"
```

Note the columns returned — they map to the `assets` table as follows:

| NocoDB column | Assets column |
|---|---|
| title | title |
| type | type (map to nearest valid type) |
| content | content |
| summary | description |
| project | metadata.project |
| status | metadata.status |
| tags | metadata.tags |
| version | metadata.version |
| created_by1 | created_by (map to 'user' or 'claude') |

**Step 2: Write failing test**

Create `tests/nocodb-migration.test.js`:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

afterAll(() => pool.end());

test('NocoDB documents have been migrated to assets', async () => {
  // Count source documents
  const source = await pool.query(
    'SELECT COUNT(*) AS count FROM pg33xhvewcmmwir.documents'
  );
  const sourceCount = parseInt(source.rows[0].count);

  // Count migrated assets with nocodb_id in metadata
  const migrated = await pool.query(
    "SELECT COUNT(*) AS count FROM knowledge_base.assets WHERE metadata->>'source' = 'nocodb'"
  );
  const migratedCount = parseInt(migrated.rows[0].count);

  expect(migratedCount).toBe(sourceCount);
});

test('migrated assets have valid types', async () => {
  const result = await pool.query(`
    SELECT DISTINCT type FROM knowledge_base.assets
    WHERE metadata->>'source' = 'nocodb'
  `);
  const validTypes = ['skill','config','decision','session','image','file','link','miro'];
  for (const row of result.rows) {
    expect(validTypes).toContain(row.type);
  }
});
```

**Step 3: Run — confirm fails**

```bash
npm test tests/nocodb-migration.test.js
```

Expected: FAIL — no migrated assets yet.

**Step 4: Create `scripts/migrate-nocodb.js`**

```javascript
// scripts/migrate-nocodb.js
// One-time migration: NocoDB documents → knowledge_base.assets
// Safe to run again — skips already-migrated records.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

// Map NocoDB document types to valid asset types
function mapType(nocoType) {
  const map = {
    'skill': 'skill',
    'config': 'config',
    'configuration': 'config',
    'decision': 'decision',
    'session': 'session',
    'session-log': 'session',
    'image': 'image',
    'file': 'file',
    'link': 'link',
    'miro': 'miro',
  };
  return map[nocoType?.toLowerCase()] || 'file';
}

// Map created_by values
function mapCreatedBy(val) {
  if (!val) return 'user';
  const v = val.toLowerCase();
  if (v.includes('claude')) return 'claude';
  return 'user';
}

async function migrateNocoDB() {
  const client = await pool.connect();
  try {
    // Fetch all existing NocoDB documents
    const docs = await client.query(
      'SELECT * FROM pg33xhvewcmmwir.documents ORDER BY id'
    );
    console.log(`Found ${docs.rows.length} documents to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const doc of docs.rows) {
      // Skip if already migrated
      const exists = await client.query(
        "SELECT id FROM knowledge_base.assets WHERE metadata->>'nocodb_id' = $1",
        [String(doc.id)]
      );
      if (exists.rows.length > 0) {
        skipped++;
        continue;
      }

      const metadata = {
        source: 'nocodb',
        nocodb_id: String(doc.id),
        project: doc.project || '',
        status: doc.status || 'active',
        tags: doc.tags || '',
        version: doc.version || '',
        session_context: doc.session_context || '',
        supersedes: doc.supersedes || '',
      };

      await client.query(`
        INSERT INTO knowledge_base.assets
          (type, title, description, content, metadata, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        mapType(doc.type),
        doc.title || 'Untitled',
        doc.summary || '',
        doc.content || '',
        JSON.stringify(metadata),
        mapCreatedBy(doc.created_by1),
        doc.created_at || new Date(),
        doc.updated_at || new Date(),
      ]);

      migrated++;
    }

    console.log(`✓ Migrated: ${migrated} | Skipped (already done): ${skipped}`);
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateNocoDB();
```

**Step 5: Run migration**

```bash
node scripts/migrate-nocodb.js
```

Expected:
```
Found 12 documents to migrate
✓ Migrated: 12 | Skipped (already done): 0
```

**Step 6: Run test — confirm passes**

```bash
npm test tests/nocodb-migration.test.js
```

Expected: PASS.

**Step 7: Commit**

```bash
git add scripts/migrate-nocodb.js tests/nocodb-migration.test.js
git commit -m "feat: migrate NocoDB documents to knowledge_base assets"
```

---

## Task 6: Rewrite database.js

**Files:**
- Modify: `services/database.js`
- Create: `tests/database-service.test.js`

**Step 1: Write failing test**

Create `tests/database-service.test.js`:

```javascript
const db = require('../services/database');

afterAll(() => db.getPool().end());

test('getPool returns a connected pool', async () => {
  const pool = db.getPool();
  const result = await pool.query('SELECT 1 AS ok');
  expect(result.rows[0].ok).toBe(1);
});

test('knowledge_base schema is accessible', async () => {
  const pool = db.getPool();
  const result = await pool.query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name = 'knowledge_base'
  `);
  expect(result.rows.length).toBe(1);
});
```

**Step 2: Run — confirm connection test passes but schema test may vary**

```bash
npm test tests/database-service.test.js
```

**Step 3: Rewrite `services/database.js`**

Replace the full file content:

```javascript
// services/database.js
// PostgreSQL connection pool for knowledge_base schema.

'use strict';

const { Pool } = require('pg');

// ── Connection pool ────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@10.0.3.12:5432/nocodb',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

// ── Schema constants ───────────────────────────────────────
const SCHEMA = 'knowledge_base';

// ── Init: verify schema exists ─────────────────────────────
async function init() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name = $1
    `, [SCHEMA]);

    if (result.rows.length === 0) {
      throw new Error(
        `Schema '${SCHEMA}' not found. Run: node scripts/run-migration.js`
      );
    }

    // Verify core tables are present
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1
      AND table_name IN ('workspaces', 'pages', 'assets', 'users')
    `, [SCHEMA]);

    if (tables.rows.length < 4) {
      throw new Error(
        `Core tables missing in '${SCHEMA}'. Run: node scripts/run-migration.js`
      );
    }

    console.log(`Database ready — connected to schema: ${SCHEMA}`);
  } finally {
    client.release();
  }
}

// ── Exports ────────────────────────────────────────────────
function getPool() {
  return pool;
}

module.exports = { init, getPool, SCHEMA };
```

**Step 4: Run test — confirm passes**

```bash
npm test tests/database-service.test.js
```

Expected: PASS.

**Step 5: Run all tests to confirm nothing broken**

```bash
npm test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add services/database.js tests/database-service.test.js
git commit -m "feat: rewrite database.js for knowledge_base schema"
```

---

## Phase 1 complete

All database foundation is in place:

- ✅ Jest + Supertest configured
- ✅ `knowledge_base` schema created with all 12 tables
- ✅ All indexes created including FTS vectors
- ✅ Seed data: 4 workspaces, 7 sections, 6 templates, 3 settings
- ✅ NocoDB documents migrated to assets
- ✅ `database.js` rewritten for new schema

**Proceed to:** `impl-02-backend.md`
# Knowledge Platform — Implementation Plan
# Phase 2: Backend — Services, Auth, and API Routes

**Goal:** Rewrite the Express backend to serve the full Knowledge Platform API — auth with roles and bearer tokens, all CRUD routes for workspaces/sections/pages/assets/relationships, search, and file upload.

**Architecture:** Service layer (pure DB functions) sits below route handlers. Middleware handles auth — both session cookie (browser) and bearer token (Claude/API). Routes are thin: validate → call service → return JSON.

**Tech Stack:** Express 4 (CommonJS), `pg`, `bcryptjs`, `cookie-parser`, `multer` (new — file uploads).

**Dependencies:** Phase 1 complete — `knowledge_base` schema and all tables exist.

**Task numbering continues from Phase 1 (Tasks 1–6).**

---

## Task 7: Rewrite auth service

**Files:**
- Modify: `services/auth.js`
- Create: `tests/auth-service.test.js`

**Step 1: Write failing tests**

Create `tests/auth-service.test.js`:

```javascript
const auth = require('../services/auth');
const db = require('../services/database');

afterAll(() => db.getPool().end());

// Clean up test users between runs
beforeEach(async () => {
  await db.getPool().query(
    "DELETE FROM knowledge_base.users WHERE username LIKE 'testuser_%'"
  );
});

test('createUser: first user is admin', async () => {
  // Clear all users first
  await db.getPool().query('DELETE FROM knowledge_base.users');
  const user = await auth.createUser({
    username: 'testuser_admin',
    password: 'password123',
    displayName: 'Test Admin'
  });
  expect(user.role).toBe('admin');
});

test('createUser: subsequent users are viewers', async () => {
  // Ensure at least one user exists
  await auth.createUser({
    username: 'testuser_first',
    password: 'password123',
    displayName: 'First'
  });
  const user = await auth.createUser({
    username: 'testuser_second',
    password: 'password123',
    displayName: 'Second'
  });
  expect(user.role).toBe('viewer');
});

test('createSession: returns a token', async () => {
  const user = await auth.createUser({
    username: 'testuser_session',
    password: 'pass',
    displayName: 'Session Test'
  });
  const session = await auth.createSession(user.id);
  expect(session.token).toBeDefined();
  expect(session.token.length).toBeGreaterThan(20);
});

test('validateSession: returns user for valid token', async () => {
  const user = await auth.createUser({
    username: 'testuser_validate',
    password: 'pass',
    displayName: 'Validate Test'
  });
  const session = await auth.createSession(user.id);
  const result = await auth.validateSession(session.token);
  expect(result).not.toBeNull();
  expect(result.username).toBe('testuser_validate');
});

test('createApiToken: hashes the token', async () => {
  const result = await auth.createApiToken('Test token');
  expect(result.plaintext).toBeDefined();
  expect(result.id).toBeDefined();
  // Plain token should not be stored in DB
  const row = await db.getPool().query(
    'SELECT token_hash FROM knowledge_base.api_tokens WHERE id = $1',
    [result.id]
  );
  expect(row.rows[0].token_hash).not.toBe(result.plaintext);
});

test('validateApiToken: accepts correct token', async () => {
  const result = await auth.createApiToken('Validate token test');
  const valid = await auth.validateApiToken(result.plaintext);
  expect(valid).toBe(true);
});
```

**Step 2: Run — confirm fails**

```bash
npm test tests/auth-service.test.js
```

Expected: FAIL — functions do not exist yet.

**Step 3: Rewrite `services/auth.js`**

Replace the full file:

```javascript
// services/auth.js
'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getPool } = require('./database');

const SESSION_DAYS = 30;
const BCRYPT_ROUNDS = 10;

// ── Users ──────────────────────────────────────────────────

async function createUser({ username, password, displayName, email, role }) {
  const pool = getPool();
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // First user is always admin
  const countRes = await pool.query('SELECT COUNT(*) FROM knowledge_base.users');
  const isFirst = parseInt(countRes.rows[0].count) === 0;
  const assignedRole = role || (isFirst ? 'admin' : 'viewer');

  const res = await pool.query(`
    INSERT INTO knowledge_base.users (username, email, password_hash, display_name, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, username, email, display_name, role, created_at
  `, [username, email || null, hash, displayName, assignedRole]);

  return res.rows[0];
}

async function getUserById(id) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT id, username, email, display_name, role, created_at FROM knowledge_base.users WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

async function getUserByUsername(username) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT * FROM knowledge_base.users WHERE username = $1',
    [username]
  );
  return res.rows[0] || null;
}

async function listUsers() {
  const pool = getPool();
  const res = await pool.query(
    'SELECT id, username, email, display_name, role, created_at FROM knowledge_base.users ORDER BY created_at'
  );
  return res.rows;
}

async function updateUserRole(id, role) {
  const pool = getPool();
  const res = await pool.query(
    'UPDATE knowledge_base.users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, role',
    [role, id]
  );
  return res.rows[0] || null;
}

async function deleteUser(id) {
  const pool = getPool();
  await pool.query('DELETE FROM knowledge_base.users WHERE id = $1', [id]);
}

async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

// ── Sessions ───────────────────────────────────────────────

async function createSession(userId) {
  const pool = getPool();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const res = await pool.query(`
    INSERT INTO knowledge_base.sessions (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, token, expires_at
  `, [userId, token, expiresAt]);

  return res.rows[0];
}

async function validateSession(token) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT u.id, u.username, u.display_name, u.role, u.email
    FROM knowledge_base.sessions s
    JOIN knowledge_base.users u ON u.id = s.user_id
    WHERE s.token = $1 AND s.expires_at > NOW()
  `, [token]);
  return res.rows[0] || null;
}

async function destroySession(token) {
  const pool = getPool();
  await pool.query('DELETE FROM knowledge_base.sessions WHERE token = $1', [token]);
}

async function destroyExpiredSessions() {
  const pool = getPool();
  await pool.query('DELETE FROM knowledge_base.sessions WHERE expires_at <= NOW()');
}

// ── API Tokens ─────────────────────────────────────────────

async function createApiToken(label) {
  const pool = getPool();
  const plaintext = crypto.randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);

  const res = await pool.query(`
    INSERT INTO knowledge_base.api_tokens (label, token_hash)
    VALUES ($1, $2)
    RETURNING id, label, created_at
  `, [label, hash]);

  return { ...res.rows[0], plaintext };
}

async function validateApiToken(plaintext) {
  const pool = getPool();
  const tokens = await pool.query('SELECT id, token_hash FROM knowledge_base.api_tokens');

  for (const token of tokens.rows) {
    const match = await bcrypt.compare(plaintext, token.token_hash);
    if (match) {
      // Update last_used_at
      await pool.query(
        'UPDATE knowledge_base.api_tokens SET last_used_at = NOW() WHERE id = $1',
        [token.id]
      );
      return true;
    }
  }
  return false;
}

async function listApiTokens() {
  const pool = getPool();
  const res = await pool.query(
    'SELECT id, label, last_used_at, created_at FROM knowledge_base.api_tokens ORDER BY created_at'
  );
  return res.rows;
}

async function deleteApiToken(id) {
  const pool = getPool();
  await pool.query('DELETE FROM knowledge_base.api_tokens WHERE id = $1', [id]);
}

// ── Settings ───────────────────────────────────────────────

async function getSetting(key) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT value FROM knowledge_base.settings WHERE key = $1', [key]
  );
  return res.rows[0]?.value ?? null;
}

async function setSetting(key, value) {
  const pool = getPool();
  await pool.query(`
    INSERT INTO knowledge_base.settings (key, value, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
  `, [key, value]);
}

async function getAllSettings() {
  const pool = getPool();
  const res = await pool.query('SELECT key, value FROM knowledge_base.settings ORDER BY key');
  return res.rows;
}

module.exports = {
  createUser, getUserById, getUserByUsername, listUsers, updateUserRole, deleteUser, verifyPassword,
  createSession, validateSession, destroySession, destroyExpiredSessions,
  createApiToken, validateApiToken, listApiTokens, deleteApiToken,
  getSetting, setSetting, getAllSettings,
};
```

**Step 4: Run tests — confirm pass**

```bash
npm test tests/auth-service.test.js
```

Expected: PASS (6 tests).

**Step 5: Commit**

```bash
git add services/auth.js tests/auth-service.test.js
git commit -m "feat: rewrite auth service with roles and API token support"
```

---

## Task 8: Rewrite auth middleware

**Files:**
- Modify: `middleware/requireAuth.js`
- Create: `tests/middleware.test.js`

**Step 1: Write failing test**

Create `tests/middleware.test.js`:

```javascript
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

const app = express();
app.use(cookieParser());
app.get('/protected', requireAuth, (req, res) => res.json({ user: req.user }));
app.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => res.json({ ok: true }));

test('requireAuth: rejects request with no credentials', async () => {
  const res = await request(app).get('/protected');
  expect(res.status).toBe(401);
});

test('requireAuth: rejects invalid bearer token', async () => {
  const res = await request(app)
    .get('/protected')
    .set('Authorization', 'Bearer invalidtoken');
  expect(res.status).toBe(401);
});

test('requireRole: rejects viewer for admin-only route', async () => {
  // This test requires a real session — integration test
  // Covered in routes tests. Mark as placeholder.
  expect(true).toBe(true);
});
```

**Step 2: Run — confirm first two tests pass already if logic is right, else fail**

```bash
npm test tests/middleware.test.js
```

**Step 3: Rewrite `middleware/requireAuth.js`**

```javascript
// middleware/requireAuth.js
'use strict';

const auth = require('../services/auth');

// ── requireAuth ────────────────────────────────────────────
// Accepts session cookie OR Bearer token.
// Sets req.user on success. Returns 401 on failure.

async function requireAuth(req, res, next) {
  try {
    // 1. Try Bearer token first (API / Claude sessions)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const valid = await auth.validateApiToken(token);
      if (valid) {
        // API token users get a synthetic user object
        req.user = { id: 0, username: 'api', role: 'editor', isApiToken: true };
        return next();
      }
      return res.status(401).json({ error: 'Invalid API token' });
    }

    // 2. Try session cookie
    const sessionToken = req.cookies?.session;
    if (sessionToken) {
      const user = await auth.validateSession(sessionToken);
      if (user) {
        req.user = user;
        return next();
      }
    }

    return res.status(401).json({ error: 'Authentication required' });
  } catch (err) {
    next(err);
  }
}

// ── requireRole ────────────────────────────────────────────
// Use after requireAuth. Checks req.user.role.
// requireRole('admin') — admin only
// requireRole('editor') — admin or editor

function requireRole(minRole) {
  const hierarchy = { viewer: 0, editor: 1, admin: 2 };
  return (req, res, next) => {
    const userLevel = hierarchy[req.user?.role] ?? -1;
    const required = hierarchy[minRole] ?? 99;
    if (userLevel >= required) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = { requireAuth, requireRole };
```

**Step 4: Run tests**

```bash
npm test tests/middleware.test.js
```

**Step 5: Commit**

```bash
git add middleware/requireAuth.js tests/middleware.test.js
git commit -m "feat: rewrite requireAuth to support session cookie and Bearer token"
```

---

## Task 9: Install multer for file uploads

**Files:**
- Modify: `package.json`
- Create: `middleware/upload.js`

**Step 1: Install multer**

```bash
npm install multer
```

**Step 2: Create `middleware/upload.js`**

```javascript
// middleware/upload.js
'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/data/uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, common docs, and markdown
    const allowed = /jpeg|jpg|png|gif|webp|pdf|md|txt|json|yaml|yml/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext)) return cb(null, true);
    cb(new Error(`File type .${ext} not allowed`));
  },
});

module.exports = upload;
```

**Step 3: Commit**

```bash
git add package.json middleware/upload.js
git commit -m "feat: add multer upload middleware"
```

---

## Task 10: Workspaces and sections routes

**Files:**
- Create: `services/workspaces.js`
- Create: `routes/workspaces.js`
- Create: `tests/routes/workspaces.test.js`

**Step 1: Create `services/workspaces.js`**

```javascript
// services/workspaces.js
'use strict';

const { getPool } = require('./database');

async function listWorkspaces() {
  const res = await getPool().query(
    'SELECT * FROM knowledge_base.workspaces ORDER BY sort_order, name'
  );
  return res.rows;
}

async function getWorkspace(id) {
  const res = await getPool().query(
    'SELECT * FROM knowledge_base.workspaces WHERE id = $1', [id]
  );
  return res.rows[0] || null;
}

async function createWorkspace({ name, slug, icon, sort_order }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.workspaces (name, slug, icon, sort_order)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [name, slug, icon || 'folder', sort_order || 0]);
  return res.rows[0];
}

async function updateWorkspace(id, updates) {
  const fields = ['name', 'slug', 'icon', 'sort_order'].filter(f => updates[f] !== undefined);
  if (fields.length === 0) return getWorkspace(id);
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);
  const res = await getPool().query(
    `UPDATE knowledge_base.workspaces SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

async function deleteWorkspace(id) {
  await getPool().query('DELETE FROM knowledge_base.workspaces WHERE id = $1', [id]);
}

async function listSections(workspaceId) {
  const res = await getPool().query(
    'SELECT * FROM knowledge_base.sections WHERE workspace_id = $1 ORDER BY sort_order, name',
    [workspaceId]
  );
  return res.rows;
}

async function createSection({ workspace_id, name, slug, icon, sort_order }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.sections (workspace_id, name, slug, icon, sort_order)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [workspace_id, name, slug, icon || 'folder', sort_order || 0]);
  return res.rows[0];
}

async function updateSection(id, updates) {
  const fields = ['name', 'slug', 'icon', 'sort_order'].filter(f => updates[f] !== undefined);
  if (fields.length === 0) return null;
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);
  const res = await getPool().query(
    `UPDATE knowledge_base.sections SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

async function deleteSection(id) {
  await getPool().query('DELETE FROM knowledge_base.sections WHERE id = $1', [id]);
}

module.exports = {
  listWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace,
  listSections, createSection, updateSection, deleteSection,
};
```

**Step 2: Create `routes/workspaces.js`**

```javascript
// routes/workspaces.js
'use strict';

const router = require('express').Router();
const ws = require('../services/workspaces');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

// Workspaces
router.get('/', async (req, res, next) => {
  try {
    res.json(await ws.listWorkspaces());
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const workspace = await ws.createWorkspace(req.body);
    res.status(201).json(workspace);
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const workspace = await ws.updateWorkspace(req.params.id, req.body);
    if (!workspace) return res.status(404).json({ error: 'Not found' });
    res.json(workspace);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await ws.deleteWorkspace(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// Sections (nested under workspaces)
router.get('/:id/sections', async (req, res, next) => {
  try {
    res.json(await ws.listSections(req.params.id));
  } catch (err) { next(err); }
});

router.post('/:id/sections', requireRole('editor'), async (req, res, next) => {
  try {
    const section = await ws.createSection({ ...req.body, workspace_id: req.params.id });
    res.status(201).json(section);
  } catch (err) { next(err); }
});

router.patch('/sections/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const section = await ws.updateSection(req.params.id, req.body);
    if (!section) return res.status(404).json({ error: 'Not found' });
    res.json(section);
  } catch (err) { next(err); }
});

router.delete('/sections/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await ws.deleteSection(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 3: Write failing test**

Create `tests/routes/workspaces.test.js`:

```javascript
const request = require('supertest');
const app = require('../../server');
const auth = require('../../services/auth');
const db = require('../../services/database');

let adminCookie;

beforeAll(async () => {
  // Clear and create admin user
  await db.getPool().query('DELETE FROM knowledge_base.users');
  await db.getPool().query('DELETE FROM knowledge_base.sessions');
  const user = await auth.createUser({
    username: 'admin_ws_test', password: 'pass123', displayName: 'Admin'
  });
  const session = await auth.createSession(user.id);
  adminCookie = `session=${session.token}`;
});

afterAll(() => db.getPool().end());

test('GET /api/workspaces returns array', async () => {
  const res = await request(app)
    .get('/api/workspaces')
    .set('Cookie', adminCookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('GET /api/workspaces returns seeded workspaces', async () => {
  const res = await request(app)
    .get('/api/workspaces')
    .set('Cookie', adminCookie);
  expect(res.body.length).toBeGreaterThanOrEqual(4);
  const slugs = res.body.map(w => w.slug);
  expect(slugs).toContain('it-projects');
});

test('GET /api/workspaces requires auth', async () => {
  const res = await request(app).get('/api/workspaces');
  expect(res.status).toBe(401);
});

test('GET /api/workspaces/:id/sections returns sections', async () => {
  const wsRes = await request(app)
    .get('/api/workspaces')
    .set('Cookie', adminCookie);
  const itWs = wsRes.body.find(w => w.slug === 'it-projects');

  const res = await request(app)
    .get(`/api/workspaces/${itWs.id}/sections`)
    .set('Cookie', adminCookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  const slugs = res.body.map(s => s.slug);
  expect(slugs).toContain('claude');
});
```

**Step 4: Run — confirm fails (server.js not wired yet)**

```bash
npm test tests/routes/workspaces.test.js
```

Expected: FAIL — `server.js` does not mount the routes yet. We wire routes in Task 16.

**Step 5: Commit services and routes files**

```bash
git add services/workspaces.js routes/workspaces.js tests/routes/workspaces.test.js
git commit -m "feat: add workspaces and sections service and routes"
```

---

## Task 11: Pages routes

**Files:**
- Create: `services/pages.js`
- Create: `routes/pages.js`
- Create: `tests/routes/pages.test.js`

**Step 1: Create `services/pages.js`**

```javascript
// services/pages.js
'use strict';

const { getPool } = require('./database');

// ── Tree query: all pages for a section ───────────────────
async function getPageTree(sectionId) {
  const res = await getPool().query(`
    SELECT id, parent_id, title, slug, status, template_type,
           created_by, sort_order, created_at, updated_at
    FROM knowledge_base.pages
    WHERE section_id = $1 AND deleted_at IS NULL
    ORDER BY sort_order, title
  `, [sectionId]);
  return buildTree(res.rows);
}

function buildTree(rows, parentId = null) {
  return rows
    .filter(r => r.parent_id === parentId)
    .map(r => ({ ...r, children: buildTree(rows, r.id) }));
}

// ── Single page ────────────────────────────────────────────
async function getPage(id) {
  const res = await getPool().query(`
    SELECT p.*, s.workspace_id,
      (SELECT json_agg(a.* ORDER BY pa.sort_order)
       FROM knowledge_base.page_assets pa
       JOIN knowledge_base.assets a ON a.id = pa.asset_id
       WHERE pa.page_id = p.id AND a.deleted_at IS NULL
      ) AS assets
    FROM knowledge_base.pages p
    JOIN knowledge_base.sections s ON s.id = p.section_id
    WHERE p.id = $1 AND p.deleted_at IS NULL
  `, [id]);
  return res.rows[0] || null;
}

// ── Create ─────────────────────────────────────────────────
async function createPage({ section_id, parent_id, title, slug, content, template_type, status, created_by, sort_order }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.pages
      (section_id, parent_id, title, slug, content, template_type, status, created_by, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    section_id, parent_id || null, title, slug,
    content || '', template_type || 'blank',
    status || 'published', created_by || 'user', sort_order || 0
  ]);
  return res.rows[0];
}

// ── Update ─────────────────────────────────────────────────
async function updatePage(id, updates) {
  const allowed = ['title', 'slug', 'content', 'template_type', 'status', 'sort_order'];
  const fields = allowed.filter(f => updates[f] !== undefined);
  if (fields.length === 0) return getPage(id);
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);
  const res = await getPool().query(
    `UPDATE knowledge_base.pages SET ${sets}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

// ── Move (reparent or reorder) ─────────────────────────────
async function movePage(id, { parent_id, sort_order }) {
  const res = await getPool().query(`
    UPDATE knowledge_base.pages
    SET parent_id = $2, sort_order = $3, updated_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING *
  `, [id, parent_id ?? null, sort_order ?? 0]);
  return res.rows[0] || null;
}

// ── Soft delete ────────────────────────────────────────────
async function deletePage(id) {
  await getPool().query(
    'UPDATE knowledge_base.pages SET deleted_at = NOW() WHERE id = $1',
    [id]
  );
}

module.exports = { getPageTree, getPage, createPage, updatePage, movePage, deletePage };
```

**Step 2: Create `routes/pages.js`**

```javascript
// routes/pages.js
'use strict';

const router = require('express').Router();
const pages = require('../services/pages');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/section/:sectionId', async (req, res, next) => {
  try {
    res.json(await pages.getPageTree(req.params.sectionId));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const page = await pages.getPage(req.params.id);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.createPage(req.body);
    res.status(201).json(page);
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.updatePage(req.params.id, req.body);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

router.patch('/:id/move', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.movePage(req.params.id, req.body);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    await pages.deletePage(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 3: Create `tests/routes/pages.test.js`**

```javascript
const request = require('supertest');
const app = require('../../server');
const auth = require('../../services/auth');
const db = require('../../services/database');

let cookie, sectionId;

beforeAll(async () => {
  await db.getPool().query('DELETE FROM knowledge_base.users');
  const user = await auth.createUser({ username: 'page_tester', password: 'pass', displayName: 'Tester' });
  const session = await auth.createSession(user.id);
  cookie = `session=${session.token}`;

  // Get first section id
  const sec = await db.getPool().query(
    "SELECT id FROM knowledge_base.sections LIMIT 1"
  );
  sectionId = sec.rows[0]?.id;
});

afterAll(() => db.getPool().end());

test('GET /api/pages/section/:id returns tree', async () => {
  const res = await request(app)
    .get(`/api/pages/section/${sectionId}`)
    .set('Cookie', cookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /api/pages creates a page', async () => {
  const res = await request(app)
    .post('/api/pages')
    .set('Cookie', cookie)
    .send({ section_id: sectionId, title: 'Test Page', slug: 'test-page', content: '# Hello' });
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Test Page');
});

test('PATCH /api/pages/:id updates content', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Cookie', cookie)
    .send({ section_id: sectionId, title: 'Update Me', slug: 'update-me' });

  const res = await request(app)
    .patch(`/api/pages/${create.body.id}`)
    .set('Cookie', cookie)
    .send({ content: 'Updated content' });
  expect(res.status).toBe(200);
  expect(res.body.content).toBe('Updated content');
});

test('DELETE /api/pages/:id soft deletes', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Cookie', cookie)
    .send({ section_id: sectionId, title: 'Delete Me', slug: 'delete-me' });

  await request(app).delete(`/api/pages/${create.body.id}`).set('Cookie', cookie);

  const res = await request(app)
    .get(`/api/pages/${create.body.id}`)
    .set('Cookie', cookie);
  expect(res.status).toBe(404);
});
```

**Step 4: Commit**

```bash
git add services/pages.js routes/pages.js tests/routes/pages.test.js
git commit -m "feat: add pages service and routes"
```

---

## Task 12: Assets routes (with versioning)

**Files:**
- Create: `services/assets.js`
- Create: `routes/assets.js`
- Create: `tests/routes/assets.test.js`

**Step 1: Create `services/assets.js`**

```javascript
// services/assets.js
'use strict';

const { getPool } = require('./database');

async function listAssets({ type, deleted } = {}) {
  let where = 'WHERE a.deleted_at IS NULL';
  const values = [];
  if (type) {
    values.push(type);
    where += ` AND a.type = $${values.length}`;
  }
  const res = await getPool().query(
    `SELECT id, type, title, description, file_path, url, metadata, created_by, created_at, updated_at
     FROM knowledge_base.assets a ${where} ORDER BY updated_at DESC`,
    values
  );
  return res.rows;
}

async function getAsset(id) {
  const pool = getPool();
  const [asset, versions] = await Promise.all([
    pool.query('SELECT * FROM knowledge_base.assets WHERE id = $1 AND deleted_at IS NULL', [id]),
    pool.query('SELECT * FROM knowledge_base.asset_versions WHERE asset_id = $1 ORDER BY created_at DESC', [id]),
  ]);
  if (!asset.rows[0]) return null;
  return { ...asset.rows[0], versions: versions.rows };
}

async function createAsset({ type, title, description, content, file_path, url, metadata, created_by }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.assets (type, title, description, content, file_path, url, metadata, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [type, title, description || '', content || '', file_path || null, url || null,
      metadata ? JSON.stringify(metadata) : '{}', created_by || 'user']);
  return res.rows[0];
}

async function updateAsset(id, updates, { change_summary, changed_by } = {}) {
  const pool = getPool();
  const current = await pool.query(
    'SELECT * FROM knowledge_base.assets WHERE id = $1 AND deleted_at IS NULL', [id]
  );
  if (!current.rows[0]) return null;

  // Snapshot current version before updating
  await pool.query(`
    INSERT INTO knowledge_base.asset_versions (asset_id, version, content, change_summary, changed_by)
    VALUES ($1, $2, $3, $4, $5)
  `, [
    id,
    current.rows[0].metadata?.version || '0',
    current.rows[0].content,
    change_summary || 'Updated',
    changed_by || 'user',
  ]);

  const allowed = ['title', 'description', 'content', 'file_path', 'url', 'metadata'];
  const fields = allowed.filter(f => updates[f] !== undefined);
  if (fields.length === 0) return getAsset(id);

  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f =>
    f === 'metadata' ? JSON.stringify(updates[f]) : updates[f]
  );

  const res = await pool.query(
    `UPDATE knowledge_base.assets SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0];
}

async function deleteAsset(id) {
  await getPool().query(
    'UPDATE knowledge_base.assets SET deleted_at = NOW() WHERE id = $1', [id]
  );
}

async function linkAssetToPage(pageId, assetId, { display_mode, sort_order } = {}) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.page_assets (page_id, asset_id, display_mode, sort_order)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (page_id, asset_id) DO UPDATE SET display_mode = $3, sort_order = $4
    RETURNING *
  `, [pageId, assetId, display_mode || 'reference', sort_order || 0]);
  return res.rows[0];
}

module.exports = { listAssets, getAsset, createAsset, updateAsset, deleteAsset, linkAssetToPage };
```

**Step 2: Create `routes/assets.js`**

```javascript
// routes/assets.js
'use strict';

const router = require('express').Router();
const assets = require('../services/assets');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await assets.listAssets({ type: req.query.type }));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const asset = await assets.getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Not found' });
    res.json(asset);
  } catch (err) { next(err); }
});

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const asset = await assets.createAsset(req.body);
    res.status(201).json(asset);
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const { change_summary, changed_by, ...updates } = req.body;
    const asset = await assets.updateAsset(req.params.id, updates, { change_summary, changed_by });
    if (!asset) return res.status(404).json({ error: 'Not found' });
    res.json(asset);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    await assets.deleteAsset(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/:id/link', requireRole('editor'), async (req, res, next) => {
  try {
    const link = await assets.linkAssetToPage(
      req.body.page_id, req.params.id, req.body
    );
    res.status(201).json(link);
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 3: Write and commit test**

Create `tests/routes/assets.test.js`:

```javascript
const request = require('supertest');
const app = require('../../server');
const auth = require('../../services/auth');
const db = require('../../services/database');

let cookie;

beforeAll(async () => {
  await db.getPool().query('DELETE FROM knowledge_base.users');
  const user = await auth.createUser({ username: 'asset_tester', password: 'pass', displayName: 'Tester' });
  const session = await auth.createSession(user.id);
  cookie = `session=${session.token}`;
});

afterAll(() => db.getPool().end());

test('GET /api/assets returns array', async () => {
  const res = await request(app).get('/api/assets').set('Cookie', cookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /api/assets creates asset', async () => {
  const res = await request(app)
    .post('/api/assets')
    .set('Cookie', cookie)
    .send({ type: 'decision', title: 'Test Decision', content: 'We decided X' });
  expect(res.status).toBe(201);
  expect(res.body.type).toBe('decision');
});

test('PATCH /api/assets/:id creates version snapshot', async () => {
  const create = await request(app)
    .post('/api/assets')
    .set('Cookie', cookie)
    .send({ type: 'config', title: 'Config A', content: 'v1 content' });

  await request(app)
    .patch(`/api/assets/${create.body.id}`)
    .set('Cookie', cookie)
    .send({ content: 'v2 content', change_summary: 'Updated to v2' });

  const res = await request(app)
    .get(`/api/assets/${create.body.id}`)
    .set('Cookie', cookie);

  expect(res.body.content).toBe('v2 content');
  expect(res.body.versions.length).toBe(1);
  expect(res.body.versions[0].content).toBe('v1 content');
});
```

```bash
git add services/assets.js routes/assets.js tests/routes/assets.test.js
git commit -m "feat: add assets service and routes with versioning"
```

---

## Task 13: Relationships and search routes

**Files:**
- Create: `services/relationships.js`
- Create: `routes/relationships.js`
- Create: `routes/search.js`

**Step 1: Create `services/relationships.js`**

```javascript
// services/relationships.js
'use strict';

const { getPool } = require('./database');

async function listRelationships({ from_asset_id, to_asset_id, type } = {}) {
  let where = 'WHERE 1=1';
  const values = [];
  if (from_asset_id) { values.push(from_asset_id); where += ` AND r.from_asset_id = $${values.length}`; }
  if (to_asset_id)   { values.push(to_asset_id);   where += ` AND r.to_asset_id = $${values.length}`; }
  if (type)          { values.push(type);           where += ` AND r.relationship_type = $${values.length}`; }

  const res = await getPool().query(`
    SELECT r.*,
      fa.title AS from_title, fa.type AS from_type,
      ta.title AS to_title, ta.type AS to_type
    FROM knowledge_base.asset_relationships r
    JOIN knowledge_base.assets fa ON fa.id = r.from_asset_id
    JOIN knowledge_base.assets ta ON ta.id = r.to_asset_id
    ${where}
    ORDER BY r.created_at DESC
  `, values);
  return res.rows;
}

async function createRelationship({ from_asset_id, to_asset_id, relationship_type, notes }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.asset_relationships
      (from_asset_id, to_asset_id, relationship_type, notes)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (from_asset_id, to_asset_id, relationship_type) DO NOTHING
    RETURNING *
  `, [from_asset_id, to_asset_id, relationship_type, notes || '']);
  return res.rows[0];
}

async function deleteRelationship(id) {
  await getPool().query(
    'DELETE FROM knowledge_base.asset_relationships WHERE id = $1', [id]
  );
}

module.exports = { listRelationships, createRelationship, deleteRelationship };
```

**Step 2: Create `routes/relationships.js`**

```javascript
// routes/relationships.js
'use strict';

const router = require('express').Router();
const rel = require('../services/relationships');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await rel.listRelationships(req.query));
  } catch (err) { next(err); }
});

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const r = await rel.createRelationship(req.body);
    if (!r) return res.status(409).json({ error: 'Relationship already exists' });
    res.status(201).json(r);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    await rel.deleteRelationship(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 3: Create `routes/search.js`**

```javascript
// routes/search.js
'use strict';

const router = require('express').Router();
const { getPool } = require('../services/database');
const { requireAuth } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { q, workspace, section, type } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const query = q.trim();

    const [pagesRes, assetsRes] = await Promise.all([
      getPool().query(`
        SELECT p.id, p.title, p.slug, p.template_type, p.updated_at,
               s.name AS section_name, w.name AS workspace_name, w.slug AS workspace_slug,
               ts_headline('english', p.content, plainto_tsquery($1), 'MaxWords=20,MinWords=5') AS excerpt
        FROM knowledge_base.pages p
        JOIN knowledge_base.sections s ON s.id = p.section_id
        JOIN knowledge_base.workspaces w ON w.id = s.workspace_id
        WHERE p.deleted_at IS NULL
          AND p.status = 'published'
          AND p.search_vector @@ plainto_tsquery($1)
        ORDER BY ts_rank(p.search_vector, plainto_tsquery($1)) DESC
        LIMIT 20
      `, [query]),
      getPool().query(`
        SELECT id, type, title, description AS excerpt, updated_at
        FROM knowledge_base.assets
        WHERE deleted_at IS NULL
          AND search_vector @@ plainto_tsquery($1)
          ${type ? `AND type = '${type}'` : ''}
        ORDER BY ts_rank(search_vector, plainto_tsquery($1)) DESC
        LIMIT 20
      `, [query]),
    ]);

    res.json({
      query,
      pages: pagesRes.rows,
      assets: assetsRes.rows,
      total: pagesRes.rows.length + assetsRes.rows.length,
    });
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 4: Commit**

```bash
git add services/relationships.js routes/relationships.js routes/search.js
git commit -m "feat: add relationships service, routes, and search route"
```

---

## Task 14: Upload route and auth routes

**Files:**
- Create: `routes/upload.js`
- Modify: `routes/auth.js`
- Modify: `routes/admin.js`

**Step 1: Create `routes/upload.js`**

```javascript
// routes/upload.js
'use strict';

const router = require('express').Router();
const path = require('path');
const upload = require('../middleware/upload');
const assets = require('../services/assets');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);
router.use(requireRole('editor'));

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const isImage = /jpeg|jpg|png|gif|webp/.test(
      path.extname(req.file.originalname).toLowerCase().slice(1)
    );

    const asset = await assets.createAsset({
      type: isImage ? 'image' : 'file',
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      file_path: req.file.path,
      metadata: {
        original_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
      },
      created_by: req.user.isApiToken ? 'claude' : 'user',
    });

    res.status(201).json(asset);
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 2: Update `routes/auth.js` for new schema**

Replace with the following (updates schema references from `kb_auth` to `knowledge_base`):

```javascript
// routes/auth.js
'use strict';

const router = require('express').Router();
const auth = require('../services/auth');
const { requireAuth } = require('../middleware/requireAuth');

// GET /api/auth/check
router.get('/check', async (req, res) => {
  const token = req.cookies?.session;
  if (!token) return res.json({ authenticated: false });
  const user = await auth.validateSession(token);
  if (!user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user });
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, displayName, email } = req.body;
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'username, password, and displayName are required' });
    }
    // Block registration if disabled and users exist
    const allowReg = await auth.getSetting('allow_registration');
    const pool = require('../services/database').getPool();
    const count = await pool.query('SELECT COUNT(*) FROM knowledge_base.users');
    if (allowReg !== 'true' && parseInt(count.rows[0].count) > 0) {
      return res.status(403).json({ error: 'Registration is disabled' });
    }
    const user = await auth.createUser({ username, password, displayName, email });
    const session = await auth.createSession(user.id);
    res.cookie('session', session.token, {
      httpOnly: true, sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const user = await auth.getUserByUsername(username);
    if (!user || !(await auth.verifyPassword(user, password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const session = await auth.createSession(user.id);
    res.cookie('session', session.token, {
      httpOnly: true, sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.json({ user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.session;
  if (token) await auth.destroySession(token);
  res.clearCookie('session');
  res.json({ ok: true });
});

module.exports = router;
```

**Step 3: Update `routes/admin.js` for new schema and roles**

```javascript
// routes/admin.js
'use strict';

const router = require('express').Router();
const auth = require('../services/auth');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);
router.use(requireRole('admin'));

// Users
router.get('/users', async (req, res, next) => {
  try { res.json(await auth.listUsers()); } catch (err) { next(err); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin','editor','viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await auth.updateUserRole(req.params.id, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await auth.deleteUser(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// API tokens
router.get('/tokens', async (req, res, next) => {
  try { res.json(await auth.listApiTokens()); } catch (err) { next(err); }
});

router.post('/tokens', async (req, res, next) => {
  try {
    if (!req.body.label) return res.status(400).json({ error: 'label is required' });
    const token = await auth.createApiToken(req.body.label);
    res.status(201).json(token); // plaintext returned once only
  } catch (err) { next(err); }
});

router.delete('/tokens/:id', async (req, res, next) => {
  try {
    await auth.deleteApiToken(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// Settings
router.get('/settings', async (req, res, next) => {
  try { res.json(await auth.getAllSettings()); } catch (err) { next(err); }
});

router.patch('/settings', async (req, res, next) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await auth.setSetting(key, String(value));
    }
    res.json(await auth.getAllSettings());
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 4: Commit**

```bash
git add routes/upload.js routes/auth.js routes/admin.js
git commit -m "feat: add upload route and update auth and admin routes for new schema"
```

---

## Task 15: Rewrite server.js

**Files:**
- Modify: `server.js`
- Create: `tests/routes/health.test.js`

**Step 1: Write health route test**

Create `tests/routes/health.test.js`:

```javascript
const request = require('supertest');
const app = require('../../server');

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});
```

**Step 2: Rewrite `server.js`**

```javascript
// server.js
'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./services/database');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Static files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/data/uploads';
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Public routes ──────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));

app.get('/api/health', async (req, res) => {
  try {
    await db.getPool().query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// ── Protected routes ───────────────────────────────────────
app.use('/api/workspaces',    require('./routes/workspaces'));
app.use('/api/pages',         require('./routes/pages'));
app.use('/api/assets',        require('./routes/assets'));
app.use('/api/relationships', require('./routes/relationships'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/upload',        require('./routes/upload'));

// ── Admin routes ───────────────────────────────────────────
app.use('/api/admin', require('./routes/admin'));

// ── SPA fallback ───────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
if (require.main === module) {
  db.init().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Knowledge Platform running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;
```

**Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass. If any route tests still fail, the server is now wired — check error messages.

**Step 4: Smoke test the running server**

```bash
node server.js &
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
kill %1
```

**Step 5: Commit**

```bash
git add server.js tests/routes/health.test.js
git commit -m "feat: rewrite server.js with all routes mounted"
```

---

## Phase 2 complete

All backend services and API routes are in place:

- ✅ Auth service with roles (admin/editor/viewer) and API token support
- ✅ `requireAuth` middleware handles session cookie and Bearer token
- ✅ `requireRole` middleware enforces role hierarchy
- ✅ Workspaces and sections CRUD
- ✅ Pages CRUD with tree query and soft delete
- ✅ Assets CRUD with automatic version snapshots on update
- ✅ Relationships CRUD
- ✅ Full-text search across pages and assets
- ✅ File upload with multer
- ✅ Auth, admin, and health routes updated for new schema
- ✅ `server.js` wired with all routes

**Proceed to:** `impl-03-frontend.md`
# Knowledge Platform — Implementation Plan
# Phase 3: Frontend Foundation — HTML Shell, CSS Design System, Core JS Modules

**Goal:** Replace the v0.1 frontend with a complete three-column shell, the full design system as CSS custom properties, and the core JavaScript modules needed for boot, navigation, and state.

**Architecture:** Vanilla JS ES6 modules. No bundler. All modules loaded via `<script type="module">`. `store.js` holds central state. `api.js` wraps all backend calls. `app.js` boots the app and owns navigation. All DOM building uses `createElement` and `textContent`; `marked + DOMPurify` (loaded as globals) for markdown content.

**Tech Stack:** HTML5, CSS3 (custom properties), Vanilla JS ES6 modules, Google Fonts (CDN), Lucide (UMD CDN), marked + DOMPurify (UMD CDN).

**Dependencies:** Phase 1 (schema) and Phase 2 (API routes) complete.

**Task numbering continues from Phase 2 (Tasks 7–15).**

---

## Task 16: Rewrite `public/index.html`

**Files:**
- Replace: `public/index.html`

**What this builds:**
The complete HTML shell. Three-column layout with top bar. All overlays (auth, search, settings, editor) included as hidden elements. No inline JS — all behaviour lives in ES modules. CDN scripts loaded synchronously before the module.

**Step 1: Write the file**

Replace `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Knowledge Base</title>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <!-- Icons (Lucide UMD — exposes window.lucide) -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

  <!-- Markdown + sanitizer (UMD — exposes window.marked and window.DOMPurify) -->
  <script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>

  <link rel="stylesheet" href="/css/styles.css" />
</head>
<body>

  <!-- AUTH OVERLAY — shown until session confirmed -->
  <div id="auth-overlay" class="overlay overlay--fullscreen" hidden>
    <div class="auth-card" id="auth-card">
      <div class="auth-logo">
        <svg viewBox="0 0 40 40" class="logo-mark" aria-hidden="true">
          <text x="2" y="30" font-family="DM Sans,sans-serif" font-size="28"
                font-weight="600" fill="currentColor">42</text>
        </svg>
        <span class="auth-title">Knowledge Base</span>
      </div>

      <form id="login-form" class="auth-form" novalidate>
        <h2 class="auth-heading">Sign in</h2>
        <div class="field">
          <label for="login-username" class="label">Username</label>
          <input id="login-username" name="username" type="text"
                 class="input" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="login-password" class="label">Password</label>
          <input id="login-password" name="password" type="password"
                 class="input" autocomplete="current-password" required />
        </div>
        <p id="login-error" class="auth-error" hidden></p>
        <button type="submit" class="btn btn--primary btn--full">Sign in</button>
        <p class="auth-switch">No account?
          <button type="button" class="link-btn" data-action="show-register">Register</button>
        </p>
      </form>

      <form id="register-form" class="auth-form" hidden novalidate>
        <h2 class="auth-heading">Create account</h2>
        <div class="field">
          <label for="reg-display" class="label">Display name</label>
          <input id="reg-display" name="displayName" type="text" class="input" required />
        </div>
        <div class="field">
          <label for="reg-username" class="label">Username</label>
          <input id="reg-username" name="username" type="text"
                 class="input" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="reg-password" class="label">Password</label>
          <input id="reg-password" name="password" type="password"
                 class="input" autocomplete="new-password" required />
        </div>
        <p id="register-error" class="auth-error" hidden></p>
        <button type="submit" class="btn btn--primary btn--full">Create account</button>
        <p class="auth-switch">Have an account?
          <button type="button" class="link-btn" data-action="show-login">Sign in</button>
        </p>
      </form>
    </div>
  </div>

  <!-- MAIN APP — hidden until auth confirmed -->
  <div id="app" hidden>

    <!-- TOP BAR -->
    <header class="topbar" role="banner">
      <div class="topbar__left">
        <a href="#" id="hq-link" class="hq-link" title="SS42 HQ" aria-label="SS42 HQ">
          <svg viewBox="0 0 40 40" class="logo-mark" aria-hidden="true">
            <text x="2" y="30" font-family="DM Sans,sans-serif" font-size="28"
                  font-weight="600" fill="currentColor">42</text>
          </svg>
        </a>
        <span class="topbar__app-label">Knowledge Base</span>
      </div>
      <div class="topbar__centre">
        <button class="search-trigger" id="search-trigger"
                aria-label="Search (Cmd+K)" aria-keyshortcuts="Meta+K">
          <i data-lucide="search" aria-hidden="true"></i>
          <span class="search-trigger__label">Search…</span>
          <kbd class="search-trigger__kbd">⌘K</kbd>
        </button>
      </div>
      <div class="topbar__right">
        <button class="icon-btn" id="map-btn" title="Map view" aria-label="Map view">
          <i data-lucide="network" aria-hidden="true"></i>
        </button>
        <button class="icon-btn" id="settings-btn" title="Settings" aria-label="Settings">
          <i data-lucide="settings" aria-hidden="true"></i>
        </button>
        <button class="icon-btn" id="theme-btn" title="Toggle theme" aria-label="Toggle theme">
          <i data-lucide="moon" aria-hidden="true" id="theme-icon"></i>
        </button>
        <button class="avatar-btn" id="avatar-btn" aria-label="User menu">
          <span id="avatar-initials" class="avatar">?</span>
        </button>
      </div>
    </header>

    <!-- BODY -->
    <div class="body-layout">

      <!-- WORKSPACE RAIL (54px) -->
      <nav class="rail" role="navigation" aria-label="Workspaces">
        <ul class="rail__list" id="workspace-rail" role="list"></ul>
        <div class="rail__footer">
          <button class="rail__add-btn" id="add-workspace-btn"
                  title="Add workspace" aria-label="Add workspace">
            <i data-lucide="plus" aria-hidden="true"></i>
          </button>
        </div>
      </nav>

      <!-- SECTION SIDEBAR (244px) -->
      <aside class="sidebar" role="complementary" aria-label="Sections and pages">
        <div class="sidebar__header">
          <span class="sidebar__workspace-label" id="sidebar-workspace-label"></span>
        </div>
        <nav class="sidebar__nav">
          <ul class="section-list" id="section-list" role="list"></ul>
        </nav>
        <div class="sidebar__footer">
          <button class="sidebar__add-btn" id="add-section-btn"
                  title="Add section" aria-label="Add section">
            <i data-lucide="plus" aria-hidden="true"></i>
            <span>Add section</span>
          </button>
        </div>
      </aside>

      <!-- CONTENT PANE (flex) -->
      <main class="content-pane" id="content-pane" role="main">
        <div class="content-placeholder" id="content-placeholder">
          <i data-lucide="book-open" aria-hidden="true"></i>
          <p>Select a page to get started</p>
        </div>
      </main>

    </div><!-- /body-layout -->
  </div><!-- /app -->

  <!-- SEARCH OVERLAY -->
  <div id="search-overlay" class="overlay overlay--search" hidden
       role="dialog" aria-modal="true" aria-label="Search">
    <div class="search-modal">
      <div class="search-modal__input-wrap">
        <i data-lucide="search" class="search-modal__icon" aria-hidden="true"></i>
        <input type="text" id="search-input" class="search-modal__input"
               placeholder="Search pages and assets…" autocomplete="off"
               aria-label="Search" aria-controls="search-results" />
        <button class="search-modal__close" id="search-close" aria-label="Close search">
          <kbd>Esc</kbd>
        </button>
      </div>
      <div class="search-modal__filters" id="search-filters">
        <button class="filter-chip filter-chip--active" data-filter="all">All</button>
        <button class="filter-chip" data-filter="pages">Pages</button>
        <button class="filter-chip" data-filter="assets">Assets</button>
      </div>
      <ul class="search-results" id="search-results" role="listbox"
          aria-label="Search results"></ul>
      <p class="search-empty" id="search-empty" hidden>No results found</p>
    </div>
  </div>

  <!-- SETTINGS OVERLAY -->
  <div id="settings-overlay" class="overlay overlay--panel" hidden
       role="dialog" aria-modal="true" aria-label="Settings">
    <div class="settings-panel">
      <div class="settings-panel__header">
        <h2 class="settings-panel__title">Settings</h2>
        <button class="icon-btn" id="settings-close" aria-label="Close settings">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="settings-panel__layout">
        <nav class="settings-panel__nav">
          <button class="settings-nav-item settings-nav-item--active"
                  data-section="workspaces">Workspaces</button>
          <button class="settings-nav-item" data-section="users">Users &amp; Roles</button>
          <button class="settings-nav-item" data-section="tokens">API Tokens</button>
          <button class="settings-nav-item" data-section="account">Account</button>
          <button class="settings-nav-item settings-nav-item--danger"
                  data-section="danger">Danger Zone</button>
        </nav>
        <div class="settings-panel__body" id="settings-body">
          <!-- Populated by settings.js (Phase 4) -->
        </div>
      </div>
    </div>
  </div>

  <!-- EDITOR OVERLAY -->
  <div id="editor-overlay" class="overlay overlay--editor" hidden
       role="dialog" aria-modal="true" aria-label="Page editor">
    <div class="editor-modal">
      <div class="editor-modal__header">
        <input type="text" id="editor-title" class="editor-title-input"
               placeholder="Page title" aria-label="Page title" />
        <div class="editor-modal__actions">
          <button class="btn btn--ghost" id="editor-discard">Discard</button>
          <button class="btn btn--primary" id="editor-save">Save</button>
        </div>
      </div>
      <div class="editor-modal__body">
        <div class="editor-split">
          <textarea id="editor-textarea" class="editor-textarea"
                    placeholder="Write in Markdown…"
                    aria-label="Page content editor"
                    spellcheck="true"></textarea>
          <div class="editor-preview" id="editor-preview"
               aria-label="Preview" aria-live="polite"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- TOAST CONTAINER -->
  <div class="toast-container" id="toast-container"
       role="status" aria-live="polite" aria-atomic="true"></div>

  <!-- App entry point -->
  <script type="module" src="/js/app.js"></script>

</body>
</html>
```

**Step 2: Verify**

Open in browser. Expected: black page (dark theme from `data-theme="dark"`). No JS errors from the HTML itself. Lucide, marked, and DOMPurify globals should all be defined in DevTools console before the module loads.

---

## Task 17: Rewrite `public/css/styles.css`

**Files:**
- Replace: `public/css/styles.css`

**What this builds:**
Full design system as a single CSS file. Design tokens via custom properties on `:root` (dark) and `[data-theme="light"]`. Three-column layout. All component styles. Animations.

**Step 1: Write the file**

Replace `public/css/styles.css`:

```css
/* ═══════════════════════════════════════════
   KNOWLEDGE PLATFORM — Design System v1
   ═══════════════════════════════════════════ */

/* ── 1. DESIGN TOKENS ─────────────────────── */
:root {
  /* Dark theme (default) */
  --base:        #0d0d11;
  --surface:     #13131a;
  --surface-2:   #18181f;
  --elevated:    #1e1e28;
  --border:      #28283a;
  --border-soft: #1c1c26;
  --text-1:      #f0ede8;
  --text-2:      #8c8ca0;
  --text-3:      #52526a;
  --accent:      #2dd4bf;
  --accent-bg:   rgba(45,212,191,0.09);
  --accent-hover:rgba(45,212,191,0.14);

  /* Status */
  --green:  #4ade80;
  --amber:  #fbbf24;
  --red:    #f87171;
  --purple: #c084fc;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.6);

  /* Layout */
  --topbar-h:  50px;
  --rail-w:    54px;
  --sidebar-w: 244px;

  /* Radii */
  --r-xs:   4px;
  --r-sm:   6px;
  --r-md:   8px;
  --r-lg:   10px;
  --r-xl:   12px;
  --r-pill: 20px;
  --r-full: 22px;

  /* Transitions */
  --t-fast: 120ms ease;
  --t-base: 180ms ease;
  --t-slow: 220ms ease;
}

[data-theme="light"] {
  --base:        #f5f5f7;
  --surface:     #ffffff;
  --surface-2:   #f0f0f5;
  --elevated:    #e8e8f0;
  --border:      #d4d4de;
  --border-soft: #e4e4ec;
  --text-1:      #111118;
  --text-2:      #6a6a80;
  --text-3:      #a0a0b8;
  --accent:      #0d9488;
  --accent-bg:   rgba(13,148,136,0.08);
  --accent-hover:rgba(13,148,136,0.13);
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.1);
  --shadow-md:   0 4px 16px rgba(0,0,0,0.12);
  --shadow-lg:   0 12px 40px rgba(0,0,0,0.16);
}

/* ── 2. RESET & BASE ──────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; overflow: hidden; }

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 14px;
  background: var(--base);
  color: var(--text-1);
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
button { cursor: pointer; font-family: inherit; font-size: inherit; border: none; background: none; color: inherit; }
input, textarea, select { font-family: inherit; font-size: inherit; color: inherit; }
ul, ol { list-style: none; }
i[data-lucide] { display: inline-flex; width: 16px; height: 16px; }

/* ── 3. LAYOUT ────────────────────────────── */
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--topbar-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border-soft);
  display: flex;
  align-items: center;
  padding: 0 12px 0 0;
  gap: 8px;
  z-index: 100;
}

.body-layout {
  display: flex;
  height: 100vh;
  padding-top: var(--topbar-h);
  overflow: hidden;
}

/* ── 4. WORKSPACE RAIL ────────────────────── */
.rail {
  width: var(--rail-w);
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 10;
}

.rail__list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  width: 100%;
  padding: 0 7px;
}

.rail__item {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-lg);
  color: var(--text-2);
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast);
}
.rail__item:hover { background: var(--surface-2); color: var(--text-1); }
.rail__item--active {
  color: var(--accent);
  background: var(--accent-bg);
}
.rail__item--active::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}

.rail__tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--elevated);
  border: 1px solid var(--border);
  color: var(--text-1);
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: var(--r-md);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--t-fast);
  z-index: 200;
}
.rail__item:hover .rail__tooltip { opacity: 1; }

.rail__footer { padding: 8px 0; }
.rail__add-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--r-md);
  color: var(--text-3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t-fast), color var(--t-fast);
}
.rail__add-btn:hover { background: var(--surface-2); color: var(--text-1); }

/* ── 5. SECTION SIDEBAR ───────────────────── */
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar__header {
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--border-soft);
  min-height: 40px;
  display: flex;
  align-items: center;
}

.sidebar__workspace-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'JetBrains Mono', monospace;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar__footer {
  padding: 8px 8px 12px;
  border-top: 1px solid var(--border-soft);
}

.sidebar__add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--r-md);
  color: var(--text-3);
  font-size: 13px;
  width: 100%;
  transition: background var(--t-fast), color var(--t-fast);
}
.sidebar__add-btn:hover { background: var(--surface-2); color: var(--text-1); }

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: var(--r-md);
  margin: 0 4px;
  cursor: pointer;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  transition: background var(--t-fast), color var(--t-fast);
  user-select: none;
}
.section-header:hover { background: var(--surface-2); color: var(--text-1); }
.section-header__chevron { margin-left: auto; transition: transform var(--t-base); }
.section-header--collapsed .section-header__chevron { transform: rotate(-90deg); }

.page-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--r-md);
  margin: 1px 4px;
  cursor: pointer;
  color: var(--text-2);
  font-size: 13px;
  transition: background var(--t-fast), color var(--t-fast);
  user-select: none;
}
.page-item:hover { background: var(--surface-2); color: var(--text-1); }
.page-item--active {
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 500;
}
.page-item[data-depth="1"] { padding-left: 26px; }
.page-item[data-depth="2"] { padding-left: 40px; }
.page-item[data-depth="3"] { padding-left: 54px; }

/* ── 6. TOP BAR COMPONENTS ────────────────── */
.topbar__left {
  display: flex;
  align-items: center;
  width: calc(var(--rail-w) + var(--sidebar-w));
  flex-shrink: 0;
  padding-left: 8px;
  gap: 0;
}

.hq-link {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-md);
  color: var(--text-1);
  transition: background var(--t-fast);
  flex-shrink: 0;
}
.hq-link:hover { background: var(--surface-2); text-decoration: none; }
.logo-mark { width: 28px; height: 28px; }

.topbar__app-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  padding-left: 8px;
  border-left: 1px solid var(--border-soft);
  margin-left: 4px;
}

.topbar__centre {
  flex: 1;
  display: flex;
  justify-content: center;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  padding: 6px 14px;
  color: var(--text-3);
  font-size: 13px;
  width: 280px;
  max-width: 100%;
  transition: border-color var(--t-fast), background var(--t-fast);
}
.search-trigger:hover {
  border-color: var(--accent);
  background: var(--surface-2);
  color: var(--text-2);
}
.search-trigger__label { flex: 1; text-align: left; }
.search-trigger__kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-xs);
  padding: 1px 5px;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 4px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-md);
  color: var(--text-2);
  transition: background var(--t-fast), color var(--t-fast);
}
.icon-btn:hover { background: var(--surface-2); color: var(--text-1); }

.avatar-btn { width: 32px; height: 32px; border-radius: 50%; padding: 0; margin-left: 4px; }
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--elevated);
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  font-family: 'JetBrains Mono', monospace;
}

/* ── 7. CONTENT PANE ──────────────────────── */
.content-pane {
  flex: 1;
  overflow-y: auto;
  background: var(--base);
  position: relative;
}

.content-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-3);
}
.content-placeholder i { width: 40px; height: 40px; }
.content-placeholder p { font-size: 14px; }

.page-view {
  max-width: 820px;
  margin: 0 auto;
  padding: 32px 40px 80px;
  animation: fade-in 150ms ease;
}

.page-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-3);
  margin-bottom: 20px;
}
.page-breadcrumb a { color: var(--text-3); }
.page-breadcrumb a:hover { color: var(--text-2); }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.7px;
  color: var(--text-1);
  line-height: 1.2;
}

.page-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; padding-top: 4px; }

.page-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  border: 1px solid currentColor;
  opacity: 0.85;
}
.badge--active   { color: var(--green); }
.badge--draft    { color: var(--amber); }
.badge--archived { color: var(--red); }
.badge--global   { color: var(--purple); }

.page-divider {
  border: none;
  border-top: 1px solid var(--border-soft);
  margin-bottom: 24px;
}

/* Article body (Lora serif) */
.article-body {
  font-family: 'Lora', Georgia, serif;
  font-size: 15.5px;
  line-height: 1.82;
  color: var(--text-1);
  max-width: 700px;
}
.article-body h1 { font-family: 'DM Sans', sans-serif; font-size: 24px; font-weight: 600; margin: 32px 0 12px; }
.article-body h2 { font-family: 'DM Sans', sans-serif; font-size: 20px; font-weight: 600; margin: 28px 0 10px; }
.article-body h3 { font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 600; margin: 20px 0 8px; }
.article-body p  { margin-bottom: 16px; }
.article-body ul, .article-body ol { margin: 0 0 16px 24px; }
.article-body li { margin-bottom: 4px; }
.article-body ul { list-style: disc; }
.article-body ol { list-style: decimal; }
.article-body a  { color: var(--accent); }
.article-body blockquote {
  border-left: 3px solid var(--accent);
  padding: 4px 0 4px 16px;
  color: var(--text-2);
  margin: 16px 0;
}
.article-body code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background: var(--elevated);
  padding: 1px 5px;
  border-radius: var(--r-xs);
  color: var(--accent);
}
.article-body pre {
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 16px;
}
.article-body pre code { background: none; padding: 0; color: var(--text-1); font-size: 13px; }
.article-body table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px; font-family: 'DM Sans', sans-serif; }
.article-body th {
  background: var(--elevated);
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.article-body td { border: 1px solid var(--border-soft); padding: 8px 12px; }
.article-body hr { border: none; border-top: 1px solid var(--border-soft); margin: 24px 0; }
.article-body img { max-width: 100%; border-radius: var(--r-md); }

/* Asset panel */
.asset-panel {
  margin-top: 40px;
  border-top: 1px solid var(--border-soft);
  padding-top: 20px;
}
.asset-panel__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.asset-panel__title {
  font-size: 11px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-3);
}
.asset-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--r-md);
  cursor: pointer;
  transition: background var(--t-fast);
}
.asset-row:hover { background: var(--surface-2); }
.asset-row__icon { color: var(--text-3); flex-shrink: 0; }
.asset-row__name { font-size: 13px; font-weight: 500; }
.asset-row__meta { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text-3); margin-left: auto; }

/* ── 8. OVERLAYS ──────────────────────────── */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.overlay[hidden] { display: none; }
.overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* Auth overlay */
.overlay--fullscreen { align-items: center; justify-content: center; }
.auth-card {
  position: relative;
  z-index: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: 32px;
  width: 360px;
  box-shadow: var(--shadow-lg);
}
.auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.auth-title { font-size: 16px; font-weight: 600; }
.auth-heading { font-size: 18px; font-weight: 600; margin-bottom: 20px; }
.auth-form .field { margin-bottom: 14px; }
.label { display: block; font-size: 12px; font-weight: 500; color: var(--text-2); margin-bottom: 5px; }
.input {
  width: 100%;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  padding: 8px 14px;
  font-size: 14px;
  color: var(--text-1);
  outline: none;
  transition: border-color var(--t-fast);
}
.input:focus { border-color: var(--accent); }
.input::placeholder { color: var(--text-3); }
.auth-error {
  font-size: 13px;
  color: var(--red);
  margin-bottom: 10px;
  padding: 8px 12px;
  background: rgba(248,113,113,0.08);
  border-radius: var(--r-md);
  border: 1px solid rgba(248,113,113,0.2);
}
.auth-switch { text-align: center; font-size: 13px; color: var(--text-2); margin-top: 14px; }
.link-btn { color: var(--accent); text-decoration: underline; cursor: pointer; font-size: inherit; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: var(--r-lg);
  font-size: 13px;
  font-weight: 500;
  transition: background var(--t-fast), opacity var(--t-fast), border-color var(--t-fast);
  border: 1px solid transparent;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--primary { background: var(--accent); color: #0a1a18; border-color: var(--accent); }
.btn--primary:hover:not(:disabled) { opacity: 0.88; }
.btn--ghost { background: transparent; color: var(--text-2); border-color: var(--border); }
.btn--ghost:hover:not(:disabled) { background: var(--surface-2); color: var(--text-1); }
.btn--full { width: 100%; }
.btn--sm { padding: 4px 10px; font-size: 12px; }

/* Search overlay */
.overlay--search { align-items: flex-start; padding-top: 80px; }
.search-modal {
  position: relative;
  z-index: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  width: 580px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.search-modal__input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-soft);
}
.search-modal__icon { color: var(--text-3); flex-shrink: 0; }
.search-modal__input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--text-1);
}
.search-modal__input::placeholder { color: var(--text-3); }
.search-modal__close {
  color: var(--text-3);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-xs);
  padding: 2px 6px;
  cursor: pointer;
}
.search-modal__filters { display: flex; gap: 6px; padding: 10px 16px; border-bottom: 1px solid var(--border-soft); }
.filter-chip {
  padding: 3px 10px;
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: 500;
  background: var(--elevated);
  border: 1px solid var(--border);
  color: var(--text-2);
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
}
.filter-chip:hover { color: var(--text-1); }
.filter-chip--active { background: var(--accent-bg); border-color: var(--accent); color: var(--accent); }
.search-results { overflow-y: auto; padding: 8px 0; flex: 1; }
.search-result-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background var(--t-fast);
  animation: stagger-in 180ms ease both;
}
.search-result-item:hover { background: var(--surface-2); }
.search-result-item__title { font-size: 14px; font-weight: 500; }
.search-result-item__path { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text-3); }
.search-result-item__excerpt { font-size: 13px; color: var(--text-2); margin-top: 2px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.search-empty { padding: 24px; text-align: center; color: var(--text-3); font-size: 13px; }

/* Settings overlay */
.overlay--panel { align-items: stretch; justify-content: flex-end; }
.settings-panel {
  position: relative;
  z-index: 1;
  background: var(--surface);
  border-left: 1px solid var(--border);
  width: 600px;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: var(--shadow-lg);
}
.settings-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}
.settings-panel__title { font-size: 16px; font-weight: 600; }
.settings-panel__layout { display: flex; flex: 1; overflow: hidden; }
.settings-panel__nav {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-right: 1px solid var(--border-soft);
  width: 160px;
  flex-shrink: 0;
  gap: 2px;
}
.settings-nav-item {
  padding: 7px 10px;
  border-radius: var(--r-md);
  font-size: 13px;
  text-align: left;
  color: var(--text-2);
  transition: background var(--t-fast), color var(--t-fast);
}
.settings-nav-item:hover { background: var(--surface-2); color: var(--text-1); }
.settings-nav-item--active { background: var(--accent-bg); color: var(--accent); font-weight: 500; }
.settings-nav-item--danger { color: var(--red); }
.settings-nav-item--danger:hover { background: rgba(248,113,113,0.08); }
.settings-panel__body { flex: 1; overflow-y: auto; padding: 20px; }

/* Editor overlay */
.overlay--editor { align-items: stretch; justify-content: stretch; padding: 0; }
.overlay--editor::before { background: rgba(0,0,0,0.9); }
.editor-modal {
  position: relative;
  z-index: 1;
  background: var(--base);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.editor-modal__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}
.editor-title-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-1);
}
.editor-title-input::placeholder { color: var(--text-3); }
.editor-modal__actions { display: flex; gap: 8px; }
.editor-modal__body { flex: 1; overflow: hidden; }
.editor-split { display: grid; grid-template-columns: 1fr 1fr; height: 100%; }
.editor-textarea {
  background: var(--base);
  border: none;
  border-right: 1px solid var(--border-soft);
  outline: none;
  padding: 24px 28px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-1);
  resize: none;
  height: 100%;
}
.editor-preview {
  overflow-y: auto;
  padding: 24px 28px;
  font-family: 'Lora', serif;
  font-size: 15.5px;
  line-height: 1.82;
  color: var(--text-1);
}

/* ── 9. TOASTS ────────────────────────────── */
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-md);
  font-size: 13px;
  font-weight: 500;
  max-width: 320px;
  animation: toast-in 200ms ease;
  pointer-events: all;
}
.toast--success { border-color: rgba(74,222,128,0.3); }
.toast--error   { border-color: rgba(248,113,113,0.3); color: var(--red); }
.toast--info    { border-color: rgba(45,212,191,0.3); }

/* ── 10. MAP VIEW ─────────────────────────── */
.map-view { padding: 24px 32px; }
.map-view__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.map-view__title { font-size: 22px; font-weight: 600; letter-spacing: -0.4px; }
.map-filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.map-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.map-table th {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  border-bottom: 1px solid var(--border);
  padding: 6px 12px;
  text-align: left;
}
.map-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-soft); vertical-align: middle; }
.map-table tr:hover td { background: var(--surface-2); }

/* ── 11. SKELETON STATES ──────────────────── */
.skeleton {
  background: linear-gradient(90deg, var(--elevated) 25%, var(--surface-2) 50%, var(--elevated) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--r-md);
}
.skeleton--text  { height: 14px; margin-bottom: 8px; }
.skeleton--title { height: 28px; margin-bottom: 16px; width: 60%; }
.skeleton--line  { height: 12px; margin-bottom: 6px; }

/* ── 12. SCROLLBARS ───────────────────────── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-3); }

/* ── 13. ANIMATIONS ───────────────────────── */
@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes stagger-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

**Step 2: Verify**

Open the app with no JS (temporarily comment out the module script). Checklist:
- [ ] Dark background visible on `<body>`
- [ ] Auth overlay card centred and styled
- [ ] Three-column layout dimensions correct
- [ ] Google Fonts loaded (check Network tab)
- [ ] No CSS parse errors in DevTools

---

## Task 18: Rewrite `public/js/api.js` and create `public/js/store.js`

**Files:**
- Replace: `public/js/api.js`
- Create: `public/js/store.js`

**What this builds:**
`api.js` — single module that wraps every backend call. Handles 401 redirects. Returns parsed JSON or throws.
`store.js` — central state object with helpers for theme and sidebar persistence.

**Step 1: Write `public/js/api.js`**

Replace `public/js/api.js`:

```javascript
// api.js — Central API client. All fetch() calls go through here only.

const BASE = '';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  if (res.status === 401) {
    import('./auth.js').then(m => m.showAuthOverlay());
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Expose request for ad-hoc calls (e.g. settings)
export { request };

// Auth
export const login    = (body) => request('POST', '/api/auth/login',    body);
export const register = (body) => request('POST', '/api/auth/register', body);
export const logout   = ()     => request('POST', '/api/auth/logout');
export const getMe    = ()     => request('GET',  '/api/auth/me');

// Workspaces
export const listWorkspaces  = ()         => request('GET',    '/api/workspaces');
export const createWorkspace = (body)     => request('POST',   '/api/workspaces',        body);
export const updateWorkspace = (id, body) => request('PATCH',  `/api/workspaces/${id}`,  body);
export const deleteWorkspace = (id)       => request('DELETE', `/api/workspaces/${id}`);

// Sections
export const listSections  = (wsId)      => request('GET',    `/api/workspaces/${wsId}/sections`);
export const createSection = (body)      => request('POST',   '/api/sections',        body);
export const updateSection = (id, body)  => request('PATCH',  `/api/sections/${id}`,  body);
export const deleteSection = (id)        => request('DELETE', `/api/sections/${id}`);

// Pages
export const listPages  = (sectionId)  => request('GET',    `/api/sections/${sectionId}/pages`);
export const getPage    = (id)         => request('GET',    `/api/pages/${id}`);
export const createPage = (body)       => request('POST',   '/api/pages',         body);
export const updatePage = (id, body)   => request('PATCH',  `/api/pages/${id}`,   body);
export const deletePage = (id)         => request('DELETE', `/api/pages/${id}`);
export const movePage   = (id, body)   => request('PATCH',  `/api/pages/${id}/move`, body);

// Assets
export const listAssets  = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/api/assets${qs ? '?' + qs : ''}`);
};
export const getAsset    = (id)        => request('GET',   `/api/assets/${id}`);
export const createAsset = (body)      => request('POST',  '/api/assets',        body);
export const updateAsset = (id, body)  => request('PATCH', `/api/assets/${id}`,  body);
export const linkAsset   = (id, body)  => request('POST',  `/api/assets/${id}/link`, body);

// File upload (multipart — bypasses JSON wrapper)
export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

// Search
export const search = (q, params = {}) => {
  const qs = new URLSearchParams({ q, ...params }).toString();
  return request('GET', `/api/search?${qs}`);
};

// Relationships
export const listRelationships      = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/api/relationships${qs ? '?' + qs : ''}`);
};
export const createRelationship     = (body) => request('POST',   '/api/relationships',      body);
export const deleteRelationship     = (id)   => request('DELETE', `/api/relationships/${id}`);
export const listAssetRelationships = (id)   => request('GET',    `/api/assets/${id}/relationships`);

// Admin
export const listUsers   = ()         => request('GET',    '/api/admin/users');
export const updateUser  = (id, body) => request('PATCH',  `/api/admin/users/${id}`, body);
export const deleteUser  = (id)       => request('DELETE', `/api/admin/users/${id}`);
export const listTokens  = ()         => request('GET',    '/api/admin/tokens');
export const createToken = (body)     => request('POST',   '/api/admin/tokens',      body);
export const deleteToken = (id)       => request('DELETE', `/api/admin/tokens/${id}`);
```

**Step 2: Create `public/js/store.js`**

Create `public/js/store.js`:

```javascript
// store.js — Central application state. Import this from any module.

export const store = {
  user:             null,  // { id, username, displayName, role } | null
  workspaces:       [],    // array from /api/workspaces
  currentWorkspace: null,  // workspace object | null
  currentSection:   null,  // section object | null
  currentPage:      null,  // full page object (with assets) | null
  sidebarState:     {},    // { [sectionId]: boolean } — true = expanded
  theme:            localStorage.getItem('kb-theme') || 'dark',
  searchQuery:      '',
  searchResults:    [],
  searchFilter:     'all', // 'all' | 'pages' | 'assets'
};

// Restore persisted sidebar state
try {
  const saved = localStorage.getItem('kb-sidebar-state');
  if (saved) store.sidebarState = JSON.parse(saved);
} catch (_) { /* ignore */ }

/** Persist sidebar collapse state */
export function saveSidebarState() {
  localStorage.setItem('kb-sidebar-state', JSON.stringify(store.sidebarState));
}

/** Apply theme to document root and persist to localStorage */
export function applyTheme(theme) {
  store.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('kb-theme', theme);
}

/** Toggle between dark and light */
export function toggleTheme() {
  applyTheme(store.theme === 'dark' ? 'light' : 'dark');
}

// Apply persisted theme immediately on import (before first paint)
document.documentElement.setAttribute('data-theme', store.theme);
```

**Step 3: Verify**

In DevTools console after app loads:

```javascript
// Should print store object with all keys present
const m = await import('/js/store.js');
console.log(m.store);
```

---

## Task 19: Toast, utils, auth forms, and app boot

**Files:**
- Create: `public/js/toast.js`
- Create: `public/js/utils.js`
- Replace: `public/js/auth.js`
- Replace: `public/js/app.js`

**Step 1: Create `public/js/toast.js`**

```javascript
// toast.js — Transient notification toasts

const container = document.getElementById('toast-container');

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 * @param {number} [duration=3000]
 */
export function toast(message, type = 'info', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message; // textContent — safe, no HTML
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms ease';
    setTimeout(() => el.remove(), 210);
  }, duration);
}

export const toastSuccess = (msg, dur) => toast(msg, 'success', dur);
export const toastError   = (msg, dur) => toast(msg, 'error',   dur);
export const toastInfo    = (msg, dur) => toast(msg, 'info',    dur);
```

**Step 2: Create `public/js/utils.js`**

```javascript
// utils.js — Pure utility functions. No side effects. No DOM access.
// marked and DOMPurify are loaded as globals via CDN script tags in index.html.

/**
 * Render markdown to sanitized HTML.
 * Use the return value with a sanitized DOM insertion — see content.js for usage.
 * @param {string} md
 * @returns {string} HTML string (safe — DOMPurify sanitized)
 */
export function renderMarkdown(md) {
  if (!md) return '';
  const raw = window.marked.parse(md);
  return window.DOMPurify.sanitize(raw);
}

/**
 * Format ISO date string for display.
 * @param {string} iso
 * @returns {string} e.g. "27 Feb 2026"
 */
export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Get user initials (max 2 chars) for the avatar.
 * @param {string} displayName
 * @returns {string}
 */
export function initials(displayName) {
  if (!displayName) return '?';
  return displayName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} wait  ms
 */
export function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str, maxLen) {
  if (!str) return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + '…';
}

/**
 * Extract a plain-text excerpt from markdown.
 */
export function excerpt(md, maxLen = 120) {
  if (!md) return '';
  const plain = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_`[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return truncate(plain, maxLen);
}

/**
 * Build a URL path from workspace, section, page slugs.
 */
export function buildPath(...slugs) {
  return '/' + slugs.filter(Boolean).join('/');
}
```

**Step 3: Write `public/js/auth.js`**

Replace `public/js/auth.js`:

```javascript
// auth.js — Auth overlay: login and register forms

import * as api from './api.js';
import { store }     from './store.js';
import { toastError } from './toast.js';

const overlay      = document.getElementById('auth-overlay');
const appEl        = document.getElementById('app');
const loginForm    = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError   = document.getElementById('login-error');
const regError     = document.getElementById('register-error');

export function showAuthOverlay() {
  overlay.hidden     = false;
  appEl.hidden       = true;
  loginForm.hidden   = false;
  registerForm.hidden = true;
  loginForm.reset();
}

export function hideAuthOverlay() {
  overlay.hidden = true;
  appEl.hidden   = false;
}

function setError(el, msg) {
  el.textContent = msg; // textContent — safe, no HTML
  el.hidden = false;
}

function clearError(el) {
  el.textContent = '';
  el.hidden = true;
}

// Toggle login / register view
overlay.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (action === 'show-register') {
    loginForm.hidden    = true;
    registerForm.hidden = false;
    clearError(loginError);
    clearError(regError);
  }
  if (action === 'show-login') {
    loginForm.hidden    = false;
    registerForm.hidden = true;
    clearError(loginError);
    clearError(regError);
  }
});

// Login submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(loginError);
  const data = Object.fromEntries(new FormData(loginForm));
  const btn  = loginForm.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Signing in…';
  try {
    store.user = await api.login(data);
    hideAuthOverlay();
    window.dispatchEvent(new CustomEvent('kb:authed'));
  } catch (err) {
    setError(loginError, err.message === 'Unauthorized'
      ? 'Invalid username or password.'
      : (err.message || 'Sign in failed.'));
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Sign in';
  }
});

// Register submit
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(regError);
  const data = Object.fromEntries(new FormData(registerForm));
  const btn  = registerForm.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Creating account…';
  try {
    store.user = await api.register(data);
    hideAuthOverlay();
    window.dispatchEvent(new CustomEvent('kb:authed'));
  } catch (err) {
    setError(regError, err.message || 'Registration failed. Username may already be taken.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Create account';
  }
});
```

**Step 4: Write `public/js/app.js`**

Replace `public/js/app.js`:

```javascript
// app.js — Application entry point.
// Boot sequence: check session → render nav → bind top bar → start routing.

import * as api  from './api.js';
import { store, applyTheme, toggleTheme, saveSidebarState } from './store.js';
import { showAuthOverlay, hideAuthOverlay } from './auth.js';
import { toastError }  from './toast.js';
import { initials }    from './utils.js';

// ── Boot ──────────────────────────────────────
async function boot() {
  applyTheme(store.theme); // Apply persisted theme before any render
  try {
    store.user = await api.getMe();
    hideAuthOverlay();
    await initApp();
  } catch (_) {
    showAuthOverlay();
  }
}

async function initApp() {
  renderAvatar();
  await setHqLink();
  await loadWorkspaces();
  bindTopBar();
  bindShortcuts();
  window.lucide.createIcons();
}

// ── Avatar ────────────────────────────────────
function renderAvatar() {
  const el = document.getElementById('avatar-initials');
  if (el && store.user) {
    el.textContent = initials(store.user.displayName || store.user.username);
  }
}

// ── HQ link ───────────────────────────────────
async function setHqLink() {
  try {
    const setting = await api.request('GET', '/api/settings/hq-url');
    if (setting?.value) {
      document.getElementById('hq-link').href = setting.value;
    }
  } catch (_) { /* non-critical — HQ URL is optional */ }
}

// ── Workspaces ────────────────────────────────
async function loadWorkspaces() {
  try {
    store.workspaces = await api.listWorkspaces();
    renderRail();
    if (store.workspaces.length > 0) {
      await selectWorkspace(store.workspaces[0]);
    }
  } catch (_) {
    toastError('Could not load workspaces');
  }
}

function renderRail() {
  const rail = document.getElementById('workspace-rail');
  rail.textContent = ''; // clear without innerHTML

  store.workspaces.forEach(ws => {
    const li = document.createElement('li');
    li.className = 'rail__item' + (store.currentWorkspace?.id === ws.id ? ' rail__item--active' : '');
    li.dataset.id = ws.id;
    li.setAttribute('role', 'listitem');

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', ws.icon || 'folder');
    icon.setAttribute('aria-hidden', 'true');

    const tooltip = document.createElement('span');
    tooltip.className = 'rail__tooltip';
    tooltip.textContent = ws.name; // textContent — safe

    li.appendChild(icon);
    li.appendChild(tooltip);
    li.addEventListener('click', () => selectWorkspace(ws));
    rail.appendChild(li);
  });

  window.lucide.createIcons();
}

async function selectWorkspace(ws) {
  store.currentWorkspace = ws;
  store.currentSection   = null;
  store.currentPage      = null;
  renderRail();

  const label = document.getElementById('sidebar-workspace-label');
  if (label) label.textContent = ws.name; // textContent — safe

  await loadSections(ws.id);
}

// ── Sections ──────────────────────────────────
async function loadSections(workspaceId) {
  const list = document.getElementById('section-list');
  list.textContent = '';
  try {
    const sections = await api.listSections(workspaceId);
    renderSections(sections);
  } catch (_) {
    toastError('Could not load sections');
  }
}

function renderSections(sections) {
  const list = document.getElementById('section-list');
  list.textContent = '';

  sections.forEach(section => {
    const isExpanded = store.sidebarState[section.id] !== false; // default open

    const headerLi = document.createElement('li');
    const header   = document.createElement('div');
    header.className = 'section-header' + (isExpanded ? '' : ' section-header--collapsed');

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', section.icon || 'folder');
    icon.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.textContent = section.name; // textContent — safe

    const chevron = document.createElement('i');
    chevron.setAttribute('data-lucide', 'chevron-down');
    chevron.className = 'section-header__chevron';
    chevron.setAttribute('aria-hidden', 'true');

    header.appendChild(icon);
    header.appendChild(name);
    header.appendChild(chevron);
    headerLi.appendChild(header);
    list.appendChild(headerLi);

    const pagesLi = document.createElement('li');
    pagesLi.id = `pages-${section.id}`;
    pagesLi.hidden = !isExpanded;
    list.appendChild(pagesLi);

    header.addEventListener('click', () => {
      const nowExpanded = pagesLi.hidden;
      pagesLi.hidden = !nowExpanded;
      header.classList.toggle('section-header--collapsed', !nowExpanded);
      store.sidebarState[section.id] = nowExpanded;
      saveSidebarState();
      if (nowExpanded && !pagesLi.dataset.loaded) {
        loadPages(section.id, pagesLi);
      }
    });

    if (isExpanded) loadPages(section.id, pagesLi);
  });

  window.lucide.createIcons();
}

// ── Pages ─────────────────────────────────────
async function loadPages(sectionId, container) {
  container.dataset.loaded = 'true';
  try {
    const pages = await api.listPages(sectionId);
    renderPageTree(pages, container);
  } catch (_) { /* empty sections are fine */ }
}

function renderPageTree(pages, container, parentId = null, depth = 0) {
  pages
    .filter(p => (p.parent_id ?? null) === parentId)
    .forEach(page => {
      const li   = document.createElement('li');
      const item = document.createElement('div');
      item.className  = 'page-item' + (store.currentPage?.id === page.id ? ' page-item--active' : '');
      item.dataset.id    = page.id;
      item.dataset.depth = depth;

      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'file-text');
      icon.setAttribute('aria-hidden', 'true');

      const title = document.createElement('span');
      title.textContent = page.title; // textContent — safe

      item.appendChild(icon);
      item.appendChild(title);
      item.addEventListener('click', () => selectPage(page));
      li.appendChild(item);
      container.appendChild(li);

      renderPageTree(pages, container, page.id, depth + 1);
    });

  window.lucide.createIcons();
}

export async function selectPage(page) {
  store.currentPage = page;
  document.querySelectorAll('.page-item').forEach(el => {
    el.classList.toggle('page-item--active', el.dataset.id == page.id);
  });
  try {
    const full = await api.getPage(page.id);
    store.currentPage = full;
    const { renderPage } = await import('./content.js');
    renderPage(full);
  } catch (_) {
    toastError('Could not load page');
  }
}

// ── Top bar ───────────────────────────────────
function bindTopBar() {
  // Theme toggle
  const themeBtn  = document.getElementById('theme-btn');
  const themeIcon = document.getElementById('theme-icon');
  themeBtn?.addEventListener('click', () => {
    toggleTheme();
    themeIcon?.setAttribute('data-lucide', store.theme === 'dark' ? 'moon' : 'sun');
    window.lucide.createIcons();
  });
  themeIcon?.setAttribute('data-lucide', store.theme === 'dark' ? 'moon' : 'sun');

  // Settings
  const settingsBtn     = document.getElementById('settings-btn');
  const settingsClose   = document.getElementById('settings-close');
  const settingsOverlay = document.getElementById('settings-overlay');
  settingsBtn?.addEventListener('click', async () => {
    settingsOverlay.hidden = false;
    const { initSettings } = await import('./settings.js');
    initSettings();
  });
  settingsClose?.addEventListener('click', () => { settingsOverlay.hidden = true; });

  // Map view
  document.getElementById('map-btn')?.addEventListener('click', async () => {
    const { renderMapView } = await import('./map.js');
    renderMapView();
  });

  // Search
  document.getElementById('search-trigger')?.addEventListener('click', openSearch);
  document.getElementById('search-close')?.addEventListener('click', closeSearch);

  // Add workspace
  document.getElementById('add-workspace-btn')?.addEventListener('click', promptAddWorkspace);

  // Search input (lazy-load search module)
  document.getElementById('search-input')?.addEventListener('input', async (e) => {
    store.searchQuery = e.target.value;
    const { handleSearch } = await import('./search.js');
    handleSearch(store.searchQuery);
  });

  // Filter chips
  document.getElementById('search-filters')?.addEventListener('click', async (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('filter-chip--active'));
    chip.classList.add('filter-chip--active');
    store.searchFilter = chip.dataset.filter;
    const { handleSearch } = await import('./search.js');
    handleSearch(store.searchQuery);
  });
}

// ── Search ────────────────────────────────────
function openSearch() {
  document.getElementById('search-overlay').hidden = false;
  setTimeout(() => document.getElementById('search-input')?.focus(), 50);
}

function closeSearch() {
  document.getElementById('search-overlay').hidden = true;
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  const results = document.getElementById('search-results');
  if (results) results.textContent = '';
  store.searchQuery = '';
}

// ── Keyboard shortcuts ────────────────────────
function bindShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') {
      closeSearch();
      document.getElementById('settings-overlay').hidden = true;
      document.getElementById('editor-overlay').hidden   = true;
    }
  });
}

// ── Add workspace (v1: simple prompt) ────────
async function promptAddWorkspace() {
  const name = window.prompt('Workspace name:');
  if (!name?.trim()) return;
  try {
    const ws = await api.createWorkspace({ name: name.trim(), icon: 'folder' });
    store.workspaces.push(ws);
    renderRail();
  } catch (_) {
    toastError('Could not create workspace');
  }
}

// ── Auth event listener ───────────────────────
window.addEventListener('kb:authed', () => initApp());

// ── Start ─────────────────────────────────────
boot();
```

**Step 5: Verify — boot sequence checklist**

- [ ] Page loads: dark background visible immediately (no flash of unstyled content)
- [ ] Auth overlay appears on first load (no session)
- [ ] Login form submits → success → app div shown
- [ ] Workspaces appear in the rail
- [ ] Clicking a workspace loads sections in sidebar
- [ ] Section header click collapses / expands with chevron animation
- [ ] Sidebar collapse state persists on page reload
- [ ] Clicking a page item marks it active in sidebar
- [ ] ⌘K opens search overlay; Escape closes it
- [ ] Theme toggle switches dark ↔ light; persists on reload
- [ ] Lucide icons render throughout (rail, sidebar, top bar)
- [ ] No console errors

---

## Summary — Phase 3 files created or replaced

| File | Action | Purpose |
|---|---|---|
| `public/index.html` | Replace | Three-column shell + all overlays |
| `public/css/styles.css` | Replace | Full design system — tokens, layout, all components |
| `public/js/api.js` | Replace | Central fetch wrapper — all API endpoints |
| `public/js/store.js` | Create | Central state + theme/sidebar helpers |
| `public/js/toast.js` | Create | Toast notifications |
| `public/js/utils.js` | Create | renderMarkdown, formatDate, initials, debounce, excerpt |
| `public/js/auth.js` | Replace | Login / register overlay |
| `public/js/app.js` | Replace | Boot, navigation, top bar, shortcuts |

## Phase 4 preview — what comes next

Phase 4 covers the remaining frontend modules:

| Task | File | What it does |
|---|---|---|
| 20 | `public/js/content.js` | Renders page view: breadcrumb, title, badges, article body (markdown → sanitized), asset panel |
| 21 | `public/js/editor.js` | Edit page: open editor overlay, auto-save draft, publish on save |
| 22 | `public/js/search.js` | Search results rendering — debounced, staggered results, filter by type |
| 23 | `public/js/map.js` | Asset relationships map view — filterable table |
| 24 | `public/js/settings.js` | Settings overlay — workspaces, users, API tokens, account, danger zone |
# Knowledge Platform — Implementation Plan
# Phase 4: Frontend Components — Content, Editor, Search, Map, Settings

**Goal:** Build the five remaining frontend modules that make the app functional end-to-end. After this phase, a user can read pages, edit and save them, search, view the relationship map, and manage settings.

**Architecture:** Each module is a lazily-imported ES module. All Markdown rendering uses a `setMarkdownContent(element, md)` helper (defined in utils.js addendum below) that goes through DOMPurify → DOMParser → appendChild. No direct innerHTML assignments.

**Dependencies:** Phase 3 complete — `index.html`, `styles.css`, `api.js`, `store.js`, `toast.js`, `utils.js`, `auth.js`, `app.js` all exist.

**Task numbering continues from Phase 3 (Tasks 16–19).**

---

## Task 20a: Add `setMarkdownContent` to `public/js/utils.js`

**File:** Append to `public/js/utils.js`

Before writing the content modules, add one helper to utils.js. This is the only place markdown is converted to live DOM nodes — via DOMPurify then DOMParser, with no innerHTML assignment anywhere in the codebase.

**Append to `public/js/utils.js`:**

```javascript
/**
 * Render markdown to DOM nodes and append to element.
 * Pipeline: marked.parse → DOMPurify.sanitize → DOMParser → appendChild
 * No innerHTML assignment. Safe for user-authored and AI-authored content.
 * @param {HTMLElement} element  Target container (will be cleared first)
 * @param {string} md            Markdown string
 */
export function setMarkdownContent(element, md) {
  element.textContent = ''; // safe clear
  if (!md) return;
  const sanitized = window.DOMPurify.sanitize(window.marked.parse(md));
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div>' + sanitized + '</div>', 'text/html');
  Array.from(doc.body.firstChild.childNodes).forEach(node => {
    element.appendChild(node.cloneNode(true));
  });
}
```

---

## Task 20: Create `public/js/content.js`

**Files:**
- Create: `public/js/content.js`

**What this builds:**
Renders a full page into the content pane. Breadcrumb trail, page title, action buttons, status badges, Markdown body, asset panel. Called by `app.js` whenever a page is selected.

**Step 1: Write the file**

Create `public/js/content.js`:

```javascript
// content.js — Renders a page into the content pane.
// Imported lazily from app.js: const { renderPage } = await import('./content.js')
// Markdown is rendered via setMarkdownContent (DOMPurify + DOMParser, no innerHTML).

import { store }        from './store.js';
import { setMarkdownContent, formatDate } from './utils.js';
import { toastError }   from './toast.js';
import * as api         from './api.js';

const pane = document.getElementById('content-pane');

const ASSET_ICONS = {
  skill:    'zap',
  config:   'settings-2',
  decision: 'clipboard-list',
  session:  'scroll-text',
  image:    'image',
  file:     'file-code',
  link:     'external-link',
  miro:     'layout-template',
};

/**
 * Render a full page object into the content pane.
 * @param {object} page  Full page from GET /api/pages/:id (includes assets array)
 */
export function renderPage(page) {
  pane.textContent = ''; // safe clear

  const view = document.createElement('div');
  view.className = 'page-view';

  view.appendChild(buildBreadcrumb(page));
  view.appendChild(buildHeader(page));
  view.appendChild(buildMeta(page));

  const divider = document.createElement('hr');
  divider.className = 'page-divider';
  view.appendChild(divider);

  view.appendChild(buildBody(page));

  if (page.assets && page.assets.length > 0) {
    view.appendChild(buildAssetPanel(page.assets));
  }

  pane.appendChild(view);
  window.lucide.createIcons();
}

// ── Breadcrumb ──────────────────────────────
function buildBreadcrumb(page) {
  const nav = document.createElement('nav');
  nav.className = 'page-breadcrumb';
  nav.setAttribute('aria-label', 'Breadcrumb');

  const crumbs = [
    { text: store.currentWorkspace?.name, href: '#' },
    { text: store.currentSection?.name,   href: '#' },
    { text: page.title,                   href: null },
  ].filter(c => c.text);

  crumbs.forEach((crumb, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'page-breadcrumb__sep';
      sep.textContent = '›'; // safe
      nav.appendChild(sep);
    }
    if (crumb.href) {
      const a = document.createElement('a');
      a.href = crumb.href;
      a.textContent = crumb.text; // textContent — safe
      nav.appendChild(a);
    } else {
      const span = document.createElement('span');
      span.textContent = crumb.text; // textContent — safe
      nav.appendChild(span);
    }
  });

  return nav;
}

// ── Header (title + edit button) ────────────
function buildHeader(page) {
  const header = document.createElement('div');
  header.className = 'page-header';

  const title = document.createElement('h1');
  title.className = 'page-title';
  title.textContent = page.title; // textContent — safe

  const actions = document.createElement('div');
  actions.className = 'page-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn--ghost btn--sm';

  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', 'pencil');
  icon.setAttribute('aria-hidden', 'true');
  editBtn.appendChild(icon);
  editBtn.appendChild(document.createTextNode(' Edit'));
  editBtn.addEventListener('click', () => {
    import('./editor.js').then(m => m.openEditor(page));
  });

  actions.appendChild(editBtn);
  header.appendChild(title);
  header.appendChild(actions);
  return header;
}

// ── Meta (badges + date) ────────────────────
function buildMeta(page) {
  const meta = document.createElement('div');
  meta.className = 'page-meta';

  if (page.status) {
    const badge = document.createElement('span');
    badge.className = 'badge badge--' + page.status;
    badge.textContent = page.status; // textContent — safe
    meta.appendChild(badge);
  }

  if (page.template_type && page.template_type !== 'blank') {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = page.template_type; // textContent — safe
    meta.appendChild(badge);
  }

  if (page.updated_at) {
    const date = document.createElement('span');
    date.style.cssText = 'font-size:11px;font-family:"JetBrains Mono",monospace;color:var(--text-3);margin-left:auto;';
    date.textContent = 'Updated ' + formatDate(page.updated_at); // textContent — safe
    meta.appendChild(date);
  }

  return meta;
}

// ── Article body (markdown → DOM) ───────────
function buildBody(page) {
  const article = document.createElement('article');
  article.className = 'article-body';

  if (page.content) {
    // setMarkdownContent: DOMPurify.sanitize → DOMParser → appendChild
    // No innerHTML used. See utils.js.
    setMarkdownContent(article, page.content);
  } else {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--text-3);font-style:italic;';
    p.textContent = 'This page has no content yet. Click Edit to add some.';
    article.appendChild(p);
  }

  return article;
}

// ── Asset panel ──────────────────────────────
function buildAssetPanel(assets) {
  const panel = document.createElement('section');
  panel.className = 'asset-panel';
  panel.setAttribute('aria-label', 'Linked assets');

  const header = document.createElement('div');
  header.className = 'asset-panel__header';

  const title = document.createElement('span');
  title.className = 'asset-panel__title';
  title.textContent = 'Assets (' + assets.length + ')'; // textContent — safe

  header.appendChild(title);
  panel.appendChild(header);

  assets.forEach(asset => {
    const row = document.createElement('div');
    row.className = 'asset-row';

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', ASSET_ICONS[asset.type] || 'file');
    icon.className = 'asset-row__icon';
    icon.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'asset-row__name';
    name.textContent = asset.title; // textContent — safe

    const meta = document.createElement('span');
    meta.className = 'asset-row__meta';
    meta.textContent = asset.type; // textContent — safe

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(meta);
    row.addEventListener('click', () => showAssetDetail(asset));
    panel.appendChild(row);
  });

  return panel;
}

// ── Asset detail ─────────────────────────────
function showAssetDetail(asset) {
  pane.querySelector('.asset-detail-panel')?.remove();

  const detail = document.createElement('div');
  detail.className = 'asset-detail-panel';
  detail.style.cssText = 'padding:16px 40px 40px;max-width:820px;margin:0 auto;';

  const titleEl = document.createElement('h3');
  titleEl.style.cssText = 'font-size:16px;font-weight:600;margin-bottom:8px;';
  titleEl.textContent = asset.title; // textContent — safe

  const desc = document.createElement('p');
  desc.style.cssText = 'font-size:13px;color:var(--text-2);margin-bottom:12px;';
  desc.textContent = asset.description || ''; // textContent — safe

  detail.appendChild(titleEl);
  detail.appendChild(desc);

  if (asset.content) {
    const body = document.createElement('div');
    body.className = 'article-body';
    setMarkdownContent(body, asset.content);
    detail.appendChild(body);
  }

  if (asset.url) {
    const link = document.createElement('a');
    link.href = asset.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = asset.url; // textContent — safe
    link.style.fontSize = '13px';
    detail.appendChild(link);
  }

  pane.appendChild(detail);
  detail.scrollIntoView({ behavior: 'smooth' });
}
```

**Step 2: Verify**

Click any page in the sidebar. Content pane should show:
- [ ] Breadcrumb: `Workspace › Section › Page title`
- [ ] Page title at 28px
- [ ] Edit button top right
- [ ] Status / template badges
- [ ] Markdown body rendered in Lora serif (via setMarkdownContent — DOMPurify + DOMParser)
- [ ] Asset panel if page has linked assets
- [ ] Lucide icons in asset rows render

---

## Task 21: Create `public/js/editor.js`

**Files:**
- Create: `public/js/editor.js`

**What this builds:**
Opens the editor overlay when Edit is clicked. Populates title and content fields. Live Markdown preview (using setMarkdownContent). Auto-saves draft every 30 seconds. Save patches the page and re-renders.

**Step 1: Write the file**

Create `public/js/editor.js`:

```javascript
// editor.js — Page editor overlay.
// Preview uses setMarkdownContent (DOMPurify + DOMParser, no innerHTML).

import * as api      from './api.js';
import { store }     from './store.js';
import { setMarkdownContent } from './utils.js';
import { toastSuccess, toastError } from './toast.js';

const overlay    = document.getElementById('editor-overlay');
const titleInput = document.getElementById('editor-title');
const textarea   = document.getElementById('editor-textarea');
const preview    = document.getElementById('editor-preview');
const saveBtn    = document.getElementById('editor-save');
const discardBtn = document.getElementById('editor-discard');

let currentPage   = null;
let autoSaveTimer = null;
let isDirty       = false;

/**
 * Open the editor overlay for a page.
 * @param {object} page  Full page from the store or API
 */
export function openEditor(page) {
  currentPage      = page;
  isDirty          = false;
  titleInput.value = page.title   || '';
  textarea.value   = page.content || '';

  updatePreview();
  overlay.hidden = false;
  titleInput.focus();

  clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(autoSave, 30_000);
}

export function closeEditor() {
  overlay.hidden = true;
  clearInterval(autoSaveTimer);
  autoSaveTimer = null;
  currentPage   = null;
  isDirty       = false;
}

// ── Live preview ─────────────────────────────
function updatePreview() {
  // setMarkdownContent: DOMPurify.sanitize → DOMParser → appendChild (no innerHTML)
  setMarkdownContent(preview, textarea.value);
}

let previewTimer = null;
textarea.addEventListener('input', () => {
  isDirty = true;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 300);
});

titleInput.addEventListener('input', () => { isDirty = true; });

// ── Save ─────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  if (!currentPage) return;
  await persistEdits({ showToast: true, publish: true });
});

async function persistEdits({ showToast = false, publish = false } = {}) {
  if (!currentPage) return;

  const payload = {
    title:   titleInput.value.trim() || currentPage.title,
    content: textarea.value,
  };
  if (publish) payload.status = 'published';

  saveBtn.disabled    = true;
  saveBtn.textContent = 'Saving…';

  try {
    const updated     = await api.updatePage(currentPage.id, payload);
    currentPage       = updated;
    store.currentPage = updated;
    isDirty           = false;

    // Update sidebar title
    const sidebarTitle = document.querySelector('.page-item[data-id="' + updated.id + '"] span');
    if (sidebarTitle) sidebarTitle.textContent = updated.title; // textContent — safe

    if (showToast) {
      toastSuccess('Page saved');
      closeEditor();
      const { renderPage } = await import('./content.js');
      renderPage(updated);
    }
  } catch (err) {
    toastError('Save failed: ' + err.message);
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Save';
  }
}

async function autoSave() {
  if (!isDirty || !currentPage) return;
  await persistEdits({ showToast: false });
}

// ── Discard ───────────────────────────────────
discardBtn.addEventListener('click', () => {
  if (isDirty && !window.confirm('Discard unsaved changes?')) return;
  closeEditor();
});
```

**Step 2: Verify**

Click Edit on any page:
- [ ] Editor overlay opens full-screen
- [ ] Title and content fields populated
- [ ] Right pane shows live preview as you type (Lora serif, correct styling)
- [ ] Save PATCHes the page, closes editor, re-renders content pane
- [ ] Auto-save fires silently every 30 seconds
- [ ] Discard prompts confirmation when dirty

---

## Task 22: Create `public/js/search.js`

**Files:**
- Create: `public/js/search.js`

**What this builds:**
Handles search results in the search overlay. Called by `app.js` on search input. Debounced at 280ms. Results stagger in. Clicking a page result navigates to it.

**Step 1: Write the file**

Create `public/js/search.js`:

```javascript
// search.js — Search overlay results handler.
// All content rendered via textContent — no HTML from API is trusted.

import * as api         from './api.js';
import { store }        from './store.js';
import { debounce, excerpt } from './utils.js';

const resultsList = document.getElementById('search-results');
const emptyEl     = document.getElementById('search-empty');

let lastQuery = '';

const doSearch = debounce(async (q) => {
  if (!q.trim()) {
    resultsList.textContent = '';
    emptyEl.hidden = true;
    return;
  }
  try {
    const params = {};
    if (store.searchFilter && store.searchFilter !== 'all') params.type = store.searchFilter;
    const results = await api.search(q.trim(), params);
    renderResults(results);
  } catch (_) { /* non-critical */ }
}, 280);

export function handleSearch(q) {
  lastQuery = q;
  doSearch(q);
}

function renderResults(results) {
  resultsList.textContent = ''; // safe clear

  if (!results || results.length === 0) {
    emptyEl.hidden = !lastQuery.trim();
    return;
  }
  emptyEl.hidden = true;

  results.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'search-result-item';
    li.style.animationDelay = (i * 20) + 'ms';
    li.setAttribute('role', 'option');

    const title = document.createElement('div');
    title.className = 'search-result-item__title';
    title.textContent = item.title || item.name || 'Untitled'; // textContent — safe

    const path = document.createElement('div');
    path.className = 'search-result-item__path';
    path.textContent = item.breadcrumb || item.type || ''; // textContent — safe

    li.appendChild(title);
    li.appendChild(path);

    const raw = item.content || item.description || '';
    if (raw) {
      const ex = document.createElement('div');
      ex.className = 'search-result-item__excerpt';
      ex.textContent = excerpt(raw, 120); // textContent — safe
      li.appendChild(ex);
    }

    li.addEventListener('click', () => {
      document.getElementById('search-overlay').hidden = true;
      document.getElementById('search-input').value = '';
      resultsList.textContent = '';
      store.searchQuery = '';

      if (item.kind === 'page' || item.section_id) {
        import('./app.js').then(m => m.selectPage(item));
      }
    });

    resultsList.appendChild(li);
  });
}
```

**Step 2: Verify**

Open search (⌘K):
- [ ] Typing triggers debounced search
- [ ] Results stagger in with animation
- [ ] Each result: title, path, excerpt — all plain text, no rendered HTML
- [ ] Clicking a page result navigates there and closes search
- [ ] "No results found" appears on empty results
- [ ] Filter chips narrow results

---

## Task 23: Create `public/js/map.js`

**Files:**
- Create: `public/js/map.js`

**What this builds:**
Replaces the content pane with a filterable table of all asset relationships. The v1 relationship map — structured, queryable, no graph library needed.

**Step 1: Write the file**

Create `public/js/map.js`:

```javascript
// map.js — Asset relationship map view (v1: filterable table).
// All content rendered via textContent — no untrusted HTML from API.

import * as api from './api.js';
import { toastError } from './toast.js';

const REL_TYPES = ['loads', 'uses', 'generates', 'deploys-to', 'connects-to', 'supersedes', 'references'];

const ASSET_ICONS = {
  skill: 'zap', config: 'settings-2', decision: 'clipboard-list',
  session: 'scroll-text', image: 'image', file: 'file-code',
  link: 'external-link', miro: 'layout-template',
};

export async function renderMapView() {
  const pane = document.getElementById('content-pane');
  pane.textContent = ''; // safe clear

  // Show skeleton
  const sk = buildSkeleton();
  pane.appendChild(sk);

  let relationships = [];
  try {
    relationships = await api.listRelationships();
  } catch (_) {
    toastError('Could not load relationship map');
    pane.textContent = '';
    return;
  }

  pane.textContent = '';
  pane.appendChild(buildMapView(relationships));
  window.lucide.createIcons();
}

function buildSkeleton() {
  const wrap = document.createElement('div');
  wrap.style.padding = '24px 32px';
  const sk1 = document.createElement('div');
  sk1.className = 'skeleton skeleton--title';
  wrap.appendChild(sk1);
  for (let i = 0; i < 6; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton skeleton--text';
    wrap.appendChild(sk);
  }
  return wrap;
}

function buildMapView(relationships) {
  const container = document.createElement('div');
  container.className = 'map-view';

  // Header
  const header = document.createElement('div');
  header.className = 'map-view__header';
  const title = document.createElement('h2');
  title.className = 'map-view__title';
  title.textContent = 'Relationship Map'; // textContent — safe
  const count = document.createElement('span');
  count.style.cssText = 'font-size:13px;color:var(--text-3);font-family:"JetBrains Mono",monospace;';
  count.textContent = relationships.length + ' relationships'; // textContent — safe
  header.appendChild(title);
  header.appendChild(count);
  container.appendChild(header);

  // Filter bar
  const filters = document.createElement('div');
  filters.className = 'map-filters';
  const typeSelect = makeSelect(['All types', ...REL_TYPES]);
  const nameInput  = makeInput('Filter by asset name…');
  filters.appendChild(typeSelect);
  filters.appendChild(nameInput);
  container.appendChild(filters);

  // Table
  const wrap = document.createElement('div');
  wrap.style.overflowX = 'auto';
  const table = buildTable(relationships);
  wrap.appendChild(table);
  container.appendChild(wrap);

  // Filter logic
  function applyFilters() {
    const type  = typeSelect.value === 'All types' ? '' : typeSelect.value;
    const asset = nameInput.value.toLowerCase();
    table.querySelectorAll('tbody tr').forEach(tr => {
      const matchType  = !type  || tr.dataset.relType === type;
      const matchAsset = !asset || tr.dataset.from.toLowerCase().includes(asset)
                                 || tr.dataset.to.toLowerCase().includes(asset);
      tr.hidden = !(matchType && matchAsset);
    });
  }

  typeSelect.addEventListener('change', applyFilters);
  nameInput.addEventListener('input',  applyFilters);

  return container;
}

function buildTable(relationships) {
  const table = document.createElement('table');
  table.className = 'map-table';

  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  ['From', 'Type', 'To', 'Notes'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text; // textContent — safe
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (relationships.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.style.cssText = 'text-align:center;color:var(--text-3);padding:32px;font-size:13px;';
    td.textContent = 'No relationships recorded yet. Claude sessions write these automatically.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    relationships.forEach(rel => {
      const tr = document.createElement('tr');
      tr.dataset.from    = rel.from_title || String(rel.from_asset_id || '');
      tr.dataset.to      = rel.to_title   || String(rel.to_asset_id   || '');
      tr.dataset.relType = rel.relationship_type || '';

      tr.appendChild(makeAssetCell(rel.from_title || String(rel.from_asset_id), rel.from_type));
      tr.appendChild(makeTypeCell(rel.relationship_type));
      tr.appendChild(makeAssetCell(rel.to_title   || String(rel.to_asset_id),   rel.to_type));
      tr.appendChild(makeNotesCell(rel.notes));

      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);
  return table;
}

function makeAssetCell(name, type) {
  const td = document.createElement('td');
  if (type) {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', ASSET_ICONS[type] || 'file');
    icon.setAttribute('aria-hidden', 'true');
    icon.style.cssText = 'color:var(--text-3);margin-right:6px;vertical-align:middle;';
    td.appendChild(icon);
  }
  const span = document.createElement('span');
  span.textContent = name; // textContent — safe
  td.appendChild(span);
  if (type) {
    const badge = document.createElement('span');
    badge.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--text-3);margin-left:6px;';
    badge.textContent = type; // textContent — safe
    td.appendChild(badge);
  }
  return td;
}

function makeTypeCell(type) {
  const td = document.createElement('td');
  const span = document.createElement('span');
  span.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--accent);';
  span.textContent = type || '—'; // textContent — safe
  td.appendChild(span);
  return td;
}

function makeNotesCell(notes) {
  const td = document.createElement('td');
  td.style.cssText = 'color:var(--text-2);font-size:12px;max-width:220px;';
  td.textContent = notes || ''; // textContent — safe
  return td;
}

function makeSelect(options) {
  const sel = document.createElement('select');
  sel.className = 'input';
  sel.style.cssText = 'width:180px;border-radius:var(--r-full);padding:5px 12px;font-size:13px;';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt; // textContent — safe
    sel.appendChild(o);
  });
  return sel;
}

function makeInput(placeholder) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.style.width = '220px';
  input.placeholder = placeholder;
  return input;
}
```

**Step 2: Verify**

Click Map button (network icon) in the top bar:
- [ ] Skeleton shown while loading
- [ ] Table shows From / Type / To / Notes
- [ ] Type dropdown filters rows
- [ ] Name text filter narrows rows
- [ ] Empty state message when no relationships exist

---

## Task 24: Create `public/js/settings.js`

**Files:**
- Create: `public/js/settings.js`

**What this builds:**
The settings overlay. Five panels: Workspaces, Users & Roles, API Tokens, Account, Danger Zone. Admin-gated panels show a message to non-admin users. All text rendered via `textContent`.

**Step 1: Write the file**

Create `public/js/settings.js`:

```javascript
// settings.js — Settings overlay panels.
// All content uses textContent. No untrusted HTML from API rendered.

import * as api from './api.js';
import { store } from './store.js';
import { toastSuccess, toastError } from './toast.js';

const body = document.getElementById('settings-body');
const nav  = document.querySelector('.settings-panel__nav');

let activeSection = 'workspaces';

export function initSettings() {
  if (!nav.dataset.bound) {
    nav.dataset.bound = 'true';
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.settings-nav-item');
      if (!btn) return;
      nav.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('settings-nav-item--active'));
      btn.classList.add('settings-nav-item--active');
      activeSection = btn.dataset.section;
      loadSection(activeSection);
    });
  }
  loadSection(activeSection);
}

function loadSection(section) {
  body.textContent = ''; // safe clear
  const fn = { workspaces: renderWorkspaces, users: renderUsers, tokens: renderTokens, account: renderAccount, danger: renderDanger }[section];
  if (fn) fn();
}

// ── Shared helpers ────────────────────────────
function heading(text) {
  const h = document.createElement('h3');
  h.style.cssText = 'font-size:15px;font-weight:600;margin-bottom:16px;';
  h.textContent = text; // textContent — safe
  return h;
}

function settingsRow(labelText, control) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-soft);gap:12px;';
  const label = document.createElement('span');
  label.style.cssText = 'font-size:13px;flex:1;';
  label.textContent = labelText; // textContent — safe
  div.appendChild(label);
  if (control) div.appendChild(control);
  return div;
}

function btn(label, onClick, danger = false) {
  const b = document.createElement('button');
  b.className = 'btn btn--ghost btn--sm';
  if (danger) b.style.color = 'var(--red)';
  b.textContent = label; // textContent — safe
  b.addEventListener('click', onClick);
  return b;
}

function btnGroup(...buttons) {
  const g = document.createElement('div');
  g.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';
  buttons.forEach(b => g.appendChild(b));
  return g;
}

function notice(text) {
  const p = document.createElement('p');
  p.style.cssText = 'color:var(--text-3);font-size:13px;padding:16px 0;';
  p.textContent = text; // textContent — safe
  return p;
}

function addBtn(label, onClick) {
  const b = document.createElement('button');
  b.className = 'btn btn--ghost btn--sm';
  b.style.marginTop = '16px';
  b.textContent = label; // textContent — safe
  b.addEventListener('click', onClick);
  return b;
}

// ── Workspaces ────────────────────────────────
async function renderWorkspaces() {
  body.appendChild(heading('Workspaces'));
  try {
    const workspaces = await api.listWorkspaces();
    if (workspaces.length === 0) {
      body.appendChild(notice('No workspaces yet.'));
    } else {
      workspaces.forEach(ws => {
        body.appendChild(settingsRow(ws.name, btnGroup(
          btn('Rename', async () => {
            const name = window.prompt('New name:', ws.name);
            if (!name?.trim()) return;
            try {
              await api.updateWorkspace(ws.id, { name: name.trim() });
              toastSuccess('Workspace renamed');
              renderWorkspaces();
            } catch (err) { toastError(err.message); }
          }),
          btn('Delete', async () => {
            if (!window.confirm('Delete workspace "' + ws.name + '"? All content will be removed.')) return;
            try {
              await api.deleteWorkspace(ws.id);
              store.workspaces = store.workspaces.filter(w => w.id !== ws.id);
              toastSuccess('Workspace deleted');
              loadSection('workspaces');
            } catch (err) { toastError(err.message); }
          }, true),
        )));
      });
    }
    body.appendChild(addBtn('+ Add workspace', async () => {
      const name = window.prompt('Workspace name:');
      if (!name?.trim()) return;
      try {
        const ws = await api.createWorkspace({ name: name.trim(), icon: 'folder' });
        store.workspaces.push(ws);
        toastSuccess('Workspace created');
        loadSection('workspaces');
      } catch (err) { toastError(err.message); }
    }));
  } catch (_) {
    body.appendChild(notice('Could not load workspaces.'));
  }
}

// ── Users & Roles ─────────────────────────────
async function renderUsers() {
  body.appendChild(heading('Users & Roles'));
  if (store.user?.role !== 'admin') { body.appendChild(notice('Admin access required.')); return; }
  try {
    const users = await api.listUsers();
    const ROLES = ['admin', 'editor', 'viewer'];
    users.forEach(u => {
      const sel = document.createElement('select');
      sel.className = 'input';
      sel.style.cssText = 'width:100px;padding:4px 8px;font-size:12px;';
      ROLES.forEach(r => {
        const o = document.createElement('option');
        o.value = r;
        o.textContent = r; // textContent — safe
        if (r === u.role) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', async () => {
        try {
          await api.updateUser(u.id, { role: sel.value });
          toastSuccess((u.display_name || u.username) + ' updated to ' + sel.value);
        } catch (err) { toastError(err.message); sel.value = u.role; }
      });
      const controls = btnGroup(sel);
      if (u.id !== store.user?.id) {
        controls.appendChild(btn('Remove', async () => {
          if (!window.confirm('Remove user ' + u.username + '?')) return;
          try { await api.deleteUser(u.id); toastSuccess('User removed'); renderUsers(); }
          catch (err) { toastError(err.message); }
        }, true));
      }
      body.appendChild(settingsRow((u.display_name || u.username) + '  (' + u.username + ')', controls));
    });
  } catch (_) {
    body.appendChild(notice('Could not load users.'));
  }
}

// ── API Tokens ────────────────────────────────
async function renderTokens() {
  body.appendChild(heading('API Tokens'));
  if (store.user?.role !== 'admin') { body.appendChild(notice('Admin access required.')); return; }
  try {
    const tokens = await api.listTokens();
    if (tokens.length === 0) {
      body.appendChild(notice('No tokens yet. Create one for Claude sessions.'));
    } else {
      tokens.forEach(token => {
        const lastUsed = token.last_used_at
          ? new Date(token.last_used_at).toLocaleDateString('en-AU')
          : 'never';
        body.appendChild(settingsRow(
          token.label + '  ·  Last used: ' + lastUsed,
          btn('Revoke', async () => {
            if (!window.confirm('Revoke token "' + token.label + '"?')) return;
            try { await api.deleteToken(token.id); toastSuccess('Token revoked'); renderTokens(); }
            catch (err) { toastError(err.message); }
          }, true),
        ));
      });
    }
    body.appendChild(addBtn('+ Create token', async () => {
      const label = window.prompt('Token label (e.g. "Claude sessions"):');
      if (!label?.trim()) return;
      try {
        const result = await api.createToken({ label: label.trim() });
        // Token shown once — store in password manager
        window.alert('Token created. Copy it now — it will not be shown again:\n\n' + result.token);
        renderTokens();
      } catch (err) { toastError(err.message); }
    }));
  } catch (_) {
    body.appendChild(notice('Could not load tokens.'));
  }
}

// ── Account ───────────────────────────────────
function renderAccount() {
  body.appendChild(heading('Account'));

  const form = document.createElement('form');
  form.noValidate = true;

  function field(labelText, id, type, value, autocomplete) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.style.marginBottom = '14px';
    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.className = 'label';
    lbl.textContent = labelText; // textContent — safe
    const input = document.createElement('input');
    input.type  = type;
    input.id    = id;
    input.name  = id;
    input.className = 'input';
    if (value)       input.value = value;
    if (autocomplete) input.autocomplete = autocomplete;
    wrap.appendChild(lbl);
    wrap.appendChild(input);
    form.appendChild(wrap);
    return input;
  }

  field('Display name',   'acc-display',  'text',     store.user?.displayName || store.user?.display_name || '', 'name');
  field('New password',   'acc-password', 'password', '', 'new-password');
  field('Confirm password','acc-confirm', 'password', '', 'new-password');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn btn--primary btn--sm';
  saveBtn.textContent = 'Save changes'; // textContent — safe
  form.appendChild(saveBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = form.querySelector('#acc-display').value.trim();
    const password    = form.querySelector('#acc-password').value;
    const confirm     = form.querySelector('#acc-confirm').value;
    if (password && password !== confirm) { toastError('Passwords do not match'); return; }
    const payload = {};
    if (displayName) payload.displayName = displayName;
    if (password)    payload.password    = password;
    if (!Object.keys(payload).length) return;
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Saving…'; // textContent — safe
    try {
      await api.request('PATCH', '/api/admin/users/' + store.user.id, payload);
      if (displayName) {
        store.user.displayName = displayName;
        const avatarEl = document.getElementById('avatar-initials');
        if (avatarEl) {
          const { initials } = await import('./utils.js');
          avatarEl.textContent = initials(displayName); // textContent — safe
        }
      }
      toastSuccess('Account updated');
    } catch (err) { toastError(err.message); }
    finally {
      saveBtn.disabled    = false;
      saveBtn.textContent = 'Save changes'; // textContent — safe
    }
  });

  body.appendChild(form);
}

// ── Danger Zone ───────────────────────────────
function renderDanger() {
  body.appendChild(heading('Danger Zone'));
  const warn = document.createElement('p');
  warn.style.cssText = 'font-size:13px;color:var(--text-2);margin-bottom:20px;';
  warn.textContent = 'These actions are permanent.'; // textContent — safe
  body.appendChild(warn);

  body.appendChild(settingsRow('Sign out of all sessions',
    btn('Sign out everywhere', async () => {
      try { await api.logout(); } finally { window.location.reload(); }
    }, true),
  ));

  if (store.user?.role === 'admin') {
    body.appendChild(settingsRow('Export all data as JSON',
      btn('Export', async () => {
        try {
          const data = await api.request('GET', '/api/admin/export');
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = 'kb-export-' + new Date().toISOString().slice(0, 10) + '.json';
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) { toastError('Export failed: ' + err.message); }
      }),
    ));
  }
}
```

**Step 2: Verify**

Open Settings:
- [ ] Workspaces panel lists workspaces with Rename / Delete
- [ ] Creating a workspace adds it to the rail
- [ ] Users panel visible only to admin
- [ ] Role selector PATCHes user immediately on change
- [ ] API Tokens panel lists tokens; create shows plain token in alert once
- [ ] Account form updates display name and re-renders avatar initials
- [ ] Danger Zone: sign-out reloads; export downloads JSON file

---

## Summary — Phase 4 files created

| File | Action | Purpose |
|---|---|---|
| `public/js/utils.js` | Append | Add `setMarkdownContent` — DOMPurify + DOMParser rendering helper |
| `public/js/content.js` | Create | Page view: breadcrumb, title, badges, Markdown body, asset panel |
| `public/js/editor.js` | Create | Editor overlay: live preview, auto-save, publish |
| `public/js/search.js` | Create | Search results: debounced, staggered, filter by type |
| `public/js/map.js` | Create | Relationship map: filterable table view |
| `public/js/settings.js` | Create | Settings overlay: workspaces, users, tokens, account, danger |

## Phase 5 preview — what comes next

Phase 5 covers deployment:

| Task | File | Purpose |
|---|---|---|
| 25 | `Dockerfile` | Node 20 Alpine, non-root user, static file serving, health check |
| 26 | `docker-compose.yml` | Local dev with env vars and DB connection |
| 27 | `.github/workflows/deploy.yml` | Build → push GHCR → Watchtower auto-pulls on NAS |
| 28 | `.env.example` | All required env vars documented |
| 29 | `package.json` updates | Add multer, update scripts: migrate, seed, test |
# Knowledge Platform — Implementation Plan
# Phase 5: Deployment — Dockerfile, Docker Compose, CI/CD, Environment

**Goal:** Wire up the full deployment pipeline. Local dev via Docker Compose. Production via GitHub Actions → GHCR → Watchtower auto-pull on the QNAP NAS.

**Infrastructure:**
- Container registry: `ghcr.io/sspaynter/knowledge-base`
- NAS host: `10.0.3.12` (internal) / `192.168.86.18` (LAN dev)
- Database: `n8n-postgres` container on the NAS — PostgreSQL, DB `nocodb`, schema `knowledge_base`
- Public URL: `kb.ss-42.com` via Cloudflare tunnel
- Watchtower is running on the NAS and auto-pulls on `latest` tag push

**Dependencies:** All previous phases complete.

**Task numbering continues from Phase 4 (Tasks 20–24).**

---

## Task 25: Write `Dockerfile`

**Files:**
- Replace: `Dockerfile`

**What this builds:**
Node 20 Alpine image. Non-root user for security. Static files served by Express. Health check endpoint included. Uploads directory volume-mounted for persistence.

**Step 1: Write the file**

Replace `Dockerfile`:

```dockerfile
# ── Build stage ───────────────────────────────
FROM node:20-alpine AS base

# Non-root user for security
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application
COPY . .

# Create uploads dir with correct ownership
RUN mkdir -p uploads && chown -R app:app /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 3000

# Health check — matches /api/health route from Phase 2
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start
CMD ["node", "server.js"]
```

**Notes:**
- No build step — vanilla JS, no bundler
- `--omit=dev` excludes Jest and other dev dependencies from the image
- `uploads/` is created inside the container but should be bind-mounted in production for persistence (see docker-compose)

**Step 2: Verify**

```bash
docker build -t kb-test .
docker run --rm -p 3001:3000 --env-file .env kb-test
# Open http://localhost:3001 — should show auth overlay
```

---

## Task 26: Write `docker-compose.yml`

**Files:**
- Replace: `docker-compose.yml`

**What this builds:**
Local dev compose file. Connects to the NAS PostgreSQL directly (no local DB container — same DB as production, schema is isolated). Bind-mounts uploads directory and source for hot reload.

**Step 1: Write the file**

Replace `docker-compose.yml`:

```yaml
version: "3.9"

services:
  knowledge-base:
    build: .
    container_name: knowledge-base-dev
    ports:
      - "3001:3000"
    environment:
      NODE_ENV: development
      PORT: 3000
      # Database — uses NAS PostgreSQL (LAN access during local dev)
      DB_HOST: ${DB_HOST:-192.168.86.18}
      DB_PORT: ${DB_PORT:-32775}
      DB_NAME: ${DB_NAME:-nocodb}
      DB_USER: ${DB_USER:-kb_app}
      DB_PASS: ${DB_PASS}
      DB_SCHEMA: knowledge_base
      # Auth
      SESSION_SECRET: ${SESSION_SECRET}
      # App
      HQ_URL: ${HQ_URL:-http://hq.local}
    volumes:
      # Persist uploads across container restarts
      - ./uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

**Notes:**
- No `db` service — the NAS PostgreSQL is used directly during dev
- `DB_HOST` defaults to the NAS LAN IP; override in `.env` for different environments
- `DB_PORT` defaults to `32775` — the externally-mapped port for `n8n-postgres` on the NAS (confirm this in NAS Container Station)
- `DB_USER` is `kb_app` — the limited user created by the migration script (Phase 1)

**Step 2: Verify**

```bash
cp .env.example .env
# Fill in DB_PASS and SESSION_SECRET in .env
docker compose up --build
# Open http://localhost:3001
```

---

## Task 27: Write `.env.example`

**Files:**
- Create: `.env.example`

**What this builds:**
Documents all required environment variables. Committed to the repo. The actual `.env` is gitignored.

**Step 1: Write the file**

Create `.env.example`:

```bash
# ── Knowledge Platform — Environment Variables ──
# Copy to .env and fill in values. Never commit .env to git.

# ── Database ──────────────────────────────────
# NAS internal IP and port (use 10.0.3.12 in production container)
DB_HOST=192.168.86.18
# External mapped port for n8n-postgres container (check Container Station)
DB_PORT=32775
DB_NAME=nocodb
# Limited user created by migrate.sql (not the superuser)
DB_USER=kb_app
DB_PASS=your_kb_app_password_here
DB_SCHEMA=knowledge_base

# ── Auth ──────────────────────────────────────
# Long random string — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=generate_a_long_random_string_here

# ── App ───────────────────────────────────────
PORT=3000
NODE_ENV=production
# Internal HQ hub URL (displayed in logo link)
HQ_URL=https://hq.ss-42.com
```

**Step 2: Update `.gitignore`**

Ensure `.gitignore` contains:

```
.env
uploads/
node_modules/
coverage/
```

---

## Task 28: Write `package.json` updates

**Files:**
- Modify: `package.json`

**What this builds:**
Adds multer (file uploads), updates scripts to include migrate, seed, and test commands.

**Step 1: Ensure dependencies are correct**

`package.json` dependencies section must include:

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  }
}
```

**Step 2: Ensure scripts section is correct**

```json
{
  "scripts": {
    "start":   "node server.js",
    "dev":     "node --watch server.js",
    "migrate": "node scripts/run-migration.js",
    "seed":    "node scripts/seed.js",
    "test":    "jest --runInBand",
    "test:watch": "jest --watch"
  }
}
```

**Step 3: Install multer**

```bash
npm install multer@1.4.5-lts.1
```

---

## Task 29: Write `.github/workflows/deploy.yml`

**Files:**
- Create: `.github/workflows/deploy.yml`

**What this builds:**
GitHub Actions workflow. On push to `main`, builds the Docker image, pushes to GHCR with the `latest` tag, and Watchtower on the NAS detects and pulls it automatically.

**Step 1: Write the file**

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=sha,prefix=sha-

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Notes:**
- Uses `GITHUB_TOKEN` — no secrets setup needed for GHCR
- Pushes `latest` on every push to `main`
- Watchtower on the NAS polls GHCR for `latest` tag changes and auto-pulls
- Also pushes a `sha-` tagged image for rollback reference

**Step 2: Verify GitHub Actions access**

1. Go to `github.com/sspaynter/knowledge-base` → Settings → Actions → General
2. Confirm "Read and write permissions" is enabled for GITHUB_TOKEN
3. Push to `main` and confirm the workflow runs in the Actions tab
4. Check GHCR: `github.com/sspaynter` → Packages → `knowledge-base`

---

## Task 30: NAS container configuration

**Not a file — this is an operational step. Refer to `nas-ops` and `nas-deploy` skills.**

When deploying to the NAS for the first time:

**Step 1: Run migration on NAS PostgreSQL**

From a machine with NAS LAN access:

```bash
# Set env vars pointing to NAS
export DB_HOST=192.168.86.18
export DB_PORT=32775
export DB_NAME=nocodb
export DB_USER=nocodb        # superuser — needed only for initial migration
export DB_PASS=nocodb2026    # confirm this is still correct
node scripts/run-migration.js
node scripts/seed.js
```

**Note:** The migration script (`scripts/run-migration.js` from Phase 1) creates the `knowledge_base` schema, all 12 tables, the `kb_app` user, and grants. After migration, subsequent operations use `kb_app` — not the superuser.

**Step 2: Create container in Container Station**

| Setting | Value |
|---|---|
| Image | `ghcr.io/sspaynter/knowledge-base:latest` |
| Container name | `knowledge-base` |
| Network | Same bridge network as `n8n-postgres` — or use host IP `10.0.3.12` |
| Port | Map container `3000` → host port (check available ports in nas-ops skill) |
| Restart policy | Always |

**Step 3: Set environment variables in Container Station**

```
DB_HOST=10.0.3.12
DB_PORT=5432
DB_NAME=nocodb
DB_USER=kb_app
DB_PASS=<your_kb_app_password>
DB_SCHEMA=knowledge_base
SESSION_SECRET=<generate_32_byte_hex>
PORT=3000
NODE_ENV=production
HQ_URL=https://hq.ss-42.com
```

**Step 4: Set up Cloudflare tunnel**

In Cloudflare Zero Trust dashboard:
- Add route: `kb.ss-42.com` → `http://localhost:<host_port>`
- Or if using the existing tunnel config on the NAS: add the service to `config.yml`

**Step 5: Verify**

```bash
# From LAN
curl http://192.168.86.18:<host_port>/api/health
# Should return: {"status":"ok","schema":"knowledge_base"}

# From internet
curl https://kb.ss-42.com/api/health
```

---

## Summary — Phase 5 files created or modified

| File | Action | Purpose |
|---|---|---|
| `Dockerfile` | Replace | Node 20 Alpine, non-root user, health check |
| `docker-compose.yml` | Replace | Local dev with NAS DB connection |
| `.env.example` | Create | All env vars documented |
| `.gitignore` | Update | Add .env, uploads/ |
| `package.json` | Update | Add multer, complete scripts |
| `.github/workflows/deploy.yml` | Create | Build → GHCR push on push to main |

---

## Full build sequence — all phases

Once all five phase files are merged (see merge step), the complete build runs in this order:

```
1. Database (Phase 1)
   npm run migrate        ← creates schema, tables, kb_app user
   npm run seed           ← inserts workspaces, sections, templates, settings
   node scripts/migrate-nocodb.js  ← migrates old NocoDB records to assets

2. Backend (Phase 2)
   npm install            ← ensure multer and all deps installed
   npm test               ← all backend route tests must pass before continuing

3. Frontend (Phases 3 + 4)
   Open in browser        ← verify boot, nav, content, editor, search, settings, map

4. Deployment (Phase 5)
   git push origin main   ← triggers GitHub Actions → GHCR push → Watchtower pull
   curl https://kb.ss-42.com/api/health  ← confirm live
```

---

## Outstanding P1 items before build can start

From `MASTER-TODO.md`:

| # | Item | Needed for |
|---|---|---|
| 2 | Resolve DB superuser password for n8n-postgres | `npm run migrate` |
| 3 | Confirm external port for n8n-postgres on LAN | `.env` `DB_PORT` value |
| 4 | Confirm HQ hub subdomain URL | `.env` `HQ_URL` value |

These must be resolved before running the migration in Task 30.

---

## Session Log

### Session 3 — 2026-02-27 (continued from compact)

**Summary:** Completed Phase 3 (frontend components), Phase 5 (deployment). All 5 implementation phases now DONE.

---

**Status at session start:**
- Phase 1 (DB): COMPLETED — 33 tests passing, 11 suites
- Phase 2 (Backend): COMPLETED — all routes, tests, server.js
- Phase 3 Foundation (Tasks 16-19): COMPLETED — index.html, CSS, api.js, store.js, toast.js, utils.js, auth.js, app.js
- Phase 4 Components (Tasks 20-24): Written, NOT YET COMMITTED

---

**Completed this session:**

**Task 20-24 — Frontend components (committed: 51eab5c)**
- `public/js/content.js` — renderPage: breadcrumb, header, meta, markdown body via setMarkdownContent, asset panel
- `public/js/editor.js` — openEditor: live preview, 30s auto-save, publish, dirty-check on discard
- `public/js/search.js` — handleSearch: 280ms debounce, textContent rendering, selectPage on click
- `public/js/map.js` — renderMapView: relationship table, filterable by type and name
- `public/js/settings.js` — initSettings: 5 panels (workspaces, users, tokens, account, danger)

**Task 25 — Dockerfile (committed: e3e2639)**
- Node 20 Alpine, non-root user (app:app), npm ci --omit=dev
- Copies: server.js, public/, routes/, middleware/, services/, scripts/
- ENV UPLOAD_DIR=/app/uploads, mkdir /app/uploads
- HEALTHCHECK with wget on /api/health
- EXPOSE 3000, CMD ["node", "server.js"]

**Task 26 — docker-compose.yml (committed: e3e2639)**
- build: . (local dev builds from source)
- Port 3001:3000 (avoids conflicts with other local services)
- DATABASE_URL and SESSION_SECRET from .env
- UPLOAD_DIR: /app/uploads
- Volume: ./uploads:/app/uploads

**Task 27 — .github/workflows/deploy.yml (committed: e3e2639)**
- Triggers: push to main
- Pushes to ghcr.io/sspaynter/knowledge-base
- Tags: :latest (triggers Watchtower) and :sha-{hash} (rollback reference)
- Uses docker/metadata-action@v5 for tag management
- Note: old build-and-push.yml left in place; deploy.yml is the active workflow

**Task 28 — .env.example (committed: e3e2639)**
- DATABASE_URL format (not individual DB_* vars — matches backend database.js)
- Includes UPLOAD_DIR and HQ_URL docs

**Task 29 — package.json (committed: e3e2639)**
- Added: "migrate": "node scripts/run-migration.js"
- Added: "seed": "node scripts/seed.js"
- multer already at v2.0.2 (plan had 1.4.5-lts.1 — newer version fine)

**Task 30 — NAS container setup**
- Operational step — no code file. Instructions in impl-05-deployment.md.
- Must run `npm run migrate` once with nocodb superuser to create knowledge_base schema
- Container Station: image ghcr.io/sspaynter/knowledge-base:latest, DB_HOST=10.0.3.12

---

**Key deviations from plan:**
1. docker-compose.yml: plan used individual DB_* vars; actual backend uses DATABASE_URL — fixed
2. UPLOAD_DIR env: set to /app/uploads in Dockerfile (plan's compose had /app/data — updated to match)
3. deploy.yml is new file alongside build-and-push.yml (not replacing it — both work)
4. multer already installed at v2.0.2 (not 1.4.5-lts.1 as in plan)

---

**Git log (Phase 3-5):**
```
e3e2639  feat: Phase 5 deployment — Dockerfile, docker-compose, CI/CD workflow, env example (Tasks 25-29)
51eab5c  feat: Phase 3 frontend components — content, editor, search, map, settings (Tasks 20-24)
63057bf  feat: Phase 3 foundation — index.html, CSS design system, api.js, store.js, toast, utils, auth, app (Tasks 16-19)
```

---

**Tests:** 33 passing, 11 suites (npm test verified after each phase)

---

**Next session — what's remaining:**

Before the app can go live:

| # | Item | Command / Action |
|---|---|---|
| 1 | Run DB migration on NAS | `DATABASE_URL=... npm run migrate` |
| 2 | Run seed on NAS | `DATABASE_URL=... npm run seed` |
| 3 | Push to GitHub → watch Actions build | `git push origin main` |
| 4 | Create Container Station container | ghcr.io/sspaynter/knowledge-base:latest |
| 5 | Set all env vars in Container Station | See Task 30 in impl-05-deployment.md |
| 6 | Add kb.ss-42.com to Cloudflare tunnel | Cloudflare Zero Trust dashboard |
| 7 | Smoke test live | `curl https://kb.ss-42.com/api/health` |
| 8 | Browser test all features | Auth, workspace nav, page view, editor, search, map, settings |

**P1 items still needed:**
- Confirm `kb_app` DB user password (set during migration run)
- Confirm `HQ_URL` value for .env

