---
title: Feature Areas
parent: product-definition
order: 30
status: published
author: claude
created: 2026-03-06
updated: 2026-03-06
---

# ToDo — Feature Areas

**Type:** Product artefact — Feature Area Index and Specs
**Workspace:** Products
**Section:** ToDo
**Framework:** Cagan (SVPG) — four product risks; outcome-based feature definition
**Status:** v1 baseline — Session 40 (2026-03-06)
**Author:** Simon Paynter + Claude

---

## How to read this document

**Index table** — all 12 feature areas at a glance: phase, story count, status.

**Area specs** — one section per area, each containing:
- **Problem** — what customer problem this solves and why the area exists
- **Who it's for** — user, context, job to be done
- **Desired outcome** — what Simon can do when this area is fully shipped (outcome, not feature list)
- **Success metrics** — how we know it's working
- **Capabilities** — story IDs from the story map, with phase
- **Out of scope** — explicit exclusions
- **Dependencies** — other areas and infrastructure this needs
- **Product risks** — Cagan's four: value, usability, feasibility, viability
- **AI considerations** — accuracy thresholds, fallback behaviour, human-in-the-loop design (AI areas only)
- **Phase / Status**

Story-level acceptance criteria (WHEN/THEN/AND) live in `todo-story-map.md`. This document is one level above — it defines why each area exists and what done looks like at the area level.

---

## Feature area index

| # | Feature Area | Phase | Stories | Status |
|---|---|---|---|---|
| 1 | Daily Orientation | MVP + v1 + v2 | S-T01–T03, T06–T08, T10 (v1); T04, T05, T09 (v2) | Not started |
| 2 | Capture | MVP + v1 + v2 | S-C01–C02 (MVP); C04–C05 (v1); C03, C06 (v2) | Not started |
| 3 | Intake & Inbox Processing | MVP + v1 + v2 | S-I01–I04, I07–I08 (MVP); I05, I09–I11 (v1); I06, I12 (v2) | Not started |
| 4 | Work Decomposition | v1 + v2 | S-P05–P09 (v1); P10–P11 (v2) | Not started |
| 5 | Daily Planning | MVP + v2 | S-P01–P03 (MVP); P04 (v2) | Not started |
| 6 | Project Management | MVP + v1 + v2 | S-M01–M05, R01–R02 (MVP); M06 (v1); M07, R03–R04 (v2) | Not started |
| 7 | Task Execution | MVP + v1 + v2 | S-E01–E03 (MVP); E04 (v1); E08 (v2) | Not started |
| 8 | AI Session Integration | MVP + v2 | S-E05–E07 (MVP); E08 (v2) | Not started |
| 9 | Personal Groups | MVP + v2 | S-M08–M09 (MVP); M10 (v2) | Not started |
| 10 | Cross-Project View | v1 + v2 | S-M11–M12 (v1); M13 (v2) | Not started |
| 11 | Metrics & Reporting | v1 + v2 | No story IDs yet — defined below | Not started |
| 12 | Settings & Configuration | MVP + v1 + v2 | No story IDs yet — defined below | Not started |

---

## Competitive position — one line per area

| # | Area | Position |
|---|---|---|
| 1 | Daily Orientation | Table stakes screen; differentiated by live over-commitment warning and blocked task surfacing without full calendar integration |
| 2 | Capture | Cmd+K is standard; Slack ingest puts it in Akiflow territory; differentiated by default routing to AI intake |
| 3 | Intake & Inbox Processing | Closest to TaskMelt/Tiimo; differentiated by explicit human-in-the-loop review gate — no item enters the system without Simon's approval |
| 4 | Work Decomposition | Near-unique in personal task management. Linear has it for dev teams. No personal productivity tool has AI-assisted decomposition through to session-sized work packages |
| 5 | Daily Planning | Closest to Morgen/Trevor (suggest → approve). Motion does this but fully automated with no approval gate. Differentiated by blocked task surfacing and manual capacity input for MVP |
| 6 | Project Management | Simplified vs Notion/Linear. Two-column board (Next + Active) is intentionally lighter than full Kanban |
| 7 | Task Execution | Table stakes. Blocked status feeding Plan My Day and All Tasks filter is a small differentiator |
| 8 | AI Session Integration | Unique. No competitor. ToDo as the live memory and work queue for AI work sessions |
| 9 | Personal Groups | Things 3 "Areas" is closest. Differentiated by personal tasks in daily plan on equal footing with project work |
| 10 | Cross-Project View | Table stakes. Blocked filter linked from Today screen is a small differentiator |
| 11 | Metrics & Reporting | Deeper than Todoist (not just karma counts). More personal than ClickUp. Unique angle: session-level data from Claude API enables AI contribution metrics no competitor can produce |
| 12 | Settings & Configuration | Table stakes |

---

## Feature Area 1: Daily Orientation

### Problem
Simon has no reliable way to start his working day with an accurate picture of what he needs to do and whether it is achievable. He opens Trello and sees a board that does not reflect today's reality — no capacity awareness, no carry-over visibility, no over-commitment signal. He either over-commits and fails, or under-uses the day. The same problem persists throughout the day: completed tasks are not reflected anywhere, and there is no live view of progress.

### Who it's for
Simon, at the start of his working day and throughout the day as tasks get completed, carry-over is resolved, and capacity changes.

