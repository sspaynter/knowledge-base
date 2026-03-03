// tests/routes/inbox.test.js
// Tests for POST /api/inbox
// Auth via Bearer API token.

'use strict';

const request = require('supertest');
const app  = require('../../server');
const auth = require('../../services/auth');
const db   = require('../../services/database');

let bearer;

beforeAll(async () => {
  const token = await auth.createApiToken('inbox-test');
  bearer = `Bearer ${token.plaintext}`;
});

test('POST /api/inbox requires auth', async () => {
  const res = await request(app).post('/api/inbox').send({ content: 'hello' });
  expect(res.status).toBe(401);
});

test('POST /api/inbox with no body creates auto-titled page', async () => {
  const res = await request(app)
    .post('/api/inbox')
    .set('Authorization', bearer)
    .send({});
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('id');
  expect(res.body.title).toMatch(/^Inbox —/);
});

test('POST /api/inbox with title and content creates page', async () => {
  const res = await request(app)
    .post('/api/inbox')
    .set('Authorization', bearer)
    .send({ title: 'Test capture', content: '# Hello inbox' });
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Test capture');
  expect(res.body).toHaveProperty('section_id');
});

test('POST /api/inbox twice creates two distinct pages', async () => {
  const [a, b] = await Promise.all([
    request(app).post('/api/inbox').set('Authorization', bearer).send({ title: 'Alpha' }),
    request(app).post('/api/inbox').set('Authorization', bearer).send({ title: 'Beta' }),
  ]);
  expect(a.status).toBe(201);
  expect(b.status).toBe(201);
  expect(a.body.id).not.toBe(b.body.id);
});
