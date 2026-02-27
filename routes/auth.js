// routes/auth.js
'use strict';

const router = require('express').Router();
const auth = require('../services/auth');

// GET /api/auth/check
router.get('/check', async (req, res) => {
  const token = req.cookies?.session;
  if (!token) return res.json({ authenticated: false });
  const user = await auth.validateSession(token);
  if (!user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user });
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, displayName, email } = req.body;
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'username, password, and displayName are required' });
    }
    // Block registration if disabled and users exist
    const allowReg = await auth.getSetting('allow_registration');
    const pool = require('../services/database').getPool();
    const count = await pool.query('SELECT COUNT(*) FROM knowledge_base.users');
    if (allowReg !== 'true' && parseInt(count.rows[0].count) > 0) {
      return res.status(403).json({ error: 'Registration is disabled' });
    }
    const user = await auth.createUser({ username, password, displayName, email });
    const session = await auth.createSession(user.id);
    res.cookie('session', session.token, {
      httpOnly: true, sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const user = await auth.getUserByUsername(username);
    if (!user || !(await auth.verifyPassword(user, password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const session = await auth.createSession(user.id);
    res.cookie('session', session.token, {
      httpOnly: true, sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.json({ user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.session;
  if (token) await auth.destroySession(token);
  res.clearCookie('session');
  res.json({ ok: true });
});

module.exports = router;
