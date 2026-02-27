// routes/workspaces.js
'use strict';

const router = require('express').Router();
const ws = require('../services/workspaces');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

// Workspaces
router.get('/', async (req, res, next) => {
  try {
    res.json(await ws.listWorkspaces());
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const workspace = await ws.createWorkspace(req.body);
    res.status(201).json(workspace);
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const workspace = await ws.updateWorkspace(req.params.id, req.body);
    if (!workspace) return res.status(404).json({ error: 'Not found' });
    res.json(workspace);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await ws.deleteWorkspace(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// Sections (nested under workspaces)
router.get('/:id/sections', async (req, res, next) => {
  try {
    res.json(await ws.listSections(req.params.id));
  } catch (err) { next(err); }
});

router.post('/:id/sections', requireRole('editor'), async (req, res, next) => {
  try {
    const section = await ws.createSection({ ...req.body, workspace_id: req.params.id });
    res.status(201).json(section);
  } catch (err) { next(err); }
});

router.patch('/sections/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const section = await ws.updateSection(req.params.id, req.body);
    if (!section) return res.status(404).json({ error: 'Not found' });
    res.json(section);
  } catch (err) { next(err); }
});

router.delete('/sections/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await ws.deleteSection(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
