---
title: Claude Skills — Overview and Lifecycle
status: published
order: 10
author: both
created: 2026-03-05
updated: 2026-03-05
---

# Claude Skills — Overview and Lifecycle

This document is the master reference for Simon's Claude skill ecosystem. It catalogues every skill and agent, defines how skills are categorised, describes the lifecycle from idea to retirement, identifies gaps, and links to the roadmap for new skills.

---

## What skills are

Skills are markdown instruction files that teach Claude how to do specific things. They sit at `~/.claude/skills/{name}/SKILL.md` (global) or `{project}/.claude/skills/{name}/SKILL.md` (project-scoped).

Skills are not code. They are structured prompts with rules, templates, examples, and checklists. They load into context when needed and shape how Claude behaves for that task.

**Skills are not a project.** They are cross-cutting infrastructure that serves all projects. They live under `operations/engineering-practice/` in the KB vault, not under `products/`.

---

## Skill categories

Skills fall into five categories based on when and how they load:

### 1. Context skills (background — loaded at session start)

Set the working environment. Loaded silently via `@` references in CLAUDE.md files. Never invoked directly.

| Skill | Scope | What it owns |
|---|---|---|
| simon-context | Global | Simon's cognitive style, communication preferences, writing voice, decision support |
| infra-context | Global | Deployment stack — Docker, PostgreSQL, Cloudflare, CI/CD patterns, NAS architecture |
| nas-ops | Global | QNAP NAS reference data — IPs, containers, ports, subdomains, volume conventions |
| job-profile | Job-app | Simon's job search profile — two role tracks, resume refs, preferences, scoring criteria |
| job-evaluate | Job-app | Scoring rubric — 8 dimensions, track classification, red flag list |

### 2. Quality skills (background — enforced during work)

Apply rules silently whenever relevant code or writing is produced. No user invocation needed.

| Skill | Scope | What it owns |
|---|---|---|
| code-quality | Global | Coding standards — no console.log in prod, no hardcoded creds, input validation, error handling, security minimums, no innerHTML |
| anti-slop | Global (on-demand) | AI writing pattern removal — banned phrases, structural anti-patterns, scoring framework. Loaded for prose, not for code or internal docs |

### 3. Process skills (invocable — triggered at pipeline stages)

Correspond to stages in the Development Pipeline. Invoked when the pipeline reaches that stage.

| Skill | Stage | What it does |
|---|---|---|
| product-design | Gate 0–4 | Rigid 5-gate product design: Framing → Problem → Design → Prototype → Plan |
| app-scaffold | Build (new project) | Scaffold production-ready Express + SQLite + Docker app from interview |
| lifecycle-release | Release | Full release pipeline: pre-flight → commit analysis → confirm → execute → verify |
| end-of-session | Session close | Plan update, MEMORY.md, session log, vault articles, feature status, next prompt |
| update-skill | Maintenance | Review session, propose updates to a named skill, wait for approval |
| update-nas | Maintenance | Review session, propose updates to both NAS skills in one pass |

### 4. Domain skills (invocable — specific task types)

Handle specific domains of work. User invokes them or they are loaded by orchestrators.

| Skill | Scope | What it does |
|---|---|---|
| blog-workshop | Global | Conversational blog post creation — discovery, drafting, iteration, review playground |
| cover-letter | Job-app | Cover letter writing — Problem-Solution-Evidence framework, experience selection, quality checklist |
| job-search | Job-app | Orchestrator — search LinkedIn/Seek, evaluate, present, capture |
| job-browse | Job-app | Chrome browser automation for LinkedIn and Seek |
| job-apply | Job-app | Draft application materials — cover letter, resume suggestions, gap analysis |
| job-followup | Job-app | Follow-up emails — post-interview, stale, rejection, offer |
| job-capture | Job-app | Save results to tracker via n8n webhook or CSV fallback |

### 5. Product management skills (background — loaded by PM agent)

Loaded by the `product-manager` agent, not directly by users. Each covers a PM discipline.

