---
title: SS42 Agent Architecture Standard
status: published
order: 40
author: claude
parent: overview
created: 2026-03-10
updated: 2026-03-11
---

# SS42 Agent Architecture Standard

This document defines the standard pattern for structuring Claude Code agent layers across all SS42 apps. It is a forward-looking standard — Applyr is the reference implementation, and all future SS42 apps should follow this pattern.

---

## Why a Standard

Each SS42 app has a Claude Code layer — agents, skills, and config that enable Claude to work within that app's domain. Without a defined standard, each app risks drifting toward different shapes: flat skill lists, ad-hoc agent definitions, duplicated tool capabilities, no clear separation of concerns.

A standard answers one question consistently: *when I need Claude to do something in this app, where does that capability live and what form does it take?*

---

## The Pattern

### Four-tier hierarchy

```
Human
    ↓  (decides what phase to run, reviews all outputs)
Role Agent   ←→   Workflow Agents
    ↓                    ↓
         Project Tools
                ↓
         Global Tools
```

In full:

| Tier | What it is | Owns | Example |
|---|---|---|---|
| **Human** | Top-level orchestrator | Decision-making, review, approval | You |
| **Role Agent** | Conversational entry point for the app's domain | Ad-hoc requests, quick tasks, delegation to workflow agents | `applyr-agent` |
| **Workflow Agents** | Structured, multi-step phase runners | A defined workflow with a clear start, end, and output | `discovery-agent`, `application-agent` |
| **Project Tools** | Single-purpose callable procedures | One specific task — no orchestration | `job-evaluate`, `cover-letter` |
| **Global Tools** | Cross-project capabilities | A reusable capability any app can invoke | `web-researcher`, `anti-slop` |

---

## The Two-Layer System

The four-tier pattern above describes the **Claude Code layer** — interactive, session-based, human-in-the-loop. It is Layer 1. There is a second layer: **n8n**, which handles event-driven automation. Both are legitimate orchestration systems, and understanding the distinction between them is essential to building the architecture correctly.

### Layer 1 — Claude Code (Interactive)

| Characteristic | Description |
|---|---|
| **Trigger** | Human command in a Claude Code session |
| **Orchestrator** | Human, with role and workflow agents doing the work |
| **Decision-making** | Human reviews outputs and approves actions at each gate |
| **Volume** | Low — intentional, deliberate, one task at a time |
| **AI execution** | Claude Code agents and skills with full context loading |
| **When to use** | Research, generation, review decisions, cover letters, anything requiring human judgment |

### Layer 2 — n8n (Automated)

| Characteristic | Description |
|---|---|
| **Trigger** | External event — Gmail alert, webhook, schedule |
| **Orchestrator** | n8n workflow (no human in the loop) |
| **Decision-making** | Fully automated — conditional nodes, not human gates |
| **Volume** | High — runs on every event, potentially many times per day |
| **AI execution** | Three modes (see below) |
| **When to use** | Ingestion, scoring, triage, anything that runs without human input |

### Why n8n can be a full orchestrator

n8n's workflows have no human decision points. Gmail fires → score → ingest. Every step is automated and the output is deterministic enough to write directly to the database. That is the condition under which full orchestration is appropriate.

The Claude Code layer has human gates everywhere — which is why the human stays as top-level orchestrator there. Remove the human gates and you need an automated orchestrator. That is n8n's role.

### The three modes n8n can call Claude

As the architecture matures, n8n has three ways to invoke AI capability:

| Mode | How it works | State |
|---|---|---|
| **1. Raw Claude API call** | HTTP node → Anthropic API → response in workflow | ✅ Live today (scoring workflow) |
| **2. Skill via Claude CLI** | Execute Command node → `claude --print -p "..."` → Claude Code loads full skill context | ✅ Technically possible now |
| **3. Agent via MCP** | n8n as MCP client → calls Claude Code agent as a tool | 🔄 n8n v1.x has MCP support — not yet configured for SS42 |

Mode 2 and 3 are the significant shift: instead of n8n containing its own inline AI prompt logic, it invokes the same skills and agents that Claude Code interactive sessions use. The skill becomes the reusable unit — execution mode (interactive vs automated) is just the trigger.

### Skills as the shared intelligence layer

Once n8n can invoke skills and agents, the two layers stop being separate silos:

```
AUTOMATED (n8n)                       INTERACTIVE (Claude Code)
Gmail → n8n                           Human → applyr-agent
   ↓                                       ↓
job-evaluate skill  ←──── same skill ────  job-evaluate skill
   ↓                                       ↓
job-capture skill   ←──── same skill ────  job-capture skill
   ↓                                       ↓
Applyr API ────────── shared boundary ──── Applyr API
```

Write a skill once. It runs whether triggered by a human in a session or by an n8n event at 3am.

### The boundary between layers

n8n writes to Applyr via the ingest API. Claude Code agents read from Applyr and work with what is there. They do not share tooling — they share data through the API.

