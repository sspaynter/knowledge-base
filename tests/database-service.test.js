const db = require('../services/database');

// Pool closed by forceExit in jest.config.js

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
