// services/pages.js
'use strict';

const fs = require('fs');
const path = require('path');
const { getPool } = require('./database');
const { isVaultEnabled, resolveVaultPath, VAULT_DIR } = require('./vault-config');
const { serializeFrontmatter } = require('./frontmatter');

const SCHEMA = 'knowledge_base';

// ── Tree query: all pages for a section ───────────────────
async function getPageTree(sectionId) {
  const res = await getPool().query(`
    SELECT id, parent_id, title, slug, status, template_type,
           created_by, sort_order, created_at, updated_at
    FROM ${SCHEMA}.pages
    WHERE section_id = $1 AND deleted_at IS NULL
    ORDER BY sort_order, title
  `, [sectionId]);
  return buildTree(res.rows);
}

function buildTree(rows, parentId = null) {
  return rows
    .filter(r => r.parent_id === parentId)
    .map(r => ({ ...r, children: buildTree(rows, r.id) }));
}

// ── Single page (with vault read fallback) ────────────────
async function getPage(id) {
  const res = await getPool().query(`
    SELECT p.*, s.workspace_id,
      (SELECT json_agg(a.* ORDER BY pa.sort_order)
       FROM ${SCHEMA}.page_assets pa
       JOIN ${SCHEMA}.assets a ON a.id = pa.asset_id
       WHERE pa.page_id = p.id AND a.deleted_at IS NULL
      ) AS assets
    FROM ${SCHEMA}.pages p
    JOIN ${SCHEMA}.sections s ON s.id = p.section_id
    WHERE p.id = $1 AND p.deleted_at IS NULL
  `, [id]);

  const page = res.rows[0] || null;
  if (page) {
    page.content = resolveContent(page);
  }
  return page;
}

// ── Lookup by file_path (current or previous) ─────────────
async function getPageByPath(filePath) {
  const pool = getPool();

  // Try current file_path
  let res = await pool.query(`
    SELECT p.*, s.workspace_id,
      (SELECT json_agg(a.* ORDER BY pa.sort_order)
       FROM ${SCHEMA}.page_assets pa
       JOIN ${SCHEMA}.assets a ON a.id = pa.asset_id
       WHERE pa.page_id = p.id AND a.deleted_at IS NULL
      ) AS assets
    FROM ${SCHEMA}.pages p
    JOIN ${SCHEMA}.sections s ON s.id = p.section_id
    WHERE p.file_path = $1 AND p.deleted_at IS NULL
  `, [filePath]);

  if (res.rows.length === 0) {
    // Fall back to previous_paths
    res = await pool.query(`
      SELECT p.*, s.workspace_id,
        (SELECT json_agg(a.* ORDER BY pa.sort_order)
         FROM ${SCHEMA}.page_assets pa
         JOIN ${SCHEMA}.assets a ON a.id = pa.asset_id
         WHERE pa.page_id = p.id AND a.deleted_at IS NULL
        ) AS assets
      FROM ${SCHEMA}.pages p
      JOIN ${SCHEMA}.sections s ON s.id = p.section_id
      WHERE p.previous_paths @> $1::jsonb AND p.deleted_at IS NULL
    `, [JSON.stringify(filePath)]);
  }

  const page = res.rows[0] || null;
  if (page) {
    page.content = resolveContent(page);
  }
  return page;
}

// ── Three-layer content fallback ──────────────────────────
// 1. Vault file (if file_path set and vault enabled) — strip frontmatter
// 2. content_cache (synced copy in DB) — already stripped at sync time
// 3. content column (pre-migration pages)
function resolveContent(page) {
  if (page.file_path && isVaultEnabled()) {
    try {
      const absPath = resolveVaultPath(page.file_path);
      if (fs.existsSync(absPath)) {
        const raw = fs.readFileSync(absPath, 'utf8');
        const { parseFrontmatter: parse } = require('./frontmatter');
        return parse(raw).content;
      }
    } catch {
      // Fall through to content_cache
    }
  }

  if (page.content_cache) {
    return page.content_cache;
  }

  return page.content;
}

