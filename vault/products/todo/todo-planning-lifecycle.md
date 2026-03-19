---
title: Planning Lifecycle and Agent Roles
status: published
order: 60
author: both
created: 2026-03-11
updated: 2026-03-11
---

# Planning Lifecycle and Agent Roles

Captures a design gap discovered in session 66: the connection between the ToDo app's item lifecycle, the development pipeline's planning stages, and the agent roles that execute each stage. Defines how scope summaries, build-ready plans, and rapid prototyping fit into the ToDo data model.

## The Gap

The ToDo app lifecycle has four states: Raw, Refined, Ready, Done. The development pipeline has seven stages: Brainstorm, Prototype, Plan, Build, Review, Deploy, Release. These two models overlap but do not fully align.

| ToDo state | What it means | Development pipeline stage |
|---|---|---|
| Raw | Captured, not understood | Before Brainstorm |
| Refined | Scope confirmed via Scope Gate | After Brainstorm |
| Ready | Decomposed into children via Decompose Gate | After Plan |
| Done | Executed | After Build + Review |

The gap is between **Ready** and **execution**. Ready means "children exist." It does not mean "children carry enough detail for a fresh Claude session to execute without codebase exploration."

Today, a session picks up a Ready item, then runs the `writing-plans` skill to produce a seven-field build plan in `docs/plans/`. Only then can it build. This means planning and building compete for the same session time, and the plan's relationship to the ToDo item is implicit.

## Two Levels of Planning

Planning happens at two distinct levels of detail:

### Level 1: Scope Summary (Decompose Gate output)

Written during sprint planning or item refinement. Lightweight. Answers: what are we building, what is the approach, what files are involved, how long will it take.

This is what the Decompose Gate produces today when creating child items. It is enough to:
- Sequence work within a sprint
- Estimate session count
- Identify dependencies between items
- Give a Claude session enough context to know what area of the codebase to explore

This level IS captured in the ToDo model. The item's `description` field holds it after the Decompose Gate passes.

### Level 2: Build-Ready Plan (writing-plans output)

Written at the start of the build session. Detailed. Answers: exactly which files to create or modify, what code patterns to follow, what tests to write, what the acceptance criteria are.

The seven-field format: spec reference, file list (CREATE/MODIFY/TEST), code example referencing existing patterns, test command, WHEN/THEN/AND acceptance criteria, done-when statement, dependency declarations.

This level is NOT captured in the ToDo model. It lives in `docs/plans/` files with no link back to the ToDo item.

### Why Both Levels Exist

Level 2 plans reference exact line numbers, existing code patterns, and current codebase state. Writing them during sprint planning means they go stale as other tasks change the code between planning and execution. Writing them just-in-time at build start keeps them accurate.

Level 1 scope summaries are stable — the approach and key files rarely change between sessions. They can be written days or weeks before execution.

## Design Decision: Where Build-Ready Detail Lives

Two options were evaluated:

### Option A: Enrich session-work items

Add structured fields to session-work items in the ToDo database:

```
spec_reference        — links to design doc section
files_involved        — CREATE/MODIFY/TEST file list
test_command          — runnable test command
acceptance_criteria   — WHEN/THEN/AND
done_when             — one-sentence verifiable outcome
```

These could be JSONB on the items table or a separate `item_build_context` table. They only apply at the session-work level.

Pros: Everything in one place. The ToDo API returns build-ready items. No separate plan file needed.

Cons: Build-ready detail includes code examples and line number references that go stale. The database becomes a plan document store. Session-work items become very large.

### Option B: Link plan files (recommended)

Add a `plan_reference` field to task-level items:

```
plan_reference        — path to docs/plans/ file (optional, null until build session creates it)
```

The build session creates the plan file using `writing-plans`, then writes the path back to the ToDo item. Future sessions looking at the item can find the plan.

Pros: Plans stay in their natural format (markdown). Build-ready detail is written just-in-time. The ToDo item carries the link, not the full content. Clean separation: ToDo owns scope (Level 1), plan file owns build detail (Level 2).

Cons: Plan file is outside the ToDo database. Two systems to consult.

### Decision: Option B with progressive enrichment

Start with Option B. The `plan_reference` field connects ToDo items to their build plans. The Decompose Gate continues to produce Level 1 scope summaries in the item description.

