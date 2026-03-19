// Tests for API request retry logic (#207 — re-login quick fix)
// Tests the retry behaviour: if previously authenticated and a 401 occurs,
// retry once before giving up.
'use strict';

const { createRequestWithRetry } = require('../services/request-retry');

test('succeeds on first try without retry', async () => {
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    return { ok: true, status: 200, json: async () => ({ data: 'ok' }) };
  };

  const request = createRequestWithRetry(mockFetch);
  const result = await request('GET', '/api/test');
  expect(result).toEqual({ data: 'ok' });
  expect(callCount).toBe(1);
});

test('retries once on 401 when previously authenticated', async () => {
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    if (callCount === 1) {
      return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) };
    }
    return { ok: true, status: 200, json: async () => ({ data: 'recovered' }) };
  };

  const request = createRequestWithRetry(mockFetch, { wasAuthenticated: true });
  const result = await request('GET', '/api/test');
  expect(result).toEqual({ data: 'recovered' });
  expect(callCount).toBe(2);
});

test('does not retry 401 when not previously authenticated', async () => {
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) };
  };

  const request = createRequestWithRetry(mockFetch, { wasAuthenticated: false });
  await expect(request('GET', '/api/test')).rejects.toThrow('Unauthorized');
  expect(callCount).toBe(1);
});

test('does not retry more than once on repeated 401', async () => {
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) };
  };

  const request = createRequestWithRetry(mockFetch, { wasAuthenticated: true });
  await expect(request('GET', '/api/test')).rejects.toThrow('Unauthorized');
  expect(callCount).toBe(2);
});

test('does not retry non-401 errors', async () => {
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    return { ok: false, status: 500, json: async () => ({ error: 'Server Error' }) };
  };

  const request = createRequestWithRetry(mockFetch, { wasAuthenticated: true });
  await expect(request('GET', '/api/test')).rejects.toThrow('Server Error');
  expect(callCount).toBe(1);
});

test('passes method, headers, and body correctly', async () => {
  let capturedOpts;
  const mockFetch = async (url, opts) => {
    capturedOpts = opts;
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  const request = createRequestWithRetry(mockFetch);
  await request('POST', '/api/pages', { title: 'Test' });
  expect(capturedOpts.method).toBe('POST');
  expect(capturedOpts.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(capturedOpts.body)).toEqual({ title: 'Test' });
});

test('returns null for 204 No Content', async () => {
  const mockFetch = async () => {
    return { ok: true, status: 204 };
  };

  const request = createRequestWithRetry(mockFetch);
  const result = await request('DELETE', '/api/pages/1');
  expect(result).toBeNull();
});
