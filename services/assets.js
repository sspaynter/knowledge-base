// services/assets.js
'use strict';

const { getPool } = require('./database');

async function listAssets({ type, deleted } = {}) {
  let where = 'WHERE a.deleted_at IS NULL';
  const values = [];
  if (type) {
    values.push(type);
    where += ` AND a.type = $${values.length}`;
  }
  const res = await getPool().query(
    `SELECT id, type, title, description, file_path, url, metadata, created_by, created_at, updated_at
     FROM knowledge_base.assets a ${where} ORDER BY updated_at DESC`,
    values
  );
  return res.rows;
}

async function getAsset(id) {
  const pool = getPool();
  const [asset, versions] = await Promise.all([
    pool.query('SELECT * FROM knowledge_base.assets WHERE id = $1 AND deleted_at IS NULL', [id]),
    pool.query('SELECT * FROM knowledge_base.asset_versions WHERE asset_id = $1 ORDER BY created_at DESC', [id]),
  ]);
  if (!asset.rows[0]) return null;
  return { ...asset.rows[0], versions: versions.rows };
}

async function createAsset({ type, title, description, content, file_path, url, metadata, created_by }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.assets (type, title, description, content, file_path, url, metadata, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [type, title, description || '', content || '', file_path || null, url || null,
      metadata ? JSON.stringify(metadata) : '{}', created_by || 'user']);
  return res.rows[0];
}

async function updateAsset(id, updates, { change_summary, changed_by } = {}) {
  const pool = getPool();
  const current = await pool.query(
    'SELECT * FROM knowledge_base.assets WHERE id = $1 AND deleted_at IS NULL', [id]
  );
  if (!current.rows[0]) return null;

  // Snapshot current version before updating
  await pool.query(`
    INSERT INTO knowledge_base.asset_versions (asset_id, version, content, change_summary, changed_by)
    VALUES ($1, $2, $3, $4, $5)
  `, [
    id,
    current.rows[0].metadata?.version || '0',
    current.rows[0].content,
    change_summary || 'Updated',
    changed_by || 'user',
  ]);

  const allowed = ['title', 'description', 'content', 'file_path', 'url', 'metadata'];
  const fields = allowed.filter(f => updates[f] !== undefined);
  if (fields.length === 0) return getAsset(id);

  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f =>
    f === 'metadata' ? JSON.stringify(updates[f]) : updates[f]
  );

  const res = await pool.query(
    `UPDATE knowledge_base.assets SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0];
}

async function deleteAsset(id) {
  await getPool().query(
    'UPDATE knowledge_base.assets SET deleted_at = NOW() WHERE id = $1', [id]
  );
}

async function linkAssetToPage(pageId, assetId, { display_mode, sort_order } = {}) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.page_assets (page_id, asset_id, display_mode, sort_order)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (page_id, asset_id) DO UPDATE SET display_mode = $3, sort_order = $4
    RETURNING *
  `, [pageId, assetId, display_mode || 'reference', sort_order || 0]);
  return res.rows[0];
}

async function getAssetLinkedPages(assetId) {
  const res = await getPool().query(`
    SELECT p.id, p.title, p.status, s.name AS section_name, w.name AS workspace_name
    FROM knowledge_base.page_assets pa
    JOIN knowledge_base.pages p ON p.id = pa.page_id
    JOIN knowledge_base.sections s ON s.id = p.section_id
    JOIN knowledge_base.workspaces w ON w.id = s.workspace_id
    WHERE pa.asset_id = $1 AND p.deleted_at IS NULL
    ORDER BY w.name, s.name, p.title
  `, [assetId]);
  return res.rows;
}

module.exports = { listAssets, getAsset, createAsset, updateAsset, deleteAsset, linkAssetToPage, getAssetLinkedPages };
