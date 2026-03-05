---
title: ToDo Integration
status: draft
author: both
created: 2026-03-05
updated: 2026-03-05
parent: overview
---

# ToDo Integration

The ToDo app (on NAS, PostgreSQL) is the task source for the Dev Server. This page defines the integration contract between the two systems.

## Required API endpoints

The Dev Server needs these endpoints from the ToDo app:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/claude/tasks` | GET | Query tasks by project and status. Returns tasks with spec_ref, acceptance_criteria, file paths. |
| `/api/v1/claude/claim` | POST | Claim a task for execution. Returns 409 if already claimed. |
| `/api/v1/claude/complete` | POST | Mark task done. Body: commit_sha, summary, session_id. |
| `/api/v1/claude/session/start` | POST | Create session log entry. |
| `/api/v1/claude/session/end` | POST | Close session log with summary. |

These endpoints are already specified in the [ToDo orchestration layer](../todo/orchestration-layer.md) design document.

## Required task fields

For the Dev Server to assemble worker briefs, each task must include:

| Field | Type | Purpose |
|---|---|---|
| id | string | Unique identifier |
| title | string | Human-readable task name |
| description | text | What needs to be done |
| project | string | Which project (applyr, knowledge-base, todo, job-app) |
| worker_level | enum | research, design, build, review |
| file_paths | string[] | Files the worker should read/modify |
| spec_ref | string | SDD reference (e.g., requirements.md § US-3) |
| acceptance_criteria | text | WHEN/THEN format |
| priority_order | float | Execution order |
| status | string | Lifecycle state |

## Task status lifecycle

```
Ready → Claimed → Running → Done | Failed
                              ↓
                        Review (Simon)
                              ↓
                        Merged | Discarded
```

- **Ready:** Task is defined and approved, waiting for execution
- **Claimed:** Dev Server has taken the task (409 prevents double-claiming)
- **Running:** Worker is executing
- **Done/Failed:** Worker finished or errored
- **Merged/Discarded:** Simon approved or rejected the result

## Authentication

- Bearer token stored in ToDo's `api_tokens` table
- Dev Server stores the token in its local `.env` file
- Token provides access to ToDo data only — not to other apps
- Token rotation is manual in v1

## Interim (before ToDo is built)

The Dev Server MVP works without ToDo:

- Web form in the dashboard for manual task creation
- Tasks stored in local SQLite
- Same fields as above
- When ToDo ships, the Dev Server switches to polling the ToDo API
- Manual task creation remains as a fallback

## Escalation routing

When a worker flags an escalation (cross-project issue, skill update needed, etc.):

- **Without ToDo:** Shown in dashboard. Simon manually adds to MASTER-TODO.md.
- **With ToDo:** Auto-created as inbox item via `POST /api/v1/claude/inbox` with `source: "worker-escalation"`. Goes through the standard Inbox review gate.

## Network path

Dev Server (Mac Studio, 192.168.86.x) → ToDo API (NAS, 192.168.86.18:port) — direct LAN, no tunnel needed.