| Skill | What it covers |
|---|---|
| pm-product-documentation | Four-layer PM doc set — opportunity backlog, story map, feature area specs, user journeys |
| pm-feature-spec | PRDs — problem statements, user stories, requirements (MoSCoW), acceptance criteria |
| pm-roadmap-management | Roadmap planning — Now/Next/Later, RICE, ICE, dependency mapping, capacity |
| pm-competitive-analysis | Competitive analysis — landscape, feature comparison, positioning, win/loss |
| pm-stakeholder-comms | Stakeholder updates — templates by audience, status reporting, risk comms, ADRs |
| pm-user-research-synthesis | Research synthesis — thematic analysis, interview notes, personas, opportunity sizing |
| pm-metrics-tracking | Product metrics — North Star, health indicators, diagnostics, OKRs, dashboards |

---

## Agents

Agents are autonomous subprocesses that combine skills with tool access. They run as Task subagents.

### Global agents

| Agent | Model | What it does |
|---|---|---|
| researcher | Haiku | Explores codebase/problem space, returns structured research brief |
| builder | Sonnet | Implements code from research brief. Loads code-quality + infra-context. Follows TDD |
| reviewer | Sonnet | Reviews and tests built code. Runs checks, test suite. Outputs PASS or FAIL |
| pm-breakdown | Opus | Breaks product idea into outcome, tasks, acceptance criteria |
| product-manager | Sonnet | Full PM agent — loads relevant PM skills per task |

### Job search agents

| Agent | Model | What it does |
|---|---|---|
| job-researcher | Sonnet | Deep company research — overview, product, culture, news, interview prep |
| interview-prep | Sonnet | Structured interview preparation — likely questions, STAR frameworks, talking points |

---

## Skill lifecycle

Every skill follows this lifecycle:

```
IDENTIFY → DESIGN → BUILD → REGISTER → WIRE → MAINTAIN → RETIRE
```

### 1. Identify

Recognise the need. Signals:
- Same instructions repeated across 3+ sessions
- A quality pattern that should be enforced automatically
- A task type that follows a repeatable process
- A gap found during doc audit or session review

Add to MASTER-TODO under the Skills project with Seq prefix `S`.

### 2. Design

Before building, define:
- **What it owns** — the specific domain or responsibility. No overlap with existing skills.
- **What it does not own** — explicit boundaries to prevent duplication.
- **When it loads** — background (always), on-demand (user invokes), or triggered (by pipeline stage or another skill).
- **What it needs** — references to other skills, file templates, external sources.
- **What it produces** — the output artifact (formatted text, file, structured data).

Write a design brief. For complex skills, use the product-design gates.

### 3. Build

Create the skill files:

```
~/.claude/skills/{name}/
├── SKILL.md              # Core instructions, rules, templates, checklist
└── references/           # Supporting material (optional)
    ├── templates/        # File templates
    └── examples/         # Example outputs
```

Follow these conventions:
- SKILL.md is the entry point. It must be self-contained enough to work without references, but references add depth.
- Use clear section headings: What it does, When to use, How to use, Rules, Templates, Checklist, Related skills.
- Include ownership boundaries — what this skill owns vs what adjacent skills own.
- Include a maintenance section — how to update, review cadence, what triggers an update.

### 4. Register

After building:
1. Add `@` reference to the appropriate CLAUDE.md (global or project)
2. Register as a KB asset via `knowledge-base/scripts/register-skills.js`
3. Write a vault article at `operations/engineering-practice/skills/{name}.md`
4. Map relationships to other skills in the asset registry

### 5. Wire

Connect the skill to the skills and agents that should load it:
- Background skills: add `@` reference to CLAUDE.md
- On-demand skills: document the invocation command
- Triggered skills: add the `@` reference to the triggering skill or agent
- Chained skills: document the chain (e.g., anti-slop loaded by cover-letter)

### 6. Maintain

