# SS42 Product Lifecycle Pattern — Design Document

**Date:** 2026-02-27
**Author:** Simon Paynter + Claude
**Status:** Approved
**Applies to:** knowledge-base, lifeboard, simonsays42 (all SS42 projects)

---

## Problem Statement

The Knowledge Platform is deployed and running at v1.0.0. The next phase is not just adding features — it is establishing a reusable development lifecycle pattern that applies consistently across all SS42 projects. Without this:

- There is no safe path to develop and test changes before they hit production
- There is no versioning or release process
- There is no structured backlog or prioritisation workflow
- Documentation of why things were built the way they were lives in flat files, not a searchable system
- The Knowledge Base itself has a gap: assets are not browsable, blocking visibility of migrated NocoDB data

---

## Approach

**Approach C — Layered hybrid** (approved)

Clear separation by responsibility:

| Layer | Tool | What lives there |
|---|---|---|
| Code + bugs + releases | GitHub | Issues, PRs, releases, CHANGELOG, CI/CD |
| Knowledge + decisions | KB | Specs, architecture, session logs, decisions, skill docs |
| Environments | NAS | Production + staging container per project |
| Process execution | Claude skills | How to run each lifecycle phase |
| Tasks (future) | Lifeboard | Replaces GitHub Issues board when ready |

---

## Section 1: Branching Strategy

Based on GitFlow (simplified for solo developer).

```
main          ← production only. Protected. Never commit directly.
  └── dev     ← integration branch. Staging deploys from here.
        └── feature/asset-browser
        └── feature/staging-pipeline
        └── fix/search-bug
        └── chore/update-deps
```

**Rules:**
- `main` is always production-ready. Watchtower watches `:latest`.
- `dev` is always deployable to staging. Tests must pass before merging a feature here.
- Feature branches are cut from `dev`, merged back to `dev` via PR.
- `dev` → `main` is a deliberate release act — never automatic.
- Branch naming: `feature/`, `fix/`, `chore/`, `docs/`

**CI behaviour:**
- Push to any branch → tests run
- Push to `dev` → tests run + staging deploy (`:dev` image tag)
- Push to `main` → production deploy (`:latest` image tag, Watchtower pulls)

**Applies identically to:** knowledge-base, lifeboard, simonsays42.

---

## Section 2: Environments

Each project gets two containers on the NAS.

| | Staging | Production |
|---|---|---|
| **Branch** | `dev` | `main` |
| **Image tag** | `:dev` | `:latest` |
| **Deploy trigger** | Push to `dev` → CI builds `:dev` → Watchtower pulls | Merge to `main` → CI builds `:latest` → Watchtower pulls |
| **Port** | Separate port (prod +1 convention) | Existing port |
| **Subdomain** | `{project}-staging.ss-42.com` | `{project}.ss-42.com` |
| **Cloudflare Access** | Same Google auth policy | Same Google auth policy |
| **Database** | `{schema}_staging` | `{schema}` |
| **Watchtower label** | `com.centurylinklabs.watchtower.enable=true` | Same |

**Deploy flow:**
```
git push dev
  → CI builds ghcr.io/sspaynter/{project}:dev
  → Watchtower pulls :dev → staging container restarts
  → Smoke test at {project}-staging.ss-42.com
  → PR: dev → main
  → CI builds :latest
  → Watchtower pulls :latest → production restarts
```

**Naming conventions:**

| Resource | Pattern | Example (KB) |
|---|---|---|
| Container | `{project}-staging` | `knowledge-base-staging` |
| Subdomain | `{project}-staging.ss-42.com` | `kb-staging.ss-42.com` |
| DB schema | `{schema}_staging` | `knowledge_base_staging` |
| Image tag | `ghcr.io/sspaynter/{project}:dev` | `ghcr.io/sspaynter/knowledge-base:dev` |

---

## Section 3: Versioning

**Semantic versioning (SemVer):** `v{MAJOR}.{MINOR}.{PATCH}`

| Increment | When | Example |
|---|---|---|
| `PATCH` | Bug fix, no new features | `v1.0.1` |
| `MINOR` | New feature, backward compatible | `v1.1.0` |
| `MAJOR` | Breaking change or major redesign | `v2.0.0` |

**Current state:**

| Project | Starting version |
|---|---|
| knowledge-base | `v1.0.0` |
| lifeboard | `v1.0.0` |
| simonsays42 | `v1.0.0` |

**Release act — what happens when `dev` merges to `main`:**

1. All tests pass on `dev`
2. Smoke test on staging confirmed
3. PR: `dev` → `main` — lists all issues being closed
4. Merge approved → CI builds `:latest` → Watchtower deploys
5. Git tag cut: `git tag vX.Y.Z && git push origin vX.Y.Z`
6. GitHub Release created with technical notes
7. `CHANGELOG.md` updated (Keep a Changelog format)
8. KB release notes page created (human-readable)
9. GitHub milestone closed
10. KB Overview page status updated

