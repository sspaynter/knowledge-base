---
title: Orchestration Layer
parent: technical
order: 10
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# ToDo — Claude Code Orchestration Layer

**Last updated:** 2026-03-04
**Status:** Planned — not yet built. Depends on ToDo v4.0.0 core (Gate 4+).
**Related:** `operations/engineering-practice/session-handoff-workflow.md`

---

## What This Is

A set of schema additions and API endpoints that turn ToDo into the persistent orchestration layer for Claude Code sessions. Instead of managing session context manually, Claude reads tasks from ToDo, claims work, implements, verifies, and reports completion — all via API.

This replaces the manual "read plan file, find unchecked task, re-explain context" pattern with a machine-readable task queue.

---

## Why ToDo (Not GitHub Issues)

| Capability | GitHub Issues | ToDo |
|---|---|---|
| AI intake / breakdown | No | Brain dump → AI-proposed structure → human gate |
| Feedback loops | Comments only | Applyr-style inline annotation → `feedback_log` |
| Calendar awareness | No | Google Calendar time-blocking + capacity |
| Spec references | Manual (in issue body) | `spec_ref` field on items |
| Dependency tracking | Manual labels | `item_dependencies` join table (DAG) |
| Session tracking | None | `session_id` on items + `session_log` table |

---

## Schema Additions

These sit on top of the existing v4.0.0 data model (containers, items, inbox, dependencies).

### 1. `spec_ref` on `items` table

```sql
ALTER TABLE items ADD COLUMN spec_ref TEXT;
```

- Example: `"requirements.md § US-3 — Email notifications on new match"`
- Format: `{file} § {section-id} — {human-readable label}`
- Nullable. Only set for items linked to a design doc section.
- Matches SDD `spec:` convention from plan files.

### 2. `acceptance_criteria` on `items` table

```sql
ALTER TABLE items ADD COLUMN acceptance_criteria TEXT;
```

- Example: `"WHEN a new strong match is saved THEN user receives email within 30 seconds"`
- Format: WHEN/THEN/AND (EARS notation). Multiple criteria separated by newlines.
- Claude self-verifies against these before marking a task complete.

### 3. `session_id` on `items` table

```sql
ALTER TABLE items ADD COLUMN session_id TEXT;
```

- Set when a Claude session claims a task, cleared on completion.
- Prevents two sessions from working on the same task.
- Enables "what is Claude working on right now?" visibility.

### 4. `session_log` table

```sql
CREATE TABLE session_log (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  project TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  status TEXT DEFAULT 'active',
  summary TEXT,
  items_completed JSONB DEFAULT '[]',
  commits JSONB DEFAULT '[]'
);
```

- Persistent record of what each Claude session accomplished.
- Feeds the "what happened today?" summary and AI status panels.
- Replaces manual session log in memory files.

---

## Claude API Endpoints

Add to the existing `/api/v1/` routes. Separate from user-facing routes.

```
GET  /api/v1/claude/tasks?project={name}&status=ready
     Returns items with status "Ready", ordered by priority.
     Includes spec_ref, acceptance_criteria, file paths.
     Claude reads this at session start.

POST /api/v1/claude/claim
     Body: { item_id, session_id }
     Sets session_id on item, changes status to "In Progress".
     Returns 409 if already claimed.

POST /api/v1/claude/complete
     Body: { item_id, session_id, commit_sha, summary }
     Clears session_id, changes status to "Done".
     Appends to session_log.items_completed.

POST /api/v1/claude/session/start
     Body: { session_id, project }
     Creates session_log entry.

POST /api/v1/claude/session/end
     Body: { session_id, summary }
     Updates session_log with ended_at, summary, final status.
```

**Auth:** API key header (`X-Claude-API-Key`). Separate from user session auth. Same pattern as existing admin auth.

---

## MCP Server (Phase 2 — after core API)

Wrap Claude API endpoints as MCP tools:

| MCP Tool | Maps to |
|---|---|
| `todo_get_tasks` | `GET /api/v1/claude/tasks` |
| `todo_claim_task` | `POST /api/v1/claude/claim` |
| `todo_complete_task` | `POST /api/v1/claude/complete` |
| `todo_start_session` | `POST /api/v1/claude/session/start` |
| `todo_end_session` | `POST /api/v1/claude/session/end` |

Register in `~/.claude.json` project configs. Claude loads tools automatically.

---

## Build Priority

| # | Task | Blocks | Effort |
|---|------|--------|--------|
| 1 | Add `spec_ref` column to items | Nothing | 10 min |
| 2 | Add `acceptance_criteria` column to items | Nothing | 10 min |
| 3 | Add `session_id` column to items | Nothing | 10 min |
| 4 | Create `session_log` table | Nothing | 15 min |
| 5 | Build Claude API endpoints (5 routes) | 1-4 | 2-3 hours |
| 6 | API key auth middleware for Claude routes | 5 | 30 min |
| 7 | MCP server wrapper | 5 | 2-3 hours |

**Total:** ~6 hours of build work. Tasks 1-4 are schema-only. Task 5 is the core. Tasks 6-7 are integration.

---

## How It Connects

```
Brain dump → ToDo Inbox → AI breakdown → Items with spec_ref + acceptance_criteria
                                              ↓
Claude session starts → GET /claude/tasks → claim → implement → verify → complete → commit
                                              ↓
Session ends → POST /claude/session/end → summary logged → next session picks up next task
```

---

## Dependencies

- ToDo v4.0.0 core (containers, items, inbox) must be built first
- PostgreSQL migration must be complete
- Google OAuth / shared_auth must be live
- These additions are additive — they do not change the core data model

---

## Traceability

- Opportunity: ToDo Opportunity Backlog — problem 10 (Claude session integration)
- Story Map: AI Layer activity area
- Feature area spec: `products/todo/feature-areas/ai-layer.md` (to be written)
