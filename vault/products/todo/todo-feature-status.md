# ToDo — Feature Status (Prototype + As-Built)

**Type:** Reference page
**Workspace:** Products
**Section:** ToDo
**Status:** Active — updated each design and build session
**Created:** 2026-03-03 (session 35)
**Updated:** 2026-03-03 (session 35)
**Author:** Simon Paynter + Claude

---

## Purpose

This page tracks:
1. **Gate 3 prototype status** — which screens are designed and working in the prototype
2. **Gate 4+ build status** — which features are live in production (populated from Gate 4 onward)

Design spec: `todo/docs/plans/2026-03-02-todo-DESIGN-SPEC.md`
Design doc: `todo/docs/plans/2026-03-02-todo-design.md`
Prototype: `todo/docs/mockups/todo-prototype-v1.html`

---

## Gate 3 — Prototype screen status

| Screen | Status | Notes |
|---|---|---|
| Sign-in | Complete | SS42 branded, Google OAuth button, dark/light mode |
| Today | Partial | Week strip, committed/available/completed stats, over-commitment warning, rollover prompt, task list. Missing: prioritisation workflow, "Show everything" toggle, calendar integration visuals |
| Inbox | Partial | Two tabs (Pending / Raw). Basic layout only. Missing: full intake flow, processing workflow |
| Projects — Board view | Complete | Next → Active columns (left-to-right), Parked collapsible section, detail panel on right |
| Projects — Backlog view | Complete | Raw → Refined → Ready pipeline, AI refinement panel (full iteration loop, tasks, deps, reuse, priority picker, history, feedback) |
| Project Detail | Basic | Task list, Kanban toggle, header. Not deeply reviewed yet |
| All Tasks | Not built | Nav item present, screen not yet built |
| Personal | Not built | Nav item present, screen not yet built |

---

## Gate 4+ — Production feature status

*Populated from Gate 4 (build) onward.*

---

## Design decisions that differ from the original spec

| Decision | Spec said | What was designed | Reason |
|---|---|---|---|
| Project backlog states | "Idea items → AI breakdown on demand" | Raw → Refined → Ready pipeline (3 distinct states) | Backlog at scale (20-50 items) needs pipeline model, not ad-hoc review |
| Backlog state meaning | Not defined | Raw = brain dump; Refined = scope clear; Ready = tasks + deps worked out | Scope clarity is the gate between Raw and Refined — not just AI review completion |
| Projects Kanban columns | Active / Next / Parked columns | Next → Active (2 columns) + Parked as collapsible section | Left-to-right should read as progression. Parked is a holding area, not a workflow stage |
| AI review trigger | On demand ("Review ✦" button) | Auto-triggered when item arrives via raw input channel | Better UX — analysis ready without manual action |
| Inline feedback | "Highlight text → annotate → feedback_log" | Section-level highlighting required — not just overall comment box | Simon's requirement: highlight specific text in AI analysis, not just add overall notes |

---

## Outstanding prototype work (Gate 3)

1. Today screen — prioritisation workflow ("what should I work on?"), "Show everything" toggle to All Tasks
2. Inbox screen — full intake and processing flow
3. Backlog panel — inline text highlight-and-comment (Applyr cover letter mechanic applied to AI analysis text)
4. Raw input channel flow — Slack or similar → Raw state → auto-AI
5. All Tasks screen
6. Personal screen

---

## Session build log

| Session | Gate | Key deliverables |
|---|---|---|
| 33 | 0/1/2 | Gate 0 framing, Gate 1 problem space (12 failure points), Gate 2 sections 1–6 |
| 34 | 2/3 | Gate 2 complete (sections 7–12), prototype v1 started (5 screens initial build) |
| 35 | 3 | Projects Board redesign (Next→Active, Parked collapsible), Backlog view (Raw→Refined→Ready pipeline, AI refinement panel), design spec updated |