**CHANGELOG format** (Keep a Changelog — keepachangelog.com):

```markdown
## [v1.1.0] — 2026-03-05
### Added
- Asset browser view
- Staging pipeline

### Fixed
- NocoDB assets not visible in UI
```

---

## Section 4: Backlog Structure (GitHub Issues)

**Label set — applied identically to all project repos:**

| Label | Colour | Meaning |
|---|---|---|
| `type: feature` | Blue | New capability |
| `type: fix` | Red | Bug or broken behaviour |
| `type: chore` | Grey | Dependency update, refactor, tooling |
| `type: docs` | Green | Documentation only |
| `priority: p1` | Dark red | Blocking — do next |
| `priority: p2` | Orange | Important — do soon |
| `priority: p3` | Yellow | Nice to have |
| `status: in progress` | Purple | Actively being worked |
| `status: blocked` | Dark grey | Waiting on something |

**Issue templates:**

Feature request:
```
## What problem does this solve?
## Proposed solution
## Acceptance criteria
- [ ]
## KB spec link (if applicable)
```

Bug report:
```
## What happened?
## What was expected?
## Steps to reproduce
## Environment (prod / staging)
```

**Backlog flow:**
```
Idea → lifecycle:ideation skill
     → GitHub Issue (label + acceptance criteria)
     → Assigned to milestone (e.g. v1.1.0)
     → Feature branch: feature/issue-42-asset-browser
     → PR references issue: "Closes #42"
     → Merge → issue auto-closes
```

Milestones map to version numbers — `v1.1.0` milestone shows exactly what ships in that release.

---

## Section 5: KB Documentation Conventions

**Workspace structure per project:**

```
{Project Name} (workspace)
│
├── Product                        ← PM layer
│   ├── Product Brief              ← What, who, why — one-pager
│   ├── User Journeys              ← How users move through the product
│   ├── Workflows                  ← Process maps for key flows
│   ├── Metrics                    ← What success looks like, KPIs
│   └── Roadmap                    ← What is planned (links to GitHub milestones)
│
├── Specs                          ← Versioned design documents
│   ├── v1.0.0 — Initial Design
│   ├── v1.1.0 — Lifecycle Pipeline
│   └── Features
│       ├── Asset Browser          ← One PRD per feature
│       ├── Staging Pipeline
│       └── {feature name}
│
├── Architecture                   ← Stack, infrastructure, data flow
├── Decisions                      ← Decision log (append-only)
├── Session Logs                   ← One page per build session (append-only)
├── Skills                         ← Claude skill documentation
│
├── Documentation                  ← User-facing
│   ├── Getting Started
│   ├── Features Guide
│   └── FAQ
│
└── Releases
    ├── Release Notes              ← Human-readable, one page per version
    └── Runbooks                   ← Deploy, rollback, backup procedures
```

**Global workspaces:**

```
IT & Projects    ← Infrastructure, NAS, Claude setup, cross-project tooling
Personal         ← Personal knowledge
Work             ← Professional context
Learning         ← Research, notes, courses
```

**Boundary rules — what lives where:**

| Content | GitHub | KB |
|---|---|---|
| Code | ✅ | ❌ |
| Bug reports | ✅ | ❌ |
| Feature backlog | ✅ | ❌ |
| CHANGELOG.md | ✅ | ❌ |
| Design specs | ❌ | ✅ |
| Architecture decisions | ❌ | ✅ |
| Session logs | ❌ | ✅ |
| Skill documentation | ❌ | ✅ |
| Release notes (human) | ❌ | ✅ |
| Runbooks | ❌ | ✅ |

**Rule of thumb:** GitHub tracks *what changed*. KB explains *why it exists and how it works*.

---

## Section 6: KB Templates to Create

| Template | Used for |
|---|---|
| `product-brief` | Opening a new project |
| `feature-spec` | PRD for any new feature |
| `user-journey` | Mapping a user flow |
| `workflow` | Documenting a process |
| `decision` | Recording a design decision |
| `release-notes` | Publishing a version |
| `how-to` | User documentation |
| `runbook` | Operational procedure |

These are added to the `knowledge_base.templates` table alongside existing `session-log` and `project-overview` templates.

---

## Section 7: Document Versioning Model

Three layers, introduced progressively:

**Layer 1 — Convention (v1.0, works today):**

| Document type | Convention |
|---|---|
| Living docs (how-tos, user guides) | Update in place. "Last updated" in metadata. Optional "What changed" section at bottom. |
| Spec documents | One page per version. Title includes version. Old pages archived (not deleted). |
| Decisions | Never edited. New decision references old one if reversed. |
| Session logs | Append-only. Never edited after session ends. |