### Desired outcome
When Simon opens ToDo, within 30 seconds he knows what is committed for today, whether it is achievable, and what to do with anything left over from yesterday. Throughout the day the screen stays current without manual maintenance — completed tasks (including those completed by Claude sessions) are reflected in real time.

### Success metrics
- Today screen loads as the default view and is accurate within 1 second
- Carry-over prompt appears on any day that has incomplete tasks from the previous day
- Stats bar updates within 1 second of any task completion (manual or via API)
- Over-commitment warning fires when committed time exceeds available hours
- Simon does not open Trello for daily orientation after 5 consecutive days of use

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-T01 | Morning orientation — Today as default, week strip, task-dot indicators, stats bar | MVP |
| S-T02 | Over-commitment warning — amber bar with delta and "Adjust plan" action | MVP |
| S-T03 | Carry-over prompt — yesterday's incomplete tasks with Move all / Review / Dismiss | MVP |
| S-T06 | Today's task list — committed tasks in priority order with checkbox, estimate, status, project tag | MVP |
| S-T07 | Quick-add to today — type in bar, creates task in last-used container | MVP |
| S-T08 | Show all tasks — expandable section below Today showing all tasks grouped by project | v1 |
| S-T10 | Blocked task count — "X tasks blocked — review →" linking to All Tasks Blocked filter | v1 |
| S-T04 | Calendar event strip — Google Calendar events as time blocks, free slots visualised | v2 |
| S-T05 | Per-task reschedule — right-click context menu: move to tomorrow, pick a date, remove | v2 |
| S-T09 | Time-block to Google Calendar — schedule a task into a free calendar slot | v2 |

### Out of scope
- Time-blocking to external calendar (v2 via S-T09)
- Calendar event visualisation (v2 via S-T04)
- Multi-day planning view
- Team visibility or shared today screens

### Dependencies
- Projects and tasks must exist (Feature Area 6)
- Available hours setting (Feature Area 12)
- Google Calendar OAuth for full capacity calculation (v1, Feature Area 12)
- Task Execution (Feature Area 7) — task completion data feeds stats bar

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. Daily orientation is Simon's stated primary frustration with current tools. |
| Usability | Low risk. Today screen is a familiar pattern across all task managers. The stats bar adds information without complexity. |
| Feasibility | Low risk. Display logic is straightforward. Carry-over and stats bar are well-understood patterns. |
| Viability | No concerns. |

### AI considerations
None. Daily Orientation is a display layer. No AI involvement. AI output (session completions, Plan My Day commits) flows into this screen as data but is not generated here.

### Phase / Status
**MVP** (T01–T03, T06–T07) · **v1** (T08, T10) · **v2** (T04, T05, T09) — **Not started**

---

## Feature Area 2: Capture

### Problem
When Simon has an idea, a task, or a brain dump, he needs to capture it in under 10 seconds from wherever he is working. If capture is slow or requires context-switching to a different app or screen, things fall through. The capture point must be frictionless and must exist in the places Simon already works — web app, Slack, mobile.

### Who it's for
Simon, at any point during the working day. At his desk via the web app, in Slack on desktop or mobile, or away from desk on a mobile device.

### Desired outcome
Simon can get any thought or task into the system in under 10 seconds from any context he is working in. Nothing is lost because capture was too slow or too far away. All captured items land somewhere reliable — the Inbox — for later processing.

### Success metrics
- Cmd+K palette opens within 200ms from any screen
- Item saved to Inbox in under 10 seconds (keystroke to confirmation)
- Slack messages appear in Inbox within 60 seconds of being sent
- Zero items lost because capture was unavailable or too slow

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-C01 | Command palette — Cmd+K from any screen, text input, Tab for container selector, Enter to save | MVP |
| S-C02 | Brain dump routing — unrouted items go to Inbox; routed items go directly to container | MVP |
| S-C04 | Slack auto-ingest — messages to #todo-inbox channel ingested via n8n webhook, AI triggered on arrival | v1 |
| S-C05 | Mobile capture — captured from mobile device, arrives in Inbox with Mobile source badge | v1 |
| S-C03 | Global search via Cmd+K — type to search existing tasks, projects, and items | v2 |
| S-C06 | Email capture — forward email to capture address, ingested as brain dump | v2 |

### Out of scope
- Voice capture (future)
- Browser extension capture
- Capture from third-party tools other than Slack (future)
- Any processing at the point of capture — capture is input only

### Dependencies
- Inbox must exist (Feature Area 3) — all unrouted items land here
- n8n webhook infrastructure for Slack ingest (S-C04)
- Mobile PWA or iOS Shortcut for mobile capture (S-C05)

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. Cmd+K is a proven pattern. Simon currently loses ideas because no capture mechanism is always available. |
| Usability | Low risk for Cmd+K — simple and familiar. Slack ingest is zero-friction by design (just send a message). |
| Feasibility | Cmd+K is low complexity. Slack webhook via n8n is understood infrastructure already used in other SS42 projects. |
| Viability | No concerns. |

### AI considerations
None. Capture is input only. AI processing happens downstream in Intake & Inbox Processing (Feature Area 3).

### Phase / Status
**MVP** (C01–C02) · **v1** (C04–C05) · **v2** (C03, C06) — **Not started**

