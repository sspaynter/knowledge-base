---
title: Applyr — Overview
status: published
order: 10
author: both
created: 2026-03-03
updated: 2026-03-04
---

# Applyr — Overview

## What it is

A self-hosted job application platform. Replaces the previous Google Sheets + NocoDB + n8n patchwork with a purpose-built app that owns the full workflow: tracking → reviewing → researching → applying.

AI-assisted throughout: company research, cover letter drafting, resume tailoring, and application Q&A are generated via Claude on demand, with inline feedback and iterative rewriting.

## Why it exists

The n8n pipeline (Phase 0–3c of the job search project) automated discovery and scoring well. But the review and application side had no good home:

- NocoDB was clunky for reviewing 97+ scored jobs
- Cover letters drafted via Claude Code had no version history
- Company research existed only in chat sessions — not persisted
- No way to track application materials per job
- Google Sheets as the primary tracker was a dead end for multiple users

Applyr consolidates all of that into one purpose-built interface.

## Current state

**Branch:** `dev` — live at staging
**Staging:** `https://applyr-staging.ss-42.com`
**Production:** `https://jobs.ss-42.com` (container not yet created)
**Tests:** 219 passing across 16 files
**Last build session:** 42 (2026-03-04)

### Phases completed

| Phase | Sessions | Deliverable |
|---|---|---|
| 1 | 25 | Core scaffold, jobs CRUD, pipeline views, job detail, Google OAuth, NocoDB migration, CI/CD, staging |
| Security | 26–27 | Security hardening (6 fixes), shared auth (SSO), credential rotation, 75 tests |
| 2 | 29 | Review queue (list + detail modes), archive, keyboard shortcuts j/k/y/n/e, sidebar badge |
| 3 | 30–30b | AI research service, cover letter service, all backend APIs, Research + Cover Letter tabs, inline annotation, background AI trigger |
| 3b | 32 | Research UI polish (all 7 sections, Lucide icons), Settings page (API key management), 139 tests |
| 4 | ~40a–41 | Resume upload + tailoring, application Q&A, inline resume doc view, Mark as Applied flow, 192 tests |
| 5 | 42 | Home page, metrics dashboard, notifications (service + API + UI), global search Cmd+K, 219 tests |

### What is next

| Item | Priority | Notes |
|---|---|---|
| Prototype + spec audit | Next session | Compare every view against prototype and product docs. Produce gap report and remediation plan |
| Phase 6 | After audit | Settings expansion, n8n webhook migration, responsive layout, keyboard shortcuts, help page, app rail, interview prep tab |
| Production deploy | After Phase 6 | Create container, migrate shared_auth to prod DB, merge dev → main, GitHub release |

## What it is not

- Not a job board — it tracks jobs found elsewhere (LinkedIn, Seek, n8n pipeline)
- Not a recruiter tool — single-user for Simon's own search (multi-user architecture is ready)
- Not a replacement for n8n — the automated discovery pipeline still feeds jobs in via webhook

## Key documents

| Document | Location | Purpose |
|---|---|---|
| Design spec | `job-app/docs/plans/2026-02-27-applyr-design.md` | 14-section product design specification |
| Implementation plan | `job-app/docs/plans/2026-03-02-applyr-implementation-plan.md` | 7 phases, 56 tasks |
| Prototype | `job-app/docs/mockups/applyr-prototype.html` | Clickable single-file HTML prototype — the UI spec |
| Feature status | This vault section: `applyr-feature-status.md` | As-built delta between spec and reality |
| Architecture | This vault section: `applyr-architecture.md` | Stack, schema, API, frontend, infrastructure |

## Data migration

96 jobs and 4 cover letters were migrated from NocoDB into Applyr during Phase 1 (session 25). The NocoDB instance remains available but is no longer the primary tracker.

## Related projects

| Project | Relationship |
|---|---|
| n8n job pipeline | Feeds scored jobs into Applyr via webhook (job-capture workflow `K9qRsldsOGrXYpX8`) |
| Knowledge Base | Shares session auth (shared_auth schema, SSO cookie on `.ss-42.com`) |
| To Do | Will eventually receive interview prep tasks and deadlines from Applyr |
| Claude Code job-app | Cover letter skill and job-evaluate skill still used for interactive sessions |
