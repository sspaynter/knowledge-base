# Claude Workflow — Development Pipeline and Agent Setup

**Last updated:** 2026-03-02
**Status:** Active — reflects current global config at `~/.claude/CLAUDE.md`

---

## Overview

This document describes how Claude Code is set up to support development work across all Simon's projects. It covers the required pipeline, how agents work, and the key disciplines enforced.

---

## Development Pipeline

Every build or feature session follows this sequence. It is mandatory — not optional.

| Step | Skill / Tool | Purpose |
|---|---|---|
| 1. Brainstorm | `superpowers:brainstorming` | Explore intent and design before any code. One question at a time. YAGNI applied. Output is a design doc. |
| 2. Plan | `superpowers:writing-plans` | Decompose into 2-5 minute tasks. Exact file paths. Complete code examples. TDD task structure (write test → verify fail → implement → verify pass → commit). |
| 3. Build | builder agent + reviewer agent | Builder follows TDD. Reviewer verifies with real command output. |
| 4. Deploy to staging | GitHub Actions + Watchtower | Push feature branch to `dev`. CI builds `:dev` image, pushes to GHCR. Watchtower auto-deploys to staging container. |
| 5. Verify on staging | Manual | Confirm feature works end-to-end at `{project}-staging.ss-42.com`. Do not touch `main` until this passes. |
| 6. Release | `lifecycle:release` skill | Merge `dev` → `main`. Tag `vX.Y.Z`. Publish GitHub Release. Update CHANGELOG. Create KB release notes page. |

Do not skip to build. Brainstorming and planning are mandatory gates.
Do not merge to `main` without staging verification.

---

## Agent Architecture — Two Layers

**This is critical to understand before making any agent changes.**

Agents exist in two places. Both must be kept in sync:

| Layer | Location | Purpose |
|---|---|---|
| Summary | `~/.claude/CLAUDE.md` agent lines | What the main session knows — used to construct subagent prompts and display agent list |
| Specification | `~/.claude/agents/*.md` | What the subagent actually reads and follows — the real contract |

**When you update an agent mandate, update both files.** Updating only CLAUDE.md changes the summary but not the behaviour. Updating only the agents/*.md file changes the behaviour but leaves the summary out of sync.

This gap was discovered on 2026-03-02: TDD and verification mandates were added to CLAUDE.md but not to the agent spec files. The builder.md was telling subagents "Do not run the test suite" — directly contradicting the TDD mandate in CLAUDE.md.

---

## Agents

Defined in `~/.claude/CLAUDE.md` (summary) and `~/.claude/agents/*.md` (full specification). Each agent is dispatched as a subagent by the main session.

### researcher (haiku)
Explores codebase and problem space. Returns a structured brief. Loads project CLAUDE.md. Read-only Bash. Used before builder is dispatched.

### builder (sonnet)
Implements code from a research brief. Loads: project CLAUDE.md, code-quality, infra-context. Loads nas-ops/nas-deploy for NAS work.

**REQUIRED:** follow `superpowers:test-driven-development` for every feature and bugfix.

### reviewer (sonnet)
Reviews and tests built code. Runs in ralph loop until PASS. Loads: project CLAUDE.md, code-quality, infra-context. Has NAS-specific and Docker-specific checks.

**REQUIRED:** follow `superpowers:verification-before-completion` before passing any task.

### pm-breakdown (opus)
Breaks a product idea into outcome, tasks, and acceptance criteria.

### product-manager (sonnet)
Full PM agent. Loads only the PM skills it needs per task. Call as subagent for PM work.

---

## Key Disciplines

### TDD — Test-Driven Development
The builder agent must follow `superpowers:test-driven-development` for every feature and bugfix. The skill defines the red-green-refactor cycle in full. Key principle: no production code before a failing test exists.

### Verification Before Completion
The reviewer agent must follow `superpowers:verification-before-completion`. No task is marked done without running actual commands and showing real output. "Should work" is not evidence.

### Agent Definitions Are Pointers, Not Specifications
Agent definitions in CLAUDE.md use `REQUIRED: follow superpowers:X` as the enforcement pattern. The skill contains the full specification. The agent line does not repeat what the skill says — it only names it. This keeps CLAUDE.md token-efficient and avoids duplication drift.

---

## Subagent-Driven Development

When executing a plan in the same session, use `superpowers:subagent-driven-development`.

**How it works:**
- Read the plan file once, extract all tasks with full text
- Create a TodoWrite with all tasks
- Per task: dispatch implementer subagent → spec compliance review → code quality review → mark complete
- Fresh subagent per task (no context pollution)
- Two review stages per task: spec first, then quality. Both must pass before moving on.
- Final code review after all tasks complete

**When a quality review fails:**
- Dispatch a fix subagent (not the main session) with specific instructions
- Re-run the quality review
- Do not manually patch — context pollution

First used: 2026-03-02 session (workflow hardening). The quality reviewer caught a real sequencing bug (npm install before vs after command checks) that would have been missed in manual execution.

---

## App Scaffold

The `app-scaffold` skill generates a complete Express/SQLite/Docker web app. It now generates test infrastructure as part of the scaffold.

### What gets generated (items 21-22)
- `CLAUDE.md` — project context
- `tests/` directory with stubs for health, auth, and one per entity route

### Test stub pattern
```js
// Stub — replace with real tests before building features
const request = require('supertest');
const app = require('../../server');

describe('[Entity] routes', () => {
  test.todo('GET / returns 200 with list');
  test.todo('POST / creates a new item');
  test.todo('DELETE /:id removes item');
});
```

`jest` and `supertest` are added to devDependencies. Test scripts added to package.json.

### Step 4 Verify
After scaffolding, run `npm install`, then:
1. Structural checks (logical — file paths, routes, schema consistency)
2. Command checks — three bash commands must pass and output must be shown
3. Only declare scaffold complete if all three commands succeed

---

## Background Skills (always active)

| Skill | Purpose |
|---|---|
| `code-quality` | Coding standards applied silently |
| `infra-context` | Stack and deployment awareness |
| `nas-ops` | QNAP NAS container operations, network config |

## On-Demand Skills (loaded when needed)

| Skill | Purpose | Loaded by |
|---|---|---|
| `anti-slop` | Strip AI writing patterns from prose — banned phrases, structural patterns, jargon replacements, scoring framework | cover-letter, blog-workshop, job-followup, any prose-producing agent |
| `lifecycle-release` | Full release pipeline — pre-flight to post-release verification | Development Pipeline step 6 |

See [anti-slop skill reference](skills/anti-slop.md) and [lifecycle:release skill reference](skills/lifecycle-release.md) for detail.

---

## Why This Setup Exists

This workflow was designed after comparing Simon's setup against the [obra/superpowers](https://github.com/obra/superpowers) framework (2026-03-02). Key gaps identified:

- TDD available via plugin but not enforced in agent definitions
- Verification available via plugin but not enforced in reviewer
- No required brainstorm → plan → build pipeline
- App scaffold generated working code with no test infrastructure

The changes adopted were: TDD mandate on builder, verification mandate on reviewer, Development Pipeline section in CLAUDE.md, test stubs and command-driven verify in app-scaffold.

Not adopted: fresh subagent per 2-5 minute task (too much overhead for solo builds), deleting code not written TDD-first (too disruptive given scaffold approach).
