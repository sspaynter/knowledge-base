// routes/upload.js
'use strict';

const router = require('express').Router();
const path = require('path');
const upload = require('../middleware/upload');
const assets = require('../services/assets');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);
router.use(requireRole('editor'));

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const isImage = /jpeg|jpg|png|gif|webp/.test(
      path.extname(req.file.originalname).toLowerCase().slice(1)
    );

    const asset = await assets.createAsset({
      type: isImage ? 'image' : 'file',
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      file_path: req.file.path,
      metadata: {
        original_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
      },
      created_by: req.user.isApiToken ? 'claude' : 'user',
    });

    res.status(201).json(asset);
  } catch (err) { next(err); }
});

module.exports = router;
