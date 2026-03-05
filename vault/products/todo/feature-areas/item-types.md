---
title: Item Types
parent: feature-areas
order: 80
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# Item Types — Feature Area Spec

**Type:** Feature area specification
**Workspace:** Products
**Section:** ToDo / Feature Areas
**Stories:** S-P05–P09 (Backlog pipeline — covers Raw/Idea items in detail); item type logic is a shared concern across Projects, Inbox, and All Tasks
**Opportunities addressed:** OPP-04 (Tasks enter without structure or outcome connection)
**Status:** Gate 2 design confirmed — not explicitly prototyped as its own flow. Item types are embedded in Projects and Inbox screens.
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude
**Reference:** Gate 2 design doc Section 3 (IA) and Section 4 (data model), `todo/docs/plans/2026-03-02-todo-design.md`

---

## What this document covers

The system uses two item types: **Task** and **Idea**. Every item in the database is one or the other. This distinction drives how an item is displayed, what actions are available, and how it moves through the system.

This document explains the distinction, the lifecycle of each type, and the Idea breakdown flow. It complements the `projects.md` and `inbox.md` feature specs, which document the surfaces where items appear.

---

## The two types

### Task

A **Task** is specific, actionable, and estimable. It has:
- A clear title describing a concrete action ("Write prompt template for Inbox processing")
- A time estimate in minutes
- A status (To-Do / In Progress / Blocked / Done / Parked)
- A container (project or personal group)
- Optional: description, due_date, scheduled_date, tags, dependencies

Tasks are the primary unit of work. They appear on the Board, in Today, in All Tasks, and in the Plan My Day panel.

**A task is ready to work on.** If it is not, it should not be a Task yet — it should be an Idea or a backlog item.

---

### Idea

An **Idea** is a vague intention not yet broken into actionable tasks. It has:
- A title (often broad: "Sort out the Knowledge Base nav bar")
- No estimate (because it is not scoped yet)
- No status progress (it is either active or archived)
- A container
- A "Break down" button that triggers AI task decomposition

Ideas are the entry point for work that is too large or unclear to commit to as a single task. They live in a project or personal group until they are broken down or archived.

**An Idea is not ready to work on.** It is a placeholder that needs thinking.

---

## Where each type appears

| Surface | Task | Idea |
|---|---|---|
| Project Board (Next / Active columns) | Yes | No (Ideas are not on the board) |
| Project Backlog (Raw / Refined / Ready) | No (backlog items are Ideas pending breakdown) | Yes |
| Today (committed list) | Yes | No |
| Inbox (after acceptance) | Created as Tasks | Created as Ideas (if brain dump is too broad) |
| All Tasks | Yes | Yes (with an "Idea" badge to distinguish) |
| Plan My Day suggestions | Yes | No |

---

## The Idea breakdown flow

When Simon has an Idea item and wants to turn it into Tasks, the "Break down" button triggers AI-assisted decomposition.

```
Idea item in project
        │
        ▼
Simon clicks "Break down"
        │
        ▼
POST /api/v1/items/:id/breakdown
Claude API called with:
  - Idea title + description
  - Container context (project name, existing tasks)
  - Feedback log entries (any previous annotations)
        │
    ┌───┴───────────────────┐
    │ API success           │ API failure
    ▼                       ▼
Review modal opens         Error shown:
showing proposed tasks:    "Could not generate
  - Task title (editable)  breakdown — try again"
  - Estimate (editable)    Idea item unchanged
  - Status: To-Do
        │
Simon reviews each task:
  Accept / Edit / Reject
        │
        ▼
On Accept all:
  - Tasks created in same container
  - Idea item archived (not deleted — preserved as reference)
  - Activity log entry written
```

**AC for non-deterministic output (Idea breakdown):**
The breakdown shall produce between 2 and 8 tasks (never a single task — if one task suffices, the Idea should have been a Task from the start).
Each task shall include a title of at least 3 words and an estimate in minutes.
Simon can edit any proposed task before accepting.
Simon can reject individual tasks — only accepted tasks are created.
The Idea item is only archived after at least one task is accepted.
Fallback: if the API fails, the modal shows manual input fields — Simon can write the task breakdown himself without AI assistance.

---

## How items become one type or another

| Source | Default type | Logic |
|---|---|---|
| Cmd+K with container selected | Task | Direct creation assumes scope is known |
| Inbox acceptance (simple brain dump) | Task | AI-proposed structure creates Tasks |
| Inbox acceptance (broad brain dump) | Idea (possible) | If AI determines the input is too broad for tasks, it may propose an Idea as the first step |
| Backlog Raw item | Idea (effective) | Backlog Raw items behave like Ideas — they need refinement before becoming Tasks |
| Session brain dump (Claude → Inbox) | Routes through Inbox | Standard intake process determines type |
| Direct project quick-add | Task | Same as Cmd+K with container |

---

## Relationship between Idea and Backlog

These two concepts overlap and can cause confusion. Here is the precise distinction:

| Concept | Location | Purpose |
|---|---|---|
| Idea (item type) | Lives in a container (project or personal) | A vague item that needs breaking down. Has a "Break down" button. Direct AI interaction on the item itself. |
| Backlog Raw item | Lives in the project Backlog pipeline | A brain dump or raw input that hasn't been scoped. Goes through Raw → Refined → Ready before reaching the board. |

**In practice:** A Backlog Raw item is effectively an Idea that goes through the more structured pipeline before becoming Tasks. The difference is the route, not the concept:
- **Backlog pipeline** is for project-level scope work — items that need multiple refinement iterations before being board-ready
- **Idea breakdown** is a faster, lighter flow — a single AI call produces tasks that Simon can accept immediately

For v1, both flows coexist. In v2, they may be unified.

---

## Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Ideas are not on the board | Board = Tasks only | The board is an execution view. Ideas are planning artefacts. Mixing them would make the board unreadable. |
| Idea is archived, not deleted, on breakdown | Archived | Preserves the original intent. Simon can refer back to why a set of tasks was created. |
| Two breakdown flows (Idea + Backlog) | Both in v1 | They serve different use cases. Backlog pipeline is for complex projects needing iteration. Idea breakdown is for lightweight decomposition. |
| Ideas visible in All Tasks | Yes, with badge | All Tasks is a master query view — hiding Ideas would create false "everything is a task" picture. |

---

## v2 considerations

- **Unify Idea and Backlog Raw** — a single "refinement" pathway for all vague items, regardless of where they live
- **Idea sub-tasks** — allow an Idea to have partial task breakdowns before the full breakdown is complete
- **Recurring task templates** — see `personal.md` v2 backlog
