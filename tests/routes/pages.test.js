// tests/routes/pages.test.js
// Auth via Bearer API token.

'use strict';

const request = require('supertest');
const app  = require('../../server');
const auth = require('../../services/auth');
const db   = require('../../services/database');

let bearer, sectionId;

beforeAll(async () => {
  const token = await auth.createApiToken('pages-test');
  bearer = `Bearer ${token.plaintext}`;

  const sec = await db.getPool().query(
    'SELECT id FROM knowledge_base.sections LIMIT 1'
  );
  sectionId = sec.rows[0]?.id;
});

test('GET /api/pages/section/:id returns tree', async () => {
  const res = await request(app)
    .get(`/api/pages/section/${sectionId}`)
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /api/pages creates a page', async () => {
  const res = await request(app)
    .post('/api/pages')
    .set('Authorization', bearer)
    .send({ section_id: sectionId, title: 'Test Page', slug: 'test-page', content: '# Hello' });
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Test Page');
});

test('PATCH /api/pages/:id updates content', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Authorization', bearer)
    .send({ section_id: sectionId, title: 'Update Me', slug: 'update-me' });

  const res = await request(app)
    .patch(`/api/pages/${create.body.id}`)
    .set('Authorization', bearer)
    .send({ content: 'Updated content' });
  expect(res.status).toBe(200);
  expect(res.body.content).toBe('Updated content');
});

test('DELETE /api/pages/:id soft deletes', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Authorization', bearer)
    .send({ section_id: sectionId, title: 'Delete Me', slug: 'delete-me' });

  await request(app).delete(`/api/pages/${create.body.id}`).set('Authorization', bearer);

  const res = await request(app)
    .get(`/api/pages/${create.body.id}`)
    .set('Authorization', bearer);
  expect(res.status).toBe(404);
}, 30000);

// ── Reorder tests ────────────────────────────────────────
test('PATCH /api/pages/reorder reorders pages', async () => {
  const make = async (title, order) => {
    const res = await request(app)
      .post('/api/pages')
      .set('Authorization', bearer)
      .send({ section_id: sectionId, title, slug: title.toLowerCase().replace(/ /g, '-'), sort_order: order });
    return res.body;
  };
  const a = await make('Reorder A', 10);
  const b = await make('Reorder B', 20);
  const c = await make('Reorder C', 30);

  // Reverse order: C=10, A=20, B=30
  const res = await request(app)
    .patch('/api/pages/reorder')
    .set('Authorization', bearer)
    .send({ items: [
      { id: c.id, sort_order: 10 },
      { id: a.id, sort_order: 20 },
      { id: b.id, sort_order: 30 },
    ]});
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);

  // Confirm C comes before A in the tree
  const tree = await request(app)
    .get(`/api/pages/section/${sectionId}`)
    .set('Authorization', bearer);
  const titles = tree.body.map(p => p.title);
  expect(titles.indexOf('Reorder C')).toBeLessThan(titles.indexOf('Reorder A'));
}, 45000);

test('PATCH /api/pages/reorder returns 400 for empty items', async () => {
  const res = await request(app)
    .patch('/api/pages/reorder')
    .set('Authorization', bearer)
    .send({ items: [] });
  expect(res.status).toBe(400);
});

test('PATCH /api/pages/reorder returns 400 for invalid shape', async () => {
  const res = await request(app)
    .patch('/api/pages/reorder')
    .set('Authorization', bearer)
    .send({ items: [{ id: 'bad', sort_order: 10 }] });
  expect(res.status).toBe(400);
});

test('PATCH /api/pages/reorder returns 401 without auth', async () => {
  const res = await request(app)
    .patch('/api/pages/reorder')
    .send({ items: [{ id: 1, sort_order: 10 }] });
  expect(res.status).toBe(401);
});

// ── POST /api/pages/by-path tests ─────────────────────────

// Unique prefix per test run to avoid collisions with persistent DB
const runId = Date.now().toString(36);

test('POST /api/pages/by-path returns 401 without auth', async () => {
  const res = await request(app)
    .post('/api/pages/by-path')
    .send({ path: 'test/test/doc.md', content: '# Test' });
  expect(res.status).toBe(401);
});

test('POST /api/pages/by-path returns 400 when path is missing', async () => {
  const res = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ content: '# Test' });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/path/i);
});

test('POST /api/pages/by-path returns 400 when content is missing', async () => {
  const res = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: 'test/test/doc.md' });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/content/i);
});

test('POST /api/pages/by-path returns 400 for absolute path', async () => {
  const res = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: '/etc/passwd', content: '# Nope' });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/vault-relative/i);
});

