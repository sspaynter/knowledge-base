// services/vault-sync.js
// Watches the vault directory for .md file changes and syncs to the database.

'use strict';

const fs = require('fs');
const path = require('path');
// chokidar v5 is ESM-only — lazy-load via dynamic import() in startWatcher()
const { VAULT_DIR, isVaultEnabled, toRelativePath } = require('./vault-config');
const { getPool } = require('./database');
const { createPageVersion } = require('./pages');
const { parseFrontmatter, serializeFrontmatter, mapFrontmatterToColumns } = require('./frontmatter');

const SCHEMA = 'knowledge_base';
const DEBOUNCE_MS = 500;

// Debounce timers per file path
const timers = new Map();

/**
 * Start the chokidar file watcher on VAULT_DIR.
 * Returns a promise that resolves to the watcher instance (for testing/cleanup).
 * Uses dynamic import() because chokidar v5 is ESM-only.
 */
async function startWatcher() {
  if (!isVaultEnabled()) {
    console.warn('Vault watcher not started — VAULT_DIR is not set or does not exist');
    return null;
  }

  const chokidar = await import('chokidar');
  const watcher = chokidar.watch(VAULT_DIR, {
    ignored: [/(^|[/\\])\../, /node_modules/],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: DEBOUNCE_MS, pollInterval: 100 },
  });

  watcher.on('add', (absPath) => {
    if (!absPath.endsWith('.md')) return;
    debouncedSync('add', absPath);
  });

  watcher.on('change', (absPath) => {
    if (!absPath.endsWith('.md')) return;
    debouncedSync('change', absPath);
  });

  watcher.on('unlink', (absPath) => {
    if (!absPath.endsWith('.md')) return;
    debouncedSync('unlink', absPath);
  });

  watcher.on('ready', () => {
    console.log(`Vault watcher started on ${VAULT_DIR}`);
  });

  watcher.on('error', (err) => {
    console.error('Vault watcher error:', err.message);
  });

  return watcher;
}

// ── Debounce ────────────────────────────────────────────────
function debouncedSync(type, absPath) {
  const relativePath = toRelativePath(absPath);
  if (timers.has(relativePath)) {
    clearTimeout(timers.get(relativePath));
  }
  timers.set(relativePath, setTimeout(async () => {
    timers.delete(relativePath);
    try {
      await handleSyncEvent(type, relativePath, absPath);
    } catch (err) {
      console.error(`Vault sync error [${type}] ${relativePath}:`, err.message);
    }
  }, DEBOUNCE_MS));
}

// ── Sync event handler ──────────────────────────────────────
async function handleSyncEvent(type, relativePath, absPath) {
  if (type === 'unlink') {
    await handleUnlink(relativePath);
    return;
  }

  const content = fs.readFileSync(absPath, 'utf8');

  if (type === 'change') {
    await handleChange(relativePath, content);
  } else if (type === 'add') {
    await handleAdd(relativePath, content);
  }
}

// ── Change: update existing page content_cache ──────────────
async function handleChange(relativePath, content) {
  const pool = getPool();

  // Parse frontmatter
  const { data: frontmatter, content: body } = parseFrontmatter(content);
  const columns = mapFrontmatterToColumns(frontmatter);

  // Build dynamic SET clause including any frontmatter-derived columns
  const setClauses = ['content_cache = $2', 'updated_at = NOW()'];
  const params = [relativePath, body];
  let paramIdx = 3;

  for (const [col, val] of Object.entries(columns)) {
    if (col === '_parent_slug' || col === 'created_at') continue; // Do not overwrite created_at on change
    setClauses.push(`${col} = $${paramIdx}`);
    params.push(val);
    paramIdx++;
  }

  // Resolve parent slug if present
  if (columns._parent_slug) {
    // Need section_id to resolve — get from current page
    const current = await pool.query(
      `SELECT section_id FROM ${SCHEMA}.pages WHERE file_path = $1 AND deleted_at IS NULL`,
      [relativePath]
    );
    if (current.rows.length > 0) {
      const parentId = await resolveParentSlug(pool, current.rows[0].section_id, columns._parent_slug);
      if (parentId) {
        setClauses.push(`parent_id = $${paramIdx}`);
        params.push(parentId);
        paramIdx++;
      }
    }
  }

  const result = await pool.query(
    `UPDATE ${SCHEMA}.pages
     SET ${setClauses.join(', ')}
     WHERE file_path = $1 AND deleted_at IS NULL
     RETURNING id`,
    params
  );

  if (result.rowCount > 0) {
    console.log(`Vault sync [change]: ${relativePath} → page ${result.rows[0].id}`);
    await createPageVersion(pool, result.rows[0].id, body, 'External edit detected', 'vault');
  } else {
    // File exists but no page record — treat as new file
    await handleAdd(relativePath, content);
  }
}

