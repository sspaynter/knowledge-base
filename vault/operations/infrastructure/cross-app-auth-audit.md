# Cross-App Authentication Audit

> Last updated: 2026-03-03
> Status: Phase 2 complete. Applyr and KB both migrated to shared Google OAuth SSO via shared_auth schema. KB username/password login removed, replaced with Google sign-in button. API token auth unchanged. See [architecture doc](cross-app-auth-architecture.md) for details.

## Purpose

This document captures the authentication implementation across all three SS42 web apps. It serves as the baseline for deciding how to unify auth and enable single sign-on.

---

## Current State by App

### Applyr (Job Tracker)

| Dimension | Implementation |
|---|---|
| Auth method | Google OAuth 2.0 via Passport.js |
| Session store | PostgreSQL (`sessions` table, auto-created by connect-pg-simple) |
| Session transport | HttpOnly cookie (`connect.sid`), 30-day expiry, secure in prod, sameSite: lax |
| User gate | `allowed_emails` table — invite-only. Not in table = 403 denied. |
| User creation | Auto on first Google login (if email is in `allowed_emails`) |
| User deactivation | `is_active = false` on `users` row — checked on every request deserialize |
| Role model | Single-user for now. Multi-user schema in place (all tables have `user_id` FK). |
| Password | None — Google handles identity |
| API tokens | None |
| Database | PostgreSQL (`applyr_staging` / `applyr` on `n8n-postgres`) |
| Key files | `server/auth.js`, `server/routes/auth.js`, `server/middleware/requireUser.js` |
| Google OAuth client | `709232597737-...34f` (project: `cloudflare-access-488710`) |

**Security strengths:**
- No passwords to leak
- Server-side sessions only (no JWT, no client-side tokens)
- Invite-only gate prevents unauthorized registration
- `trust proxy` set correctly for Cloudflare Tunnel
- No innerHTML (DOM APIs only, enforced by hook)

**Gaps (remaining):**
- No CSRF token on logout (relies on sameSite: lax)

**Gaps (fixed 2026-03-03):**
- ~~No rate limiting on `/auth/google`~~ — OAuth routes have strict 20/15min limit; /me and /logout have generous 200/15min
- ~~Dev environment uses hardcoded session secret~~ — server throws on startup if SESSION_SECRET missing in ANY environment
- ~~No session secret fallback~~ — removed `|| 'dev-only-not-for-production'` from config
- ~~No OAuth state parameter~~ — `state: true` in GoogleStrategy constructor (prevents login CSRF)
- ~~Google OAuth client secret not rotated~~ — rotated, stored in `/share/Container/shared-secrets.env`
- ~~No null guard on profile.emails~~ — optional chaining + no_email failure message
- ~~Hardcoded credentials in docker-compose.yml~~ — replaced with `${ENV_VAR}` references
- ~~Session secret not rotated~~ — rotated to 128-char hex, stored in `/share/Container/shared-secrets.env`
- Auth tables now in `shared_auth` schema (cookie domain `.ss-42.com` for SSO)

---

### Knowledge Base

| Dimension | Implementation |
|---|---|
| Auth method | Google OAuth 2.0 via Passport.js (shared with Applyr) |
| Session store | PostgreSQL (`shared_auth.sessions` table in `applyr_staging` DB, connect-pg-simple) |
| Session transport | HttpOnly cookie (`connect.sid`), 30-day expiry, secure in prod, sameSite: lax, domain `.ss-42.com` |
| User gate | `shared_auth.allowed_emails` table — invite-only, shared across all SS42 apps |
| User creation | Auto on first Google login (if email is in `shared_auth.allowed_emails`). KB user row auto-created with `viewer` role. |
| User deactivation | `is_active = false` on `shared_auth.users` row — checked on every session deserialize |
| Role model | `admin` / `editor` / `viewer` — KB-specific roles on `knowledge_base.users` table, mapped by email |
| Password | None — Google handles identity. `password_hash` column nullable for backward compat. |
| API tokens | Yes — `knowledge_base.api_tokens` table. Bearer token auth. Plaintext shown once, bcrypt-hashed in DB. Hardcoded to `editor` role. Unchanged from v1. |
| Database | PostgreSQL (`knowledge_base` schema on `n8n-postgres` for app data, `shared_auth` schema in `applyr_staging` for auth) |
| Key files | `services/shared-auth.js`, `services/auth.js`, `middleware/requireAuth.js`, `routes/auth.js` |
| Google OAuth client | `709232597737-...34f` (project: `cloudflare-access-488710`, shared with Applyr) |

**Security strengths:**
- No passwords to leak (Google handles identity)
- Server-side sessions only (no JWT, no client-side tokens)
- Shared invite-only gate via `allowed_emails` table
- `trust proxy` set correctly for Cloudflare Tunnel
- OAuth `state` parameter enabled (prevents login CSRF)
- `saveUninitialized: false` (prevents session fixation)
- Helmet with CSP (defaultSrc self, no unsafe-eval, frameAncestors none)
- Rate limiting: strict 20/15min on OAuth routes, 100/min global on API
- API tokens hashed in DB (plaintext never stored)
- Logout calls both `req.logout()` and `req.session.destroy()`
- No innerHTML (DOM APIs only)

**Gaps:**
- Per-workspace roles deferred to v3
- CSRF token on logout not implemented (relies on sameSite: lax)

---

### Lifeboard / ToDo (Current v3.2)

| Dimension | Implementation |
|---|---|
| Auth method | Username + password (bcryptjs, 10 rounds) |
| Session store | SQLite (`sessions` table, custom implementation) |
| Session transport | HttpOnly cookie (`session`), 30-day expiry |
| User gate | Open registration (first user becomes admin) |
| User creation | Self-registration |
| Role model | `admin` / `user` + board-scoped `board_members` |
| Password | bcryptjs hash |
| API tokens | None in current v3.2 |
| Database | SQLite |
| Key files | `services/auth.js`, `middleware/requireAuth.js`, `routes/auth.js` |

**Note:** The ToDo redesign (in progress) has decided on session cookies + API key for Claude + bearer token for mobile capture. Google OAuth is NOT currently planned — only Google Calendar OAuth for calendar integration.

---

## Comparison Matrix

| Feature | Applyr | Knowledge Base | Lifeboard v3.2 |
|---|---|---|---|
| Google OAuth login | Yes | Yes | No |
| Username/password | No | No (removed) | Yes |
| Session in PostgreSQL | Yes (shared_auth) | Yes (shared_auth) | No (SQLite) |
| API token support | No | Yes | No |
| Role-based access | By user_id FK | admin/editor/viewer | admin/user + board scope |
| Invite-only | Yes (shared) | Yes (shared) | No |
| Shared session cookie | Yes (.ss-42.com) | Yes (.ss-42.com) | No (subdomain-scoped) |

---

## Key Observation

Applyr and Knowledge Base now share Google OAuth via the `shared_auth` schema. Lifeboard (v3.2) still uses independent username/password auth. When Lifeboard is rebuilt (ToDo), it will use the same shared auth from day one, completing SSO across all three apps.

See [Cross-App Auth Architecture](cross-app-auth-architecture.md) for the full migration plan.
