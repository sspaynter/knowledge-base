// routes/pages.js
'use strict';

const router = require('express').Router();
const pages = require('../services/pages');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

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

module.exports = router;
