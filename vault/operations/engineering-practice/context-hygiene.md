---
author: both
order: 110
title: Context Hygiene — File Lifecycle and Retention
---


# Context Hygiene — File Lifecycle and Retention

Operational files in the Claude Code environment — session logs, memory files, plan files, and skills — grow without limit. Every session appends to logs, updates memory, and writes vault articles. Nothing is ever trimmed, archived, or retired. Over time this degrades session quality: larger files consume more context window, stale content creates confusion, and oversized skills add unnecessary weight.

This document defines retention policies, size budgets, and hygiene procedures for all operational file types. It is the authoritative reference. The `end-of-session` skill enforces these rules.

---

## Problem Statement

An audit on 2026-03-05 found:

| File Type | Worst Case | Problem |
|---|---|---|
| Session log | 843 lines / 67KB | Append-only, never archived |
| Plan files | 5 of 13 over 200 lines, largest 830 lines / 41KB | Completed plans never removed |
| MEMORY.md | 177 lines / 11KB (job-app project) | Cross-project state stored in a project-specific directory |
| Skills | 8 of 27 over 200 lines, largest 566 lines / 19KB | PM skills add ~100KB when loaded together |
| CLAUDE.md | job-app at 216 lines / 10KB | Growing beyond useful threshold |

The root cause: the `end-of-session` skill is append-only. It adds session log entries, updates MEMORY.md, and writes vault articles — but never trims, archives, or checks sizes. Every session makes every file larger.

---

## Retention Policies

### Session Logs (`memory/session-log.md`)

**Rule:** Keep only the last 10 sessions in the active log. Archive older entries.

**Procedure:**
1. When the active log exceeds 10 session entries, move all entries except the most recent 10 to `memory/session-log-archive.md`
2. Add a header to the archive file: `# Session Log — Archive` with the date range covered
3. The archive file is append-only — new archived entries go at the bottom
4. The archive is never loaded into context. It exists for historical reference only.

**Size budget:** Active log should stay under 150 lines / 10KB.

### MEMORY.md (`memory/MEMORY.md`)

**Rule:** Maximum 200 lines. Index only — point to topic files for detail.

**Procedure:**
1. MEMORY.md is an index and status dashboard, not a knowledge store
2. Detailed state for a topic (e.g. Applyr phases, KB architecture, resume management) goes in topic files: `memory/{topic}.md`
3. MEMORY.md references topic files with relative paths
4. At end-of-session, if MEMORY.md exceeds 200 lines: extract the largest section into a topic file, replace with a one-line reference
5. Remove completed project state — once a phase or version is released and stable, condense to one status line

**Size budget:** Under 200 lines. Under 12KB.

**Cross-project state:** MEMORY.md files are scoped to a project directory (`~/.claude/projects/{slug}/memory/`). If cross-project state is needed, it should live in the project that is the active coordination point (currently job-app). Do not duplicate state across project memory directories.

### Plan Files (`~/.claude/plans/`)

**Rule:** Archive or delete completed plans. Name active plans clearly.

**Procedure:**
1. When a plan is fully completed (all tasks done, shipped to production), delete the plan file
2. When a plan is superseded by a newer plan, delete the old one
3. Plans in active use keep their auto-generated names (Claude Code assigns these)
4. Before starting a new plan, scan for stale plans: any plan not referenced in MEMORY.md or MASTER-TODO is a candidate for deletion
5. At end-of-session, if a plan was completed this session, delete it immediately

**Current state (2026-03-05):** 13 plan files, 5 oversized. Requires a one-time cleanup pass (sub-task B).

### Skills (`~/.claude/skills/{name}/SKILL.md`)

**Rule:** Core instructions under 150 lines / 8KB. Reference material in separate files.

**Procedure:**
1. A skill's `SKILL.md` should contain only what Claude needs to execute the skill: rules, templates, checklists, examples
2. Background reference material (long lists of examples, detailed frameworks, extensive templates) goes in `references/` subdirectory
3. The skill loads `references/` only when needed, not on every invocation
4. PM skills (loaded by the product-manager agent) should be especially lean — the agent loads multiple skills per task, so each one contributes to cumulative context weight
5. At skill review time, check line count. If over 150 lines, identify what can move to references.

**Size budget:** SKILL.md under 150 lines / 8KB. References directory unconstrained.

**Current state (2026-03-06):** 8 target skills trimmed to budget (sub-task D complete). 9 additional skills remain 152-232 lines — within tolerance for now. Retention policy encoded in end-of-session Step 0 (sub-task E).

### CLAUDE.md Files

**Rule:** Project CLAUDE.md under 200 lines. Move reference data to linked files.

**Procedure:**
1. CLAUDE.md should contain: project purpose, key files, available commands, architecture overview, constraints
2. Detailed reference data (full schema, API endpoints, credential lists, workflow details) should live in project docs and be referenced by path
3. Do not duplicate information that is already in MEMORY.md, vault articles, or skill files
4. Review at end-of-session if CLAUDE.md was edited — check for bloat

**Size budget:** Under 200 lines / 10KB.

---

