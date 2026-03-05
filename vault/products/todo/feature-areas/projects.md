---
title: Projects
parent: feature-areas
order: 30
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# Projects — Feature Area Spec

**Type:** Feature area specification
**Workspace:** Products
**Section:** ToDo / Feature Areas
**Stories:** S-M01–M05 (v1 board), S-P05–P09 (v1 backlog pipeline), S-R01–R02 (v1 review), S-M06, S-M07, S-P10, S-P11, S-R03, S-R04 (v2)
**Opportunities addressed:** OPP-04 (Tasks enter without structure), OPP-05 (No project status at a glance), OPP-10 (partial — project priority), OPP-08 (partial — annotation mechanic on backlog)
**Status:** Gate 3 prototype complete — ready for Gate 4 build
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude
**Prototype:** `todo/docs/mockups/todo-prototype-v1.html` → Projects (Board view + Backlog view) + Project Detail

---

## What this feature area does

Projects is where structured work lives. It answers two questions: **"What is the current state of this project?"** and **"Is the backlog ready for building?"**

The Board view shows active tasks (Next / Active / Parked). The Backlog view is the pipeline for items not yet ready to board — Raw brain dumps progress through AI refinement to Ready state before promotion. The Project Detail header provides at-a-glance progress context.

Projects does NOT handle daily prioritisation (that is Today), cross-project querying (that is All Tasks), or personal life tasks (that is Personal).

---

## Problems it addresses

| Opportunity | Failure point | What Projects solves |
|---|---|---|
| OPP-04 | #4 — Volume without intelligence | Backlog pipeline requires AI refinement + Simon review before any item reaches the board. Raw items cannot bypass this gate. |
| OPP-04 | #11 — No outcome tracking | Project header shows outcome statement alongside progress. Backlog items link to outcome at creation. |
| OPP-05 | #8 — No project status at a glance | Project header shows progress bar (x/y tasks done), status chip, and outcome statement. Under 10 seconds to orient. |
| OPP-10 | #10 — No project-level prioritisation | v1: Plan My Day uses project metadata for ranking. v2: drag-to-reorder priority (S-M06). |
| OPP-08 | #12 — AI does not improve | Inline annotation on backlog AI refinement panel feeds feedback_log for future improvement. |

**Success measurement:**
- OPP-04: Every task on the board has: a container, an actionable title, and an estimate. Zero tasks promoted from backlog without passing through Refined state.
- OPP-05: Simon can answer "where is this project at?" within 10 seconds of opening the project header.

---

## First-run and onboarding experience

*Required by completeness checklist — what does Simon see with zero data?*

### Zero-state (no projects created yet)

WHEN Simon opens the Projects section for the first time
THEN the Projects list shows an empty state: "No projects yet — start one."
AND a prominent "New project" button is visible
AND a one-line hint is shown: "Projects hold your work. Backlog clears the thinking. Board runs the execution."

### First project created

WHEN Simon creates his first project
THEN the project opens directly to the Board view
AND the Board shows the two columns (Next and Active) with empty states
AND a Backlog tab is visible with the hint: "Add raw ideas to Backlog, refine them, then promote to Board."

### First backlog item created

WHEN Simon adds the first Raw backlog item to a project
THEN the Raw column in Backlog shows the card
AND a visible "Process ✦" button is on the card
AND a hint appears once: "Click Process ✦ to run AI refinement — you approve the result before anything moves."

*Hints are shown once and do not reappear. They are not dismissable modals — they are inline labels that disappear after first interaction.*

---

## v1 stories and acceptance criteria

### S-M01 — View project board

WHEN Simon opens a project
THEN the Board view loads by default (unless the project has a saved preference for List view — S-R02)
AND two active columns are shown side by side: Next (left) and Active (right)
AND a collapsible Parked section is shown below the columns
AND each task card shows: task title, time estimate chip, status badge
AND the project detail header is visible above the board (S-R01)

