const request = require('supertest');
const app = require('../../server');
const auth = require('../../services/auth');
const db = require('../../services/database');

let cookie;

beforeAll(async () => {
  await db.getPool().query('DELETE FROM knowledge_base.users');
  const user = await auth.createUser({ username: 'asset_tester', password: 'pass', displayName: 'Tester' });
  const session = await auth.createSession(user.id);
  cookie = `session=${session.token}`;
});

afterAll(() => db.getPool().end());

test('GET /api/assets returns array', async () => {
  const res = await request(app).get('/api/assets').set('Cookie', cookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /api/assets creates asset', async () => {
  const res = await request(app)
    .post('/api/assets')
    .set('Cookie', cookie)
    .send({ type: 'decision', title: 'Test Decision', content: 'We decided X' });
  expect(res.status).toBe(201);
  expect(res.body.type).toBe('decision');
});

test('PATCH /api/assets/:id creates version snapshot', async () => {
  const create = await request(app)
    .post('/api/assets')
    .set('Cookie', cookie)
    .send({ type: 'config', title: 'Config A', content: 'v1 content' });

  await request(app)
    .patch(`/api/assets/${create.body.id}`)
    .set('Cookie', cookie)
    .send({ content: 'v2 content', change_summary: 'Updated to v2' });

  const res = await request(app)
    .get(`/api/assets/${create.body.id}`)
    .set('Cookie', cookie);

  expect(res.body.content).toBe('v2 content');
  expect(res.body.versions.length).toBe(1);
  expect(res.body.versions[0].content).toBe('v1 content');
});
