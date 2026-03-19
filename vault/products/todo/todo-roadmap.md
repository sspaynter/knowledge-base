---
title: Release Roadmap
parent: product-definition
order: 40
status: published
author: claude
created: 2026-03-05
updated: 2026-03-05
---
# ToDo — Release Roadmap

**Type:** Product roadmap
**Session:** 39 (2026-03-05)
**Author:** Simon Paynter + Claude
**Status:** Draft — three open decisions pending Simon review (see MVP Outcomes doc)
**Related:** `2026-03-05-todo-mvp-outcomes.md` | `2026-03-04-todo-implementation-plan.md`

---

## Three phases

```
Phase 1 — MVP          Phase 2 — v1           Phase 3 — v2
─────────────────      ──────────────────     ─────────────────
Switch from Trello     Complete the spec      AI and calendar
31 core stories        16 remaining v1        17 v2 stories
~6 sprints             ~5 sprints             TBD
```

---

## Phase 1 — MVP

**Goal:** Simon switches from Trello. After one week, he cannot imagine going back.

**Entry:** Infrastructure prerequisites done (PRE-1 through PRE-4)
**Exit:** Simon has confirmed all five MVP outcomes (see MVP Outcomes doc)

### What ships in MVP

| Area | Stories | Notes |
|---|---|---|
| Today screen | S-T01, T02, T03, T06, T07 | Stats bar, over-commitment, carry-over, task list, quick-add |
| Plan My Day | S-P01, P02, P03 | AI ranked plan, commit, adjust manually |
| Capture | S-C01, C02 | Cmd+K palette, routing to project or Inbox |
| Inbox | S-I01, I02, I03, I04, I07, I08 | Pending Review + Raw Capture, no annotation, no Slack |
| Task status | S-E01, E02, E03 | Status chip, complete, blocked badge |
| Claude session | S-E05, E06, E07 | Context load, auto-update, session brain dump |
| Projects | S-M01, M02, M03, M04, M05 | Board, drag, park, task detail, new project |
| Project review | S-R01, R02 | Project header, view toggle |
| Personal | S-M08, M09 | 5 default groups, full task management |
| Navigation | — | 56px rail, sign-in, dark/light mode |

**Total MVP stories: 31**

**Deferred decisions (see MVP Outcomes doc):**
- Google Calendar for MVP: Recommendation is manual hours input in Settings
- Backlog pipeline for MVP: Recommendation is defer (Inbox covers structured intake)
- Slack auto-ingest for MVP: Recommendation is defer (Cmd+K covers web capture)

### MVP sprint structure

| Sprint | Tasks | Theme |
|---|---|---|
| 0 | PRE-1–PRE-4 | Infrastructure prerequisites |
| 1 | T1 Schema, T2 Auth, T14 Nav shell | Foundation |
| 2 | T3 Core API, T4 Today screen | Core data + daily orientation |
| 3 | T5 Plan My Day, T6 Cmd+K | AI + capture |
| 4 | T7 Inbox (no Slack, no annotation), T12 Personal | Intake + personal |
| 5 | T9 Projects board, T13 Claude session API | Execution |
| 6 | T15 E2E + staging + MVP smoke test | Ship |

---

## Phase 2 — v1 Complete

**Goal:** All 47 v1 stories shipped. Every feature described in the feature area specs is working.

**Entry:** MVP exit criteria confirmed
**Exit:** All v1 stories pass their acceptance criteria on staging

### What ships in v1 post-MVP

| Area | Stories | Notes |
|---|---|---|
| Today | S-T08, T10 | Show all tasks, blocked count |
| Capture | S-C04, C05 | Slack auto-ingest, mobile capture |
| Inbox | S-I05, I09, I10, I11 | Bulk actions, annotation feedback loop |
| Task detail | S-E04 | Note a blocker |
| Backlog pipeline | S-P05, P06, P07, P08, P09 | Full Raw → Refined → Ready pipeline |
| All Tasks | S-M11, M12 | Cross-project view, filter chips |
| Settings | — | Google Calendar OAuth, statuses, tags, day reset time, profile |

**Total v1 post-MVP: 16 stories + Settings screen**

### v1 completion order (dependency-driven)

1. All Tasks + filter chips (S-M11, M12) — standalone, no dependencies
2. Show all tasks + Blocked count on Today (S-T08, T10) — depends on All Tasks filter
3. Annotation mechanic + feedback_log (S-I09-I11) — builds on Inbox
4. Backlog pipeline full spec (S-P05-P09) — builds on Projects board
5. Slack auto-ingest + mobile capture (S-C04, C05) — depends on Inbox + n8n
6. Settings screen (Google Calendar OAuth, statuses, tags, day reset, profile)
7. S-E04 Note a blocker, S-I05 Bulk actions — can ship any point after their dependencies

---

## Phase 3 — v2

**Goal:** AI capabilities deepen. Calendar integration completes. Power user features ship.

**Entry:** v1 exit criteria confirmed. Real usage data from Phase 1 and 2 informs priority.

**Not sequenced yet** — v2 priorities will be revised based on what Simon actually uses in v1.

### v2 stories (informational only)

| Story | Description |
|---|---|
| S-T04 | Calendar event strip — visual time-of-day blocks |
| S-T05 | Per-task reschedule from Today |
| S-T09 | Time-block to Google Calendar |
| S-C03 | Global search via Cmd+K |
| S-C06 | Email capture |
| S-I06 | Inbox zero state |
| S-I12 | Annotation history panel |
| S-P04 | Re-plan mid-day |
| S-P10 | Promote Ready to board (automated) |
| S-P11 | Bulk pipeline management |
| S-E08 | Session summary to activity log |
| S-M06 | Project priority drag-to-reorder |
| S-M07 / R03 | AI project summary |
| S-M10 | Custom personal groups |
| S-M13 | Advanced filter and group |
| S-R04 | Activity feed |
| MCP server | Replace REST API with MCP for richer session integration |

---

## Open items before build starts

1. Confirm three MVP decisions (Calendar, Backlog, Slack) — see MVP Outcomes doc
2. Update implementation plan tasks based on MVP scope decisions
3. Complete PRE-1 (Applyr shared_auth migration) — check current status
4. S-P05 AC update (Add to backlog action) — pending spec update
5. S-P08 AC update (Ready exit criteria) — pending spec update
6. Prototype column rename "Refine" → "Refined"
