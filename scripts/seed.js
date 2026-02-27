// scripts/seed.js
// Seeds initial workspaces, sections, templates, and settings.
// Safe to run multiple times — uses INSERT ... ON CONFLICT DO NOTHING.

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
      { name: 'IT & Projects', slug: 'it-projects', icon: 'monitor',    sort_order: 0 },
      { name: 'Personal',      slug: 'personal',    icon: 'user',        sort_order: 1 },
      { name: 'Work',          slug: 'work',         icon: 'briefcase',   sort_order: 2 },
      { name: 'Learning',      slug: 'learning',     icon: 'book-open',   sort_order: 3 },
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
    const sections = [
      // IT & Projects
      { workspace: 'it-projects', name: 'Claude',         slug: 'claude',         icon: 'bot',         sort_order: 0 },
      { workspace: 'it-projects', name: 'Projects',       slug: 'projects',       icon: 'layout-grid', sort_order: 1 },
      { workspace: 'it-projects', name: 'Infrastructure', slug: 'infrastructure', icon: 'server',       sort_order: 2 },
      // Personal
      { workspace: 'personal',    name: 'General',        slug: 'general',        icon: 'notebook',     sort_order: 0 },
      { workspace: 'personal',    name: 'Bag Business',   slug: 'bag-business',   icon: 'package',      sort_order: 1 },
      // Work
      { workspace: 'work',        name: 'General',        slug: 'general',        icon: 'notebook',     sort_order: 0 },
      // Learning
      { workspace: 'learning',    name: 'General',        slug: 'general',        icon: 'notebook',     sort_order: 0 },
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
