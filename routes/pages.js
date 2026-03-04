// routes/pages.js
'use strict';

const router = require('express').Router();
const pages = require('../services/pages');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

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

module.exports = router;