| | Writes to Applyr DB | Reads from Applyr DB |
|---|---|---|
| n8n | ✅ Via ingest API (scored jobs) | — |
| Claude Code agents | ✅ Via API (cover letters, notes, status) | ✅ Job context for research, generation |

**The API is the contract.** Neither layer writes directly to the database. n8n calls `POST /api/v1/ingest`. Claude Code calls `/api/v1/jobs`, `/api/v1/cover-letters`, etc. Applyr owns its own data boundary.

---

## Tier Definitions

### Human — Top-Level Orchestrator

The human is always the top-level orchestrator. This is not a concession — it is a design constraint.

Every meaningful workflow in an SS42 app contains human decision points: review outputs, approve actions, decide what to do next. These cannot be automated. Building a meta-agent to sit above all other agents adds a wrapper around work the human is already doing.

**Rule:** Do not build an orchestrator agent for the top tier. The human is the orchestrator.

---

### Role Agent — Conversational Domain Entry Point

Each SS42 app has one role agent. It is the flexible, conversational entry point into the app's capabilities. It:

- Understands the app's domain fully (loaded context: app CLAUDE.md, tools, data model)
- Handles ad-hoc requests that do not fit a structured workflow
- Can delegate to workflow agents when a structured job is triggered
- Calls project tools and global tools directly for simple tasks

The role agent is NOT an orchestrator of workflow agents. It is a peer — it covers the conversational surface that workflow agents do not.

**Named after the app:** `applyr-agent`, `kb-agent`, `todo-agent`.

**When to invoke the role agent vs a workflow agent:**

| User intent | Use |
|---|---|
| "Find me 5 PM roles posted today" | Role agent → calls web-researcher directly |
| "Run a full discovery cycle and capture everything above 7" | Workflow agent → discovery-agent |
| "What's the status of my application to Canva?" | Role agent → queries Applyr API |
| "Draft a cover letter for job #42" | Role agent → calls cover-letter tool |
| "Process all my interested jobs and get cover letters done" | Workflow agent → application-agent |

---

### Workflow Agents — Phase Runners

Workflow agents run structured, multi-step workflows with a defined input, defined output, and decision logic inside. They are the right abstraction when:

- Two or more tools are called in sequence
- There is conditional branching mid-workflow
- The workflow produces a structured output brief
- The workflow can run autonomously between human checkpoints

Each workflow agent owns one phase of the app's lifecycle. It is named for that phase, not for a tool or skill.

**Naming convention:** `{phase}-agent` — e.g. `discovery-agent`, `application-agent`, `followup-agent`.

**Do not create a workflow agent for a single-tool task.** If it calls one thing and returns, it is a tool, not an agent.

---

### Project Tools — Single-Purpose Procedures

Project tools are skills: callable procedures that do exactly one thing. No orchestration, no decision branches, no sub-calls to other agents. They accept an input, do their work, return an output.

Project tools are specific to the app. They live in the project's `.claude/skills/` directory.

**Naming convention:** `{domain}-{action}` — e.g. `job-evaluate`, `job-capture`, `cover-letter`.

**Elevation rule:** If a tool starts calling other tools or managing state across steps, it should be elevated to a workflow agent. The boundary is: one tool, one job.

---

### Global Tools — Cross-Project Capabilities

Global tools are skills that are general-purpose enough to be useful across all SS42 apps. They live in `~/.claude/skills/`. Any agent in any project can invoke them.

The test for global elevation: *could another SS42 app need this capability?*

| Skill | Capability | Used by |
|---|---|---|
| `web-researcher` | Browser-based web extraction (Chrome MCP) | Applyr, future apps |
| `anti-slop` | Eliminate AI writing patterns from prose | Any app generating text |
| `infra-context` | Deployment infrastructure reference | Any app with NAS/Docker work |
| `simon-context` | Working style and communication preferences | All sessions |

Do not duplicate global tools at the project level. If it exists globally, reference it — do not copy it.

---

## File Layout

```
~/.claude/
    agents/
        researcher.md       ← global agents
        builder.md
        reviewer.md
    skills/
        web-researcher/     ← global tools
        anti-slop/
        simon-context/
        infra-context/

{project}/.claude/
    agents/
        {app}-agent.md      ← role agent
        discovery-agent.md  ← workflow agents
        application-agent.md
        followup-agent.md
    skills/
        job-evaluate/       ← project tools
        job-capture/
        cover-letter/
```

---

## Decision Rules

When adding a new capability to an SS42 app, apply these rules in order:

1. **Does it already exist globally?** → Reference the global tool. Do not re-implement.
2. **Is it a single-purpose task with one input and one output?** → Project tool (skill).
3. **Does it call multiple tools in sequence, branch, or manage state?** → Workflow agent.
4. **Is it a conversational / ad-hoc capability for the app's domain?** → Belongs in the role agent's loaded context.
5. **Could any SS42 app need this?** → Global tool.

---

## What Does Not Belong in This Layer

The Claude Code layer is not a replacement for application logic. It handles orchestration, research, generation, and decision support — not data management, API calls, or UI.

