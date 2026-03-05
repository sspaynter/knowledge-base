---
title: ToDo — Overview
order: 10
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# ToDo — Project Overview

**Formerly:** Lifeboard
**Status:** Gate 3 COMPLETE — Gate 4 pre-work COMPLETE — Gate 4 (build) next
**Replaces:** Trello
**Current deployed version:** v3.2 (Lifeboard — Kanban board, pre-redesign. Will be retired when ToDo v1 ships.)

---

## What it is

ToDo is a personal work management platform with an AI intake layer. It is the single source of truth for all of Simon's work — technical projects, personal admin, and life tasks. Ideas arrive from multiple sources (Claude sessions, mobile capture, manual entry), are processed through intake workflows, and tracked against real calendar availability.

---

## PM documentation (vault — primary reference)

| Document | Path | What it is |
|---|---|---|
| **Opportunity Backlog** | `vault/products/todo/todo-opportunity-backlog.md` | 10 problems worth solving, outcome framing, priority, traceability to failure points |
| **User Story Map** | `vault/products/todo/todo-story-map.md` | Full backbone → features → 48 v1 stories + 13 v2 stories. v1/v2 cut line. Traceability to feature area docs. |
| **Feature area — Today** | `vault/products/todo/feature-areas/today.md` | Stories S-T01–T08, ACs, AI risk assessment, screen states, prototype reference, v2 backlog |
| **Feature area — Inbox** | `vault/products/todo/feature-areas/inbox.md` | Stories S-C01–C05, S-I01–I11. Pending Review tab, Raw Capture tab, Slack auto-ingest, AI processing, inline annotation |
| **Feature area — Projects** | `vault/products/todo/feature-areas/projects.md` | Stories S-M01–M05 (board), S-P05–P09 (backlog pipeline), S-R01–R02 (review). Onboarding included. |
| **Feature area — All Tasks** | `vault/products/todo/feature-areas/all-tasks.md` | Stories S-M11–M12 (v1), S-M13 (v2). Cross-project grouped view, filter chips |
| **Feature area — Personal** | `vault/products/todo/feature-areas/personal.md` | Stories S-M08–M09 (v1), S-M10 (v2). 5 default groups, same task model as projects |
| **Feature area — AI Layer** | `vault/products/todo/feature-areas/ai-layer.md` | Stories S-E05–E07, S-I09–I11. Prompt architecture, feedback_log, Claude session integration |
| **Feature area — Settings** | `vault/products/todo/feature-areas/settings.md` | Google Calendar OAuth, Statuses management, Tags management, Profile |
| **Feature area — Item Types** | `vault/products/todo/feature-areas/item-types.md` | Task vs Idea distinction, where each appears, Idea breakdown flow |
| **User journey — Daily routine** | `vault/products/todo/user-journeys/daily-routine.md` | Morning → Plan My Day → task execution → end of day. 7-step flow with failure modes. |
| **User journey — Brain dump to task** | `vault/products/todo/user-journeys/brain-dump-to-task.md` | Three capture paths: Cmd+K direct, Slack auto-ingest, Raw→Inbox→Backlog pipeline |
| **Workflow — Slack ingest** | `vault/products/todo/workflows/slack-ingest.md` | #todo-inbox → n8n webhook → /api/v1/inbox/ingest → AI → Pending Review. Multi-channel design under review. |
| **Workflow — AI processing** | `vault/products/todo/workflows/ai-processing.md` | All 5 AI uses mapped (Inbox intake, Backlog refinement, Plan My Day, Idea breakdown, Session tasks) |
| **Workflow — Session integration** | `vault/products/todo/workflows/session-integration.md` | Claude Code → /api/v1/claude/* (3 endpoints). Session start, task update, brain dump flows. |
| **Feature status tracker** | `vault/products/todo/todo-feature-status.md` | Gate 3 prototype status, Gate 4+ build status, session log |

## Design documents (engineering reference)

| Document | Path |
|---|---|
| Problem statement | `todo/docs/plans/2026-03-02-problem-statement.md` |
| Gate 2 design (COMPLETE) | `todo/docs/plans/2026-03-02-todo-design.md` |
| Design spec (decisions summary) | `todo/docs/plans/2026-03-02-todo-DESIGN-SPEC.md` |

---

## Core concepts

**AI intake layer** — Claude processes raw brain dumps into proposed outcomes and tasks. Simon reviews and accepts before items enter the system. Applies at two levels:
1. Global inbox (cold brain dump → proposed structure with review gate)
2. Project backlog (Raw → Refined → Ready pipeline, with AI review and iteration loop)

**Project backlog pipeline** (confirmed Gate 3 session 35):
- **Raw** — brain dump, unstructured, any channel (Slack, quick-add, direct entry). AI review auto-triggered on arrival.
- **Refined** — scope and understanding clearly articulated. Human-confirmed after AI feedback iteration loop. Scope clarity is the gate — not just AI review completion.
- **Ready** — task breakdown, dependencies, and interdependencies worked out. Priority assigned (P1/P2/P3). Ready to promote to board.

**Two item types** — Task (actionable, has status and estimate) and Idea (vague, needs AI breakdown before becoming tasks)

**Feedback loop** — Applyr-style. Highlight specific text sections in Claude's proposed output → attach targeted comment to that section → captured in feedback_log → drives next refinement iteration. Section-level inline highlighting required (not just an overall comment box).

**Container model** — Unified table for Projects (work/technical) and Personal groups (lifestyle, admin). One level of nesting supported via parent_id.

**Extensible statuses** — Statuses table (not enum). Default set: Backlog → Refined → To-Do → In Progress → Blocked → Done → Archived. Custom statuses addable globally or per container. Items reference by status_id FK.

---

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Database | PostgreSQL (n8n-postgres shared container) | SS42 standard. SQLite NOT carried forward from Lifeboard v3.2. |
| DB schema | `todo` (prod), `todo_staging` (staging) | Schema isolation pattern — same as KB and Applyr. |
| Auth | Google OAuth via Passport.js — no username/password | Shared `shared_auth` schema (users, sessions, allowed_emails) in n8n-postgres. SSO across all SS42 apps. |
| SSO | Cookie on `.ss-42.com` domain | Sign in on any app, authenticated on all. |
| Shared auth dependency | Phase 1 COMPLETE (2026-03-03) | `shared_auth` schema migrated in Applyr. Todo can use it on deploy. |
| GitHub integration | Separate — project holds repo URL link | No sync. Revisit once both systems stable. |
| Status model | Global defaults + container overrides | Migration to per-container is config-only (status_id FK pattern). |
| Google Calendar | Server owns OAuth (googleapis npm) | Today view needs live calendar data independently of Claude. |
| Claude integration | `/api/v1/claude/*` endpoints + API key (Bearer) | MCP server for ToDo is Phase 2. |
| Priority ordering | Float-based | Safe for drag-to-reorder without bulk updates. |
| scheduled_date vs due_date | Separate fields | "When I plan to work on it" ≠ "when it must be done". |
| Item dependencies | Join table (item_dependencies) | Queryable. Array in DB is not. |
| Visual design | Deferred to Gate 3 prototype | Build first, confirm tokens from what you see. |
| Sign-in page | Polished shared design across all SS42 apps | Deliverable in Gate 3 prototype. |

---

## Tech stack (confirmed — Gate 2 Section 10)

| Layer | Tech |
|---|---|
| Runtime | Node.js 22 Alpine |
| Framework | Express (CommonJS) |
| Database | PostgreSQL — pg, raw SQL, no ORM |
| Auth | passport, passport-google-oauth20, express-session, connect-pg-simple |
| Shared auth tables | shared_auth.sessions, shared_auth.users, shared_auth.allowed_emails |
| Calendar | googleapis npm — server-side OAuth |
| AI | @anthropic-ai/sdk (Claude API) |
| Frontend | Vanilla JS ES6 modules — no build step |
| Icons | Lucide (CDN) |
| Fonts | Plus Jakarta Sans + JetBrains Mono |
| Migrations | Numbered SQL files, run on startup |
| CI/CD | GitHub Actions → GHCR (ghcr.io/sspaynter/todo) → Watchtower |
| Testing | Jest + Supertest |

---

## Navigation structure

```
5 primary views: Today | Inbox | Projects | Personal | All Tasks
Settings screen (gear icon, bottom of rail)
Global Quick Add: floating + button + Cmd+K command palette
```

---

## SS42 hub integration

- Accent colour: Green `#10b981` — already assigned in KB hub modal
- Left rail: 56px, `#060a14` — same as Knowledge Base
- Dark/light toggle: top-right topbar — same position as KB
- Typography: Plus Jakarta Sans + JetBrains Mono

---

## Deployment (planned — not yet built)

| Resource | Production | Staging |
|---|---|---|
| Container | `todo` | `todo-staging` |
| External port (NAS) | `3335` | `3336` |
| Subdomain | `todo.ss-42.com` | `todo-staging.ss-42.com` |
| DB schema | `todo` | `todo_staging` |
| DB (app data) | `applyr` database (TBC — see database note below) | `applyr_staging` |
| Image | `ghcr.io/sspaynter/todo:latest` | `ghcr.io/sspaynter/todo:dev` |

**Database note:** `shared_auth` lives in the `applyr` database. For Gate 4 (implementation): decide whether `todo` schema also lives in `applyr` (one connection) or in `nocodb` (two connections — separate pool for auth). Recommend one connection (Option A).

**Pre-deploy checklist (Gate 4 will confirm):**
- [x] `shared_auth` schema in n8n-postgres — DONE (Phase 1 complete 2026-03-03)
- [ ] `todo.ss-42.com` redirect URI added to Google OAuth client
- [ ] GitHub Actions workflow (`deploy.yml`) created
- [ ] Cloudflare Tunnel hostname `todo.ss-42.com` added
- [ ] Host volume folders created on NAS
- [ ] Container Station container created with env vars + Watchtower label

---

## What is out of scope (v1)

Mobile native app, GitHub sync, time tracking, integrations beyond Google Calendar and Claude, multi-user dashboards, MCP server, offline/PWA, export, email notifications, file attachments, analytics.

**v2 backlog items (deferred from v1):** Recurring tasks and templates (swim, electricity bill with due dates), Slack multi-channel routing (channels mapping to different containers), reuse candidate detection in Backlog refinement, per-container status overrides, tag filtering in All Tasks, session summary auto-write to activity log, MCP server for richer session integration.

---

## Session history

| Date | Session | What happened |
|---|---|---|
| 2026-03-02 | 33 | Full redesign kicked off. Gate 0 (Framing) + Gate 1 (Problem space, 12 failure points) confirmed. Gate 2 Design sections 1–6 confirmed. Paused at Section 7 (Visual design). |
| 2026-03-03 | 34 | Gate 2 complete. Sections 7–12 confirmed. Key decisions: PostgreSQL (not SQLite), Google OAuth via shared_auth schema, SSO across all SS42 apps. Ports 3335/3336 allocated. shared_auth Phase 1 confirmed complete. Started Gate 3 prototype — built 5 screens (Sign-in, Today, Inbox, Projects, Project Detail). |
| 2026-03-03 | 35 | Gate 3 continued. Projects screen redesigned: left-to-right board (Next → Active), Parked collapsible below. Board/Backlog toggle added. Backlog pipeline built: Raw → Refined → Ready with full AI refinement panel (iteration loop, task breakdown, deps, reuse, priority picker). Backlog state definitions confirmed. Design spec updated with raw input channel and inline text feedback requirements. |
| 2026-03-04 | 36 | Gate 3 complete. All 8 prototype screens done (Today plan panel + Show All toggle, Inbox raw processing flow, Backlog inline annotation, Raw channel demo modal, All Tasks, Personal). PM documentation layer established: Opportunity Backlog (10 opportunities), User Story Map (48 v1 + 13 v2 stories, 7-activity backbone), feature area spec for Today. Framework: SVPG / Cagan (opportunity backlog) + Jeff Patton (story mapping). |
| 2026-03-04 | 37 | Gate 4 pre-work complete. All remaining feature area specs written (Inbox, Projects, All Tasks, Personal, AI Layer, Settings, Item Types). Two user journeys written (Daily routine, Brain dump to task). Three workflow documents written (Slack ingest, AI processing, Session integration). Gate 4 implementation plan written (15 tasks, 4 PRE infrastructure items, 8 sprints). Key decisions: personal tasks included in Plan My Day, reuse candidates deferred to v2, Slack multi-channel routing — design under review. |
