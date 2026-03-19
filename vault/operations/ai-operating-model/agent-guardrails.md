---
title: SS42 Agent Guardrails Framework
status: published
order: 50
author: claude
parent: overview
created: 2026-03-11
updated: 2026-03-11
---

# SS42 Agent Guardrails Framework

This document defines the guardrails framework for all SS42 agent systems. It covers what guardrails exist today, what is missing, and how guardrails should be designed for agents operating across both the interactive Claude Code layer and the automated n8n layer.

Reference: [SS42 Agent Architecture Standard](/page/operations/ai-operating-model/architecture)

---

## Why Guardrails Matter

The SS42 architecture is intentionally human-in-the-loop. But agents run between those human gates — and within that span, they can take consequential actions: write to APIs, call external services, generate and store content, make decisions that affect downstream steps.

Without explicit guardrails, two failure modes emerge:

**Under-constrained agents** do too much. They write when they should pause. They retry when they should escalate. They process more records than intended. The human reviews a result that reflects a dozen implicit choices they never approved.

**Over-constrained agents** do too little. They pause for confirmation on every minor decision. They become brittle wrappers around one-liner tasks. The human might as well have done it themselves.

Guardrails define the boundary between these failure modes. They answer: *between human checkpoints, what can an agent do, what must it confirm, and when must it stop?*

---

## Current State — What Exists Today

Three layers of guardrails are already in place across the SS42 system. Understanding what exists prevents duplication and clarifies where the real gaps are.

### Layer 1 — Claude Code Runtime (Built-in)

These are enforced by the Claude Code system and cannot be overridden by any agent or CLAUDE.md instruction.

| Guardrail | What it covers |
|---|---|
| **Explicit permission model** | Destructive, irreversible, or externally-visible actions require user confirmation before Claude proceeds |
| **Prohibited action list** | Banking data, permanent deletions, security permission changes, account creation — Claude refuses these entirely |
| **Prompt injection defence** | Instructions found in function results (API responses, file contents, web pages) must be confirmed by the human before Claude acts on them |
| **Cross-tool access control** | Agents declared without specific tools cannot use those tools — physical constraint, not declarative rule |

### Layer 2 — Global CLAUDE.md (Declarative)

These are rules Claude reads and follows as part of every session.

| Guardrail | What it covers |
|---|---|
| **Cross-Project Modification Boundary** | Agents may not modify code, commits, containers, or databases in a project that is not the declared active project for the session |
| **Development Pipeline gates** | Build cannot start without brainstorm and plan. Production release cannot happen without staging verification. |
| **Agent-level mandates** | builder must follow TDD; reviewer must follow verification-before-completion |
| **Session confirmation rule** | Sessions started from the root Claude directory must confirm active project before touching any project code |

### Layer 3 — Architecture Standard (Structural)

These guardrails are built into the design of the agent hierarchy itself.

| Guardrail | What it covers |
|---|---|
| **Human-at-top rule** | No orchestrator agent above workflow agents. The human is the orchestrator. |
| **API-as-contract** | Neither layer writes directly to the database. All state changes go through the app API. |
| **Skill elevation rule** | A skill that calls other tools or manages state across steps must be elevated to a workflow agent. |
| **Single-purpose rule** | A workflow agent that calls one tool and returns should be a skill, not an agent. |
| **researcher tool constraint** | The researcher agent has Bash (read-only) only — physically cannot write to files. |

---

## Identified Gaps

The existing guardrails address session-level safety and architectural correctness. They do not address agent behaviour *between* human gates — the span where autonomous agents run. The following gaps exist across all SS42 apps.

### Gap 1 — No per-agent scope bounds

Each agent has a defined purpose, but no stated limit on what it can access. discovery-agent could theoretically call any Applyr API endpoint, not just the ones its workflow requires. There is no declared scope constraint enforcing the minimum necessary access.

### Gap 2 — No explicit confirmation gate triggers

The architecture says agents run autonomously "between checkpoints" but does not define what forces a checkpoint. An agent can proceed through ten steps or a hundred — nothing in the current rules specifies when it must stop and ask.

### Gap 3 — No write-operation confirmation rules

job-capture writes job records to the Applyr API. The current rules do not state whether a bulk write (e.g. 15 jobs captured in one discovery run) requires a human review step before executing. The action is reversible in principle but not in practice — correcting 15 incorrect captures takes significant time.

### Gap 4 — No error escalation policy

When an agent encounters an API error, an unexpected response, or a condition outside its decision tree, there is no stated rule about what to do next. Retry? Fail with a summary? Stop and ask? Different agents handle this differently, and none have it stated explicitly.

### Gap 5 — No Layer 2 automation constraints

