---
title: Personal
parent: feature-areas
order: 50
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# Personal — Feature Area Spec

**Type:** Feature area specification
**Workspace:** Products
**Section:** ToDo / Feature Areas
**Stories:** S-M08–M09 (v1), S-M10 (v2)
**Opportunities addressed:** OPP-06 (Personal admin tasks have no visibility)
**Status:** Gate 3 prototype complete — ready for Gate 4 build
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude
**Prototype:** `todo/docs/mockups/todo-prototype-v1.html` → Personal screen

---

## What this feature area does

Personal is the task container for life admin — the things that are not project work but consistently get lost or deprioritised. It answers the question: **"What life tasks need attention?"**

It surfaces five default groups (Health & Fitness, Finance, Home, Creative, Life Admin), each with their own task list. Personal tasks follow the same task management patterns as projects — status, estimate, priority — so they can appear in Today, All Tasks, and Plan My Day alongside project work.

Personal does NOT manage project work (Projects does that), process brain dumps (Inbox does that), or provide a cross-group overview (All Tasks does that).

---

## Problems it addresses

| Opportunity | Failure point | What Personal solves |
|---|---|---|
| OPP-06 | #7 — Admin is the most vulnerable category | Five default groups with persistent task lists give personal tasks a dedicated, visible home |
| OPP-06 | #7 — Personal tasks get buried | Personal tasks appear in Today (Plan My Day, task list) on the same footing as project tasks |

**Success measurement:**
- OPP-06: Personal tasks surface in Today with the same treatment as project tasks. Admin tasks are not routinely missed.
- Observable proxy: Simon can recall, within one week of use, whether any personal admin task was missed — if none were, the feature is working.

---

## v1 stories and acceptance criteria

### S-M08 — View personal groups

WHEN Simon navigates to Personal
THEN a sidebar shows five default groups: Health & Fitness, Finance, Home, Creative, Life Admin
AND clicking a group shows that group's tasks in the right panel
AND each group has its own task list independent of the others
AND a task count badge shows per group in the sidebar

---

### S-M09 — Personal task management

WHEN Simon adds a task within a personal group
THEN a task is created with the same fields as project tasks: title, status, estimate, due_date, scheduled_date, priority
WHEN Simon updates a task in a personal group
THEN the same status, estimate, and priority fields apply as in Projects
AND personal tasks appear in All Tasks (S-M11) grouped under their personal group
AND personal tasks are eligible to appear in Today (committed list, Plan My Day suggestions)

**Fallback:** If the task save fails, an inline error is shown: "Could not save task — check your connection." The task input is preserved for retry.

---

## Screen states

| State | Trigger | What Simon sees |
|---|---|---|
| Normal | Group selected with tasks | Right panel shows group task list; sidebar shows all five groups |
| Group — empty | Group selected, no tasks | "No tasks in {group name} — add one below." with an inline add input |
| All groups empty | No tasks in any group | All groups show zero count; right panel shows first group empty state |
| First run | Personal first opened | All five groups visible in sidebar; first group selected; empty state with add input shown |
| Task add — active | Add input focused | Input is active; pressing Enter creates the task; Escape cancels |
| Error — save failed | Task write fails | Inline error on the add input: "Could not save — try again" |
| Error — load failed | Task list query fails | Right panel shows: "Could not load tasks — check your connection" + retry button |
| Error — network | No connectivity | Toast: "No connection — changes will sync when reconnected" |
| Loading | Group switch | Skeleton loaders for task rows in right panel |

---

## Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Five default groups, not custom | Health & Fitness / Finance / Home / Creative / Life Admin | These five cover Simon's actual personal admin categories without requiring setup. v2 adds custom groups (S-M10). |
| Same task model as projects | Not a simplified model | Personal tasks appear in Today and All Tasks — consistency requires the same fields. Separate model would cause display inconsistencies. |
| Sidebar + right panel layout | Two-panel, not tabs | Matches the Projects nav pattern. Group switching does not require a page navigation. |
| No backlog pipeline for Personal | Direct task creation only | Personal admin tasks are immediate actions, not ideas requiring refinement. The Raw → Refined → Ready pipeline is overkill for "pay electricity bill". |

---

## Non-functional requirements

| Requirement | Target | Notes |
|---|---|---|
| Group switch load time | < 500ms | Task list for selected group |
| Task save | < 300ms | Inline add should feel immediate |
| Accessibility | WCAG 2.1 AA — not targeted v1 | Revisit if multi-user |
| Mobile/responsive | Not supported v1 | 1280px minimum desktop |

---

## Prototype reference

**Screen:** Personal
**File:** `todo/docs/mockups/todo-prototype-v1.html`
**Select:** Proto bar dropdown → Personal

**Key interactions to verify in prototype:**
- Five default groups in sidebar with task count badges
- Click group → task list loads in right panel
- Inline task add input at bottom of task list
- Task rows with status badge, estimate chip

---

## v2 backlog (this feature area)

| Story | Description |
|---|---|
| S-M10 | Custom personal groups — create additional groups beyond the five defaults (e.g., "Camping 2026") using the same creation flow as projects |
| Recurring tasks | Allow tasks to be set as recurring (daily, weekly, monthly, on a specific date). Example patterns: swim (weekly), pay electricity bill (monthly with due date reminder), take medication (daily). When a recurring task is completed, the next occurrence is automatically created with the next due date. Recurrence pattern stored on the task. This was explicitly out of scope for v1 — deferred following session 37 review. |
