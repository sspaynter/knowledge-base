// routes/search.js
'use strict';

const router = require('express').Router();
const { getPool } = require('../services/database');
const { requireAuth } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { q, type } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const query = q.trim();

    // Build assets query with optional type filter using parameterised values
    const assetValues = [query];
    let assetTypeClause = '';
    if (type) {
      assetValues.push(type);
      assetTypeClause = `AND type = $${assetValues.length}`;
    }

    const [pagesRes, assetsRes] = await Promise.all([
      getPool().query(`
        SELECT p.id, p.title, p.slug, p.template_type, p.updated_at,
               s.name AS section_name, w.name AS workspace_name, w.slug AS workspace_slug,
               ts_headline('english', p.content, plainto_tsquery($1), 'MaxWords=20,MinWords=5') AS excerpt
        FROM knowledge_base.pages p
        JOIN knowledge_base.sections s ON s.id = p.section_id
        JOIN knowledge_base.workspaces w ON w.id = s.workspace_id
        WHERE p.deleted_at IS NULL
          AND p.status = 'published'
          AND p.search_vector @@ plainto_tsquery($1)
        ORDER BY ts_rank(p.search_vector, plainto_tsquery($1)) DESC
        LIMIT 20
      `, [query]),
      getPool().query(`
        SELECT id, type, title, description AS excerpt, updated_at
        FROM knowledge_base.assets
        WHERE deleted_at IS NULL
          AND search_vector @@ plainto_tsquery($1)
          ${assetTypeClause}
        ORDER BY ts_rank(search_vector, plainto_tsquery($1)) DESC
        LIMIT 20
      `, assetValues),
    ]);

    res.json({
      query,
      pages: pagesRes.rows,
      assets: assetsRes.rows,
      total: pagesRes.rows.length + assetsRes.rows.length,
    });
  } catch (err) { next(err); }
});

module.exports = router;