Review triggers:
- End-of-session skill check (built into end-of-session skill)
- Release of a new project version
- Session where the skill's domain was active
- Every 3 months for stable skills

Update process:
1. Use `update-skill` to review and propose changes
2. Update the vault article
3. Re-register in KB asset registry if relationships changed

### 7. Retire

When a skill is no longer needed:
1. Remove `@` references from all CLAUDE.md files
2. Archive the vault article (set status: archived)
3. Update asset registry relationships
4. Move skill folder to `~/.claude/skills/_archived/{name}/`
5. Note in MASTER-TODO completed section

---

## Ownership map

Every domain has exactly one owner. This prevents skills from duplicating or contradicting each other.

| Domain | Owner skill | Adjacent skills (do NOT duplicate) |
|---|---|---|
| Simon's voice and tone | simon-context | anti-slop (phrase-level), cover-letter (CL-specific) |
| Coding standards | code-quality | infra-context (deployment patterns) |
| AI writing patterns | anti-slop | simon-context (voice), cover-letter (CL phrases) |
| Deployment architecture | infra-context | nas-ops (NAS reference data), nas-deploy (playbooks) |
| NAS reference data | nas-ops | infra-context (patterns), nas-deploy (procedures) |
| NAS deployment procedures | nas-deploy | nas-ops (data), infra-context (patterns) |
| Product design process | product-design | pm-feature-spec (PRD format) |
| PM documentation structure | pm-product-documentation | pm-feature-spec (individual PRDs) |
| Release pipeline | lifecycle-release | end-of-session (session close) |
| Session close-out | end-of-session | lifecycle-release (releases only) |
| Cover letter content | cover-letter | anti-slop (phrase rules), simon-context (voice) |
| Job search orchestration | job-search | job-browse (browser), job-evaluate (criteria) |

---

## Current gaps

These are documented gaps where a skill does not exist but should. Each maps to a MASTER-TODO item.

### Gap 1: KB writing skill

**Need:** A skill that knows what a good vault article looks like — article templates per doc type, frontmatter standards, heading structure, cross-reference conventions, quality checklist.

**Why:** Every vault article written without this skill may not match the standard. The root CLAUDE.md has basic file format instructions but no quality criteria, no templates per doc type, no validation.

**What it would own:**
- Article templates: overview, feature-status, conventions, how-to, decision record, release notes, skill reference
- Frontmatter validation rules (required fields per doc type)
- Heading structure per template
- Cross-reference and related links format
- Quality checklist (completeness, consistency, navigability)
- Doc audit mode — scan existing docs and report gaps

**What it would NOT own:**
- PM documentation structure (owned by pm-product-documentation)
- Anti-slop rules (owned by anti-slop — kb-writing is for structure, not prose quality)
- Vault sync process (owned by root CLAUDE.md)

**MASTER-TODO:** #71 (new item)

### Gap 2: Doc audit capability

**Need:** Ability to grade whether existing docs meet the standard — check frontmatter, required sections, cross-references, consistency.

**Resolution:** Build into the kb-writing skill as an audit mode rather than a separate skill. When invoked with an audit flag, it scans a directory or file and reports gaps.

### Gap 3: Standard product doc template

**Need:** The canonical list of files every SS42 product gets, with required content per file.

**Resolution:** Complete. The reference doc is at `operations/engineering-practice/standard-product-docs.md` (KB page 482, written Session 40). It covers: 11-level Cagan/Torres document hierarchy, canonical file list by pipeline gate, required sections per doc type, Cagan-aligned feature area spec template (11 sections), work package three-field definition (description / success conditions / verification steps), single source of truth rule, and a completeness checklist. #69 upgrades pm-product-documentation to use it. The kb-writing skill (#71) enforces the per-file structure.

### Gap 4: Dynamic skill loading

**Need:** When starting a task, automatically identify which skills are relevant based on context.

