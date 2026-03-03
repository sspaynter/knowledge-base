// routes/sync.js
// POST /api/sync — trigger vault sync for a specific file.
// Used by Claude after writing a vault file directly.

'use strict';

const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const { syncFile } = require('../services/vault-sync');

router.use(requireAuth);

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const { file_path } = req.body;
    if (!file_path) {
      return res.status(400).json({ error: 'file_path is required' });
    }

    const pageId = await syncFile(file_path);
    if (pageId === null) {
      return res.status(404).json({ error: 'File not found in vault' });
    }

    res.json({ success: true, page_id: pageId });
  } catch (err) { next(err); }
});

module.exports = router;