// ── Create ─────────────────────────────────────────────────
// Writes vault file + sets file_path + content_cache when vault is enabled.
async function createPage({ section_id, parent_id, title, slug, content, template_type, status, created_by, sort_order }) {
  const pool = getPool();
  const pageContent = content || '';

  // Generate vault file_path if vault is enabled
  let filePath = null;
  if (isVaultEnabled() && section_id) {
    filePath = await generateFilePath(pool, section_id, title || 'untitled', slug);
    const vaultMeta = buildVaultMetadata({ status, created_by, sort_order, title });
    writeVaultFile(filePath, pageContent, vaultMeta);
  }

  const res = await pool.query(`
    INSERT INTO ${SCHEMA}.pages
      (section_id, parent_id, title, slug, content, content_cache, file_path,
       template_type, status, created_by, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    section_id, parent_id || null, title, slug,
    pageContent,
    filePath ? pageContent : null,
    filePath,
    template_type || 'blank',
    status || 'published', created_by || 'user', sort_order || 0,
  ]);

  const page = res.rows[0];

  // Create initial version snapshot
  await createPageVersion(pool, page.id, pageContent, 'Page created', created_by || 'user');

  return page;
}

// ── Update ─────────────────────────────────────────────────
// Writes vault file on content change, creates version snapshot.
async function updatePage(id, updates) {
  const pool = getPool();

  // Fetch current page to get file_path and current content
  const current = await pool.query(
    `SELECT p.*, s.workspace_id FROM ${SCHEMA}.pages p
     JOIN ${SCHEMA}.sections s ON s.id = p.section_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id]
  );
  if (!current.rows[0]) return null;
  const currentPage = current.rows[0];

  const allowed = ['title', 'slug', 'content', 'template_type', 'status', 'sort_order'];
  const fields = allowed.filter(f => updates[f] !== undefined);
  if (fields.length === 0) return getPage(id);

  const isContentUpdate = updates.content !== undefined;
  const newContent = isContentUpdate ? updates.content : null;

  // Handle vault write when content changes
  let vaultFields = {};
  if (isContentUpdate && isVaultEnabled()) {
    let filePath = currentPage.file_path;

    // Generate file_path for pre-migration pages (no file_path yet)
    if (!filePath) {
      filePath = await generateFilePath(pool, currentPage.section_id, currentPage.title, currentPage.slug);
    }

    // Build metadata for frontmatter round-trip
    const mergedPage = { ...currentPage, ...updates };
    const vaultMeta = buildVaultMetadata({
      status: mergedPage.status,
      created_by: mergedPage.created_by,
      sort_order: mergedPage.sort_order,
      title: mergedPage.title,
    });
    writeVaultFile(filePath, newContent, vaultMeta);
    vaultFields = { file_path: filePath, content_cache: newContent };
  }

  // Build dynamic SET clause
  const allFields = [...fields, ...Object.keys(vaultFields)];
  const allValues = [...fields.map(f => updates[f]), ...Object.values(vaultFields)];
  const sets = allFields.map((f, i) => `${f} = $${i + 2}`).join(', ');

  const res = await pool.query(
    `UPDATE ${SCHEMA}.pages SET ${sets}, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, ...allValues]
  );
  const updated = res.rows[0] || null;

  // Create version snapshot when content changes
  if (isContentUpdate && updated) {
    await createPageVersion(
      pool, id,
      resolveContent(currentPage),
      updates._change_summary || 'Updated',
      updates._changed_by || 'user'
    );
  }

  return updated;
}

// ── Move (reparent, reorder, or change section) ────────────
// Moving section changes vault file path + appends old path to previous_paths.
async function movePage(id, { parent_id, sort_order, section_id }) {
  const pool = getPool();

  const current = await pool.query(
    `SELECT p.*, s.workspace_id FROM ${SCHEMA}.pages p
     JOIN ${SCHEMA}.sections s ON s.id = p.section_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id]
  );
  if (!current.rows[0]) return null;
  const page = current.rows[0];

  const newSectionId = section_id ?? page.section_id;
  const sectionChanged = newSectionId !== page.section_id;

  // Handle vault file move if section changes
  let newFilePath = page.file_path;
  let previousPaths = page.previous_paths || [];

  if (sectionChanged && isVaultEnabled() && page.file_path) {
    const oldFilePath = page.file_path;
    newFilePath = await generateFilePath(pool, newSectionId, page.title, page.slug);

    // Move the vault file
    moveVaultFile(oldFilePath, newFilePath);

    // Append old path to previous_paths
    if (!Array.isArray(previousPaths)) previousPaths = [];
    previousPaths = [...previousPaths, oldFilePath];
  }

  const res = await pool.query(`
    UPDATE ${SCHEMA}.pages
    SET section_id = $2, parent_id = $3, sort_order = $4,
        file_path = $5, previous_paths = $6::jsonb, updated_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING *
  `, [id, newSectionId, parent_id ?? page.parent_id, sort_order ?? page.sort_order,
      newFilePath, JSON.stringify(previousPaths)]);

  return res.rows[0] || null;
}

