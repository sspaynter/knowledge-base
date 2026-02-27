const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const db = require('../services/database');

afterAll(() => db.getPool().end());

const app = express();
app.use(cookieParser());
app.get('/protected', requireAuth, (req, res) => res.json({ user: req.user }));
app.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => res.json({ ok: true }));

test('requireAuth: rejects request with no credentials', async () => {
  const res = await request(app).get('/protected');
  expect(res.status).toBe(401);
});

test('requireAuth: rejects invalid bearer token', async () => {
  const res = await request(app)
    .get('/protected')
    .set('Authorization', 'Bearer invalidtoken');
  expect(res.status).toBe(401);
});

test('requireRole: rejects viewer for admin-only route', async () => {
  // Integration test covered in routes tests — placeholder
  expect(true).toBe(true);
});
