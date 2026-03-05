---
title: SS42 Development Platform
status: draft
author: both
created: 2026-03-05
updated: 2026-03-05
---

# SS42 Development Platform

## What this is

A system that changes how Simon works with AI on development projects. Instead of sitting in Claude Code sessions all day — managing context, watching builds, handling errors — Simon defines tasks and reviews results. The machine handles everything in between.

## The problem

1. **Session fragility** — Context degrades as sessions grow. Complex tasks require multiple sessions, each needing 20-30 minutes to re-establish context.
2. **Manual coordination** — Simon is the orchestrator. He reads the plan, pastes context into sessions, watches the work happen, handles errors, and tracks what is done.
3. **No isolation** — Sessions can touch any file in any project. There are no guardrails preventing unintended changes.
4. **Single device** — All work happens on the laptop in VS Code. No way to submit tasks from elsewhere or check progress from a phone.

## The solution

Three components working together:

| Component | Where | What it does |
|---|---|---|
| **ToDo App** | NAS (container, PostgreSQL) | Task source. Simon defines tasks, sets priorities, assigns worker levels. Exposes API for Dev Server. |
| **Dev Server** | Mac Studio (native, always-on) | Receives tasks, spawns Claude Code workers with guardrails, collects results, serves dashboard. |
| **Workers** | Mac Studio (child processes) | `claude -p` invocations with restricted tools, budget caps, and turn limits. Each operates on an isolated git branch. |

## Architecture

```
Simon's devices ─── browser ───┬─── ToDo App (NAS, PostgreSQL)
                               │         │
                               │    ┌────▼─────────────────────┐
                               └────│ Dev Server (Mac Studio)  │
                                    │                          │
                                    │  Workers (claude -p)     │
                                    │  ┌─────┐ ┌─────┐ ┌────┐ │
                                    │  │Rsrch│ │Dsgn │ │Bld │ │
                                    │  └─────┘ └─────┘ └────┘ │
                                    │                          │
                                    │  Dashboard (web UI)      │
                                    └──────────────────────────┘
                                              │
                                    Project repos (git clones)
```

- **No Cloudflare tunnel** between Mac Studio and NAS — direct LAN access
- **No API key** — workers use the Max plan via `claude -p` (same subscription as interactive sessions)
- **Dashboard** accessible from any device on the LAN

## Target workflow

**Morning (10 minutes):**
1. Open ToDo in browser (phone or laptop)
2. Review task queue — items already broken down with acceptance criteria
3. Select tasks for today, assign worker levels (research / design / build / review)
4. Tap "Run"

**While Simon does other things:**
- Dev Server picks up tasks and spawns workers
- Each worker operates on an isolated git branch with restricted tools
- Results are staged — nothing merges without approval

**When ready to review:**
1. Open Dev Server dashboard in browser
2. See completed tasks with status, cost, and summary
3. View diffs, test results, and worker output
4. Approve (merge branch) or discard (delete branch)

## Key design decisions

- **Workers use Claude Code CLI** (`claude -p`), not the Agent SDK. This uses the Max plan subscription — no separate API billing.
- **SQLite for Dev Server** state (local app). PostgreSQL for ToDo (NAS-deployed app).
- **Four worker types:** Researcher (read-only), Designer (docs and prototypes only), Builder (code changes), Reviewer (tests only).
- **Gate enforcement:** Build tasks cannot start until design gates are approved by Simon.
- **Escalation protocol:** Workers that discover cross-project issues flag them as ToDo items instead of acting on them.
- **This replaces the OpenClaw concept** in the AI Operating Model. Same role (ambient development layer on Mac Studio), but built with Claude Code instead of a third-party agent framework.

## Related pages

- [Development Lifecycle](development-lifecycle.md) — Gates, stages, review process
- [Worker Guardrails](worker-guardrails.md) — Four worker types, isolation, escalation protocol
- [Dev Server Architecture](dev-server.md) — Technical details
- [Mac Studio Setup](../../../operations/infrastructure/mac-studio-setup.md) — Hardware and software configuration
- [ToDo Integration](todo-integration.md) — How Dev Server talks to ToDo
- [MVP Scope](mvp-scope.md) — Minimum viable product definition

## Status

**Gate:** Design (in progress)
**Plan file:** `.claude/plans/precious-puzzling-pudding.md`
**Next:** Review documentation, create user flows, refine MVP definition, then plan → build
