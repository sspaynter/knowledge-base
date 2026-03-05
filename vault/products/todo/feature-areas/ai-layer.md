---
title: AI Layer
parent: feature-areas
order: 60
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# AI Layer — Feature Area Spec

**Type:** Feature area specification
**Workspace:** Products
**Section:** ToDo / Feature Areas
**Stories:** S-C01–C05 (v1 capture routing), S-E05–E07 (v1 Claude session integration), S-I09–I11 (v1 annotation mechanic), S-E08 (v2)
**Opportunities addressed:** OPP-01 (reliable intake), OPP-03 (Claude session context), OPP-04 (tasks enter with structure), OPP-08 (AI improves over time)
**Status:** Gate 3 prototype complete — ready for Gate 4 build
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude
**Prototype:** N/A — AI layer is infrastructure, not a user-facing screen

---

## What this feature area does

The AI Layer is not a screen — it is the shared intelligence infrastructure that powers Inbox processing, Backlog refinement, Plan My Day, and Claude session integration.

This document covers three distinct sub-systems:

1. **Prompt architecture** — how the Claude API is called consistently across all AI features, including context passed, output format constraints, and error posture
2. **Feedback loop (feedback_log + inline annotation)** — the shared mechanic for Simon to annotate AI output and drive iterative improvement
3. **Claude session integration** — the API endpoints (`/api/v1/claude/*`) that allow Claude Code to read and write ToDo during active work sessions

Each sub-system has its own stories, ACs, and risk profile.

The inline annotation mechanic (S-I09–I11) is documented here as the canonical source. The surface-level descriptions in `inbox.md` and `projects.md` reference this document.

---

## Problems it addresses

| Opportunity | Failure point | What the AI layer solves |
|---|---|---|
| OPP-01 | #1 — No structured intake | Prompt architecture ensures raw text is converted to structured proposals consistently, regardless of capture channel |
| OPP-03 | #6 — Claude starts sessions without context | Session integration endpoints give Claude accurate project state without Simon manually briefing it |
| OPP-04 | #4 — Volume without intelligence | AI processes all intake before it reaches the task system. Structure is proposed, not invented by Simon each time. |
| OPP-08 | #12 — AI does not improve | feedback_log records every annotation. Annotations are passed as context to subsequent AI calls, improving output over time. |

**Success measurement:**
- OPP-03: Zero sessions where Claude duplicates work because it did not know it was done. Measured by: reviewing session logs weekly for duplication events.
- OPP-08: After 3 months, annotation-to-acceptance rate improves quarter over quarter. (Tracked via feedback_log metrics — annotation count vs. accepted proposals per month.)

---

## Sub-system 1: Prompt architecture

### Design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Single Claude API client | Shared service module | All AI calls go through one module — context building, error handling, and logging are consistent |
| Model | claude-sonnet-4-6 | Best balance of quality and speed for interactive features. Not Haiku (output quality too variable for task structuring). Not Opus (latency too high for interactive use). |
| Context passed per call | Container list + item text + (for backlog) active project tasks | Constraining container selection to existing containers prevents hallucinated container names |
| Output format | Structured JSON, validated before use | Prevents partially-valid responses from reaching the UI |
| Timeout | 15 seconds per call | Beyond 15 seconds, the UI shows fallback state. The call is cancelled server-side. |
| Retry policy | No automatic retry | Simon sees the error and clicks retry. Automatic retry on AI calls risks double-posting or confusing state. |
| Temperature | 0.3 (low variance) | Task structuring requires consistency, not creativity. Low temperature produces stable, predictable outputs. |
| System prompt location | Server-side only | Never sent to the client. Prompt is not exposed in browser DevTools. |

### System prompt structure (all features)

Each Claude API call includes:

