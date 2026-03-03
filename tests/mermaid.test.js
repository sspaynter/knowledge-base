// tests/mermaid.test.js
// Mermaid rendering tests.
//
// Full rendering tests (initMermaid, renderMermaidBlocks, rerenderDiagram) require a
// browser environment (window.mermaid CDN, DOMParser, document APIs) and are not
// feasible in the current Node.js/Jest setup without a transpiler + jsdom.
//
// These tests verify the security and structural invariants we CAN check from Node:
//   1. mermaid-init.js never uses innerHTML to insert SVG (XSS prevention)
//   2. The sanitisation pattern (DOMParser path) is present in the source
//   3. Markdown pipeline: pages with mermaid fenced blocks are stored correctly
//
// For rendering integration tests, use Playwright against the staging or production URL.

'use strict';

const fs   = require('fs');
const path = require('path');
const db   = require('../services/database');

const MERMAID_SRC = fs.readFileSync(
  path.join(__dirname, '../public/js/mermaid-init.js'),
  'utf8'
);

// ── Security invariants ──────────────────────────────────────

describe('mermaid-init.js — security invariants', () => {
  test('never sets innerHTML', () => {
    // The DOMParser path prevents XSS. innerHTML must not be used.
    expect(MERMAID_SRC).not.toMatch(/\.innerHTML\s*=/);
  });

  test('uses DOMParser to parse SVG', () => {
    expect(MERMAID_SRC).toContain('new DOMParser()');
    expect(MERMAID_SRC).toContain("parseFromString(svg, 'image/svg+xml')");
  });

  test('uses adoptNode to transfer SVG into the document', () => {
    // document.adoptNode prevents cross-document node issues
    expect(MERMAID_SRC).toContain('document.adoptNode');
  });

  test('error path creates text content, not innerHTML', () => {
    // Error messages use textContent, not innerHTML
    expect(MERMAID_SRC).toContain('textContent');
    expect(MERMAID_SRC.match(/\.innerHTML\s*=/g) || []).toHaveLength(0);
  });

  test('wraps each diagram in a div with class mermaid-diagram', () => {
    expect(MERMAID_SRC).toContain("wrapper.className = 'mermaid-diagram'");
  });

  test('stores original source in dataset for re-rendering', () => {
    // Enables theme toggle and click-to-edit without re-fetching from server
    expect(MERMAID_SRC).toContain('dataset.mermaidSource');
  });
});

// ── Markdown storage: mermaid fenced blocks round-trip ───────

describe('mermaid content stored in pages', () => {
  const MERMAID_CONTENT = '# Diagram\n\n```mermaid\ngraph TD\n  A --> B\n```\n';
  let pageId;

  beforeAll(async () => {
    const pool = db.getPool();
    const sec = await pool.query('SELECT id FROM knowledge_base.sections LIMIT 1');
    const sectionId = sec.rows[0].id;

    const res = await pool.query(
      `INSERT INTO knowledge_base.pages (section_id, title, slug, content, content_cache, status, created_by)
       VALUES ($1, $2, $3, $4, $4, 'draft', 'user') RETURNING id`,
      [sectionId, 'Mermaid Test Page', 'mermaid-test-page-' + Date.now(), MERMAID_CONTENT]
    );
    pageId = res.rows[0].id;
  });

  afterAll(async () => {
    if (pageId) {
      await db.getPool().query('DELETE FROM knowledge_base.pages WHERE id = $1', [pageId]);
    }
  });

  test('mermaid fenced block is stored verbatim', async () => {
    const pool = db.getPool();
    const res = await pool.query('SELECT content FROM knowledge_base.pages WHERE id = $1', [pageId]);
    expect(res.rows[0].content).toContain('```mermaid');
    expect(res.rows[0].content).toContain('graph TD');
  });

  test('page content_cache matches stored content', async () => {
    const pool = db.getPool();
    const res = await pool.query(
      'SELECT content, content_cache FROM knowledge_base.pages WHERE id = $1', [pageId]
    );
    expect(res.rows[0].content_cache).toBe(res.rows[0].content);
  });
});
