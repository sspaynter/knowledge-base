---
title: Feature Status Tracker
parent: product-definition
order: 30
status: published
author: claude
created: 2026-03-04
updated: 2026-03-05
---
# ToDo — Feature Status + Traceability

**Type:** Reference page
**Workspace:** Products
**Section:** ToDo
**Status:** Active — updated each design and build session
**Created:** 2026-03-03 (session 35)
**Updated:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude

---

## Purpose

This page answers three questions at a glance:

1. **What stories exist?** — Every v1 story, in one place
2. **Where is the spec?** — Feature area doc for each story
3. **What is the build status?** — Which implementation plan task covers it, and is it done?

Design spec: `todo/docs/plans/2026-03-02-todo-DESIGN-SPEC.md`
Implementation plan: `todo/docs/plans/2026-03-04-todo-implementation-plan.md`
Prototype: `todo/docs/mockups/todo-prototype-v1.html`

---

## Build status key

| Status | Meaning |
|---|---|
| Not started | No code written |
| In progress | Task has begun but is not complete |
| Complete | Task shipped to staging and verified |
| Blocked | Dependency not resolved — cannot start |

---

## Infrastructure prerequisites

| Item | What it is | Status |
|---|---|---|
| PRE-1 | `shared_auth` schema migrated to n8n-postgres (Applyr project) | Not started |
| PRE-2 | PostgreSQL schemas created: `todo` (prod) + `todo_staging` (staging) | Not started |
| PRE-3 | Docker compose: staging container on port 3336 | Not started |
| PRE-4 | GitHub Actions CI pipeline: push to `dev` → build `:dev` → Watchtower deploy to staging | Not started |

---

## v1 story traceability matrix

### Activity 1 — Start my day

| Story | Title | Feature spec | Plan task | Status |
|---|---|---|---|---|
| S-T01 | Morning orientation | `feature-areas/today.md` | Task 4 | Not started |
| S-T02 | Over-commitment warning | `feature-areas/today.md` | Task 4 | Not started |
| S-T03 | Carry-over prompt | `feature-areas/today.md` | Task 4 | Not started |
| S-T06 | Today's task list | `feature-areas/today.md` | Task 4 | Not started |
| S-T07 | Quick-add to today | `feature-areas/today.md` | Task 4 | Not started |
| S-T08 | Show all tasks | `feature-areas/today.md` | Task 4 | Not started |

---

### Activity 2 — Capture ideas

| Story | Title | Feature spec | Plan task | Status |
|---|---|---|---|---|
| S-C01 | Command palette (Cmd+K) | `feature-areas/inbox.md` | Task 6 | Not started |
| S-C02 | Brain dump routing | `feature-areas/inbox.md` | Task 6 | Not started |
| S-C04 | Slack auto-ingest | `feature-areas/inbox.md` | Task 7 | Not started |
| S-C05 | Mobile capture | `feature-areas/inbox.md` | Task 7 | Not started |

---

### Activity 3 — Process intake

| Story | Title | Feature spec | Plan task | Status |
|---|---|---|---|---|
| S-I01 | View proposed structure | `feature-areas/inbox.md` | Task 7 | Not started |
| S-I02 | Accept intake item | `feature-areas/inbox.md` | Task 7 | Not started |
| S-I03 | Reject intake item | `feature-areas/inbox.md` | Task 7 | Not started |
| S-I04 | Edit before accepting | `feature-areas/inbox.md` | Task 7 | Not started |
| S-I05 | Bulk actions (accept all / reject all) | `feature-areas/inbox.md` | Task 7 | Not started |
| S-I07 | View raw items | `feature-areas/inbox.md` | Task 7 | Not started |
| S-I08 | Process a raw item (Process ✦) | `feature-areas/inbox.md` | Task 7 | Not started |
| S-I09 | Highlight and annotate | `feature-areas/ai-layer.md` | Task 8 | Not started |
| S-I10 | Save annotation | `feature-areas/ai-layer.md` | Task 8 | Not started |
| S-I11 | Cancel annotation | `feature-areas/ai-layer.md` | Task 8 | Not started |

---

### Activity 4 — Plan and prioritise

