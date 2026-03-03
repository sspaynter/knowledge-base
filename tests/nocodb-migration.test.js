const { Pool } = require('pg');

// This test validates a one-time NocoDB→KB data migration against the
// production database.  It requires the NocoDB internal schema
// (pg33xhvewcmmwir) which only exists on the NAS Postgres instance.
const isCI = process.env.CI === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

// Pool closed by forceExit in jest.config.js

(isCI ? test.skip : test)('NocoDB documents have been migrated to assets', async () => {
  // Count source documents
  const source = await pool.query(
    'SELECT COUNT(*) AS count FROM pg33xhvewcmmwir.documents'
  );
  const sourceCount = parseInt(source.rows[0].count);

  // Count migrated assets with nocodb source marker in metadata
  const migrated = await pool.query(
    "SELECT COUNT(*) AS count FROM knowledge_base.assets WHERE metadata->>'source' = 'nocodb'"
  );
  const migratedCount = parseInt(migrated.rows[0].count);

  expect(migratedCount).toBe(sourceCount);
});

(isCI ? test.skip : test)('migrated assets have valid types', async () => {
  const result = await pool.query(`
    SELECT DISTINCT type FROM knowledge_base.assets
    WHERE metadata->>'source' = 'nocodb'
  `);
  const validTypes = ['skill','config','decision','session','image','file','link','miro'];
  for (const row of result.rows) {
    expect(validTypes).toContain(row.type);
  }
});
