---
title: AI Processing
parent: technical
order: 30
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# AI Processing — Workflow

**Type:** Workflow documentation
**Workspace:** Products
**Section:** ToDo / Workflows
**Stories:** S-C04, S-I08, S-P06, S-P07, S-P01 (all AI-involved flows)
**Feature area:** `feature-areas/ai-layer.md` (shared AI infrastructure), `feature-areas/inbox.md`, `feature-areas/projects.md`
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude

---

## What this workflow covers

AI is used in five distinct places in ToDo. Each has a different trigger, context, and output. This document maps them all and shows the shared infrastructure underneath.

---

## The five AI uses

| Use | Where | Trigger | What AI does | Review gate |
|---|---|---|---|---|
| 1. Inbox intake | Inbox | Auto on ingest (Slack) or "Process ✦" click (Raw Capture) | Converts raw text into proposed container + task breakdown | Yes — Simon accepts/edits/rejects |
| 2. Backlog refinement | Projects → Backlog | "Process ✦" click on Raw backlog item | Analyses scope, proposes task breakdown, detects dependencies | Yes — Simon approves through pipeline |
| 3. Plan My Day | Today | "Plan my day" button | Ranks tasks by available time and project priority | Yes — Simon selects and commits |
| 4. Idea breakdown | Any project | "Break down" button on Idea item | Proposes task breakdown for a vague item | Yes — Simon accepts/edits/rejects |
| 5. Session tasks (auto) | Claude session | Claude working on a project | Claude creates/updates tasks directly | No — session work is trusted |

Use 5 (session tasks) is documented in `workflows/session-integration.md`. This document covers uses 1–4.

---

## Shared AI infrastructure

All four reviewed AI flows use the same underlying components:

```
┌─────────────────────────────────────────────────────┐
│                  src/services/claude.js              │
│                                                      │
│  Model: claude-sonnet-4-6                           │
│  Temperature: 0.3 (low variance — structuring)      │
│  Timeout: 15 seconds                                │
│  Retry: none (Simon retries manually)               │
│                                                      │
│  Every call includes:                               │
│    1. Role definition (task structuring assistant)  │
│    2. Context block (containers, project tasks)     │
│    3. Feedback context (feedback_log entries)       │
│    4. Output format spec (JSON schema)              │
│    5. Task instruction (specific to this call)      │
└─────────────────────────────────────────────────────┘
```

---

## Flow 1: Inbox intake processing

**Trigger:** Message arrives via Slack webhook (auto) OR Simon clicks "Process ✦" on a Raw item.

```
Raw text (any source)
         │
         ▼
Build API context:
  - raw_text
  - containers list (existing containers only)
  - feedback_log entries for this item (if any)
         │
         ▼
Claude API call
  Instruction: "Convert this brain dump into a structured task proposal.
  Select a container from the list provided. Propose 1–5 tasks with titles
  and estimates. Do not invent container names."
         │
     ┌───┴──────────────────────────────┐
     │ Success                          │ Failure / timeout
     ▼                                  ▼
Validate JSON output:              Return error state:
  - container_id in known list?    inbox_entry stays Raw
  - 1–5 tasks?                     "AI analysis failed — retry"
  - each task has title + estimate?
         │
         ▼
inbox_entry updated:
  proposed_container_id
  proposed_items (JSON array)
  status: pending_review
         │
         ▼
Appears in Pending Review tab
Simon: Accept / Edit / Reject
         │
         ▼
On Accept:
  Tasks created in container
  inbox_entry: processed
  activity_log entry written
```

---

## Flow 2: Backlog refinement

**Trigger:** Simon clicks a Raw backlog item. The refinement panel slides in and a Claude API call is made.

```
Raw backlog item selected
         │
         ▼
Build API context:
  - item title + description
  - project: existing tasks (for dependency detection)
  - all projects: active tasks (for reuse detection — v2)
  - feedback_log entries for this item
         │
         ▼
Claude API call
  Instruction: "Analyse this backlog item. Write an analysis (50–300 words).
  Propose 1–8 tasks with titles and estimates. Identify dependencies on
  existing tasks. Do not invent task references."
         │
     ┌───┴──────────────────────────────┐
     │ Success                          │ Failure / timeout
     ▼                                  ▼
Validate JSON output:              Panel shows:
  - analysis: 50–300 words?        "AI analysis unavailable —
  - 1–8 tasks?                     write your task breakdown manually"
  - dependencies reference          Manual fields remain editable
    existing task IDs?
         │
         ▼
Refinement panel populated:
  - AI analysis text (annotatable)
  - Proposed task breakdown (editable)
  - Dependencies (if detected)
  - Priority picker
         │
Simon can annotate and refine:
  Annotation → feedback_log
  "Refine ✦" → re-run with annotations
  (iteration cap: 3)
         │
         ▼
Simon approves through pipeline:
  Raw → Refined (scope clarity gate)
  Refined → Ready (task breakdown gate)
```

