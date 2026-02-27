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
