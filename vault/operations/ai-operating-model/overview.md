# AI Operating Model — Overview

## What Is This

The AI Operating Model is the framework that governs how Simon Paynter builds,
operates, and extends his personal AI environment. It covers the infrastructure
that hosts it, the tools that run on it, the processes for building new
capability, and the strategic direction for where it is going.

This is not a tool list. It is the operating model — the pattern that makes
the whole thing repeatable, extensible, and coherent across projects and
businesses.

---

## The Problem It Solves

Most AI tool usage is ad hoc: open a chat window, ask something, close it,
lose the context. Every session starts from zero. There is no institutional
memory, no reusable process, and no way to scale what works.

The AI Operating Model solves for:

- **Context loss** — knowledge built in one session is available in the next
- **Inconsistent execution** — structured build pipeline enforces quality and
  repeatability
- **No ambient access** — work currently requires sitting at a specific machine
- **Manual everything** — automations run on a schedule or on command, not
  intelligently
- **No repeatable delivery** — each project or client engagement starts from
  scratch

---

## Current State

### Interactive Layer — Claude Code

Claude Code is the primary interactive development environment. It runs on
the local Mac, communicates with the Anthropic API, and is the tool used for
all active build work.

The Claude Code setup is layered:

| Layer | What it contains |
|---|---|
| Global config (`~/.claude/`) | Working style, communication preferences, global skills |
| Skills library | 15+ reusable knowledge modules: job search, PM, cover letters, NAS ops, app scaffold, KB |
| Agent pipeline | researcher → builder → reviewer — structured three-phase build loop |
| Memory system | MEMORY.md (auto-loaded) + topic files — persistent context across sessions |
| SDD conventions | Spec references in every plan task, SPEC.md files for generative output |
| Project CLAUDE.mds | Per-project context loaded on top of global config |

Claude Code is session-based: you initiate it, work within the session, and
context is managed deliberately via memory files and skills. It is optimised
for build work — not ambient operation.

### Automation Layer — n8n

n8n runs on the QNAP NAS and handles all structured, scheduled, and
event-driven automation.

Current active workflows:
- Job alert discovery (Gmail → parse → Haiku triage → Sonnet score → PostgreSQL)
- Job capture webhook (Claude Code → n8n → PostgreSQL)

n8n is the integration backbone. Claude Code writes to it. Apps read from it.
It is the single point where external data enters the system.

### Infrastructure Layer — QNAP NAS

The NAS runs all hosted services via Container Station (Docker). Containers
communicate on a private NAT network (10.0.3.x). External access is via
Cloudflare Tunnel — no open ports on the home network.

**Current containers:**

| Service | Purpose |
|---|---|
| n8n | Automation workflows |
| n8n-postgres | Shared PostgreSQL database |
| NocoDB | No-code database UI |
| Applyr (staging) | Job tracking SPA |
| Knowledge Base (staging + prod) | Documentation platform |
| Watchtower | Automatic container updates on image push |

**CI/CD pattern:** Push to `dev` branch → GitHub Actions builds Docker image →
pushes to GHCR → Watchtower pulls and redeploys staging container
automatically. Production requires merge to `main`.

### Applications Built

| App | Status | Description |
|---|---|---|
| Applyr | Phase 2 live (staging) | Job tracking SPA with Google OAuth, review queue, pipeline |
| Knowledge Base v2 | Phase 1 live (staging + prod) | Vault-backed docs platform with Mermaid, Google OAuth SSO |
| n8n job pipeline | Live (production) | Automated job discovery and AI scoring |

All applications share a common auth layer (`shared_auth` schema in
PostgreSQL), a common subdomain pattern (`*.ss-42.com`), and a common build
pipeline.

### Build Process

All new capability follows the same pipeline:

1. **Brainstorm** — explore intent and design before any code
2. **Prototype** (UI work) — clickable HTML/CSS/JS to validate design
3. **Plan** — decompose into 2–5 minute tasks with file paths and acceptance
   criteria (spec-linked)
4. **Build** — builder agent follows TDD; reviewer agent verifies with real
   command output
5. **Deploy to staging** — push to `dev`; Watchtower deploys automatically
6. **Verify** — end-to-end test at `{project}-staging.ss-42.com`
7. **Release** — merge `dev` → `main`; tag and publish GitHub Release

---

## Future State

### Ambient Layer — OpenClaw on Mac Studio

The current setup requires sitting at a machine with Claude Code running.
The gap is ambient, always-on access — the ability to give instructions
from anywhere and get things done without opening a development session.

