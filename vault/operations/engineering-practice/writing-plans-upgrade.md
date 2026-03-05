# Writing-Plans Skill Upgrade — Build-Ready Task Format

**Last updated:** 2026-03-04
**Status:** Planned — skill change not yet made
**Skill location:** `~/.claude/skills/superpowers/writing-plans/SKILL.md` (or equivalent superpower)
**MASTER-TODO:** #16
**Related:** `operations/engineering-practice/session-handoff-workflow.md`, `operations/engineering-practice/sdd-conventions.md`

---

## Purpose

Upgrade the `superpowers:writing-plans` skill so that every task it produces is "build-ready" — executable by a fresh Claude session with zero codebase exploration and zero follow-up questions.

This is the single highest-leverage change for reducing session overhead. The session handoff workflow depends on plan quality. If plans are vague, sessions waste time exploring. If plans are precise, sessions execute in 10-30 minutes.

---

## Current State

The `writing-plans` skill currently produces tasks with:
- `spec:` reference (SDD convention, added 2026-03-02)
- `files:` list (usually present)
- Prose description of what to do

It does **not** consistently produce:
- `code:` — example snippets showing the pattern to follow
- `test:` — a runnable command to verify the task
- `acceptance:` — WHEN/THEN/AND criteria for self-verification

---

## Required Changes

### 1. Enforce five-field task format

Every task in a generated plan must include all five fields:

```markdown
### Task N: [Name]
- spec: {file} § {section-id} — {human-readable label}
- files:
  - CREATE: path/to/new-file.js
  - MODIFY: path/to/existing-file.js (description of change, line reference if known)
- code:
  // Brief example showing the pattern. Reference existing codebase files.
  // "follows pattern from routes/auth.js" is better than inventing a new pattern.
- test: npm test -- --grep "relevant test name"
- acceptance:
  - WHEN [trigger] THEN [expected outcome]
  - WHEN [edge case] THEN [expected handling] AND [side effect if any]
```

### 2. File paths must be exact

- Use `CREATE:` for new files and `MODIFY:` for existing files
- Include line number references for modifications where known (e.g., "add after line 45")
- Reference the pattern file when a new file should follow an existing convention (e.g., "follows pattern from `routes/auth.js`")

### 3. Code examples must reference codebase patterns

- Do not invent new patterns. Reference existing files.
- If the codebase uses a specific middleware pattern, show it.
- If the codebase has a test helper, reference it in the example.
- Keep examples minimal — enough to show the pattern, not the full implementation.

### 4. Test commands must be runnable

- Must be a single command that can be copy-pasted into a terminal
- If the project uses Jest: `npm test -- --grep "test name"`
- If the project uses a different runner, use that runner's syntax
- If no test exists yet (TDD), the task should say "Write test first, then implement"

### 5. Acceptance criteria must be EARS notation

- WHEN/THEN/AND format (aligned to Kiro and SDD conventions)
- Cover the happy path and at least one edge case
- Must be verifiable by running the test command or by inspection

---

## What Not to Change

- The phased plan approach (separate files per phase) — keep this
- The 2-5 minute task granularity — keep this
- The security hook avoidance pattern (DOMParser over innerHTML) — keep this
- The `spec:` reference format — already correct, no change needed

---

## Validation

After upgrading the skill, verify by generating a plan for a known feature and checking:

1. Can a fresh Claude session implement each task by reading only the task description?
2. Does every task have all five fields?
3. Are file paths exact (CREATE/MODIFY with paths)?
4. Do code examples reference existing codebase patterns?
5. Are test commands runnable as-is?
6. Are acceptance criteria in WHEN/THEN/AND format?

If any task fails these checks, the skill needs further refinement.

---

## Merge with Existing #16 Scope

MASTER-TODO #16 already covers two writing-plans changes:
- Phased plan approach for large implementations
- Security hook avoidance pattern (DOMParser over innerHTML)

This upgrade adds:
- Five-field build-ready task format enforcement
- Exact file paths with CREATE/MODIFY
- Codebase-referenced code examples
- Runnable test commands
- EARS acceptance criteria

All changes go into the same skill update. One PR, one session.

---

## Impact Assessment

| Area | Impact |
|---|---|
| Existing plan files | None — already-written plans are not affected |
| Current sessions | None — skill change only affects future plan generation |
| CLAUDE.md files | None — no config change |
| Other skills | None — only `writing-plans` is modified |
| Session handoff workflow | Enables it — this is the prerequisite |
