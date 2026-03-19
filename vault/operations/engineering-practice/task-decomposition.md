---
author: both
order: 150
title: Task Decomposition for AI-Assisted Development
---


# Task Decomposition for AI-Assisted Development

Task decomposition — breaking work into agent-appropriate chunks with verifiable outcomes — is the single most important skill for getting reliable output from AI coding agents. This document codifies the heuristics, patterns, and external research that inform how tasks are sized, structured, and sequenced across all SS42 projects.

---

## Why This Matters

Anthropic's 2026 Agentic Coding Trends Report identifies task decomposition as the core developer skill in the agent era. The shift: developers are no longer primarily code writers — they are agent orchestrators. The bottleneck is not writing code. It is deciding what to ask for, how big to make each request, and how to verify the result.

Three failure modes emerge when decomposition is wrong:

| Failure | Cause | Symptom |
|---|---|---|
| **Hallucinated completion** | Task is too large or has implicit dependencies | Agent claims to test code it has not written yet, or references files that do not exist |
| **Context degradation** | Task accumulates too much state in the context window | Responses get slower, less accurate, or contradict earlier work in the same session |
| **Scope creep** | Task boundary is vague | Agent adds features, refactors adjacent code, or "improves" things that were not asked for |

All three are decomposition problems, not model problems. Better decomposition eliminates them.

---

## Sizing Heuristics

These rules determine whether a task is the right size for a single agent action. Apply them when writing plan files, breaking down features, or deciding whether to split a task.

### 1. The one-sentence test

If you cannot describe the task in one sentence with one measurable outcome, split it.

- Bad: "Fix the ID length issue"
- Good: "Write failing test when IDs exceed 40 characters"
- Good: "Modify createId to auto-adjust size based on prefix length"

Each sentence becomes its own task.

### 2. The 3-file rule

If a change touches more than 3 files, request a plan first — do not start coding. This heuristic (from Santiago / svpino and the broader community) separates tasks that are safe to execute directly from tasks that need decomposition.

| Files touched | Action |
|---|---|
| 1 file | Execute directly |
| 2-3 files | Execute directly if the change is obvious, plan if complex |
| 4+ files | Plan first, then execute per-task |

### 3. The 30-minute timeout

If a task takes more than 30 minutes to implement, the spec was not detailed enough. This is not an agent performance problem — it is a specification problem. Stop, fix the spec, then resume.

This timeout applies to the build session, not the planning session. Planning can and should take longer.

### 4. The context budget

Long conversations degrade quality as the context window fills. Each task should be completable within a fresh context window. Signs that a task exceeds the context budget:

- Claude asks questions that were already answered earlier in the session
- Responses contradict earlier decisions
- Code quality drops noticeably compared to earlier in the session
- Response latency increases

When these appear: `/compact` or start a new session.

### 5. One new file or three modified files

Each task produces at most 1 new file or modifies at most 3 existing files. If it exceeds this, split it. This is a stricter version of the 3-file rule applied specifically to task-level granularity in plan files.

---

## The Done-When Pattern

Every task gets a `done-when:` statement — one sentence describing the verifiable end state. This is distinct from acceptance criteria (which describe behaviour) and test commands (which verify implementation). The `done-when:` answers: "How do I know this task is finished?"

**Format:** A single declarative sentence that can be verified by running a command or inspecting output.

**Examples:**

```markdown
done-when: GET /api/v1/ingest returns 401 without auth header and 200 with valid webhook secret
done-when: The sidebar renders nested pages at depth 3 with correct indentation
done-when: npm test passes with 0 failures and the new test file exists at tests/ingest.test.js
done-when: The DOCX export contains all 9 resume changes when opened in Word
```

**Why this is separate from acceptance criteria:**

| Field | Purpose | Granularity |
|---|---|---|
| `acceptance:` | Describes behaviour in WHEN/THEN/AND format | Multiple conditions, edge cases |
| `test:` | A runnable command to verify | Mechanical — pass/fail |
| `done-when:` | One sentence: "this task is done when..." | Human-readable, single checkpoint |

The `done-when:` is what the developer reads to know whether to move on. Acceptance criteria are what they check if something seems wrong. The test command is the automated verification.

---

## DAG Dependency Declarations

Tasks in a plan file should declare their dependencies explicitly using `blocks:` and `blocked-by:` fields. This prevents the most common agent failure: attempting to use something that has not been built yet.

**Format:**

```markdown
### Task 3: Add webhook authentication middleware
- blocked-by: Task 1 (Express server setup)
- blocks: Task 5 (ingest endpoint), Task 6 (end-to-end test)
```

**Rules:**

1. A task cannot start until all `blocked-by:` tasks are complete
2. If a task has no `blocked-by:`, it can start immediately (or in parallel with other unblocked tasks)
3. Circular dependencies are a plan design error — resolve before building
4. The dependency graph should be a DAG (directed acyclic graph) — no cycles

**Why this matters:**

Claude Code's native Tasks feature (shipped early 2026) uses DAG enforcement internally. When Task 3 blocks on Task 1, the system prevents the agent from starting Task 3 before Task 1 is verified complete. Without explicit dependencies, agents attempt work out of order and produce hallucinated completions — claiming to test code that does not exist, or importing modules that have not been created.

Even when using the `writing-plans` skill (which produces sequential numbered tasks), explicit dependency declarations add value: they tell the executing agent which tasks are truly sequential versus which happen to be numbered sequentially but could run in parallel.

---

## The Commit-as-Checkpoint Pattern

Every completed task ends with a commit. This is not just version control hygiene — it is a safety mechanism.

