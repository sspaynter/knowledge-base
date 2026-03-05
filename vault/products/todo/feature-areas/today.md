---
title: Today Screen
parent: feature-areas
order: 10
status: published
author: claude
created: 2026-03-04
updated: 2026-03-05
---
# Today — Feature Area Spec

**Type:** Feature area specification
**Workspace:** Products
**Section:** ToDo / Feature Areas
**Stories:** S-T01–T08 (v1), S-T04, S-T05, S-T09 (v2) — see `todo-story-map.md`
**Opportunities addressed:** OPP-02 (Today is never realistic), OPP-04 (partial — quick-add routing)
**Status:** Gate 3 prototype complete — ready for Gate 4 build
**Created:** 2026-03-04 (session 36)
**Author:** Simon Paynter + Claude
**Prototype:** `todo/docs/mockups/todo-prototype-v1.html` → Today screen

---

## What this feature area does

Today is the default landing screen. It answers one question in under 30 seconds: **"What should I actually do today, and is it realistic?"**

It shows Simon what is committed, whether that is achievable against his actual calendar availability, and what needs a decision before the day starts (carry-over, over-commitment). It also provides the entry point for AI-assisted daily planning and a cross-project task view on demand.

---

## Problems it addresses

| Opportunity | Failure point | What Today solves |
|---|---|---|
| OPP-02 | #2 — Today is never realistic | Stats bar shows committed vs available time. Over-commitment warning fires with exact delta. Plan My Day AI panel generates a realistic ranked plan. |
| OPP-02 | #3 — No calendar integration | Available hours are derived from Google Calendar (v1: stat only; v2: visual strip + time-blocking) |
| OPP-02 | #10 — No project-level prioritisation | Plan My Day ranks tasks by project priority, not just task priority |

---

## v1 stories and acceptance criteria

### S-T01 — Morning orientation

WHEN Simon opens ToDo
THEN Today loads as the default screen
AND the week strip shows the current week with today's date highlighted in the accent colour
AND each day shows dot indicators representing the number of committed tasks
AND the stats bar shows three figures: Committed Today (estimated hours + task count), Available (hours remaining after calendar events), Completed (count of tasks marked done today)

---

### S-T02 — Over-commitment warning

WHEN Simon's total committed task time exceeds his available calendar time for today
THEN an amber warning bar appears immediately below the stats bar
AND the warning shows the exact delta in hours ("Over-committed by Xh. You have Yh of tasks but only Zh available today.")
AND an "Adjust plan" button in the warning bar opens the Plan My Day panel
AND the warning bar disappears when committed time comes back within available time

---

### S-T03 — Carry-over prompt

WHEN Simon has tasks from the previous day that were not completed
THEN a carry-over prompt appears showing the count of incomplete tasks
AND three actions are available: "Move all" / "Review" / "Dismiss"
AND selecting "Move all" adds all incomplete tasks to today's list and removes the prompt
AND selecting "Dismiss" closes the prompt without moving any tasks
AND the prompt does not reappear after being dismissed

---

### S-T06 — Today's task list

WHEN Simon views Today
THEN committed tasks are listed below the carry-over prompt in priority order
AND each task row shows: checkbox, task title, time estimate chip, status badge, project tag
AND completed tasks display with strikethrough style and remain in the list until end of day
AND a "+ Add task to today" inline input sits at the bottom of the list

---

### S-T07 — Quick-add to today

WHEN Simon types in the quick-add bar at the bottom of Today's task list and presses Enter
THEN a new task is created and added to today's committed list immediately
AND the task is created in the last-used container by default
AND the new task shows inline without a page reload

---

### S-T08 — Show all tasks

WHEN Simon clicks the "Show all tasks" bar below the task list
THEN a section expands below the list showing all tasks across all projects and personal groups
AND tasks are grouped by project with a project badge per group
AND each task row shows title, status badge, and time estimate
AND the bar label changes to "Hide all tasks"
WHEN Simon clicks the bar again
THEN the section collapses and the label returns to "Show all tasks"

---

### S-P01 — Request daily plan (Plan My Day — scoped to Today)

WHEN Simon clicks the "Plan my day" button
THEN the Plan My Day panel expands above the task list
AND the panel shows a header "What should you work on today?" with an "AI suggestion" badge
AND a context line explains the basis: "Based on your Xh available, Y carryover items, project priorities, and personal tasks"
AND between 2 and 6 tasks are ranked, each showing: task title, reasoning text, time estimate chip, status badge, project/personal group tag
AND tasks from both projects and personal groups are eligible for ranking — personal tasks are not filtered out or treated as secondary
AND tasks that fit within available time are pre-selected (highlighted)
AND tasks outside available capacity are shown deselected with a note
AND Simon can override any selection before committing

