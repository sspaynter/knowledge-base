# Applyr — Architecture

**Type:** Reference page
**Workspace:** IT & Projects
**Section:** Applyr
**Status:** Active
**Created:** 2026-03-03
**Updated:** 2026-03-03 (Phase 3b — Settings page, research UI)
**Author:** Simon Paynter + Claude

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 20 (Alpine Docker) | |
| Framework | Express 4 (CommonJS) | |
| Database | PostgreSQL via `pg` | `applyr_staging` / `applyr` in `n8n-postgres` container |
| Auth | Passport.js + Google OAuth 2.0 + connect-pg-simple | SSO via shared_auth schema — cookie on `.ss-42.com` |
| AI | @anthropic-ai/sdk | Per-user API keys stored in user_settings |
| Frontend | Vanilla JS ES6 modules | No bundler, no framework |
| Icons | Lucide 0.469.0 (vendored UMD) | `window.lucide.createIcons()` called after DOM mutations |
| Fonts | Plus Jakarta Sans | Google Fonts CDN |
| CI/CD | GitHub Actions → GHCR → Watchtower | `:dev` on push to `dev`, `:latest` on push to `main` (when released) |
| Hosting | QNAP NAS, Cloudflare Tunnel | Staging: `applyr-staging.ss-42.com`, Production: `jobs.ss-42.com` |

---

## Database

**Databases (separate per environment):**
- `applyr_staging` — staging + shared_auth schema (SSO session store shared with KB)
- `applyr` — production (not yet populated, container not yet created)

**Host (NAS internal):** `10.0.3.12:5432`
**Host (LAN):** `192.168.86.18:32775`
**User:** `nocodb` (owner, has CREATE privilege)
**Password:** `nocodb2026`

### Schema layout

Two schemas in use:

**`shared_auth` schema** — identity tables shared across SS42 apps (KB, Applyr, ToDo):

| Table | Purpose |
|---|---|
| `allowed_emails` | Invite gating — only listed emails can sign in |
| `users` | Identity: google_id, email, name, avatar_url, onboarding_stage |
| `sessions` | connect-pg-simple session store (browser SSO) |

**`public` schema** — Applyr-specific tables:

| Table | Purpose | Status |
|---|---|---|
| `role_tracks` | Search tracks per user (product / IT). Slug, scoring_criteria (jsonb) | Seeded at migration |
| `user_settings` | Per-user settings: anthropic_api_key, notification_prefs, timezone | API key UI live (Phase 3b) |
| `jobs` | Central entity. 25 columns. Status lifecycle (11 states), score, verdict, source, arrangement | Live |
| `job_scores` | AI scoring output (1:1 with jobs): dimensions jsonb, overall_rationale, model_used | Live (written by n8n pipeline) |
| `company_research` | AI research (1:1 with jobs): content jsonb (7 sections), user_notes | Live (Phase 3) |
| `cover_letters` | Versioned drafts (1:many per job): content, status, feedback, model_used | Live (Phase 3) |
| `notifications` | In-app notifications: tier, title, message, link, is_read | Live (created by background AI trigger) |
| `resumes` | Uploaded resume files: filename, file_path, content_text, parsed_data | Schema only — Phase 4 |
| `resume_tailorings` | Per-job resume variants: changes jsonb, ats_score, status | Schema only — Phase 4 |
| `application_questions` | Q&A for application forms | Schema only — Phase 4 |
| `voice_profiles` | User writing voice (1:1): profile_data jsonb | Schema only — not yet used |
| `contacts` | People contacts per job | Schema only — not yet used |
| `activity_log` | Audit trail of actions | Schema only — not yet written to |

Total: 15 tables across 2 schemas (3 in shared_auth + 12 in public — sessions created by connect-pg-simple automatically).

### Jobs status lifecycle

```
new → interested → reviewing → applying → applied → interviewing → offered → accepted
                ↘ archived                                         ↘ rejected
                                                                   ↘ withdrawn
```

Archived jobs can return to `new` or `interested`. Rejected/withdrawn can return to `interested`.

---

## Authentication

Single auth model for all SS42 apps. See also: [Cross-App Auth Architecture](../../infrastructure/cross-app-auth-architecture.md).

| Path | Mechanism |
|---|---|
| Browser | Google OAuth → Passport.js → session cookie on `.ss-42.com` |

