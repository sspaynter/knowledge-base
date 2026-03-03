// tests/routes/sync.test.js
// Tests for POST /api/sync
// Auth via Bearer API token (always editor role).
// Note: VAULT_DIR is not configured in test env, so all file lookups return 404.
// Role-based rejection (viewer) is covered in middleware.test.js.

'use strict';

const request = require('supertest');
const app  = require('../../server');
const auth = require('../../services/auth');

let bearer;

beforeAll(async () => {
  const token = await auth.createApiToken('sync-test');
  bearer = `Bearer ${token.plaintext}`;
});

test('POST /api/sync requires auth', async () => {
  const res = await request(app)
    .post('/api/sync')
    .send({ file_path: 'some/file.md' });
  expect(res.status).toBe(401);
});

test('POST /api/sync without file_path returns 400', async () => {
  const res = await request(app)
    .post('/api/sync')
    .set('Authorization', bearer)
    .send({});
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/file_path/i);
});

test('POST /api/sync with non-existent file returns 404', async () => {
  // VAULT_DIR not configured in test env — syncFile returns null → 404
  const res = await request(app)
    .post('/api/sync')
    .set('Authorization', bearer)
    .send({ file_path: 'personal/job-search/nonexistent.md' });
  expect(res.status).toBe(404);
});
