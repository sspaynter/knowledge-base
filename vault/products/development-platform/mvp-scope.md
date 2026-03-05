---
title: MVP Scope
status: draft
author: both
created: 2026-03-05
updated: 2026-03-05
parent: overview
---

# MVP Scope

The minimum viable product to test the full Development Platform workflow end-to-end.

## What the MVP includes

| Component | In scope | Out of scope |
|---|---|---|
| **Mac Studio** | Always-on config, Node.js, Claude Code auth, project repos cloned | Docker isolation, Ollama |
| **Dev Server** | Express app, SQLite, task CRUD, worker spawning, result collection, web UI, feature + gate tracking | ToDo API integration, SSE streaming, auth |
| **Workers** | Four presets (researcher/designer/builder/reviewer), branch isolation, structured JSON with escalations | Chained pipelines (R→B→R), parallel execution |
| **Dashboard** | Task list, new task form, result viewer with diff and escalations, merge/discard, feature gate tracker, projects | Real-time updates, mobile layout, dark mode |
| **Lifecycle** | Feature creation, gate tracking, gate approval, build-gate enforcement | KB vault auto-sync, prototype serving, Questions queue |
| **ToDo** | Not required | Full integration is Phase 2 |

## MVP lifecycle coverage

| Stage | MVP support | How |
|---|---|---|
| Ideation | Manual — Simon creates a feature in dashboard | Feature creation form |
| Problem statement | Designer worker produces markdown, Simon reviews | Output displayed in dashboard |
| User flows | Designer worker produces markdown, Simon reviews | Output displayed in dashboard |
| Prototype | Manual — Simon creates prototypes as today | Not automated in MVP |
| Architecture | Designer worker produces markdown, Simon reviews | Output displayed in dashboard |
| Plan | Designer worker produces task list, Simon reviews and edits | Output becomes tasks in queue |
| Build | Builder worker executes on branch, Simon reviews diff | Full guardrails active |
| Review | Reviewer worker runs tests | Pass/fail shown in dashboard |
| Release | Manual — standard release process | Not automated |

## MVP user flow

1. Simon opens `http://192.168.86.x:3400` in browser
2. Registers a project (name + repo path on Mac Studio)
3. Creates a feature (name + description), which starts at the Ideation gate
4. Creates a task: selects project, writes description, picks worker level, optionally lists files
5. Clicks "Run"
6. Dev Server creates branch, assembles brief, spawns `claude -p`
7. Task status updates: pending → running → done/failed
8. Simon clicks into the result — sees summary, diff, cost, escalations
9. Clicks "Merge" (applies the branch to dev) or "Discard" (deletes the branch)
10. Advances the feature gate when design artifacts are approved

## What the MVP proves

- Workers execute isolated tasks without polluting the codebase
- Guardrails prevent unintended actions (tool restrictions enforced at CLI level)
- Results are reviewable before applying (branch isolation + dashboard)
- Simon does not need to be in a terminal session
- The lifecycle gate model works in practice
- Escalations are captured instead of acted on
- The pattern works for real development tasks

## Phased build-out

| Phase | Scope | Sessions |
|---|---|---|
| 0 | Mac Studio setup | 1 session |
| 1 | Dev Server MVP (foundation, worker engine, dashboard + lifecycle) | 3-4 sessions |
| 2 | ToDo API integration | 2-3 sessions |
| 3 | KB vault integration + design workflow automation | 2-3 sessions |
| 4 | Worker chaining (researcher → builder → reviewer pipeline) | 1-2 sessions |
| 5 | Parallel workers + scheduling | 2-3 sessions |
| 6 | Hardening (Docker, SSE, mobile, auth, cost tracking) | 2-3 sessions |

## Verification plan

### Phase 0
- `claude -p` returns valid JSON on Mac Studio
- Tool restrictions work (`--tools`, `--permission-mode plan`)
- All project repos accessible

### Phase 1 (MVP)
1. Register a project (e.g., knowledge-base)
2. Create a research task: "List all API endpoints in routes/"
3. Verify worker uses only read tools, produces report, costs under $1
4. Create a build task: "Add a comment to the health check route"
5. Verify worker creates branch, makes change, runs tests
6. Review diff in dashboard
7. Merge — verify branch merged into dev
8. Discard another task — verify branch deleted, no changes applied
9. Verify escalations are captured and displayed

### Phase 2
- Dev Server polls ToDo API and picks up a "Ready" task
- Result reported back to ToDo with updated status

### End-to-end
- Task created on phone (ToDo) → Dev Server picks it up → worker runs → result reviewed on laptop → merged → CI/CD deploys to staging
