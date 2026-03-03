// tests/routes/search.test.js
// Tests for GET /api/search
// Auth via Bearer API token (requireAuth does not use custom session cookies).

'use strict';

const request = require('supertest');
const app  = require('../../server');
const auth = require('../../services/auth');
const db   = require('../../services/database');

let bearer;

beforeAll(async () => {
  const token = await auth.createApiToken('search-test');
  bearer = `Bearer ${token.plaintext}`;
});

test('GET /api/search requires auth', async () => {
  const res = await request(app).get('/api/search?q=hello');
  expect(res.status).toBe(401);
});

test('GET /api/search without q returns 400', async () => {
  const res = await request(app)
    .get('/api/search')
    .set('Authorization', bearer);
  expect(res.status).toBe(400);
});

test('GET /api/search with q shorter than 2 chars returns 400', async () => {
  const res = await request(app)
    .get('/api/search?q=a')
    .set('Authorization', bearer);
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/2 character/i);
});

test('GET /api/search returns structured result', async () => {
  const res = await request(app)
    .get('/api/search?q=overview')
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('query', 'overview');
  expect(Array.isArray(res.body.pages)).toBe(true);
  expect(Array.isArray(res.body.assets)).toBe(true);
  expect(typeof res.body.total).toBe('number');
});

test('GET /api/search with type filter passes without error', async () => {
  const res = await request(app)
    .get('/api/search?q=test&type=config')
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.assets)).toBe(true);
});
