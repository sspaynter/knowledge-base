---
title: SSA Website — V2 Updates Scope
status: published
order: 50
author: both
created: 2026-03-19
updated: 2026-03-19
---

# SSA Website — V2 Updates Scope

Visual polish and sketch-style completion for simonsaysautomation.com. These are incremental improvements to the live site, not a redesign.

## Items

| # | Task | Status | Notes |
|---|---|---|---|
| 225 | Hero sub-line font size increase | Done | Caveat sub-lines increased from 20px to match visual weight of 76px titles. Session 22. |
| 226 | Background text — personal connection + dedup | Done | Rewritten for warmth and removed duplicated phrasing. Session 22. |
| 227 | Contact section sketch style + button restyle | Design approved | Design spec: `contact-sketch-design.md`. Wobbly SVG borders on inputs, hand-drawn button, sitting Simon character. Ready for build. |
| 228 | Release pipeline — staging + production CI/CD | Plan validated | GitHub Actions → GHCR → Watchtower. Staging at `ssa-staging.ss-42.com:8092`. Design spec + 8-task plan both PASS (session 21). |

## Design Specs

- **#227:** [Contact Section Sketch Style — Design Spec](contact-sketch-design.md)
- **#228:** `docs/plans/2026-03-19-ssa-release-pipeline-spec.md` (in repo)
