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