---

### S-M02 — Move task between board columns

WHEN Simon drags a task card from one column to another
THEN the task's status updates immediately to match the destination column
AND the board reflects the new position without a page reload
AND an activity log entry is written: task moved, source column, destination column, timestamp

**Fallback:** If the status update write fails, the card returns to its original column with an error toast: "Could not move task — try again."

---

### S-M03 — Park a task

WHEN Simon drags a task card to the Parked section
THEN the task status is set to Parked
AND the task moves to the Parked section
AND the Parked section shows a badge count of parked items when collapsed
AND the section can be expanded to see individual parked tasks

**Fallback:** Same as S-M02 — failed write returns card to original position with error toast.

---

### S-M04 — Task detail panel

WHEN Simon clicks a task card on the board or in any task list
THEN a detail panel slides in from the right
AND the panel shows: task title (editable), description (editable), status (dropdown), estimate (editable), scheduled_date, due_date, project tag
AND changes to any field are saved on blur (not requiring a separate Save button)

**Fallback:** If a field save fails, the field shows an inline error icon: "Not saved." The previous value is restored on next load.

---

### S-M05 — New project creation

WHEN Simon clicks "New project"
THEN a modal opens with fields: name (required), category (dropdown from existing categories), outcome statement (optional text)
AND clicking "Create" creates the project with priority_order at the end of the current list
AND the new project opens immediately to Board view
AND the project appears in the Projects nav list

**Fallback:** If project creation fails, the modal stays open with an error: "Could not create project — check your connection."

---

### S-P05 — View backlog pipeline

WHEN Simon opens the Backlog tab of a project
THEN three columns are shown: Raw, Refine, Ready
AND backlog items are displayed as cards in the appropriate column
AND cards show: category badge, title (or first 60 characters of raw text), age in days

---

### S-P06 — Select backlog item for AI refinement

WHEN Simon clicks a backlog card in the Raw or Refine column
THEN an AI refinement panel slides in from the right
AND the panel shows all of: original item description, AI analysis text, proposed task breakdown (one row per task), detected dependencies, and a priority picker (P1 / P2 / P3)

**v2 only — Reuse candidate detection is NOT in scope for v1:**
The refinement panel does not surface similar tasks from other projects in v1. This is a deliberate deferral — see the detailed note in the v2 backlog section below. Do not implement cross-project task matching as part of this story.

**AI risk assessment (Cagan four risks):**
- **Feasibility:** Claude API call with item text and existing project tasks (for dependency detection). Context window is bounded by active project size — unlikely to exceed limits in v1 single-user use.
- **Usability:** All four panels (description, analysis, proposed tasks, dependencies) are visible simultaneously so Simon can evaluate them as a set, not sequentially.
- **Value:** The alternative is Simon manually decomposing every raw idea — AI does the first pass, Simon approves. This is the core value proposition.
- **Viability:** Project task data sent to Claude API. Standard SS42 API posture — no external data sharing.

**AC for non-deterministic output (AI refinement panel):**
The AI analysis text shall be between 50 and 300 words (never empty, never an essay).
The proposed task breakdown shall contain between 1 and 8 tasks.
Each proposed task shall include a title (at least 3 words) and an estimated duration in minutes.
Dependencies shall be listed as task references (existing tasks) — not invented tasks.
Simon can override any proposed value before approving movement through the pipeline.
Fallback: if the Claude API call fails, the refinement panel shows an error state: "AI analysis unavailable — you can write your own task breakdown manually." Manual fields are still editable and Simon can promote the item without AI output.

---

### S-P07 — Iterate on AI analysis

WHEN Simon uses the inline annotation mechanic on the AI analysis text in the refinement panel
AND clicks "Refine ✦"
THEN the annotation is included as context in a new Claude API call
AND the revised AI output replaces the previous version in the panel
AND an iteration counter shows: "Iteration 2 of 3" (capped at 3 iterations per item)