OpenClaw (https://openclaw.ai) fills this gap. It is a locally-hosted,
persistent AI agent that connects to Slack. It runs on the Mac Studio, has
access to local tools, files, and shell execution, and can call out to
Claude or local models depending on task type.

Slack is the chosen interface — accessible from any device, keeps
professional comms separated, and scales if others are brought in.

**Planned role of OpenClaw:**

| Function | How |
|---|---|
| Command interface | Slack — accessible from any device, anywhere |
| Ambient tasks | Proactive reminders, scheduled checks, background monitoring |
| Local execution | Run test suites, patch scripts, Patch Tuesday operations |
| n8n bridge | Call n8n webhooks for structured workflow steps |
| Model routing | Local models (Ollama) for fast/cheap tasks, Claude API for complex reasoning |

**What stays with Claude Code:** All active development, architecture, complex
build sessions. OpenClaw is the operator layer; Claude Code is the builder
layer.

### Session Orchestration — ToDo as Task Queue

The current Claude Code workflow requires manual session management: each
session re-establishes context from memory files and plan documents. This
creates overhead of 20-30 sessions per feature, with significant time spent
on re-explanation rather than execution.

The fix has two layers:

1. **Spec-first session handoff** (active now) — plan files produce
   build-ready tasks with five required fields (spec reference, file paths,
   code examples, test command, acceptance criteria). Each session reads the
   spec and executes one task. No exploration needed.

2. **ToDo as orchestration layer** (planned, depends on ToDo v4.0.0) —
   ToDo exposes a Claude API (`/api/v1/claude/*`) that sessions call to
   claim tasks, report completion, and log session summaries. An MCP server
   wraps these endpoints so Claude loads them as native tools. This replaces
   manual plan-file tracking with a machine-readable task queue that includes
   calendar awareness, dependency tracking, and AI-generated status summaries.

**Docs:**
- Workflow: `operations/engineering-practice/session-handoff-workflow.md`
- ToDo spec: `products/todo/orchestration-layer.md`
- Writing-plans upgrade: `operations/engineering-practice/writing-plans-upgrade.md`

### n8n + OpenClaw Integration

n8n handles structured, deterministic data flows. For steps that require
local tool access or local execution, OpenClaw acts as an agent within the
workflow:

```
n8n workflow
  → step requires local execution
  → HTTP POST to OpenClaw
  → OpenClaw executes locally (runs script, checks system, reads file)
  → returns result to n8n via webhook callback
  → workflow continues
```

n8n's native AI Agent node handles pure reasoning steps. OpenClaw handles
steps that need local access or ambient context.

### Model Routing Strategy

| Task type | Model |
|---|---|
| Quick commands, routing, scheduling | Local — Ollama on Mac Studio (fast, free, low stakes) |
| Code generation, architecture, complex reasoning | Claude Sonnet via API |
| Writing, cover letters, strategic output | Claude Sonnet via API |
| Classification, triage | Claude Haiku via API |
| File ops, calendar, simple lookups | Rule-based — no model needed |

### Client Delivery — AWS Infrastructure

Personal and client infrastructure are separated by design:

- **Mac Studio** — local development and operations workstation only.
  Nothing client-facing runs on it.
- **NAS** — self-hosted apps for personal use.
- **AWS** — isolated environments for client deployments (future).

Client engagements get their own isolated AWS environments. A new scaffold
pattern (equivalent to the current NAS app-scaffold) will define the standard
deployment template — ECS/Fargate, RDS, Secrets Manager, Cloudflare in front
— repeatable per engagement.

---

## Architecture Summary

```
Interface layer     Slack (via OpenClaw) — any device, anywhere
                              ↓
Agent layer         OpenClaw (Mac Studio, always-on, local models)
                              ↓
Execution layer     n8n workflows + Claude Code skills + app APIs
                              ↓
Data layer          PostgreSQL + KB vault + Applyr database
                              ↓
Hosting layer       NAS (personal) / AWS (client, future)

External access     Cloudflare Tunnel → *.ss-42.com
Auth                Google OAuth → shared_auth schema → all apps
CI/CD               GitHub → GHCR → Watchtower (NAS) / ECS deploy (AWS future)
```

---

## What Is Not Solved Yet

| Gap | Status |
|---|---|
| Session overhead across builds | Spec-first handoff active; ToDo orchestration planned (v4.0.0) |
| No mobile/ambient access | OpenClaw + Slack — planned, not yet deployed |
| No centralised logging across containers | Not yet designed |
| KB production still on username/password auth | Pending migration |
| Applyr production container not yet created | Pending |
| AWS scaffold pattern not yet designed | Future phase |
| Client delivery model not fully defined | Future phase |

---

## Related Articles

- Applyr — `products/applyr/overview.md`
- Knowledge Base v2 — `products/knowledge-base/overview.md`
- n8n Workflows — `operations/automation/n8n-overview.md`
- NAS Infrastructure — `operations/infrastructure/nas-overview.md`
- AI Operating Model — Decision Log *(to be created)*
- AI Operating Model — Roadmap *(to be created)*
