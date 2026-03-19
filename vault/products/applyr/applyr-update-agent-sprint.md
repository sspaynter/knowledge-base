---
author: claude
order: 80
title: Applyr — Update Agent Sprint
---



# Applyr — Update Agent Sprint

This document covers the "Applyr Update Agent" sprint: the plan, rationale, task sequencing, and operational impact of restructuring Applyr's Claude Code layer into a clean agent/skill hierarchy.

Sprint tasks: #105–#113 in MASTER-TODO.md. Sprint entry: `sprint.json` → `applyr-agent`.

---

## Pre-requisite

**This sprint does not start until Applyr v1.0.0 is in production (#44).**

The architecture refactor changes the Claude Code layer only (skills, agents, config files). It does not touch the running application, database, or infrastructure. There is no risk of breaking the app. But sequencing it after the production deploy is correct because:
1. The MVP session (#91 verification → #44 deploy) is the active focus. Interleaving a Claude Code refactor creates noise.
2. Agent files reference capabilities (e.g. `web-researcher`) that need to be built in order. Building them before they are needed adds context clutter.

---

## Sprint Goal

Restructure Applyr's flat skill layer into a clean three-tier hierarchy:

```
User / n8n trigger
    ↓
Project agents (discovery-agent, application-agent, followup-agent, job-researcher)
    ↓
Project skills (job-evaluate, job-capture, cover-letter) + Global skills (web-researcher)
```

After the sprint:
- Three orchestrator skills are promoted to agents
- One browser skill (`job-browse`) is archived and replaced by a global `web-researcher` skill
- All agent and skill definitions are updated to reference the new structure
- An end-to-end test confirms the full job search workflow runs correctly

---

## Task List

Work in the order shown. Tasks 2–5 can run in parallel after Task 1 completes. Tasks 6–8 can run in parallel after Tasks 2–5. Task 9 runs last.

| Order | # | Task | Project | Est | What it creates |
|---|---|---|---|---|---|
| 1 | 105 | Write global web-researcher skill | Claude skills | 45m | `~/.claude/skills/web-researcher/SKILL.md` |
| 2 | 106 | Create discovery-agent | Applyr | 30m | `job-app/.claude/agents/discovery-agent.md` |
| 3 | 107 | Create application-agent | Applyr | 30m | `job-app/.claude/agents/application-agent.md` |
| 4 | 108 | Create followup-agent | Applyr | 20m | `job-app/.claude/agents/followup-agent.md` |
| 5 | 109 | Update job-researcher to load web-researcher | Applyr | 20m | Updated `job-app/.claude/agents/job-researcher.md` |
| 6 | 110 | Update global `~/.claude/CLAUDE.md` | Claude skills | 10m | Adds web-researcher to global layer documentation |
| 7 | 111 | Update `job-app/CLAUDE.md` | Applyr | 20m | Updates agent/skill inventory to reflect new structure |
| 8 | 112 | Archive old skills | Applyr | 15m | Moves job-search, job-apply, job-followup, job-browse to archive |
| 9 | 113 | End-to-end test | Applyr | 45m | Confirmation the full workflow runs correctly |

Total estimated effort: ~3.5 hours.

---

## Task Detail

### Task 1 — #105: Write global web-researcher skill

**File:** `~/.claude/skills/web-researcher/SKILL.md`

**What it does:** Provides browser-based data extraction via Chrome MCP. Accepts a goal and a URL or search query. Returns structured content — extracted text, tables, lists, or data — ready for the calling agent to process.

**Tools it uses:** Chrome MCP tools — `navigate_page`, `take_snapshot`, `get_page_text`, `fill`, `click`, `read_network_requests`.

**Distinct from `researcher` agent:** `web-researcher` browses live web pages. `researcher` inspects local codebase via Bash. Same name family, opposite domains.

**Pattern:** Skill (not agent) — it is a single-purpose tool callable by any agent that needs browser data. It does not orchestrate; it extracts.

---

### Task 2 — #106: Create discovery-agent

**File:** `job-app/.claude/agents/discovery-agent.md`

**Elevates from:** `job-search` skill

**What it does:** Runs a full job discovery cycle:
1. Calls `web-researcher` to search job boards (Seek, LinkedIn, etc.) for relevant listings
2. Calls `job-evaluate` on each result to score against criteria
3. Calls `job-capture` to write passing jobs to the Applyr API
4. Returns a summary of jobs found, scored, and captured

**Key change from job-search skill:** As an agent, it runs autonomously. It can make decisions mid-cycle (e.g. skip a job board if it returns no results, retry on error) without blocking the main session.

---

### Task 3 — #107: Create application-agent

**File:** `job-app/.claude/agents/application-agent.md`

**Elevates from:** `job-apply` skill

**What it does:** Runs a full application cycle for a given job ID:
1. Reads job context from the Applyr API
2. Triggers research (if not already done) — calls `job-researcher`
3. Generates cover letter via `cover-letter` skill
4. Generates resume tailoring (calls Applyr resume endpoint)
5. Presents application package for review
6. Coordinates submission steps

---

### Task 4 — #108: Create followup-agent

**File:** `job-app/.claude/agents/followup-agent.md`

**Elevates from:** `job-followup` skill

**What it does:** Manages follow-up for submitted applications:
1. Queries Applyr API for jobs in `applied` status past a threshold date
2. Drafts follow-up emails where appropriate
3. Updates job status based on responses
4. Logs all follow-up activity to the activity log

---

### Task 5 — #109: Update job-researcher agent

**File:** `job-app/.claude/agents/job-researcher.md` (existing — update)

**Change:** Replace any direct Chrome MCP tool calls with invocations of the `web-researcher` skill. The agent continues to orchestrate research; it delegates browser work to the skill rather than doing it directly.

This is a clean-up task, not a behaviour change.

---

### Task 6 — #110: Update global CLAUDE.md

**File:** `~/.claude/CLAUDE.md`

**Change:** Add `web-researcher` to the global skills list. Single line addition. Confirms the skill is available in all sessions.

---

### Task 7 — #111: Update job-app CLAUDE.md

**File:** `job-app/CLAUDE.md`

**Change:** Replace the skill inventory section to reflect the new structure:
- Remove: `job-search`, `job-apply`, `job-followup`, `job-browse` (archived)
- Add: `discovery-agent`, `application-agent`, `followup-agent` (new agents)
- Keep: `job-evaluate`, `job-capture`, `cover-letter`, `job-researcher`
- Note: `web-researcher` is global (no project-level entry needed)

---

### Task 8 — #112: Archive old skills

**Files to archive:**
- `job-app/.claude/skills/job-search/` → `job-app/.claude/archive/skills/job-search/`
- `job-app/.claude/skills/job-apply/` → `job-app/.claude/archive/skills/job-apply/`
- `job-app/.claude/skills/job-followup/` → `job-app/.claude/archive/skills/job-followup/`
- `job-app/.claude/skills/job-browse/` → `job-app/.claude/archive/skills/job-browse/`

Do not delete — archive. Each archived skill should have a one-line note at the top: `# Archived [date] — replaced by [agent-name]`.

---

### Task 9 — #113: End-to-end test

**What to verify:**
1. `web-researcher` skill loads without errors
2. `discovery-agent` runs a search, evaluates results, captures at least one job
3. `application-agent` processes a job from `interested` status through cover letter generation
4. `followup-agent` queries applied jobs and generates a follow-up draft
5. `job-researcher` agent works correctly (uses web-researcher for browser tasks)
6. Old skill names no longer accessible (archived, not active)
7. `job-app/CLAUDE.md` and `~/.claude/CLAUDE.md` accurately reflect the live structure

---

## What Does Not Change

This sprint changes the Claude Code layer only. Nothing in the running application changes:

- Applyr Express API — no changes
- Database schema — no changes
- n8n workflows — no changes
- Docker containers — no changes
- Environment variables — no changes
- Test suite — no changes

The only files modified are `.claude/agents/`, `.claude/skills/`, and `CLAUDE.md` files.

---

## Operational Impact

After the sprint completes, the way Claude works with Applyr changes as follows:

| Before | After |
|---|---|
| "Run job-search skill" | "Run discovery-agent" |
| Skills handle multi-step workflows | Agents handle multi-step workflows; skills are single-purpose tools |
| Browser automation locked inside Applyr project | `web-researcher` skill available to all SS42 projects |
| Flat skill list — no hierarchy visible | Clear three-tier hierarchy: trigger → agent → skill |
| Session blocks while job search runs | Agent dispatched independently; session continues |

---

## Sprint Status

Tracking in `sprint.json` → `applyr-agent` entry. Task statuses: all pending (sprint has not started).

Activate the sprint in the Todo Viewer when Applyr v1.0.0 production deploy (#44) is complete.

---

## Related Documents

- Architecture background: `products/applyr/applyr-claude-code-architecture.md`
- web-researcher skill spec: `operations/engineering-practice/skills/web-researcher.md`
- Miro board: `https://miro.com/app/board/uXjVG0A-_LU=/`
- MASTER-TODO items: #105–#113
