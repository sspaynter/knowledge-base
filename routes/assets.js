// routes/assets.js
'use strict';

const router = require('express').Router();
const assets = require('../services/assets');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await assets.listAssets({ type: req.query.type }));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const asset = await assets.getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Not found' });
    res.json(asset);
  } catch (err) { next(err); }
});

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const asset = await assets.createAsset(req.body);
    res.status(201).json(asset);
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const { change_summary, changed_by, ...updates } = req.body;
    const asset = await assets.updateAsset(req.params.id, updates, { change_summary, changed_by });
    if (!asset) return res.status(404).json({ error: 'Not found' });
    res.json(asset);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    await assets.deleteAsset(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/:id/link', requireRole('editor'), async (req, res, next) => {
  try {
    const link = await assets.linkAssetToPage(
      req.body.page_id, req.params.id, req.body
    );
    res.status(201).json(link);
  } catch (err) { next(err); }
});

module.exports = router;