Over time, as the `writing-plans` skill evolves, it can write structured data back to the ToDo API as well as to the plan file. The plan file becomes the human-readable view; the ToDo database holds structured fields for API consumers (like `GET /api/v1/claude/context`).

This is the migration path:
1. MVP: `plan_reference` field only — link to plan file
2. v1.1: Add `acceptance_criteria` and `done_when` to session-work items (most useful for context API)
3. v1.2: Add `files_involved` and `test_command` (enables dashboard views of what each session touches)
4. Future: Plan file becomes optional — all detail lives in ToDo

## Item State Refinement

The four states (Raw, Refined, Ready, Done) remain unchanged. What changes is the meaning of Ready at the session-work level:

| Level | Ready means |
|---|---|
| Project | All features created and scoped |
| Feature | All tasks created and scoped |
| Task | All session-work items created with scope summaries |
| Session-work | Scope summary exists; build plan will be created at execution time |

A session-work item in Ready state has:
- Title and description (scope summary from Decompose Gate)
- Parent task context
- Dependencies declared
- Optionally: `plan_reference` pointing to a build plan (null until a build session creates one)

The build session's first action is: check `plan_reference`. If null, run `writing-plans` to create the plan, then write the path back. If populated, read the plan and verify it is still current.

## Agent Roles and the Development Pipeline

The development pipeline maps to specific agent roles. Today these are defined in the SS42 Agent Architecture Standard. The question is how they connect to the ToDo lifecycle.

### Current Agent Roles

| Agent | Pipeline stage | What it does |
|---|---|---|
| pm-breakdown | Brainstorm | Breaks ideas into outcomes, tasks, acceptance criteria |
| product-manager | Brainstorm, Plan | Full PM work: specs, roadmaps, research synthesis |
| researcher | Plan, Build | Explores codebase, returns structured brief |
| builder | Build | Implements code from plan, follows TDD |
| reviewer | Review | Verifies code with real output, runs test suite |

### Missing Agent Roles

Three gaps exist between the current agents and the full development pipeline:

**1. Prototyper agent**

No agent currently owns the Prototype stage. Today, prototyping is done manually in the main session — Simon and Claude collaborate to build a single-file HTML/CSS/JS prototype.

A prototyper agent would:
- Take a scope summary or brainstorm output as input
- Produce a clickable single-file prototype
- Focus on layout, navigation, and interaction — not production code
- Output: `docs/prototypes/{feature}.html`

This maps to the Development Platform's "Designer" worker type, but scoped specifically to visual prototypes. The Designer worker also covers PRDs, architecture docs, and user flows — the prototyper agent is a subset focused on the visual artifact.

**2. Planner agent**

No agent currently owns the Plan stage. Today, the main session runs the `writing-plans` skill manually. The pm-breakdown agent does high-level decomposition (outcomes and tasks) but not build-ready seven-field plans.

A planner agent would:
- Take a scope summary and prototype reference as input
- Run the `writing-plans` skill logic
- Produce a `docs/plans/` file with seven-field tasks
- Write `plan_reference` back to the ToDo item
- Output: build-ready plan file

This bridges the gap between the Decompose Gate (which creates scope summaries) and the build session (which needs seven-field detail).

**3. Spike agent (rapid prototype + proof of concept)**

This is the agent Simon identified in session 66. It does not exist in the current architecture. Its purpose is fundamentally different from the full pipeline: it produces a quick working demonstration, not production code.

A spike agent would:
- Take an idea or question as input ("Can we do X? What would Y look like?")
- Write a few focused tests to define the expected behaviour
- Build a minimal working implementation
- Return a working proof of concept with test results
- NOT follow the full pipeline (no brainstorm doc, no seven-field plan, no reviewer)
- Time-boxed: 15-30 minutes maximum

The spike agent's output is disposable. It answers a question or validates an approach. If the spike succeeds, the result feeds back into the pipeline as input for a proper Brainstorm and Plan. If it fails, the learning is captured and the idea is revised or dropped.

This maps to nothing in the current architecture. It is a new agent type that operates outside the main pipeline — a fast feedback loop for exploration.

### How These Agents Connect to the ToDo Lifecycle

