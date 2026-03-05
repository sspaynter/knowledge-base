---
title: Inbox
parent: feature-areas
order: 20
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# Inbox — Feature Area Spec

**Type:** Feature area specification
**Workspace:** Products
**Section:** ToDo / Feature Areas
**Stories:** S-C01–C05 (v1 capture), S-I01–I11 (v1 intake), S-C06, S-I06, S-I12 (v2)
**Opportunities addressed:** OPP-01 (No reliable intake), OPP-04 (Tasks enter without structure), OPP-08 (partial — annotation mechanic)
**Status:** Gate 3 prototype complete — ready for Gate 4 build
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude
**Prototype:** `todo/docs/mockups/todo-prototype-v1.html` → Inbox screen

---

## What this feature area does

Inbox is the processing gate between raw brain dumps and the structured task system. It answers the question: **"What came in, and has it been turned into something usable?"**

Nothing enters the main task system without Simon's review. Inbox surfaces AI-proposed structure and gives Simon three choices: accept, edit, or reject. Raw items that have not been processed yet live in a separate tab. The inline annotation mechanic (documented in full in `ai-layer.md`) is available on every AI-proposed output in the Inbox.

Inbox does NOT manage task execution, project organisation, or daily prioritisation — those are Today and Projects.

---

## Problems it addresses

| Opportunity | Failure point | What Inbox solves |
|---|---|---|
| OPP-01 | #1 — No structured intake | Brain dumps from any channel land in Inbox as the single processing queue. Nothing is lost or bypassed. |
| OPP-01 | #4 — Capture to task takes too long | AI processes raw text into proposed structure before Simon reviews. Review is a 3-click decision, not a rebuild from scratch. |
| OPP-04 | #4 — Items enter without structure | AI proposes container, title, and estimate. Simon approves the structure before anything enters the system. |
| OPP-08 | #8 — AI does not improve over time | Inline annotation of AI proposals creates feedback_log entries that improve future output. |

**Success measurement:**
- OPP-01: Time from capture (any channel) to accepted task is under 5 minutes. Zero items lost between channels.
- OPP-04: Every item that enters the main system via Inbox has a container, an actionable title, and an estimate.
- OPP-08: After 3 months, AI-proposed structures require fewer annotation edits than at launch (annotation-to-acceptance rate improves quarter over quarter).

---

## v1 stories and acceptance criteria

### S-C01 — Command palette (Cmd+K)

WHEN Simon presses Cmd+K from any screen
THEN a command palette overlay opens with a text input in focus
AND Simon can type a task title or brain dump of any length
AND pressing Tab switches focus to a container selector dropdown
AND pressing Enter saves the item and closes the palette

---

### S-C02 — Brain dump routing

WHEN Simon saves a quick-add item without selecting a container
THEN the item is routed to Inbox as a pending brain dump with status Raw
AND the source badge is set to Manual
WHEN Simon saves a quick-add item with a container selected
THEN the item is created directly in that container with status To-Do
AND no Inbox review is required

---

### S-C04 — Slack auto-ingest

**Flow (confirmed 2026-03-04):**
All items follow the same three-step flow regardless of source:
1. **Raw Capture** — item lands here first, source badge set to Slack
2. **AI runs** — analysis triggers automatically on arrival (no "Process ✦" required for Slack items)
3. **Pending Review** — once AI completes, item moves here for Simon's accept/edit/reject decision

WHEN Simon sends any message to the designated Slack capture channel
THEN the message is automatically ingested into Inbox within 60 seconds
AND the item appears in Raw Capture with source badge: Slack and status: Processing
AND AI analysis triggers automatically without any manual action
AND once AI analysis completes, the item moves to the Pending Review tab as an inbox card

**Implementation note — Slack integration method TBD:**
The specific Slack integration approach (channel structure, n8n webhook vs Slack app, bot vs direct message) requires research before implementation. The confirmed behaviour above is the spec; the plumbing is deferred until Simon has evaluated Slack usage patterns. Do not implement S-C04 until the integration method is decided.

**AI risk assessment (Cagan four risks):**
- **Feasibility:** n8n webhook is already in use (Applyr pattern). Slack message body is unstructured text — Claude parses it. Risk: Slack message may include noise (emoji, @mentions, URLs) that confuses parsing. Mitigation: strip Slack formatting before sending to Claude API.
- **Usability:** Auto-ingest requires no action from Simon — just the Slack message. Source badge makes the origin traceable.
- **Value:** Slack is Simon's mobile-friendly capture channel. Removing the routing friction is the point.
- **Viability:** Message content is sent to Claude API for parsing. No external data exposure beyond what is already in Slack. Standard SS42 privacy posture.

**Fallback:** If the Slack ingest or Claude API fails, the raw message is saved to the database with status Raw and source badge Slack. A system alert is logged. The item appears in Raw Capture with a "AI analysis failed — retry" button. Simon can manually trigger processing from there.