1. **Role definition** — "You are a task structuring assistant for a personal productivity system. You help convert raw thoughts into structured, actionable tasks."
2. **Context block** — current containers (name + type), current project tasks (for reuse detection), available time (for Plan My Day)
3. **Constraints** — output format specification (JSON schema), container selection constraint, task count bounds, estimate format
4. **Feedback context** — any feedback_log entries for this item (annotations from previous iterations)
5. **Task** — the specific action for this call (process intake / refine backlog item / generate daily plan)

---

## Sub-system 2: Feedback loop (feedback_log + inline annotation)

### S-I09 — Highlight and annotate

*This story applies in all contexts where AI output is shown: Inbox cards, Backlog refinement panel.*

WHEN Simon selects text within an AI-proposed output (any surface)
THEN an "Annotate" tooltip appears near the selected text
AND clicking Annotate inserts a comment input below the highlighted text (inline, not a modal)
AND the highlighted text range is preserved visually (coloured highlight)
AND the comment input accepts free text
AND pressing Enter or clicking "Save annotation" saves the annotation
AND pressing Escape or clicking "Cancel" cancels without saving

---

### S-I10 — Save annotation

WHEN Simon saves an annotation
THEN the highlighted text segment changes to an annotated colour (distinct from base text and unrelated highlights)
AND the annotation is stored in feedback_log with: item_id, surface (inbox / backlog), highlighted_text (the selected string), annotation_text, timestamp
AND the annotation is included in the context block of the next AI call for this item
AND if a "Refine ✦" button is present, it becomes active (indicating annotations exist to use)

**Fallback:** If the feedback_log write fails, the annotation is discarded and an error is shown inline: "Annotation could not be saved." Simon retypes and retries. No partial writes.

---

### S-I11 — Cancel annotation

WHEN Simon cancels an annotation before saving
THEN the highlight is removed and the text returns to normal
AND no entry is written to feedback_log
AND the "Refine ✦" button state is unchanged

---

### feedback_log table (data model)

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| item_id | UUID | Foreign key — items table |
| surface | ENUM | inbox / backlog |
| highlighted_text | TEXT | The exact selected string |
| annotation_text | TEXT | Simon's comment |
| iteration | INTEGER | Which AI iteration this annotation applied to (1 = first output, 2 = after first refine, etc.) |
| created_at | TIMESTAMP | Write time |

### AI risk assessment — annotation mechanic

- **Feasibility:** Annotation is a standard DOM text selection event. highlight-and-annotate is well-understood frontend pattern. Risk: complex AI output (nested lists, tables) may produce inconsistent highlight ranges. Mitigation: annotations on structured output are applied to the plain text representation, not the rendered HTML structure.
- **Usability:** Inline annotation (not a separate feedback panel) keeps Simon's attention on the content he is reacting to.
- **Value:** Targeted annotation ("this container choice is wrong" not "improve it") drives more useful feedback_log entries than free-text comments.
- **Viability:** feedback_log stays in the ToDo database. Not shared externally. Used only to build context for the next API call.

---

## Sub-system 3: Claude session integration

### Design

The `/api/v1/claude/*` API is a separate auth path from the web session. It uses a Bearer token (stored in the ToDo database `api_tokens` table, per-app). Claude Code holds this token in its environment. Session auth and API auth are independent.