**Fallback:** If the re-run API call fails, the previous iteration output remains visible and an error is shown: "Refinement failed — your annotation is saved. Try again."

---

### S-P08 — Promote through pipeline

WHEN Simon clicks "Approve → Refined" on a Raw item in the refinement panel
THEN the item moves from the Raw column to the Refine column
AND the move is only allowed if Simon has either accepted an AI analysis or manually written a scope statement (not triggered by AI review completion alone — scope clarity is the gate)
WHEN Simon clicks "Approve → Ready" on a Refined item
THEN the item moves from the Refine column to the Ready column
AND the move is only allowed if at least one task exists in the proposed breakdown

---

### S-P09 — Assign priority

WHEN Simon selects a priority (P1 / P2 / P3) in the refinement panel
THEN the priority is saved to the backlog item immediately
AND items in the Ready column are displayed ordered by priority (P1 at top)

---

### S-R01 — Project detail header

WHEN Simon opens a project
THEN the header shows: project name, outcome statement (or an "Add outcome" placeholder), progress bar (completed tasks / total tasks), status chip
AND the progress bar shows the fraction as both a visual bar and a text label: "X / Y tasks done"
AND the status chip reflects the project's current status (Active / On hold / Complete)

---

### S-R02 — List and Kanban view toggle

WHEN Simon clicks the view toggle on a project board
THEN the task view switches between Board (Kanban) and List
AND the preference is saved per project and restored on next open

---

## Screen states

| State | Trigger | What Simon sees |
|---|---|---|
| Board — normal | Active tasks exist | Next and Active columns with task cards; Parked section collapsed |
| Board — empty Next | No tasks in Next column | Empty column with "Nothing next — add tasks from Backlog" placeholder |
| Board — empty Active | No tasks in Active | Empty column with "Nothing active — pull from Next" placeholder |
| Board — all parked | All tasks in Parked | Both active columns empty; Parked expanded with count |
| Board — first run | No project exists | Projects empty state with "New project" button and one-line hint |
| Backlog — normal | Items across pipeline columns | Three columns (Raw, Refine, Ready) with cards |
| Backlog — all raw | Items not yet refined | Raw column populated; Refine and Ready empty with "nothing here yet" |
| Backlog — empty | No backlog items | Three empty columns with "Add a raw idea to start" in Raw column |
| Refinement panel open | Backlog card clicked | Right panel slides in with AI analysis, task breakdown, dependencies, reuse candidates |
| Refinement panel — AI failed | API unavailable | Panel shows: "AI analysis unavailable — write your task breakdown manually." Manual fields editable. |
| Refinement panel — iterating | "Refine ✦" clicked | Spinner on panel; previous iteration remains visible during re-run |
| Task detail panel open | Task card clicked | Right panel slides in with editable fields |
| Error — move failed | Drag write fails | Card returns to origin; error toast: "Could not move task — try again" |
| Error — network | No connectivity | Toast: "No connection — your changes will sync when reconnected" |
| Loading | Page load / project switch | Skeleton loaders for board columns and header |

---

## Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Board is the default view | Opens to Board, not Backlog | Simon's daily work is on the board; backlog is a planning activity |
| Backlog gate requires scope clarity | Raw → Refined is not automatic after AI review | OPP-04: AI review completion is not the same as scope being understood |
| Iteration cap at 3 | Three refinement iterations per item | Prevents over-refinement loops; Simon should accept or reject after 3 passes |
| Reuse candidates as suggestions | Never auto-merging | Automated merging risks data loss; Simon approves all deduplication decisions |
| Drag-and-drop for board, not backlog | Board = drag; Backlog = panel-based | Board column changes are simple status updates; backlog pipeline transitions require review |
| Project header always visible | Above board and backlog | Progress context is relevant in both views |

---

## Non-functional requirements