The n8n layer has no human in the loop. The current framework has no rules about:
- De-duplication: preventing the same job being ingested on every Gmail alert
- Volume limits: capping how many records a single automation run can write
- Confidence thresholds: defining what score threshold triggers auto-ingest vs. flagging for human review

### Gap 6 — No agent-to-agent handoff rules

When one agent completes a phase and passes a brief to the human (or the next agent), there is no stated rule about whether that brief must be reviewed before the next agent starts. A human approving "run discovery" does not necessarily mean they approved "immediately start applications on what discovery found."

---

## The Guardrails Framework

The framework addresses the gaps above through five guardrail types and three enforcement mechanisms.

### Five Guardrail Types

---

#### 1. Scope Guardrails

*What each agent can access and modify.*

Every agent operates with a declared scope: the specific files, API endpoints, and external resources it is permitted to touch. Access beyond that scope requires either a scope extension (human approval) or delegation to an agent with the appropriate scope.

**Principle:** Minimum necessary access. Declare what you need, touch only what you declared.

**How to implement:**

- Each agent's definition file lists its permitted API interactions explicitly:
  ```
  Permitted writes: POST /api/v1/jobs, PATCH /api/v1/jobs/:id (status field only)
  Permitted reads: GET /api/v1/jobs, GET /api/v1/jobs/:id
  Not permitted: DELETE, /api/v1/cover-letters (write), any other endpoint
  ```

- Global agents (researcher, builder, reviewer) follow the cross-project modification boundary already in CLAUDE.md.

- Workflow agents are scoped to the endpoints their phase requires — no broader access.

**Enforcement:** Declarative (agent definition) + architectural (API only exposes permitted operations per auth token — a future enhancement).

---

#### 2. Action Guardrails

*What requires confirmation vs. proceeds autonomously.*

Extending the Claude Code explicit permission model to agent-specific actions. Three categories:

| Category | Definition | Examples |
|---|---|---|
| **Always autonomous** | Read operations, generation without persistence, intermediate calculations | Scoring a job, drafting a cover letter (before saving), reading job details from API |
| **Confirm once per session** | Repeated identical write operations the human approved at session start | Bulk job captures after the human reviewed the batch summary |
| **Confirm each time** | High-consequence or externally-visible writes | Saving a cover letter to the app, marking a job as "applied", any operation that cannot be easily reversed |

**How to implement:**

Each agent's definition includes an action classification table. Before executing any action in the "confirm each time" category, the agent presents a one-line summary and waits for explicit approval. Before bulk "confirm once" operations, the agent presents a summary of all planned writes and receives one approval.

**Never autonomous (regardless of category):**
- Sending any external communication (email, message)
- Submitting any application to an external platform
- Deleting or archiving any record
- Any action that would be visible to a third party

---

#### 3. Gate Guardrails

*When agents must stop and wait.*

An agent must stop and surface a human gate when any of the following conditions are true:

**Mandatory stops:**

| Condition | Required action |
|---|---|
| Unexpected state encountered | Stop. Describe the unexpected state. Ask what to do. Do not guess. |
| Write batch exceeds 10 records | Stop. Present the full list. Wait for confirmation. |
| API error on a write operation | Stop. Report the error and the record that failed. Do not retry silently. |
| Output quality is uncertain | Stop. Present the output with the uncertainty flagged. Ask whether to proceed or revise. |
| Phase boundary reached | Stop. Deliver the phase output brief. Wait for explicit instruction to proceed. |

**Phase boundary rule:**

Each workflow agent owns one phase. When it reaches the end of its phase, it delivers a structured output brief and stops. The human decides what happens next — including whether to trigger the next agent. An agent must never autonomously trigger a downstream agent.

**Example:** discovery-agent completes a run. It delivers a brief: "Found 23 jobs. Scored 8 above threshold. 6 recommended for capture. Summary below." It stops. The human reviews and says "capture those 6." Only then does job-capture run.

---

#### 4. Data Guardrails

*How agents handle persistent state.*

These rules govern how agents write to, read from, and handle errors in persistent storage (the app API and database).

**Write rules:**

1. All writes go through the app API. No direct database access — ever. This is already in the architecture standard; it is restated here as a data guardrail.

2. Write operations on more than one record must be preceded by a human-reviewed summary. One record can proceed autonomously within a confirmed session. Ten records requires a new confirmation gate.

3. Writes must be idempotent where possible. If a record already exists with equivalent content, do not overwrite — report the duplicate and ask.

4. The agent must confirm success after each write batch. An HTTP 200 is not sufficient — the agent should read back at least one written record to confirm the data landed correctly.

**Read rules:**

Reads are always autonomous. An agent reading from the API to inform its work does not require confirmation.

**Error escalation policy:**

