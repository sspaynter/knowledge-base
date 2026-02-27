// routes/relationships.js
'use strict';

const router = require('express').Router();
const rel = require('../services/relationships');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await rel.listRelationships(req.query));
  } catch (err) { next(err); }
});

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const r = await rel.createRelationship(req.body);
    if (!r) return res.status(409).json({ error: 'Relationship already exists' });
    res.status(201).json(r);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    await rel.deleteRelationship(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
