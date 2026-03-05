# SS42 App Security Checklist

> Last updated: 2026-03-03
> Applies to: All SS42 web apps (Applyr, Knowledge Base, ToDo, future apps)
> Read this before deploying any app to staging or production.

---

## Authentication

- [ ] Google OAuth uses `state: true` in GoogleStrategy constructor (prevents login CSRF — must be in constructor, NOT in passport.authenticate)
- [ ] `allowed_emails` table checked BEFORE user creation (invite-only gate)
- [ ] `is_active = true` checked on every session deserialize (instant user lockout)
- [ ] Logout calls both `req.logout()` AND `req.session.destroy()` (clears session from DB)
- [ ] `saveUninitialized: false` in session config (prevents session fixation from pre-auth sessions)

## Secrets

- [ ] `SESSION_SECRET` is cryptographically random (minimum 64 hex chars)
- [ ] Server throws on startup if `SESSION_SECRET` is unset — no fallback in any environment
- [ ] `.env` file is in `.gitignore` and never committed
- [ ] No real credentials in `docker-compose.yml` — use `${ENV_VAR}` references
- [ ] Google OAuth client secret is not in source control
- [ ] All apps sharing SSO use the SAME `SESSION_SECRET` value
- [ ] No hardcoded fallback database credentials in service files — use env vars only, throw on missing

## Cookies

- [ ] `httpOnly: true` (no JavaScript access to session cookie)
- [ ] `secure: true` in production (HTTPS only)
- [ ] `sameSite: 'lax'` (CSRF protection — cannot use `strict` with OAuth redirects)
- [ ] `domain: '.ss-42.com'` in production (enables SSO across subdomains)
- [ ] Cookie domain unset in development (scoped to localhost)
- [ ] `maxAge` set explicitly (30 days for personal apps)

## Session Store

- [ ] Sessions stored in PostgreSQL `shared_auth.sessions` table (survives restarts)
- [ ] connect-pg-simple configured with `schemaName: 'shared_auth'`
- [ ] `createTableIfMissing: true` for first-boot resilience

## Rate Limiting

- [ ] Auth endpoints (`/auth/google`, `/auth/google/callback`) have strict rate limit (20/15min)
- [ ] Auth check endpoints (`/auth/me`, `/auth/logout`) have separate generous limit (200/15min)
- [ ] Global API rate limit in place (100/min or similar)
- [ ] `trust proxy` value matches actual proxy hop count (1 for Cloudflare Tunnel direct, 2 if nginx in chain)

## Headers (Helmet)

- [ ] Helmet enabled with CSP
- [ ] `defaultSrc: 'self'` — no wildcard origins
- [ ] No `unsafe-eval` in script-src
- [ ] `frameAncestors: 'none'` (prevents clickjacking)
- [ ] `objectSrc: 'none'`
- [ ] `formAction` scoped to `'self'` and OAuth provider domains only

## Database

- [ ] All SQL queries use parameterised placeholders (`$1, $2, ...`) — no string concatenation
- [ ] Sort fields validated against a whitelist before interpolation
- [ ] Every query that accesses user data includes `AND user_id = $N` (prevents IDOR)
- [ ] ID parameters validated as numeric before reaching route handlers

## Static File Serving

- [ ] Uploaded files served through an authenticated route — not as unauthenticated static files
- [ ] No `app.use('/uploads', express.static(...))` without auth middleware in front
- [ ] Vault directory has no static route — content only accessible through authenticated API endpoints
- [ ] Directory indexing disabled on all static routes

## Input and Output

- [ ] No `innerHTML` — use DOM APIs only (createElement, textContent, appendChild)
- [ ] File uploads (multer) configured with `limits.fileSize` and `fileFilter`
- [ ] Error responses return generic messages — no stack traces to client
- [ ] CORS configured with explicit origin list, `credentials: true` — never `origin: '*'`

## SSO-Specific

- [ ] Every `*.ss-42.com` subdomain receiving the shared cookie has equivalent security posture
- [ ] Before adding a new subdomain, audit it for XSS vulnerabilities
- [ ] API token auth (Bearer) is separate from session auth — API tokens do not travel in cookies
- [ ] Each app connects to `shared_auth` schema in `applyr_staging` database for auth

## Pre-Deploy Verification

- [ ] `git status` shows no `.env` or credential files staged
- [ ] `NODE_ENV` is set to `production` in the container
- [ ] `SESSION_SECRET` env var is set in the container
- [ ] `COOKIE_DOMAIN` env var is set to `.ss-42.com` in staging/production containers
- [ ] Google OAuth redirect URI registered for this app's subdomain
- [ ] Container logs are not publicly accessible (LAN only via NAS Container Station)
