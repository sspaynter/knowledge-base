---
title: MVP Outcomes and Scope
parent: product-definition
order: 30
status: published
author: claude
created: 2026-03-05
updated: 2026-03-06
---
# ToDo — MVP Outcomes and Scope

**Type:** MVP definition
**Session:** 41 (2026-03-06) — complete overhaul of session 39 draft
**Author:** Simon Paynter + Claude
**Status:** Confirmed
**Supersedes:** Session 39 draft — scope has changed significantly
**Design reference:** `todo/docs/plans/2026-03-06-item-lifecycle-flow.html`

---

## What ToDo is

ToDo is Simon's development operations system for managing AI-assisted work across all SS42 projects.

It is not a general personal productivity tool. It is not a Trello replacement. Its specific job is: turning vague work items into Claude-executable session-work, and ensuring nothing discovered in a session evaporates.

The core loop:

1. Something is captured — an idea, a bug, a discovery, a requirement, a cross-domain dependency
2. The AI pipeline processes it: classify where it belongs, scope what it means, decompose it into executable pieces
3. Simon gates every AI proposal — he confirms placement, confirms scope, approves breakdown
4. The leaf items (session-work) have a known deliverable and can be picked up by Claude without briefing
5. Anything discovered during execution re-enters the system as a new raw item

This recurs at every level of the hierarchy. Nothing is ever manually decomposed by Simon. His job is to confirm or redirect AI proposals at each gate.

---

## What MVP means here

MVP = the minimum Simon needs for ToDo to replace ad-hoc session management.

Not "all features done." Not Trello replacement. The test is simple: **does Simon use ToDo to manage his Claude development work instead of ad-hoc session notes and mental state?**

If items are still evaporating in session conversations — MVP is not working.
If Claude is still starting sessions without a clear handoff — MVP is not working.
If Simon is manually decomposing work instead of gating AI proposals — MVP is not working.

---

## The five MVP outcomes

---

**Outcome 1 — Nothing evaporates**

> "When a session ends, every meaningful item we identified is in the system."

Addresses: The rabbit hole problem. Discovery sessions generate work items — bugs, dependencies, feature ideas, scope decisions — that currently disappear when the session ends.

Simon needs: An end-of-session capture flow. Claude flags items during a session, presents a consolidated list at close, Simon confirms which to keep. Confirmed items land in Inbox with Claude's context pre-loaded.

**Minimum capability:** Inbox, Claude API write endpoint, end-of-session item format.

---

**Outcome 2 — Items arrive defined, not raw**

> "I never manually decompose a work item. The AI proposes. I confirm or redirect."

Addresses: The current state where Simon manually writes task breakdowns in planning sessions that do not persist anywhere structured.

Simon needs: The full AI intake pipeline — Classify → Scope → Decompose — with a Scope Gate (SG) and Decompose Gate (DG) at each step. Every raw capture becomes a scoped, placed, decomposed item without Simon doing the structure work.

**Minimum capability:** AI Classify step with SG gate, AI Scope step with SG gate, AI Decompose step with DG gate, Raw → Refined → Ready pipeline states.

---

**Outcome 3 — Claude starts sessions knowing what to do**

> "When I start a Claude session on any project, it knows current state without me briefing it."

Addresses: The briefing overhead at the start of every session. Simon currently spends 5–10 minutes re-establishing context before any work begins.

Simon needs: A session context endpoint that Claude calls to get current in-progress session-work items and project state. Session-work items must be structured with enough context (deliverable, dependencies, related files) for Claude to start without explanation.

**Minimum capability:** `GET /api/v1/claude/context` endpoint, session-work item structure (deliverable + context + dependencies).

---

**Outcome 4 — Dependencies are visible, not invisible**

> "When I approve a breakdown, I can see what this item needs from other work — and I can track it."

Addresses: Cross-project dependencies that currently exist only in Simon's head. When these are missed, sessions start without a needed prerequisite and stall.

Simon needs: item_dependencies, the BLOCKED flag, and the dependency chain visible at the DG gate before Simon confirms a breakdown. Blocked items remain blocked until prerequisites are done. BLOCKED flag lifts automatically on completion.

**Minimum capability:** item_dependencies join table, BLOCKED state, dependency chain shown at DG gate UI.

---

**Outcome 5 — Project state is always legible**

> "At any point I can see where every project stands in the pipeline — what is raw, refined, ready, in progress, done."

Addresses: The current state where project progress exists only in Claude session context or scattered Trello cards.

Simon needs: A project detail view showing item pipeline state at feature and task level — counts at each stage, blocked badges, what is ready to pick up next.

**Minimum capability:** Project list view, project detail view with pipeline state counts per level, BLOCKED badge on items.

---

## MVP scope — what is built

### Data model

| Entity | Notes |
|---|---|
| Projects | Container. Name, description, status. Schema supports personal groups via type field — personal feature area not built in MVP UI. |
| Items | Unified table. level field: Project / Feature / Task / Session-work. parent_id self-referencing for hierarchy. |
| item_dependencies | Join table. Records blocker relationships within and across projects. |
| Pipeline states | Raw → Refined → Ready → In Progress → Done. BLOCKED is a flag, not a state — can apply at any stage. |
| Inbox | Separate processing queue. Items only enter the main project hierarchy after Simon accepts them at a gate. |