---

## Flow 3: Plan My Day

**Trigger:** Simon clicks "Plan my day" on the Today screen.

```
Today screen opened
         │
         ▼
Collect planning context:
  - available_hours (from Google Calendar API)
  - committed_tasks (already in Today's list)
  - carryover_tasks (incomplete from yesterday)
  - all containers: tasks with status To-Do or In Progress
    (ordered by container priority_order)
  - personal group tasks (same status filter)
         │
         ▼
Claude API call
  Instruction: "Given X hours available and the task list below,
  propose 2–6 tasks for today. Rank by project priority. Tasks that
  fit within available time should be pre-selected. Include a reasoning
  statement of at least 5 words per task."
         │
     ┌───┴──────────────────────────────┐
     │ Success                          │ Failure / timeout
     ▼                                  ▼
Validate JSON output:              Panel shows:
  - 2–6 tasks?                     "AI suggestion unavailable —
  - sum of selected ≤ available     adjust manually"
    hours + 15 min tolerance?       Full task list shown for
  - reasoning: ≥ 5 words each?      manual selection
         │
         ▼
Plan My Day panel:
  - Ranked tasks with reasoning
  - Pre-selected tasks (fit within available time)
  - Deselected tasks (over capacity) greyed
  Simon can override any selection
         │
         ▼
Simon commits to plan:
  Committed tasks updated in Today
  "Plan set ✓" shown
  Stats bar recalculates
```

**Note on personal tasks:** Personal group tasks (Finance, Health & Fitness, Home, Creative, Life Admin) are included in the task list passed to Claude. They are treated the same as project tasks for planning purposes.

---

## Flow 4: Idea breakdown

**Trigger:** Simon clicks "Break down" on an Idea item in a project.

```
Idea item selected
         │
         ▼
Build API context:
  - idea title + description
  - container: project name + existing tasks
  - feedback_log entries for this idea (if any)
         │
         ▼
Claude API call
  Instruction: "Break this idea into 2–8 actionable tasks.
  Each task should have a clear title and a time estimate in minutes."
         │
     ┌───┴──────────────────────────────┐
     │ Success                          │ Failure / timeout
     ▼                                  ▼
Validate JSON output:              Modal shows:
  - 2–8 tasks?                     "Could not generate breakdown —
  - each: title (≥ 3 words) +       try again"
    estimate in minutes?           Manual task input fields shown
         │                         Simon can write tasks manually
         ▼
Review modal:
  Proposed tasks listed
  Each can be accepted, edited, or rejected individually
         │
         ▼
On Accept (at least one task):
  Accepted tasks created in same container
  Idea item archived (not deleted)
  activity_log entry written
```

---

## The annotation loop (all flows)

Flows 1, 2, and 4 support inline text annotation. This is the mechanism by which Simon's feedback improves future AI output.

```
AI output displayed
         │
Simon selects text in the output
         │
         ▼
Tooltip: "Annotate"
         │
Simon clicks Annotate
         │
         ▼
Comment input appears inline
Simon types targeted feedback
         │
         ▼
Simon saves annotation:
  feedback_log entry created:
    item_id, surface, highlighted_text,
    annotation_text, iteration, timestamp
  Highlighted text changes colour
         │
"Refine ✦" becomes active
         │
Simon clicks "Refine ✦":
  New API call with:
    - original context
    + feedback_log entries for this item
  New output replaces previous on screen
  Iteration counter increments (max 3)
         │
         ▼
After 3 iterations:
  "Refine ✦" disabled
  Simon accepts current output or writes manually
```

---

## Output validation rules (all AI calls)

These constraints are enforced server-side before the AI output reaches the UI. If validation fails, the fallback state is shown.

| Rule | All flows | Specific to |
|---|---|---|
| Container must be from existing list | Inbox intake only | Prevents hallucinated container names |
| Task count: minimum | 1 (Inbox), 2 (Idea breakdown) | Varies |
| Task count: maximum | 5 (Inbox), 8 (Backlog / Idea breakdown), 6 (Plan My Day) | Varies |
| Task title: minimum 3 words | All task-generating flows | |
| Estimate: must be numeric (minutes) | All task-generating flows | |
| Analysis: 50–300 words | Backlog refinement only | |
| Reasoning: ≥ 5 words per task | Plan My Day only | |
| Sum of selected estimates ≤ available + 15 min | Plan My Day only | |
| Dependencies: must reference existing item IDs | Backlog refinement | Prevents invented task references |

---

## References

- Shared AI infrastructure: `feature-areas/ai-layer.md`
- Inbox feature spec: `feature-areas/inbox.md`
- Projects feature spec: `feature-areas/projects.md`
- Today feature spec: `feature-areas/today.md`
- Item types: `feature-areas/item-types.md`
- Session integration (auto flow): `workflows/session-integration.md`
