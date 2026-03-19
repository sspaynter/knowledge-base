---
author: both
order: 240
title: Plan Validation — Design Document
---


# Plan Validation — Design Document

**Date:** 2026-03-16
**Status:** Approved — ready for implementation
**Skill location:** `~/.claude/skills/plan-validation/SKILL.md`
**Agent location:** `~/.claude/agents/plan-reviewer.md`
**MASTER-TODO:** #186 (skill), #187 (agent), #188 (spike agent), #189 (pipeline wiring)

---

## Purpose

A validation gate between Plan and Build in the SS42 development pipeline. The plan-reviewer agent independently verifies every implementation plan before any code is written — checking that referenced files exist, dependencies are traced, platform mechanisms are validated, and task sizing is realistic.

**Core principle: no assumptions survive validation.** If something cannot be verified without running it, it gets classified NEEDS SPIKE and a spike agent runs a rapid experiment before the plan proceeds.

---

## Origin

The system-context-loading sprint (session 73) built 9 tasks to reduce always-loaded context. Two tasks failed because the plan contained untested assumptions:

1. **Mechanism assumption** — Task 2 and 3 assumed `~/.claude/rules/` path-scoped rules work based on working directory. They do not. A 5-minute spike would have caught this.
2. **Dependency gap** — Task 3 scoped KB vault instructions to KB-only sessions, missing that `end-of-session` needs them from any project. Cross-cutting dependency was not traced.

The findings doc (`docs/findings/2026-03-14-context-loading-test-findings.md`) recommended: validate the mechanism before building around it.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Evidence approach | Option B — reviewer does the work | Aviation CDV pattern: self-verification has documented higher failure rates. Plans do not carry their own evidence. The reviewer independently verifies. |
| Scope | Every plan | The failed sprint looked simple (config-only) yet had critical failures. No selective application. |
| Check categories | All four: Structural, Cross-cutting, Mechanism, Scope | Each catches a different failure mode. All four confirmed in brainstorm. |
| Verdicts | PASS / FAIL / NEEDS SPIKE | NEEDS SPIKE is the differentiator — no existing tool has this classification. It triggers the spike agent for rapid experiment. |
| Feedback loop | Reviewer → planner rewrites → re-validate | Clean separation: planner writes, reviewer challenges, spike experiments. Loop until PASS. |
| Agent model | Sonnet | Read-heavy analysis work. Does not need Opus reasoning depth. |
| Agent tools | Read, Glob, Grep, Bash (read-only) | Sufficient for all five check categories. No write access — reviewer must not modify anything. |
| Memory strategy | None — fresh per plan | Each plan is validated fresh with no prior bias. |
| Skill type | Quality/process (background) | Loaded by the plan-reviewer agent, not invoked directly by users. |
| Spike agent model | Haiku | Disposable rapid POC. Low cost, maxTurns 20, worktree isolation. |

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│                  Main Session                    │
│                                                  │
│  Plan written ──► Dispatch plan-reviewer agent   │
│                        │                         │
│                   ┌────▼────┐                    │
│                   │  PASS   │──► Proceed to Build│
│                   ├─────────┤                    │
│                   │  FAIL   │──► Revise plan,    │
│                   │         │    re-validate     │
│                   ├─────────┤                    │
│                   │ NEEDS   │──► Dispatch spike  │
│                   │ SPIKE   │    agent, feed     │
│                   │         │    results back,   │
│                   │         │    re-validate     │
│                   └─────────┘                    │
└─────────────────────────────────────────────────┘
```

### Flow

1. Main session writes plan using `writing-plans` skill
2. Main session dispatches `plan-reviewer` agent with the plan file path
3. Plan-reviewer loads `plan-validation` skill (criteria)
4. Plan-reviewer executes all five check categories against the plan
5. Plan-reviewer returns structured verdict:
   - **PASS** — all checks clear, proceed to build
   - **FAIL** — specific issues cited by task number, field, and category
   - **NEEDS SPIKE** — one or more assumptions require experimental validation
6. On FAIL: main session revises plan, re-dispatches plan-reviewer
7. On NEEDS SPIKE: main session dispatches spike agent with the specific experiment, feeds results back into plan, re-dispatches plan-reviewer
8. Loop continues until PASS

### Pipeline Position

```
Brainstorm → [Prototype] → Plan → VALIDATE → Build → Deploy → Verify → Release
                                    ▲
                                    │
                              NEW GATE
