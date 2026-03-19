---
author: claude
order: 30
title: Applyr — Claude Code Architecture
---



# Applyr — Claude Code Architecture

This document covers how Applyr's Claude Code layer is structured: what agents and skills exist, the current state problem, the recommended target architecture, and the engineering rationale for each decision.

Reference: Miro board `uXjVG0A-_LU=` — five diagrams created in session 64 capture the full visual model.

---

## Background

Applyr has two operational layers:

| Layer | Description | Tooling |
|---|---|---|
| **Layer 1: Interactive** | Claude Code sessions — research, cover letters, skill-driven workflows | Claude Code + skills/agents |
| **Layer 2: Automated** | n8n workflows — Gmail → score → ingest → Applyr DB | n8n + Applyr API |

This document covers Layer 1 only.

---

## Current State — Flat Skill Layer

Applyr's Claude Code layer (as of session 64) consists of one agent and seven skills, all sitting at the same level with no hierarchy.

### The agent

| Agent | File | Purpose |
|---|---|---|
| `job-researcher` | `job-app/.claude/agents/job-researcher.md` | Orchestrates company + role research for a specific job. Invokes web-search, reads job context, produces a structured research brief. |

### The seven skills

| Skill | File | Type | Purpose |
|---|---|---|---|
| `job-search` | `job-app/.claude/skills/job-search/SKILL.md` | **Orchestrator** | Runs a complete job search cycle: browse → score → capture |
| `job-apply` | `job-app/.claude/skills/job-apply/SKILL.md` | **Orchestrator** | Runs a full application cycle: research → cover letter → resume → submit |
| `job-followup` | `job-app/.claude/skills/job-followup/SKILL.md` | **Orchestrator** | Follows up on submitted applications: check status → email → log |
| `job-browse` | `job-app/.claude/skills/job-browse/SKILL.md` | **Tool** | Searches job boards using Chrome MCP (browser automation) |
| `job-evaluate` | `job-app/.claude/skills/job-evaluate/SKILL.md` | **Tool** | Scores a job against criteria, produces verdict and rationale |
| `job-capture` | `job-app/.claude/skills/job-capture/SKILL.md` | **Tool** | Writes a scored job to the Applyr API |
| `cover-letter` | `job-app/.claude/skills/cover-letter/SKILL.md` | **Tool** | Generates, refines, and finalises a cover letter |

### The problem

Three of the seven skills (`job-search`, `job-apply`, `job-followup`) are functioning as **orchestrators** — they coordinate multiple other skills and manage multi-step workflows. But they are defined as skills, not agents. This creates two issues:

1. **Wrong abstraction** — Skills are callable procedures (a sequence of steps). Agents are autonomous subprocesses that can make decisions, call tools, and run subagents. Orchestrating a multi-step workflow with decision points is agent work, not skill work.
2. **No parallelism** — Orchestrator skills run sequentially within the calling session. Agents can be dispatched in parallel and run independently.

Additionally, `job-browse` uses Chrome MCP (browser automation) — a capability that belongs at the global level, available to any project that needs to browse the web. It is currently locked inside the Applyr project directory.

---

## Recommended Target Architecture

### Three-tier hierarchy

```
Triggers (user command / n8n event)
    ↓
Agents (orchestrators — autonomous, multi-step, decision-capable)
    ↓
Skills (tools — callable procedures, single-purpose)
```

### Global layer

Skills and agents that are general-purpose and reusable across all SS42 projects:

| Type | Name | Purpose |
|---|---|---|
| Skill | `simon-context` | Working style, communication preferences |
| Skill | `anti-slop` | Writing quality — eliminates AI prose patterns |
| Skill | `infra-context` | Deployment infrastructure reference |
| Skill | `web-researcher` *(new)* | Browser-based data extraction via Chrome MCP |
| Agent | `researcher` | Codebase research via Bash (read-only) |
| Agent | `builder` | Code implementation with TDD |
| Agent | `reviewer` | Code review and verification |

`web-researcher` is the key addition. It replaces the project-scoped `job-browse` skill with a global capability any project can load.

### Project layer — Applyr

Skills and agents that are specific to the Applyr job-search workflow:

