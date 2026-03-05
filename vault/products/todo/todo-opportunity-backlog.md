---
title: Opportunity Backlog
parent: product-definition
order: 10
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# ToDo — Opportunity Backlog

**Type:** Product artefact — Opportunity Backlog
**Workspace:** Products
**Section:** ToDo
**Framework:** SVPG / Marty Cagan — Opportunity Backlog (above the story backlog)
**Status:** v1 baseline — Gate 3 complete
**Created:** 2026-03-04 (session 36)
**Author:** Simon Paynter + Claude

---

## What this document is

The Opportunity Backlog sits above the User Story Map. Where the story map answers "what do we build?", the opportunity backlog answers "what problems are worth solving and how will we know we solved them?"

Each entry frames a problem — not a feature. The features and stories in the story map are the *current best answer* to each opportunity. If a better answer emerges (through usage, feedback, or new capability), the opportunity entry stays the same; the solutions change.

Format per entry:
- **Problem** — what is happening now that should not be, or what is not happening that should
- **Who** — whose experience is affected
- **Success signal** — how we will know the opportunity is addressed
- **Current best answer** — the v1 solution that addresses this opportunity (links to story map)
- **Priority** — P1 (blocking value delivery), P2 (significant improvement), P3 (meaningful but deferrable)

---

## Priority 1 — Blocking value delivery

These are the core problems ToDo exists to solve. If these are not addressed, the product has not succeeded.

---

**OPP-01 — No reliable intake for ideas and work**

**Problem:** Ideas, brain dumps, and work items have no consistent landing place that processes them into actionable tasks. Raw thoughts sit unprocessed or are lost entirely. The cognitive overhead of turning a brain dump into a structured task is high enough that it often does not happen.

**Who:** Simon, in every context — at his desk, on his phone, mid-Claude-session.

**Success signal:** All brain dumps captured in any channel (Slack, web, Claude session) appear in Inbox. The time from capture to structured, accepted task is under 5 minutes. Zero items are lost.

**Current best answer:** Inbox (Pending Review + Raw Capture tabs) + Slack webhook auto-ingest + Cmd+K quick-add. Stories: S-C01–C05, S-I01–I11.

**Priority:** P1

---

**OPP-02 — Today is never realistic**

**Problem:** Simon consistently overcommits because there is no mechanism to compare task time against actually available calendar time. He cannot see "I have 3h free — what tasks fit?" The result is Today always being too full, always incomplete, always a source of frustration.

**Who:** Simon, every working day.

**Success signal:** On any given day, Simon's committed task load is within 15 minutes of his available time. Over-commitment warnings are seen and acted on before the day starts, not discovered at the end.

**Current best answer:** Today stats bar (committed vs available), over-commitment warning, Plan My Day AI panel. Stories: S-T01–T03, S-P01–P03.

**Priority:** P1

---

**OPP-03 — No project-level context when starting work**

**Problem:** When Claude begins a session on a project, it starts without knowing current state — what is done, what is in progress, what is blocked. Simon manually briefs Claude every session. Context is reconstructed from conversation history, not a reliable source of truth.

**Who:** Simon, every Claude session on any project.

**Success signal:** At the start of every Claude session, Claude has accurate project state without any manual briefing from Simon. Zero sessions where work is duplicated because Claude did not know it was done.

**Current best answer:** Claude active session integration (`GET /api/v1/claude/context`). Stories: S-E05–E07.

**Priority:** P1

---

**OPP-04 — Tasks enter the system without structure or outcome connection**

**Problem:** Items created without AI review are raw text — no container, no outcome connection, no estimate, no dependencies considered. Over time the system fills with items that are too large, too vague, or disconnected from anything meaningful.

**Who:** Simon, accumulating over weeks and months.

**Success signal:** Every item that enters the main system (outside of session auto-tracking) has: a container, a title that is actionable, and an estimate. Vague items route to Inbox for AI processing, not directly to a project.

**Current best answer:** Two-track intake: Inbox (AI-processed, reviewed before acceptance) and project Backlog AI refinement (Raw → Refined → Ready). Stories: S-I01–I11, S-P05–P09.

**Priority:** P1

---

## Priority 2 — Significant improvement

These problems are real and impactful but do not block the core value of the product.

---

**OPP-05 — No way to quickly understand where a project stands**

**Problem:** Getting a sense of project health requires manually scanning through all tasks and mentally calculating progress. Simon cannot open a project and immediately understand what is done, what is in progress, and what is next.

**Who:** Simon, when switching between projects or preparing for a planning session.

