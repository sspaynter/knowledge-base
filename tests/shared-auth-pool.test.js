// Tests for shared auth pool configuration (#207 — re-login quick fix)
'use strict';

// Reset module cache so we get fresh pool config
beforeEach(() => {
  jest.resetModules();
});

test('sharedAuthPool max connections is at least 10', () => {
  const { getSharedAuthPool } = require('../services/shared-auth');
  const pool = getSharedAuthPool();
  expect(pool.options.max).toBeGreaterThanOrEqual(10);
});

test('sharedAuthPool connectionTimeoutMillis is at least 10000', () => {
  const { getSharedAuthPool } = require('../services/shared-auth');
  const pool = getSharedAuthPool();
  expect(pool.options.connectionTimeoutMillis).toBeGreaterThanOrEqual(10000);
});
