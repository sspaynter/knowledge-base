// routes/pages.js
'use strict';

const fs = require('fs');
const router = require('express').Router();
const pages = require('../services/pages');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const { isVaultEnabled, resolveVaultPath } = require('../services/vault-config');
const { parseFrontmatter, serializeFrontmatter, mapFrontmatterToColumns } = require('../services/frontmatter');
const { inferLocationFromPath, findOrCreateSection, slugify, suppressPath } = require('../services/vault-sync');

router.use(requireAuth);

// GET /api/pages/by-path?path=relative/path.md
// Looks up by current file_path, then falls back to previous_paths.
router.get('/by-path', async (req, res, next) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'path query parameter is required' });

    const page = await pages.getPageByPath(filePath);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

// POST /api/pages/by-path — upsert a page from raw vault content
// Accepts { path, content } where content is raw .md with optional frontmatter.
// Auto-creates workspace/section from path. Writes raw content to server vault.
router.post('/by-path', requireRole('editor'), async (req, res, next) => {
  try {
    const { path: filePath, content } = req.body;
    const warnings = [];

    // Validate required fields
    if (!filePath) return res.status(400).json({ error: 'path is required' });
    if (content === undefined || content === null) return res.status(400).json({ error: 'content is required' });

    // Path traversal protection
    if (filePath.startsWith('/') || filePath.includes('..')) {
      return res.status(400).json({ error: 'path must be vault-relative (no absolute paths or ..)' });
    }

    // Parse frontmatter from raw content
    const { data: frontmatter, content: body } = parseFrontmatter(content);
    const columns = mapFrontmatterToColumns(frontmatter);

    // Resolve workspace + section from path (auto-creates if needed)
    const { sectionId, title: inferredTitle } = await inferLocationFromPath(filePath);
    const pageTitle = columns.title || inferredTitle;
    const slug = slugify(pageTitle);

    const { getPool } = require('../services/database');
    const pool = getPool();
    const SCHEMA = 'knowledge_base';

    // Resolve parent slug if present
    let parentId = null;
    if (columns._parent_slug) {
      const parentRes = await pool.query(
        `SELECT id FROM ${SCHEMA}.pages WHERE section_id = $1 AND slug = $2 AND deleted_at IS NULL`,
        [sectionId, columns._parent_slug]
      );
      if (parentRes.rows.length > 0) {
        parentId = parentRes.rows[0].id;
      } else {
        warnings.push(`Parent slug "${columns._parent_slug}" not found in section`);
      }
    }

    // Check if page already exists at this file_path
    const existing = await pool.query(
      `SELECT id, updated_at FROM ${SCHEMA}.pages WHERE file_path = $1`,
      [filePath]
    );

    let action, pageId, previousUpdatedAt = null;

    if (existing.rows.length > 0) {
      // UPDATE existing page
      previousUpdatedAt = existing.rows[0].updated_at;
      pageId = existing.rows[0].id;

      const setClauses = ['content_cache = $2', 'content = $2', 'updated_at = NOW()'];
      const params = [filePath, body];
      let paramIdx = 3;

      if (pageTitle) { setClauses.push(`title = $${paramIdx}`); params.push(pageTitle); paramIdx++; }
      if (slug) { setClauses.push(`slug = $${paramIdx}`); params.push(slug); paramIdx++; }
      if (columns.status) { setClauses.push(`status = $${paramIdx}`); params.push(columns.status); paramIdx++; }
      if (columns.created_by) { setClauses.push(`created_by = $${paramIdx}`); params.push(columns.created_by); paramIdx++; }
      if (columns.sort_order !== undefined) { setClauses.push(`sort_order = $${paramIdx}`); params.push(columns.sort_order); paramIdx++; }
      if (parentId !== null) { setClauses.push(`parent_id = $${paramIdx}`); params.push(parentId); paramIdx++; }
      // Restore soft-deleted pages
      setClauses.push('deleted_at = NULL');

      await pool.query(
        `UPDATE ${SCHEMA}.pages SET ${setClauses.join(', ')} WHERE file_path = $1`,
        params
      );
      action = 'updated';
    } else {
      // CREATE new page
      const sortOrder = columns.sort_order !== undefined ? columns.sort_order : await nextSortOrder(pool, sectionId, SCHEMA);

      const result = await pool.query(
        `INSERT INTO ${SCHEMA}.pages (section_id, parent_id, title, slug, content, content_cache, file_path, status, created_by, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          sectionId, parentId, pageTitle, slug, body, filePath,
          columns.status || 'published', columns.created_by || 'user', sortOrder,
          columns.created_at || new Date().toISOString(),
          columns.updated_at || new Date().toISOString(),
        ]
      );
      pageId = result.rows[0].id;
      action = 'created';
    }

    // Write raw content byte-for-byte to server vault (if vault is enabled)
    if (isVaultEnabled()) {
      const path = require('path');
      const absPath = resolveVaultPath(filePath);
      const dir = path.dirname(absPath);
      fs.mkdirSync(dir, { recursive: true });

      // Suppress chokidar from re-processing this write
      suppressPath(filePath);
      fs.writeFileSync(absPath, content, 'utf8');
    }

    // Create version snapshot
    await pages.createPageVersion(pool, pageId, body, `API sync: ${action}`, 'api');

    // Fetch updated_at from DB
    const updated = await pool.query(
      `SELECT updated_at FROM ${SCHEMA}.pages WHERE id = $1`,
      [pageId]
    );

    res.status(action === 'created' ? 201 : 200).json({
      action,
      id: pageId,
      file_path: filePath,
      updated_at: updated.rows[0]?.updated_at,
      previous_updated_at: previousUpdatedAt,
      warnings,
    });
  } catch (err) { next(err); }
});

// GET /api/pages/export — bulk export pages with raw content for sync
// Optional: ?since=<ISO timestamp> to filter pages updated after that time
router.get('/export', async (req, res, next) => {
  try {
    const { since } = req.query;
    const { getPool } = require('../services/database');
    const pool = getPool();
    const SCHEMA = 'knowledge_base';

    let query, params;
    if (since) {
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        return res.status(400).json({ error: 'Invalid since timestamp' });
      }
      query = `SELECT id, file_path, title, status, updated_at, content_cache, content, created_by, sort_order
               FROM ${SCHEMA}.pages WHERE deleted_at IS NULL AND updated_at > $1
               ORDER BY updated_at ASC`;
      params = [sinceDate.toISOString()];
    } else {
      query = `SELECT id, file_path, title, status, updated_at, content_cache, content, created_by, sort_order
               FROM ${SCHEMA}.pages WHERE deleted_at IS NULL
               ORDER BY updated_at ASC`;
      params = [];
    }

    const result = await pool.query(query, params);

    // For each page, build raw content (with frontmatter)
    const exportPages = result.rows.map(row => {
      let rawContent = null;

      // Try reading from vault file first
      if (row.file_path && isVaultEnabled()) {
        try {
          const absPath = resolveVaultPath(row.file_path);
          if (fs.existsSync(absPath)) {
            rawContent = fs.readFileSync(absPath, 'utf8');
          }
        } catch {
          // Fall through to reconstruction
        }
      }

      // Reconstruct from DB fields if vault file not available
      if (rawContent === null) {
        const body = row.content_cache || row.content || '';
        const meta = {};
        if (row.title) meta.title = row.title;
        if (row.status && row.status !== 'published') meta.status = row.status;
        if (row.created_by && row.created_by !== 'user') meta.author = row.created_by;
        if (row.sort_order) meta.order = row.sort_order;
        rawContent = serializeFrontmatter(meta, body);
      }

      return {
        id: row.id,
        file_path: row.file_path,
        title: row.title,
        status: row.status,
        updated_at: row.updated_at,
        content: rawContent,
      };
    });

    res.json({ pages: exportPages, count: exportPages.length });
  } catch (err) { next(err); }
});

router.get('/section/:sectionId', async (req, res, next) => {
  try {
    res.json(await pages.getPageTree(req.params.sectionId));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const page = await pages.getPage(req.params.id);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.createPage(req.body);
    res.status(201).json(page);
  } catch (err) { next(err); }
});

// PATCH /api/pages/reorder — bulk reorder pages within a section
// Must be before /:id wildcard route
router.patch('/reorder', requireRole('editor'), async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }
    for (const item of items) {
      if (typeof item.id !== 'number' || typeof item.sort_order !== 'number') {
        return res.status(400).json({ error: 'Each item must have numeric id and sort_order' });
      }
    }
    await pages.reorderPages(items);
    res.json({ ok: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.patch('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.updatePage(req.params.id, req.body);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

router.patch('/:id/move', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.movePage(req.params.id, req.body);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    await pages.deletePage(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// GET /api/pages/:id/versions — list version history
router.get('/:id/versions', async (req, res, next) => {
  try {
    const versions = await pages.getPageVersions(req.params.id);
    res.json(versions);
  } catch (err) { next(err); }
});

// POST /api/pages/:id/versions/:versionId/restore — restore a version
router.post('/:id/versions/:versionId/restore', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.restorePageVersion(req.params.id, req.params.versionId);
    if (!page) return res.status(404).json({ error: 'Version not found' });
    res.json(page);
  } catch (err) { next(err); }
});

// Helper: next gapped sort_order for a section
async function nextSortOrder(pool, sectionId, schema) {
  const res = await pool.query(
    `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_order FROM ${schema}.pages WHERE section_id = $1 AND deleted_at IS NULL`,
    [sectionId]
  );
  return res.rows[0].next_order;
}

module.exports = router;
