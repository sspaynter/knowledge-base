---
title: Knowledge Platform — Usability Roadmap
status: published
author: both
created: 2026-03-11
updated: 2026-03-11
---

# Knowledge Platform — Usability Roadmap

Prioritisation analysis conducted in session 64 (2026-03-11). All KB backlog items evaluated through a usability lens — what reduces daily friction first, not what is fastest to build.

## Prioritisation Framework

Items are ranked by how often the friction occurs and how much it disrupts the core workflows of writing, finding, and maintaining documentation.

| Tier | Criteria | Frequency |
|---|---|---|
| 1 — Daily friction | Blocks or slows the most common workflows every session | Multiple times per day |
| 2 — Weekly friction | Causes pain when managing content structure or doing housekeeping | Several times per week |
| 3 — Power features | Adds capability that compounds over time but absence is not blocking | Occasional |
| 4 — Polish and retrofit | Maintenance and consistency work that improves existing content | One-time effort |
| 5 — Infrastructure docs | PM documentation and long-tail backlog items | When prioritised |

The Cagan test from the build-vs-buy analysis (session 61) applies: does this feature enable building and doing, or is it documentation infrastructure for its own sake? Tiers 1-3 clearly pass. Tier 4 is maintenance that keeps existing work accurate. Tier 5 is deferred until the product justifies formal PM documentation.

## Sprint Plan

All KB backlog items are allocated across five sprints, ordered by usability impact. Each sprint is self-contained and can be delivered independently.

### Sprint 1 — Navigation (kb-usability-1)

The two features that would most improve daily use of the KB.

| # | Task | Rationale |
|---|---|---|
| 59 | Inter-page hyperlinks | Every KB page that references another page requires the user to manually search for it. Clickable links between pages would save time on every session that reads documentation. Link convention already decided (ADR-010). |
| 115 | Display page version history in viewer | Backend already creates version snapshots on every push (50-version cap). No frontend UI exists. Users cannot see when a page was last changed or compare versions. |

**Dependencies:** #59 depends on #57 (link convention — done) and #58 (deep-linking — done). #115 depends only on KB v2.1.1 being live (done).

### Sprint 2 — Hierarchy (kb-usability-2)

Content organisation tools for managing a growing vault.

| # | Task | Rationale |
|---|---|---|
| 38 | Subpage management | Backend supports `parent_id` adjacency list and nested rendering. No UI for creating parent-child relationships. As the vault grows past 78 articles, flat page lists within sections become hard to scan. |
| 39 | Cross-section page moves | Pages cannot be moved between sections through the UI. Reorganising content requires manual vault file moves and DB updates. |
| 40 | Workspace and section reorder | Drag-to-reorder works for pages (built in v2.0.0) but not for workspaces or sections. The workspace strip and section headers have a fixed order that can only be changed by editing seed data. |

**Dependencies:** All three depend on #13 (drag-to-reorder — done). No cross-dependencies between them.

### Sprint 3 — Linking Depth and Security (kb-usability-3)

Deeper linking capability plus the outstanding security hardening work.

| # | Task | Rationale |
|---|---|---|
| 73 | Story-level section anchors | Links to a page land at the top. For long pages (story maps, feature area docs), users need to link to specific sections. Anchors on headings enable fragment links. |
| 74 | Backlinks panel | When a page is updated, there is no way to find which other pages reference it. A "Referenced by" panel surfaces reverse links — critical for maintaining consistency across interconnected docs. |
| 33 | Security hardening | Five items from security audits: authenticated uploads, credential cleanup, COOKIE_DOMAIN warning, path traversal guard, SRI hashes. Addressing before any sharing features are considered. |

**Dependencies:** #73 and #74 depend on #59 (inter-page hyperlinks — Sprint 1). #33 is independent.

### Sprint 4 — Polish and Retrofit (kb-usability-4)

One-time maintenance to bring existing content up to the standard set by Sprints 1-3.

| # | Task | Rationale |
|---|---|---|
| 60 | Update vault writing skill with link convention | Ensures all future KB docs written by Claude use working inter-page links. |
| 61 | Fix broken links in existing KB docs | Existing docs have cross-references that point nowhere. One-time cleanup. |
| 76 | Retrofit existing product docs with live links | Convert plain-text references in ToDo, Applyr, and KB product docs to clickable links using the convention and anchors built in Sprints 1 and 3. |
| 75 | Stale reference indicator | When a referenced page is updated, the referencing page gets a lightweight indicator. Helps authors know when to review their cross-references. |
| 12 | Page restore UI | Soft delete exists in backend but there is no UI to recover deleted pages. Low frequency but high consequence when it happens. |

**Dependencies:** #60, #61, #76 depend on #59 (Sprint 1). #75 depends on #74 (Sprint 3). #12 is independent.

### Sprint 5 — PM Docs and Backlog (kb-usability-5)

Formal product management documentation and long-tail features. These are valuable but do not reduce daily friction — they build the strategic foundation for future prioritisation.

| # | Task | Rationale |
|---|---|---|
| 62 | Product definition doc | Who the KB is for, problem space, principles, non-goals. |
| 66 | Feature area index and specs | One spec per feature area with problem, stories, acceptance criteria. |
| 63 | Opportunity backlog | Consolidate all P2/P3 items into a scored backlog. |
| 67 | User journeys | Key flows mapped end-to-end: author, find, share, manage hierarchy. |
| 64 | Story map | Map user activities across the product into story map format. |
| 65 | Roadmap (Now / Next / Later) | Sequence the backlog — partially addressed by this document. |
| 10 | Interactive relationship graph | D3/Cytoscape graph replacing the Mermaid diagram toggle. |
| 11 | Granular read-only sharing | Share specific pages or sections with external readers. |
| 14 | OneNote read-only import | Pull specific OneNote content into KB on demand. |

**Dependencies:** #65 depends on #63 (opportunity backlog). #10, #11, #14 are independent.

## What This Replaces

This roadmap partially fulfils MASTER-TODO #65 (K8 — "write a KB roadmap"). The difference: #65 envisions a formal Now / Next / Later roadmap built on an opportunity backlog (#63). This document provides the sprint-level delivery plan based on usability analysis. The formal PM roadmap remains as a future item in Sprint 5.

## Related

- Build vs buy analysis: `products/knowledge-base/kp-build-vs-buy-analysis.md`
- Feature status (as-built): `products/knowledge-base/kp-feature-status.md`
- Design decisions: `products/knowledge-base/kp-design-decisions.md`
- Architecture: `products/knowledge-base/kp-architecture.md`
- Sprint data: `todo-viewer/sprint.json` (sprints `kb-usability-1` through `kb-usability-5`)
- MASTER-TODO: `todo-viewer/MASTER-TODO.md` (all KB items with full descriptions)
