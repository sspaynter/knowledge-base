// ── Centralized Error Handler ───────────────────────
function errorHandler(err, req, res, next) {
  console.error(`[${req.method} ${req.path}]`, err.message || err);
  const status = err.status || 500;
  const message = err.status ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