### UI screens (MVP)

| Screen | Purpose |
|---|---|
| Inbox | Raw captures, AI processing queue, SG gate view for classify and scope steps |
| Project list | All SS42 projects, pipeline state summary per project |
| Project detail | Feature-level items, pipeline state, blocked badges, what is ready |
| Item detail / pipeline view | Scope statement, child items, dependencies, gate controls |
| Capture (Cmd+K) | Quick input — routes to Inbox |
| End-of-session review | Claude's flagged items from a session — confirm, edit, or skip per item |

### AI pipeline

| Step | What AI does | Gate |
|---|---|---|
| Classify | Proposes item level and placement in project hierarchy | Scope Gate (SG) — Simon confirms |
| Scope | Proposes scope statement and definition of Done | Scope Gate (SG) — Simon iterates until right |
| Decompose | Proposes child items at the next level down, with dependencies | Decompose Gate (DG) — Simon approves breakdown |

### Claude integration (v1 — API endpoints)

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/claude/context?project={id}` | Returns current session-work items + project pipeline state |
| `POST /api/v1/claude/items` | Accepts items from end-of-session review |
| `PATCH /api/v1/claude/items/{id}` | Updates item status from within a session |

Auth: Bearer token (separate from session auth). Per-app api_tokens table in `todo` schema.

### Infrastructure (PRE requirements — unchanged from prior planning)

| Ref | Requirement |
|---|---|
| PRE-1 | Google OAuth via Passport.js — shared auth with other SS42 apps |
| PRE-2 | PostgreSQL schema `todo` on n8n-postgres (prod) + `todo_staging` (staging) |
| PRE-3 | Staging environment at `todo-staging.ss-42.com` |
| PRE-4 | CI/CD pipeline — GitHub Actions, Docker build, Watchtower deploy |

---

## What MVP explicitly defers

### Deferred to v2 — confirmed for next cycle, not day-1

| Feature | Why it defers |
|---|---|
| Cross-domain dependency auto-detection | MVP: Simon manually links cross-project dependencies. XDEP auto-detection (AI identifies prerequisites during pipeline) is v2 — requires AI to reason across project context. |
| Sprint grouping UI | Sprint concept is confirmed. Manual batching works for MVP. Sprint creation UI is v2. |
| Discovery session live flagging | MVP: end-of-session batch capture. Real-time item flagging during a session requires richer Claude session integration. |
| Annotation and feedback loop | High value, accumulates over time. Accepting AI output works for week one. Promotes to v2. |
| MCP server | API endpoints bridge Claude for v1. Richer MCP integration is Phase 2. |

### Deferred to v3 or later — may be built, not roadmap-committed

| Feature | Note |
|---|---|
| Today screen / daily orientation | Valid for a general task view; not the core value of this product. Revisit post-MVP. |
| Personal groups and personal tasks | Useful extension — data model already supports it via container type field. Not MVP UI scope. |
| Google Calendar integration | No capacity constraint problem in the new model. Defer. |
| Slack / mobile capture | Cmd+K covers MVP capture. Mobile out of scope for v1. |
| All Tasks view and filtering | Useful; not day-1 essential with project-level views available. |
| Plan My Day AI panel | Central to the old MVP framing. Not relevant to the current model. |

---

## What changed from session 39

The session 39 draft defined MVP as "the minimum Simon needs to switch from Trello." That framing produced a general personal productivity tool with 31 stories covering Today screen, Plan My Day, Calendar, Personal groups, and Inbox as the AI layer.

The new framing defines MVP as "the minimum Simon needs to stop losing work in Claude sessions." This produces a focused AI workflow operations tool. The core value shifts:

| | Session 39 | Session 41 |
|---|---|---|
| Primary problem | Trello is static and dumb | Work evaporates in Claude sessions |
| Core user | Simon managing personal + project tasks | Simon managing Claude development work |
| Key screen | Today — daily orientation | Inbox — AI pipeline gate |
| Key integration | Google Calendar (capacity) | Claude API (session handoff) |
| Core AI value | Brain dump → task list | Raw item → classified, scoped, decomposed, session-ready |
| Story count | 31 stories | 5 outcomes (story count TBD from prototype v2) |

Personal groups, Today, and Calendar are not gone — they move to v3 as extensions once the core is proven.

---

## MVP definition of done

Simon can declare MVP done when all of these are true after two weeks of use:

- [ ] At least 10 items captured from session discoveries have landed in ToDo with context preserved — zero evaporated
- [ ] All captured items went through the AI pipeline without Simon writing a single manual task breakdown
- [ ] He has started at least 5 Claude sessions that loaded context from ToDo without a manual briefing
- [ ] At least one item has a cross-project dependency tracked in item_dependencies and shows ⛔ BLOCKED correctly
- [ ] He can look at any project's detail view and immediately understand what is ready, what is blocked, and what is in progress
- [ ] He has not needed to maintain a separate session notes document or Trello board for development work