---

## Feature Area 3: Intake & Inbox Processing

### Problem
Raw brain dumps and captured items have no structure. They are text. Simon needs them to become actionable tasks with containers, estimates, and clear next actions — but manually decomposing every item is slow and cognitively expensive. The AI should propose structure; Simon should approve or adjust. Nothing should enter the active task system without his explicit sign-off.

### Who it's for
Simon, processing his Inbox during or after capture — typically at the start of the day or end of day.

### Desired outcome
Every raw input is transformed into structured, actionable tasks through an AI-proposed breakdown that Simon reviews and approves in under 30 seconds per item. Nothing enters the active task system without his explicit action. Processing the Inbox feels fast, not like admin work.

### Success metrics
- AI processing completes within 5 seconds per item
- Simon can Accept/Edit/Reject in under 30 seconds per item
- Accepted items appear in the correct container immediately
- Zero items move to active tasks without Simon's explicit Accept action
- Inbox at zero at least once per day during the first week of use

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-I01 | View proposed structure — inbox card shows original text, proposed container, proposed task breakdown, source badge, Accept/Edit/Reject actions | MVP |
| S-I02 | Accept intake item — proposed tasks created in container, inbox entry removed, activity log entry created | MVP |
| S-I03 | Reject intake item — inbox entry removed, no tasks created | MVP |
| S-I04 | Edit before accepting — proposed structure editable inline before accepting | MVP |
| S-I07 | View raw items — Raw Capture tab listing unprocessed items with source badge and "Process ✦" button | MVP |
| S-I08 | Process a raw item — processing animation, three stage indicators, proposed structure revealed | MVP |
| S-I05 | Bulk actions — Accept all / Reject all across multiple inbox items | v1 |
| S-I09 | Highlight and annotate — select text in AI output, add targeted feedback annotation | v1 |
| S-I10 | Save annotation — annotation stored in feedback_log, used as context for next AI call | v1 |
| S-I11 | Cancel annotation — remove highlight, no entry written | v1 |
| S-I06 | Inbox zero state — positive confirmation when all items are processed | v2 |
| S-I12 | Annotation history panel — previous annotations with timestamps and revisions | v2 |

### Out of scope
- Automatic acceptance without Simon's review — human-in-the-loop is a non-negotiable design principle
- Routing to external systems (GitHub Issues, Notion, etc.)
- Email thread processing
- Multi-person review or approval flows

### Dependencies
- Claude API for AI processing and proposed breakdown
- Projects must exist for routing (Feature Area 6)
- Capture (Feature Area 2) — Inbox receives items from all capture channels
- Work Decomposition (Feature Area 4) — processed items can flow to the backlog pipeline

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. AI intake is the core differentiator over Trello. Brain dump → structured tasks is Simon's stated primary use case. |
| Usability | Medium risk. The review gate must feel fast and lightweight, not like admin work. If reviewing feels slower than typing tasks manually, Simon will bypass the inbox. Design must optimise for speed — one-key Accept, minimal visual weight. |
| Feasibility | Medium risk. Claude API response quality for task breakdown needs validation during build. Latency must be under 5 seconds or the processing experience breaks. |
| Viability | API cost per item needs monitoring at scale. At Simon's volume, cost is negligible. |

### AI considerations
- **Accuracy threshold:** Proposed container and task breakdown must be correct or reasonable >80% of the time for Simon to trust the output. Below this, he will reject more than he accepts and the feature loses value.
- **Fallback:** If AI processing fails, the item stays in the Raw tab with a manual "Try again" option. Never lose the original text.
- **Human-in-the-loop:** Always enforced. No item moves to active tasks without an explicit Accept action from Simon.

### Phase / Status
**MVP** (I01–I04, I07–I08) · **v1** (I05, I09–I11) · **v2** (I06, I12) — **Not started**

---

## Feature Area 4: Work Decomposition

### Problem
When Simon has a project or feature idea confirmed as worth building, he needs to break it down into tasks — and then break those tasks into work packages small enough for a single Claude session to complete with clear scope. Without this decomposition layer, sessions start with ambiguous work and produce ambiguous results. The decomposition also makes planning more accurate: well-scoped work packages are estimable, sequenceable, and trackable.

### Who it's for
Simon, in the planning phase before active work begins on a project or feature.

### Desired outcome
Every confirmed piece of work can be decomposed into AI session-sized work packages, each with clear scope, success conditions, and verification steps. Claude can pick up any work package and know exactly what done looks like without asking Simon to brief it.

### Success metrics
- Work packages are scoped to 30–90 minutes of AI session time
- Every work package has defined success conditions before work starts
- Claude sessions started from a work package complete without scope clarification requests
- Backlog items move from Raw to Ready in fewer than 3 AI refinement iterations on average

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-P05 | View backlog pipeline — three columns: Raw, Refine, Ready with cards showing badge, title, age | v1 |
| S-P06 | Select backlog item for AI refinement — refinement panel with analysis, proposed breakdown, dependencies, reuse candidates, priority picker | v1 |
| S-P07 | Iterate on AI analysis — inline annotation mechanic (S-I09–I11) applied to refinement output; "Refine ✦" re-runs with annotations as context | v1 |
| S-P08 | Promote through pipeline — Raw → Refined (scope clarity required); Refined → Ready (tasks and dependencies resolved) | v1 |
| S-P09 | Assign priority — P1 / P2 / P3 saved to item, reflected in Ready column position | v1 |
| S-P10 | Promote Ready item to board — promote to project board as task set, archive backlog item | v2 |
| S-P11 | Bulk pipeline management — multi-select and batch promote | v2 |