| Type | Name | Replaces | Purpose |
|---|---|---|---|
| Agent | `discovery-agent` *(elevate)* | `job-search` skill | Runs full job discovery: browse → evaluate → capture |
| Agent | `application-agent` *(elevate)* | `job-apply` skill | Runs full application: research → CL → resume → submit |
| Agent | `followup-agent` *(elevate)* | `job-followup` skill | Manages follow-up: check status → email → log |
| Agent | `job-researcher` *(existing)* | — | Company + role research for a specific job |
| Skill | `job-evaluate` *(keep)* | — | Scores a single job against criteria |
| Skill | `job-capture` *(keep)* | — | Writes a scored job to the Applyr API |
| Skill | `cover-letter` *(keep)* | — | Generates and refines cover letters |

`job-browse` is **archived** — its browser automation capability moves to the global `web-researcher` skill. `discovery-agent` calls `web-researcher` rather than `job-browse`.

---

## Agent vs Skill — Decision Rules

The distinction matters for tool selection, autonomy, and architecture clarity.

| Characteristic | Skill | Agent |
|---|---|---|
| **Definition** | Callable procedure — a sequence of steps Claude follows | Autonomous subprocess — runs independently, can use tools, spawn subagents |
| **Invocation** | `Skill` tool in main session | `Agent` tool — runs in separate context |
| **Decision-making** | Follows fixed steps | Can branch, retry, make decisions |
| **Tools available** | Inherits calling session tools | Declares its own tool set |
| **Parallelism** | Sequential with calling session | Can run in parallel with other agents |
| **Best for** | Single-purpose utilities (generate X, evaluate Y, capture Z) | Multi-step orchestration (do A → assess → do B or C) |

### When to elevate a skill to an agent

Elevate when a skill:
- Invokes two or more other skills in sequence
- Contains conditional branching ("if score > 7, then capture; otherwise skip")
- Manages state across multiple steps
- Could benefit from parallel execution
- Has a meaningful "output brief" that the calling session consumes

`job-search`, `job-apply`, and `job-followup` all meet multiple criteria. They are agents running in skill wrappers.

---

## web-researcher vs researcher — Distinction

These are two separate, complementary capabilities. They are not interchangeable.

| | `researcher` agent | `web-researcher` skill |
|---|---|---|
| **Type** | Agent | Skill |
| **Tools** | Bash (read-only: grep, cat, ls, git log) | Chrome MCP (navigate, screenshot, extract, fill) |
| **Domain** | Codebase — files, code, git history | Browser — web pages, job boards, live data |
| **Use case** | "What does this function do?", "Where is the auth middleware?" | "Search Seek for PM roles in Melbourne", "Extract job details from this page" |
| **Layer** | Global `~/.claude/agents/` | Global `~/.claude/skills/web-researcher/` |
| **Output** | Structured research brief about the codebase | Extracted web content for processing |

They can work together: `discovery-agent` calls `web-researcher` to extract job listings, then `job-researcher` to do deeper company research on interesting results.

---

## Miro Board Diagrams

Five diagrams in board `uXjVG0A-_LU=` document this architecture:

| Diagram | Description |
|---|---|
| Applyr — Skills & Workflow Flow | Full flow of all skills and agents, showing what triggers each and what data flows between them |
| Applyr — Recommended Agent Structure | Three-tier hierarchy: triggers → agents → skills |
| Applyr — Current State Structure | Flat skill layer — shows the problem (no orchestration hierarchy) |
| Applyr — Global vs Project Layer | Separation of global vs Applyr-specific components |
| Applyr — Recommended Global + Project Structure | Complete target architecture: 4 global skills, 3 global agents, 4 Applyr agents, 3 Applyr skills |

---

## Implementation

Implementation is tracked as the "Applyr Update Agent" sprint. See: `products/applyr/applyr-update-agent-sprint.md`.

Pre-requisite: Applyr v1.0.0 production deploy (#44) must be complete before starting. The architecture refactor does not affect the running application — it changes the Claude Code layer only.

---

## Related Documents

- Sprint plan: `products/applyr/applyr-update-agent-sprint.md`
- web-researcher skill spec: `operations/engineering-practice/skills/web-researcher.md`
- Skills overview: `operations/engineering-practice/skills/skills-overview.md`
- Context loading architecture: `operations/engineering-practice/context-loading-architecture.md`