| Story | Title | Feature spec | Plan task | Status |
|---|---|---|---|---|
| S-P01 | Request daily plan | `feature-areas/today.md` | Task 5 | Not started |
| S-P02 | Commit to plan | `feature-areas/today.md` | Task 5 | Not started |
| S-P03 | Adjust manually | `feature-areas/today.md` | Task 5 | Not started |
| S-P05 | View backlog pipeline | `feature-areas/projects.md` | Task 10 | Not started |
| S-P06 | Select backlog item for AI refinement | `feature-areas/projects.md` | Task 10 | Not started |
| S-P07 | Iterate on AI analysis (Refine ✦) | `feature-areas/projects.md` | Task 10 | Not started |
| S-P08 | Promote through pipeline | `feature-areas/projects.md` | Task 10 | Not started |
| S-P09 | Assign priority (P1 / P2 / P3) | `feature-areas/projects.md` | Task 10 | Not started |

---

### Activity 5 — Execute work

| Story | Title | Feature spec | Plan task | Status |
|---|---|---|---|---|
| S-E01 | Update task status | `feature-areas/projects.md` | Task 9 | Not started |
| S-E02 | Complete a task (checkbox) | `feature-areas/today.md` | Task 4 | Not started |
| S-E03 | Mark task blocked | `feature-areas/projects.md` | Task 9 | Not started |
| S-E05 | Session context load (GET /context) | `feature-areas/ai-layer.md` | Task 13 | Not started |
| S-E06 | Auto task update from session (PATCH) | `feature-areas/ai-layer.md` | Task 13 | Not started |
| S-E07 | Session brain dump (POST /inbox) | `feature-areas/ai-layer.md` | Task 13 | Not started |

---

### Activity 6 — Manage projects

| Story | Title | Feature spec | Plan task | Status |
|---|---|---|---|---|
| S-M01 | View project board | `feature-areas/projects.md` | Task 9 | Not started |
| S-M02 | Move task between board columns | `feature-areas/projects.md` | Task 9 | Not started |
| S-M03 | Park a task | `feature-areas/projects.md` | Task 9 | Not started |
| S-M04 | Task detail panel | `feature-areas/projects.md` | Task 9 | Not started |
| S-M05 | New project creation | `feature-areas/projects.md` | Task 9 | Not started |
| S-M08 | View personal groups | `feature-areas/personal.md` | Task 12 | Not started |
| S-M09 | Personal task management | `feature-areas/personal.md` | Task 12 | Not started |
| S-M11 | View all tasks | `feature-areas/all-tasks.md` | Task 11 | Not started |
| S-M12 | Filter all tasks | `feature-areas/all-tasks.md` | Task 11 | Not started |

---

### Activity 7 — Review and reflect

| Story | Title | Feature spec | Plan task | Status |
|---|---|---|---|---|
| S-R01 | Project detail header (progress bar) | `feature-areas/projects.md` | Task 9 | Not started |
| S-R02 | List and Kanban view toggle | `feature-areas/projects.md` | Task 9 | Not started |

---

### Infrastructure and foundation (no story ID — cross-cutting)

| What | Feature spec | Plan task | Status |
|---|---|---|---|
| Project scaffold + database schema | Design spec | Task 1 | Not started |
| Google OAuth auth (Passport.js + shared_auth) | Design spec | Task 2 | Not started |
| Core API — containers and items (CRUD) | Design spec | Task 3 | Not started |
| Navigation shell + sign-in page | Design spec | Task 14 | Not started |
| End-to-end integration + staging deploy | Design spec | Task 15 | Not started |

---

## Build task status

| Task | Description | Sprint | Stories covered | Status |
|---|---|---|---|---|
| PRE-1 | shared_auth migration (Applyr) | 0 | — | Not started |
| PRE-2 | PostgreSQL schema creation | 0 | — | Not started |
| PRE-3 | Staging container + subdomain | 0 | — | Not started |
| PRE-4 | GitHub Actions CI pipeline | 0 | — | Not started |
| Task 1 | Project scaffold + DB schema | 1 | Foundation | Not started |
| Task 2 | Google OAuth auth | 1 | Foundation | Not started |
| Task 3 | Core API (containers + items) | 2 | S-M01–M05, S-E01–E03 | Not started |
| Task 4 | Today screen (stats + tasks + carry-over) | 2 | S-T01–T03, S-T06–T08, S-E02 | Not started |
| Task 5 | Plan My Day AI panel | 3 | S-P01–P03 | Not started |
| Task 6 | Cmd+K global quick-add | 3 | S-C01–C02 | Not started |
| Task 7 | Inbox (Pending Review + Raw + AI processing) | 4 | S-C04–C05, S-I01–I05, S-I07–I08 | Not started |
| Task 8 | Inline annotation + feedback_log | 4 | S-I09–I11 | Not started |
| Task 9 | Projects board + task detail panel | 5 | S-M01–M05, S-E01, S-E03, S-R01–R02 | Not started |
| Task 10 | Backlog pipeline + AI refinement panel | 5 | S-P05–P09 | Not started |
| Task 11 | All Tasks + filter chips | 6 | S-M11–M12 | Not started |
| Task 12 | Personal groups | 6 | S-M08–M09 | Not started |
| Task 13 | Claude session integration API | 6 | S-E05–E07 | Not started |
| Task 14 | Navigation shell + sign-in page | 1 | Foundation | Not started |
| Task 15 | End-to-end integration + staging deploy | 7 | All | Not started |