**AC for non-deterministic output (auto-ingest AI analysis):**
The AI analysis shall propose a container from the user's existing containers (never an invented one).
The proposed task breakdown shall contain between 1 and 5 tasks (never empty, never a comprehensive project plan).
Each proposed task shall include an estimated duration in minutes.
Simon can edit all proposed values before accepting — no value is locked.
Fallback: if AI returns no valid analysis, the item remains in Raw Capture with a visible "AI analysis failed — process manually" label and a retry button.

---

### S-C05 — Mobile capture

WHEN Simon captures a task or brain dump from a mobile device (via Slack or mobile web)
THEN it arrives in Inbox with source badge: Mobile
AND the capture channel is stored in item metadata

*Note: Mobile web browser is not supported in v1 (minimum 1280px desktop). Mobile capture is Slack-first — items arrive via the Slack auto-ingest channel (S-C04). The Mobile source badge distinguishes items that Simon marked as coming from a mobile context.*

---

### S-I01 — View proposed structure (Pending Review)

WHEN a brain dump has been processed by Claude
THEN the item appears in the Pending Review tab as an inbox card
AND the card shows: original raw text, the proposed container, and the proposed task breakdown (one row per task)
AND a source badge is shown: Claude / Mobile / Manual / Slack
AND Accept / Edit / Reject actions are available on each card

---

### S-I02 — Accept intake item

WHEN Simon clicks Accept on an inbox card
THEN all proposed tasks are created in the specified container with status To-Do
AND the inbox entry is removed from the Pending Review list
AND an activity log entry records: accepted, source, item count, container

**Fallback:** If the database write fails, the inbox card remains in Pending Review with an error state: "Could not save tasks — retry or edit." The card is not removed until the write succeeds.

---

### S-I03 — Reject intake item

WHEN Simon clicks Reject on an inbox card
THEN the inbox entry is removed from the Pending Review list
AND no items are created in any container
AND the rejection is recorded in the activity log

---

### S-I04 — Edit before accepting

WHEN Simon clicks Edit on an inbox card
THEN the proposed structure becomes editable inline
AND Simon can modify: container (dropdown from existing containers), task titles (text input), estimates (number input)
AND clicking Accept saves the edited version and closes the edit state
AND clicking Cancel returns to the original proposed structure without changes

---

### S-I05 — Bulk actions

WHEN Simon has two or more items in Pending Review
THEN an "Accept all" and "Reject all" button appear above the card list
AND clicking "Accept all" accepts every card in sequence and clears the list
AND clicking "Reject all" removes all cards and logs each rejection
AND if any individual Accept write fails during bulk Accept, the failed card remains with an error state; the others complete normally

---

### S-I07 — View raw items

WHEN Simon opens the Raw Capture tab
THEN all unprocessed raw items are listed in reverse chronological order
AND each item shows: source badge, raw text (truncated to 2 lines with expand), timestamp
AND each item has a "Process ✦" button
AND the tab badge shows the count of unprocessed items

---

### S-I08 — Process a raw item

WHEN Simon clicks "Process ✦" on a raw item
THEN the item card enters a processing state
AND three stage indicators animate sequentially: Captured → AI reviewing → Structure proposed
AND the processing completes within 10 seconds under normal conditions
AND after completion, the proposed structure is revealed on the same card
AND Accept / Edit / Reject actions appear

**AI risk assessment (Cagan four risks):**
- **Feasibility:** Claude API call with the raw text and available containers as context. Processing within 10 seconds is feasible for typical brain dump lengths (under 500 words). Risk: long brain dumps may exceed typical latency. Mitigation: show processing state indicator; cap input at 1000 words with a visible character count.
- **Usability:** The three-stage animation makes the 2–10 second wait legible. Simon sees progress, not a spinner.
- **Value:** The alternative is Simon manually structuring each raw item — the point of this feature is to do that work for him.
- **Viability:** Raw text is sent to Claude API. Standard SS42 API posture.

**AC for non-deterministic output:**
The proposed structure shall contain between 1 and 5 tasks (never empty).
Each task shall include a title (at least 3 words) and an estimated duration in minutes.
The proposed container shall be selected from existing containers — never invented.
Simon can override any proposed value before accepting.
Fallback: if the Claude API call fails or times out after 15 seconds, the processing state resets, the card returns to raw state, and a visible error is shown: "AI analysis failed — tap to retry." A retry button is shown inline on the card.

---

### S-I09 — Highlight and annotate (Inbox surface)

*Documented in full in `ai-layer.md`. Summary for Inbox context:*

WHEN Simon selects text within an AI-proposed output on any Inbox card (Pending Review or Raw Capture tab)
THEN an "Annotate" tooltip appears
AND clicking Annotate inserts a comment input below the highlighted text
AND Simon can type targeted feedback about that specific section

---

### S-I10 — Save annotation (Inbox surface)

