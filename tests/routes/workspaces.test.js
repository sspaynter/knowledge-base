const request = require('supertest');
const app = require('../../server');
const auth = require('../../services/auth');
const db = require('../../services/database');

let adminCookie;

beforeAll(async () => {
  // Clear and create admin user
  await db.getPool().query('DELETE FROM knowledge_base.users');
  await db.getPool().query('DELETE FROM knowledge_base.sessions');
  const user = await auth.createUser({
    username: 'admin_ws_test', password: 'pass123', displayName: 'Admin'
  });
  const session = await auth.createSession(user.id);
  adminCookie = `session=${session.token}`;
});

afterAll(() => db.getPool().end());

test('GET /api/workspaces returns array', async () => {
  const res = await request(app)
    .get('/api/workspaces')
    .set('Cookie', adminCookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('GET /api/workspaces returns seeded workspaces', async () => {
  const res = await request(app)
    .get('/api/workspaces')
    .set('Cookie', adminCookie);
  expect(res.body.length).toBeGreaterThanOrEqual(4);
  const slugs = res.body.map(w => w.slug);
  expect(slugs).toContain('it-projects');
});

test('GET /api/workspaces requires auth', async () => {
  const res = await request(app).get('/api/workspaces');
  expect(res.status).toBe(401);
});

test('GET /api/workspaces/:id/sections returns sections', async () => {
  const wsRes = await request(app)
    .get('/api/workspaces')
    .set('Cookie', adminCookie);
  const itWs = wsRes.body.find(w => w.slug === 'it-projects');

  const res = await request(app)
    .get(`/api/workspaces/${itWs.id}/sections`)
    .set('Cookie', adminCookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  const slugs = res.body.map(s => s.slug);
  expect(slugs).toContain('claude');
});
