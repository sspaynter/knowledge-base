# Applyr — Feature Status (As-Built)

**Type:** Reference page
**Workspace:** IT & Projects
**Section:** Applyr
**Status:** Active — updated each build session
**Created:** 2026-03-03
**Updated:** 2026-03-03 (after Phase 3b, session 32)
**Author:** Simon Paynter + Claude

---

## Purpose

This page tracks what is actually running in the app, not what was originally planned. It is the delta between the design spec and the as-built state. Updated at the end of each build session.

Design spec: `applyr/docs/plans/2026-02-27-applyr-design.md`
Implementation plan: `applyr/docs/plans/2026-03-02-applyr-implementation-plan.md`

---

## Feature status by area

### Job tracking

| Feature | Status | Notes |
|---|---|---|
| Job list (pipeline view) | Live | Three display modes: kanban, list, table. Sort and filter working |
| Job detail — Overview tab | Live | Key details, score breakdown, notes (auto-save), status transitions, URL link |
| Job detail — Research tab | Live | All 7 sections rendered. Lucide icons. Generate + regenerate buttons. User notes auto-save |
| Job detail — Cover Letter tab | Live | Version selector, inline annotation (text select → feedback popup), general feedback, rewrite, approve |
| Job detail — Resume tab | Stub | Disabled tab — Phase 4 |
| Job detail — Application tab | Stub | Disabled tab — Phase 4 |
| Status lifecycle (11 states) | Live | Full transition matrix enforced on both backend and frontend |
| Job delete | Live | Backend only — no UI (intentional, data protection) |

### Review queue

| Feature | Status | Notes |
|---|---|---|
| List mode | Live | Card grid. Filter by track (product/IT). Score and verdict chips |
| Detail mode | Live | Three-panel: job list (left), description (centre), decision panel (right) |
| Keyboard shortcuts | Live | j/k nav, y interested, n skip, e expand/collapse |
| Context panel | Live | Collapsible right panel with job score + key details |
| Archive view | Live | Filterable list with Reconsider button (returns to "new") |
| Sidebar badge | Live | Count of "new" jobs, updates on app load |
| Background AI trigger | Live | When job marked "interested": research + CL generated in background, notification on completion |

### AI features

| Feature | Status | Notes |
|---|---|---|
| Company research | Live | 7-section structured output via Claude Sonnet. Upserted per job |
| Cover letter generation | Live | v1 from job + research + profile. Versioned |
| Cover letter rewrite | Live | Compiled inline highlights + general feedback → new version |
| Resume tailoring | Not built | Phase 4 |
| Application Q&A | Not built | Phase 4 |
| Per-user API keys | Live | Stored in user_settings.anthropic_api_key |
| API key UI | Live | Settings page — enter, save, remove. Masked display (last 4 chars) |

### Authentication and access

| Feature | Status | Notes |
|---|---|---|
| Google OAuth sign-in | Live | Passport.js, shared_auth schema |
| Invite-only gating | Live | allowed_emails table, seeded with paynter.simon@gmail.com |
| SSO across SS42 apps | Live | `.ss-42.com` cookie — signing into Applyr also authenticates KB and vice versa |
| Session persistence | Live | connect-pg-simple, shared_auth.sessions |

### Settings

| Feature | Status | Notes |
|---|---|---|
| Anthropic API key management | Live | GET shows key hint, PATCH upserts. sk-ant- prefix validation on frontend |
| Notification preferences | Not built | Column exists in user_settings, no UI |
| Timezone | Not built | Column exists, defaults to Australia/Melbourne |
| Company blacklist/whitelist | Not built | Columns exist, no UI |

### Infrastructure

| Feature | Status | Notes |
|---|---|---|
| Staging deployment | Live | applyr-staging container, Watchtower auto-deploy on push to dev |
| CI/CD pipeline | Live | GitHub Actions → GHCR → Watchtower |
| Production deployment | Not started | Container not yet created. Will use `ghcr.io/sspaynter/applyr:latest` on push to main |
| Favicon | Live | Inline SVG data URI (indigo rounded square, white A) |
| App rail (SS42 switcher) | Not built | Phase 5 |
| Home dashboard | Not built | Phase 5 |
| Metrics | Not built | Phase 5 |
| Interview prep tab | Not built | Phase 5 |

---

## Decisions that differ from the design spec

These are things where what was built diverged from what was originally designed. Recorded here so the design spec is not treated as the source of truth.

| Decision | Design spec said | What was built | Reason |
|---|---|---|---|
| Settings page | Phase 6 deliverable | Built in Phase 3b (session 32) | Blocked: API key required SSH to insert. Unblocked for multi-user use |
| Cover letter storage | Versioned, mutable status | Immutable versions — each rewrite creates new row, v1 never mutated | Simpler, preserves history |
| Research content schema | Not fully specified | `{overview, key_facts, tech_stack, culture_signals, news, competitors, interview_angles}` — news has `{headline, summary}`, competitors is `[string]` (not objects) | Prompt output-driven |
| Shared auth | Applyr-only auth | `shared_auth` schema shared with KB and ToDo | SSO was more valuable than isolation |
| Databases | Single database, schema per environment | Separate databases per environment (`applyr_staging` / `applyr`) | Cleaner isolation, avoids accidental cross-environment queries |
| Background AI trigger | Explicit "generate" button only | Also triggered automatically when job marked interested (fire-and-forget) | Better UX — research ready when user navigates to job |
| Cover letter inline feedback | Described in prototype | Fully ported — text selection popup → comment card → compiled into rewrite prompt | Prototype design confirmed during build |
| No innerHTML | Not in design spec | Hard constraint added during security hardening (Phase 2) | Security — enforced by Claude Code hook |

---

## Session build log

| Session | Phase | Key deliverables |
|---|---|---|
| 25 | 1 | Project scaffold, Express server, 15-table schema, Google OAuth, Jobs API, Pipeline API, frontend SPA, NocoDB migration (96 jobs + 4 CLs), CI/CD, staging deployed |
| 26 | 1b | Security hardening (6 fixes), 75 tests, server/app.js extracted, shared_auth schema created, SSO Phase 1 |
| 27 | — | Session secret rotated, Google client secret rotated, OAuth state validation, auth rate limiter split, hardcoded credentials removed |
| 29 | 2 | Review queue (list + detail modes), archive, keyboard shortcuts j/k/y/n/e, context panel, archive sidebar item, sidebar badge |
| 30 | 3 | AI service wrapper, research service, cover letter service, all backend APIs, Research tab, Cover Letter tab, background AI trigger, notifications |
| 30b | 3 | Anthropic API key stored in DB, CL font fixed, inline annotation (text selection → highlight → compiled feedback) ported from prototype |
| 32 | 3b | Research UI: news + competitors sections added (were missing), Lucide icons on all headings, CSS classes from prototype. Settings page: GET/PATCH /api/v1/settings, API key UI. Favicon added. 139 tests. |

---

## What still needs doing before production

1. **Phase 4:** Resume upload and tailoring (multer, Claude extraction, ATS scoring), application Q&A, applied state export
2. **Phase 5:** Home page, metrics dashboard, app rail
3. **Phase 6:** Production container created, merge dev → main, GitHub release, CHANGELOG, production DB migration (shared_auth), full test coverage review
