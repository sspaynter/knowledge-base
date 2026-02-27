// routes/admin.js
'use strict';

const router = require('express').Router();
const auth = require('../services/auth');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);
router.use(requireRole('admin'));

// Users
router.get('/users', async (req, res, next) => {
  try { res.json(await auth.listUsers()); } catch (err) { next(err); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin','editor','viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await auth.updateUserRole(req.params.id, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await auth.deleteUser(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// API tokens
router.get('/tokens', async (req, res, next) => {
  try { res.json(await auth.listApiTokens()); } catch (err) { next(err); }
});

router.post('/tokens', async (req, res, next) => {
  try {
    if (!req.body.label) return res.status(400).json({ error: 'label is required' });
    const token = await auth.createApiToken(req.body.label);
    res.status(201).json(token); // plaintext returned once only
  } catch (err) { next(err); }
});

router.delete('/tokens/:id', async (req, res, next) => {
  try {
    await auth.deleteApiToken(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// Settings
router.get('/settings', async (req, res, next) => {
  try { res.json(await auth.getAllSettings()); } catch (err) { next(err); }
});

router.patch('/settings', async (req, res, next) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await auth.setSetting(key, String(value));
    }
    res.json(await auth.getAllSettings());
  } catch (err) { next(err); }
});

module.exports = router;