**Current state:** Manual — CLAUDE.md lists background skills, user invokes others. The asset registry (#32 done) has the data but no loader uses it.

**Resolution:** Future capability. Requires the asset registry automation (#34) and a skill-loader mechanism. Not blocking current work — document as a P3 item.

---

## Skill inventory — full count

| Category | Count | Skills |
|---|---|---|
| Context (background) | 5 | simon-context, infra-context, nas-ops, job-profile, job-evaluate |
| Quality (background) | 2 | code-quality, anti-slop |
| Process (invocable) | 6 | product-design, app-scaffold, lifecycle-release, end-of-session, update-skill, update-nas |
| Domain (invocable) | 7 | blog-workshop, cover-letter, job-search, job-browse, job-apply, job-followup, job-capture |
| PM (agent-loaded) | 7 | pm-product-documentation, pm-feature-spec, pm-roadmap-management, pm-competitive-analysis, pm-stakeholder-comms, pm-user-research-synthesis, pm-metrics-tracking |
| **Total skills** | **27** | |
| **Global agents** | **5** | researcher, builder, reviewer, pm-breakdown, product-manager |
| **Project agents** | **2** | job-researcher, interview-prep |
| **Total agents** | **7** | |
| **Grand total** | **34** | |

---

## Skills roadmap

Priority order for skills work. Each item has a MASTER-TODO reference.

### Tier 1 — Foundation (do first)

| Order | # | Task | Why |
|---|---|---|---|
| 1 | 68 | Define standard product doc template | Everything else depends on knowing what "good" looks like |
| 2 | 71 | Build kb-writing skill | Every doc written without this may need reworking |
| 3 | 69 | Update pm-product-documentation with template | So it checks what exists and identifies gaps per product |
| 4 | 70 | Review work hierarchy against practice | Confirms Feature Area → Story → Task → Bug Fix works before building more on it |

### Tier 2 — Quick wins (15-30 min each)

| Order | # | Task | Why |
|---|---|---|---|
| 5 | 53 | Wire anti-slop into prose-producing skills | 15 min, immediately improves all prose output |
| ~~6~~ | ~~54~~ | ~~Upgrade lifecycle:release — living docs step~~ | ~~Done (session 72) — step 1 package.json bump, step 13 living docs, common mistakes updated~~ |

### Tier 3 — Capability builds

| Order | # | Task | Why |
|---|---|---|---|
| 7 | 16 | Upgrade writing-plans skill | Better session handoff, five-field task format |
| 8 | 34 | Automate skill asset registry | Keeps KB map view current as skills evolve |

### Tier 4 — Lifecycle chain

| Order | # | Task | Why |
|---|---|---|---|
| 9 | 20 | Build lifecycle:ideation | Brain dump → structured GitHub Issues |
| 10 | 21 | Build lifecycle:prioritize | RICE scoring, roadmap updates |
| 11 | 29 | Upgrade lifecycle:release to Approach C | AI narrative release notes (depends on #20, #21) |

---

## Context hygiene

Skills are one of several operational file types that grow without limit. The context hygiene conventions (documented at `operations/engineering-practice/context-hygiene.md`, MASTER-TODO #72) define size budgets and retention policies for all operational files including skills.

**Skill size budget:** SKILL.md under 150 lines / 8KB. Move reference material (long example lists, detailed frameworks, extensive templates) to a `references/` subdirectory. The skill loads references only when needed, not on every invocation.

**Current state (2026-03-05):** 8 of 27 skills exceed the budget. A one-time audit pass is planned as sub-task D of #72.

---

## Related documents

- Skill reference pages: `operations/engineering-practice/skills/{name}.md`
- Context hygiene and retention policies: `operations/engineering-practice/context-hygiene.md`
- Development Pipeline: defined in global `~/.claude/CLAUDE.md`
- MASTER-TODO (skills items): `todo-viewer/MASTER-TODO.md` — filter by Project: "Claude skills"
- Asset registry script: `knowledge-base/scripts/register-skills.js`
- Ownership boundary examples: anti-slop vault article has the best example of boundary documentation