## Implementation Plan

Five sub-tasks, one session each. **ALL COMPLETE** (session 58-59). Reference: MASTER-TODO #72.

### Sub-task A: Session Log Archival

**Scope:** One-time cleanup + establish the archival rule.

1. Read `memory/session-log.md` in the job-app project memory directory
2. Identify the 10 most recent session entries
3. Move all older entries to `memory/session-log-archive.md`
4. Verify the active log is under 150 lines
5. Repeat for the root Claude project memory directory if needed
6. Document the archival procedure (already in this article)

**Estimated:** 30 minutes.

### Sub-task B: Plan File Lifecycle

**Scope:** One-time cleanup + establish the lifecycle rule.

1. List all files in `~/.claude/plans/`
2. For each plan, determine status: active (referenced in MEMORY.md or MASTER-TODO), stale (not referenced), or completed
3. Delete completed and stale plans
4. Verify remaining plans are referenced somewhere
5. Record which plans were kept and why in this article's "Current State" section

**Estimated:** 30 minutes.

### Sub-task C: MEMORY.md Restructure

**Scope:** Restructure the job-app MEMORY.md to be an index under 150 lines.

1. Read the job-app MEMORY.md (177 lines, 11KB)
2. Identify sections that should be topic files (Applyr state, KB state, key IDs, n8n lessons)
3. Extract each section into `memory/{topic}.md`
4. Replace each extracted section in MEMORY.md with a one-line reference
5. Verify MEMORY.md is under 150 lines
6. Verify all topic files are self-contained and useful

**Estimated:** 45 minutes.

### Sub-task D: Skill Size Audit

**Scope:** Trim 8 oversized skills to meet the 150-line budget.

Target skills (from audit):
| Skill | Current Lines | Target |
|---|---|---|
| pm-product-documentation | 566 | <150 + references |
| nas-deploy | 239 | <150 + references |
| pm-metrics-tracking | 276 | <150 + references |
| infra-context | 211 | <150 + references |
| app-scaffold | 229 | <150 + references |
| pm-user-research-synthesis | 197 | <150 + references |
| end-of-session | 228 | <150 (no references needed — trim) |
| pm-stakeholder-comms | 264 | <150 + references |

For each skill:
1. Read the current SKILL.md
2. Identify core instructions (must stay) vs reference material (can move)
3. Move reference material to `references/` subdirectory
4. Verify the skill still works correctly with the split
5. Update the vault article for the skill if one exists

**Estimated:** 60 minutes (longest sub-task).

### Sub-task E: Encode Retention Policy

**Scope:** Update `end-of-session` skill to enforce all rules. The lasting deliverable.

1. Add a "Step 0: Hygiene Check" to the beginning of `end-of-session` SKILL.md:
   - Check session log line count. If over threshold, trigger archival.
   - Check MEMORY.md line count. If over 200 lines, flag for trimming.
   - Check if any plan files were completed this session. If so, delete them.
   - Report hygiene status in the final checklist table.
2. Add a "Hygiene" row to the Final Checklist table
3. Add a reference to this vault article in the skill
4. Verify this article is complete and accurate

**Estimated:** 45 minutes.

---

## Hygiene Check Reference

This is the quick-reference checklist for end-of-session hygiene. It will be embedded in the `end-of-session` skill after sub-task E.

| Check | Threshold | Action if exceeded |
|---|---|---|
| Session log entries | >10 entries | Archive older entries to `session-log-archive.md` |
| MEMORY.md lines | >200 lines | Extract largest section to topic file |
| Plan file completed this session | — | Delete the plan file |
| Skill edited this session | >150 lines | Flag for split into core + references |
| CLAUDE.md edited this session | >200 lines | Flag for review |

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-03-05 | Place context hygiene under `operations/engineering-practice/`, not a new section | Engineering practice already covers how we build — file lifecycle is the same category as SDD conventions or session handoff |
| 2026-03-05 | Do not create a "DevOps" or "Developer Operations" section | Would overlap with infrastructure (CI/CD, containers) and narrow the meaning of operations. The three-section split (ai-operating-model / engineering-practice / infrastructure) is clean. |
| 2026-03-05 | MEMORY.md stays in project-specific directories | Moving to a global location would break the `~/.claude/projects/` convention. Instead, keep one project as the coordination point and avoid duplicating state. |
| 2026-03-05 | Skills split into core + references (not trimmed by removing content) | Content is not wrong — it is just in the wrong place. Reference material has value but should not load into every session's context window. |
| 2026-03-05 | Plan files are deleted when complete (not archived) | Plans have no historical value once shipped. The session log, CHANGELOG, and vault release pages capture what was built. Archiving plans just moves the bloat problem. |

---

## Related Documents

- Skills overview and lifecycle: `operations/engineering-practice/skills/skills-overview.md`
- Session handoff workflow: `operations/engineering-practice/session-handoff-workflow.md`
- End-of-session skill: `~/.claude/skills/end-of-session/SKILL.md`
- KB vault management: `operations/engineering-practice/kb-vault-management.md`
- MASTER-TODO item: #72 (X1)