// ── Bulk reorder ──────────────────────────────────────────
// Accepts array of { id, sort_order }. All must belong to same section.
// Updates DB in a single transaction. Writes vault frontmatter for pages with file_path.
async function reorderPages(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('items must be a non-empty array'), { status: 400 });
  }

  const pool = getPool();
  const ids = items.map(i => i.id);

  // Validate: fetch all pages in one query
  const res = await pool.query(`
    SELECT id, section_id, file_path, status, created_by, sort_order, title
    FROM ${SCHEMA}.pages
    WHERE id = ANY($1::int[]) AND deleted_at IS NULL
  `, [ids]);

  if (res.rows.length !== ids.length) {
    throw Object.assign(new Error('One or more page IDs not found'), { status: 404 });
  }

  const sectionIds = new Set(res.rows.map(r => r.section_id));
  if (sectionIds.size > 1) {
    throw Object.assign(new Error('All pages must belong to the same section'), { status: 400 });
  }

  const pageMap = new Map(res.rows.map(r => [r.id, r]));

  // Update DB in transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { id, sort_order } of items) {
      await client.query(
        `UPDATE ${SCHEMA}.pages SET sort_order = $1, updated_at = NOW()
         WHERE id = $2 AND deleted_at IS NULL`,
        [sort_order, id]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Update vault frontmatter for pages that have file_path
  if (isVaultEnabled()) {
    const { parseFrontmatter } = require('./frontmatter');
    for (const { id, sort_order } of items) {
      const page = pageMap.get(id);
      if (!page || !page.file_path) continue;
      try {
        const absPath = resolveVaultPath(page.file_path);
        if (fs.existsSync(absPath)) {
          const raw = fs.readFileSync(absPath, 'utf8');
          const { content } = parseFrontmatter(raw);
          const meta = buildVaultMetadata({
            status: page.status,
            created_by: page.created_by,
            sort_order,
            title: page.title,
          });
          writeVaultFile(page.file_path, content, meta);
        }
      } catch {
        // Vault write failure is non-fatal — DB already committed
      }
    }
  }
}

// ── Soft delete ────────────────────────────────────────────
// Does NOT delete the vault file — file stays for potential restore.
async function deletePage(id) {
  await getPool().query(
    `UPDATE ${SCHEMA}.pages SET deleted_at = NOW() WHERE id = $1`,
    [id]
  );
}

// ── Version snapshots ──────────────────────────────────────
// Create a page_versions row. Prunes to keep last 50.
async function createPageVersion(pool, pageId, content, changeSummary, changedBy) {
  await pool.query(`
    INSERT INTO ${SCHEMA}.page_versions (page_id, content, change_summary, changed_by)
    VALUES ($1, $2, $3, $4)
  `, [pageId, content || '', changeSummary || 'Updated', changedBy || 'user']);

  // Prune — keep only the 50 most recent versions
  await pool.query(`
    DELETE FROM ${SCHEMA}.page_versions
    WHERE page_id = $1 AND id NOT IN (
      SELECT id FROM ${SCHEMA}.page_versions
      WHERE page_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    )
  `, [pageId]);
}

