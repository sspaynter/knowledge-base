# Knowledge Platform — Security Hardening

**Created:** 2026-03-04
**Source:** Security audit conducted in job-app session (cross-project)
**Related:** `vault/operations/infrastructure/security-checklist.md`

---

## Context

A full security audit of the Knowledge Base v2.0.0 was conducted on 2026-03-04. The app has a strong security posture overall — two-layer auth (Cloudflare Access + app-level Google OAuth), all API endpoints authenticated, no direct vault access, database isolated on Docker NAT.

Three items were identified for hardening. One is actionable (uploads), two are code hygiene.

---

## Item 1: Authenticated Upload Serving (Priority)

### Problem

The `/uploads` route is served as unauthenticated static files:

```js
// server.js — current
app.use('/uploads', express.static(UPLOAD_DIR));
```

Anyone with a direct URL to an uploaded file can access it without authentication. Filenames are timestamped random strings (`1709123456789-847392847.jpg`) so they are not enumerable or guessable, but if a URL were ever shared or leaked, the file would be accessible.

For a personal knowledge base that may contain sensitive documents, diagrams, and screenshots, this is not acceptable.

### Remediation

Replace the static route with an authenticated endpoint that checks session or bearer token before serving the file.

```js
// server.js — target
app.use('/uploads', requireAuth, express.static(UPLOAD_DIR));
```

Or, for more control, replace with an explicit route:

```js
app.get('/uploads/:filename', requireAuth, (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  // Prevent path traversal
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.sendFile(filePath);
});
```

### Impact

- Service worker cache for offline images will still work (requests include session cookie)
- Markdown image rendering in the SPA will still work (same-origin, authenticated session)
- Any external hotlinks to upload URLs will break (desired behaviour)
- The Dockerfile HEALTHCHECK does not use `/uploads` — no impact

### Tests needed

- Unauthenticated GET to `/uploads/{filename}` returns 401
- Authenticated GET to `/uploads/{filename}` returns the file
- Path traversal attempt (`/uploads/../server.js`) returns 403
- Service worker offline cache still serves previously-viewed images

---

## Item 2: Remove Hardcoded Fallback DB Credentials

### Problem

`nocodb:nocodb2026` appears as a fallback connection string in `services/database.js` and `services/shared-auth.js`. These are not the active production credentials (the `kb_app` user is used), but the superuser credentials should not be in source code.

### Remediation

Remove the fallback. Throw on missing `DATABASE_URL` instead (the server already throws on missing `SESSION_SECRET` — apply the same pattern).

```js
// Before
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://nocodb:nocodb2026@...';

// After
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}
const DATABASE_URL = process.env.DATABASE_URL;
```

---

## Item 3: COOKIE_DOMAIN Default

### Problem

`COOKIE_DOMAIN` defaults to `undefined` if the env var is not set. In production, this means the cookie is scoped to the specific hostname rather than `.ss-42.com`, silently breaking SSO across subdomains.

### Remediation

Already covered by the security checklist item: "COOKIE_DOMAIN env var is set to `.ss-42.com` in staging/production containers". Consider adding a startup warning if `NODE_ENV=production` and `COOKIE_DOMAIN` is unset.

---

## Pickup Prompt

Use this prompt to start a KB session that implements these three items:

> **Continue Knowledge Base — Security Hardening (TODO #33).**
>
> State as of session 38:
> - Branch: `dev` — 88 tests passing
> - Production: `https://kb.ss-42.com` (v2.0.0)
> - Staging: `https://kb-staging.ss-42.com`
> - Remediation doc: `docs/knowledge-base/kp-security-hardening.md` — three items with exact code changes and test cases
> - Security checklist: `vault/operations/infrastructure/security-checklist.md` — new "Static File Serving" section
> - Feature status: `vault/products/knowledge-base/kp-feature-status.md` — security note on uploads row
>
> Three hardening items to implement:
>
> 1. **Authenticated uploads (priority)** — Replace `app.use('/uploads', express.static(UPLOAD_DIR))` with an authenticated route. Add `requireAuth` middleware in front, or replace with an explicit `app.get('/uploads/:filename', requireAuth, ...)` route with path traversal protection. Four tests needed: unauthenticated returns 401, authenticated returns file, path traversal returns 403, service worker offline cache still works.
>
> 2. **Remove hardcoded DB fallback credentials** — In `services/database.js` and `services/shared-auth.js`, replace the `|| 'postgresql://nocodb:nocodb2026@...'` fallback with a throw on missing `DATABASE_URL` (same pattern as `SESSION_SECRET`).
>
> 3. **COOKIE_DOMAIN startup warning** — Add a startup warning if `NODE_ENV=production` and `COOKIE_DOMAIN` is not set.
>
> After implementing, update tests (target: 88 + new upload auth tests), push to `dev`, verify on staging, then deploy to production if clean.
>
> At session end: update `kp-feature-status.md` in the vault. Update `session-log.md`. Check skills for gaps.

---

## Audit Summary (for reference)

| Area | Status |
|---|---|
| Authentication (Google OAuth + allowlist) | Solid |
| Cloudflare Access (edge layer) | Active — not verified by app code (belt-and-suspenders) |
| API endpoints | 100% require auth (except /api/health and /auth/* login flow) |
| Vault file access | Not exposed — no static vault route |
| Uploaded files | **Unauthenticated** — needs remediation |
| Database | Not externally reachable (Docker NAT) |
| Security headers (Helmet) | Good — CSP active, frameAncestors none, no unsafe-eval |
| Rate limiting | Active — 100/min API, 20/15min auth |
| SQL injection | Protected — parameterised queries throughout |
| XSS | Protected — no innerHTML, DOMPurify on markdown |
| Hardcoded credentials | Code smell — fallback DB credentials in two files |
| Service worker | Acceptable — caches API GETs for offline, same-origin only |
