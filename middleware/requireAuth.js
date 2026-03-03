// middleware/requireAuth.js
'use strict';

const auth = require('../services/auth');

// ── requireAuth ────────────────────────────────────────────
// Accepts Bearer API token OR Passport session (Google OAuth).
// Sets req.user on success. Returns 401 on failure.

async function requireAuth(req, res, next) {
  try {
    // 1. Try Bearer token first (API / Claude sessions)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const valid = await auth.validateApiToken(token);
      if (valid) {
        req.user = { id: 0, username: 'api', role: 'editor', isApiToken: true };
        return next();
      }
      return res.status(401).json({ error: 'Invalid API token' });
    }

    // 2. Try Passport session (Google OAuth via shared_auth)
    if (req.user) {
      return next();
    }

    return res.status(401).json({ error: 'Authentication required' });
  } catch (err) {
    next(err);
  }
}

// ── requireRole ────────────────────────────────────────────
// Use after requireAuth. Checks req.user.role.
// requireRole('admin') — admin only
// requireRole('editor') — admin or editor

function requireRole(minRole) {
  const hierarchy = { viewer: 0, editor: 1, admin: 2 };
  return (req, res, next) => {
    const userLevel = hierarchy[req.user?.role] ?? -1;
    const required = hierarchy[minRole] ?? 99;
    if (userLevel >= required) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = { requireAuth, requireRole };
