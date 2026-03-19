---
title: MASTER-TODO Conventions
status: published
order: 20
author: both
parent: overview
created: 2026-03-05
updated: 2026-03-06
---

# MASTER-TODO Conventions

This document defines the structure, conventions, and processes for maintaining the cross-project task list at `todo-viewer/MASTER-TODO.md`.

## Purpose

MASTER-TODO.md is the single source of truth for all planned work across SS42 projects. It tracks tasks from idea through to completion, with priorities, dependencies, delivery sequencing, and feature area groupings.

It is a stopgap until the ToDo app is production-ready. The conventions here are designed to migrate cleanly into a database-backed system.

## File Location

```
~/Documents/Claude/todo-viewer/MASTER-TODO.md
```

Referenced from:
- Root `CLAUDE.md` (all sessions)
- Global `~/.claude/CLAUDE.md` (Cross-Project Modification Boundary)
- Todo Viewer dashboard at `localhost:3333`

## Document Structure

The file contains these sections in order:

| Section | Purpose |
|---|---|
| How to use this file | Required fields and Seq convention reference |
| Big Picture | High-level project/tool status table |
| Current Sprint | This week's delivery items in cross-project order |
| Active Tasks: P1 | Do Next — current sprint work |
| Active Tasks: P2 | Important, Not Blocking — next up |
| Active Tasks: P3 | Backlog / Someday — future work |
| KB Feature Areas | Reference table for Knowledge Platform feature area groupings |
| Dependencies Map | ASCII diagram showing task dependencies |
| Current sequencing | ASCII delivery order diagram |
| Completed Tasks | Done items with completion date |

### Current Sprint section

The Sprint section sits above P1 and contains a flat, ordered list of items to work through this week. Items are pulled from P1 and P2 across all projects. This is the daily working view.

**Table format (6 columns):**
```
| Order | # | Task | Project | Est | Status |
```

**Status values:** ⬜ pending, 🔄 in progress, ✅ done

**Rules:**
- Sprint is refreshed weekly (or when it empties)
- Items keep their original # from the P1/P2 tables
- Applyr product work is interleaved with tooling/infrastructure work
- Sprint order is the cross-project delivery sequence — work top to bottom
- Re-sequence freely as priorities shift during the week

## Table Formats

### P1 table (6 columns)

```
| # | Seq | Task | Project | Depends on | Added |
```

P1 tasks do not have a Feature Area column because they are immediate work — the feature area context is less important than just getting them done.

### P2 and P3 tables (7 columns)

```
| # | Seq | Task | Project | Feature Area | Depends on | Added |
```

P2/P3 tasks include Feature Area because they represent planned work that benefits from categorical grouping.

### Completed table (4 columns)

```
| # | Task | Project | Completed |
```

## Required Fields for New Items

Every new task must include:

| Field | Format | Example |
|---|---|---|
| # | Next available integer | 71 |
| Seq | Project prefix + delivery number | K23 |
| Task | Project prefix colon, then description | KB: Add audit logging for page edits |
| Project | Project name from the established list | Knowledge Base |
| Feature Area | From the project's feature area list (P2/P3 only) | Integrations & API |
| Depends on | Task number(s) or `—` for none | #33, #60 |
| Added | ISO date | 2026-03-05 |

## Seq Convention

The Seq column provides cross-project delivery ordering. Format: **project prefix letter + delivery number**.

### Project Prefixes

| Prefix | Project |
|---|---|
| A | Applyr |
| D | Dev Platform |
| F | Future (speculative / no project yet) |
| G | GitHub Actions |
| H | HQ |
| I | Infrastructure |
| K | Knowledge Base |
| M | Mobile |
| S | Skills |
| T | ToDo |
| V | Todo Viewer |

### How sequencing works

- Numbers within a prefix are delivery order, not priority (K1 is delivered before K2)
- Seq is independent of the # column (task ID) — a task can be #57 with Seq K3
- When sorting by Seq in the dashboard, tasks are sorted by prefix alphabetically, then by number numerically
- Seq numbers do not need to be contiguous — gaps are fine (K1, K3, K7 is valid)
- Seq reflects *intended* delivery order, not commitment — re-sequence as priorities shift