**Why personal tasks are included:**
Personal tasks count against available time and represent real commitments in Simon's day. Excluding them would produce an unrealistic plan — Claude would surface project tasks that Simon has no capacity to complete because personal obligations already fill the remaining hours. Full inclusion means the ranked list reflects Simon's actual day, not just his work queue.

**AI risk assessment (Cagan four risks):**
- **Feasibility:** Claude reads available hours from Today API, project priority from containers table, and personal task data from the personal groups. All task data (projects + personal) is included in the Claude API context for ranking. Risk: calendar data may be stale if Google Calendar sync lags. Mitigation: show data freshness timestamp.
- **Usability:** Reasoning text per task makes the AI's logic transparent. Simon is never just shown a ranked list without explanation. Personal tasks show a personal group tag so he can distinguish them from project tasks at a glance.
- **Value:** The alternative (Simon manually deciding what to work on across both work and personal obligations) is slower and more cognitively costly. Full inclusion is the point — one plan, whole day.
- **Viability:** No data is sent to external parties. Claude API is used; data stays within SS42 infrastructure.

**AC for non-deterministic output:**
The ranked list shall contain between 2 and 6 tasks (never empty, never overwhelming).
Tasks from personal groups shall be included in the ranking pool alongside project tasks — the AI must not exclude personal tasks from consideration.
Each task shall include a reasoning statement of at least 5 words.
The sum of selected task estimates shall not exceed available hours by more than 15 minutes.
Simon can deselect any task before committing — the commit action never locks him in without review.

---

### S-P02 — Commit to plan

WHEN Simon clicks "Commit to plan" in the Plan My Day panel
THEN the committed tasks update in Today's task list
AND the Plan My Day panel closes
AND the "Plan my day" button changes state to show "Plan set ✓"
AND the stats bar updates to reflect the new committed hours

---

### S-P03 — Adjust manually

WHEN Simon clicks "Adjust manually" in the Plan My Day panel
THEN the panel closes without any changes applied to Today's task list

---

## Screen states

| State | Trigger | What Simon sees |
|---|---|---|
| Normal | Committed ≤ available | Stats bar in neutral colours. No warning. |
| Over-committed | Committed > available | Amber warning bar with delta + "Adjust plan" button. |
| Carry-over pending | Incomplete tasks from yesterday exist | Carry-over prompt above task list. |
| Plan panel open | "Plan my day" clicked | AI panel expanded above task list. |
| Plan committed | "Commit to plan" clicked | Panel closed. Button shows "Plan set ✓". |
| Show all expanded | "Show all tasks" toggle clicked | Cross-project task section visible below task list. |
| Empty today | No tasks committed | Prompt to start planning or add a task. |
| All done | All tasks completed | Completed stat matches total. Positive end-of-day state. |

---

## Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Default landing screen | Today | Simon needs immediate daily orientation — not a project list or a general dashboard |
| Plan My Day is opt-in | Not auto-shown on load | Simon may already know his priorities. Panel is on demand. |
| Stats bar always visible | Committed / Available / Completed | Keeps capacity constraint visible at all times. |
| Reasoning text per ranked item | Required in v1 | Simon's trust in AI suggestions depends on understanding why — not just accepting output |
| Carry-over is non-destructive | Dismiss is always available | Avoids punishing Simon for not completing yesterday. Pressure is counterproductive. |
| Show all tasks is an expand, not a nav | Inline section, not a separate screen | Keeps Today focused while making everything accessible without context switching |

---

## Prototype reference

**Screen:** Today (default)
**File:** `todo/docs/mockups/todo-prototype-v1.html`
**Select:** Proto bar dropdown → Today

**Key interactions to test in prototype:**
- Scroll down → "Plan my day" button visible above task list
- Click "Plan my day" → panel expands with ranked tasks
- Click "Commit to plan" → panel closes, button shows "Plan set ✓"
- Click "Show all tasks" → cross-project section expands
- Click "Show all tasks" again → collapses

---

## v2 backlog (this feature area)

| Story | Description |
|---|---|
| S-T04 | Calendar event strip — visual time-of-day blocks showing Google Calendar events and free slots |
| S-T05 | Per-task reschedule — right-click context menu on any task: move to tomorrow, pick date, remove from today |
| S-T09 | Time-block to Google Calendar — assign a task to a specific time slot, written to Google Calendar |
| S-P04 | Re-plan mid-day — request a new AI plan after completing tasks, recalculated against remaining time |