### Work package definition (sub-feature)
Every task created through this pipeline — and every task broken down to session level — includes three required fields:
- **Description** — what needs to be done
- **Success conditions** — what done looks like (observable outcome)
- **Verification steps** — what Claude runs or checks to confirm done (test command, endpoint check, UI state match)

This is the data contract between Work Decomposition and AI Session Integration. Without it, session-level execution is ambiguous.

### Out of scope
- Automated decomposition without Simon's review
- GitHub Issues sync (future — would bridge Work Decomposition to external repositories)
- Cross-project dependency mapping (future)
- Gantt or timeline views

### Dependencies
- Projects must exist (Feature Area 6)
- Claude API for the AI refinement panel
- Intake & Inbox Processing (Feature Area 3) — processed items can flow into the backlog pipeline
- AI Session Integration (Feature Area 8) — work packages define the contract Claude works from

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. Simon named this the critical differentiator. No personal task management tool has AI-assisted decomposition through to session-sized work packages. |
| Usability | High risk. The backlog pipeline and refinement panel are the most complex UI in the product. If it feels like overhead relative to writing a plan file manually, Simon will not use it. Must feel lighter and faster than the current planning process. |
| Feasibility | Medium risk. AI refinement panel with iteration history and annotation is significant build effort. API latency and output quality need validation. |
| Viability | No concerns. |

### AI considerations
- **Accuracy threshold:** AI breakdown into tasks must be sensible and scoped correctly >75% of the time. The iteration mechanic handles refinement — first-pass accuracy just needs to be good enough to build on.
- **Fallback:** If refinement fails, item stays in its current pipeline stage. Simon can edit manually.
- **Human-in-the-loop:** Simon approves every pipeline stage promotion. AI proposes; Simon decides.

### Phase / Status
**v1** (P05–P09) · **v2** (P10–P11) — **Not started**

---

## Feature Area 5: Daily Planning

### Problem
Even with a good task list, Simon does not always know what to focus on today. Choosing between competing priorities while respecting available time is a daily cognitive load that he should not have to carry alone. He needs an AI assistant that can make a defensible, capacity-aware recommendation — and then step back while he decides.

### Who it's for
Simon, at the start of his working day. Occasionally mid-day when plans change.

### Desired outcome
Simon can get a ranked, capacity-aware plan for his day in under 60 seconds, review it, adjust as needed, and commit. The plan accounts for available hours, task priorities, blocked items, and carry-over. He does not have to think through competing priorities from scratch every morning.

### Success metrics
- Plan My Day generates a recommendation within 5 seconds of the request
- Recommended plan fits within available hours on every generation
- Blocked tasks are surfaced with a Blocked badge — never silently excluded from the plan
- Simon commits a daily plan in under 2 minutes from opening the panel
- Simon uses Plan My Day at least 4 out of 5 working days in the first two weeks

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-P01 | Request daily plan — Claude generates ranked list within available capacity; includes blocked tasks with badge; pre-selects tasks within capacity; greyed suggestions for over-capacity tasks | MVP |
| S-P02 | Commit to plan — committed tasks update in Today; button changes to "Plan set ✓"; panel closes | MVP |
| S-P03 | Adjust manually — panel closes without committing; Simon adjusts Today task list directly | MVP |
| S-P04 | Re-plan mid-day — recalculate based on remaining time and incomplete tasks | v2 |

### Out of scope
- Automatic commitment without Simon's review
- Multi-day planning
- Team scheduling or resource allocation
- Time-blocking to Google Calendar (v2 — lives in Daily Orientation as S-T09)

### Dependencies
- Daily Orientation (Feature Area 1) — Plan My Day panel lives on the Today screen; output populates the committed task list
- Settings (Feature Area 12) — available hours from manual input (MVP) or Google Calendar (v1)
- Projects and tasks (Feature Area 6) — task pool for planning
- Personal Groups (Feature Area 9) — personal tasks eligible for the daily plan
- Task Execution (Feature Area 7) — blocked status and blocker notes fed as context to the AI

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. Capacity-aware daily planning is Simon's second stated pain point after daily orientation. |
| Usability | Medium risk. The panel must feel like a fast conversation, not a form. If it requires configuration each morning or the recommendations are regularly wrong, it will not be used. |
| Feasibility | Low risk. Recommendation logic (priority order, capacity fit, blocked surfacing) is well-understood. Latency must be under 5 seconds. |
| Viability | No concerns. |

### AI considerations
- **Accuracy threshold:** Plan should be sensible and capacity-correct >90% of the time. Occasional bad suggestions are tolerable if Simon can override with one action.
- **Fallback:** If AI planning fails, Simon can build the plan manually from the task list without any degraded experience.
- **Human-in-the-loop:** Always enforced. Simon explicitly commits the plan before it is active.

### Phase / Status
**MVP** (P01–P03) · **v2** (P04) — **Not started**

---

## Feature Area 6: Project Management

