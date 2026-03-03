#!/usr/bin/env node

// scripts/initial-vault-sync.js
// One-time script to populate file_path and content_cache for all vault files.
// Scans the vault directory, matches to existing pages by title/slug, or creates new ones.
//
// Usage:
//   VAULT_DIR=./vault DATABASE_URL=postgresql://... node scripts/initial-vault-sync.js

'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const VAULT_DIR = process.env.VAULT_DIR;
const SCHEMA = 'knowledge_base';

if (!VAULT_DIR) {
  console.error('VAULT_DIR environment variable is required');
  process.exit(1);
}

if (!fs.existsSync(VAULT_DIR)) {
  console.error(`VAULT_DIR does not exist: ${VAULT_DIR}`);
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb',
});

// Known workspace folder → DB slug aliases
// Add entries here when a vault folder name differs from its desired DB slug
const WORKSPACE_ALIASES = {};

async function main() {
  const client = await pool.connect();
  let matched = 0;
  let created = 0;
  let unmatched = 0;

  try {
    // Scan vault for all .md files
    const files = scanVault(VAULT_DIR);
    console.log(`Found ${files.length} .md files in vault`);

    // Load existing pages for matching
    const existingPages = await client.query(
      `SELECT id, title, slug, file_path FROM ${SCHEMA}.pages WHERE deleted_at IS NULL`
    );
    const pagesBySlug = new Map();
    const pagesByTitle = new Map();
    for (const page of existingPages.rows) {
      pagesBySlug.set(page.slug, page);
      pagesByTitle.set(page.title.toLowerCase(), page);
    }

    for (const filePath of files) {
      const relativePath = path.relative(VAULT_DIR, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath, '.md');
      const slug = slugify(filename);
      const title = titleFromFilename(filename);

      // Skip if already synced
      const alreadySynced = existingPages.rows.find(p => p.file_path === relativePath);
      if (alreadySynced) {
        // Update content_cache
        await client.query(
          `UPDATE ${SCHEMA}.pages SET content_cache = $2 WHERE id = $1`,
          [alreadySynced.id, content]
        );
        matched++;
        console.log(`  [matched] ${relativePath} → page ${alreadySynced.id} (already synced)`);
        continue;
      }

      // Try to match by slug
      let existingPage = pagesBySlug.get(slug);

      // Try to match by title
      if (!existingPage) {
        existingPage = pagesByTitle.get(title.toLowerCase());
      }

      if (existingPage && !existingPage.file_path) {
        // Match found — update with file_path and content_cache
        await client.query(
          `UPDATE ${SCHEMA}.pages SET file_path = $2, content_cache = $3 WHERE id = $1`,
          [existingPage.id, relativePath, content]
        );
        matched++;
        console.log(`  [matched] ${relativePath} → page ${existingPage.id} (${existingPage.title})`);
      } else {
        // No match — create new page
        const { sectionId } = await inferLocationFromPath(client, relativePath);
        const result = await client.query(
          `INSERT INTO ${SCHEMA}.pages (section_id, title, slug, content, content_cache, file_path, status, created_by)
           VALUES ($1, $2, $3, $4, $4, $5, 'published', 'user')
           RETURNING id`,
          [sectionId, title, slug, content, relativePath]
        );
        created++;
        console.log(`  [created] ${relativePath} → new page ${result.rows[0].id}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\nSync complete: ${matched} matched, ${created} created, ${unmatched} unmatched`);
}

// ── Scan vault directory recursively ────────────────────────
function scanVault(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanVault(fullPath));
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Infer workspace/section from vault path ─────────────────
async function inferLocationFromPath(client, relativePath) {
  const parts = relativePath.split('/');
  const filename = parts[parts.length - 1];
  const title = titleFromFilename(path.basename(filename, '.md'));

  if (parts.length <= 1) {
    const sectionId = await findOrCreateSection(client, 'general', 'general');
    return { sectionId, title };
  }

  const workspaceFolder = parts[0];
  const sectionFolder = parts.length >= 2 ? parts[1] : 'general';

  const sectionId = await findOrCreateSection(client, workspaceFolder, sectionFolder);
  return { sectionId, title };
}

async function findOrCreateSection(client, workspaceFolder, sectionFolder) {
  const wsSlug = slugify(workspaceFolder);
  const secSlug = slugify(sectionFolder);

  // Find workspace
  let wsResult = await client.query(
    `SELECT id FROM ${SCHEMA}.workspaces WHERE slug = $1`,
    [wsSlug]
  );

  if (wsResult.rows.length === 0) {
    const aliasSlug = WORKSPACE_ALIASES[wsSlug];
    if (aliasSlug) {
      wsResult = await client.query(
        `SELECT id FROM ${SCHEMA}.workspaces WHERE slug = $1`,
        [aliasSlug]
      );
    }
  }

  let workspaceId;
  if (wsResult.rows.length > 0) {
    workspaceId = wsResult.rows[0].id;
  } else {
    const name = workspaceFolder.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const newWs = await client.query(
      `INSERT INTO ${SCHEMA}.workspaces (name, slug) VALUES ($1, $2) RETURNING id`,
      [name, wsSlug]
    );
    workspaceId = newWs.rows[0].id;
    console.log(`  Created workspace "${name}" (${wsSlug})`);
  }

  // Find section
  let secResult = await client.query(
    `SELECT id FROM ${SCHEMA}.sections WHERE workspace_id = $1 AND slug = $2`,
    [workspaceId, secSlug]
  );

  if (secResult.rows.length > 0) {
    return secResult.rows[0].id;
  }

  const sectionName = sectionFolder.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const newSec = await client.query(
    `INSERT INTO ${SCHEMA}.sections (workspace_id, name, slug) VALUES ($1, $2, $3) RETURNING id`,
    [workspaceId, sectionName, secSlug]
  );
  console.log(`  Created section "${sectionName}" in workspace ${workspaceId}`);
  return newSec.rows[0].id;
}

// ── Helpers ─────────────────────────────────────────────────
function titleFromFilename(filename) {
  return filename
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