- **Session store:** `shared_auth.sessions` in `applyr_staging` database
- **Cookie domain:** `.ss-42.com` — shared across Applyr, KB, ToDo
- **Invite gate:** `shared_auth.allowed_emails` — only `paynter.simon@gmail.com` seeded
- **Google OAuth client:** `709232597737-...34f` (project: `cloudflare-access-488710`)
- **State validation:** `state: true` in GoogleStrategy constructor (passport-oauth2 v1.8.0)

**Important gotcha:** Subdomain-scoped cookies from before SSO shadow the new `.ss-42.com` cookie on first login after migration. Users must clear cookies once.

---

## API surface

All routes under `/api/v1/` require authentication (`requireUser` middleware). Auth routes at `/auth/` are public.

### Auth routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | OAuth callback → creates session |
| GET | `/auth/me` | Return current user (200 or 401) |
| POST | `/auth/logout` | Destroy session |

### Jobs

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/jobs` | List jobs (query params: status, track_slug, verdict, sort, order) |
| POST | `/api/v1/jobs` | Create job |
| GET | `/api/v1/jobs/:id` | Get job (includes job_scores as `scores`) |
| PATCH | `/api/v1/jobs/:id` | Update job fields (notes, etc.) |
| PATCH | `/api/v1/jobs/:id/status` | Update job status (validates transitions) |
| DELETE | `/api/v1/jobs/:id` | Delete job |

### Pipeline

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/pipeline` | Jobs grouped by status for kanban/list/table views |

### Review queue

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/review` | "new" status jobs sorted by score DESC (for review queue) |
| POST | `/api/v1/review/:id/decide` | Mark interested or skip. If interested, fires background AI generation |
| GET | `/api/v1/review/count` | Count of "new" jobs (for sidebar badge) |

### Company research

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/jobs/:id/research` | Get research for job (null if none) |
| POST | `/api/v1/jobs/:id/research/generate` | Generate via Claude (Sonnet). Upserts company_research |
| PATCH | `/api/v1/jobs/:id/research` | Update user_notes only |

Research content schema (jsonb):
```json
{
  "overview": "string",
  "key_facts": [{"label": "string", "value": "string"}],
  "tech_stack": ["string"],
  "culture_signals": ["string"],
  "news": [{"headline": "string", "summary": "string"}],
  "competitors": ["string"],
  "interview_angles": ["string"]
}
```

### Cover letters

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/jobs/:id/cover-letters` | List all versions |
| GET | `/api/v1/jobs/:id/cover-letters/current` | Latest version |
| POST | `/api/v1/jobs/:id/cover-letters/generate` | Generate v1 via Claude (Sonnet) |
| PATCH | `/api/v1/jobs/:id/cover-letters/:version` | Update feedback or status |
| POST | `/api/v1/jobs/:id/cover-letters/:version/rewrite` | Rewrite from feedback → creates next version |

Cover letter status lifecycle: `draft → feedback → approved → sent`

### Settings

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/settings` | Return settings. API key masked (last 4 chars + `api_key_set` boolean) |
| PATCH | `/api/v1/settings` | Upsert user_settings. Accepts `anthropic_api_key` (string or null) |

### Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | `{ status: "ok", timestamp }` — no auth required |

---

## Frontend

Single-page application. Hash-based routing (`#/pipeline`, `#/jobs/:id`, etc.).

### Route map

| Hash | View | Status |
|---|---|---|
| `#/pipeline` | Pipeline (kanban / list / table) | Live |
| `#/review` | Review queue (list mode + detail mode) | Live |
| `#/archive` | Archive (filterable, reconsider action) | Live |
| `#/jobs/:id` | Job detail (Overview, Research, Cover Letter tabs) | Live |
| `#/settings` | Settings (API key management) | Live |
| `#/home` | Home dashboard | Stub — Phase 5 |
| `#/metrics` | Metrics | Stub — Phase 5 |
| `#/preparation` | Interview prep | Stub — Phase 5 |
| `#/help` | Help | Stub — Phase 6 |

### Key files

| File | Purpose |
|---|---|
| `public/js/app.js` | Init, auth check, route registration, sidebar render |
| `public/js/router.js` | Hash-based router — route(), navigate(), startRouter() |
| `public/js/api.js` | API client — all fetch calls, ApiError class |
| `public/js/views/pipeline.js` | Pipeline view (kanban/list/table) |
| `public/js/views/jobDetail.js` | Job detail (all tabs: Overview, Research, Cover Letter) |
| `public/js/views/review.js` | Review queue (list + detail modes, keyboard shortcuts) |
| `public/js/views/archive.js` | Archive view |
| `public/js/views/settings.js` | Settings page (API key input, save/remove) |
| `public/js/components/sidebar.js` | Sidebar nav, Lucide icons, badge |
| `public/js/components/contextPanel.js` | Collapsible right panel (review detail mode) |