### Problem
Simon's project work has no consistent structure. Tasks for different projects live across Trello boards, Notion pages, and text files. There is no single view of what is active, what is next, and what is parked. Starting a project requires manual setup across multiple tools. Reviewing a project's current state requires navigating between boards and reconstructing context from memory.

### Who it's for
Simon, managing active projects day-to-day and reviewing project status weekly.

### Desired outcome
Every project has a clean board showing what is next, what is active, and what is parked. Simon can create, manage, and review any project from one place. Project status is always accurate without manual maintenance because Claude sessions update task state automatically.

### Success metrics
- New project created in under 60 seconds
- Board reflects accurate task status at all times (real-time updates)
- Simon can assess full project status in under 30 seconds (progress bar, outcome statement, active tasks)
- List and Kanban view preference persists per project

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-M01 | View project board — Next and Active columns, collapsible Parked section | MVP |
| S-M02 | Move task between columns — drag to update status; board reflects immediately | MVP |
| S-M03 | Park a task — drag to Parked; section shows count when collapsed | MVP |
| S-M04 | Task detail panel — slides in from right; shows title, description, status, estimate, dates, project | MVP |
| S-M05 | New project creation — modal for name, category, optional outcome statement | MVP |
| S-R01 | Project detail header — name, outcome statement, progress bar (x/y tasks done), status chip | MVP |
| S-R02 | List and Kanban view toggle — saved per project | MVP |
| S-M06 | Project priority drag-to-reorder — reorder projects list; surfaces in Plan My Day suggestions | v1 |
| S-M07 | AI project summary — Claude generates plain-English project state summary from activity log | v2 |
| S-R03 | AI project summary on demand — completed, in-progress, blocked, next actions | v2 |
| S-R04 | Activity feed — chronological log of all changes per project | v2 |

### Out of scope
- Multi-user project collaboration
- GitHub Issues sync (future)
- Gantt charts or timeline views
- Budget or resource tracking
- Project templates

### Dependencies
- Task Execution (Feature Area 7) — status management underpins the board
- Work Decomposition (Feature Area 4) — backlog pipeline lives within a project
- AI Session Integration (Feature Area 8) — Claude updates board state during sessions
- Daily Orientation (Feature Area 1) and Daily Planning (Feature Area 5) — project tasks feed both screens

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. Core replacement for Trello. Must match Trello's utility on day one or there is no reason to switch. |
| Usability | Low risk. Board views are a well-established pattern. The two-column board (Next + Active) is intentionally simpler than Trello's multi-column boards. |
| Feasibility | Low risk. Standard board implementation with drag-and-drop state management. |
| Viability | No concerns. |

### AI considerations (S-M07, S-R03)
- **Accuracy:** Summary must be grounded in the activity log. No hallucinating project state or inventing progress.
- **Fallback:** If summary generation fails, surface the raw activity log.
- **Human-in-the-loop:** AI summary is on-demand and read-only. Claude does not write project state in this feature.

### Phase / Status
**MVP** (M01–M05, R01–R02) · **v1** (M06) · **v2** (M07, R03–R04) — **Not started**

---

## Feature Area 7: Task Execution

### Problem
Tasks need to move through a clear status lifecycle as work happens. When a task is blocked, Simon needs to record what is blocking it so that information can surface in his daily plan. The system should stay accurate with minimal manual effort — and when Claude is doing the work, it should update task status automatically.

### Who it's for
Simon, during active work — checking tasks off, updating status, noting blockers. Claude, updating task state via the API during active sessions.

### Desired outcome
Task status always reflects reality. Blocked tasks are visible and actionable. Completing a task from any screen updates the system immediately. Blocker notes feed into Plan My Day context so the AI knows what is stuck and why.

### Success metrics
- Status update completes within 200ms on any screen
- Blocked tasks appear in All Tasks Blocked filter within 1 second of status change
- Completed count in Today stats bar increments immediately on task completion
- Blocker notes are included in Plan My Day AI context on the same day they are added

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-E01 | Update task status — click status chip, dropdown of available statuses, updates immediately | MVP |
| S-E02 | Complete a task — check checkbox, status set to Done, strikethrough in list, Completed count increments | MVP |
| S-E03 | Mark task blocked — Blocked badge on task, surfaced in All Tasks Blocked filter | MVP |
| S-E04 | Note a blocker — short note when marking Blocked; visible in task detail; included in AI context | v1 |
| S-E08 | Session summary — activity log entry at end of Claude session: what was done, created, changed | v2 |

### Out of scope
- Time tracking per task
- Recurring tasks (future)
- Task dependencies (task cannot start until another is done)
- Sub-tasks
- Attachments or file uploads

### Dependencies
- Project Management (Feature Area 6) — tasks exist within projects
- Daily Orientation (Feature Area 1) — completed count feeds stats bar
- AI Session Integration (Feature Area 8) — Claude updates task status via API
- Cross-Project View (Feature Area 10) — Blocked filter queries task status across all containers
- Daily Planning (Feature Area 5) — blocked status and blocker notes fed as AI context

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. Core task hygiene that every task manager must deliver. |
| Usability | Low risk. Status chips and checkboxes are universal patterns with no learning curve. |
| Feasibility | Low risk. Simple state machine with real-time UI update. |
| Viability | No concerns. |

