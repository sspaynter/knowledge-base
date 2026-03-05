---
title: Applyr — Design Spec Summary
status: published
order: 30
author: both
created: 2026-03-04
updated: 2026-03-04
---

# Applyr — Design Spec Summary

The full design specification lives at `job-app/docs/plans/2026-02-27-applyr-design.md` (14 sections, ~3000 lines). This page summarises the key decisions and links to the relevant sections.

## Product definition (Section 1)

A personal job application platform with AI-assisted materials creation and a continuous learning loop. Users import job listings, review and score them, draft personalised cover letters and tailored resumes with AI feedback loops, track their application pipeline, and refine the system over time.

**Core differentiator:** the learning loop. Every interaction makes the app smarter — scoring criteria tighten from review decisions, voice profile sharpens from cover letter feedback, resume suggestions improve from what gets interviews.

**Users:** v1 is Simon only (existing data migrated from NocoDB). Multi-user architecture is built in from day one.

## Core lifecycle (Section 2)

```
Discover → Review → Research → Apply → Track → Follow Up
```

Each stage has a defined view in the app. The n8n pipeline handles Discover (automated email alerts → scoring). Everything from Review onwards is in Applyr.

## Information architecture (Section 4)

- **Pipeline** — kanban, list, and table views for all tracked jobs
- **Review Queue** — new scored jobs, swipe-style review with keyboard shortcuts
- **Job Detail** — 5 tabs: Overview, Research, Cover Letter, Resume, Application
- **Archive** — filtered view of skipped/rejected/withdrawn jobs
- **Home** — dashboard with action cards and activity feed
- **Metrics** — pipeline funnel, response rates, weekly trends, score analysis
- **Settings** — API key, profile, tracks, preferences

## Clickable prototype (Section 6)

A single-file HTML/CSS/JS prototype serves as the UI specification. Located at `job-app/docs/mockups/applyr-prototype.html`. Every UI implementation task must reference a specific prototype function or section via `spec:` in the implementation plan.

The prototype defines layout, colours, component structure, and interaction patterns. It is the source of truth for how the UI should look and behave.

## Data model (Section 7)

15 tables across 2 schemas. Central entity is `jobs` with 24 columns and an 11-state status lifecycle. AI outputs stored as structured JSON in `company_research.content`, `resume_tailorings.changes`, and `job_scores.dimensions`.

Key design decisions:
- Cover letters are immutable versions (each rewrite creates a new row)
- User isolation via `user_id` FK on most tables; `cover_letters` isolated via `jobs.user_id` through `job_id` FK
- Separate databases per environment (not schema-per-environment)

## API design (Section 8)

REST API at `/api/v1/`. Response format: `{ data: ... }` for success, `{ error: { code, message } }` for errors. All routes require `requireUser` middleware except auth and health.

See `applyr-architecture.md` for the full route table.

## Visual design (Section 9)

- Indigo accent (`#6366f1`), Plus Jakarta Sans font
- Dark sidebar gradient, white content cards
- Token-based CSS (not utility-first)
- No innerHTML anywhere — DOM APIs only (security constraint)
- Lucide icons (vendored)

## Design principles (Section 12)

1. **Learning loop first** — every interaction improves future suggestions
2. **AI assists, user decides** — AI generates, user reviews and refines
3. **Progressive disclosure** — show what matters now, hide complexity until needed
4. **Speed of review** — keyboard shortcuts, swipe patterns, minimal clicks
5. **Single source of truth** — one database, one pipeline, one tracker

## What differs from the spec

See `applyr-feature-status.md` for the "Decisions that differ from the design spec" table. Key divergences:
- Settings page built in Phase 3b (spec said Phase 6)
- Shared auth schema (spec assumed Applyr-only auth)
- Background AI trigger on "interested" (spec had explicit buttons only)
- Inline resume doc view (spec had flat changes list)
- No innerHTML constraint (not in original spec, added during security hardening)
