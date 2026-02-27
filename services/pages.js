// services/pages.js
'use strict';

const { getPool } = require('./database');

// ── Tree query: all pages for a section ───────────────────
async function getPageTree(sectionId) {
  const res = await getPool().query(`
    SELECT id, parent_id, title, slug, status, template_type,
           created_by, sort_order, created_at, updated_at
    FROM knowledge_base.pages
    WHERE section_id = $1 AND deleted_at IS NULL
    ORDER BY sort_order, title
  `, [sectionId]);
  return buildTree(res.rows);
}

function buildTree(rows, parentId = null) {
  return rows
    .filter(r => r.parent_id === parentId)
    .map(r => ({ ...r, children: buildTree(rows, r.id) }));
}

// ── Single page ────────────────────────────────────────────
async function getPage(id) {
  const res = await getPool().query(`
    SELECT p.*, s.workspace_id,
      (SELECT json_agg(a.* ORDER BY pa.sort_order)
       FROM knowledge_base.page_assets pa
       JOIN knowledge_base.assets a ON a.id = pa.asset_id
       WHERE pa.page_id = p.id AND a.deleted_at IS NULL
      ) AS assets
    FROM knowledge_base.pages p
    JOIN knowledge_base.sections s ON s.id = p.section_id
    WHERE p.id = $1 AND p.deleted_at IS NULL
  `, [id]);
  return res.rows[0] || null;
}

// ── Create ─────────────────────────────────────────────────
async function createPage({ section_id, parent_id, title, slug, content, template_type, status, created_by, sort_order }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.pages
      (section_id, parent_id, title, slug, content, template_type, status, created_by, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    section_id, parent_id || null, title, slug,
    content || '', template_type || 'blank',
    status || 'published', created_by || 'user', sort_order || 0
  ]);
  return res.rows[0];
}

// ── Update ─────────────────────────────────────────────────
async function updatePage(id, updates) {
  const allowed = ['title', 'slug', 'content', 'template_type', 'status', 'sort_order'];
  const fields = allowed.filter(f => updates[f] !== undefined);
  if (fields.length === 0) return getPage(id);
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);
  const res = await getPool().query(
    `UPDATE knowledge_base.pages SET ${sets}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

// ── Move (reparent or reorder) ─────────────────────────────
async function movePage(id, { parent_id, sort_order }) {
  const res = await getPool().query(`
    UPDATE knowledge_base.pages
    SET parent_id = $2, sort_order = $3, updated_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING *
  `, [id, parent_id ?? null, sort_order ?? 0]);
  return res.rows[0] || null;
}

// ── Soft delete ────────────────────────────────────────────
async function deletePage(id) {
  await getPool().query(
    'UPDATE knowledge_base.pages SET deleted_at = NOW() WHERE id = $1',
    [id]
  );
}

module.exports = { getPageTree, getPage, createPage, updatePage, movePage, deletePage };