// ── Get version history for a page ────────────────────────
async function getPageVersions(pageId) {
  const res = await getPool().query(`
    SELECT id, change_summary, changed_by, created_at
    FROM ${SCHEMA}.page_versions
    WHERE page_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [pageId]);
  return res.rows;
}

// ── Restore a specific version ─────────────────────────────
async function restorePageVersion(pageId, versionId) {
  const pool = getPool();
  const vRes = await pool.query(
    `SELECT content FROM ${SCHEMA}.page_versions WHERE id = $1 AND page_id = $2`,
    [versionId, pageId]
  );
  if (!vRes.rows[0]) return null;
  return updatePage(pageId, {
    content: vRes.rows[0].content,
    _change_summary: `Restored version ${versionId}`,
  });
}

// ── Vault metadata helpers ─────────────────────────────────

/**
 * Build frontmatter metadata object from page fields.
 * Maps DB column names back to frontmatter keys.
 */
function buildVaultMetadata({ status, created_by, sort_order, title }) {
  const meta = {};
  if (title) meta.title = title;
  if (status && status !== 'published') meta.status = status;
  if (created_by && created_by !== 'user') meta.author = created_by;
  if (sort_order !== undefined && sort_order !== null && sort_order !== 0) meta.order = sort_order;
  return meta;
}

// ── Vault file helpers ─────────────────────────────────────

function writeVaultFile(relativePath, content, metadata) {
  const absPath = resolveVaultPath(relativePath);
  const dir = path.dirname(absPath);
  fs.mkdirSync(dir, { recursive: true });

  // Prepend frontmatter if metadata provided
  const fileContent = metadata ? serializeFrontmatter(metadata, content) : content;
  fs.writeFileSync(absPath, fileContent, 'utf8');
}

function moveVaultFile(oldRelativePath, newRelativePath) {
  const oldAbs = resolveVaultPath(oldRelativePath);
  const newAbs = resolveVaultPath(newRelativePath);
  if (!fs.existsSync(oldAbs)) return;
  const dir = path.dirname(newAbs);
  fs.mkdirSync(dir, { recursive: true });
  fs.renameSync(oldAbs, newAbs);
}

// ── Generate vault file_path from section + title ──────────
// Returns: "workspace-slug/section-slug/title-slug.md"
// Appends numeric suffix if that path already exists in DB.
async function generateFilePath(pool, sectionId, title, existingSlug) {
  const secRes = await pool.query(`
    SELECT s.slug AS section_slug, w.slug AS workspace_slug
    FROM ${SCHEMA}.sections s
    JOIN ${SCHEMA}.workspaces w ON w.id = s.workspace_id
    WHERE s.id = $1
  `, [sectionId]);

  if (!secRes.rows[0]) {
    return `general/general/${slugify(title)}.md`;
  }

  const { workspace_slug, section_slug } = secRes.rows[0];
  const baseSlug = existingSlug || slugify(title || 'untitled');
  const basePath = `${workspace_slug}/${section_slug}/${baseSlug}.md`;

  // Check for collisions in DB
  const existing = await pool.query(
    `SELECT file_path FROM ${SCHEMA}.pages WHERE file_path LIKE $1`,
    [`${workspace_slug}/${section_slug}/${baseSlug}%`]
  );

  if (existing.rows.length === 0) return basePath;

  // Find next available suffix
  const taken = new Set(existing.rows.map(r => r.file_path));
  let i = 2;
  while (taken.has(`${workspace_slug}/${section_slug}/${baseSlug}-${i}.md`)) i++;
  return `${workspace_slug}/${section_slug}/${baseSlug}-${i}.md`;
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

module.exports = {
  getPageTree, getPage, getPageByPath,
  createPage, updatePage, movePage, reorderPages, deletePage,
  getPageVersions, restorePageVersion,
  createPageVersion,
};
