// tests/routes/assets.test.js
// Auth via Bearer API token.

'use strict';

const request = require('supertest');
const app  = require('../../server');
const auth = require('../../services/auth');

let bearer;

beforeAll(async () => {
  const token = await auth.createApiToken('assets-test');
  bearer = `Bearer ${token.plaintext}`;
});

test('GET /api/assets returns array', async () => {
  const res = await request(app)
    .get('/api/assets')
    .set('Authorization', bearer);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /api/assets creates an asset', async () => {
  const res = await request(app)
    .post('/api/assets')
    .set('Authorization', bearer)
    .send({ type: 'config', title: 'Test Config', content: '{}' });
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Test Config');
  expect(res.body.type).toBe('config');
});

test('PATCH /api/assets/:id creates a version snapshot', async () => {
  const create = await request(app)
    .post('/api/assets')
    .set('Authorization', bearer)
    .send({ type: 'decision', title: 'Versioned Asset', content: 'v1' });

  const res = await request(app)
    .patch(`/api/assets/${create.body.id}`)
    .set('Authorization', bearer)
    .send({ content: 'v2 updated' });
  expect(res.status).toBe(200);
});