test('POST /api/pages/by-path returns 400 for path traversal', async () => {
  const res = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: 'test/../../../etc/passwd', content: '# Nope' });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/vault-relative/i);
});

test('POST /api/pages/by-path creates new page from raw vault content', async () => {
  const testPath = `_sync-${runId}/_sync-sec/sync-test-page.md`;
  const content = '---\ntitle: Sync Test Page\nstatus: published\n---\n\n# Hello from sync\n\nThis is a test.';
  const res = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: testPath, content });
  expect(res.status).toBe(201);
  expect(res.body.action).toBe('created');
  expect(res.body.id).toBeDefined();
  expect(res.body.file_path).toBe(testPath);
  expect(res.body.warnings).toEqual([]);

  // Verify DB fields
  const page = await request(app)
    .get(`/api/pages/${res.body.id}`)
    .set('Authorization', bearer);
  expect(page.status).toBe(200);
  expect(page.body.title).toBe('Sync Test Page');
  // Content should be body without frontmatter
  expect(page.body.content).toContain('# Hello from sync');
  expect(page.body.content).not.toContain('---');
});

test('POST /api/pages/by-path updates existing page on second push', async () => {
  const testPath = `_sync-${runId}/_sync-sec/update-test.md`;
  const content1 = '# Version 1';
  const res1 = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: testPath, content: content1 });
  expect(res1.body.action).toBe('created');
  const pageId = res1.body.id;

  const content2 = '# Version 2';
  const res2 = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: testPath, content: content2 });
  expect(res2.status).toBe(200);
  expect(res2.body.action).toBe('updated');
  expect(res2.body.id).toBe(pageId);
  expect(res2.body.previous_updated_at).toBeDefined();
});

test('POST /api/pages/by-path auto-creates workspace and section from path', async () => {
  const wsFolder = `autows${runId}`;
  const res = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: `${wsFolder}/autosec/auto-page.md`, content: '# Auto' });
  expect(res.status).toBe(201);
  expect(res.body.action).toBe('created');

  // Verify workspace was created (slugify lowercases the folder name)
  const wsRes = await db.getPool().query(
    `SELECT id FROM knowledge_base.workspaces WHERE slug = $1`,
    [wsFolder.toLowerCase()]
  );
  expect(wsRes.rows.length).toBe(1);
});

test('POST /api/pages/by-path returns warning when parent slug not found', async () => {
  const testPath = `_sync-${runId}/_sync-sec/orphan-page.md`;
  const content = '---\nparent: nonexistent-parent\n---\n\n# Orphan';
  const res = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: testPath, content });
  expect([200, 201]).toContain(res.status);
  expect(res.body.warnings.length).toBeGreaterThan(0);
  expect(res.body.warnings[0]).toContain('nonexistent-parent');
});

test('POST /api/pages/by-path content round-trip: frontmatter mapped to DB columns', async () => {
  const testPath = `_sync-${runId}/_sync-sec/roundtrip-test.md`;
  const content = '---\ntitle: Mapped Title\nstatus: draft\nauthor: claude\norder: 42\n---\n\nBody only here.';
  const res = await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: testPath, content });
  expect(res.status).toBe(201);

  // Verify DB columns reflect frontmatter values
  const row = await db.getPool().query(
    'SELECT title, status, created_by, sort_order, content_cache FROM knowledge_base.pages WHERE id = $1',
    [res.body.id]
  );
  expect(row.rows[0].title).toBe('Mapped Title');
  expect(row.rows[0].status).toBe('draft');
  expect(row.rows[0].created_by).toBe('claude');
  expect(row.rows[0].sort_order).toBe(42);
  // content_cache should be body without frontmatter
  expect(row.rows[0].content_cache).toContain('Body only here.');
  expect(row.rows[0].content_cache).not.toContain('---');
});

// ── GET /api/pages/export tests ──────────────────────────

test('GET /api/pages/export returns 401 without auth', async () => {
  const res = await request(app)
    .get('/api/pages/export');
  expect(res.status).toBe(401);
});

test('GET /api/pages/export returns pages array and count', async () => {
  const res = await request(app)
    .get('/api/pages/export')
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.pages)).toBe(true);
  expect(typeof res.body.count).toBe('number');
  expect(res.body.count).toBe(res.body.pages.length);
});

test('GET /api/pages/export each page has required fields', async () => {
  const res = await request(app)
    .get('/api/pages/export')
    .set('Authorization', bearer);
  expect(res.status).toBe(200);

  if (res.body.pages.length > 0) {
    const page = res.body.pages[0];
    expect(page).toHaveProperty('id');
    expect(page).toHaveProperty('file_path');
    expect(page).toHaveProperty('title');
    expect(page).toHaveProperty('status');
    expect(page).toHaveProperty('updated_at');
    expect(page).toHaveProperty('content');
  }
});

