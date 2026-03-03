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
  const baseSql = fs.readFileSync(
    path.join(__dirname, 'migrate.sql'),
    'utf8'
  );

  console.log('Running base migration...');
  try {
    await pool.query(baseSql);
    console.log('✓ Base schema created');
  } catch (err) {
    console.error('✗ Base migration failed:', err.message);
    process.exit(1);
  }

  // Run incremental migrations in order
  const migrationsDir = path.join(__dirname, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      try {
        await pool.query(sql);
        console.log(`✓ Applied ${file}`);
      } catch (err) {
        console.error(`✗ Migration ${file} failed:`, err.message);
        process.exit(1);
      }
    }
  }

  console.log('✓ All migrations complete');
  await pool.end();
}

runMigration();
