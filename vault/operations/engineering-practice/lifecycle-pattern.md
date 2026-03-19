# SS42 Product Lifecycle Pattern

**Type:** Architecture reference
**Workspace:** IT & Projects
**Section:** Knowledge Platform
**Template:** workflow
**Status:** Published
**Created:** 2026-02-27
**Author:** Simon Paynter + Claude

---

## What this is

A reusable development lifecycle pattern applied consistently across all SS42 projects (Knowledge Platform, Lifeboard, simonsays42). Based on industry standards — GitFlow, 12-Factor App, SemVer, Keep a Changelog — scaled down to a solo developer running self-hosted infrastructure.

The goal: every project has the same branching strategy, environments, versioning model, backlog structure, and documentation conventions. The same Claude skills work on every project.

---

## The Three Pillars

```
┌─────────────────┬──────────────────────┬──────────────────────────┐
│    GITHUB        │   KNOWLEDGE BASE      │    NAS (Environments)    │
├─────────────────┼──────────────────────┼──────────────────────────┤
│ Code             │ Specs                 │ Production container     │
│ Issues (backlog) │ Architecture docs     │ Staging container        │
│ Pull requests    │ Design decisions      │                          │
│ Releases + tags  │ Session logs          │                          │
│ CHANGELOG        │ Skill documentation   │                          │
│ CI/CD            │ Release notes (human) │                          │
└─────────────────┴──────────────────────┴──────────────────────────┘
```

**Rule of thumb:** GitHub tracks *what changed*. KB explains *why it exists and how it works*.

---

## Branching Strategy

Based on GitFlow, simplified for solo development.

```
main          ← production only. Protected. Never commit directly.
  └── dev     ← integration branch. Staging deploys from here.
        └── feature/asset-browser
        └── fix/search-bug
        └── chore/update-deps
```

- `main` is always production-ready
- `dev` is always deployable to staging — tests must pass before merging
- Feature branches cut from `dev`, merged back via PR
- `dev` → `main` is a deliberate release act, not automatic

---

## Environments

Each project has two containers on the NAS:

| | Staging | Production |
|---|---|---|
| Branch | `dev` | `main` |
| Image tag | `:dev` | `:latest` |
| Port | production +1 | assigned |
| Subdomain | `{project}-staging.ss-42.com` | `{project}.ss-42.com` |
| DB schema | `{schema}_staging` | `{schema}` |

CI builds `:dev` on push to `dev`. CI builds `:latest` on push to `main`. Watchtower picks up both automatically.

---

## Versioning

Semantic versioning: `v{MAJOR}.{MINOR}.{PATCH}`

| Increment | When |
|---|---|
| PATCH | Bug fix only |
| MINOR | New feature, backward compatible |
| MAJOR | Breaking change |

CHANGELOG format follows [Keep a Changelog](https://keepachangelog.com):

```
## [v1.1.0] — 2026-03-05
### Added
- Asset browser
### Fixed
- NocoDB assets not visible
```

---

## Backlog Structure

GitHub Issues with a standard 9-label taxonomy:

| Label | Meaning |
|---|---|
| `type: feature` | New capability |
| `type: fix` | Bug |
| `type: chore` | Refactor, deps, tooling |
| `type: docs` | Documentation |
| `priority: p1` | Blocking — do next |
| `priority: p2` | Important — do soon |
| `priority: p3` | Nice to have |
| `status: in progress` | Being worked |
| `status: blocked` | Waiting on something |

Milestones map to version numbers. Closing a milestone = shipping a release.

---

## KB Workspace Structure (per project)

```
{Project Name}
├── Product
│   ├── Product Brief
│   ├── User Journeys
│   ├── Workflows
│   ├── Metrics
│   └── Roadmap
├── Specs
│   ├── v1.0.0 — Initial Design
│   └── Features
│       └── {feature name}
├── Architecture
├── Decisions
├── Session Logs
├── Skills
├── Documentation
│   ├── Getting Started
│   ├── Features Guide
│   └── FAQ
└── Releases
    ├── Release Notes
    └── Runbooks
```

---

## Document Versioning Model

Three layers, introduced progressively:

**Now (convention):**
- Living docs: update in place, "last updated" in metadata
- Spec docs: one page per version, old pages archived (not deleted)
- Decisions: never edited — new decision references old one if reversed
- Session logs: append-only

**v1.1 (page status field):**
- `draft` / `published` / `archived` on every page
- Archived pages hidden from nav, preserved in search

**v1.2 (page snapshots):**
- Auto-snapshot on save
- Version history UI with restore

---

## Lifecycle Skills

| Skill | Status | When to invoke | What it does |
|---|---|---|---|
| `lifecycle:release` | ✅ Shipped (2026-03-02) | After staging verification, before touching `main` | Pre-flight checks → commit analysis → version recommendation → single confirmation gate → merge `dev`→`main`, tag `vX.Y.Z`, push, GitHub Release, CHANGELOG, KB vault release page. Hard stop on failures surfaces as GitHub Issue. |
| `lifecycle:new-feature` | 🔲 Planned | Starting any feature | Check for duplicates → create issue → KB spec page → cut branch → invoke brainstorming |
| `lifecycle:project-setup` | 🔲 Planned | Onboarding a project | Dev branch → staging container → Cloudflare → GitHub labels → KB workspace |
| `lifecycle:ideation` | 🔲 Planned | Brain dump session | Brain dump → structured GitHub Issues with duplicate check and PM breakdown handoff |
| `lifecycle:prioritize` | 🔲 Planned | Backlog review | Reads backlog + KB roadmap, RICE scoring, updates KB artifacts, creates decision pages |

See `vault/it-and-projects/claude/skills/lifecycle-release.md` for full skill reference.

---

## The Release Flow

```
Idea identified
    ↓
lifecycle:new-feature → GitHub Issue + KB spec page + feature branch
    ↓
superpowers:brainstorming → design approved
    ↓
superpowers:writing-plans → implementation plan
    ↓
superpowers:executing-plans → build on dev branch
    ↓
Tests pass on dev → smoke test on staging
    ↓
lifecycle:release → PR → merge to main → tag → CHANGELOG → KB release notes
```

---

## Project Registry

| Project | Prod port | Staging port | Prod schema | Staging schema | Status |
|---|---|---|---|---|---|
| knowledge-base | 32779 | 32780 | knowledge_base | knowledge_base_staging | v1.0.0 live, v1.1.0 planned |
| lifeboard | 3333 | 3334 | — (SQLite) | — | In progress |
| simonsays42 | — | — | — (static) | — | Live |
| ssa-website | 8091 | 8092 | — (static) | — | Planned (session 21) |
