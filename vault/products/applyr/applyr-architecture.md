---
title: Applyr — Architecture
status: published
order: 20
author: both
created: 2026-03-03
updated: 2026-03-04
---

# Applyr — Architecture

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
| CI/CD | GitHub Actions → GHCR → Watchtower | `:dev` on push to `dev`, `:latest` on push to `main` |
| Hosting | QNAP NAS, Cloudflare Tunnel | Staging: `applyr-staging.ss-42.com`, Production: `jobs.ss-42.com` |

---

## Database

**Databases (separate per environment):**
- `applyr_staging` — staging + shared_auth schema (SSO session store shared with KB)
- `applyr` — production (not yet populated, container not yet created)

**Host (NAS internal):** `10.0.3.12:5432`
**Host (LAN):** `192.168.86.18:32775`

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
| `user_settings` | Per-user settings: anthropic_api_key, notification_prefs, timezone | API key UI live |
| `jobs` | Central entity. 24 columns. Status lifecycle (11 states), score, verdict, source, arrangement | Live |
| `job_scores` | AI scoring output (1:1 with jobs): dimensions jsonb, overall_rationale, model_used | Live (written by n8n pipeline) |
| `company_research` | AI research (1:1 with jobs): content jsonb (7 sections), user_notes | Live |
| `cover_letters` | Versioned drafts (1:many per job): content, status, feedback, model_used. No user_id — isolation via jobs FK | Live |
| `notifications` | In-app notifications: tier (high/medium/low), title, message, link, is_read | Live |
| `resumes` | Uploaded resume files: filename, file_path, content_text, parsed_data | Live |
| `resume_tailorings` | Per-job resume variants: changes jsonb, ats_score, resume_content, status | Live |
| `application_questions` | Q&A for application forms: question, ai_answer, user_answer | Live |
| `activity_log` | Audit trail: action, details jsonb, user_id, job_id | Live |
| `voice_profiles` | User writing voice (1:1): profile_data jsonb | Schema only — not yet used |
| `contacts` | People contacts per job | Schema only — not yet used |

Total: 15 tables across 2 schemas (3 in shared_auth + 12 in public).

**Important:** `cover_letters` has no `user_id` column. User isolation is via `jobs.user_id` through the `job_id` foreign key. All queries joining cover_letters must go through jobs for user scoping.

### Jobs status lifecycle

```
new → interested → reviewing → applying → applied → interviewing → offered → accepted
                ↘ archived                                         ↘ rejected
                                                                   ↘ withdrawn
```

Archived jobs can return to `new` or `interested`. Rejected/withdrawn can return to `interested`.

---

## Authentication

Single auth model for all SS42 apps.

| Path | Mechanism |
|---|---|
| Browser | Google OAuth → Passport.js → session cookie on `.ss-42.com` |

- **Session store:** `shared_auth.sessions` in `applyr_staging` database
- **Cookie domain:** `.ss-42.com` — shared across Applyr, KB, ToDo
- **Invite gate:** `shared_auth.allowed_emails` — only `paynter.simon@gmail.com` seeded
- **Google OAuth client:** `709232597737-...34f` (project: `cloudflare-access-488710`)
- **State validation:** `state: true` in GoogleStrategy constructor (passport-oauth2 v1.8.0)

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
| GET | `/api/v1/review` | "new" status jobs sorted by score DESC |
| POST | `/api/v1/review/:id/decide` | Mark interested or skip. If interested, fires background AI |
| GET | `/api/v1/review/count` | Count of "new" jobs (for sidebar badge) |

### Company research

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/jobs/:id/research` | Get research for job (null if none) |
| POST | `/api/v1/jobs/:id/research/generate` | Generate via Claude Sonnet. Upserts company_research |
| PATCH | `/api/v1/jobs/:id/research` | Update user_notes only |

### Cover letters

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/jobs/:id/cover-letters` | List all versions |
| GET | `/api/v1/jobs/:id/cover-letters/current` | Latest version |
| POST | `/api/v1/jobs/:id/cover-letters/generate` | Generate v1 via Claude Sonnet |
| PATCH | `/api/v1/jobs/:id/cover-letters/:version` | Update feedback or status |
| POST | `/api/v1/jobs/:id/cover-letters/:version/rewrite` | Rewrite from feedback → creates next version |

### Resume

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/resumes/upload` | Upload PDF/DOCX, parse with Haiku |
| GET | `/api/v1/jobs/:id/tailoring` | Get tailoring for job |
| POST | `/api/v1/jobs/:id/tailoring/generate` | Generate tailored resume via Sonnet |

### Application questions

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/jobs/:id/questions` | List questions for job |
| POST | `/api/v1/jobs/:id/questions` | Add question |
| POST | `/api/v1/jobs/:id/questions/:qid/generate` | AI-generate answer |
| PATCH | `/api/v1/jobs/:id/questions/:qid` | Update answer |
| DELETE | `/api/v1/jobs/:id/questions/:qid` | Delete question |

