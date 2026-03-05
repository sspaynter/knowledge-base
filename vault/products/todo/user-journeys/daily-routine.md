---
title: Daily Routine
parent: user-journeys
order: 10
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# Daily Routine — User Journey

**Type:** User journey
**Workspace:** Products
**Section:** ToDo / User Journeys
**Covers feature areas:** today.md, inbox.md, projects.md, personal.md, all-tasks.md
**Stories spanned:** S-T01, S-T02, S-T03, S-P01, S-P02, S-T06, S-E01, S-E02, S-M11, S-M12
**Opportunities addressed:** OPP-02 (Today is never realistic), OPP-06 (personal tasks have no visibility), OPP-07 (no single view across all work)
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude

---

## Journey summary

Simon opens ToDo at the start of a working day. Within 5 minutes he knows what is committed, whether it is realistic, has resolved yesterday's carry-over, set a plan for the day, and started working. This journey covers the start-of-day orientation through first task completion.

---

## Steps

### 1. Morning orientation

**Screen / feature area:** Today — `today.md`
**Story:** S-T01
**What happens:** Simon opens ToDo. Today loads as the default screen. The week strip shows today highlighted, the stats bar shows Committed Today / Available / Completed figures. At 9am on a typical day, Committed shows 5 tasks / 4.5h, Available shows 3.5h (after standing meetings), Completed shows 0.

---

### 2. Carry-over prompt

**Screen / feature area:** Today — `today.md`
**Story:** S-T03
**What happens:** A carry-over prompt appears at the top of the task list: "2 tasks from yesterday were not completed. What do you want to do?" Three options: Move all / Review / Dismiss.
**Decision point:**
- Simon clicks "Move all" → both tasks are added to today's list; Committed hours update immediately.
- Simon clicks "Review" → the two tasks are shown with individual Move / Dismiss options.
- Simon clicks "Dismiss" → prompt closes; tasks remain on yesterday's date.

*Typical flow: Simon clicks "Move all".*

---

### 3. Over-commitment warning

**Screen / feature area:** Today — `today.md`
**Story:** S-T02
**What happens:** With carry-over tasks added, Committed Today is now 6.5h. Available is 3.5h. The amber warning bar appears: "Over-committed by 3h. You have 6.5h of tasks but only 3.5h available today." An "Adjust plan" button is in the warning bar.
**Decision point:** Simon clicks "Adjust plan" → the Plan My Day panel opens.

---

### 4. AI-assisted daily plan

**Screen / feature area:** Today — `today.md`
**Story:** S-P01
**What happens:** The Plan My Day panel expands. Claude has read: available time (3.5h), carry-over items, and project priorities. It returns a ranked list of 4 tasks totalling 3.2h, with reasoning per task: "This is the highest-priority item in the Knowledge Base project." Tasks outside available capacity are shown greyed with a "suggest for tomorrow" label.
**Decision point:**
- Simon reviews the list and deselects one task (disagrees with its priority).
- Simon clicks "Commit to plan" → the panel closes, the committed list updates to the 3 selected tasks (2.8h), the amber warning clears, "Plan set ✓" appears.

**Failure mode at this step:** See failure modes table below.

---

### 5. Working through the day

**Screen / feature area:** Today → Projects — `today.md`, `projects.md`
**Stories:** S-T06, S-E01, S-E02
**What happens:** Simon works through the committed tasks. He clicks checkboxes as tasks complete — strikethrough style applies and the Completed counter in the stats bar increments. For one task, he opens the project board (Projects → Board view) to move a related card from Next to Active.

---

### 6. Cross-project check (mid-day)

**Screen / feature area:** All Tasks — `all-tasks.md`
**Stories:** S-M11, S-M12
**What happens:** Simon clicks "Blocked" filter chip in All Tasks. It shows 2 blocked tasks across two different projects. He clicks into one, sees the task detail panel, updates the status to In Progress (the blocker resolved). The Blocked chip updates its count from 2 to 1.

---

### 7. End-of-day review

**Screen / feature area:** Today — `today.md`
**Story:** S-T01
**What happens:** Simon has completed 3 of the 4 committed tasks. Completed = 3, Committed = 4. The uncompleted task will appear in tomorrow's carry-over prompt. He closes the tab.

---

## Happy path summary

1. Open ToDo → Today loads with stats bar showing capacity gap
2. Carry-over prompt → "Move all" adds yesterday's incomplete tasks
3. Over-commitment warning fires → "Adjust plan" opens Plan My Day
4. Plan My Day → 4 tasks ranked, Simon deselects one, commits to plan
5. Work through tasks → checkboxes, board moves, status updates
6. Mid-day: All Tasks → Blocked filter → resolve one blocker
7. End of day: 3 of 4 tasks done; uncompleted task queued for tomorrow carry-over

---

## Failure modes and recovery

| Where | What fails | What Simon sees | Recovery |
|---|---|---|---|
| Step 1 — Today load | Database query fails | Error state: "Could not load Today — check your connection" + retry button | Retry button re-fetches; if persistent, check network |
| Step 1 — Stats bar | Google Calendar API unavailable | Available hours shows "—" with tooltip: "Calendar unavailable — showing last known value" | Calendar sync retries every 5 minutes in background |
| Step 4 — Plan My Day | Claude API unavailable | Plan My Day panel shows: "AI suggestion unavailable — adjust manually" with manual task list | Simon manually selects tasks from the show-all list |
| Step 4 — Commit | Task status write fails | Error toast: "Could not commit plan — your selections are preserved" + retry button | Retry button re-attempts; selections are not lost |
| Step 5 — Task checkbox | Status write fails | Checkbox animation reverses; error toast: "Could not update task — try again" | Re-click checkbox to retry |
| Step 6 — All Tasks | Database query fails | Error state with retry button | Retry; persistent failure → check server logs |
| Step 6 — Filter apply | Client-side filter (no network) | Instant filter on already-loaded data — cannot fail from network | N/A |
| Network lost mid-session | Complete connectivity loss | Toast: "No connection — changes will sync when reconnected" | All pending writes are queued and retried on reconnect |

---

## Gaps identified

1. **No "end of day" explicit state.** Today has a positive all-done state when all tasks are completed, but there is no "wrap up the day" feature — no nudge to check personal tasks, no weekly preview. This is a v2 consideration.
2. **Google Calendar sync failure is silent in today.md** except for the "—" on Available hours. This should have a more visible indicator — flagged as a potential screen state gap in `today.md`.
3. **Plan My Day does not include personal tasks** in the current story definition. S-P01 references "project priorities" but does not explicitly mention Personal group tasks. Confirm with story map: S-M09 says personal tasks are "eligible to appear in Today" — Plan My Day should include them. This gap requires a clarification note in `today.md` for the builder.
