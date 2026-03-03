// routes/inbox.js — Quick-capture inbox endpoint.
// POST /api/inbox creates a page in personal/inbox, writing a vault file.
'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/requireAuth');
const { getPool } = require('../services/database');
const { createPage } = require('../services/pages');

const SCHEMA              = 'knowledge_base';
const INBOX_WORKSPACE_SLUG = 'personal';
const INBOX_SECTION_SLUG   = 'inbox';

router.use(requireAuth);

/**
 * POST /api/inbox
 * Body: { title?: string, content?: string }
 * Creates a new draft page in personal/inbox.
 * Title auto-generated from timestamp when not provided.
 */
router.post('/', async (req, res, next) => {
  try {
    const pool    = getPool();
    const content = (req.body.content || '').trim();

    // Auto-generate title if not provided
    const now   = new Date();
    const title = req.body.title?.trim() ||
      `Inbox — ${now.toISOString().slice(0, 16).replace('T', ' ')}`;

    // Find or create personal workspace
    let wsRes = await pool.query(
      `SELECT id FROM ${SCHEMA}.workspaces WHERE slug = $1`,
      [INBOX_WORKSPACE_SLUG]
    );
    let workspaceId;
    if (wsRes.rows.length > 0) {
      workspaceId = wsRes.rows[0].id;
    } else {
      const created = await pool.query(
        `INSERT INTO ${SCHEMA}.workspaces (name, slug, icon) VALUES ($1, $2, $3) RETURNING id`,
        ['Personal', INBOX_WORKSPACE_SLUG, 'user']
      );
      workspaceId = created.rows[0].id;
    }

    // Find or create inbox section
    let secRes = await pool.query(
      `SELECT id FROM ${SCHEMA}.sections WHERE workspace_id = $1 AND slug = $2`,
      [workspaceId, INBOX_SECTION_SLUG]
    );
    let sectionId;
    if (secRes.rows.length > 0) {
      sectionId = secRes.rows[0].id;
    } else {
      const created = await pool.query(
        `INSERT INTO ${SCHEMA}.sections (workspace_id, name, slug, icon) VALUES ($1, $2, $3, $4) RETURNING id`,
        [workspaceId, 'Inbox', INBOX_SECTION_SLUG, 'inbox']
      );
      sectionId = created.rows[0].id;
    }

    // Create the page — vault write handled by createPage service
    const page = await createPage({
      section_id:    sectionId,
      title,
      slug:          slugify(title),
      content,
      template_type: 'blank',
      status:        'draft',
      created_by:    req.user?.isApiToken ? 'claude' : 'user',
    });

    res.status(201).json(page);
  } catch (err) { next(err); }
});

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

module.exports = router;