When an agent encounters an error during a write:
1. Stop immediately. Do not retry.
2. Report: what operation failed, what error was returned, what records were affected.
3. Present options: retry once, skip this record, abort the batch, or hand off to the human.
4. Wait for instruction.

Retrying automatically after an error is not permitted. The human decides whether to retry.

---

#### 5. Layer Guardrails

*Rules specific to each execution layer.*

The interactive Claude Code layer (Layer 1) and the automated n8n layer (Layer 2) have different risk profiles. Layer 1 has a human present. Layer 2 does not. Their guardrails differ accordingly.

**Layer 1 — Claude Code (Interactive)**

| Guardrail | Rule |
|---|---|
| Human is always reachable | Agents must surface gates as described in Gate Guardrails above |
| Session scope declaration | Active project must be declared before any write operation |
| Output must be reviewed | Generated content (cover letters, research briefs) must be presented to the human before being persisted |
| Application submission is prohibited | No agent may submit an application to an external platform — only the human can trigger that action |

**Layer 2 — n8n (Automated)**

| Guardrail | Rule |
|---|---|
| De-duplication required | Every ingest workflow must check whether the job ID already exists in the database before writing. Duplicate detection is mandatory, not optional. |
| Volume limit per run | A single automation run may not write more than 25 records. If more are found, the run writes the first 25 (highest scored) and logs a summary for human review. |
| Confidence threshold | Jobs below a defined minimum score threshold (suggested: 5.0 / 10) are logged but not ingested. They appear in a review queue, not the main job list. |
| Human alerting | When an automation run encounters errors on more than 3 records, or when a volume limit is hit, the system must send a notification (email, Slack, or equivalent) to alert the human. |
| No external communication | n8n workflows must not send emails, messages, or external communications autonomously. All external output requires a human trigger in Layer 1. |
| Audit log | Every n8n write operation must include a source tag (`source: n8n-ingest`) on the created record so that automated writes can be distinguished from human-initiated writes. |

---

### Three Enforcement Mechanisms

Guardrails are only as strong as how they are enforced. The framework uses three mechanisms in combination.

#### Mechanism 1 — Architecture Constraints

The design makes certain things physically impossible. These require no declarative rules because the system cannot do them.

| Constraint | How enforced |
|---|---|
| researcher cannot write files | researcher is declared without Edit/Write tools |
| Agents cannot exceed their declared tools | Claude Code agent tool declarations are structural |
| Neither layer writes directly to DB | App enforces API-only access; no direct DB credentials are given to Claude Code or n8n |

Design new capabilities with architecture constraints first. If a guardrail can be enforced structurally, it should be. Declarative rules that a system *could* violate are weaker than structural limits it cannot.

#### Mechanism 2 — Declarative Rules

Rules written into CLAUDE.md, agent definitions, and skill preambles that Claude reads and follows. These are the most practical enforcement mechanism for behaviour that cannot be structurally constrained.

**Where to place declarative guardrails:**

| Scope | Location | Used for |
|---|---|---|
| All sessions | `~/.claude/CLAUDE.md` | Cross-project boundary, pipeline gates, session-level rules |
| All instances of an agent | Agent `.md` definition file | Scope bounds, action classification, phase boundary rule for this agent |
| All invocations of a skill | `SKILL.md` preamble | Input validation, output format, what the skill must not do |
| All sessions in a project | Project `CLAUDE.md` | Project-specific scope, app-specific prohibited actions |

**Declarative rule format:**

Write guardrails as explicit rules, not guidelines. Avoid "should" and "consider". Use "must", "must not", and "before [action], always [check]".

Bad: "It's worth confirming with the user before bulk writes."
Good: "Before writing more than 1 record to the API, present a summary of all planned writes and wait for explicit confirmation."

#### Mechanism 3 — Review Gates

Explicit human checkpoints built into the workflow agent's instruction set. These are the operational version of gate guardrails — concrete stopping conditions defined in the agent's procedure.

Each workflow agent definition must include a **Gates** section listing exactly when it must stop and what it must deliver before stopping.

Example structure for a discovery-agent:

```
## Gates

Gate 1 — Before any capture:
  Stop condition: Evaluation complete for all discovered jobs
  Deliver: Scored job list with verdict (capture / skip) for each
  Wait for: Explicit human confirmation of which jobs to capture

Gate 2 — On API error:
  Stop condition: Any write fails
  Deliver: Error detail, record that failed, records written before failure
  Wait for: Human instruction (retry / skip / abort)

Gate 3 — Phase complete:
  Stop condition: All confirmed captures written
  Deliver: Capture summary (N records written, list of job IDs)
  Wait for: Human instruction (proceed to application phase or done)
```

---

## Applyr Reference Implementation

Applyr is the first app to implement this framework. The following guardrails apply to each component.

