---
title: All Tasks
parent: feature-areas
order: 40
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# All Tasks — Feature Area Spec

**Type:** Feature area specification
**Workspace:** Products
**Section:** ToDo / Feature Areas
**Stories:** S-M11–M12 (v1), S-M13 (v2)
**Opportunities addressed:** OPP-07 (No single view across all work)
**Status:** Gate 3 prototype complete — ready for Gate 4 build
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude
**Prototype:** `todo/docs/mockups/todo-prototype-v1.html` → All Tasks screen

---

## What this feature area does

All Tasks is the cross-project master view. It answers one question: **"What exists across all of my work right now?"**

It shows every task from every project and personal group, grouped by container, with filter chips for common queries. It does NOT prioritise or plan (Today does that), manage individual projects (Projects does that), or process intake (Inbox does that).

---

## Problems it addresses

| Opportunity | Failure point | What All Tasks solves |
|---|---|---|
| OPP-07 | #5 — No way to see everything | All tasks from all containers in one view, grouped by project |
| OPP-07 | #5 — Cannot query blocked or due-this-week | Filter chips surface blocked, in-progress, overdue, and today's tasks across all containers |

**Success measurement:**
- OPP-07: Any cross-project question (what is blocked, what is due this week, what is in progress) can be answered in under 30 seconds from All Tasks.

---

## v1 stories and acceptance criteria

### S-M11 — View all tasks

WHEN Simon navigates to All Tasks
THEN all tasks from all projects and personal groups are shown
AND tasks are grouped by container with a project badge per group
AND each group shows a task count badge
AND groups are collapsible — clicking the group header collapses or expands that group
AND within each group, tasks are ordered by priority, then by created date
AND each task row shows: checkbox, title, status badge, time estimate chip, project tag

**Fallback:** If the database query fails, the page shows an error state: "Could not load tasks — check your connection" with a retry button. No partial results are shown.

---

### S-M12 — Filter all tasks

WHEN Simon selects a filter chip (All / Today / Overdue / Blocked / In Progress)
THEN the task list filters to matching tasks across all containers
AND the matching count is shown in the chip label: "Blocked (3)"
AND groups with no matching tasks are hidden in the filtered view
AND if no tasks match the filter, an empty state is shown: "Nothing {filter} right now."
AND the active filter chip is visually highlighted
AND selecting "All" clears the filter and returns to the full list

**AC detail by filter:**
- **All:** All tasks regardless of status
- **Today:** Tasks with scheduled_date = today OR tasks in Today's committed list
- **Overdue:** Tasks with due_date < today AND status not Done
- **Blocked:** Tasks with status = Blocked
- **In Progress:** Tasks with status = In Progress

---

## Screen states

| State | Trigger | What Simon sees |
|---|---|---|
| Normal | All tasks loaded | Grouped task list with project badges and task count per group |
| Filtered | Filter chip selected | Filtered list; chips show match counts; groups with no matches hidden |
| Filter — empty | No tasks match filter | "Nothing {filter} right now." placeholder with "Clear filter" link |
| All tasks empty | No tasks exist anywhere | "No tasks yet — add tasks from Today or Projects" |
| Group collapsed | Group header clicked | Group shows only the header + task count badge, no task rows |
| Error — load failed | Database query fails | Error state: "Could not load tasks — check your connection" + retry button |
| Error — network | No connectivity | Toast: "No connection — task list may be out of date" |
| Loading | Page load | Skeleton loaders for group headers and task rows |

---

## Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Grouped by container, not flat | Grouped by project | A flat list of 100 tasks is unreadable. Container grouping gives context without requiring navigation. |
| Filter chips, not search | 5 predefined chips in v1 | Simon's actual queries are highly predictable: blocked, overdue, in-progress, today. Chips are faster than text search for these. v2 adds advanced filter. |
| Collapsible groups | Collapse on header click | Lets Simon focus on the project(s) he cares about without losing visibility of others |
| No inline editing | Read-only in v1 | All Tasks is for querying — editing happens in the project detail panel (S-M04) |

---

## Non-functional requirements

| Requirement | Target | Notes |
|---|---|---|
| Page load | < 2 seconds | Cross-container query — potentially 100+ tasks across 10 containers |
| Filter apply | < 300ms | Client-side filter on already-loaded data (no additional API call) |
| Accessibility | WCAG 2.1 AA — not targeted v1 | Revisit if multi-user |
| Mobile/responsive | Not supported v1 | 1280px minimum desktop |

---

## Prototype reference

**Screen:** All Tasks
**File:** `todo/docs/mockups/todo-prototype-v1.html`
**Select:** Proto bar dropdown → All Tasks

**Key interactions to verify in prototype:**
- Grouped task list with project badges and task counts
- Filter chip selection highlights chip and filters list
- Collapsible group headers

---

## v2 backlog (this feature area)

| Story | Description |
|---|---|
| S-M13 | Advanced filter and group — filter by container, status, type, tag, date range; group by project / status / due date; sort by project priority / due date / recently updated |
