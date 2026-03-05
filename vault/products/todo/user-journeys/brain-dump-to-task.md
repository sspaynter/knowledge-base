---
title: Brain Dump to Task
parent: user-journeys
order: 20
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# Brain Dump to Task — User Journey

**Type:** User journey
**Workspace:** Products
**Section:** ToDo / User Journeys
**Covers feature areas:** inbox.md, ai-layer.md, projects.md
**Stories spanned:** S-C01, S-C02, S-C04, S-I01, S-I02, S-I04, S-I07, S-I08, S-I09, S-I10, S-P05, S-P06, S-P07, S-P08
**Opportunities addressed:** OPP-01 (No reliable intake), OPP-04 (Tasks enter without structure), OPP-08 (AI output improves over time)
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude

---

## Journey summary

Simon has a brain dump — a loose idea, a fragment of a plan, or a block of thinking that needs to become structured work. This journey covers the three paths from raw thought to accepted task: Cmd+K quick capture, Slack mobile capture, and Inbox processing with AI refinement and annotation feedback. It ends with the item on a project board as a structured task.

---

## Path A: Cmd+K direct capture (< 30 seconds)

### A1. Trigger quick-add

**Screen / feature area:** Any screen — `inbox.md` (S-C01)
**What happens:** Simon presses Cmd+K from any screen. The command palette opens with a text input in focus.

---

### A2. Type and route

**Screen / feature area:** Command palette — `inbox.md` (S-C02)
**What happens:** Simon types: "Sort out the Knowledge Base nav bar — it breaks on mobile." He presses Tab to open the container selector and selects "Knowledge Base" project. Presses Enter.
**Decision point:**
- Container selected → task created directly in Knowledge Base project with status To-Do. No Inbox.
- No container selected → item routed to Inbox as Raw brain dump (continues to Path C).

*This path (container selected) ends here. The task is on the board.*

---

## Path B: Slack mobile capture → auto-ingest (async)

### B1. Capture from Slack

**Screen / feature area:** Slack → Inbox — `inbox.md` (S-C04)
**What happens:** Simon is away from his desk. He messages the #todo-inbox Slack channel: "Need to spec out the AI layer for ToDo — prompt architecture, feedback_log schema, session endpoints." He does not open ToDo.

---

### B2. Automatic ingest and AI analysis

**Screen / feature area:** Inbox (Raw Capture tab) — `inbox.md`, `ai-layer.md` (S-C04, S-I07)
**What happens:** Within 60 seconds, n8n webhook receives the Slack message, creates a Raw item in the database, and triggers the Claude API analysis. The analysis runs in the background — Simon does not need to be in the app. When Simon next opens Inbox → Raw Capture tab, he sees the item with a Slack source badge, and the AI analysis has already been run. A "Process ✦" button is available, but clicking it will re-run analysis (the item has already been pre-processed). Simon clicks the card to expand it and sees the pending proposed structure.

*Note: the current story definition (S-C04) says AI analysis is auto-triggered on arrival. This means when Simon opens the Raw Capture tab, he may already see processed output rather than needing to click "Process ✦". The story should be checked against this journey gap — see Gaps section.*

---

### B3. Review proposed structure

**Screen / feature area:** Inbox (Pending Review tab) — `inbox.md` (S-I01)
**What happens:** Simon opens Pending Review. The card shows the original Slack message and three proposed tasks: "Write AI layer prompt architecture design", "Design feedback_log schema", "Document Claude session endpoints" — each with a container (AI Layer project) and an estimate. Source badge shows Slack.
**Decision point:**
- If Simon agrees → Accept (Path B ends, tasks created in project).
- If Simon wants to adjust → Edit (continue to B4).
- If Simon disagrees with the whole proposal → Reject (no tasks created, journey ends).

---

### B4. Annotate and refine (optional)

**Screen / feature area:** Inbox (Pending Review) — `inbox.md`, `ai-layer.md` (S-I09, S-I10)
**What happens:** Simon selects the text "Write AI layer prompt architecture design" and clicks Annotate. He types: "Too vague — should be 'Write prompt template for Inbox processing'." He saves the annotation. The text changes colour to show it is annotated. He clicks "Refine ✦". Claude re-runs with the annotation as context. The revised card shows: "Write prompt template for Inbox processing (30 min)", "Design feedback_log schema (45 min)", "Document session integration endpoints (30 min)." Simon accepts.

---

## Path C: Raw brain dump → Inbox processing → Backlog pipeline

### C1. Capture via Cmd+K (no container)

**Screen / feature area:** Any screen → Inbox — `inbox.md` (S-C01, S-C02)
**What happens:** Simon types a long brain dump in Cmd+K without selecting a container: "Been thinking about how the backlog pipeline should work — there are three states but I'm not sure what the gates are between them, and I need to figure out if AI refinement should block promotion or just be a suggestion..." He presses Enter. Item routes to Inbox as Raw.

---

### C2. View in Raw Capture tab

**Screen / feature area:** Inbox (Raw Capture tab) — `inbox.md` (S-I07)
**What happens:** Simon opens Inbox → Raw Capture tab. He sees the brain dump with a Manual source badge and the timestamp. A "Process ✦" button is visible.