Claude uses three endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/claude/context` | GET | Load all containers and active items for a project |
| `/api/v1/claude/items/:id` | PATCH | Update task status after session work |
| `/api/v1/claude/inbox` | POST | Submit a brain dump from a session |

---

### S-E05 — Session context load

WHEN Claude Code begins a work session on any SS42 project
THEN Claude calls GET /api/v1/claude/context
AND the response includes: all containers (name, type, status), all items (title, status, estimate, container), and recent activity log entries (last 10)
AND Claude uses this context as the session state briefing — no manual briefing from Simon is needed
AND the context call is made before any work begins in the session

**Fallback:** If the endpoint returns a non-200 status, Claude logs the error and continues the session using conversation history as context. Claude notifies Simon at the start of the session: "Could not load ToDo context — working from conversation history."

---

### S-E06 — Auto task update from session

WHEN Claude completes work on a task during an active session
THEN Claude calls PATCH /api/v1/claude/items/:id with the new status
AND the task status is updated in the database immediately
AND an activity log entry is created: updated by claude, status change, timestamp
AND no review gate is required — session work updates are trusted (auto-applied tier)

**Fallback:** If the PATCH call fails, Claude retries once after 5 seconds. If the second attempt also fails, Claude logs the failure and notifies Simon: "Could not update task {title} in ToDo — please update manually." The session continues.

---

### S-E07 — Session brain dump

WHEN Claude and Simon agree on a new task or outcome during a session
THEN Claude calls POST /api/v1/claude/inbox with the brain dump text and source set to "claude-session"
AND the brain dump is created in Inbox with status Raw and source badge: Claude
AND the brain dump goes through the standard Inbox review gate (Simon reviews before it enters the system)
AND Claude does not auto-create tasks directly — all session-originated tasks go through Inbox

**Fallback:** If the POST call fails, Claude retries once. If the retry fails, Claude captures the brain dump in a formatted note in the conversation: "Could not submit to ToDo — here is the brain dump for you to add manually: [text]."

---

### API risk assessment (Cagan four risks — session integration)

- **Feasibility:** Three endpoints, Bearer token auth, JSON payloads. The pattern is established from Applyr's session integration. Risk: token management — Claude needs the token available in its environment at session start. Mitigation: document the token setup process in the project's CLAUDE.md.
- **Usability:** Claude uses the context silently — Simon does not see the API call. If context loads successfully, the session starts without any visible mechanism. If it fails, Simon sees a single notification. No complexity surfaced to Simon.
- **Value:** OPP-03 success signal is zero duplicated work sessions. Without this, every Claude session starts blind.
- **Viability:** Bearer token is scoped per-app. Even if the token is exposed (e.g., logged), it only grants access to ToDo data. No cross-app access. Token rotation is manual in v1 — Simon can regenerate if needed.

---

## Shared non-functional requirements

| Requirement | Target | Notes |
|---|---|---|
| API call latency (all AI features) | p90 < 10 seconds | 15-second timeout; fallback state shown after |
| feedback_log write | < 200ms | Inline annotation must feel instant |
| Session context load | < 3 seconds | GET /api/v1/claude/context — includes container + item query |
| Session item update | < 1 second | PATCH is a simple status field update |
| Session brain dump post | < 2 seconds | POST creates an inbox item |
| Token auth overhead | < 50ms | Bearer token lookup from api_tokens table |
| Accessibility | N/A — infrastructure layer | No user-facing UI in this spec |
| Mobile/responsive | N/A — infrastructure layer | |

---

## Key design decisions (AI layer)

| Decision | Choice | Rationale |
|---|---|---|
| Two feedback tiers | Auto-apply (session) vs. review gate (intake/backlog) | Session work by Claude is trusted — Simon directed it. Intake is unknown — requires review. Mixing tiers would make either too slow or too risky. |
| No MCP server in v1 | REST API only | MCP server adds complexity and is not needed for v1 single-user use. Claude API endpoints are sufficient. MCP revisited at v2. |
| Annotations in context, not fine-tuning | Context injection per call | Fine-tuning the model requires data volume and infrastructure not appropriate for a single-user v1. Context injection is immediate and reversible. |
| Temperature 0.3 for all structuring calls | Low variance | Task structuring needs consistency. Creative variance is counterproductive here. |
| Iteration cap at 3 (Backlog refinement) | Three iterations before forcing a decision | Prevents refinement loops. After 3 passes, if the output is not good enough, Simon writes it manually. |

---

## v2 backlog (this feature area)

| Story | Description |
|---|---|
| S-E08 | Session summary — at end of a Claude session, a summary is written to the activity log: what was done, what tasks changed, what was created |
| MCP server | Phase 2 — replace REST API with MCP server for richer session integration (resources, tools, prompts) |
| Feedback loop training | When feedback_log volume is sufficient, use annotations to tune system prompt wording (not model fine-tuning) |
