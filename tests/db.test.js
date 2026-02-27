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
