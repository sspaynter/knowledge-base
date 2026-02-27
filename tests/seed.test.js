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