```

---

## Four Check Categories

### 1. Structural Checks

Verify that the plan references real things.

| Check | Method | Failure example |
|---|---|---|
| Referenced files exist | Glob/Read each path | Plan says "edit `src/auth.js`" but file does not exist |
| Referenced directories exist | Glob parent paths | Plan creates file in `src/middleware/` but directory does not exist |
| Import paths are valid | Grep for module | Plan imports from `@lib/utils` but no such module exists |
| Task dependencies form a DAG | Parse blocks/blocked-by | Task 3 blocks Task 2, Task 2 blocks Task 3 — circular |
| No orphan references | Cross-check task numbers | Task 5 says "blocked-by: Task 7" but only 6 tasks exist |

### 2. Cross-cutting Checks

Trace side effects beyond the plan's immediate scope.

| Check | Method | Failure example |
|---|---|---|
| Skill dependencies traced | Read skill files, follow references | Plan modifies end-of-session but does not account for its dependency on KB vault writing |
| Agent layer sync | Check both CLAUDE.md and agents/*.md | Plan updates agent behaviour in CLAUDE.md but not in agents/builder.md |
| Pipeline stage impacts | Read pipeline definition | Plan changes build step but does not update reviewer checks |
| Config file side effects | Read CLAUDE.md, settings files | Plan adds new skill but does not register in CLAUDE.md |
| Shared resource conflicts | Check for concurrent modification | Two tasks both modify the same file section |

### 3. Mechanism Checks

Flag platform features that have not been tested in this environment.

| Check | Method | Failure example |
|---|---|---|
| Untested platform feature | Search for prior usage in codebase | Plan uses `paths:` frontmatter in rules — has this ever been validated? |
| API/CLI behaviour assumption | Check documentation or prior evidence | Plan assumes `gh pr merge --auto` works with branch protection — does it? |
| Environment dependency | Verify tool availability | Plan requires `jq` but it may not be installed |
| Version-specific behaviour | Check installed versions | Plan uses Node 20 feature but environment may have Node 18 |

**Any mechanism check that cannot be resolved by reading files or documentation gets classified NEEDS SPIKE.**

### 4. Scope Checks

Validate sizing and completeness.

| Check | Method | Failure example |
|---|---|---|
| Task count vs complexity | Heuristic: >10 tasks signals decomposition needed | Plan has 15 tasks — probably two plans |
| Seven-field completeness | Check each task has all fields | Task 4 missing `test:` field |
| Time estimate plausibility | Compare task description to estimate | "Refactor authentication system" estimated at 2 minutes |
| Acceptance criteria testable | Parse done-when field | "Works correctly" is not testable |
| Test field has real assertions | Read test descriptions | `test: "manual verification"` is not a test |

---

## Output Format

The plan-reviewer returns a structured report:

```markdown
## Plan Validation Report

**Plan:** {plan file path}
**Verdict:** PASS | FAIL | NEEDS SPIKE
**Date:** {ISO date}

### Results by Category

#### Structural
- PASS | FAIL: {specific finding with task number and field}

#### Cross-cutting
- PASS | FAIL: {specific finding with task number and field}

#### Mechanism
- PASS | FAIL | NEEDS SPIKE: {specific finding}
  - Spike needed: {what to test and how}

#### Scope
- PASS | FAIL: {specific finding with task number and field}

### Summary
{1-2 sentences: what must change before this plan can proceed}

### Spike Experiments (if NEEDS SPIKE)
| # | What to test | How to test | Expected result | Max time |
|---|---|---|---|---|
| 1 | {mechanism} | {specific steps} | {what success looks like} | {minutes} |
```

---

## Spike Agent

When the plan-reviewer returns NEEDS SPIKE, the main session dispatches a spike agent.

| Field | Value |
|---|---|
| Model | Haiku |
| maxTurns | 20 |
| Tools | Bash, Read, Write, Glob, Grep |
| Isolation | Git worktree (if in a repo) or temp directory |
| Purpose | Run the specific experiment described in the spike table |
| Output | Structured result: what was tested, what happened, conclusion |
| Cleanup | Worktree deleted after results captured |

The spike agent is disposable. It runs one experiment, reports back, and is discarded. Its results feed into the plan revision — either the plan adjusts to match reality, or the approach changes entirely.

---

## What This Does NOT Own

| Domain | Owner | Boundary |
|---|---|---|
| Plan structure and format | writing-plans skill | Plan-validation checks completeness but does not define the format |
| Code quality review | code-quality skill + reviewer agent | Plan-validation checks plan feasibility, not code quality |
| Test execution | builder + reviewer agents | Plan-validation does not run tests — it checks that test fields are specified |
| Brainstorm quality | superpowers:brainstorming | Plan-validation assumes the brainstorm produced sound design decisions |

---

## Research Basis

The design was informed by research into 60+ sources across tools, frameworks, and industry patterns (Feb-Mar 2026):

| Pattern | Source | How it influenced the design |
|---|---|---|
| Aviation CDV (Challenge-Do-Verify) | EASA / FAA pilot training | Self-verification fails more often than independent verification. Drove Option B decision. |
| NASA IV&V | NASA TLYF | "If you cannot verify without running it, run it before flight." Drove NEEDS SPIKE classification. |
| deep-plan | GitHub (multi-LLM review) | Confirmed separate reviewer model is viable for plan analysis |
| gstack | GitHub (role-based review) | Role separation pattern (planner vs reviewer) validated |
| VeriMAP | Academic (verification functions) | Formal verification approach — too heavy for this use case but confirmed check categories |

**Key finding:** No existing tool has a formal NEEDS SPIKE classification. This is the differentiator — the bridge between "we think this works" and "we proved this works."

---

## Implementation Plan Reference

Sprint: `system-plan-validation` in `todo-viewer/sprint.json`

| Order | # | Task | Est |
|---|---|---|---|
| 1 | 186 | Build plan-validation skill — criteria and checklist | 45m |
| 2 | 187 | Build plan-reviewer agent — read-only subagent, returns PASS/FAIL/NEEDS SPIKE | 30m |
| 3 | 188 | Build spike agent — rapid POC, haiku, maxTurns 20, worktree isolation | 30m |
| 4 | 189 | Update pipeline — add Validate step to CLAUDE.md, agent-catalogue, claude-workflow, skills-overview | 20m |

---

## Related Documents

| Document | Path |
|---|---|
| Skills overview | `knowledge-base/vault/operations/engineering-practice/skills/skills-overview.md` |
| Agent catalogue | `knowledge-base/vault/operations/engineering-practice/agent-catalogue.md` |
| Claude workflow | `knowledge-base/vault/operations/engineering-practice/claude-workflow.md` |
| Failed sprint findings | `docs/findings/2026-03-14-context-loading-test-findings.md` |
| Failed sprint plan | `docs/plans/2026-03-13-system-context-loading.md` |
| lifecycle:release design (format reference) | `knowledge-base/vault/operations/engineering-practice/lifecycle-release-design.md` |
