---
title: Sprint Tracker
status: published
order: 30
author: both
parent: overview
created: 2026-03-06
updated: 2026-03-06
---

# Sprint Tracker

Interactive sprint tracking for the Master Todo Viewer. Decouples sprint status from MASTER-TODO.md using a JSON sidecar file.

Built in session 60 (#82). Multi-sprint tracking planned as #92.

## How It Works

MASTER-TODO.md remains the backlog and sprint item catalog. The `sprint.json` sidecar stores status overrides only. The server reads both files and merges them on every API request.

### Why JSON, not more markdown

- Status changes need write-back — markdown parsing for writes is fragile
- JSON maps directly to the ToDo app's database schema
- The viewer gets a PATCH endpoint, not sed commands

## Data Model (as built)

```json
{
  "sprint": "Current",
  "items": {
    "82": "in_progress",
    "44": "pending",
    "81": "done"
  }
}
```

The format is minimal: item number as key, status as value. The server auto-seeds this file from the MASTER-TODO sprint table if it does not exist.

### Status values

| Status | Emoji | Meaning |
|---|---|---|
| `pending` | ⬜ | Not started |
| `in_progress` | 🔄 | Currently being worked on |
| `done` | ✅ | Completed |

Status cycles: pending → in_progress → done → pending (on click).

## Delivered Features (session 60)

| Feature | Status | Description |
|---|---|---|
| sprint.json sidecar | Done | Auto-seeds from markdown, status overrides merged into API response |
| Sprint list view | Done | Ordered list with clickable status toggle buttons |
| Board view | Done | Three-column kanban (Pending, In Progress, Done) with progress bar |
| Status toggle | Done | Click to cycle status, PATCH writes to sprint.json, optimistic UI |
| PATCH endpoint | Done | `PATCH /api/sprint/:num` with validation |

## API

| Route | Method | Body | Response |
|---|---|---|---|
| `/api/todos` | GET | — | Full parsed data with sprint overrides applied |
| `/api/sprint/:num` | PATCH | `{"status": "pending\|in_progress\|done"}` | `{"num", "status", "emoji"}` |

## Server Implementation

Key functions in `server.js`:

- `readSprintJson()` / `writeSprintJson()` — file I/O
- `seedSprintJson(sprintItems)` — creates sprint.json from markdown sprint table
- `applySprintOverrides(parsedData)` — merges sprint.json statuses into parsed markdown data
- `emojiToStatus(emoji)` — converts markdown emoji to status key

## Frontend Implementation

Key functions in `index.html`:

- `toggleStatus(item, btn)` — sends PATCH, updates local data, re-renders
- `renderBoard()` — three-column kanban with progress bar and column counts
- `renderSprint()` — list view with clickable status buttons (replaces static emoji)
- `emojiToStatusKey(emoji)` / `STATUS_CYCLE` — status cycling logic

## Planned: Multi-Sprint Tracking (#92)

Design notes from session 60 (deferred):
- Multi-sprint sprint.json format with ISO week IDs
- Self-contained item metadata per sprint
- Sprint lifecycle (open/closed)
- Sprint selector in UI
- Read-only historical sprints
- Claude-managed sprint creation

## Migration to ToDo App

When the ToDo app is production-ready:

1. Read `sprint.json` items
2. Bulk import via `POST /api/tasks`:
   - Item number → `external_ref` (MASTER-TODO linkage)
   - `status` → `status` (same enum)
3. Active sprint items become the initial "Today" view
4. Retire the sprint.json file and todo-viewer

## Related

- Master Todo Viewer overview: `products/todo-viewer/overview.md`
- MASTER-TODO conventions: `products/todo-viewer/master-todo-conventions.md`
- ToDo app: `products/todo/`
- Context hygiene: `operations/engineering-practice/context-hygiene.md`
