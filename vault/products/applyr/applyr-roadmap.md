---
title: Applyr — Roadmap
status: published
order: 50
author: both
created: 2026-03-04
updated: 2026-03-04
---

# Applyr — Roadmap

## Current priority sequence

```
Prototype + Spec Audit → Remediation → Phase 6 → Production Deploy
```

### 1. Prototype + Spec Audit (next session)

Walk through every view in the prototype and compare against staging. Cross-reference with design spec user stories and user flows. Produce a gap report and remediation plan.

Known issues going in:
- Resume tab does not match prototype layout
- Home page has spacing issues (no gap between sidebar and greeting)
- Search needs staging verification

### 2. Remediation (from audit)

Fix gaps identified in the audit. Priority order: broken behaviour → wrong layout → missing elements → polish. This may take 1–3 sessions depending on gap count.

### 3. Phase 6 — Settings + Polish

| Task | Description |
|---|---|
| 6.1 | Settings expansion — profile editing, track management, AI test button, email prefs, notification prefs, data management, system health |
| 6.2 | n8n webhook migration — point job discovery pipeline at Applyr API instead of NocoDB |
| 6.3 | Responsive layout — mobile and tablet breakpoints |
| 6.4 | Keyboard shortcuts — global shortcuts beyond review queue |
| 6.5 | Help page — in-app reference |
| 6.6 | App rail — SS42 app switcher (shared with KB) |
| 6.7 | Interview prep tab — structured preparation for confirmed interviews |

Some Phase 6 items (help page, keyboard shortcuts) could ship post-launch if needed.

### 4. Production deploy

| Step | Detail |
|---|---|
| Create production container | `applyr` on NAS, port 8084, image `ghcr.io/sspaynter/applyr:latest` |
| Production DB migration | Create `applyr` database, run migrations, migrate `shared_auth` schema |
| Merge dev → main | Full test run, final staging check |
| GitHub release | Tag `v1.0.0`, CHANGELOG, release notes in KB vault |
| DNS | `jobs.ss-42.com` → production container via Cloudflare tunnel |

## Future (post-v1.0)

| Feature | Notes |
|---|---|
| Voice profile learning | Build writing style profile from CL feedback |
| Scoring criteria refinement | Tighten scoring from review decisions |
| Email integration | n8n classifies interview/rejection responses, updates tracker |
| Calendar integration | Auto-create calendar events for interviews |
| Weekly digest | Stale application alerts, pipeline summary email |
| Multi-user onboarding | Onboarding flow for invited users (profile, API key, tracks) |

## Implementation plan reference

Full task-level plan: `job-app/docs/plans/2026-03-02-applyr-implementation-plan.md`

| Phase | Status | Tasks |
|---|---|---|
| 1 | COMPLETED | 17 tasks — scaffold through staging deploy |
| 2 | COMPLETED | 6 tasks — review queue + archive |
| 3 | COMPLETED | 8 tasks — AI services + CL/research tabs |
| 3b | COMPLETED | 3 tasks — research UI + settings |
| 4 | COMPLETED | 8 tasks — resume + application |
| 5 | COMPLETED | 6 tasks — home + metrics + notifications + search |
| 6 | NOT STARTED | 7 tasks — settings expansion + polish + production |
