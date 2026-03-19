---
title: Operations — Overview
status: published
order: 1
author: claude
created: 2026-03-18
updated: 2026-03-18
---

# Operations — Overview

The operations workspace documents how SS42 is built, governed, and operated. It covers the AI operating model that defines the system, the engineering practices that govern how work is done, and the infrastructure that runs everything.

Three sections, each answering a distinct question. Start with whichever matches what you need.

---

## The Three Sections

| Section | Question | Overview | Articles |
|---|---|---|---|
| [AI Operating Model](/page/operations/ai-operating-model/overview) | What is the system and where is it going? | Strategy, architecture, governance, agent catalogue, decisions | 12 pages |
| [Engineering Practice](/page/operations/engineering-practice/overview) | How do we build and ship? | Build pipeline, session handoff, release process, SDD conventions | 15 + 7 skills |
| [Infrastructure](/page/operations/infrastructure/overview) | What runs where? | NAS containers, Cloudflare, auth architecture, deployment runbooks | 12 + decisions |

---

## Start Here

For a new session needing operations context, read these first:

1. **[AI Operating Model overview](/page/operations/ai-operating-model/overview)** — system map, what exists and where it is going
2. **[SS42 System Architecture](/page/operations/infrastructure/ss42-system-architecture)** — infrastructure entry point with Mermaid diagrams
3. **[Claude Workflow](/page/operations/engineering-practice/claude-workflow)** — how sessions work
4. **[Agent Catalogue](/page/operations/ai-operating-model/agent-catalogue)** — what agents and skills exist

---

## How Operational Improvements Are Tracked

Work is tracked in MASTER-TODO with a sprint system. System domain sprints handle ops work. The pipeline for any change: brainstorm, plan, validate, build, deploy, verify, release.

Current sprint: `ops-doc-structure` — operations documentation structure.

See [Lifecycle Pattern](/page/operations/engineering-practice/lifecycle-pattern) for the full development pipeline.

---

## Key Conventions

- **ADR pattern** for significant decisions — [ai-operating-model/decisions/](/page/operations/ai-operating-model/decisions/001-operations-workspace-restructure), [infrastructure/decisions/](/page/operations/infrastructure/decisions/002-db-consolidation)
- **SDD conventions** for spec traceability — [spec references in plans](/page/operations/engineering-practice/sdd-conventions)
- **KB vault sync** for all documentation — write locally, push via `kb-sync.sh`, server vault is authoritative