**The rule:** If the next task goes wrong, you are one `git reset` away from the last good state. Without task-level commits, recovering from a failed task means manually untangling changes across multiple files.

**Practical application:**

```markdown
### Task N: [Name]
...implementation steps...

**Checkpoint:**
- Run: `npm test`
- Expected: All tests pass
- Commit: `git add [specific files] && git commit -m "feat: [task description]"`
- If tests fail: fix before committing. Do not move to Task N+1.
```

The commit message should describe the task outcome, not the implementation detail. "Add webhook authentication middleware" is better than "Create webhookAuth.js and add to server.js".

---

## Applying the Heuristics to Existing Skills

These heuristics integrate into the existing SS42 skill chain at specific points:

| Skill | How decomposition applies |
|---|---|
| `pm-breakdown` | Apply the one-sentence test to each task. Each task should have a `done-when:`. Add `blocks:`/`blocked-by:` to the Dependencies section. |
| `writing-plans` | Enforce all sizing heuristics when generating tasks. Every task gets the seven-field format (spec, files, code, test, acceptance, done-when, blocks/blocked-by). |
| `executing-plans` | Respect dependency order. Do not start a task whose `blocked-by:` tasks are incomplete. Use `done-when:` as the completion check. |
| `subagent-driven-development` | Each subagent receives the full task including `done-when:` and dependency context. The controller checks dependencies before dispatching. |

The `writing-plans-upgrade.md` article documents the expanded seven-field task format that incorporates these heuristics.

---

## External Research Sources

This section captures the external evidence that informed these heuristics, for traceability and future reference.

### Anthropic 2026 Agentic Coding Trends Report

Published March 2026. Key finding: task decomposition is the core developer skill. Organizations need "better task breakdown, coordination methods, and visibility across concurrent agent sessions." Multi-agent systems require explicit DAG dependencies to prevent hallucinated completion. Task horizons are expanding from minutes to days — but human checkpoints remain essential at logical boundaries.

Source: [Anthropic 2026 Agentic Coding Trends Report](https://resources.anthropic.com/2026-agentic-coding-trends-report)

### Addy Osmani — LLM Coding Workflow (2026)

Core principle: break work into "manageable tasks, not the whole codebase at once." Each chunk should be small enough that the AI can handle it within context and you can understand the code it produces. Structured "prompt plan" files — a sequence of prompts for each task — keep agents on track. Iterate: implement one function, fix one bug, add one feature at a time.

Source: [Addy Osmani — My LLM coding workflow going into 2026](https://addyosmani.com/blog/ai-coding-workflow/)

### Community Consensus (X / Twitter, March 2026)

Multiple practitioners converge on the same patterns:

- **Santiago (svpino):** "If a task requires changes to more than 3 files, stop and break it into smaller tasks first." Add this rule to CLAUDE.md.
- **John O'Nolan (Ghost):** Plan mode is useful for small tasks. For larger work: write plan to markdown, kill the planning session, start a fresh session pointed at the plan file. Rationale: planning context pollutes execution context.
- **Levi Stringer (atomic task experiment):** If you cannot articulate the task in one sentence with one measurable outcome, split it. Session-based approach costs half as much, generates cleaner code, and provides confidence at every checkpoint.
- **aiorg.dev (15 tips from 6 projects):** Do not attempt to fix bugs, add features, refactor, and write tests in one conversation. Complete one task, then start a new session. Commit regularly as checkpoints.

### Claude Code Native Tasks Feature (2026)

Claude Code ships a native Tasks system with DAG dependency enforcement. Tasks are stored as files in `~/.claude/tasks/`. A task can explicitly "block" another — the system prevents out-of-order execution. State can be shared across sessions via `CLAUDE_CODE_TASK_LIST_ID` environment variable.

Source: [Claude Code Tasks (VentureBeat)](https://venturebeat.com/orchestration/claude-codes-tasks-update-lets-agents-work-longer-and-coordinate-across)

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-03-06 | Create standalone article rather than updating existing articles | Existing articles (claude-workflow, session-handoff, writing-plans-upgrade, sdd-conventions) are each well-scoped. The decomposition discipline is a standalone topic that they reference but do not own. |
| 2026-03-06 | Add `done-when:` as a separate field from `acceptance:` | Acceptance criteria describe behaviour (multiple conditions, edge cases). `done-when:` is a single human-readable checkpoint — one sentence that tells you whether to move on. Different purpose, different granularity. |
| 2026-03-06 | Add `blocks:`/`blocked-by:` fields to task format | Prevents hallucinated completion. Aligns with Claude Code native Tasks DAG model. Enables future parallel execution of independent tasks. |
| 2026-03-06 | Sizing heuristics are guidelines, not hard rules | The 3-file rule and 30-minute timeout are heuristics, not absolutes. A task that modifies 4 files but makes the same trivial change in each (e.g. a rename) does not need splitting. Judgement applies. |

---

## Related Documents

- Writing-plans upgrade (seven-field format): `operations/engineering-practice/writing-plans-upgrade.md`
- Claude workflow (development pipeline): `operations/engineering-practice/claude-workflow.md`
- Session handoff workflow: `operations/engineering-practice/session-handoff-workflow.md`
- SDD conventions (spec traceability): `operations/engineering-practice/sdd-conventions.md`
- Context hygiene: `operations/engineering-practice/context-hygiene.md`
- Skills overview: `operations/engineering-practice/skills/skills-overview.md`
- MASTER-TODO: #83 (this article), #16 (writing-plans skill upgrade)
