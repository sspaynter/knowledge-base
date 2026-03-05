# Session Handoff Workflow — Spec-First Development

**Last updated:** 2026-03-04
**Status:** Evolving — spec-first pattern works today with plan files; ToDo integration is Planned
**Related:** `operations/engineering-practice/claude-workflow.md`, `operations/engineering-practice/sdd-conventions.md`

---

## Overview

This document describes how to structure Claude Code sessions so that each session executes from a written spec with zero re-explanation. It replaces the current pattern of 20-30 sessions per feature (each requiring context re-establishment) with 5-8 focused sessions.

The core insight: **the spec file is the handoff mechanism, not conversation history**. Each session reads the spec, implements one task, verifies it, and commits. No exploration. No re-explanation.

---

## The Problem

Every new Claude Code session starts with a blank context window. The current workflow loses time re-explaining:

- What the project is and what has been built
- What the current feature requires
- What decisions have been made
- What files to touch and what patterns to follow

This re-explanation happens on every session. The fix is making specs rich enough that each session needs zero exploration.

---

## The Four Phases

### Phase 1: Spec (1-2 sessions)

**Goal:** Produce a build-ready spec file that any Claude session can execute from cold.

**Session 1 — Brainstorm + Design:**
- Use `superpowers:brainstorming` to explore the feature
- Produce design doc with architecture decisions
- If UI-heavy: build single-file HTML prototype
- Output: `docs/plans/{date}-{feature}-design.md`

**Session 2 — Task Breakdown:**
- Use `superpowers:writing-plans` to decompose into tasks
- Each task must include the five required fields (see Build-Ready Task Format below)
- Output: `docs/plans/{date}-{feature}-plan.md`

**Quality gate:** A task is "build-ready" when a fresh Claude session can implement it by reading only the task description. No codebase exploration needed. No follow-up questions.

### Phase 2: Build (1 session per task)

**Goal:** Each session implements exactly one task, verifies it, and commits.

**Session prompt:**
```
Read docs/plans/{feature}-plan.md. Implement Task {X}.
Run the test command after. Commit when tests pass.
```

**Rules:**
- One session = one task = one commit
- `/clear` between tasks (or start a new session)
- If a task takes more than 30 minutes, the spec was not detailed enough — fix the spec
- If Claude asks clarifying questions, the spec is missing information — update the spec
- Name sessions after the task: `{project}-task-{N}-{short-name}`

### Phase 3: Review (1 session)

**Goal:** Verify the complete feature works end-to-end.

**Session prompt:**
```
Read docs/plans/{feature}-plan.md. All tasks are complete.
Run the full test suite. Verify each acceptance criterion. Report any gaps.
```

Fresh context — no bias from writing the code.

### Phase 4: Deploy (1 session)

Push feature branch to `dev`. Verify on staging. If good: merge `dev` → `main`, tag release. Use `lifecycle:release` skill.

---

## Build-Ready Task Format

Every task in a plan file must include these five fields:

```markdown
### Task 3: Add Google OAuth callback handler
- spec: design.md § AUTH-2 — OAuth callback and session creation
- files:
  - CREATE: routes/auth-callback.js
  - MODIFY: server.js (add route mount at line 45)
  - MODIFY: services/auth.js (add verifyGoogleToken function after line 80)
- code:
  // routes/auth-callback.js — follows pattern from routes/auth.js
  router.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const token = await authService.verifyGoogleToken(code);
    req.session.userId = token.sub;
    res.redirect('/');
  });
- test: npm test -- --grep "OAuth callback"
- acceptance:
  - WHEN user completes Google sign-in THEN session cookie is set with userId
  - WHEN token verification fails THEN user sees error page AND no session is created
  - WHEN user is not in allowed_emails THEN redirect to /unauthorized
```

| Field | Purpose | Why it matters |
|---|---|---|
| `spec:` | Links to design doc section | Traceability. SDD convention. |
| `files:` | Exact paths with CREATE/MODIFY | No exploration needed. Claude knows where to work. |
| `code:` | Example snippets showing the pattern | Claude follows the codebase pattern, not its own preference. |
| `test:` | Runnable command | Claude self-verifies. No ambiguity about "done." |
| `acceptance:` | WHEN/THEN/AND criteria | Claude checks each criterion. EARS notation. |

**The test:** If a developer who has never seen the codebase can implement the task from this description alone, it is build-ready.

---

## Current Practice

**What works today (no tooling changes needed):**

1. Write plan files with the build-ready task format
2. Start each build session with the standard prompt template
3. Name sessions for easy `claude --resume` lookup
4. One task per session, `/clear` between tasks

**What needs updating:**

The `superpowers:writing-plans` skill needs to enforce the five-field task format. Currently it produces tasks with `spec:` and `files:` but not always `code:`, `test:`, or `acceptance:`. See: MASTER-TODO #16.

---

## Planned Evolution — ToDo as Orchestration Layer

Once ToDo v4.0.0 ships with orchestration support, the workflow evolves:

| Step | Current (plan files) | Future (ToDo) |
|---|---|---|
| Task creation | Manual in plan file | AI proposes from brain dump, human gates |
| Task assignment | "Do task 3" in prompt | Claude calls `todo_claim_task` |
| Progress tracking | Memory files + plan checkboxes | ToDo board (Kanban, Today view) |
| Session history | `memory/session-log.md` | `session_log` table, queryable |
| "What is next?" | Read plan file, find unchecked tasks | `GET /claude/tasks?status=ready` |
| "What happened?" | Read session log manually | AI summary from `session_log` + `activity_log` |
| Calendar awareness | None | Time-blocked tasks, capacity warnings |
| Feedback on AI output | None (redo the session) | Inline annotation → `feedback_log` |

**Spec:** `products/todo/orchestration-layer.md`
**Target:** ToDo v4.0.0 (Gate 4+)

---

## Metrics

| Metric | Target | How to measure |
|---|---|---|
| Sessions per feature | 5-8 (down from 20-30) | Count sessions in session log |
| Time per build session | 10-30 min | Session timestamps |
| Clarifying questions per session | 0 | If Claude asks, spec is incomplete |
| Tasks requiring rework | < 10% | Review session outcomes |

---

## References

- Session handoff research: `~/Documents/Claude/spec-first-session-workflow.md` (working doc)
- SDD conventions: `operations/engineering-practice/sdd-conventions.md`
- Claude workflow: `operations/engineering-practice/claude-workflow.md`
- AI Operating Model: `operations/ai-operating-model/overview.md`
- Community sources: [Anthropic Best Practices](https://code.claude.com/docs/en/best-practices), [SDD with Claude Code](https://alexop.dev/posts/spec-driven-development-claude-code-in-action/), [CCPM](https://github.com/automazeio/ccpm)