---

## Gate 3 — Prototype screen status

| Screen | Status | Notes |
|---|---|---|
| Sign-in | Complete | SS42 branded, Google OAuth button, dark/light mode |
| Today | Complete | Week strip, stats, over-commitment warning, rollover prompt, task list, Plan My Day AI panel (ranked tasks, commit toggle, confirm action), Show all tasks toggle → expanded cross-project view |
| Inbox | Complete | Two tabs (Pending / Raw). Raw tab: items have Process ✦ button → animated 3-stage flow (Captured → AI reviewing → Structure proposed) with reveal of proposed grouping |
| Projects — Board view | Complete | Next → Active columns (left-to-right), Parked collapsible section, detail panel on right |
| Projects — Backlog view | Complete | Raw → Refined → Ready pipeline, AI refinement panel (full iteration loop, tasks, deps, reuse, priority picker, history, feedback), inline text highlight-and-comment mechanic |
| Project Detail | Basic | Task list, Kanban toggle, header. Not deeply reviewed yet |
| All Tasks | Complete | Filter chips (All / Today / Overdue / Blocked / In progress), collapsible project groups with task counts |
| Personal | Complete | Left sidebar with 5 groups (Health & Fitness, Finance, Home, Creative, Life Admin), right panel switches on group select, task lists per group |

---

## Design decisions that differ from the original spec

| Decision | Spec said | What was designed | Reason |
|---|---|---|---|
| Project backlog states | "Idea items → AI breakdown on demand" | Raw → Refined → Ready pipeline (3 distinct states) | Backlog at scale (20–50 items) needs pipeline model, not ad-hoc review |
| Backlog state meaning | Not defined | Raw = brain dump; Refined = scope clear; Ready = tasks + deps worked out | Scope clarity is the gate between Raw and Refined — not just AI review completion |
| Projects Kanban columns | Active / Next / Parked columns | Next → Active (2 columns) + Parked as collapsible section | Left-to-right should read as progression. Parked is a holding area, not a workflow stage |
| AI review trigger | On demand ("Review ✦" button) | Auto-triggered when item arrives via raw input channel | Better UX — analysis ready without manual action |
| Inline feedback | "Highlight text → annotate → feedback_log" | Section-level highlighting required — not just overall comment box | Simon's requirement: highlight specific text in AI analysis, not just add overall notes |
| Reuse candidate detection | Included in v1 backlog refinement panel | Deferred to v2 | False positive rate too high at low project volume; increases API call complexity and latency |

---

## Session build log

| Session | Gate | Key deliverables |
|---|---|---|
| 33 | 0/1/2 | Gate 0 framing, Gate 1 problem space (12 failure points), Gate 2 sections 1–6 |
| 34 | 2/3 | Gate 2 complete (sections 7–12), prototype v1 started (5 screens initial build) |
| 35 | 3 | Projects Board redesign (Next→Active, Parked collapsible), Backlog view (Raw→Refined→Ready pipeline, AI refinement panel), design spec updated |
| 36 | 3 | Gate 3 complete — Today (Plan My Day AI panel, Show All toggle), Inbox raw processing flow, Backlog inline text highlight-and-comment, Raw channel demo modal, All Tasks screen, Personal screen. All 8 screens done. |
| 37 | 4 pre-work | All remaining feature area specs written (Inbox, Projects, All Tasks, Personal, AI Layer, Settings, Item Types). Two user journeys (Daily routine, Brain dump to task). Three workflow docs (Slack ingest, AI processing, Session integration). Gate 4 implementation plan (15 tasks, 4 PRE items, 8 sprints). Traceability matrix built. Cross-project boundary incident: wrongly edited KB services/pages.js — reverted. Rule added to CLAUDE.md. KB getPageTree bug documented as task #46 with implementation plan. |
| 38 | 4 pre-work | All 3 story gaps resolved. Gap 1: S-C04 universal 3-step flow confirmed (inbox.md). Gap 2: S-P06 reuse candidates deferred to v2 with full documentation (projects.md). Gap 3: S-P01 personal tasks fully included in Plan My Day ranked list (today.md). Implementation plan gap section marked resolved. |