**Layer 2 — Page status field (v1.1):**

Add `status` column to `pages` table: `draft`, `published`, `archived`.
- Draft: visible to editors/admins only
- Published: visible to all users
- Archived: hidden from nav, preserved in DB and search

**Layer 3 — Page version snapshots (v1.2):**

Add `page_versions` table mirroring `asset_versions`. Auto-snapshot on save. Version history UI with restore capability.

---

## Section 8: Lifecycle Skills (New — to be created)

All global skills in `~/.claude/skills/lifecycle/`. Each has a documentation page in KB under `IT & Projects → Skills`.

**`lifecycle:new-feature`**

Invoked when starting any new feature on any project.

Steps:
1. Check GitHub Issues for duplicates
2. Create/reference issue with label + acceptance criteria
3. Create feature spec page in KB (using `feature-spec` template)
4. Cut feature branch from `dev`
5. Link branch to issue in PR description
6. Hand off to `superpowers:brainstorming` if design work needed first

**`lifecycle:release`**

Invoked when `dev` is ready to ship to production.

Steps:
1. Confirm all tests pass on `dev`
2. Smoke test on staging
3. PR: `dev` → `main` — list all issues being closed
4. Merge → CI builds `:latest` → Watchtower deploys
5. Cut git tag: `vX.Y.Z`
6. Create GitHub Release
7. Update `CHANGELOG.md`
8. Create KB release notes page
9. Close GitHub milestone
10. Update KB Overview page status

**`lifecycle:project-setup`**

Invoked once when bringing a project into this pattern.

Steps:
1. Create `dev` branch from `main`
2. Create staging container on NAS (uses `nas-deploy` skill)
3. Add staging subdomain in Cloudflare
4. Create `{schema}_staging` in PostgreSQL
5. Configure GitHub Actions to build `:dev` tag on push to `dev`
6. Set up GitHub Issue labels and templates
7. Create project workspace in KB with full section structure
8. Add PM templates to KB templates table
9. Document project in KB Overview page

**`lifecycle:ideation`** *(v1.2)*

Invoked for brain dump → structured backlog.

Steps:
1. Accept freeform ideas, features, thoughts
2. Structure into outcomes + candidate features
3. Flag duplicates against existing GitHub Issues
4. Draft GitHub Issues with acceptance criteria for review
5. Hand off to `pm-breakdown` for deep decomposition if needed

**`lifecycle:prioritize`** *(v1.2 — agent, not skill)*

Invoked to review backlog and recommend what to work on next.

Capabilities:
- Reads all open GitHub Issues via `gh` CLI
- Reads current KB roadmap page via KB API
- Applies RICE scoring across the full backlog
- Outputs ranked recommendation with reasoning
- Writes back: updates KB roadmap page, updates GitHub milestones, creates decision page in KB

Connects to: `pm-breakdown` (decomposition), `pm-roadmap-management` (RICE scoring), `pm-feature-spec` (PRD writing).

---

## Section 9: KB v1.1 Immediate Fixes

Two gaps in the current KB that block usability, ship before pipeline work.

**Fix 1 — Asset browser**

Problem: 17 NocoDB documents migrated as assets are invisible — no page references them.

Solution: Standalone asset browser accessible from left nav. Lists all assets regardless of page linkage. Filterable by type, searchable by title. Clicking opens full detail view. Assets become a first-class content type, not just page attachments.

**Fix 2 — Page status field**

Problem: No way to mark pages as draft or archive old spec versions.

Solution: Add `status` column to `pages` table (`draft` / `published` / `archived`). Update API and frontend to respect status. Archived pages hidden from nav but preserved in DB and search.

---

## Release Plan

| Version | Scope |
|---|---|
| **v1.1.0** | Asset browser, page status field, staging pipeline, `dev` branch on all projects, GitHub Issue labels + templates, KB workspace structure (PM layer), `lifecycle:new-feature` skill, `lifecycle:release` skill, `lifecycle:project-setup` skill |
| **v1.2.0** | `lifecycle:ideation` skill, `lifecycle:prioritize` agent, KB artifact write-back, `lifecycle:project-setup` applied to Lifeboard + simonsays42 |
| **v1.3.0** | Page version snapshots (`page_versions` table + version history UI) |

---

## Implementation Notes

- `lifecycle:project-setup` applies this full pattern to Lifeboard and simonsays42 — run once per project
- KB workspace structure to be seeded via migration script additions, not manual entry
- New KB templates added to `knowledge_base.templates` table via seed update
- Staging DB schemas created using same `migrate.sql` run against `{schema}_staging`
- `dev` branch on KB is the first branch created — all v1.1 work happens there
