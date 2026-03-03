// scripts/seed.js
// Seeds initial workspaces, sections, templates, and settings.
// Safe to run multiple times — uses INSERT ... ON CONFLICT DO NOTHING.
//
// Workspace taxonomy follows modified PARA:
//   inbox / operations / products / projects / studio / work / personal / learning / archive
// vault-sync auto-creates additional sections as it encounters vault directories.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Workspaces ─────────────────────────────────────────
    const workspaces = [
      { name: 'Inbox',      slug: 'inbox',      icon: 'inbox',       sort_order: 0 },
      { name: 'Operations', slug: 'operations', icon: 'monitor',     sort_order: 1 },
      { name: 'Products',   slug: 'products',   icon: 'layout-grid', sort_order: 2 },
      { name: 'Projects',   slug: 'projects',   icon: 'folder',      sort_order: 3 },
      { name: 'Studio',     slug: 'studio',     icon: 'sparkles',    sort_order: 4 },
      { name: 'Work',       slug: 'work',       icon: 'briefcase',   sort_order: 5 },
      { name: 'Personal',   slug: 'personal',   icon: 'user',        sort_order: 6 },
      { name: 'Learning',   slug: 'learning',   icon: 'book-open',   sort_order: 7 },
      { name: 'Archive',    slug: 'archive',    icon: 'archive',     sort_order: 8 },
    ];

    for (const ws of workspaces) {
      await client.query(`
        INSERT INTO knowledge_base.workspaces (name, slug, icon, sort_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO NOTHING
      `, [ws.name, ws.slug, ws.icon, ws.sort_order]);
    }
    console.log('✓ Workspaces seeded');

    // ── Sections ───────────────────────────────────────────
    // Key sections seeded here; vault-sync auto-creates additional sections from file paths.
    const sections = [
      // Operations
      { workspace: 'operations', name: 'AI Operating Model',   slug: 'ai-operating-model',  icon: 'bot',       sort_order: 0 },
      { workspace: 'operations', name: 'Infrastructure',       slug: 'infrastructure',       icon: 'server',    sort_order: 1 },
      { workspace: 'operations', name: 'Engineering Practice', slug: 'engineering-practice', icon: 'code',      sort_order: 2 },
      { workspace: 'operations', name: 'Automation',           slug: 'automation',           icon: 'zap',       sort_order: 3 },
      // Products
      { workspace: 'products',   name: 'Knowledge Base',       slug: 'knowledge-base',       icon: 'database',  sort_order: 0 },
      { workspace: 'products',   name: 'Applyr',               slug: 'applyr',               icon: 'briefcase', sort_order: 1 },
      { workspace: 'products',   name: 'ToDo',                 slug: 'todo',                 icon: 'check',     sort_order: 2 },
      { workspace: 'products',   name: 'n8n',                  slug: 'n8n',                  icon: 'workflow',  sort_order: 3 },
      // Projects
      { workspace: 'projects',   name: 'Clients',              slug: 'clients',              icon: 'users',     sort_order: 0 },
      // Personal
      { workspace: 'personal',   name: 'Job Search',           slug: 'job-search',           icon: 'search',    sort_order: 0 },
      { workspace: 'personal',   name: 'General',              slug: 'general',              icon: 'notebook',  sort_order: 1 },
      // Learning
      { workspace: 'learning',   name: 'AI',                   slug: 'ai',                   icon: 'bot',       sort_order: 0 },
      { workspace: 'learning',   name: 'Product',              slug: 'product',              icon: 'package',   sort_order: 1 },
      { workspace: 'learning',   name: 'IT',                   slug: 'it',                   icon: 'server',    sort_order: 2 },
    ];

    for (const sec of sections) {
      const ws = await client.query(
        'SELECT id FROM knowledge_base.workspaces WHERE slug = $1', [sec.workspace]
      );
      if (ws.rows.length === 0) continue;
      await client.query(`
        INSERT INTO knowledge_base.sections (workspace_id, name, slug, icon, sort_order)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (workspace_id, slug) DO NOTHING
      `, [ws.rows[0].id, sec.name, sec.slug, sec.icon, sec.sort_order]);
    }
    console.log('✓ Sections seeded');

    // ── Templates ──────────────────────────────────────────
    const templates = [
      {
        name: 'Blank',
        template_type: 'blank',
        default_content: '',
        structure: {}
      },
      {
        name: 'Project Overview',
        template_type: 'project-overview',
        default_content: '## Overview\n\n## Goals\n\n## Status\n\n## Links\n',
        structure: { asset_types: ['config', 'decision', 'session'] }
      },
      {
        name: 'Skill Page',
        template_type: 'skill-page',
        default_content: '## Purpose\n\n## Coverage\n\n## Change Log\n',
        structure: { asset_types: ['skill'] }
      },
      {
        name: 'Decision Record',
        template_type: 'decision-record',
        default_content: '## Context\n\n## Decision\n\n## Consequences\n',
        structure: { asset_types: ['decision'] }
      },
      {
        name: 'Session Log',
        template_type: 'session-log',
        default_content: '## What was done\n\n## What changed\n\n## What was decided\n',
        structure: { asset_types: ['session'] }
      },
      {
        name: 'Section Home',
        template_type: 'section-home',
        default_content: '## About this section\n\n## Pages\n',
        structure: {}
      },
    ];

    for (const t of templates) {
      await client.query(`
        INSERT INTO knowledge_base.templates (name, template_type, default_content, structure)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (template_type) DO NOTHING
      `, [t.name, t.template_type, t.default_content, JSON.stringify(t.structure)]);
    }
    console.log('✓ Templates seeded');

    // ── Settings ───────────────────────────────────────────
    const settings = [
      ['allow_registration', 'true'],
      ['hq_url', ''],
      ['app_name', 'Knowledge Platform'],
    ];

    for (const [key, value] of settings) {
      await client.query(`
        INSERT INTO knowledge_base.settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO NOTHING
      `, [key, value]);
    }
    console.log('✓ Settings seeded');

    await client.query('COMMIT');
    console.log('\n✓ Seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
