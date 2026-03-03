# Cross-App Auth Architecture

> Last updated: 2026-03-03
> Status: PHASE 2 COMPLETE — KB migrated to Google OAuth SSO via shared_auth
> Depends on: [Cross-App Auth Audit](cross-app-auth-audit.md)

## Problem

Three SS42 apps (Applyr, Knowledge Base, ToDo) each have independent auth systems. Simon wants:
- Single sign-on across all apps
- One place to manage user access
- Ability to move between apps without re-authenticating
- A clear process for adding new users

---

## Recommended Approach: Shared Google OAuth + PostgreSQL Sessions

### Why Google OAuth as the standard

1. **Applyr already has it** — working, tested, deployed
2. **No passwords to manage** — no reset flows, no breach risk, no bcrypt overhead
3. **SSO via shared cookie** — one login works across all `*.ss-42.com` apps
4. **Invite-only by default** — `allowed_emails` table gates access cleanly
5. **Google identity is the common denominator** — Simon and any future users already have Google accounts

### Architecture

```
                    ┌──────────────────────────┐
                    │   Google OAuth Provider   │
                    │  (one client, multiple    │
                    │   redirect URIs)          │
                    └──────────┬───────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼──────┐ ┌────▼────┐ ┌───────▼──────┐
         │   Applyr    │ │   KB    │ │    ToDo      │
         │ jobs.ss-42  │ │kb.ss-42 │ │ todo.ss-42   │
         └──────┬──────┘ └────┬────┘ └───────┬──────┘
                │              │              │
                └──────────────┼──────────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Shared PostgreSQL   │
                    │   (n8n-postgres)      │
                    │                       │
                    │   shared_auth schema: │
                    │   - allowed_emails    │
                    │   - users             │
                    │   - sessions          │
                    │                       │
                    │   Per-app schemas:    │
                    │   - applyr.*          │
                    │   - knowledge_base.*  │
                    │   - todo.*            │
                    └──────────────────────┘
```

### Shared components

| Component | Detail |
|---|---|
| Google OAuth client | One client: `709232597737-...34f`. Add redirect URIs per app. |
| `allowed_emails` table | Single table. One row per permitted email. Gates all apps. |
| `users` table | Shared user identity. `id`, `email`, `google_id`, `name`, `avatar_url`, `is_active`. |
| `sessions` table | Shared session store. connect-pg-simple format. |
| Session secret | Stored in `/share/Container/shared-secrets.env` on NAS — must match across all apps. |
| Cookie domain | `.ss-42.com` — sent to all subdomains automatically. |
| Cookie name | `connect.sid` (Express default via connect-pg-simple). |

### Per-app components

Each app retains its own:
- **App-specific user data** — e.g., Applyr has `user_settings` and `role_tracks`, KB has roles per user, ToDo has boards per user
- **App-specific permissions** — linked to `shared_auth.users.id` via FK
- **API token support** (KB and ToDo) — stays per-app, uses Bearer auth, separate from session auth

### What each app needs to change

**Applyr:**
- Move `allowed_emails`, `users`, `sessions` to a shared schema (or shared database)
- Set cookie domain to `.ss-42.com`
- Add redirect URI for production domain
- Minimal changes — this is closest to the target already

**Knowledge Base:**
- Add Google OAuth (Passport.js + GoogleStrategy)
- Replace username/password login with Google sign-in button
- Keep API token auth (Bearer) for Claude and external tools — unchanged
- Point session store to shared `sessions` table
- Map existing KB users to shared `users` table by email
- Set cookie domain to `.ss-42.com`
- Keep `knowledge_base.user_roles` table for KB-specific roles (admin/editor/viewer)

**ToDo (new build):**
- Build with Google OAuth from the start (no username/password)
- Use shared `sessions` and `users` tables
- Set cookie domain to `.ss-42.com`
- Add API token support for Claude integration (separate from session auth)
- Keep app-specific user preferences in `todo.*` schema

---

## User Management Process

### Adding a user

```sql
-- One command, access to all apps
INSERT INTO shared_auth.allowed_emails (email) VALUES ('someone@gmail.com');
```

