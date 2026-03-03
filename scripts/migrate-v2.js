// scripts/migrate-v2.js
// v1.0 → v2.0 data migration. Safe to run multiple times (idempotent).
//
// Actions:
//   A. Vault files without matching page record → link or create page
//   B. DB pages without vault file → export content to vault
//   C. Refresh search_vector for any page still missing it
//
// Run: VAULT_DIR=/path/to/vault node scripts/migrate-v2.js
'use strict';

const fs   = require('fs');
const path = require('path');

// Load .env if present (for local runs)
try { require('dotenv').config(); } catch (_) {}

const db = require('../services/database');
const { VAULT_DIR, resolveVaultPath } = require('../services/vault-config');

const SCHEMA = 'knowledge_base';

async function run() {
  if (!VAULT_DIR) {
    console.error('VAULT_DIR is not set — cannot run migration');
    process.exit(1);
  }
  if (!fs.existsSync(VAULT_DIR)) {
    console.error(`VAULT_DIR does not exist: ${VAULT_DIR}`);
    process.exit(1);
  }

  await db.init();
  const pool = db.getPool();

  console.log(`\nKnowledge Base v2.0 Migration`);
  console.log(`Vault: ${VAULT_DIR}\n`);

  const stats = { linked: 0, created: 0, exported: 0, cacheUpdated: 0, skipped: 0, errors: 0 };

  // ── Step A: vault .md files → ensure DB records ──────────────────────────────
  console.log('Step A: Scanning vault files → ensuring DB records...');
  const vaultFiles = scanVault(VAULT_DIR);
  console.log(`  Found ${vaultFiles.length} vault files\n`);

  for (const relativePath of vaultFiles) {
    try {
      const absPath = resolveVaultPath(relativePath);
      const content = fs.readFileSync(absPath, 'utf8');

      // Check if page already linked to this file_path
      const existing = await pool.query(
        `SELECT id FROM ${SCHEMA}.pages WHERE file_path = $1 AND deleted_at IS NULL`,
        [relativePath]
      );

      if (existing.rows.length > 0) {
        // Already linked — refresh content_cache and search_vector
        await pool.query(`
          UPDATE ${SCHEMA}.pages
          SET content_cache = $2,
              search_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE($2::text, '')),
              updated_at = NOW()
          WHERE id = $1
        `, [existing.rows[0].id, content]);
        stats.cacheUpdated++;
        continue;
      }

      // No page linked — try to match by workspace/section/title from path
      const parts = relativePath.split('/');
      if (parts.length < 3) {
        console.log(`  Skip (path too shallow): ${relativePath}`);
        stats.skipped++;
        continue;
      }

      const workspaceSlug = parts[0];
      const sectionSlug   = parts[1];
      const filename      = parts[parts.length - 1];
      const titleFromFile = path.basename(filename, '.md').replace(/-/g, ' ');

      const wsRes = await pool.query(
        `SELECT id FROM ${SCHEMA}.workspaces WHERE slug = $1`, [workspaceSlug]
      );
      if (wsRes.rows.length === 0) {
        console.log(`  Skip (no workspace '${workspaceSlug}'): ${relativePath}`);
        stats.skipped++;
        continue;
      }

      const secRes = await pool.query(
        `SELECT id FROM ${SCHEMA}.sections WHERE workspace_id = $1 AND slug = $2`,
        [wsRes.rows[0].id, sectionSlug]
      );
      if (secRes.rows.length === 0) {
        console.log(`  Skip (no section '${sectionSlug}'): ${relativePath}`);
        stats.skipped++;
        continue;
      }

      const sectionId = secRes.rows[0].id;

      // Try to match by title within that section
      const byTitle = await pool.query(`
        SELECT id FROM ${SCHEMA}.pages
        WHERE section_id = $1 AND LOWER(title) = LOWER($2) AND deleted_at IS NULL AND file_path IS NULL
      `, [sectionId, titleFromFile]);

      if (byTitle.rows.length > 0) {
        // Link existing unlinked page to vault file
        await pool.query(`
          UPDATE ${SCHEMA}.pages
          SET file_path = $2, content_cache = $3,
              search_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE($3::text, '')),
              updated_at = NOW()
          WHERE id = $1
        `, [byTitle.rows[0].id, relativePath, content]);
        stats.linked++;
        console.log(`  Linked: ${relativePath} → page id ${byTitle.rows[0].id}`);
      } else {
        // Create new page record for this vault file
        const slug = path.basename(filename, '.md');
        const title = extractTitle(content) || titleFromFile;
        await pool.query(`
          INSERT INTO ${SCHEMA}.pages
            (section_id, title, slug, content, content_cache, file_path,
             template_type, status, created_by,
             search_vector)
          VALUES ($1, $2, $3, $4, $5, $6, 'blank', 'published', 'migration',
                  to_tsvector('english', COALESCE($2, '') || ' ' || COALESCE($5::text, '')))
          ON CONFLICT DO NOTHING
        `, [sectionId, title, slug, content, content, relativePath]);
        stats.created++;
        console.log(`  Created: ${relativePath}`);
      }
    } catch (err) {
      console.error(`  Error processing ${relativePath}:`, err.message);
      stats.errors++;
    }
  }

  // ── Step B: DB pages without vault files → export to vault ───────────────────
  console.log('\nStep B: Exporting DB pages without vault files...');
  const noVault = await pool.query(`
    SELECT p.id, p.title, p.slug, p.content, p.section_id
    FROM ${SCHEMA}.pages p
    WHERE p.file_path IS NULL AND p.deleted_at IS NULL
      AND p.content IS NOT NULL AND p.content <> ''
  `);
  console.log(`  Found ${noVault.rows.length} pages without vault files\n`);

  for (const page of noVault.rows) {
    try {
      const secRes = await pool.query(`
        SELECT s.slug AS section_slug, w.slug AS workspace_slug
        FROM ${SCHEMA}.sections s
        JOIN ${SCHEMA}.workspaces w ON w.id = s.workspace_id
        WHERE s.id = $1
      `, [page.section_id]);

      if (!secRes.rows[0]) {
        console.log(`  Skip (no section for page ${page.id})`);
        stats.skipped++;
        continue;
      }

      const { workspace_slug, section_slug } = secRes.rows[0];
      const slug = page.slug || slugify(page.title || 'untitled');
      let relativePath = `${workspace_slug}/${section_slug}/${slug}.md`;
      const absPath = resolveVaultPath(relativePath);

      // Don't overwrite existing vault files
      if (fs.existsSync(absPath)) {
        // File exists but not linked — link it
        await pool.query(`
          UPDATE ${SCHEMA}.pages
          SET file_path = $2, content_cache = $3,
              search_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE($3::text, '')),
              updated_at = NOW()
          WHERE id = $1
        `, [page.id, relativePath, page.content]);
        stats.linked++;
        console.log(`  Linked existing file: ${relativePath} → page id ${page.id}`);
        continue;
      }

      // Write vault file
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, page.content, 'utf8');

      // Update DB record
      await pool.query(`
        UPDATE ${SCHEMA}.pages
        SET file_path = $2, content_cache = $3,
            search_vector = to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE($3::text, '')),
            updated_at = NOW()
        WHERE id = $1
      `, [page.id, relativePath, page.content]);

      stats.exported++;
      console.log(`  Exported: page id ${page.id} → ${relativePath}`);
    } catch (err) {
      console.error(`  Error exporting page ${page.id}:`, err.message);
      stats.errors++;
    }
  }

  // ── Step C: Refresh search_vector for pages still missing it ─────────────────
  console.log('\nStep C: Refreshing missing search vectors...');
  const refreshed = await pool.query(`
    UPDATE ${SCHEMA}.pages
    SET search_vector = to_tsvector('english',
      COALESCE(title, '') || ' ' || COALESCE(content_cache, content, ''))
    WHERE deleted_at IS NULL AND search_vector IS NULL
    RETURNING id
  `);
  console.log(`  Updated search_vector for ${refreshed.rowCount} pages`);

  // ── Done ─────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Migration complete:`);
  console.log(`  Vault files linked to existing pages: ${stats.linked}`);
  console.log(`  New pages created from vault files:   ${stats.created}`);
  console.log(`  DB pages exported to vault:           ${stats.exported}`);
  console.log(`  Content caches refreshed:             ${stats.cacheUpdated}`);
  console.log(`  Skipped (no matching workspace/section): ${stats.skipped}`);
  console.log(`  Errors:                               ${stats.errors}`);

  await pool.end();
}

/** Scan vault directory recursively for .md files; return relative paths. */
function scanVault(dir, base = dir) {
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...scanVault(abs, base));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(path.relative(base, abs));
      }
    }
  } catch { /* skip unreadable dirs */ }
  return results;
}

/** Extract title from first H1 in markdown, or null. */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