// ── Add: create new page from vault file ────────────────────
async function handleAdd(relativePath, content) {
  const pool = getPool();

  // Parse frontmatter
  const { data: frontmatter, content: body } = parseFrontmatter(content);
  const columns = mapFrontmatterToColumns(frontmatter);

  // Check if page already exists with this file_path
  const existing = await pool.query(
    `SELECT id FROM ${SCHEMA}.pages WHERE file_path = $1`,
    [relativePath]
  );
  if (existing.rows.length > 0) {
    // Already exists — update content and any frontmatter fields
    const setClauses = ['content_cache = $2', 'deleted_at = NULL', 'updated_at = NOW()'];
    const params = [relativePath, body];
    let paramIdx = 3;

    for (const [col, val] of Object.entries(columns)) {
      if (col === '_parent_slug') continue;
      setClauses.push(`${col} = $${paramIdx}`);
      params.push(val);
      paramIdx++;
    }

    await pool.query(
      `UPDATE ${SCHEMA}.pages SET ${setClauses.join(', ')} WHERE file_path = $1`,
      params
    );
    console.log(`Vault sync [add]: ${relativePath} → restored page ${existing.rows[0].id}`);
    return existing.rows[0].id;
  }

  // Infer workspace, section, title from path
  const { sectionId, title: inferredTitle } = await inferLocationFromPath(relativePath);
  const pageTitle = columns.title || inferredTitle;
  const slug = slugify(pageTitle);

  // Resolve parent slug if present
  let parentId = null;
  if (columns._parent_slug) {
    parentId = await resolveParentSlug(pool, sectionId, columns._parent_slug);
  }

  // sort_order: use frontmatter value, or fall back to next gapped value
  const sortOrder = columns.sort_order !== undefined ? columns.sort_order : await nextSortOrder(pool, sectionId);

  const result = await pool.query(
    `INSERT INTO ${SCHEMA}.pages (section_id, parent_id, title, slug, content, content_cache, file_path, status, created_by, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      sectionId,
      parentId,
      pageTitle,
      slug,
      body,
      relativePath,
      columns.status || 'draft',
      columns.created_by || 'user',
      sortOrder,
      columns.created_at || new Date().toISOString(),
      columns.updated_at || new Date().toISOString(),
    ]
  );

  console.log(`Vault sync [add]: ${relativePath} → new page ${result.rows[0].id}`);
  return result.rows[0].id;
}

// ── Unlink: soft-delete page ────────────────────────────────
async function handleUnlink(relativePath) {
  const pool = getPool();

  const result = await pool.query(
    `UPDATE ${SCHEMA}.pages SET deleted_at = NOW() WHERE file_path = $1 AND deleted_at IS NULL RETURNING id`,
    [relativePath]
  );

  if (result.rowCount > 0) {
    console.log(`Vault sync [unlink]: ${relativePath} → soft-deleted page ${result.rows[0].id}`);
  }
}

// ── Sync a single file by relative path (for POST /api/sync) ──
async function syncFile(relativePath) {
  const { resolveVaultPath } = require('./vault-config');
  const absPath = resolveVaultPath(relativePath);

  if (!fs.existsSync(absPath)) {
    return null;
  }

  const content = fs.readFileSync(absPath, 'utf8');

  // Try update first (handleChange parses frontmatter)
  const pool = getPool();
  const existing = await pool.query(
    `SELECT id FROM ${SCHEMA}.pages WHERE file_path = $1`,
    [relativePath]
  );

  if (existing.rows.length > 0) {
    await handleChange(relativePath, content);
    return existing.rows[0].id;
  }

  // Create new (handleAdd parses frontmatter)
  return handleAdd(relativePath, content);
}

// ── Infer workspace/section from vault path ─────────────────
// Path structure: workspace-folder/section-folder/[subfolder/]filename.md
// Maps folder names to existing DB records, creating if needed.
async function inferLocationFromPath(relativePath) {
  const parts = relativePath.split('/');
  const filename = parts[parts.length - 1];
  const title = titleFromFilename(filename);

  // Root-level files (e.g., Home.md) — use or create a default workspace/section
  if (parts.length <= 1) {
    const sectionId = await findOrCreateSection('general', 'general');
    return { sectionId, title };
  }

  const workspaceFolder = parts[0];
  const sectionFolder = parts.length >= 2 ? parts[1] : 'general';

  const sectionId = await findOrCreateSection(workspaceFolder, sectionFolder);
  return { sectionId, title };
}

// ── Find or create workspace + section by folder slugs ──────
async function findOrCreateSection(workspaceFolder, sectionFolder) {
  const pool = getPool();
  const wsSlug = slugify(workspaceFolder);
  const secSlug = slugify(sectionFolder);

  // Find workspace by slug
  let wsResult = await pool.query(
    `SELECT id FROM ${SCHEMA}.workspaces WHERE slug = $1`,
    [wsSlug]
  );

  if (wsResult.rows.length === 0) {
    // Try alias mapping for known mismatches
    const aliasSlug = WORKSPACE_ALIASES[wsSlug] || null;
    if (aliasSlug) {
      wsResult = await pool.query(
        `SELECT id FROM ${SCHEMA}.workspaces WHERE slug = $1`,
        [aliasSlug]
      );
    }
  }

  let workspaceId;
  if (wsResult.rows.length > 0) {
    workspaceId = wsResult.rows[0].id;
  } else {
    // Create workspace with gapped sort_order
    const name = workspaceFolder.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const maxWs = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_order FROM ${SCHEMA}.workspaces`
    );
    const newWs = await pool.query(
      `INSERT INTO ${SCHEMA}.workspaces (name, slug, sort_order) VALUES ($1, $2, $3) RETURNING id`,
      [name, wsSlug, maxWs.rows[0].next_order]
    );
    workspaceId = newWs.rows[0].id;
    console.log(`Vault sync: created workspace "${name}" (${wsSlug})`);
  }

  // Find section by slug within workspace
  let secResult = await pool.query(
    `SELECT id FROM ${SCHEMA}.sections WHERE workspace_id = $1 AND slug = $2`,
    [workspaceId, secSlug]
  );

  if (secResult.rows.length > 0) {
    return secResult.rows[0].id;
  }

  // Create section with gapped sort_order
  const sectionName = sectionFolder.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const maxSec = await pool.query(
    `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_order FROM ${SCHEMA}.sections WHERE workspace_id = $1`,
    [workspaceId]
  );
  const newSec = await pool.query(
    `INSERT INTO ${SCHEMA}.sections (workspace_id, name, slug, sort_order) VALUES ($1, $2, $3, $4) RETURNING id`,
    [workspaceId, sectionName, secSlug, maxSec.rows[0].next_order]
  );
  console.log(`Vault sync: created section "${sectionName}" in workspace ${workspaceId}`);
  return newSec.rows[0].id;
}

