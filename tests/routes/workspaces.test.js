// tests/routes/workspaces.test.js
// Auth via Bearer API token.

'use strict';

const request = require('supertest');
const app  = require('../../server');
const auth = require('../../services/auth');

let bearer;

beforeAll(async () => {
  const token = await auth.createApiToken('workspace-test');
  bearer = `Bearer ${token.plaintext}`;
});

test('GET /api/workspaces returns array', async () => {
  const res = await request(app)
    .get('/api/workspaces')
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('GET /api/workspaces returns seeded workspaces', async () => {
  const res = await request(app)
    .get('/api/workspaces')
    .set('Authorization', bearer);
  expect(res.body.length).toBeGreaterThanOrEqual(4);
  const slugs = res.body.map(w => w.slug);
  expect(slugs).toContain('operations');
  expect(slugs).toContain('products');
  expect(slugs).toContain('personal');
});

test('GET /api/workspaces requires auth', async () => {
  const res = await request(app).get('/api/workspaces');
  expect(res.status).toBe(401);
});

test('GET /api/workspaces/:id/sections returns sections', async () => {
  const wsRes = await request(app)
    .get('/api/workspaces')
    .set('Authorization', bearer);
  const opsWs = wsRes.body.find(w => w.slug === 'operations');

  const res = await request(app)
    .get(`/api/workspaces/${opsWs.id}/sections`)
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  const slugs = res.body.map(s => s.slug);
  expect(slugs).toContain('infrastructure');
});
