---
author: both
order: 140
title: Context Loading Architecture — What Loads, When, and How to Optimise
---


# Context Loading Architecture

This document defines what context loads into each Claude Code session, identifies redundancy and waste, and establishes an activity-based loading model so the right context loads for the right type of work.

This is the companion to `context-hygiene.md` (file lifecycle and retention). Context hygiene ensures files stay within size budgets. Context loading architecture ensures only the right files load at the right time.

---

## Problem Statement

An audit on 2026-03-06 measured the total context loaded into a job-app session before any conversation begins:

| Source | Lines | Mechanism |
|---|---|---|
| Global `~/.claude/CLAUDE.md` | 99 | Always loaded |
| `simon-context/SKILL.md` (via @import) | 232 | Expanded inline by `@` directive |
| Root `~/Documents/Claude/CLAUDE.md` | 116 | Loaded walking up directory tree |
| `job-app/CLAUDE.md` | 216 | Project-specific |
| `MEMORY.md` (job-app) | 74 | Auto memory (first 200 lines) |
| Skill descriptions (system prompt) | ~500+ | 23 custom + plugin skills |
| **Total before conversation** | **~1,237+** | |

The official best practice target is **under 200 lines per CLAUDE.md file**. The total always-loaded config is over 6x that target.

Additionally, the same context loads regardless of activity. A quick research question loads the same 1,237+ lines as a full build session. A job search session loads build pipeline rules, SDD conventions, and PM skill descriptions it will never use.

---

## How Context Loading Works

### Loading hierarchy (highest priority wins)

1. **User instructions** — `~/.claude/CLAUDE.md` (applies to ALL projects)
2. **Directory tree walk** — Claude walks up from working directory, loading each `CLAUDE.md` it finds
3. **Project instructions** — `./CLAUDE.md` or `./.claude/CLAUDE.md`
4. **Local overrides** — `./CLAUDE.local.md` (machine-local, not checked into git)
5. **Rules** — `.claude/rules/*.md` files (can be path-scoped)
6. **Auto memory** — `MEMORY.md` (first 200 lines only)
7. **Skill descriptions** — loaded into system prompt for all registered skills

### What loads automatically vs on-demand

| Content type | When loaded | Token cost |
|---|---|---|
| CLAUDE.md (all levels) | Every session start | Full content |
| `@` imported files | Every session start | Full content expanded inline |
| MEMORY.md (first 200 lines) | Every session start | First 200 lines |
| Skill descriptions | Every session start | Summary per skill (~20 lines each) |
| Full skill content (SKILL.md) | When skill is invoked | Full content |
| `.claude/rules/` files (no frontmatter) | Every session start | Full content |
| `.claude/rules/` files (with `paths:`) | Broken at user level; on file read at project level | Full content |
| Memory topic files | When Claude reads them on-demand | Full content |

### Key mechanisms for controlling what loads

