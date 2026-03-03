const auth = require('../services/auth');
const db = require('../services/database');

// Pool closed by forceExit in jest.config.js

// Clean up test users between runs
beforeEach(async () => {
  await db.getPool().query(
    "DELETE FROM knowledge_base.users WHERE username LIKE 'testuser_%'"
  );
});

test('createUser: first user is admin', async () => {
  // Clear all users first
  await db.getPool().query('DELETE FROM knowledge_base.users');
  const user = await auth.createUser({
    username: 'testuser_admin',
    password: 'password123',
    displayName: 'Test Admin'
  });
  expect(user.role).toBe('admin');
});

test('createUser: subsequent users are viewers', async () => {
  // Ensure at least one user exists
  await auth.createUser({
    username: 'testuser_first',
    password: 'password123',
    displayName: 'First'
  });
  const user = await auth.createUser({
    username: 'testuser_second',
    password: 'password123',
    displayName: 'Second'
  });
  expect(user.role).toBe('viewer');
});

test('createSession: returns a token', async () => {
  const user = await auth.createUser({
    username: 'testuser_session',
    password: 'pass',
    displayName: 'Session Test'
  });
  const session = await auth.createSession(user.id);
  expect(session.token).toBeDefined();
  expect(session.token.length).toBeGreaterThan(20);
});

test('validateSession: returns user for valid token', async () => {
  const user = await auth.createUser({
    username: 'testuser_validate',
    password: 'pass',
    displayName: 'Validate Test'
  });
  const session = await auth.createSession(user.id);
  const result = await auth.validateSession(session.token);
  expect(result).not.toBeNull();
  expect(result.username).toBe('testuser_validate');
});

test('createApiToken: hashes the token', async () => {
  const result = await auth.createApiToken('Test token');
  expect(result.plaintext).toBeDefined();
  expect(result.id).toBeDefined();
  // Plain token should not be stored in DB
  const row = await db.getPool().query(
    'SELECT token_hash FROM knowledge_base.api_tokens WHERE id = $1',
    [result.id]
  );
  expect(row.rows[0].token_hash).not.toBe(result.plaintext);
});

test('validateApiToken: accepts correct token', async () => {
  const result = await auth.createApiToken('Validate token test');
  const valid = await auth.validateApiToken(result.plaintext);
  expect(valid).toBe(true);
});