**Keep in the app's codebase:** CRUD operations, database writes, API endpoints, session management, background jobs.

**Keep in the Claude Code layer:** Research, generation (cover letters, analysis), orchestration across multiple steps, decision support.

---

## MCP — Future Wiring Layer

Model Context Protocol (MCP) is Anthropic's open standard for how agents expose and consume tools. It is gaining broad adoption (Microsoft, Google, LangChain) and is the direction SS42 should move toward as the tool layer matures.

In the MCP model:
- Tools are defined once with a typed schema
- Any agent can discover and call any tool — cross-project, cross-session
- Tools become a shared service layer, not project-local files

The current skill/agent file pattern is MCP-compatible in intent. When MCP tooling is mature enough for self-hosted use, the project-tool and global-tool tiers map cleanly onto MCP servers.

**For now:** Build skills as described in this standard. When the time comes to migrate to MCP, the mapping is direct.

---

## Applyr — Reference Implementation

Applyr is the first SS42 app to fully implement this standard. Its structure after the Applyr Update Agent sprint (#105–#113):

| Tier | Component | Notes |
|---|---|---|
| Role Agent | `applyr-agent` | Conversational entry point — ad-hoc job search queries, quick tasks |
| Workflow Agent | `discovery-agent` | Full job discovery: browse → evaluate → capture |
| Workflow Agent | `application-agent` | Full application: research → CL → resume → submit |
| Workflow Agent | `followup-agent` | Follow-up: check status → draft email → log |
| Workflow Agent | `job-researcher` | Deep company + role research for a specific job |
| Project Tool | `job-evaluate` | Score a single job against criteria |
| Project Tool | `job-capture` | Write a scored job to the Applyr API |
| Project Tool | `cover-letter` | Generate and refine cover letters |
| Global Tool | `web-researcher` | Browser-based job board extraction |

Miro board `uXjVG0A-_LU=` contains reference diagrams.

---

## Applying the Standard to a New SS42 App

When scaffolding a new app:

1. Define the app's domain and lifecycle phases
2. Create one role agent (`{app}-agent`)
3. Identify the structured workflows — one workflow agent per phase
4. Identify the single-purpose tools — one skill per action
5. Check what already exists globally — reference, do not duplicate
6. Document in the app's `CLAUDE.md` under an "Agent Layer" section

---

## Agent Configuration Spec

Every SS42 agent definition file uses Anthropic's official subagent format: YAML frontmatter in a Markdown file. The body becomes the agent's system prompt.

### Required fields

```yaml
---
name: agent-name
description: When Claude should delegate to this agent
---
```

### Recommended fields

```yaml
---
name: agent-name
description: When Claude should delegate to this agent
tools: Read, Glob, Grep, Bash
disallowedTools: Write, Edit
model: sonnet
permissionMode: default
maxTurns: 30
skills:
  - code-quality
  - infra-context
memory: project
isolation: worktree
---
```

### Model selection

| Model | Use for | Examples |
|---|---|---|
| `haiku` | Read-only research, quick validation, disposable work | researcher, spike |
| `sonnet` | Implementation, generation, PM work | builder, reviewer, planner, prototyper |
| `opus` | Complex multi-domain reasoning | pm-breakdown |
| `inherit` | Role agents that should match the session | applyr-agent |

Default to `sonnet`. Only deviate with a clear reason.

### Memory strategy

Persistent memory lets agents learn across sessions. Use sparingly — stale memory can be worse than no memory.

| Scope | Persists across | Good for |
|---|---|---|
| `user` | All projects | Cross-project patterns (reviewer quality checks) |
| `project` | Sessions in one project | Codebase conventions (builder, planner) |
| `local` | Sessions in one project (not in git) | Personal preferences, local state |
| None | Nothing | Disposable work (researcher, spike) |

### Isolation

Use `isolation: worktree` when the agent's work is experimental and should not touch the working tree. The agent gets a temporary git worktree copy. Changes are cleaned up automatically if unused.

Recommended for: spike agent, any agent doing exploratory code changes that may be discarded.

### Full catalogue

See the [SS42 Agent Catalogue](/page/operations/ai-operating-model/agent-catalogue) for the complete registry of all agents — live, in-progress, and planned — with full configuration details, interaction diagrams, and alignment mapping to Anthropic best practices.

---

## Related Documents

- [Agent Catalogue](/page/operations/ai-operating-model/agent-catalogue) — full registry of all SS42 agents
- [Agent Architecture Research](/page/operations/ai-operating-model/agent-research) — industry validation
- [Agent Guardrails Framework](/page/operations/ai-operating-model/agent-guardrails) — safety layer
- Applyr reference implementation: `products/applyr/applyr-claude-code-architecture.md`
- Sprint plan (Applyr): `products/applyr/applyr-update-agent-sprint.md`
- web-researcher skill: `operations/engineering-practice/skills/web-researcher.md`
- Skills overview: `operations/engineering-practice/skills/skills-overview.md`
- Context loading architecture: `operations/engineering-practice/context-loading-architecture.md`
