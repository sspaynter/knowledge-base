---
title: Session Integration
parent: technical
order: 40
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# Session Integration — Workflow

**Type:** Workflow documentation
**Workspace:** Products
**Section:** ToDo / Workflows
**Stories:** S-E05 (session context load), S-E06 (auto task update), S-E07 (session brain dump)
**Feature area:** `feature-areas/ai-layer.md` (sub-system 3 — Claude session integration)
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude

---

## What this workflow does

When Claude Code starts a work session on any SS42 project, it connects to the ToDo API to load the current state of all tasks and containers. During the session, Claude updates task statuses automatically as work is completed, and submits new ideas or outcomes via the Inbox. This happens without Simon having to manually brief Claude or update tasks himself.

This is the "auto-apply tier" — session work is trusted and applied without a review gate.

---

## Auth model

Session integration uses a separate auth path from the web session:

- **Web app (Simon's browser):** Google OAuth via Passport.js session cookie
- **Claude Code (API access):** Bearer token stored in the ToDo `api_tokens` table

The Bearer token is stored in the project's `CLAUDE.md` or environment. Claude Code sends it as `Authorization: Bearer {token}` on every API call. Token rotation is manual in v1 — Simon regenerates if the token is compromised.

**Separation of concerns:** A compromised API token only grants access to ToDo data. It cannot access the web session, Google OAuth, or any other SS42 app.

---

## The three endpoints

| Endpoint | Method | When Claude calls it | What it does |
|---|---|---|---|
| `/api/v1/claude/context` | GET | Session start | Load all containers and active items |
| `/api/v1/claude/items/:id` | PATCH | Task completed | Update task status + write activity log |
| `/api/v1/claude/inbox` | POST | New idea/outcome agreed | Submit brain dump to Inbox |

---

## Full session flow

### Session start

```
Claude Code starts a work session
         │
         ▼
Claude calls GET /api/v1/claude/context
  Bearer token in Authorization header
         │
     ┌───┴──────────────────────────────┐
     │ 200 OK                           │ Non-200 / timeout
     ▼                                  ▼
Context loaded:                    Claude logs the error.
  - all containers                 Session continues using
    (name, type, status)           conversation history as
  - all items                      context. Claude tells Simon:
    (title, status, estimate,      "Could not load ToDo context
    container, item_type)          — working from conversation
  - recent activity log            history."
    (last 10 entries)
         │
         ▼
Claude has accurate project state.
No manual briefing from Simon needed.
Session begins.
```

**What "context" contains:**

```json
{
  "containers": [
    {
      "id": "uuid",
      "name": "ToDo",
      "type": "project",
      "status": "active"
    }
  ],
  "items": [
    {
      "id": "uuid",
      "title": "Build /api/v1/claude/context endpoint",
      "item_type": "task",
      "status": "In Progress",
      "estimate_minutes": 90,
      "container_id": "uuid",
      "container_name": "ToDo"
    }
  ],
  "activity_log": [
    {
      "timestamp": "2026-03-04T09:30:00Z",
      "action": "status_change",
      "item_title": "Scaffold Express app",
      "from_status": "In Progress",
      "to_status": "Done",
      "actor": "claude"
    }
  ]
}
```

---

### During a session — task update

```
Claude completes work on a task
         │
         ▼
Claude calls PATCH /api/v1/claude/items/:id
  { "status": "Done" }
  Bearer token in Authorization header
         │
     ┌───┴──────────────────────────────┐
     │ 200 OK                           │ Non-200 / timeout
     ▼                                  ▼
Task status updated in database.   Claude retries once after
Activity log entry created:        5 seconds.
  actor: claude                         │
  action: status_change             ┌───┴──────────────┐
  from_status: In Progress          │ Second attempt    │ Second attempt
  to_status: Done                   │ succeeds          │ fails
  timestamp: now                    ▼                   ▼
                               Task updated.       Claude notifies Simon:
                                               "Could not update task
                                               {title} — please update
                                               manually."
                                               Session continues.
```

**Fields PATCH can update:**
- `status` — any valid status string (To-Do, In Progress, Done, Blocked, Parked)
- `estimate_minutes` — if Claude discovers the original estimate was wrong
- `description` — if Claude fills in implementation notes

**Fields PATCH cannot update:**
- `item_type` — a Task stays a Task
- `container_id` — Claude cannot move items between containers
- `title` — Claude cannot rename tasks

**No review gate:** Task updates from Claude are applied immediately. This is the auto-apply tier. Simon trusts Claude's session updates because Simon directed the session work.

---

### During a session — brain dump

```
Claude and Simon agree on a new task,
outcome, or idea during the session
         │
         ▼
Claude calls POST /api/v1/claude/inbox
  {
    "text": "Need to add error handling to the
             Claude context endpoint — currently
             silent fails with no user notification",
    "source": "claude-session"
  }
  Bearer token in Authorization header
         │
     ┌───┴──────────────────────────────┐
     │ 200 OK                           │ Non-200 / timeout
     ▼                                  ▼
inbox_entry created:               Claude retries once.
  status: Raw                           │
  source: claude-session            ┌───┴──────────────┐
  raw_text: [the text above]        │ Retry succeeds    │ Retry fails
  (AI analysis not auto-triggered   ▼                   ▼
   — Simon triggers manually or  Inbox item        Claude outputs the brain
   it is processed next time     created.          dump in conversation:
   Simon opens the app)                            "Could not submit to
         │                                         ToDo — brain dump:
         ▼                                         [text]
Appears in Raw Capture tab                         Please add manually."
in Inbox. Source badge: Claude.
         │
         ▼
Simon reviews via standard Inbox flow:
  "Process ✦" triggers AI analysis
  Accept / Edit / Reject
```

**Why brain dumps go through Inbox (not direct task creation):**

Session work (PATCH) is trusted — Simon directed Claude to do the work, so when Claude marks a task Done, it is done. But new ideas that come up during a session are different — they may be half-formed, may duplicate existing tasks, or may need to be placed in a container Simon has not thought about yet. Routing them through Inbox preserves the review gate for this category.

---

## How this connects to the rest of the system

```
Claude Code session (external)
         │
         │ Bearer token
         ▼
/api/v1/claude/* (3 endpoints)
         │
         ├── GET /context ────────── reads: containers + items + activity_log
         │
         ├── PATCH /items/:id ─────── writes: item.status + activity_log
         │                            (auto-apply, no review gate)
         │
         └── POST /inbox ──────────── writes: inbox_entry (Raw)
                                      triggers: standard Inbox review flow
                                      (review gate applies)
```

The boundary between auto-apply and review gate is the fundamental design principle of this integration:
- **Claude acting on work Simon directed** → auto-apply (PATCH)
- **Claude proposing new work or ideas** → review gate (POST to Inbox)

---

## Error states summary

| Failure | What happens | Recovery |
|---|---|---|
| GET /context fails at session start | Session continues from conversation history | Claude notifies Simon. No blocker. |
| PATCH /items/:id fails once | Automatic retry after 5 seconds | |
| PATCH /items/:id fails twice | Claude notifies Simon to update manually | Simon updates via the web app |
| POST /inbox fails twice | Claude outputs brain dump text in conversation | Simon copies and adds manually via web app |
| Bearer token expired / invalid | 401 Unauthorized on any endpoint | Simon regenerates token via Settings → API token management (v2). In v1: regenerate via admin script. |

---

## v1 limitations

- **No session summary:** At the end of a session, no automatic summary is written to the activity log. This is S-E08 in the v2 backlog.
- **No MCP server:** Claude accesses ToDo via REST endpoints, not an MCP server. MCP would allow richer integration (resources, tools, prompts) but adds infrastructure complexity not appropriate for v1.
- **Token rotation is manual:** No UI for generating or rotating the API token in v1. Admin script only. Settings → API token management is a v2 feature.
- **Context is full snapshot:** GET /context returns all containers and items. For large task lists (100+ items), this response will be large. In v2, scope to the active project or add a `?project={id}` filter.

---

## Setup reference (implementation note)

To enable session integration, the following is required before first use:

1. The `api_tokens` table must exist in the `todo` schema with at least one token for the `claude` app
2. The token must be stored in the project's `CLAUDE.md` or Claude Code environment
3. The three endpoints must be deployed and protected with Bearer token middleware
4. Claude Code must call GET /context at the start of every session (this is a convention documented in the project CLAUDE.md, not enforced by the app)

The project `CLAUDE.md` for ToDo will include:
```
## API integration
Bearer token: stored in ~/.env or environment
Endpoints: todo.ss-42.com/api/v1/claude/*
Call GET /context before starting any session work.
```

---

## References

- Feature area spec (canonical): `feature-areas/ai-layer.md` — sub-system 3
- All other AI workflows: `workflows/ai-processing.md`
- Inbox flow: `workflows/slack-ingest.md`, `feature-areas/inbox.md`
- Settings (API token management): `feature-areas/settings.md`
