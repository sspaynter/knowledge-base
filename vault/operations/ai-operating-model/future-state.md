---
title: Future State
status: published
author: both
parent: overview
created: 2026-03-13
updated: 2026-03-13
---

# Future State

The current setup works but requires manual session management and physical presence at the Mac. The future state adds ambient access, autonomous task execution, and a clear separation between personal and client infrastructure.

---

## Ambient Layer — Development Platform on Mac Studio

The current setup requires sitting at a machine with Claude Code running. The gap is ambient, always-on access — the ability to define tasks from anywhere and get things done without manually managing development sessions.

The **SS42 Development Platform** fills this gap. It is a Node.js server running on the Mac Studio that spawns Claude Code workers (`claude -p`) with guardrails. It replaces the OpenClaw concept with a solution built entirely on Claude Code's native capabilities — no third-party agent framework needed.

**Key components:**

| Component | What it does |
|---|---|
| Dev Server | Always-on Node.js process on Mac Studio. Accepts tasks, spawns workers, collects results, serves dashboard. |
| Workers | `claude -p` child processes with restricted tools, budget caps, turn limits. Each operates on an isolated git branch. |
| Dashboard | Web UI accessible from any device on LAN. Task submission, result review, gate management. |
| ToDo integration | Tasks flow from ToDo app (NAS) to Dev Server. Results flow back. |

**Four worker types:**

| Worker | Purpose |
|---|---|
| Researcher | Read-only analysis |
| Designer | Creates design artifacts (problem statements, PRDs, user flows, prototypes) |
| Builder | Implements code changes on isolated branches |
| Reviewer | Runs tests and reviews code quality |

**No API key required.** Workers use the Max plan via `claude -p` — same subscription as interactive sessions.

**Full documentation:** `products/development-platform/overview.md`

---

## Session Orchestration — ToDo as Task Queue

The current Claude Code workflow requires manual session management: each session re-establishes context from memory files and plan documents. This creates overhead of 20-30 sessions per feature, with significant time spent on re-explanation rather than execution.

The fix has two layers:

1. **Spec-first session handoff** (active now) — plan files produce build-ready tasks with five required fields (spec reference, file paths, code examples, test command, acceptance criteria). Each session reads the spec and executes one task. No exploration needed.

2. **ToDo as orchestration layer** (planned, depends on ToDo v4.0.0) — ToDo exposes a Claude API (`/api/v1/claude/*`) that sessions call to claim tasks, report completion, and log session summaries. An MCP server wraps these endpoints so Claude loads them as native tools. This replaces manual plan-file tracking with a machine-readable task queue that includes calendar awareness, dependency tracking, and AI-generated status summaries.

**Docs:**
- Workflow: `operations/engineering-practice/session-handoff-workflow.md`
- ToDo spec: `products/todo/orchestration-layer.md`
- Writing-plans upgrade: `operations/engineering-practice/writing-plans-upgrade.md`

---

## n8n + Dev Server Integration

n8n handles structured, deterministic data flows. For steps that require local tool access or AI-driven execution, n8n triggers the Dev Server:

```
n8n workflow
  → step requires AI execution
  → HTTP POST to Dev Server (Mac Studio, LAN)
  → Dev Server spawns claude -p worker with guardrails
  → worker executes, result collected
  → Dev Server returns result via callback
  → workflow continues
```

This replaces the original OpenClaw integration pattern with the same data flow, using Claude Code workers instead of a separate agent framework.

---

## Model Routing Strategy

For full model strategy analysis including cloud vs local, open-weight models, and industry trends, see [Model Strategy](/page/operations/ai-operating-model/model-strategy).

| Task type | Model |
|---|---|
| Code generation, architecture, complex reasoning | Claude Sonnet (via `claude -p`, Max plan) |
| Writing, cover letters, strategic output | Claude Sonnet (via `claude -p`, Max plan) |
| Read-only analysis, research | Claude Haiku (via `claude -p`, Max plan) |
| Classification, triage (n8n pipeline) | Claude Haiku (via API, n8n HTTP nodes) |
| File ops, calendar, simple lookups | Rule-based — no model needed |

---

## Client Delivery — AWS Infrastructure

Personal and client infrastructure are separated by design:

- **Mac Studio** — local development and operations workstation only. Nothing client-facing runs on it.
- **NAS** — self-hosted apps for personal use.
- **AWS** — isolated environments for client deployments (future).

Client engagements get their own isolated AWS environments. A new scaffold pattern (equivalent to the current NAS app-scaffold) will define the standard deployment template — ECS/Fargate, RDS, Secrets Manager, Cloudflare in front — repeatable per engagement.

---

## Architecture Summary

```
Interface layer     Dashboard (LAN browser) + ToDo (any device)
                              ↓
Agent layer         Dev Server (Mac Studio, always-on, Claude Code workers)
                              ↓
Execution layer     n8n workflows + Claude Code workers + app APIs
                              ↓
Data layer          PostgreSQL + KB vault + Applyr database + SQLite (Dev Server)
                              ↓
Hosting layer       NAS (personal) / Mac Studio (dev) / AWS (client, future)

External access     Cloudflare Tunnel → *.ss-42.com
Auth                Google OAuth → shared_auth schema → all apps
CI/CD               GitHub → GHCR → Watchtower (NAS) / ECS deploy (AWS future)
Dev workers         claude -p on Max plan (no API key)
```

---

## Related

- [AI Operating Model — Overview](/page/operations/ai-operating-model/overview)
- [Current State](/page/operations/ai-operating-model/current-state)
- [Model Strategy](/page/operations/ai-operating-model/model-strategy)
- [Roadmap](/page/operations/ai-operating-model/roadmap)
