---
author: both
order: 160
title: Standard Product Documentation — Reference
---


# Standard Product Documentation — Reference

**Type:** Engineering practice — canonical reference
**Scope:** All SS42 products
**Framework:** Cagan (SVPG) + Torres (Continuous Discovery)
**Status:** v1 baseline — Session 40 (2026-03-06)
**Gold-standard reference:** ToDo product folder (15 docs)
**Related skills:** `pm-product-documentation` (#69), `kb-writing` (#71, live)

---

## Purpose

This document defines the canonical set of documentation every SS42 product gets. It specifies:

- What documents to create, in what order
- What required sections each document must have
- Which pipeline gate each document belongs to
- The single source of truth rule for cross-document references
- The standard structure for feature area specs and work packages

This is the template. `pm-product-documentation` enforces it. `kb-writing` validates per-file structure.

---

## Document hierarchy

Eleven levels of documentation. Each level answers a distinct question. Do not skip levels or collapse them.

| Level | Document | Question it answers |
|---|---|---|
| 1 | Product vision | Why does this product exist in the world? What future does it enable? |
| 2 | Product strategy | What is the plan to achieve the vision? What are we betting on and why? |
| 3 | Opportunity backlog | What problems are worth solving? What do we know about each opportunity? |
| 4 | Product definition | What is this product concretely — goals, users, scope, constraints? |
| 5 | Story map | What does the user do? What stories exist, at what phase, with what acceptance criteria? |
| 6 | Feature areas | What capability clusters exist? Why does each area exist, what does done look like, what are the risks? |
| 7 | Roadmap | What ships when? Phase sequencing, priorities, dependencies. |
| 8 | Feature spec (PRD) | What exactly are we building in this feature? Problem, requirements, design decisions. |
| 9 | Work packages | What is each AI-session-sized unit of work? What does done look like? How do we verify it? |
| 10 | Feature status | What has shipped? What is the current state of each capability? |
| 11 | Release notes | What changed in each version? |

---

## Canonical file list — creation order

Files are created in gate order. Later files depend on earlier ones.

### Gate 0–2: Framing and problem

| File | Path pattern | Created at | Depends on |
|---|---|---|---|
| Opportunity backlog | `vault/products/{name}/opportunity-backlog.md` | Gate 1 (Problem) | Research, user interviews |
| Product definition | `vault/products/{name}/product-definition.md` | Gate 2 (Design) | Opportunity backlog |

### Gate 3: Story map

| File | Path pattern | Created at | Depends on |
|---|---|---|---|
| Story map | `vault/products/{name}/story-map.md` | Gate 3 (Design confirmed) | Product definition |

### Gate 4: Full product definition

| File | Path pattern | Created at | Depends on |
|---|---|---|---|
| Feature areas | `vault/products/{name}/feature-areas.md` | Gate 4 (Prototype validated) | Story map |
| User journeys | `vault/products/{name}/user-journeys/{journey}.md` | Gate 4 | Story map |
| MVP outcomes | `vault/products/{name}/mvp-outcomes.md` | Gate 4 | Feature areas, story map |
| Roadmap | `vault/products/{name}/roadmap.md` | Gate 4 | MVP outcomes, feature areas |

### Pre-build

| File | Path pattern | Created at | Depends on |
|---|---|---|---|
| Implementation plan | `docs/plans/{date}-{name}-implementation-plan.md` | Pre-build | Roadmap, MVP outcomes |
| Feature spec (per feature) | `docs/plans/{date}-{feature}-spec.md` | Per feature | Story map, feature areas |

### During and after build

| File | Path pattern | Created at | Depends on |
|---|---|---|---|
| Feature status | `vault/products/{name}/feature-status.md` | First build | Implementation plan |
| Release notes | `vault/products/{name}/releases/{version}.md` | Each release | Feature status |

---

## Required sections per document type

### Opportunity backlog

Required sections:
- Problem statement (what pain, for whom)
- Current workaround (what they do today)
- Evidence (how we know this is real)
- Size / impact estimate
- Assumptions (Torres OST — what must be true for this to be a real opportunity)

### Product definition

Required sections:
- North Star (one sentence: what does the product do for the user)
- Target user (who, with context and job to be done)
- Core problems it solves (linked to opportunity backlog items)
- Scope (what is in, what is explicitly out)
- Success metrics (observable, specific)
- Constraints (technical, business, time)

### Story map

Required sections:
- Story map structure (activities → tasks → stories)
- Stories by phase (MVP, v1, v2)
- Per story: ID, title, phase, acceptance criteria (WHEN/THEN/AND — EARS notation)

**Single source of truth rule:** Story content (WHEN/THEN/AND criteria) lives only in the story map. No other document copies this content. Other docs reference story IDs only.

### Feature areas

Required sections per area (11-section Cagan-aligned template — see below):
- Problem, Who it's for, Desired outcome, Success metrics, Capabilities table, Out of scope, Dependencies, Product risks, AI considerations (if applicable), Competitive position, Phase / Status

Index table at top: all areas with phase, story count, status.

Competitive position table: one-line position per area.

### MVP outcomes

Required sections:
- What MVP means for this product (the bar for switching from the incumbent)
- The MVP outcomes (3–5 testable outcomes — "I can X" statements)
- Per outcome: which problem it addresses, minimum stories required, calendar / dependency notes
- Implied requirements (substrate stories that must exist for outcomes to work)
- MVP story scope table (activity, stories, count)
- What defers to v1 (explicit deferral list with reasons)
- Open decisions (options, impact, recommendation)
- Definition of done (observable tests Simon runs to declare MVP complete)

### Roadmap

Required sections:
- Phase structure (Phase 1 / Phase 2 / Phase 3 minimum)
- Per phase: theme, stories included, dependencies, expected outcome
- Deferred items with rationale

### Feature status

Required sections:
- Status legend (not started / in progress / complete / deferred)
- Per feature area: current status, version shipped (if applicable), notes

### Release notes (per version)

Required sections:
- Version and date
- What shipped (story IDs and titles)
- What changed (breaking changes, migrations)
- What deferred or changed scope

---

## Feature area spec — standard structure

This is the Cagan-aligned template for every feature area. `todo/vault/products/todo/feature-areas.md` (KB page 481) is the gold-standard reference implementation.

### Required sections (all areas)

**Problem**
Opportunity framing: why this area exists, what customer pain it addresses, link to opportunity backlog item.

**Who it's for**
User, context (when are they in this mode?), job to be done.

**Desired outcome**
What the user can do when this area is fully shipped. Outcome statement, not a feature list. One or two sentences.

**Success metrics**
Observable and specific. Avoid vanity metrics. If you cannot measure it, you cannot know it is working.

**Capabilities table**

| Story ID | Capability | Phase |
|---|---|---|
| S-XX | Brief title (no WHEN/THEN/AND here — that lives in story map) | MVP / v1 / v2 |

Story content stays in the story map only. This table is a reference layer, not a copy.

**Out of scope**
Explicit exclusions. Non-goals matter as much as goals.

**Dependencies**
Other feature areas and infrastructure this area needs before it can work.

**Product risks (Cagan's four)**

| Risk | Assessment |
|---|---|
| Value | Will users use it? Does it solve a real problem? |
| Usability | Can users figure out how to use it? |
| Feasibility | Can we build it with available skills and time? |
| Viability | Is this consistent with the business model and constraints? |

**Phase / Status**
Which phase (MVP / v1 / v2) and current build status.

### Conditional sections (add when applicable)

**AI considerations** — for areas with AI features only:
- Accuracy threshold: what is "good enough" for the user to trust the output?
- Fallback behaviour: what happens when AI output is poor or unavailable?
- Human-in-the-loop design: where does the user approve, edit, or reject AI output?

**Competitive position** — one line. Include where the area is table stakes vs differentiated.

### Optional fields (enterprise / team context)

These are not required for solo builds but should be included when building documentation for reuse in larger organisations:

- Discovery evidence (user research, usability tests, data supporting opportunity)
- Assumptions (Torres OST — what must be true for this feature area to deliver its outcome?)
- Go-to-market notes (pricing, packaging, rollout sequence if applicable)
- Stakeholder sign-off (reviewer, date, decision record reference)

---

## Work package definition

Every task decomposed to AI-session level must include exactly three fields. This is the contract between feature decomposition and AI session execution.

### Three required fields

**Description**
What to do. Specific, actionable, narrow enough to complete in one session.

**Success conditions**
The observable outcome that defines done. What does the world look like when this is complete? Written from the outside — not "I ran the command" but "the endpoint returns X when called with Y."

**Verification steps**
What Claude runs or checks to confirm done. Must be concrete:
- Test command + expected output
- Endpoint + expected response
- UI state + observable element
- File content + expected value

### Why all three are required

Description without success conditions → Claude does something but you do not know if it is right.

Success conditions without verification steps → Subjective. Cannot be confirmed by a reviewer.

Verification steps without success conditions → Mechanical pass/fail but no understanding of intent.

All three together → A complete contract. The builder knows what to build, what done looks like, and how to prove it.

---

## Single source of truth rule

Each piece of content has exactly one home. All other documents reference it by ID, not by copying the content.

| Content | Lives in | Referenced by ID from |
|---|---|---|
| Story acceptance criteria (WHEN/THEN/AND) | Story map | Feature areas, feature spec, implementation plan |
| Opportunity details (evidence, assumptions) | Opportunity backlog | Product definition, feature areas |
| Feature area narrative (problem, outcome, risks) | Feature areas doc | Roadmap, implementation plan |
| Work package content (description, conditions, steps) | Implementation plan | Session logs, feature status |

**What this means in practice:**

When a story is updated, the story map is the only file that changes. Feature areas only need updating if the story's phase changes, the story is added or removed, or the ID changes. No other file needs to change.

The pm-product-documentation skill enforces this rule. The kb-writing skill validates it during doc review.

---

## Gold-standard reference: ToDo product

The ToDo product folder is the first complete implementation of this standard. Use it as the reference when setting up documentation for any new product.

### File inventory (as of Session 40, 2026-03-06)

| File | Status |
|---|---|
| `vault/products/todo/opportunity-backlog.md` | Published |
| `vault/products/todo/product-definition.md` | Published |
| `vault/products/todo/story-map.md` | Published (47 v1 + 17 v2 stories) |
| `vault/products/todo/feature-areas.md` | Published (12 areas, KB page 481) |
| `vault/products/todo/user-journeys/daily-routine.md` | Published |
| `vault/products/todo/user-journeys/brain-dump-to-task.md` | Published |
| `vault/products/todo/mvp-outcomes.md` | Draft — pending scope confirmation |
| `vault/products/todo/roadmap.md` | Draft — pending MVP scope confirmation |
| `vault/products/todo/feature-status.md` | Not started (pre-build) |
| `vault/products/todo/today.md` | Published (feature area detail) |
| `vault/products/todo/inbox.md` | Published (feature area detail) |
| `vault/products/todo/projects.md` | Published (feature area detail) |
| `vault/products/todo/all-tasks.md` | Published (feature area detail) |
| `vault/products/todo/personal.md` | Published (feature area detail) |
| `vault/products/todo/ai-layer.md` | Published (feature area detail) |
| `vault/products/todo/settings.md` | Published (feature area detail) |

### Applyr product folder (secondary reference)

Applyr is a simpler example — fewer docs, earlier stage.

| File | Status |
|---|---|
| `vault/products/applyr/overview.md` | Published |
| `vault/products/applyr/architecture.md` | Published |
| `vault/products/applyr/feature-status.md` | Published |
| `vault/products/applyr/design-spec.md` | Published |

---

## Product completeness checklist

Use this to audit any product's documentation at any stage.

### Gate 4 (before build begins)

- [ ] Opportunity backlog exists with evidence for each opportunity
- [ ] Product definition has North Star, users, in-scope, out-of-scope, success metrics
- [ ] Story map has all stories by phase with WHEN/THEN/AND criteria
- [ ] Feature areas doc has all areas with 11-section spec each
- [ ] MVP outcomes doc has testable outcomes, story scope, deferral list, definition of done
- [ ] Roadmap has phase structure with rationale for each deferral decision

### Pre-build

- [ ] Implementation plan has tasks in creation order with spec references, file paths, acceptance criteria
- [ ] Each task includes: description, success conditions, verification steps
- [ ] Feature status file created with all areas marked "not started"

### Per release

- [ ] Feature status updated to reflect shipped stories
- [ ] Release notes written at `vault/products/{name}/releases/{version}.md`
- [ ] Roadmap updated if scope changed

---

## Related documents and skills

| Resource | Location |
|---|---|
| pm-product-documentation skill | `~/.claude/skills/pm-product-documentation/SKILL.md` |
| kb-writing skill (#71, live) | `~/.claude/skills/kb-writing/SKILL.md` |
| Skills overview and gaps | `operations/engineering-practice/skills/skills-overview.md` |
| ToDo feature areas (gold standard) | `vault/products/todo/feature-areas.md` (KB page 481) |
| MASTER-TODO skills items | `todo-viewer/MASTER-TODO.md` — filter by Project: "Claude skills" |

**KB linkage dependency note:** The pm-product-documentation skill and this documentation standard are currently limited by missing KB capabilities. Story ID links are not yet clickable, and there is no backlinks panel to see what references a given story. KB Tasks K23–K27 (story section anchors, backlinks panel, stale reference indicator, retrofit, skill update) must complete before live cross-references can be used. Until then, reference by ID and maintain the single source of truth rule manually.