### Adding a new Seq

1. Look at existing Seq values for the project prefix
2. Assign the next available number
3. If it needs to be delivered before an existing item, insert between existing numbers (use gaps)

## Task Naming Convention

All tasks are prefixed with the project name for scannability:

```
KB: Add audit logging for page edits
Applyr: Phase 5b.10 — resume header layout
ToDo: Define feature areas for task management
```

This makes the task list scannable when viewed in the dashboard or when filtered across projects.

## Priority Levels

| Priority | Meaning | When to use |
|---|---|---|
| P1 | Do Next | Currently in progress or next in the delivery queue. Active sprint work. |
| P2 | Important, Not Blocking | Planned work that is not blocking anything right now. Next up after current P1s complete. |
| P3 | Backlog / Someday | Ideas, nice-to-haves, future work. May never be done. Not blocking anything. |

### Moving between priorities

- P3 → P2: When the work becomes relevant to the current roadmap
- P2 → P1: When it is next in the delivery sequence and dependencies are met
- P1 → Completed: When done — move row to Completed table with date
- Any → Strikethrough: If superseded or no longer relevant, strikethrough the row (`~~text~~`) then move to Completed with a note

## Feature Areas

Feature Areas group related tasks within a project. They sit between project-level and task-level granularity.

The current Knowledge Platform Feature Areas are defined in the MASTER-TODO file itself (the "Knowledge Platform Feature Areas" table). Other projects will define their own feature areas as they mature.

Feature Areas map to the work hierarchy:

```
Project → Feature Area → Story → Task → Bug Fix
```

- **Feature Area**: A capability domain (e.g., "Search & Discovery", "Editing & Authoring")
- **Story**: A user-facing deliverable within a feature area (each MASTER-TODO row is typically a story)
- **Task**: A development session's work — a story may take 1-3 sessions
- **Bug Fix**: A defect found during or after a story

## Dependencies

Dependencies are tracked as task numbers in the "Depends on" column:

- `—` means no dependencies
- `#33` means depends on task 33
- `#33, #60` means depends on both tasks 33 and 60

The Dependencies Map section at the bottom of the file provides an ASCII diagram showing the dependency graph grouped by feature area.

## Process

### Adding a task during a session

1. Read the current MASTER-TODO.md
2. Determine: project, priority, feature area, dependencies
3. Assign the next available # and appropriate Seq
4. Add the row to the correct priority table
5. Update the Dependencies Map if the task has or creates dependencies
6. Update the Current Sequencing diagram if it affects delivery order

### Completing a task

1. Remove the row from the active table
2. Add it to the Completed table with the completion date
3. Check if any other tasks depended on it — update their "Depends on" if unblocked
4. Update the Dependencies Map

### Cross-project modification boundary

Per the global CLAUDE.md rule: if a bug or issue is found in a project that is not the active session's project, add it to MASTER-TODO.md rather than fixing it directly. The correct project session handles it through the pipeline.

## Dashboard

The Todo Viewer dashboard at `localhost:3333` reads MASTER-TODO.md and provides:

- Filterable task cards (by project, priority)
- Sort by delivery sequence (Seq)
- Dependency map and sequencing views
- Big Picture and Completed views
- Stats summary (P1/P2/P3/Completed counts)

See `products/todo-viewer/overview.md` for full dashboard documentation.

## Migration Path

When the ToDo app is production-ready:

1. Each MASTER-TODO row becomes a task record in PostgreSQL
2. The # column maps to a task ID
3. Seq maps to a `delivery_order` or `sequence` column
4. Feature Area maps to a foreign key on a `feature_areas` table
5. Dependencies map to a `task_dependencies` junction table
6. Priority maps to a `priority` enum column
7. The dashboard views (filter, sort, dependency map) become native ToDo app features
8. MASTER-TODO.md is retired and the Todo Viewer is decommissioned