### AI considerations
Blocker notes (S-E04) are plain text at this stage — no AI processing. The notes are passed as context to Plan My Day AI. Accuracy of AI planning depends on the quality of what Simon writes in the note.

### Phase / Status
**MVP** (E01–E03) · **v1** (E04) · **v2** (E08) — **Not started**

---

## Feature Area 8: AI Session Integration

### Problem
Every time Simon starts a Claude session on a project, he spends 5–10 minutes briefing Claude on current state — what has been done, what is in progress, what the current priorities are. This briefing overhead multiplies across every session and every project. Meanwhile, work completed in Claude sessions does not automatically update the task system, creating drift between what ToDo shows and what has actually happened. ToDo should be the source of truth; Claude sessions should read from it and write back to it.

### Who it's for
Claude, operating during active work sessions. Simon benefits indirectly — zero briefing overhead and a task system that stays current automatically.

### Desired outcome
Claude can load full project context from ToDo at the start of any session. Task status updates happen automatically as Claude completes work. New items discovered during sessions land in Inbox for Simon's review. Simon starts every project session with zero manual briefing. The task system never drifts from reality.

### Success metrics
- Context load via API returns full project state within 2 seconds
- Task status updates reflect in ToDo within 1 second of Claude's API call
- Session brain dumps appear in Inbox immediately and flow through the standard intake process
- Simon starts a project session with zero manual briefing for 5 consecutive sessions
- Zero instances of task state drift between Claude sessions and ToDo display

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-E05 | Session context load — GET /api/v1/claude/context returns all containers and active items for a project | MVP |
| S-E06 | Auto task update from session — PATCH /api/v1/claude/items/:id updates task status; no review gate; activity log entry created | MVP |
| S-E07 | Session brain dump — POST /api/v1/claude/inbox submits new items to Inbox; goes through standard intake review | MVP |
| S-E08 | Session summary — activity log entry written at end of session; what was done, created, changed | v2 |

### API contract
All three MVP endpoints are secured with bearer token authentication. The context endpoint returns a structured JSON payload: project metadata, all tasks with current status, active estimates, and the work package definition (description, success conditions, verification steps) for any task with In Progress status.

### Out of scope
- MCP server for ToDo (future — would replace REST API calls with a native Claude tool interface)
- Multi-agent session coordination
- External tool integration (GitHub, Jira) via session
- Real-time bi-directional sync (API call model is sufficient for MVP)

### Dependencies
- Projects and tasks must exist (Feature Area 6)
- Task Execution (Feature Area 7) — Claude updates task status via S-E06
- Intake & Inbox Processing (Feature Area 3) — session brain dumps (S-E07) enter through standard intake
- Work Decomposition (Feature Area 4) — work package definitions (success conditions, verification steps) are part of the context payload
- Authentication — API secured with bearer token (infrastructure prerequisite)

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. This is the reason ToDo exists. The differentiator no competitor offers. |
| Usability | No UX risk. Simon does not interact with the API directly — it is a background integration layer. |
| Feasibility | Medium risk. API design must be robust and fast. Incorrect status updates from Claude would corrupt task state. Context payload design needs care — too much data degrades Claude's context window; too little makes the session blind. |
| Viability | No concerns. API cost is minimal at Simon's session volume. |

### AI considerations
- **Auto-updates (S-E06) are trusted.** Session work is authorised. No review gate. Claude's PATCH calls are accepted directly.
- **Brain dumps (S-E07) are not trusted.** They go through the standard Inbox review gate (Feature Area 3). New work requires Simon's approval before entering the active task system.
- **Context accuracy is critical.** Stale or incomplete context misleads Claude and wastes session time. The context endpoint must always return the current state, not a cached snapshot.

### Phase / Status
**MVP** (E05–E07) · **v2** (E08) — **Not started**

---

## Feature Area 9: Personal Groups

### Problem
Simon's personal admin tasks — health appointments, finance reviews, home maintenance, creative projects, life admin — have no home. They do not fit in work project boards, so they end up forgotten, on a separate list that never connects to his working day, or mentally carried without any record. Personal tasks should be first-class citizens: structured, trackable, and eligible to appear in the daily plan alongside project work.

### Who it's for
Simon, managing personal life administration tasks — not work projects, but the things that matter outside projects.

### Desired outcome
Personal tasks live in structured groups, receive the same task management as project tasks, and appear in Simon's daily plan on equal footing with project work. Nothing falls through because it was "personal, not work."

### Success metrics
- Personal tasks appear in Plan My Day alongside project tasks from day one
- Personal tasks visible in All Tasks cross-project view with correct group labelling
- Simon adds, completes, and updates personal tasks with the same speed as project tasks
- At least one personal task appears in Plan My Day in the first week of use

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-M08 | View personal groups — sidebar shows five default groups: Health & Fitness, Finance, Home, Creative, Life Admin; clicking a group shows its tasks | MVP |
| S-M09 | Personal task management — same task patterns as projects: status, estimate, priority; personal tasks appear in All Tasks | MVP |
| S-M10 | Custom personal groups — create new personal group (e.g. Camping 2026) same as project creation with personal type | v2 |

### Out of scope
- Shared personal lists (household sharing)
- Calendar sync specific to personal tasks
- Personal habit or routine tracking
- Personal finance tracking beyond task management