**Success signal:** Simon can answer "where is this project at?" within 10 seconds of opening it, without reading individual task descriptions.

**Current best answer (v1):** Project header with progress bar, status chip, and outcome statement. Stories: S-R01–R02.
**Full answer (v2):** AI-generated project summary on demand. Story: S-R03.

**Priority:** P2

---

**OPP-06 — Personal admin tasks have no visibility**

**Problem:** Personal admin tasks (finance, home, health) get buried under technical work and deprioritised by default. There is no dedicated space for life tasks that is visible and treated with the same seriousness as project work.

**Who:** Simon, every week when bills, forms, and life logistics are missed.

**Success signal:** Personal tasks surface in Today with the same treatment as project tasks. Admin tasks are not routinely missed.

**Current best answer:** Personal groups (5 default groups with full task management). Stories: S-M08–M09.

**Priority:** P2

---

**OPP-07 — No single view across all work**

**Problem:** When Simon wants to see everything — not filtered by project — there is no clean way to do that. He cannot ask "what is blocked right now across everything?" or "what has a due date this week?"

**Who:** Simon, during weekly reviews or when feeling overwhelmed.

**Success signal:** Any cross-project question (what is blocked, what is due this week, what is in progress) can be answered in under 30 seconds from All Tasks.

**Current best answer:** All Tasks with filter chips and collapsible project groups. Stories: S-M11–M12.
**Full answer (v2):** Advanced filter and group options (by container, status, type, tag, date). Story: S-M13.

**Priority:** P2

---

**OPP-08 — AI output does not improve over time**

**Problem:** Every AI-proposed structure Claude returns is generated without any feedback from previous interactions. If Claude consistently misidentifies containers, proposes too many tasks, or misunderstands scope — there is no mechanism for that pattern to improve.

**Who:** Simon, experiencing gradually increasing trust in AI-proposed structures over months.

**Success signal:** After 3 months of use, AI-proposed structures require fewer edits than on day one. Annotation-to-acceptance rate improves quarter over quarter.

**Current best answer:** Inline annotation mechanic (highlight → annotate → feedback_log) across Inbox and Backlog AI panel. Stories: S-I09–I11.
**Full answer (v2):** Feedback log is actively used to tune AI prompts or model behaviour. Visible iteration quality improvement.

**Priority:** P2

---

## Priority 3 — Meaningful but deferrable

These problems matter but have acceptable workarounds in v1.

---

**OPP-09 — Calendar is a separate system**

**Problem:** There is no link between what Simon intends to do and when he has time to do it. Time-blocking a task requires switching to Google Calendar manually.

**Who:** Simon, when trying to make a realistic daily plan.

**Success signal:** Simon can see his calendar availability within Today and block time for specific tasks without leaving ToDo.

**Current best answer (v1):** Available hours shown in stats bar (derived from calendar). No per-task time blocking in v1.
**Full answer (v2):** Visual calendar strip, per-task time blocking to Google Calendar. Stories: S-T04, S-T09.

**Priority:** P3

---

**OPP-10 — Project priorities do not cascade to task surfacing**

**Problem:** Simon cannot set "this project is the priority this week" and have that priority cascade down to surface its tasks in Plan My Day, Today, and All Tasks. Everything is flat.

**Who:** Simon, when trying to focus on one project over others.

**Success signal:** Changing a project's priority reorders its tasks in Plan My Day suggestions and All Tasks without any manual task reordering.

**Current best answer (v1):** Plan My Day uses project metadata in its ranking. No explicit drag-to-reorder of projects in v1.
**Full answer (v2):** Project priority drag-to-reorder with cascading to task surfacing. Story: S-M06.

**Priority:** P3

---

## Traceability to failure points

The 12 failure points from the problem statement map to opportunities as follows:

| Failure point | Opportunity |
|---|---|
| 1. No structured intake | OPP-01 |
| 2. Today is never realistic | OPP-02 |
| 3. No calendar integration | OPP-09 |
| 4. Volume without intelligence | OPP-04 |
| 5. No project-level focus | OPP-07 |
| 6. Claude work has no persistent state | OPP-03 |
| 7. Admin is the most vulnerable category | OPP-06 |
| 8. No project status at a glance | OPP-05 |
| 9. No AI-generated summaries | OPP-05 (v2 surface) |
| 10. No project-level prioritisation | OPP-10 |
| 11. No outcome tracking or refinement | OPP-04 (outcome connection) |
| 12. System abandonment is the failure mode | Addressed by OPP-01 through OPP-04 collectively |