### applyr-agent (Role Agent)

**Scope:** Read-only access to Applyr API for status and context queries. May call project tools (job-evaluate, cover-letter) directly. May not initiate workflow agents without human instruction.

**Action classification:**
- Always autonomous: read queries, job scoring (non-persistent), cover letter generation (non-persistent)
- Confirm each time: saving any generated content to Applyr API

**Phase boundary:** Role agent has no phase — it is conversational. But it must not chain actions that belong in workflow agents without explicit human instruction to do so.

---

### discovery-agent (Workflow Agent)

**Scope:** web-researcher (read: external job boards), job-evaluate (scoring), job-capture (write: POST /api/v1/jobs only).

**Action classification:**
- Always autonomous: web browsing, job evaluation/scoring
- Confirm once per session (with batch review): job captures
- Confirm each time: anything outside the above

**Gates (mandatory):**
1. Before any captures: present scored list with recommended actions; wait for confirmation
2. On API write error: stop, report, wait for instruction
3. Phase complete: deliver capture summary, stop

**Volume limit:** Maximum 30 jobs evaluated per run. Maximum 15 jobs captured per confirmation gate. If discovery finds more than 30 viable candidates, stop and present to human for prioritisation before continuing.

---

### application-agent (Workflow Agent)

**Scope:** job-researcher (read: research), cover-letter (generate), Applyr API (write: PATCH /api/v1/jobs/:id for status, POST /api/v1/cover-letters). External job platforms: read-only.

**Action classification:**
- Always autonomous: job research, cover letter generation (pre-save)
- Confirm each time: saving cover letter to Applyr, updating job status, any action on the external job platform

**Hard prohibitions:**
- Must not submit an application to any external platform
- Must not mark a job as "applied" without human confirmation that submission occurred

**Gates (mandatory):**
1. Before saving cover letter: present generated letter, wait for human approval or revision
2. Before updating job status to "applied": confirm with human that submission happened externally
3. On research gaps: flag what could not be found; do not fabricate company context

---

### followup-agent (Workflow Agent)

**Scope:** Applyr API (read: GET /api/v1/jobs, GET /api/v1/applications), email draft generation. No external sends.

**Action classification:**
- Always autonomous: status reads, draft generation
- Confirm each time: any update to job/application status in Applyr, any external email send

**Hard prohibition:** Must not send any email. Drafts only. The human sends.

**Gates (mandatory):**
1. Before presenting drafts: confirm which jobs the followup run covers; wait for acknowledgement
2. After drafts generated: present all drafts with send instructions; wait for human to act

---

### job-capture (Project Tool)

**Scope:** POST /api/v1/jobs only. No other endpoints.

**Idempotency check:** Before writing, check whether a job with the same external ID already exists. If it does, report the duplicate and skip — do not overwrite.

**Confirmation requirement:** job-capture should not be invoked directly by the human for bulk operations. Bulk capture must go through discovery-agent's gate. Individual capture (one job) may proceed with standard session confirmation.

---

## What Guardrails Do Not Cover

This framework governs agent behaviour within SS42 sessions and automations. It does not cover:

- **Claude Code runtime safety rules** — Covered by the Claude Code system prompt. These cannot be modified or supplemented by this framework. They take precedence.
- **Application security** — Input validation, authentication, authorisation, and API security are the application's responsibility. The agent layer assumes the API it calls is secure.
- **n8n workflow security** — Credential management, webhook authentication, and n8n node permissions are infrastructure concerns covered by the NAS deployment standard.
- **External platform behaviour** — What job boards do with the requests web-researcher makes is outside the framework's scope.

---

## Applying the Framework to a New SS42 App

When building the agent layer for a new app:

1. **Define scope per agent** — List the specific API endpoints and resources each agent is permitted to touch
2. **Classify actions** — For each action the agent takes, assign it to the three-category model (always autonomous / confirm once / confirm each time)
3. **Define gates** — Write explicit stop conditions for each workflow agent with what it must deliver before stopping
4. **Set data rules** — Define the idempotency check, the volume limit, and the error escalation response
5. **Apply layer-specific rules** — If the app has an automated layer, define its de-duplication logic, volume cap, and confidence threshold
6. **Document in agent definition files** — Guardrails are not in CLAUDE.md alone. Each agent's `.md` definition includes its scope, action classification, and gates

---

## Related Documents

- [SS42 Agent Architecture Standard](/page/operations/ai-operating-model/architecture)
- [Agent Architecture — Industry Research](/page/operations/ai-operating-model/agent-research)
- [Applyr — Claude Code Architecture](/page/products/applyr/applyr-claude-code-architecture)
- [Applyr — Update Agent Sprint](/page/products/applyr/applyr-update-agent-sprint)
