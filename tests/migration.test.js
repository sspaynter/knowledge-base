const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

// Pool closed by forceExit in jest.config.js

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
