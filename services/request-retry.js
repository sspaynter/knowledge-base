// services/request-retry.js
// Retry logic for API requests — extracted so it can be tested server-side
// and used by the browser API client.
// #207: retry once on transient 401 when user was previously authenticated.
'use strict';

/**
 * Creates a request function with retry-on-401 logic.
 * @param {Function} fetchFn - fetch implementation (real fetch or mock)
 * @param {Object} opts
 * @param {boolean} opts.wasAuthenticated - whether the user has a known session
 * @returns {Function} request(method, path, body?) → Promise<object|null>
 */
function createRequestWithRetry(fetchFn, opts = {}) {
  const { wasAuthenticated = false } = opts;

  return async function request(method, path, body = null) {
    const fetchOpts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };
    if (body !== null) fetchOpts.body = JSON.stringify(body);

    let res = await fetchFn(path, fetchOpts);

    // Retry once on 401 if the user was previously authenticated
    // (transient pool exhaustion, not a real logout)
    if (res.status === 401 && wasAuthenticated) {
      res = await fetchFn(path, fetchOpts);
    }

    if (res.status === 401) {
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  };
}

module.exports = { createRequestWithRetry };
