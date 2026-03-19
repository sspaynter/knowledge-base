---
author: claude
order: 200
title: Writing Plans Skill
---


# Writing Plans Skill

**Location:** `~/.claude/skills/writing-plans/SKILL.md`
**Type:** Global skill (available in all projects)
**Replaces:** `superpowers:writing-plans` (plugin version kept as fallback but not referenced)

## Purpose

Write implementation plans where every task is build-ready — executable by a fresh Claude session with zero codebase exploration and zero follow-up questions. This is the single highest-leverage change for reducing session overhead: precise plans mean sessions execute in 10-30 minutes instead of exploring for 20 minutes then building for 10.

## Seven-Field Task Format

Every task in a generated plan must include:

| Field | Purpose |
|---|---|
| `spec:` | Links to the design document section being implemented |
| `files:` | Exact paths with CREATE/MODIFY/TEST labels |
| `code:` | Brief example referencing existing codebase patterns |
| `test:` | Runnable command (copy-paste ready) |
| `acceptance:` | WHEN/THEN/AND behaviour criteria |
| `done-when:` | One-sentence verifiable end state |
| `blocked-by:` / `blocks:` | DAG task dependencies |

## Key Principles

- **Task sizing:** One-sentence test, 3-file rule, 30-minute timeout, one new or three modified files per task
- **TDD cycle:** Write failing test, verify it fails, implement, verify it passes, commit
- **Commit-as-checkpoint:** Every completed task ends with a commit — safety mechanism for rollback
- **Phased plans:** Split plans exceeding 10 tasks into separate phase files
- **Security hook compliance:** DOMParser pattern for KB and Applyr projects (no innerHTML)

## Dependencies

- Research foundation: [Task Decomposition](/page/operations/engineering-practice/task-decomposition)
- Upgrade spec: [Writing-Plans Upgrade](/page/operations/engineering-practice/writing-plans-upgrade)
- SDD conventions: [SDD Conventions](/page/operations/engineering-practice/sdd-conventions)

## MASTER-TODO References

- #16 (S7) — skill upgrade (this implementation)
- #83 (S12) — research foundation and format expansion (prerequisite, completed)