// Known workspace folder → DB slug aliases
// Add entries here when a vault folder name differs from its desired DB slug
const WORKSPACE_ALIASES = {};

// ── Frontmatter DB helpers ──────────────────────────────────

/**
 * Resolve parent slug to parent_id within the same section.
 */
async function resolveParentSlug(pool, sectionId, parentSlug) {
  const res = await pool.query(
    `SELECT id FROM ${SCHEMA}.pages WHERE section_id = $1 AND slug = $2 AND deleted_at IS NULL`,
    [sectionId, parentSlug]
  );
  return res.rows.length > 0 ? res.rows[0].id : null;
}

/**
 * Get the next sort_order value for a section (MAX + 10, gapped numbering).
 */
async function nextSortOrder(pool, sectionId) {
  const res = await pool.query(
    `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_order FROM ${SCHEMA}.pages WHERE section_id = $1 AND deleted_at IS NULL`,
    [sectionId]
  );
  return res.rows[0].next_order;
}

// ── Helpers ─────────────────────────────────────────────────
function titleFromFilename(filename) {
  // Remove .md extension
  let name = filename.replace(/\.md$/, '');
  // Convert kebab-case to Title Case
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

module.exports = {
  startWatcher, syncFile,
  handleAdd, handleChange, handleUnlink,
  inferLocationFromPath, slugify, titleFromFilename,
  parseFrontmatter, serializeFrontmatter, mapFrontmatterToColumns,
};
