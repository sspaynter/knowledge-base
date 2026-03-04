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
});

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
