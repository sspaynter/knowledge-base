---
title: Dev Server Architecture
status: draft
author: both
created: 2026-03-05
updated: 2026-03-05
parent: overview
---

# Dev Server Architecture

The Dev Server is a Node.js application running natively on the Mac Studio. It is the core orchestration component of the Development Platform.

## Responsibilities

1. **Task management** — Accept tasks (from web UI initially, ToDo API later), queue them, track status
2. **Brief assembly** — Read project files referenced in the task, build a self-contained prompt that includes actual code (not just file paths)
3. **Worker spawning** — Run `claude -p` as child processes with appropriate guardrails
4. **Branch isolation** — Create a git branch per task, ensure workers operate only on their branch
5. **Result collection** — Parse JSON output, capture diffs, test results, cost
6. **Gate tracking** — Track which lifecycle gate each feature is at, enforce build-gate rules
7. **Dashboard** — Web UI for task submission, status monitoring, result review, gate management

## Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20 | Matches all SS42 projects |
| Framework | Express | Standard across all SS42 apps |
| Database | SQLite (better-sqlite3) | Local app, not NAS-deployed |
| Frontend | Vanilla JS, ES6 modules | SS42 conventions, no bundler |
| Auth | None for MVP | LAN-only access |
| Process management | Node.js `execFile` | Safe child process spawning |
| Git operations | Git CLI via `execFile` | Branch, diff, merge, delete |

## Project structure

```
dev-server/
├── package.json
├── server.js
├── CLAUDE.md
├── services/
│   ├── database.js            — SQLite schema + connection
│   ├── task-manager.js        — CRUD for tasks, status transitions
│   ├── brief-builder.js       — Reads project files, assembles worker prompts
│   ├── worker-spawner.js      — Spawns claude -p, manages child processes
│   ├── git-manager.js         — Branch create/diff/merge/delete
│   └── result-collector.js    — Parses JSON output, stores results
├── presets/
│   ├── researcher.json
│   ├── designer.json
│   ├── builder.json
│   └── reviewer.json
├── routes/
│   ├── tasks.js               — CRUD API for tasks
│   ├── workers.js             — Start/stop/status of workers
│   └── health.js
├── public/
│   ├── index.html             — SPA shell
│   ├── css/styles.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       └── config.js
├── tests/
└── data/
    └── dev-server.db          — SQLite (gitignored)
```

## Database schema

### tasks
Tracks individual work items. Each task has a project, worker level, and status.

Key fields: id, title, description, project, worker_level (research/design/build/review), file_paths (JSON array), spec_ref, acceptance_criteria, status (pending/claimed/running/done/failed/merged/discarded), branch_name, source (manual/todo-api).

### results
Stores worker output for each completed task.

Key fields: task_id, session_id, worker_output (full JSON), summary, diff, test_output, cost_usd, turns_used, duration_ms.

### projects
Registered projects with their repo paths on the Mac Studio.

Key fields: name, repo_path, default_branch, claude_md_path.

### features
Tracks lifecycle gates per feature.

Key fields: id, project, name, current_gate (ideation through released), problem_doc, flows_doc, prototype_path, architecture_doc, plan_ref.

### gate_approvals
Records when Simon approved each gate.

Key fields: feature_id, gate, approved_at, notes.

### escalations
Cross-project issues flagged by workers.

Key fields: task_id, type (bug/dependency/config-change/skill-update/cross-project), project, description, status (pending/actioned/dismissed).

### worker_runs
Tracks running and completed worker processes.

Key fields: task_id, pid, status (running/completed/failed/killed), exit_code.

## Brief assembly

The brief builder is the most critical service. It reads project files and includes their contents in the prompt, so the worker does not need to explore or build up context.

**Assembly steps:**
1. Start with the task objective (one sentence)
2. Read each referenced file and embed its full content
3. Include acceptance criteria (WHEN/THEN format)
4. Include boundaries (what the worker must not touch)
5. Include protected paths instruction
6. Include the structured output schema (with escalations field)

The result: a self-contained prompt that a fresh `claude -p` process can execute without any session memory.

## Dashboard views

1. **Task Queue** — List of tasks with status badges. "New Task" button.
2. **Task Detail** — Brief, worker output, diff viewer, test results, cost, escalations. Merge/Discard buttons.
3. **Active Workers** — Running workers with elapsed time and turn count.
4. **Features** — Gate tracker per feature showing progress through lifecycle stages.
5. **Escalations** — Cross-project flags pending review.
6. **Projects** — Registered projects with repo paths.

## How workers are spawned

1. Dev Server creates git branch `worker/{task-id}` in the project repo
2. Checks out the new branch
3. Assembles the brief (reads files, builds prompt)
4. Spawns `claude -p` via `execFile` with preset arguments (tools, budget, turns, model, output format)
5. Sets `cwd` to the project repo directory
6. Collects stdout as JSON
7. On process exit: parses result, captures diff, stores in database
8. Returns to default branch (worker branch remains for review)
9. Updates task status to done or failed