| Mechanism | Effect |
|---|---|
| `@import` in CLAUDE.md | Expands full file content inline — loads EVERY session |
| `disable-model-invocation: true` in SKILL.md frontmatter | Prevents skill description from loading in system prompt |
| `.claude/rules/` without frontmatter | Rules load unconditionally every session |
| `.claude/rules/` with `paths:` frontmatter | **Broken at user level** — open bugs [#21858](https://github.com/anthropics/claude-code/issues/21858), [#17204](https://github.com/anthropics/claude-code/issues/17204). Works at project level with `globs:` syntax only. |
| `claudeMdExcludes` in `.claude/settings.local.json` | Excludes specific CLAUDE.md files from loading |
| Memory topic files (not MEMORY.md) | Only loaded when Claude decides to read them |

---

## Audit Findings

### Finding 1: simon-context double-loaded (232 wasted lines)

**Severity:** Critical — single biggest waste

Line 3 of global `~/.claude/CLAUDE.md` contains `@~/.claude/skills/simon-context/SKILL.md`, which expands the full 232-line file inline. Separately, simon-context is registered as a skill, so its description also loads into the system prompt.

Result: 232 lines of full content PLUS a description summary. The full content loads even when it is not relevant (e.g. a quick git operation).

**Fix:** Remove the `@` import. Simon-context is already available as a skill. Claude reads it on-demand when voice, style, or cognitive support is relevant.

### Finding 2: Root CLAUDE.md has project-specific content (60 lines for all projects)

`~/Documents/Claude/CLAUDE.md` (116 lines) contains ~60 lines of detailed KB vault writing and syncing instructions. These load for every project — job-app, applyr, todo, todo-viewer — even when doing zero KB work.

Content includes: detailed sync script usage, environment variables, frontmatter format, file naming conventions, push-after-every-write rules.

**Fix:** Move KB vault instructions to `~/Documents/Claude/knowledge-base/CLAUDE.md` (which already exists at 190 lines and has room for focused additions) or to a `.claude/rules/kb-vault-writing.md` scoped to `knowledge-base/**`.

### Finding 3: job-app/CLAUDE.md has redundant sections (40-60 lines)

Three sections in `job-app/CLAUDE.md` duplicate content already loaded from higher-level files:

| Section | Lines | Duplicates |
|---|---|---|
| "Agents available globally" | ~8 | Global `~/.claude/CLAUDE.md` agent list |
| "Background rules active silently" | ~4 | Global `~/.claude/CLAUDE.md` background skills |
| "Communication Rules" | ~8 | `simon-context/SKILL.md` preferences |
| n8n credential/workflow IDs | ~25 | `memory/infrastructure-ids.md` |

Total: ~45 lines that provide zero additional value.

**Fix:** Remove duplicate sections. The n8n reference data already lives in `memory/infrastructure-ids.md` — Claude reads it on-demand when n8n work is relevant.

### Finding 4: No path-scoped rules used anywhere

No `.claude/rules/` directories exist in any project or at the global level. This means all instructions are in CLAUDE.md files and load unconditionally.

Path-scoped rules are the primary mechanism for loading instructions only when relevant:

```markdown
---
paths:
  - "server/**/*.js"
---
# Backend coding rules
- All routes require authentication middleware
```

**Fix:** Adopt `.claude/rules/` for topic-specific instructions that should not load globally.

### Finding 5: No skill invocation control flags set

None of the 23 custom skills use `disable-model-invocation: true`. This means all 23 skill descriptions load into the system prompt of every session.

Seven PM skills are only used via the product-manager agent. Six process skills are only invoked at specific pipeline stages. Their descriptions add ~260 lines to every session's system prompt with no benefit for most session types.

**Fix:** Set `disable-model-invocation: true` on skills that should only be invoked explicitly or by agents:
- All 7 PM skills (loaded by product-manager agent, not directly)
- Generative skills: product-design, app-scaffold (invoked explicitly, not every session)

Note: update-skill, update-nas, update-simon-context already have this flag set.

### Finding 6: Knowledge Base Vault section repeated across projects

The instruction "At session end, write or update vault articles under `products/{project}/`" appears in:
- Root `~/Documents/Claude/CLAUDE.md` (general KB vault writing instructions)
- `knowledge-base/CLAUDE.md` (KB-specific vault section)
- `applyr/CLAUDE.md` (Applyr-specific vault section)
- `todo/CLAUDE.md` (via Design Spec reference)

Each repetition is slightly different. The root CLAUDE.md has the most detail (~60 lines), while project files have 5-10 line summaries pointing to project-specific vault paths.

**Fix:** Consolidate vault writing instructions in one place. The root CLAUDE.md should have a brief reference (3 lines), not the full procedure. Full procedure lives in the `kb-writing` skill (already built, #71 complete).

### Finding 7: job-app MEMORY.md contains cross-project state

The job-app project memory (`MEMORY.md`) contains detailed status on Applyr, KB, Todo Viewer, Sprint Viewer, and Development Platform. This cross-project state was inherited from when job-app was the coordination point for all work.

Per the context-hygiene policy (#72 sub-task C), MEMORY.md should contain only state relevant to its project.

**Fix:** Move cross-project state to the root project memory (`~/.claude/projects/-Users-simonpaynter-Documents-Claude/memory/MEMORY.md`). Keep only job-search-relevant state in the job-app memory.

### Finding 8: Root project MEMORY.md has stale state (89 lines)

The root memory file contains ToDo project state from session 43 and KB v2.1.1 status that duplicates MASTER-TODO. Agent architecture notes already exist in the `claude-workflow.md` KB article.

**Fix:** Trim to current coordination state only. Remove content that now lives in KB vault articles or MASTER-TODO.

---

## Activity-Based Loading Model

Different types of work need different context. The goal is to load only what is needed.

### Activity profiles

| Activity | Core context needed | NOT needed |
|---|---|---|
| **Job searching** | job-profile, job-evaluate, job-search, cover-letter | PM skills, code-quality, infra-context, nas-ops, build pipeline, SDD conventions |
| **Building/coding** | code-quality, infra-context, writing-plans, build pipeline | PM skills, job skills, blog-workshop |
| **PM work** | PM skills (via product-manager agent), product-design | Job skills, code-quality, nas-ops |
| **Research/exploration** | simon-context (for communication style) | Most skills, build pipeline, detailed project context |
| **NAS operations** | nas-ops, nas-deploy, infra-context | PM skills, job skills |
| **Writing/blogging** | anti-slop, blog-workshop, simon-context | Code-quality, infra-context, build pipeline |
| **Session close-out** | end-of-session | Most other skills |

### Current state vs target state

**Current:** Every session loads everything — all CLAUDE.md files, all skill descriptions, full simon-context via @import.

**Target:** Session context scales with task complexity:

| Session type | Current load | Target load | Reduction |
|---|---|---|---|
| Quick research question | ~1,237 lines | ~400 lines | 68% |
| Job search session | ~1,237 lines | ~600 lines | 51% |
| Build session | ~1,237 lines | ~700 lines | 43% |
| Full PM session | ~1,237 lines | ~800 lines | 35% |

### How to achieve activity-based loading

1. **Remove unconditional @imports** — simon-context loads on-demand, not every session
2. **Use `disable-model-invocation: true`** — PM and orchestrator-internal skills do not load descriptions
3. **Move project-specific content out of root CLAUDE.md** — KB vault instructions only load in KB sessions
4. **Adopt `.claude/rules/`** — path-scoped rules load only when working in relevant directories
5. **Keep CLAUDE.md files lean** — reference data in memory files, detailed instructions in skills

---

## Recommendations — Priority Order

### Priority 1: Remove simon-context @import (5 minutes)

Remove `@~/.claude/skills/simon-context/SKILL.md` from line 3 of `~/.claude/CLAUDE.md`. The skill system already makes simon-context available for Claude to read when relevant.

**Impact:** -232 lines per session. Zero risk — skill content is still accessible.

### Priority 2: Move KB vault instructions out of root CLAUDE.md (15 minutes)

Move the ~60 lines of vault writing/syncing instructions from `~/Documents/Claude/CLAUDE.md` into `~/Documents/Claude/knowledge-base/CLAUDE.md`. Replace with a 3-line reference:

```markdown
## KB Vault Writing
When writing vault content, read the kb-writing skill and follow the sync procedure in `knowledge-base/CLAUDE.md`.
```

**Impact:** -57 lines per session for non-KB projects. The instructions still load when working in the KB project.

### Priority 3: Remove job-app CLAUDE.md duplicates (10 minutes)

Remove the "Agents available globally", "Background rules active silently", and "Communication Rules" sections. Move n8n credential/workflow ID tables to `memory/infrastructure-ids.md` (already exists there — just remove the CLAUDE.md copy).

**Impact:** -45 lines per job-app session. No information lost.

### Priority 4: Add `disable-model-invocation` to 9 agent-only and generative skills (15 minutes)

Add `disable-model-invocation: true` to SKILL.md frontmatter for:
- pm-product-documentation, pm-feature-spec, pm-roadmap-management, pm-competitive-analysis, pm-stakeholder-comms, pm-user-research-synthesis, pm-metrics-tracking (7 PM skills)
- product-design, app-scaffold (2 generative skills — invoked explicitly, not every session)

Note: update-skill, update-nas, update-simon-context already have this flag set.

**Impact:** -220+ lines of system prompt per session. Skills still invocable when needed.

### Priority 5: Clean job-app MEMORY.md (15 minutes)

Move Applyr, KB, Todo Viewer, Sprint Viewer, and Development Platform status to root project memory. Keep only: job search pipeline status, scoring prompt versions, n8n ingest status, application tracking.

**Impact:** -30 lines per job-app session. Cross-project state accessible from root sessions.

### Priority 6: Trim root project MEMORY.md (10 minutes)

Remove stale ToDo session 43 state and KB v2.1.1 status. Remove agent architecture notes (now in KB vault article `claude-workflow.md`). Keep only current coordination state.

**Impact:** -40 lines per root session.

### Priority 7: Compress simon-context/SKILL.md (20 minutes)

Target: under 150 lines (from current 232). Compress:
- Health & Focus Context (10 lines) — reduce to 3 lines
- Decision Support Mode (15 lines) — reduce to 5 lines
- Writing Style Profile — merge with Communication Preferences (remove overlap)
- Response Format Guidelines — reduce to 3 lines (standard structured output)

**Impact:** -80 lines when loaded. Combined with Priority 1, this reduces on-demand load too.

### Priority 8: Adopt `.claude/rules/` for scoped instructions (30 minutes)

Create rules files for instructions that should only load when working in specific paths:

| Rule file | Path scope | Content moved from |
|---|---|---|
| `.claude/rules/sdd.md` | `**/*.md` plan files | Global CLAUDE.md SDD section (48 lines) |
| `.claude/rules/nas-work.md` | Container Station paths | Global CLAUDE.md when NAS ops relevant |

**Impact:** SDD conventions only load when working on plan files. NAS rules only load when touching NAS paths.

---

## Total Estimated Impact

| Change | Lines saved | Time |
|---|---|---|
| P1: Remove simon-context @import | 232 | 5 min |
| P2: Move KB vault instructions | 57 | 15 min |
| P3: Remove job-app duplicates | 45 | 10 min |
| P4: Disable PM skill descriptions | 220+ | 15 min |
| P5: Clean job-app MEMORY.md | 30 | 15 min |
| P6: Trim root MEMORY.md | 40 | 10 min |
| P7: Compress simon-context | 80 | 20 min |
| P8: Adopt .claude/rules/ | 48+ | 30 min |
| **Total** | **~752+ lines** | **~2 hours** |

This would reduce the always-loaded context from ~1,237 lines to ~485 lines — a **61% reduction**.

---

## Relationship to Context Hygiene (#72)

Context hygiene (completed session 59) established:
- Size budgets per file type
- Retention policies for operational files
- End-of-session hygiene checks

This document extends that work with:
- Cross-file redundancy analysis (not covered by single-file size checks)
- Activity-based loading strategy (not covered by retention policies)
- `disable-model-invocation` and `.claude/rules/` adoption (not covered by existing hygiene)
- Total context budget calculation (aggregate, not per-file)

The end-of-session skill should be updated to include a "context loading check" alongside the existing hygiene check — verifying that no new @imports or duplicate sections have been introduced.

---

## Per-Project Audit Summary

### Global `~/.claude/CLAUDE.md` (99 lines + 232 via @import = 331 effective)

| Assessment | Detail |
|---|---|
| Over budget | Yes — 331 effective lines vs 200 target |
| Primary issue | @import of simon-context expands 232 lines inline |
| Secondary issue | SDD conventions example block (48 lines) loads globally but applies only to plan file work |
| Keep | Agent definitions, Development Pipeline, Cross-Project Boundary, Context Hygiene |
| Remove | @import of simon-context |
| Move | SDD conventions example to `.claude/rules/sdd.md` |

### Root `~/Documents/Claude/CLAUDE.md` (116 lines)

| Assessment | Detail |
|---|---|
| Over budget | No — but contains content that should not load for all projects |
| Primary issue | KB vault writing instructions (~60 lines) load for all projects |
| Keep | Projects table, Master Todo section, Notes |
| Move | KB vault instructions to `knowledge-base/CLAUDE.md` |

### `job-app/CLAUDE.md` (216 lines)

| Assessment | Detail |
|---|---|
| Over budget | Yes — 216 lines vs 200 target |
| Primary issue | Duplicates global agent list, background skills, communication rules |
| Secondary issue | n8n credential/workflow IDs duplicate memory file |
| Keep | Project Purpose, Key Files, Available Commands, Role Tracks, Architecture overview, Workflow, Important Constraints |
| Remove | Agents available globally, Background rules, Communication Rules |
| Move | n8n IDs to memory/infrastructure-ids.md (already exists) |

### `knowledge-base/CLAUDE.md` (190 lines)

| Assessment | Detail |
|---|---|
| Over budget | No — under 200 |
| Minor issue | "Background Skills" section (5 lines) duplicates global CLAUDE.md |
| Action | Remove Background Skills section. Will receive KB vault instructions from Priority 2. |

### `applyr/CLAUDE.md` (97 lines)

| Assessment | Detail |
|---|---|
| Over budget | No — well under target |
| Status | Clean and focused. Good example of lean project CLAUDE.md. |
| Action | None required. |

### `todo/CLAUDE.md` (68 lines)

| Assessment | Detail |
|---|---|
| Over budget | No — well under target |
| Status | Clean and focused. |
| Action | None required. |

### `simonsays42/` and `todo-viewer/`

No CLAUDE.md files. No action needed.

---

## MASTER-TODO Items to Add

These recommendations should be tracked as tasks:

| Task | Project | Priority | Depends on | Est |
|---|---|---|---|---|
| Context loading optimisation P1-P3: remove @import, move KB instructions, clean job-app duplicates | Cross-project | P1 | — | 30 min |
| Context loading optimisation P4: add disable-model-invocation to 9 skills | Claude skills | P2 | — | 15 min |
| Context loading optimisation P5-P6: clean MEMORY.md files | Cross-project | P2 | — | 25 min |
| Context loading optimisation P7: compress simon-context | Claude skills | P2 | — | 20 min |
| Context loading optimisation P8: adopt .claude/rules/ | Cross-project | P3 | — | 30 min |
| Update end-of-session skill with context loading check | Claude skills | P2 | P1-P3 done | 10 min |

---

## Knowledge Placement Standard

Different types of knowledge have different homes. This section defines where each type belongs, so sessions do not have to rediscover the pattern.

### The four layers

| Layer | Purpose | Loaded when | Examples |
|---|---|---|---|
| **MEMORY.md** | Quick-reference facts a session needs immediately | Every session start (first 200 lines) | Connection strings, current version, credential locations, known workarounds, workflow IDs |
| **KB Vault** | Durable knowledge that persists across sessions and is searchable | On-demand (when Claude reads a vault page) | Architecture docs, conventions, deployment lessons, release notes, feature status |
| **Skills** | Executable procedures loaded when a specific type of work begins | On-demand (when skill is invoked) | `lifecycle:release`, `nas-deploy`, `kb-writing`, `end-of-session` |
| **CLAUDE.md** | Project identity and rules that shape every interaction | Every session start | Tech stack, coding conventions, file structure, development commands |

### What goes where

| Knowledge type | Correct layer | Wrong layer | Why |
|---|---|---|---|
| IP addresses, ports, database names | MEMORY.md | KB Vault | Needed immediately every session, not worth a vault lookup |
| Current version number | MEMORY.md | KB Vault | Sessions check this constantly; stale version causes confusion |
| Deployment procedures | KB Vault (runbook) | MEMORY.md | Too detailed for memory; runbooks are reference docs, not session bootstrapping |
| Lessons learned from incidents | KB Vault (shared page) | MEMORY.md | Cross-project knowledge; must be discoverable and searchable |
| Release history | KB Vault (release pages) | MEMORY.md | Historical record, not session state |
| How to release a version | Skill (`lifecycle:release`) | KB Vault | Executable procedure, not reference material |
| How to create a container | Skill (`nas-deploy`) | KB Vault | Executable procedure with decision logic |
| Setup/recovery for a specific system | KB Vault (setup & recovery doc) | Skill | One-time or rare procedure, not a repeatable skill |
| Coding standards | CLAUDE.md or `.claude/rules/` | KB Vault | Must load automatically to enforce consistently |
| API response format | CLAUDE.md | MEMORY.md | Convention, not reference data |

### Key principles

1. **MEMORY.md is an index, not a knowledge store.** If it takes more than 2-3 lines to describe something, it belongs in KB Vault or a memory topic file. MEMORY.md points to where the detail lives.

2. **KB Vault is the system of record.** Anything that needs to survive beyond a single project's memory belongs here. Lessons learned, architecture decisions, conventions, and runbooks all live in the vault.

3. **Skills are for repeatable procedures.** If you do the same multi-step process regularly (releasing, deploying, writing KB articles), it is a skill. If you do it once or rarely (initial production setup, disaster recovery), it is a KB Vault runbook.

4. **Runbooks vs skills:** A runbook documents how to set up or recover a specific system — it has concrete values, specific container names, and step-by-step instructions for one environment. A skill defines a repeatable process that works across projects and environments. When a runbook step becomes a recurring operation, extract it into a skill.

5. **Lessons learned belong in shared KB pages, not project memory.** A deployment lesson (e.g. "PostgreSQL has no cross-database queries") applies to all projects. Write it to a shared page under `operations/infrastructure/` so every project can reference it. Do not store it in a project-specific MEMORY.md where other projects cannot find it.

6. **Session events are not knowledge.** "We hit a rate limiter on 2026-03-11" is a session event. "Watchtower restarts clear in-memory rate limiters" is knowledge. Only the second one gets stored. Session events live in the session log (if anywhere) and get discarded by retention policy.

### Anti-patterns

| Anti-pattern | Why it fails | Correct approach |
|---|---|---|
| Deployment lessons in MEMORY.md | Other projects cannot see them; memory grows with events | Write to shared KB page under `operations/infrastructure/` |
| Runbook steps that are known to be wrong | Future sessions execute broken steps before finding the lessons section | Fold fixes into the procedure steps immediately |
| Cross-database SQL in runbooks | PostgreSQL does not support it; causes failure on execution | Use the COPY pipe pattern documented in `nas-deployment-lessons.md` |
| Session log entries treated as knowledge | Session logs are retained for 10 sessions then archived; knowledge disappears | Extract durable knowledge to KB Vault before the session log ages out |
| Duplicating CLAUDE.md content in MEMORY.md | Double-loaded, diverges over time | Store in one place; use the loading hierarchy |

---

## Implementation Status

Sprint `system-context-loading` completed 2026-03-14 (session 73), fix applied 2026-03-18.

| Priority | Status | Notes |
|---|---|---|
| P1: Remove simon-context @import | Done | -232 lines |
| P2: Move KB vault instructions | Done (revised) | Moved to `~/.claude/rules/kb-vault-ops.md` as unconditional rule. Original plan used path-scoping which is broken at user level. |
| P3: Remove job-app duplicates | Done | -45 lines |
| P4: Disable 9 skill descriptions | Done | -180+ lines |
| P5: Clean MEMORY.md files | Done | -124 lines across 4 files |
| P6: Trim root MEMORY.md | Done | (included in P5) |
| P7: Compress simon-context | Done | 232 → 150 lines |
| P8: Adopt .claude/rules/ | Done (revised) | Unconditional rules, not path-scoped. Path-scoping broken at user level — bugs #21858, #17204. |

**Actual result:** ~629 lines loaded per session (49% reduction from 1,237 baseline). Original target was 485 (61%). The 144-line gap is the two rule files loading unconditionally instead of conditionally.

### Known limitation: user-level path-scoped rules

Path-scoped rules (`paths:` frontmatter) in `~/.claude/rules/` do not work due to open bugs:
- [#21858](https://github.com/anthropics/claude-code/issues/21858): `paths:` in `~/.claude/rules/` completely ignored
- [#17204](https://github.com/anthropics/claude-code/issues/17204): YAML list syntax broken by internal CSV parser
- [#16299](https://github.com/anthropics/claude-code/issues/16299): path-scoped rules may load globally regardless

Project-level `.claude/rules/` with `globs:` syntax (comma-separated, unquoted) does work but triggers on file reads, not working directory. Rules never unload once triggered.

If these bugs are fixed upstream, the two rule files could be re-scoped. Monitor the GitHub issues.

---

## Related Documents

- Context hygiene and retention policies: `operations/engineering-practice/context-hygiene.md`
- Skills overview and lifecycle: `operations/engineering-practice/skills/skills-overview.md`
- Claude workflow and agent setup: `operations/engineering-practice/claude-workflow.md`
- Session handoff workflow: `operations/engineering-practice/session-handoff-workflow.md`
- MASTER-TODO: `todo-viewer/MASTER-TODO.md` — #72 (context hygiene, completed)