User visits any app, clicks "Sign in with Google," and is through the gate. User row created automatically on first login.

### Removing a user

```sql
DELETE FROM shared_auth.allowed_emails WHERE email = 'someone@gmail.com';
UPDATE shared_auth.users SET is_active = false WHERE email = 'someone@gmail.com';
```

`is_active = false` is checked on every request (Passport deserialize). All sessions across all apps are immediately invalid.

### Per-app permissions (future)

If needed, each app can have its own permissions table:

```sql
-- Example: KB-specific roles
CREATE TABLE knowledge_base.user_roles (
  user_id integer REFERENCES shared_auth.users(id),
  role varchar(20) DEFAULT 'viewer',  -- admin / editor / viewer
  PRIMARY KEY (user_id)
);
```

This is optional. For now, access to the allowed_emails table = access to all apps.

---

## SSO Flow

```
1. User visits todo.ss-42.com (not yet authenticated)
2. App calls GET /auth/me → 401
3. App shows "Sign in with Google" button
4. User clicks → redirected to Google → consents
5. Google redirects to todo.ss-42.com/auth/google/callback
6. Passport checks allowed_emails → finds user → creates/updates user row
7. Session stored in shared sessions table
8. Cookie set: connect.sid on .ss-42.com domain

9. User navigates to kb.ss-42.com
10. Browser sends the same connect.sid cookie (because domain = .ss-42.com)
11. KB app reads session from shared sessions table → finds user → authenticated
12. No login prompt. User is already in.
```

---

## Migration Path

### Phase 1: Shared schema — COMPLETE (2026-03-03)

**What was done:**
- Created `shared_auth` schema in `applyr_staging` database on `n8n-postgres`
- Moved `allowed_emails`, `users`, `sessions` tables from `public` to `shared_auth` via `ALTER TABLE SET SCHEMA`
- All 7 FK constraints from app tables (`jobs`, `user_settings`, `role_tracks`, etc.) survived the move — PostgreSQL resolves FKs by OID
- Updated all Applyr auth queries to use `shared_auth.users` and `shared_auth.allowed_emails`
- Configured connect-pg-simple with `schemaName: 'shared_auth'`
- Added `COOKIE_DOMAIN=.ss-42.com` env var to staging container
- Cookie domain set via `config.session.cookieDomain` (undefined in dev = host-scoped)
- App-specific tables remain in `public` schema with FKs pointing to `shared_auth.users(id)`
- Migration file: `server/migrations/002_shared_auth_schema.sql`

**Connection details for other apps (Phase 2+):**

| Setting | Value |
|---|---|
| Database | `applyr_staging` (staging) / `applyr` (production) |
| Host | `10.0.3.12:5432` (NAT network inside n8n-postgres) |
| User | `nocodb` |
| Password | `nocodb2026` |
| Schema | `shared_auth` |
| Tables | `allowed_emails`, `users`, `sessions` |
| Session secret | Stored in `/share/Container/shared-secrets.env` on NAS — must match across all apps |
| Cookie domain | `.ss-42.com` |
| Cookie name | `connect.sid` (Express/connect-pg-simple default) |
| PgSession config | `{ schemaName: 'shared_auth', tableName: 'sessions', createTableIfMissing: true }` |

**Decision resolved:** Shared schema in existing `applyr_staging` database (not a separate database). The `nocodb` user has CREATE privilege on this database. KB and ToDo will connect to this same database for auth queries — they can use a separate `Pool` for auth if they have their own database for app data.

### Phase 2: Add Google OAuth to KB — COMPLETE (2026-03-03)