WHEN Simon saves an annotation on an Inbox card
THEN the highlighted text changes colour to show it is annotated
AND the annotation is stored in feedback_log with the inbox item reference
AND if Simon then clicks "Refine ✦", the annotation is sent as context in the next AI call
AND the revised proposal replaces the previous one on the same card

**Fallback:** If the feedback_log write fails, the annotation is not saved and a visible error is shown: "Annotation could not be saved — your feedback was not recorded." Simon can retype the annotation.

---

### S-I11 — Cancel annotation (Inbox surface)

WHEN Simon cancels an annotation before saving
THEN the highlight is removed and the text returns to normal
AND no entry is written to feedback_log

---

## AI features — risk assessment summary

All AI features in Inbox use the same underlying Claude API call pattern. Key shared risks:

| Risk | Mitigation |
|---|---|
| API latency | Processing state indicator shown within 200ms of click. 15-second timeout with visible retry. |
| API unavailable | Item remains in Raw state. Error shown with retry button. No data loss. |
| Hallucinated container | Container selection constrained to existing containers list passed in API context. |
| Empty output | AC: minimum 1 task. Fallback shown if API returns nothing. |

---

## Screen states

| State | Trigger | What Simon sees |
|---|---|---|
| Pending Review — normal | Items awaiting review | Card list with source badges, proposed structure, Accept/Edit/Reject |
| Pending Review — empty | All items processed | Inbox zero state: "Nothing pending — you are clear." (v2: animated confirmation — S-I06) |
| Pending Review — bulk available | 2+ cards present | "Accept all" / "Reject all" buttons above card list |
| Raw Capture — normal | Unprocessed items present | Reverse-chronological list with "Process ✦" per item |
| Raw Capture — empty | No raw items | "No raw items" placeholder — captures arrive here from Slack / Cmd+K |
| Processing | "Process ✦" clicked | Three-stage animation on the card: Captured → AI reviewing → Structure proposed |
| Edit mode | "Edit" clicked on card | Card fields become editable inline — container dropdown, task title inputs, estimate inputs |
| Error — save failed | Database write fails on Accept | Card stays in list with error banner: "Could not save tasks — retry or edit" + retry button |
| Error — AI failed | API timeout or error during processing | Card resets to Raw state: "AI analysis failed — tap to retry" + retry button |
| Error — network | No connectivity | Toast: "No connection — changes will sync when reconnected." Raw items are held locally until sync. |
| Loading | Initial page load | Skeleton loaders for card list |

---

## Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Two tabs (Pending Review / Raw Capture) | Separate concerns | Pending items (AI-processed, awaiting decision) and Raw items (not yet processed) require different UI and actions |
| Nothing enters the system without review | Hard gate for all Inbox-sourced items | OPP-04 — vague items should not accumulate in the main system |
| All items land in Raw Capture first | Universal entry point regardless of source | Consistent flow: Raw Capture → AI → Pending Review. Slack auto-triggers AI (no "Process ✦" needed) but still passes through Raw Capture briefly before moving to Pending Review. |
| Inline editing on cards | Edit happens on the card, not a modal | Keeps context visible during editing — Simon can see original text alongside proposed edits |
| Annotation triggers re-run on "Refine ✦" | Not applied to the same output | Annotation without re-run would be noise; annotation + re-run is a learning loop |
| Bulk actions available at 2+ cards | Threshold for bulk UX | Below 2, individual actions are faster; above 2, bulk becomes valuable |

---

## Non-functional requirements

| Requirement | Target | Notes |
|---|---|---|
| Page load | < 2 seconds | Initial card list load including skeleton state |
| AI processing latency | < 10 seconds (p90) | 15-second timeout before showing retry state |
| Slack webhook ingest lag | < 60 seconds | n8n trigger → item visible in Raw Capture tab |
| Accessibility | WCAG 2.1 AA — not targeted v1 | Single-user personal tool. Revisit if multi-user. |
| Mobile/responsive | Not supported v1 | Minimum 1280px desktop. Slack is the mobile capture path. |

---

## Prototype reference

**Screen:** Inbox
**File:** `todo/docs/mockups/todo-prototype-v1.html`
**Select:** Proto bar dropdown → Inbox

**Key interactions to verify in prototype:**
- Pending Review tab shows cards with source badges and Accept/Edit/Reject actions
- Click "Edit" → card fields go editable inline
- Click "Accept" → card removes from list
- Switch to Raw Capture tab → raw items with "Process ✦" button
- Click "Process ✦" → three-stage animation → proposed structure revealed
- Raw Channel demo modal (Slack demo)

---

## v2 backlog (this feature area)

| Story | Description |
|---|---|
| S-C03 | Global search via Cmd+K — search existing tasks, projects, items from the command palette |
| S-C06 | Email capture — forward an email to a capture address, content ingested as brain dump in Inbox |
| S-I06 | Inbox zero state — animated confirmation when all pending items are processed |
| S-I12 | Annotation history panel — view previous annotations with timestamps and the revisions they triggered |