```
Raw item arrives
    │
    ▼
Classify (AI) → Scope Gate (Simon confirms)
    │
    ▼
Refined item (scope summary confirmed)
    │
    ▼
Decompose Gate (AI proposes children, Simon approves)
    │
    ▼
Ready items (scope summaries on children)
    │
    ├── [Full pipeline path]
    │   ▼
    │   Prototyper agent → prototype HTML
    │   ▼
    │   Planner agent → seven-field plan file, writes plan_reference
    │   ▼
    │   Builder agent → code on branch (TDD)
    │   ▼
    │   Reviewer agent → test results + quality report
    │   ▼
    │   Deploy → Verify → Release
    │
    └── [Spike path]
        ▼
        Spike agent → working proof of concept + test results
        ▼
        Decision: pursue (→ re-enter pipeline at Brainstorm) or drop
```

The spike path is an escape hatch. It lets Simon validate ideas before committing to the full pipeline. The output is not production code — it is evidence that informs a decision.

### Agent Architecture Alignment

These new agents fit cleanly into the four-tier hierarchy from the SS42 Agent Architecture Standard:

| Tier | Existing | New |
|---|---|---|
| Human | Simon (top-level orchestrator) | No change |
| Role agents | — | — |
| Workflow agents | researcher, builder, reviewer, pm-breakdown, product-manager | prototyper, planner, spike |
| Global tools | code-quality, infra-context, web-researcher | writing-plans (loaded by planner) |

The prototyper, planner, and spike agents are workflow agents — they run structured phases with defined inputs and outputs. They are not role agents (which are conversational entry points) or tools (which are single-purpose).

### Guardrails for New Agents

Following the Agent Guardrails Framework:

**Prototyper agent:**
- Scope: Read codebase, write to `docs/prototypes/` only
- Action: Always autonomous (prototypes are disposable)
- Gate: Simon reviews prototype before it becomes a spec reference
- Tools: Read, Glob, Grep, Write (scoped to prototypes directory)

**Planner agent:**
- Scope: Read codebase and scope summaries, write to `docs/plans/`
- Action: Always autonomous (plans are reviewed before build)
- Gate: Simon reviews plan before builder starts
- Tools: Read, Glob, Grep, Write (scoped to plans directory)

**Spike agent:**
- Scope: Read codebase, write code on isolated branch, run tests
- Action: Autonomous within time box (15-30 min)
- Gate: Simon reviews result before any decision
- Tools: Read, Glob, Grep, Write, Edit, Bash (npm test only)
- Budget cap: Low (Haiku or Sonnet, $2 max)
- Branch: `spike/{topic}` — never merges to dev without full pipeline

## Impact on ToDo App Design

### Data Model Changes

1. Add `plan_reference` field to items table (nullable TEXT, path to plan file)
2. No new states needed — Raw, Refined, Ready, Done remain correct
3. The `plan_reference` field is populated by the planner agent or build session, not by the Decompose Gate

### Workflow Changes

1. Decompose Gate at task → session-work level continues to produce scope summaries (Level 1)
2. A separate planning step (planner agent or build session start) produces the build plan (Level 2) and writes `plan_reference`
3. `GET /api/v1/claude/context` includes `plan_reference` in session-work items so build sessions can find their plan immediately

### Prototype v2 Impact

The Decompose Gate screen for task → session-work decomposition should show:
- The scope summary for each proposed session-work item
- A note that build-ready detail will be created at execution time
- The `plan_reference` field (null until populated)

No new screens needed for the planner or spike agents — they operate in Claude Code sessions, not in the ToDo UI.

## Open Questions for ToDo Design Phase

1. Should the spike agent's output (proof of concept) be tracked in ToDo? Or is it transient?
2. When a spike succeeds and feeds back into the pipeline, should the spike item be linked to the resulting feature/task?
3. Should `plan_reference` support multiple plan files (for phased implementations)?
4. Should the planner agent be a global agent (available to all projects) or project-specific?

## Related Documents

- [ToDo MVP Outcomes](/page/products/todo/todo-mvp-outcomes) — five core results
- [ToDo Feature Areas](/page/products/todo/todo-feature-areas) — feature area specs
- [SS42 Agent Architecture Standard](/page/operations/ai-operating-model/architecture) — four-tier hierarchy
- [Agent Guardrails Framework](/page/operations/ai-operating-model/agent-guardrails) — five guardrail types
- [Claude Workflow](/page/operations/engineering-practice/claude-workflow) — development pipeline
- [Development Platform Worker Guardrails](/page/products/development-platform/worker-guardrails) — worker types
- [Writing Plans Upgrade](/page/operations/engineering-practice/writing-plans-upgrade) — seven-field task format