| Requirement | Target | Notes |
|---|---|---|
| Board load time | < 2 seconds | Including task cards and header |
| Drag-and-drop responsiveness | < 200ms visual feedback | Card should feel instantly responsive before write confirms |
| AI refinement latency | < 10 seconds (p90) | Full panel population including analysis, tasks, dependencies |
| Refinement timeout | 15 seconds | After timeout: show manual fallback state with error message |
| Accessibility | WCAG 2.1 AA — not targeted v1 | Revisit if multi-user |
| Mobile/responsive | Not supported v1 | 1280px minimum desktop |

---

## Prototype reference

**Screen:** Projects (Board view) + Projects (Backlog view) + Project Detail
**File:** `todo/docs/mockups/todo-prototype-v1.html`

**Key interactions to verify in prototype:**
- Board view: two columns (Next / Active) + Parked section
- Click task card → detail panel slides in from right
- Backlog tab → Raw / Refine / Ready three-column pipeline
- Click backlog card → AI refinement panel with all five sections
- Iteration: annotation → "Refine ✦" → updated output
- New project modal: name, category, outcome fields
- Project header: progress bar, status chip, outcome statement

---

## v2 backlog (this feature area)

| Story | Description |
|---|---|
| S-M06 | Project priority drag-to-reorder — drag projects in the Projects nav list to set priority_order; cascades to Plan My Day task surfacing |
| S-M07 / S-R03 | AI project summary — on-demand plain-English project state summary generated from activity log and current task states |
| S-P10 | Promote Ready item to board — automated promotion of Ready backlog items to the project board as tasks |
| S-P11 | Bulk pipeline management — multi-select and batch-promote backlog items |
| S-R04 | Activity feed — chronological log of all project changes: status updates, task creation, completions, Claude session actions |

---

### v2 — Reuse candidate detection (deferred from v1)

**What it is:**

During backlog refinement, the AI checks Simon's other active projects for tasks that significantly overlap with the item being refined, and surfaces them as suggestions in the refinement panel.

**Example:** Simon has a "Website Redesign" project with a task: *"Research UI component libraries."* He opens a new "Mobile App" backlog item: *"Look into UI component options."* The refinement panel flags the existing task and asks: *"This looks similar to something in Website Redesign — link these, keep separate, or ignore?"*

Simon then decides:
- **Link** — the existing task serves both projects; no duplicate created
- **Keep separate** — confirmed as genuinely different work; both tasks exist independently
- **Ignore** — dismiss the suggestion and proceed normally

**Why deferred to v2:**

1. **API complexity.** The refinement panel already sends item text + current project tasks to Claude. Adding all tasks from all other active projects makes the context window significantly larger, increases latency, and raises the risk of hallucinated matches.

2. **High false positive rate in early use.** Raw backlog items are intentionally vague — that is the point of the Raw state. Loose descriptions like "research X" match "research Y" when neither is specific enough for meaningful comparison. The false positive rate is highest exactly when the feature would be used most (early in a project).

3. **v1 use pattern.** In the first months of use, Simon will rarely have more than 2–3 active projects simultaneously. The overlap surface is small, and the cost of occasionally creating a near-duplicate task is low.

**When to revisit for v2:**
Implement once Simon has 6+ months of usage data and 4+ active projects regularly. By that point: tasks will be better described (more specific), the false positive rate will be lower, and the value of catching duplicates will be demonstrably higher.

**Implementation notes (for when it is built):**
- Matching should use semantic similarity (embedding comparison or Claude-based similarity check), not keyword matching — keyword matching produces too many false positives on short task titles
- Suggestions are shown as a collapsible panel section: "Similar tasks in other projects (X)" — collapsed by default so they do not clutter the primary refinement flow
- Simon approves all link/merge decisions — no automatic deduplication
- The merge action (combining two tasks into one) requires careful handling: which project owns the merged task? Decision: the project where the task is older retains ownership; the newer item links to it
