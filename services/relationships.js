// services/relationships.js
'use strict';

const { getPool } = require('./database');

async function listRelationships({ from_asset_id, to_asset_id, type } = {}) {
  let where = 'WHERE 1=1';
  const values = [];
  if (from_asset_id) { values.push(from_asset_id); where += ` AND r.from_asset_id = $${values.length}`; }
  if (to_asset_id)   { values.push(to_asset_id);   where += ` AND r.to_asset_id = $${values.length}`; }
  if (type)          { values.push(type);           where += ` AND r.relationship_type = $${values.length}`; }

  const res = await getPool().query(`
    SELECT r.*,
      fa.title AS from_title, fa.type AS from_type,
      ta.title AS to_title, ta.type AS to_type
    FROM knowledge_base.asset_relationships r
    JOIN knowledge_base.assets fa ON fa.id = r.from_asset_id
    JOIN knowledge_base.assets ta ON ta.id = r.to_asset_id
    ${where}
    ORDER BY r.created_at DESC
  `, values);
  return res.rows;
}

async function createRelationship({ from_asset_id, to_asset_id, relationship_type, notes }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.asset_relationships
      (from_asset_id, to_asset_id, relationship_type, notes)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (from_asset_id, to_asset_id, relationship_type) DO NOTHING
    RETURNING *
  `, [from_asset_id, to_asset_id, relationship_type, notes || '']);
  return res.rows[0];
}

async function deleteRelationship(id) {
  await getPool().query(
    'DELETE FROM knowledge_base.asset_relationships WHERE id = $1', [id]
  );
}

module.exports = { listRelationships, createRelationship, deleteRelationship };
