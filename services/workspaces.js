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
