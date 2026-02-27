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