### Home

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/home` | Dashboard aggregates: review count, CLs due, interviews, stale apps, pipeline summary, recent activity |

### Metrics

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/metrics` | Dashboard: totals, response rate, by stage, by week, by track, score by outcome |
| GET | `/api/v1/metrics/activity` | Paginated activity feed (limit clamped to 100) |

### Notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/notifications` | List (supports unread filter, pagination) |
| GET | `/api/v1/notifications/unread-count` | Badge count |
| PATCH | `/api/v1/notifications/:id` | Mark read |
| POST | `/api/v1/notifications/read-all` | Mark all read |

### Search

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/search?q=` | Search jobs (company/role/notes) + cover letters (content). Min 2 chars, ILIKE |

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
| `#/home` | Home dashboard (greeting, action cards, pipeline summary, activity feed) | Live |
| `#/pipeline` | Pipeline (kanban / list / table) | Live |
| `#/review` | Review queue (list mode + detail mode) | Live |
| `#/archive` | Archive (filterable, reconsider action) | Live |
| `#/jobs/:id` | Job detail (Overview, Research, Cover Letter, Resume, Application tabs) | Live |
| `#/metrics` | Metrics dashboard (hero cards, funnel, charts, breakdowns) | Live |
| `#/settings` | Settings (API key management) | Live |
| `#/preparation` | Interview prep | Stub — Phase 6 |
| `#/help` | Help | Stub — Phase 6 |

### Key files

| File | Purpose |
|---|---|
| `public/js/app.js` | Init, auth check, route registration, sidebar render, notification + search init |
| `public/js/router.js` | Hash-based router — route(), navigate(), startRouter() |
| `public/js/api.js` | API client — all fetch calls, ApiError class |
| `public/js/views/home.js` | Home page (greeting, action cards, pipeline, activity, stale) |
| `public/js/views/pipeline.js` | Pipeline view (kanban/list/table) |
| `public/js/views/jobDetail.js` | Job detail (all 5 tabs) |
| `public/js/views/review.js` | Review queue (list + detail modes, keyboard shortcuts) |
| `public/js/views/archive.js` | Archive view |
| `public/js/views/metrics.js` | Metrics dashboard |
| `public/js/views/settings.js` | Settings page |
| `public/js/components/sidebar.js` | Sidebar nav, search + bell in header, Lucide icons, badge |
| `public/js/components/notifications.js` | Bell icon, slide-out panel, 60s polling |
| `public/js/components/search.js` | Cmd+K overlay, debounced search, grouped results |
| `public/js/components/contextPanel.js` | Collapsible right panel (review detail mode) |

### Security constraint

No `innerHTML` anywhere in the frontend. All DOM construction uses DOM APIs (`createElement`, `textContent`, `appendChild`). Enforced by a Claude Code security hook.

---

## AI services

Four backend services wrap the Anthropic SDK:

**`server/services/ai.js`** — Creates Anthropic client per request using per-user API key from `user_settings`. Logs token usage.

**`server/services/research.js`** — 7-section structured company research via Claude Sonnet. Upserts into `company_research`.

**`server/services/coverLetter.js`** — Versioned cover letter drafts. Rewrites from compiled inline highlights + general feedback. Each version is immutable.

**`server/services/tailoring.js`** — Resume tailoring via Sonnet (8192 maxTokens, max 8 changes). Produces ATS score and changes array with inline resume content.

**`server/services/notifications.js`** — Creates notifications with tier-based priority. `notifyStatusChange()` maps status transitions to notification tiers (high for interview/offer, medium for rejected, low for applied).

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

### CI/CD

1. Push to `dev` branch
2. GitHub Actions builds Docker image and pushes to `ghcr.io/sspaynter/applyr:dev`
3. Watchtower on NAS polls registry (every 5 minutes) and redeploys `applyr-staging`

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

219 tests across 16 files (as of session 42):

| File | Coverage area |
|---|---|
| `health.test.js` | Health endpoint |
| `auth.test.js` | Auth routes, session |
| `middleware.test.js` | requireUser, validation |
| `jobs.test.js` | Jobs CRUD, status transitions |
| `pipeline.test.js` | Pipeline grouping |
| `review.test.js` | Review queue, decide |
| `research.test.js` | Research generate, notes |
| `coverLetters.test.js` | CL generate, rewrite, approve |
| `resume.test.js` | Upload, tailoring, parsing |
| `questions.test.js` | Application Q&A CRUD, AI generate |
| `security.test.js` | CSP, auth isolation, param validation |
| `settings.test.js` | Settings GET/PATCH, key masking |
| `home.test.js` | Home dashboard aggregates |
| `metrics.test.js` | Metrics dashboard, activity feed |
| `notifications.test.js` | Notification CRUD, read/unread |
| `search.test.js` | Global search, ILIKE, user scoping |

Run: `npm test` from `~/Documents/Claude/applyr/`