test('GET /api/pages/export since filter returns only recent pages', async () => {
  // Create a page so we have at least one recent record
  const testPath = `_sync-${runId}/_sync-sec/export-since-test.md`;
  await request(app)
    .post('/api/pages/by-path')
    .set('Authorization', bearer)
    .send({ path: testPath, content: '# Since test' });

  // Use a past timestamp — should return at least the page we just created
  const pastDate = new Date(Date.now() - 60000).toISOString();
  const res = await request(app)
    .get(`/api/pages/export?since=${encodeURIComponent(pastDate)}`)
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(res.body.count).toBeGreaterThan(0);

  // Use a future timestamp — should return zero pages
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const res2 = await request(app)
    .get(`/api/pages/export?since=${encodeURIComponent(futureDate)}`)
    .set('Authorization', bearer);
  expect(res2.status).toBe(200);
  expect(res2.body.count).toBe(0);
}, 30000);

test('GET /api/pages/export returns 400 for invalid since timestamp', async () => {
  const res = await request(app)
    .get('/api/pages/export?since=not-a-date')
    .set('Authorization', bearer);
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/invalid/i);
});

// ── GET /api/pages/resolve tests ─────────────────────────

test('GET /api/pages/resolve returns 404 for nonexistent path', async () => {
  const res = await request(app)
    .get('/api/pages/resolve?path=nonexistent/path/here')
    .set('Authorization', bearer);
  expect(res.status).toBe(404);
  expect(res.body.error).toBe('Page not found');
});

test('GET /api/pages/resolve returns 400 without path param', async () => {
  const res = await request(app)
    .get('/api/pages/resolve')
    .set('Authorization', bearer);
  expect(res.status).toBe(400);
});

// ── Version endpoint tests ───────────────────────────────

test('GET /api/pages/:id/versions returns version list', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Authorization', bearer)
    .send({ section_id: sectionId, title: 'Version List Test', slug: 'version-list-test', content: '# V1' });
  const pageId = create.body.id;

  const res = await request(app)
    .get(`/api/pages/${pageId}/versions`)
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThanOrEqual(1);
});

test('GET /api/pages/:id/versions/:versionId returns version with content', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Authorization', bearer)
    .send({ section_id: sectionId, title: 'Version Content Test', slug: 'version-content-test', content: '# Version Content' });
  const pageId = create.body.id;

  // Get version list to find the version ID
  const listRes = await request(app)
    .get(`/api/pages/${pageId}/versions`)
    .set('Authorization', bearer);
  const versionId = listRes.body[0].id;

  const res = await request(app)
    .get(`/api/pages/${pageId}/versions/${versionId}`)
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(res.body.content).toBeDefined();
  expect(Number(res.body.page_id)).toBe(pageId);
});

test('GET /api/pages/:id/versions/:versionId returns 404 for nonexistent version', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Authorization', bearer)
    .send({ section_id: sectionId, title: 'Version 404 Test', slug: 'version-404-test', content: '# Test' });

  const res = await request(app)
    .get(`/api/pages/${create.body.id}/versions/999999`)
    .set('Authorization', bearer);
  expect(res.status).toBe(404);
  expect(res.body.error).toBe('Version not found');
});

test('POST /api/pages/:id/versions/:versionId/restore restores content', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Authorization', bearer)
    .send({ section_id: sectionId, title: 'Restore Test', slug: 'restore-test', content: '# Original' });
  const pageId = create.body.id;

  // Update content to create a second version
  await request(app)
    .patch(`/api/pages/${pageId}`)
    .set('Authorization', bearer)
    .send({ content: '# Updated' });

  // Get the first version (oldest)
  const listRes = await request(app)
    .get(`/api/pages/${pageId}/versions`)
    .set('Authorization', bearer);
  const oldestVersion = listRes.body[listRes.body.length - 1];

  // Restore it
  const res = await request(app)
    .post(`/api/pages/${pageId}/versions/${oldestVersion.id}/restore`)
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
});

test('GET /api/pages/resolve returns page for valid slug', async () => {
  // Create a page to resolve
  const create = await request(app)
    .post('/api/pages')
    .set('Authorization', bearer)
    .send({ section_id: sectionId, title: 'Resolve Test', slug: 'resolve-test', content: '# Resolve' });

  const res = await request(app)
    .get('/api/pages/resolve?path=resolve-test')
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(res.body.id).toBe(create.body.id);
});
