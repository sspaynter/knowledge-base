# Applyr — Overview

**Type:** Project overview page
**Workspace:** IT & Projects
**Section:** Applyr
**Template:** project-overview
**Status:** Active — staging live, production pending
**Created:** 2026-03-03
**Author:** Simon Paynter + Claude

---

## What it is

A self-hosted job application platform. Replaces the previous Google Sheets + NocoDB + n8n patchwork with a purpose-built app that owns the full workflow: tracking → reviewing → researching → applying.

AI-assisted throughout: company research and cover letter drafting are generated via Claude on demand, with inline feedback and iterative rewriting.

## Why it exists

The n8n pipeline (Phase 0–3c of the job search project) automated discovery and scoring well. But the review and application side had no good home:

- NocoDB was clunky for reviewing 97+ scored jobs
- Cover letters drafted via Claude Code had no version history
- Company research existed only in chat sessions — not persisted
- No way to track application materials per job
- Google Sheets as the primary tracker was a dead end for multiple users

Applyr consolidates all of that into one purpose-built interface.

## Current state

**Version:** 0.1.0 (Phase 3b complete)
**Branch:** `dev` — live at staging
**Staging:** `https://applyr-staging.ss-42.com`
**Production:** `https://jobs.ss-42.com` (container not yet created)
**Tests:** 139 passing across 10 files

### Phases completed

| Phase | Sessions | Deliverable |
|---|---|---|
| 1 | 25 | Core scaffold, jobs CRUD, pipeline views, job detail, Google OAuth, NocoDB migration, CI/CD, staging |
| 2 | 26–29 | Security hardening, shared auth (SSO), review queue (list + detail), archive, keyboard nav |
| 3 | 30–30b | AI research service, cover letter service, backend APIs, Research + Cover Letter tabs, inline annotation |
| 3b | 32 | Research UI polish (all 7 sections, CSS classes, Lucide icons), Settings page (API key management) |

### Phases pending

| Phase | Deliverable |
|---|---|
| 4 | Resume upload, ATS tailoring, application Q&A, full application export |
| 5 | Home dashboard, metrics, app rail (SS42 switcher) |
| 6 | Full test suite expansion, production deploy, CHANGELOG |

## What it is not

- Not a job board — it tracks jobs found elsewhere (LinkedIn, Seek, n8n pipeline)
- Not a recruiter tool — single-user for Simon's own search
- Not a replacement for n8n — the automated discovery pipeline still feeds jobs in via webhook

## Data migration

96 jobs and 4 cover letters were migrated from NocoDB into Applyr during Phase 1 (session 25). The NocoDB instance remains available at `https://tracker.ss-42.com` but is no longer the primary tracker.

## Related projects

| Project | Relationship |
|---|---|
| n8n job pipeline | Feeds scored jobs into Applyr via webhook (job-capture workflow `K9qRsldsOGrXYpX8`) |
| Knowledge Base | Shares session auth (shared_auth schema, SSO cookie on `.ss-42.com`) |
| To Do | Will eventually receive interview prep tasks and deadlines from Applyr |
| Claude Code job-app | Cover letter skill and job-evaluate skill still used for interactive sessions |
