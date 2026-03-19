---
title: "ADR-001: Operations Workspace Restructure"
status: published
author: both
created: 2026-03-13
updated: 2026-03-13
---

# ADR-001: Operations Workspace Restructure

## Decision

Restructure the `operations/` workspace from three flat sections into three peer sections with clearly defined boundaries, and expand `ai-operating-model/` from 2 pages to 12 pages covering strategy, architecture, governance, and decisions.

## Date

2026-03-13 (Session 72)

## Context

The operations workspace has three sections: `ai-operating-model/` (2 articles), `engineering-practice/` (20 articles), and `infrastructure/` (12 articles). Content had drifted into the wrong sections over 70+ sessions:

- Agent architecture, guardrails, and the agent catalogue were in `engineering-practice/` — these are operating model content (what the system is and how it is governed), not engineering practices (how we build and ship).
- The `ai-operating-model/` overview was 286 lines trying to cover current state, future state, architecture, and roadmap in a single page. No room for governance, model strategy, or decisions.
- No home existed for architecture decision records, despite decisions being made across every session.
- Industry research (NVIDIA NemoClaw, open-weight model trends, agent observability tooling) showed gaps in the operating model: no model strategy page, no governance page, no observability thinking.

The trigger was a conversation about NVIDIA's NemoClaw platform and where to document AI infrastructure strategy. It became clear the operating model section could not absorb a new article without restructuring first.

## Options Considered

### Option A: Hierarchy — ai-operating-model as parent

Demote `engineering-practice/` and `infrastructure/` to subsections of `ai-operating-model/`. Everything rolls up under one umbrella.

**Rejected.** Engineering practice and infrastructure are reference material used during specific tasks (releasing, deploying, debugging). Burying them two levels deep adds navigation friction for daily use. The operating model is the strategic layer — it should sit alongside the operational layers, not above them.

### Option B: Peers with restructured content (chosen)

Keep three peer sections. Move architecture and governance content to `ai-operating-model/`. Add internal hierarchy within ai-operating-model (current state, future state, governance, decisions). Add workspace overview to tie sections together.

**Chosen.** Preserves fast access to engineering practices and infrastructure runbooks while giving the operating model section the depth it needs. Each section answers a distinct question:

| Section | Question |
|---|---|
| ai-operating-model | What is the system and where is it going? |
| engineering-practice | How do we build and ship? |
| infrastructure | What runs where? |

### Option C: Four sections — add governance as separate peer

Split governance out as a fourth peer section alongside the other three.

**Rejected.** Governance content is currently thin (2 existing articles moving, 1-2 new). Does not justify a standalone section yet. Governance lives within ai-operating-model as pages. Can graduate to its own section if it grows beyond 6-8 articles.

## Rationale

1. **Content is in the wrong sections.** Four articles about agent architecture and governance sit in engineering-practice. They define the system, not how to build within it. Moving them to ai-operating-model is a classification fix, not a restructure for its own sake.

2. **The overview is overloaded.** A 286-line overview page trying to cover everything is a signal that the section needs subpages. Extracting current-state, future-state, and roadmap into their own pages makes each independently maintainable and navigable.

3. **Missing operating model dimensions.** Industry consensus in Q1 2026 identifies observability, governance, model strategy, and agent design patterns as core operating model concerns. None had a home in the current structure.

4. **Decisions are made but not recorded.** Over 70+ sessions, significant architecture decisions have been made (four-tier agents, vault-as-source, NAS over cloud, Claude over local models). These live in session logs and MEMORY.md — ephemeral storage that degrades. A decisions register captures them permanently.

5. **Three peer sections age well.** The boundary between "what the system is" (operating model), "how we work" (engineering practice), and "what runs where" (infrastructure) is stable. Content can move between sections as it evolves, but the sections themselves will not need renaming or restructuring.

## Consequences

### Positive

- ai-operating-model grows from 2 to 12 pages, covering the full operating model: architecture, governance, strategy, current state, future state, roadmap, decisions.
- Engineering-practice becomes focused: build pipeline, session handoff, release process, task decomposition, SDD conventions, context loading, skills.
- Infrastructure is unchanged — already clean.
- New articles (model-strategy, governance, decisions register) have clear homes.
- Architecture Decision Records establish a pattern for capturing future decisions.

### Negative

- 27 cross-references across 7 vault articles need updating (old paths to new paths).
- KB page URLs change for 4 moved articles — any external bookmarks or shared links break.
- MASTER-TODO tasks #147, #148, #150 need scope updates.
- One-time migration effort: move files, update frontmatter, extract overview sections, sync to KB.

### Risks

- **Over-structuring.** 12 pages in ai-operating-model is ambitious. Some pages (governance, observability) may stay thin until real implementation generates content. Mitigation: start with the pages that have content (moved articles, extracted overview, model-strategy from research), add others as content justifies them.
- **Reference rot.** Moved articles may be referenced from places the audit did not find (skills, agent definitions, MEMORY.md in other project directories). Mitigation: grep for old paths after sync and fix any remaining references.

## New Structure

```
ai-operating-model/
  overview.md              ← slim map page (~60 lines)
  work-domains.md          ← exists, no change
  current-state.md         ← extracted from overview
  future-state.md          ← extracted from overview
  architecture.md          ← MOVED from engineering-practice (was ss42-agent-architecture-standard)
  agent-catalogue.md       ← MOVED from engineering-practice
  agent-guardrails.md      ← MOVED from engineering-practice (was agent-guardrails-framework)
  agent-research.md        ← MOVED from engineering-practice (was agent-architecture-research)
  model-strategy.md        ← NEW: cloud vs local, model routing, NVIDIA, open-weight, cost
  governance.md            ← NEW: data sovereignty, security policy, references infra articles
  roadmap.md               ← extracted from overview gaps section + sequencing
  decisions/               ← NEW folder
    001-operations-workspace-restructure.md  ← this document
```

## Related

- [AI Operating Model — Overview](/page/operations/ai-operating-model/overview)
- [Work Domains](/page/operations/ai-operating-model/work-domains)
- MASTER-TODO #147 (Operations workspace overview), #148 (Engineering Practice overview)
