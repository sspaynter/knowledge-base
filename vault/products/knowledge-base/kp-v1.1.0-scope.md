# Knowledge Platform v1.1.0 — Scope and Plan

**Type:** Feature spec
**Workspace:** IT & Projects
**Section:** Knowledge Platform
**Template:** feature-spec
**Status:** Draft — implementation plan ready, not yet started
**Created:** 2026-02-27
**Author:** Simon Paynter + Claude

---

## What problem does this solve?

Three problems identified after v1.0.0 deployment:

1. **NocoDB assets are invisible.** 17 documents were migrated from NocoDB into the `assets` table during build. The app has no way to browse assets independently — they only appear when linked to a page. Those 17 documents cannot be found or used.

2. **No safe development path.** All development goes straight to production. One bad commit breaks the live app. No staging environment exists.

3. **No repeatable process.** No branching strategy, no versioning, no backlog structure, no release process. Every project starts from scratch.

---

## Proposed solution

A full product lifecycle pattern applied to the Knowledge Platform first, then all SS42 projects.

See full design: `docs/plans/2026-02-27-lifecycle-pattern-design.md`

---

## Acceptance criteria

### Asset browser
- [ ] Left nav has an "Assets" button that opens the asset browser panel
- [ ] Panel lists all assets regardless of page linkage
- [ ] Filterable by type (skill, config, decision, session, file, image, link)
- [ ] Searchable by title and description (280ms debounce)
- [ ] Clicking an asset opens a detail view with full content
- [ ] The 17 NocoDB migrated assets are all visible and readable

### Page status enforcement
- [ ] Archived pages do not appear in the left nav tree for any user
- [ ] Draft pages are hidden from viewers but visible to editors and admins
- [ ] Status can be updated via the editor
- [ ] Tests cover all three status states and all three roles

### Staging pipeline
- [ ] `dev` branch exists on knowledge-base, lifeboard, simonsays42
- [ ] Push to `dev` triggers CI build of `:dev` image
- [ ] `knowledge-base-staging` container running on NAS at port 32780
- [ ] `kb-staging.ss-42.com` is accessible with Google login
- [ ] Health check at `kb-staging.ss-42.com/api/health` returns `knowledge_base_staging` schema
- [ ] Watchtower auto-deploys `:dev` to staging on CI build

### GitHub backlog structure
- [ ] All 9 labels created on knowledge-base, lifeboard, simonsays42 repos
- [ ] Feature request and bug report issue templates active on all repos
- [ ] v1.1.0 milestone created on knowledge-base repo

### KB PM templates
- [ ] `product-brief`, `feature-spec`, `user-journey`, `workflow`, `release-notes`, `how-to`, `runbook` templates in seed
- [ ] Seed is idempotent — safe to run multiple times

### Lifecycle skills
- [ ] `lifecycle:new-feature` skill created and invokable
- [ ] `lifecycle:release` skill created and invokable
- [ ] `lifecycle:project-setup` skill created and invokable
- [ ] Each skill has a documentation page in KB under IT & Projects → Skills

---

## Implementation plan

`docs/plans/2026-02-27-v1.1.0-implementation.md` — 22 tasks, 9 phases.

**To execute:**
Open new session in `knowledge-base/` → load `superpowers:executing-plans` → point at the plan file.

Split:
- Session A: Tasks 1–12 (branching, CI, staging, asset browser, page status, backlog)
- Session B: Tasks 13–22 (KB templates, lifecycle skills, other projects, release)

---

## Out of scope (deferred to v1.2.0)

- `lifecycle:ideation` skill (brain dump → structured issues)
- `lifecycle:prioritize` agent (AI-assisted backlog prioritisation + KB artifact write-back)
- Page version snapshots (`page_versions` table)

---

## Version

This is Knowledge Platform v1.1.0. Previous version: v1.0.0 (deployed 2026-02-27).
