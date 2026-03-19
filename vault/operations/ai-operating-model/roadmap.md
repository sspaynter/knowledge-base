---
title: AI Operating Model — Roadmap
status: published
author: both
parent: overview
created: 2026-03-13
updated: 2026-03-13
---

# AI Operating Model — Roadmap

Sequenced priorities for the AI Operating Model. Updated as work completes and new gaps emerge.

---

## Now

Actively being worked on in current or imminent sprints.

| Initiative | Sprint | Description |
|---|---|---|
| Context loading optimisation | `system-context-loading` | Reduce session context from ~1,237 to ~485 lines (61% reduction). 9 tasks planned, build-ready. |
| Agent pattern sprint | `system-agent-pattern` | Formalise the SS42 agent architecture standard — worker types, guardrails, isolation model. Brainstorming phase. |

---

## Next

Follows completion of Now items. Sequenced and scoped but not yet in active build.

| Initiative | Sprint | Description |
|---|---|---|
| Build tooling | `system-build-tooling` | Improve writing-plans skill, scaffold outputs, test harness patterns. |
| Ops doc structure | `ops-doc-structure` | Restructure operations documentation in the KB vault for consistency and discoverability. |
| Infrastructure backend ops | `infra-backend-ops` | Backup setup (#174), timezone fix (#51), secrets management (#30), infra overview and roadmap (#149). |

---

## Later

Planned but not yet sequenced into sprints. Dependencies or design work needed first.

| Initiative | Depends on | Description |
|---|---|---|
| Dev Server MVP | Agent pattern sprint, build tooling | Always-on Node.js server on Mac Studio. Spawns `claude -p` workers with guardrails. Dashboard for task submission and result review. |
| ToDo orchestration layer | ToDo v4.0.0 | Claude API endpoints, MCP server wrapper, session claim/complete/log cycle. Replaces manual plan-file tracking. |
| AWS scaffold pattern | Dev Server operational | Standard client deployment template — ECS/Fargate, RDS, Secrets Manager, Cloudflare. Repeatable per engagement. |
| Client delivery model | AWS scaffold | Full engagement pattern: isolated AWS environments, deployment automation, monitoring, handoff process. |
| Centralised logging | Infrastructure backend ops | Cross-container log aggregation. Not yet designed. |
| Mobile/ambient access | Dev Server + ToDo orchestration | Dev Server dashboard (LAN) + ToDo on phone. Task submission and status from any device. |

---

## Gaps Tracker

Carried from the overview. Updated as items resolve.

| Gap | Status |
|---|---|
| Session overhead across builds | Spec-first handoff active; ToDo orchestration planned (v4.0.0) |
| No mobile/ambient access | Dev Server dashboard (LAN) + ToDo on phone — planned, not yet deployed |
| No centralised logging across containers | Not yet designed |
| KB production still on username/password auth | **Resolved** — Google OAuth SSO live at kb.ss-42.com (v2.1.1) |
| Applyr production container not yet created | **Resolved** — v1.0.0 live at jobs.ss-42.com (production deploy 2026-03-12) |
| AWS scaffold pattern not yet designed | Future phase |
| Client delivery model not fully defined | Future phase |

---

## Related

- [AI Operating Model — Overview](/page/operations/ai-operating-model/overview)
- [Future State](/page/operations/ai-operating-model/future-state)
- [Work Domains](/page/operations/ai-operating-model/work-domains)
