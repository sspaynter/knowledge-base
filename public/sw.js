// sw.js — Knowledge Base service worker
// Strategy: cache-first for static assets, network-first for API calls.
// Offline editing is NOT supported in v2.0 — read-only cache.

const CACHE_NAME = 'kb-cache-v1';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/css/styles.css',
  '/js/app.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/content.js',
  '/js/diagram-templates.js',
  '/js/editor.js',
  '/js/map.js',
  '/js/mermaid-init.js',
  '/js/search.js',
  '/js/settings.js',
  '/js/store.js',
  '/js/toast.js',
  '/js/utils.js',
  '/icons/kb-icon.svg',
  '/manifest.json',
];

// ── Install ───────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache static assets; individual failures are non-fatal
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch(() => { /* skip if unavailable */ }))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  // Network-first for API and auth routes — always try fresh data
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Cache-first for all other same-origin assets (JS, CSS, icons)
  event.respondWith(cacheFirstWithNetwork(request));
});

// Cache-first: return cached version if available; otherwise fetch and cache
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    return offlineFallback();
  }
}

// Network-first: try network; fall back to cache; fall back to offline page
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful API GET responses for offline reading
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // API unavailable and not cached — return offline JSON for API calls
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ error: 'You are offline', offline: true }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return offlineFallback();
  }
}

function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Knowledge Base — Offline</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; background: #0c0c14; color: #c8c8e8;
         display: flex; align-items: center; justify-content: center;
         min-height: 100vh; margin: 0; text-align: center; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  p  { color: #6464a0; max-width: 320px; }
</style>
</head>
<body>
  <div>
    <h1>You are offline</h1>
    <p>Pages you have visited recently are available. Connect to the internet to access other content.</p>
  </div>
</body>
</html>`,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