### Dependencies
- Task Execution (Feature Area 7) — same status management patterns
- Daily Planning (Feature Area 5) — personal tasks must be eligible for Plan My Day
- Cross-Project View (Feature Area 10) — personal tasks appear in All Tasks

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. Simon explicitly named personal task invisibility as OPP-06. Personal tasks disappearing from the working day is a direct pain point. |
| Usability | Low risk. Same interaction patterns as project boards — no new learning required. |
| Feasibility | Low risk. Personal groups are structurally identical to projects with a `type: personal` flag. Minimal additional build. |
| Viability | No concerns. |

### AI considerations
None specific to Personal Groups. Personal tasks participate in the same AI features as project tasks — Plan My Day (Feature Area 5) and AI Session Integration (Feature Area 8). No personal-group-specific AI logic.

### Phase / Status
**MVP** (M08–M09) · **v2** (M10) — **Not started**

---

## Feature Area 10: Cross-Project View

### Problem
Simon works across multiple projects and personal groups simultaneously. Getting an accurate view of all tasks in a particular state — especially blocked tasks, overdue tasks, and work currently in progress — requires navigating between individual project boards. There is no single place to see the full picture or triage work across all containers at once.

### Who it's for
Simon, during daily check-ins, weekly reviews, or when triaging blocked work across the full task system.

### Desired outcome
Simon can see every task across all containers in one view, filter to what matters, and act on it without navigating between projects. The Blocked filter, in particular, is available in one click from the Today screen.

### Success metrics
- All Tasks loads within 1 second
- Blocked filter shows all blocked tasks across all containers accurately
- Filter state persists for the duration of a session
- Clicking a task from All Tasks navigates directly to the correct project and task in one action

### Capabilities
| Story | Description | Phase |
|---|---|---|
| S-M11 | View all tasks — all tasks across all projects and personal groups, grouped by project with collapsible groups and task counts | v1 |
| S-M12 | Filter chips — All / Today / Overdue / Blocked / In Progress; active chip highlighted; list filters to matching tasks across all containers | v1 |
| S-M13 | Advanced filter, group, and sort — filter by container, status, type, tag, date range; group by project, status, or due date; sort by priority, due date, recently updated | v2 |

### Out of scope
- Cross-project bulk editing
- Cross-project dependency mapping
- Reporting and analytics (see Feature Area 11)
- Shared or exported task lists

### Dependencies
- Project Management (Feature Area 6) — tasks exist within projects
- Personal Groups (Feature Area 9) — personal tasks included in All Tasks
- Task Execution (Feature Area 7) — status data feeds filter logic
- Daily Orientation (Feature Area 1) — Blocked count on Today screen links directly to the Blocked filter here

### Product risks
| Risk | Assessment |
|---|---|
| Value | Medium confidence. All Tasks is useful but not blocking MVP. v1 placement is appropriate — Simon can work across projects from individual boards until this is built. |
| Usability | Low risk. Filter chips are a familiar and low-friction pattern. |
| Feasibility | Low risk. Cross-container query with filter logic is straightforward. |
| Viability | No concerns. |

### AI considerations
None in v1. Future consideration: AI-generated triage recommendations from All Tasks — "three tasks are blocked across two projects and share the same dependency."

### Phase / Status
**v1** (M11–M12) · **v2** (M13) — **Not started**

---

## Feature Area 11: Metrics & Reporting

### Problem
Simon has no visibility into how he is actually working. He does not know whether his daily plans are realistic, whether projects are tracking to deadlines, how often he over-commits, or what contribution AI sessions are making to throughput. Without this data, planning decisions are based on feeling rather than evidence. The tools he uses (Trello, manual tracking) produce no metrics at all.

### Who it's for
Simon, during weekly reviews and project planning decisions. Also used when deciding whether to adjust scope, timelines, or capacity.

### Desired outcome
Simon can see project health, personal productivity trends, capacity utilisation patterns, and AI session contribution in one place — and use that data to make better decisions. At least one planning decision per week is informed by a metric rather than a feeling.

### Success metrics
- Project health dashboard shows completion %, velocity, and deadline forecast per project
- Weekly personal stats show planned vs completed, carry-over rate, and over-commitment frequency
- AI session contribution visible: tasks completed by Claude vs manually, per project and per week
- Simon references a metric when adjusting scope or timeline at least once in the first month of use

### Capabilities (v1 unless noted)
| Metric | Description | Phase |
|---|---|---|
| Project completion % | Tasks done vs total per project | v1 |
| On-track / at-risk / overdue | Deadline status per project based on current velocity | v1 |
| Blocked count per project | Active blockers affecting project throughput | v1 |
| Deadline forecast | At current velocity, projected completion date per project | v1 |
| Daily planned vs completed | How many tasks Simon planned vs how many he completed | v1 |
| Carry-over rate | What % of tasks moved to the next day over rolling 7 and 30 days | v1 |
| Over-commitment frequency | How often committed hours exceeded available hours | v1 |
| Capacity utilisation | Committed vs available hours across weeks | v1 |
| AI session contribution | Tasks completed by Claude vs manually; session velocity; most AI-assisted projects | v1 |
| Timeline tracking | Per-project deadline dashboard: on track / at risk / overdue | v1 |
| Trend views | Rolling 7-day and 30-day across all the above | v1 |
| Custom metric views | User-defined metrics and filters | v2 |
| AI insight summary | AI-generated weekly insight: "you over-committed 3 times this week; Project X is at risk" | v2 |