### Security constraint

No `innerHTML` anywhere in the frontend. All DOM construction uses DOM APIs (`createElement`, `textContent`, `appendChild`). Enforced by a Claude Code security hook.

---

## AI services

Two backend services wrap the Anthropic SDK:

**`server/services/ai.js`**
- Reads `anthropic_api_key` from `user_settings` for the requesting user
- Creates Anthropic client per request (no shared instance)
- Logs token usage after each call
- Throws `ApiError` with user-facing message if no key set

**`server/services/research.js`**
- Generates 7-section structured JSON via Claude Sonnet
- Upserts into `company_research` table
- Input: job description + role + company + location

**`server/services/coverLetter.js`**
- Generates draft CLs using job description + research content + Simon's profile
- Rewrites from feedback (compiled inline highlights + general text)
- Each version is a new row in `cover_letters` (immutable — version 1 is never mutated)
- Model: Claude Sonnet

### Background trigger

When a job is marked `interested` via `POST /api/v1/review/:id/decide`:
1. Response sent immediately (non-blocking)
2. Background promise: generate research → generate CL → create notification
3. Silently skipped if no Anthropic API key set for user

---

## Infrastructure

### Containers

| Container | Port | Image | Purpose |
|---|---|---|---|
| `applyr-staging` | 8083:3000 | `ghcr.io/sspaynter/applyr:dev` | Staging (Watchtower auto-deploys on push to dev) |
| `applyr` (not yet created) | 8084:3000 | `ghcr.io/sspaynter/applyr:latest` | Production |

### Environment variables

| Variable | Value (staging) | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://nocodb:nocodb2026@10.0.3.12:5432/applyr_staging` | NAT address inside NAS network |
| `SESSION_SECRET` | 128-char hex | Stored in `/share/Container/shared-secrets.env` |
| `GOOGLE_CLIENT_ID` | `709232597737-...34f` | Rotated session 27 |
| `GOOGLE_CLIENT_SECRET` | — | Stored in `/share/Container/shared-secrets.env` |
| `GOOGLE_CALLBACK_URL` | `https://applyr-staging.ss-42.com/auth/google/callback` | |
| `COOKIE_DOMAIN` | `.ss-42.com` | Unset in dev — scopes cookie for SSO |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |

### CI/CD

1. Push to `dev` branch
2. GitHub Actions builds Docker image and pushes to `ghcr.io/sspaynter/applyr:dev`
3. Watchtower on NAS polls registry (every 5 minutes) and redeploys `applyr-staging`

### Secrets file (NAS)

`/share/Container/shared-secrets.env` — chmod 600, single source of truth for all rotated secrets. Referenced by Container Station environment config.

---

## Design system

Matches Knowledge Base v2.0 design language:

- **Accent:** `#6366f1` (indigo-500)
- **Body font:** Plus Jakarta Sans (400/500/600/700)
- **Sidebar:** Dark gradient `#0e1528 → #0a0f1e`
- **Cards:** White with `var(--shadow-sm)`, 8px radius
- **Icons:** Lucide (vendored), `createIcons()` called after each DOM mutation that adds icons
- **CSS:** Token-based (`tokens.css`), component classes (`components.css`), layout (`layout.css`)

---

## Test suite

139 tests across 10 files (as of Phase 3b):

| File | Tests | Coverage area |
|---|---|---|
| `health.test.js` | — | Health endpoint |
| `auth.test.js` | — | Auth routes, session |
| `middleware.test.js` | — | requireUser, validation |
| `jobs.test.js` | — | Jobs CRUD, status transitions |
| `pipeline.test.js` | — | Pipeline grouping |
| `review.test.js` | — | Review queue, decide |
| `research.test.js` | — | Research generate, notes |
| `coverLetters.test.js` | — | CL generate, rewrite, approve |
| `security.test.js` | — | CSP, auth isolation, param validation |
| `settings.test.js` | 8 | Settings GET/PATCH, key masking, validation |

Run: `npm test` from `~/Documents/Claude/applyr/`