---

### C3. Trigger AI processing

**Screen / feature area:** Inbox (Raw Capture tab) — `inbox.md`, `ai-layer.md` (S-I08)
**What happens:** Simon clicks "Process ✦." The three-stage animation plays: Captured → AI reviewing → Structure proposed. After ~5 seconds, the proposed structure is revealed: three proposed tasks for "Projects (Backlog pipeline)" container, with estimates. Accept / Edit / Reject appear.

---

### C4. Accept into Inbox

**Screen / feature area:** Inbox (Pending Review) — `inbox.md` (S-I02)
**What happens:** Simon reviews and accepts. Tasks are created in the "Projects" container with status To-Do. The inbox card is removed.

---

### C5. Move tasks to backlog for refinement

**Screen / feature area:** Projects (Backlog) — `projects.md` (S-P05, S-P06)
**What happens:** The accepted tasks appear in the project with status To-Do (on the board, in Next column). Simon decides the scope is still loose. He goes to the Backlog tab, clicks "Add raw idea to backlog," copies the brain dump text in. The item appears in the Raw column with a "Process ✦" button.

---

### C6. AI refinement in backlog panel

**Screen / feature area:** Projects (Backlog) — `projects.md`, `ai-layer.md` (S-P06, S-P07)
**What happens:** Simon clicks the Raw card. The AI refinement panel slides in with analysis text, proposed task breakdown, dependencies (references the original accepted tasks as potential duplicates), and reuse candidates. Simon annotates the scope description and clicks "Refine ✦". After iteration 2, the analysis is clear. Simon clicks "Approve → Refined." The item moves to the Refine column.

---

### C7. Promote to Ready

**Screen / feature area:** Projects (Backlog) — `projects.md` (S-P08, S-P09)
**What happens:** Simon returns to the item in Refine. The task breakdown is complete and dependencies resolved. He selects P2 priority, clicks "Approve → Ready." The item moves to the Ready column.

---

## Happy path summary (Path B — most common)

1. Simon messages #todo-inbox on Slack (any device)
2. n8n webhook ingests → AI analysis runs automatically in background
3. Simon opens Inbox → Pending Review → Slack-sourced card with proposed structure
4. Simon reviews proposed tasks — annotates one title
5. Clicks "Refine ✦" → revised proposal appears
6. Clicks Accept → tasks created in project
7. Tasks appear in project board (Next column) ready for execution

---

## Failure modes and recovery

| Where | What fails | What Simon sees | Recovery |
|---|---|---|---|
| Path B — Slack ingest | n8n webhook fails | Item not in Inbox | Simon checks n8n logs; raw message still in Slack as fallback record |
| Path B/C — AI analysis | Claude API unavailable | Item stays Raw; "AI analysis failed — retry" shown | Simon clicks retry; if persistent, processes manually via Edit → write own breakdown |
| Path B — Pending Review load | Database query fails | Error state: "Could not load inbox — retry" | Retry button; persistent = check server |
| Path B4 — feedback_log write | DB write fails | Error shown inline: "Annotation could not be saved" | Simon retypes annotation, retries |
| Path B4 — Refine ✦ | Claude API fails on re-run | Error: "Refinement failed — annotation saved, try again" | Retry "Refine ✦"; or Accept the previous iteration |
| Path C — Item accept write | DB write fails | Error: "Could not save tasks — retry or edit" | Card stays in Pending Review; retry button shown |
| Path C — Backlog promotion | Status update fails | Error toast: card stays in source column | Retry drag or panel action |
| Network lost | Complete connectivity | Toast: "No connection — changes sync when reconnected" | Queue pending writes until reconnect |

---

## Gaps identified

1. **Auto-ingest timing ambiguity (S-C04 / S-I07):** The current story says AI analysis is "auto-triggered on arrival." But S-I07 and S-I08 describe a "Process ✦" button for manual trigger. The flow needs clarification: does auto-ingest move the item directly to Pending Review (with AI analysis already run), or does it appear in Raw Capture with the analysis pre-run but requiring "Process ✦" to reveal? Recommend: auto-ingest puts items directly in Pending Review with proposed structure already populated. Raw Capture tab is for items that arrived without auto-analysis (manually via Cmd+K without container). **Action: update S-C04 and S-I07 story definitions to make this explicit.**

2. **Duplicate detection gap:** When Path C results in accepted Inbox tasks that then go into the Backlog as a new item (steps C4 → C5), there is a risk of duplication — tasks on the board AND a backlog item covering the same scope. The reuse candidates feature (S-P06) surfaces this, but the flow is not explicitly stated. The builder needs guidance on when to surface reuse candidates. **Action: add a reuse candidate trigger condition to S-P06 AC: "if any accepted tasks in the project share significant text overlap with the backlog item, they must appear as reuse candidates."**

3. **Backlog item creation from board:** Path C assumes Simon manually creates a backlog item after accepting Inbox tasks. There is no automated "this Inbox item should go to backlog" flow. If Simon wants refinement, he has to create a duplicate backlog entry. This is a known design gap — acceptable for v1 because the two flows (Inbox review and Backlog refinement) are deliberately separate gates. Flag for v2.
