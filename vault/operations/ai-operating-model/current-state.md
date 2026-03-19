---
title: Current State
status: published
author: both
parent: overview
created: 2026-03-13
updated: 2026-03-13
---

# Current State

The AI Operating Model today runs on three layers: an interactive development environment (Claude Code), an automation backbone (n8n), and a self-hosted infrastructure layer (QNAP NAS). All three are operational and producing real output.

---

## Interactive Layer — Claude Code

Claude Code is the primary interactive development environment. It runs on the local Mac, communicates with the Anthropic API, and is the tool used for all active build work.

The Claude Code setup is layered:

| Layer | What it contains |
|---|---|
| Global config (`~/.claude/`) | Working style, communication preferences, global skills |
| Skills library | 15+ reusable knowledge modules: job search, PM, cover letters, NAS ops, app scaffold, KB |
| Agent pipeline | researcher → builder → reviewer — structured three-phase build loop |
| Memory system | MEMORY.md (auto-loaded) + topic files — persistent context across sessions |
| SDD conventions | Spec references in every plan task, SPEC.md files for generative output |
| Project CLAUDE.mds | Per-project context loaded on top of global config |

Claude Code is session-based: you initiate it, work within the session, and context is managed deliberately via memory files and skills. It is optimised for build work — not ambient operation.

---

## Automation Layer — n8n

n8n runs on the QNAP NAS and handles all structured, scheduled, and event-driven automation.

Current active workflows:

- Job alert discovery (Gmail → parse → Haiku triage → Sonnet score → PostgreSQL)
- Job capture webhook (Claude Code → n8n → PostgreSQL)

n8n is the integration backbone. Claude Code writes to it. Apps read from it. It is the single point where external data enters the system.

---

## Infrastructure Layer — QNAP NAS

The NAS runs all hosted services via Container Station (Docker). Containers communicate on a private NAT network (10.0.3.x). External access is via Cloudflare Tunnel — no open ports on the home network.

**Current containers:**

| Service | Purpose |
|---|---|
| n8n | Automation workflows |
| n8n-postgres | Shared PostgreSQL database |
| NocoDB | No-code database UI |
| Applyr (staging) | Job tracking SPA |
| Knowledge Base (staging + prod) | Documentation platform |
| Watchtower | Automatic container updates on image push |

**CI/CD pattern:** Push to `dev` branch → GitHub Actions builds Docker image → pushes to GHCR → Watchtower pulls and redeploys staging container automatically. Production requires merge to `main`.

---

## Applications Built

| App | Status | Description |
|---|---|---|
| Applyr | v1.0.0 live (production) | Job tracking SPA with Google OAuth, review queue, AI pipeline — `jobs.ss-42.com` |
| Knowledge Base v2 | v2.1.1 live (production) | Vault-backed docs platform with Mermaid, Google OAuth SSO — `kb.ss-42.com` |
| n8n job pipeline | Live (production) | Automated job discovery and AI scoring |

All applications share a common auth layer (`shared_auth` schema in PostgreSQL), a common subdomain pattern (`*.ss-42.com`), and a common build pipeline.

---

## Build Process

All new capability follows the same pipeline:

1. **Brainstorm** — explore intent and design before any code
2. **Prototype** (UI work) — clickable HTML/CSS/JS to validate design
3. **Plan** — decompose into 2-5 minute tasks with file paths and acceptance criteria (spec-linked)
4. **Build** — builder agent follows TDD; reviewer agent verifies with real command output
5. **Deploy to staging** — push to `dev`; Watchtower deploys automatically
6. **Verify** — end-to-end test at `{project}-staging.ss-42.com`
7. **Release** — merge `dev` → `main`; tag and publish GitHub Release

---

## Related

- [AI Operating Model — Overview](/page/operations/ai-operating-model/overview)
- [Future State](/page/operations/ai-operating-model/future-state)
- [Architecture](/page/operations/ai-operating-model/architecture)
- [Agent Catalogue](/page/operations/ai-operating-model/agent-catalogue)
