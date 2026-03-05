# Applyr — Feature Status (As-Built)

**Type:** Reference page
**Workspace:** IT & Projects
**Section:** Applyr
**Status:** Active — updated each build session
**Created:** 2026-03-03
**Updated:** 2026-03-05 (after Phase 5b.8-5b.9 + 5b.16, session 47)
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
| Job list (pipeline view) | Live | Three display modes: kanban, list, table. Sort and filter working. All/Product/IT filter pills in header, count subtitle, kanban dot headers (session 46) |
| Job detail — Overview tab | Live | Score Breakdown (left), Key Details + Notes + Status (right), 20px gap. Column order swapped session 46 |
| Job detail — Research tab | Live | All 7 sections rendered. Lucide icons. Generate + regenerate buttons. User notes auto-save |
| Job detail — Cover Letter tab | Live | Version selector, inline annotation (text select → feedback popup), general feedback, rewrite, approve |
| Job detail — Resume tab | Live | Track label pill + ATS pill badge (header), hint text, inline resume body with change highlights (yellow=modified, red=removed), text selection → feedback panel (mirrors CL pattern), tailoring summary card with type-badged changes, Suggested Additions section, Regenerate + Approve buttons. Body renders as plain text — structured formatting tracked as 5b.15 |
| Job detail — Back button | Live | "← Back to Pipeline" arrow-left button at top of detail view (session 47) |
| Job detail — Application tab | Live | Readiness checklist (4 items), question list, AI-generated answers, Mark as Applied flow, context panel swaps to action panel |
| Status lifecycle (11 states) | Live | Full transition matrix enforced on both backend and frontend |
| Job delete | Live | Backend only — no UI (intentional, data protection) |

### Review queue

| Feature | Status | Notes |
|---|---|---|
| List mode | Live | Vertical summary cards (flex-column, max-width 900px), colored left border per track, score badge, 2-line description preview, meta items with icons. Rebuilt session 45 |
| Detail mode | Live | Three-panel: info panel (left, 300px — score badge, title, company, meta, track pill, score breakdown bars), description (centre), decision panel (right — includes track allocation dropdown). Rebuilt session 45, track dropdown added session 46 |
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
| Resume tailoring | Live | Upload PDF/DOCX, extract with Haiku, tailor with Sonnet (8192 tokens, max 8 changes). Inline resume doc view with highlighted changes |
| Application Q&A | Live | Add questions, AI generates answers using full job context (JD + research + CL + resume) |
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

### Home + Metrics + Notifications + Search (Phase 5)

| Feature | Status | Notes |
|---|---|---|
| Home page | Live | Greeting, 3-4 action cards (review, CLs due, interviews, stale), pipeline summary, recent activity feed, stale applications section. Content-body wrapper added session 45 (spacing fix) |
| Metrics dashboard | Live | Hero cards (total, applied, response rate, avg response time), pipeline funnel, weekly chart, track comparison, score vs outcome |
| Activity log API | Live | Paginated feed at GET /api/v1/metrics/activity |
| Notification service | Live | createNotification(), notifyStatusChange() — tier-based (high/medium/low) |
| Notification API | Live | GET list, GET unread-count, PATCH read, POST read-all |
| Notification UI | Live | Bell icon in sidebar header with unread badge, slide-out panel from right, Mark All Read, click-to-navigate |
| Global search (Cmd+K) | Live | Modal overlay, 300ms debounce, searches jobs (company/role/notes) + cover letters (content), grouped results |
| Search trigger | Live | Cmd+K keyboard shortcut + search icon in sidebar header |

### Infrastructure

| Feature | Status | Notes |
|---|---|---|
| Staging deployment | Live | applyr-staging container, Watchtower auto-deploy on push to dev |
| CI/CD pipeline | Live | GitHub Actions → GHCR → Watchtower |
| Production deployment | Not started | Container not yet created. Will use `ghcr.io/sspaynter/applyr:latest` on push to main |
| Favicon | Live | Inline SVG data URI (indigo rounded square, white A) |
| App rail (SS42 switcher) | Not built | Phase 6 |
| Interview prep tab | Not built | Phase 6 |

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
| Resume tab — flat changes list | Phase 4 design | Initially built as flat changes list; rebuilt in session 41 as inline resume doc with highlights | Prototype had inline doc view but spec reference was missing from plan task — revealed process gap |
| Resume tab — ATS score display | Large 3rem standalone card | Small pill badge in header row alongside track label | Prototype spec; the large display wasted vertical space |
| Resume body formatting | Structured HTML (h2, h3, ul/li) per prototype | Plain text lines only — extraction returns "plain readable text" | Extraction prompt needs markdown output; tracked as 5b.15 |
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
| ~40a | 4 | Resume upload (multer, mammoth, Haiku parse), tailoring service (Sonnet, changes array, ATS score), resume + questions APIs, Resume tab (flat list), Application tab (readiness checklist, questions, Mark as Applied). Review queue: prev/next, sort, JD paste, notes auto-save, JD annotate + highlight. 192 tests. |
| 41 | 4+ | Fixed tailoring (fence strip, ats_score nullish, maxTokens 8192, 8-change cap). Inline resume doc view built (buildInlineResume, renderTailoringCard rewrite, content_text in API). CSS token fix (indigo→primary). Global CLAUDE.md: prototype spec references now mandatory for UI plan tasks. |
| 42 | 5 | Phase 5 complete: Home page (greeting, action cards, pipeline summary, activity feed, stale apps), Metrics dashboard (hero cards, funnel, weekly chart, track + score breakdown), Notifications (service, API, bell + badge + slide-out panel), Global search Cmd+K (overlay, debounced, jobs + CLs). 219 tests across 16 files. Prototype spec references added to all Phase 5 UI tasks. |
| 44 | Audit | Comprehensive prototype vs staging audit. 32 gaps documented (1 broken, 8 wrong layout, 14 missing, 9 polish). Phase 5b (14 remediation tasks) added to implementation plan. |
| 45 | 5b | Tasks 5b.1-5b.3: Home spacing fix (content-body wrapper), review detail left panel rebuilt (score badge, meta, score breakdown bars), review list mode reworked (vertical summary cards with colored borders). Commit efd5f58. |
| 46 | 5b | Tasks 5b.4-5b.7: Track allocation dropdown in review detail, kanban dot headers, pipeline filter pills + subtitle across all views, overview column swap. Commit f116f75. |
| 47 | 5b | Tasks 5b.8, 5b.9, 5b.16: Resume tab layout (pill ATS badge, track label, hint, tailoring summary), inline resume commenting (shared context-aware popup), back button. New task 5b.15 created (resume body formatting). Session plan expanded to 7 sessions. Commits 5347fa5, 8307bd3. |

---

## What still needs doing before production

1. **Phase 5b remediation:** 6 remaining tasks across sessions 48-51 (resume body formatting, application export, archive reconsider, topbar, sidebar logo, context panel)
2. **Phase 6:** Settings expansion (profile, tracks, AI test, email, notifications prefs, data management, system health), n8n webhook migration, responsive layout, keyboard shortcuts, help page
3. **Production deploy:** Container created, merge dev → main, GitHub release, CHANGELOG, production DB migration (shared_auth), full test coverage review
