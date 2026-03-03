// server.js
'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./services/database');
const { startWatcher } = require('./services/vault-sync');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Static files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/data/uploads';
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Public routes ──────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));

app.get('/api/health', async (req, res) => {
  try {
    await db.getPool().query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// ── Protected routes ───────────────────────────────────────
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