### Out of scope
- Team metrics (single user only in v1)
- Billable hours tracking
- External reporting or data export
- Real-time analytics (weekly summary cadence is sufficient for v1)
- Integration with external analytics tools

### Dependencies
- All other feature areas contribute data — Metrics is downstream of everything
- AI Session Integration (Feature Area 8) — session-level data enables AI contribution metrics unavailable to any competitor
- Task Execution (Feature Area 7) — completion and blocked data
- Daily Planning (Feature Area 5) — planned vs committed data
- Settings (Feature Area 12) — available hours data for capacity calculations

### Product risks
| Risk | Assessment |
|---|---|
| Value | High confidence. Over-commitment frequency alone is a metric no other personal task tool currently shows. AI session contribution data is uniquely available to ToDo. |
| Usability | Medium risk. Metrics dashboards must be fast to read — if they require interpretation, they will not be used. A weekly digest format (email or notification, Reclaim-style) may deliver more value than a live dashboard screen for solo use. |
| Feasibility | Medium risk. Requires data to accumulate before metrics are meaningful. Day-one value is low — design must communicate "this gets better as you use it" to avoid first-week disappointment. |
| Viability | No concerns. |

### AI considerations
No AI in v1 metrics — raw data only, clearly presented.

Future (v2): AI-generated weekly insight summary reading across all metric sources to surface non-obvious patterns (e.g. "Project X has been 40% blocked for two weeks — consider addressing the dependency before the next sprint").

### Phase / Status
**v1** (all metrics above) · **v2** (custom views, AI insight summary) — **Not started**

---

## Feature Area 12: Settings & Configuration

### Problem
The app requires user-specific configuration to deliver its core value. Available hours per day is the input that powers over-commitment warnings and Plan My Day capacity calculations. Without it, key features degrade. Google Calendar OAuth unlocks the full capacity picture. These settings need to be set once and persist reliably.

### Who it's for
Simon, during initial setup and whenever preferences change.

### Desired outcome
All configuration is set once during onboarding and persists. The MVP delivers full core value with manual available hours input only. Full calendar integration is one OAuth connection away when Simon is ready.

### Success metrics
- Available hours setting persists and feeds Daily Orientation within 1 second of saving
- Google Calendar OAuth connects in under 2 minutes with no technical friction
- All preferences persist across sessions and devices
- Onboarding (first-time setup) can be completed in under 5 minutes

### Capabilities
| Setting | Description | Phase |
|---|---|---|
| Available hours per day | Manual input: how many hours Simon has available for task work today | MVP |
| Day reset time | What time the Today screen resets and carry-over prompt fires | MVP |
| Google Calendar OAuth | Connect Google Calendar; replaces manual hours with calculated available time | v1 |
| Notification preferences | Carry-over prompt timing, daily plan reminder, blocked task alerts | v1 |
| Theme / display preferences | Light/dark mode, density settings | v2 |

### Out of scope
- Team or multi-user configuration
- Data export
- Account creation — handled entirely via Google SSO (infrastructure prerequisite)
- Billing or subscription management

### Dependencies
- Google SSO — authentication prerequisite (PRE-1)
- Daily Orientation (Feature Area 1) — available hours feeds stats bar and over-commitment warning
- Daily Planning (Feature Area 5) — available hours feeds Plan My Day capacity calculation

### Product risks
| Risk | Assessment |
|---|---|
| Value | Table stakes. Every app has settings. The key is that the available hours input is surfaced prominently during onboarding — it unlocks over-commitment warnings immediately. |
| Usability | Low risk. Minimal settings, clear labels. Onboarding flow should surface the two MVP settings (available hours, day reset time) immediately. |
| Feasibility | Manual hours input is trivial. Google Calendar OAuth is a well-understood pattern already implemented in other SS42 projects. |
| Viability | No concerns. |

### AI considerations
None.

### Phase / Status
**MVP** (available hours, day reset time) · **v1** (Calendar OAuth, notifications) · **v2** (theme/display) — **Not started**

---

## Traceability

| Story prefix | Feature area |
|---|---|
| S-T | Feature Area 1: Daily Orientation |
| S-C | Feature Area 2: Capture |
| S-I | Feature Area 3: Intake & Inbox Processing |
| S-P05–P09, P10–P11 | Feature Area 4: Work Decomposition |
| S-P01–P04 | Feature Area 5: Daily Planning |
| S-M01–M07, S-R01–R04 | Feature Area 6: Project Management |
| S-E01–E04, S-E08 | Feature Area 7: Task Execution |
| S-E05–E07 | Feature Area 8: AI Session Integration |
| S-M08–M10 | Feature Area 9: Personal Groups |
| S-M11–M13 | Feature Area 10: Cross-Project View |
| (no story IDs yet) | Feature Area 11: Metrics & Reporting |
| (no story IDs yet) | Feature Area 12: Settings & Configuration |

Full story-level acceptance criteria (WHEN/THEN/AND) in `todo-story-map.md`.
Full phase and build sequencing in `todo-roadmap.md`.
