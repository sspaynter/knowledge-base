---
title: Session 48b Changes — anti-slop skill + release process fix
status: published
author: both
created: 2026-03-05
updated: 2026-03-05
---

# Session 48b Changes — 2026-03-05

This document records all changes made during session 48b (job-app context). Two initiatives: creating the anti-slop skill and fixing the release process version tracking gap.

---

## Initiative 1: anti-slop skill

**Problem:** AI-generated prose (cover letters, blog posts, follow-up emails) contains recognisable patterns — phrases, structures, and rhythms that signal machine authorship. Existing skills (simon-context, cover-letter) ban some buzzwords but do not cover phrase-level and structure-level patterns.

**Source:** [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) (MIT, Hardik Pandya — Atlassian Design Lead). Security reviewed: no code execution, no tool calls, no external URLs. Purely instructional text.

**What was created:**

| File | Location | Purpose |
|---|---|---|
| `SKILL.md` | `~/.claude/skills/anti-slop/SKILL.md` | 5 core rules, quick checks, scoring framework, update instructions |
| `phrases.md` | `~/.claude/skills/anti-slop/references/phrases.md` | ~70 banned phrases with replacements (deduplicated against simon-context and cover-letter) |
| `structures.md` | `~/.claude/skills/anti-slop/references/structures.md` | ~30 structural patterns to avoid |
| Vault article | `vault/operations/engineering-practice/skills/anti-slop.md` | Full skill reference with Mermaid diagram, ownership boundaries, maintenance cadence |

**What was updated:**

| File | Change |
|---|---|
| `vault/operations/engineering-practice/claude-workflow.md` | Added "On-Demand Skills" section listing anti-slop and lifecycle-release |

**Design decisions:**
- On-demand skill, not background — only loaded when producing prose for external audiences (~2,000 tokens when loaded, zero otherwise)
- Deduplicated against simon-context (voice/tone) and cover-letter (strategy/structure) — no overlap
- Phrase lists in separate reference files for easy independent update
- 3-month review cadence recommended; upstream repo is stable (5 commits, then frozen)

---

## Initiative 2: Release process version tracking fix

**Problem:** When KB released v2.1.0, the MEMORY.md for the job-app project still said v2.0.1. The lifecycle-release skill had 11 execution steps — none of them updated MEMORY.md. The end-of-session skill mentioned updating "Current state" but was not explicit about version numbers. Cross-project version references went stale because releases happen in project-specific sessions.

**Root cause:** No step in the release pipeline wrote the version to persistent memory. The end-of-session skill was the only safety net, and it was not specific enough to reliably catch version drift.

**What was changed:**

| File | Change |
|---|---|
| `~/.claude/skills/lifecycle-release/SKILL.md` | Added step 12: update MEMORY.md with new version, release date, and phase status. Added to non-negotiables table. Updated common mistakes table. Updated verification output to include MEMORY.md line. |
| `~/.claude/skills/end-of-session/SKILL.md` | Step 3: added explicit bullet for version verification after releases. Added cross-project version reference guidance (use live-check pattern, do not pin). |
| `memory/MEMORY.md` | KB production line: replaced pinned version `v2.1.0` with live-check reference `check /api/version`. |
| `vault/operations/engineering-practice/skills/lifecycle-release.md` | Updated to reflect 12 steps. Added MEMORY.md to non-negotiables. Updated Phase 4 and Phase 5 descriptions. |

**Design decisions:**
- **Option A adopted for version tracking:** Projects with live version endpoints (e.g. `/api/version`) use a live-check reference in cross-project MEMORY.md. Projects without endpoints keep pinned versions (accepted staleness, caught at end-of-session).
- **lifecycle-release owns the version write**, not end-of-session. The release skill has perfect knowledge of the version at execution time. End-of-session is the backup check.

---

## Files changed this session (complete list)

| File | Action | Initiative |
|---|---|---|
| `~/.claude/skills/anti-slop/SKILL.md` | Created | anti-slop |
| `~/.claude/skills/anti-slop/references/phrases.md` | Created | anti-slop |
| `~/.claude/skills/anti-slop/references/structures.md` | Created | anti-slop |
| `vault/operations/engineering-practice/skills/anti-slop.md` | Created | anti-slop |
| `vault/operations/engineering-practice/claude-workflow.md` | Updated | anti-slop |
| `~/.claude/skills/lifecycle-release/SKILL.md` | Updated | release fix |
| `~/.claude/skills/end-of-session/SKILL.md` | Updated | release fix |
| `memory/MEMORY.md` | Updated | release fix |
| `vault/operations/engineering-practice/skills/lifecycle-release.md` | Updated | release fix |
| `vault/operations/engineering-practice/session-48b-changes.md` | Created | documentation |
