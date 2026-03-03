// routes/auth.js
// Google OAuth routes + session check.
// Bearer API token auth is unchanged — handled by requireAuth middleware.
'use strict';

const router = require('express').Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');

// Strict rate limit for OAuth initiation (20 per 15 min)
const oauthLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, try again later' },
});

// GET /auth/google — redirect to Google consent screen
router.get('/google', oauthLimit, passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// GET /auth/google/callback — handle Google's redirect
router.get('/google/callback', oauthLimit,
  passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
  (req, res) => {
    res.redirect('/');
  }
);

// GET /auth/me — return current user or 401
router.get('/me', (req, res) => {
  if (req.user) {
    return res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        display_name: req.user.display_name || req.user.name,
        role: req.user.role,
        avatar_url: req.user.avatar_url,
      },
    });
  }
  res.json({ authenticated: false });
});

// POST /auth/logout — destroy session
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err.message);
    }
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('Session destroy error:', sessionErr.message);
      }
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });
});

module.exports = router;