**What was done:**
- Added Passport.js + GoogleStrategy to Knowledge Base app
- Created `services/shared-auth.js` with second pg Pool connecting to `applyr_staging` database for shared auth queries
- Configured connect-pg-simple with `schemaName: 'shared_auth'` for shared session store
- Replaced username/password login forms with "Sign in with Google" button
- Added `helmet` with CSP, `express-rate-limit` with split limits (strict on OAuth, generous on API)
- Added `state: true` on passport.authenticate (prevents login CSRF)
- Updated `requireAuth` middleware: Bearer API token path unchanged, session path now uses Passport session (req.user)
- Made `knowledge_base.users.password_hash` nullable (Google OAuth users have no password)
- Set Simon's email on existing KB user row for role mapping
- KB-specific roles remain on `knowledge_base.users` table (linked by email)
- Google OAuth callback: checks `shared_auth.allowed_emails`, upserts `shared_auth.users`, then maps to `knowledge_base.users` for KB role
- Cookie domain `.ss-42.com`, cookie name `connect.sid`, 30-day expiry
- Staging container recreated with new env vars: `SHARED_AUTH_DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `COOKIE_DOMAIN`, shared `SESSION_SECRET`
- Cloudflare tunnel route re-added for `kb-staging.ss-42.com` (version 21)
- Key files: `services/shared-auth.js`, `routes/auth.js`, `middleware/requireAuth.js`, `server.js`

**Verified (2026-03-03):**
- Redirect URI `https://kb-staging.ss-42.com/auth/google/callback` registered in Google Cloud Console
- Browser test passed: full OAuth flow on staging — Google sign-in → allowed_emails check → shared user found → KB user mapped (id: 73, role: admin) → session created
- Debug logging (`[AUTH]` prefix) still present in `routes/auth.js` and `services/shared-auth.js` — remove before production

**Remaining:**
- SSO cross-app test: login on Applyr staging, navigate to KB staging — should be auto-authenticated via shared cookie
- Production deployment: merge dev→main, recreate production container with new env vars

### Phase 3: Build ToDo with shared auth

- Scaffold ToDo with Google OAuth from day one
- Use shared `sessions`, `users`, `allowed_emails`
- No username/password needed
- Test: Full SSO across all three apps

### Phase 4: Deprecate KB username/password (optional)

- Once all KB users have Google accounts linked
- Remove password login, keep API token auth
- Simplify KB auth code

---

## Decisions Still Needed

| Decision | Options | Impact |
|---|---|---|
| ~~Shared schema vs shared database~~ | **RESOLVED:** `shared_auth` schema in `applyr_staging` database. `nocodb` user has CREATE privilege. | Phase 1 complete. |
| Per-app access control | All-or-nothing (allowed_emails = all apps) vs per-app flags on user row | All-or-nothing is simpler and sufficient for now |
| KB password deprecation timeline | Keep indefinitely vs remove after migration | Keep for now, revisit when all users have Google |
| Admin UI location | Applyr, KB, ToDo, or dedicated admin app | Whichever app Simon uses most (probably ToDo once built) |
| Cookie name collision | All apps use `connect.sid` by default — fine if shared. Problem if any app needs independent sessions. | Shared is the goal, so this is fine. |

---

## What the ToDo Design Session Needs

When resuming the ToDo design spec (Section 7 onwards), incorporate:

1. **Auth method:** Google OAuth via Passport.js — no username/password
2. **Session store:** Shared PostgreSQL `sessions` table (connect-pg-simple)
3. **User identity:** Shared `users` table, linked by `user_id` FK to app-specific data
4. **Cookie:** Domain `.ss-42.com`, HttpOnly, secure, sameSite: lax, 30-day expiry
5. **Invite gate:** Shared `allowed_emails` table
6. **API access:** Separate API token system for Claude integration (Bearer auth, not session)
7. **Google OAuth client:** Reuse existing `709232597737-...34f`, add redirect URI for `todo.ss-42.com`
8. **No password reset, no email verification, no 2FA** — Google handles all of this
9. **Dependencies:** Shared auth schema must exist before ToDo can deploy (Phase 1 above)

### npm packages for auth

```
passport
passport-google-oauth20
express-session
connect-pg-simple
```

These are already proven in Applyr. Copy the pattern, do not reinvent.

---

## References

- Applyr auth implementation: `~/Documents/Claude/applyr/server/auth.js`
- KB auth implementation: `~/Documents/Claude/knowledge-base/services/auth.js`
- Lifeboard v3.2 auth: `~/Documents/Claude/lifeboard/services/auth.js`
- Google OAuth client: Google Cloud Console → project `cloudflare-access-488710`
- Applyr design spec: `~/Documents/Claude/job-app/docs/plans/2026-02-27-applyr-design.md`
