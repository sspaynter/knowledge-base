// server.js
'use strict';

const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./services/database');
const { getSharedAuthPool, configurePassport } = require('./services/shared-auth');
const { startWatcher } = require('./services/vault-sync');
const errorHandler = require('./middleware/errorHandler');

// ── Session secret — required, no fallback ────────────────
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const app = express();

// ── Trust proxy (Cloudflare Tunnel) ───────────────────────
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'", "https://accounts.google.com"],
    },
  },
}));

// ── Global API rate limit ─────────────────────────────────
const apiLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Session (shared_auth.sessions in applyr_staging DB) ───
app.use(session({
  store: new PgSession({
    pool: getSharedAuthPool(),
    schemaName: 'shared_auth',
    tableName: 'sessions',
    createTableIfMissing: true,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

// ── Passport ──────────────────────────────────────────────
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// ── Static files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/data/uploads';
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Auth routes (OAuth + session check + logout) ──────────
app.use('/auth', require('./routes/auth'));

// ── Health check (public, no auth) ────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.getPool().query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// ── Protected API routes ──────────────────────────────────
app.use('/api', apiLimit);
app.use('/api/workspaces',    require('./routes/workspaces'));
app.use('/api/pages',         require('./routes/pages'));
app.use('/api/assets',        require('./routes/assets'));
app.use('/api/relationships', require('./routes/relationships'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/sync',          require('./routes/sync'));
app.use('/api/upload',        require('./routes/upload'));

// ── Admin routes ───────────────────────────────────────────
app.use('/api/admin', require('./routes/admin'));

// ── SPA fallback ───────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
if (require.main === module) {
  db.init().then(() => {
    startWatcher();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Knowledge Platform running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;
