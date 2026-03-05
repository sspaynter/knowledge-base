---
title: Slack Ingest
parent: technical
order: 20
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---
# Slack Ingest — Workflow

**Type:** Workflow documentation
**Workspace:** Products
**Section:** ToDo / Workflows
**Stories:** S-C04 (Slack auto-ingest), S-C05 (Mobile capture)
**Feature area:** `feature-areas/inbox.md`
**Created:** 2026-03-04 (session 37)
**Author:** Simon Paynter + Claude

---

## What this workflow does

Slack is Simon's mobile capture channel. When he has an idea or task away from his desk, he messages a Slack channel and it automatically appears in ToDo — processed by AI before he even opens the app. This workflow documents how that happens, from Slack message to Inbox item.

---

## Current design — single channel (#todo-inbox)

The v1 design uses a single Slack channel: **#todo-inbox**. All messages go to the same destination: the ToDo Inbox, where they appear as Raw items in the Pending Review tab (with AI analysis already run).

### Full flow diagram

```
Simon sends message to #todo-inbox
             │
             ▼
Slack sends event to n8n webhook
(webhook URL registered in Slack app settings)
             │
             ▼
n8n workflow runs:
  1. Extract message text (strip Slack formatting: @mentions, emoji, links)
  2. Extract timestamp and Slack user ID
  3. POST to /api/v1/inbox/ingest
     { text, source: "slack", channel: "#todo-inbox" }
             │
             ▼
ToDo server creates inbox_entry:
  status: Raw
  source: slack
  source_channel: "#todo-inbox"
  raw_text: [cleaned message text]
             │
             ▼
AI analysis triggered automatically (no user action required):
  Claude API called with:
    - raw_text
    - existing containers list
    - any relevant feedback_log entries
             │
         ┌───┴──────────────────────┐
         │ API success              │ API failure / timeout
         ▼                          ▼
inbox_entry updated:           inbox_entry stays:
  status: pending_review         status: raw
  proposed_container             "AI analysis failed"
  proposed_items (JSON)          Retry button shown
         │                        in Raw Capture tab
         ▼
Appears in Simon's Inbox
→ Pending Review tab
  with AI-proposed structure
  and Slack source badge
             │
             ▼
Simon reviews: Accept / Edit / Reject
             │
             ▼
On Accept:
  Tasks created in proposed container
  inbox_entry marked: processed
  activity_log entry written
```

### Key properties of this flow

- **Zero friction for Simon** — he sends a Slack message from anywhere. No app to open, no form to fill. The next time he opens ToDo, the item is already structured and waiting.
- **AI runs automatically on ingest** — items appear in Pending Review, not Raw Capture, unless the AI call fails.
- **Raw Capture tab is the fallback** — if the AI call fails during ingest, the item lives in Raw Capture until Simon manually triggers processing with "Process ✦".
- **Source badge** identifies where each item came from. Slack items show a Slack badge.
- **n8n handles the webhook** — follows the same pattern used in Applyr for webhook-triggered automations.

### Error and failure states

| Failure point | What happens | Recovery |
|---|---|---|
| Slack webhook not delivered | Message stays in Slack. Not in ToDo. | No automatic recovery. Simon checks manually if item is missing. Future: Slack delivery receipt. |
| n8n workflow fails | Webhook received but processing failed. n8n logs the error. | Simon checks n8n logs. Message is still in Slack as a backup. |
| POST to /api/v1/inbox/ingest fails | n8n receives a non-200 response. | n8n retries once after 30 seconds. If second attempt fails, n8n logs. |
| AI analysis fails on ingest | inbox_entry saved but stays Raw. | Appears in Raw Capture tab. "AI analysis failed — tap to retry" shown on the card. |
| Simon is offline when item arrives | Ingest happens server-side — Simon's app status is irrelevant. | Item is in Inbox when Simon next opens the app. |

---

## Multi-channel routing — design under review

**Status: Not designed. Simon wants to explore this before committing to an approach.**

Simon's idea: different Slack channels could route to different destinations in ToDo. For example:
- `#todo-inbox` → General Inbox (current design)
- `#todo-kb` → Knowledge Base project
- `#todo-health` → Personal → Health & Fitness group
- A channel per active project

### Why this matters

The single-channel design works, but everything arrives in Inbox — Simon has to review and assign a container for every item. With multi-channel routing, he can pre-route items at capture time by choosing which Slack channel to post to. No inbox review needed for items where the destination is obvious.

### Open design questions (to be resolved before building)

1. **How are channels mapped to containers?** Options:
   - **Naming convention** — channel name contains a keyword that maps to a container (e.g., `#todo-knowledge-base` maps to the "Knowledge Base" project). Simple but fragile — container names change.
   - **Settings configuration** — Simon configures channel → container mappings in ToDo Settings. Flexible but requires setup.
   - **Fixed system channels** — predefined channels for Today, Inbox, each project (auto-created when a project is created). Structured but creates Slack channel sprawl.

2. **Does multi-channel bypass the Inbox review gate?**
   - If a message goes directly to a project (not Inbox), does it still need AI review and Simon's acceptance?
   - Current design principle: nothing enters the main system without Simon's review. Bypassing Inbox would break this.
   - Option: multi-channel routes to Inbox, but with the container pre-selected based on the channel. Simon still reviews, but the container is already filled in.

3. **What happens if a channel has no configured destination?** Falls back to Inbox? Returns an error?

### Recommended approach (pending Simon's decision)

Route to Inbox with pre-selected container. Preserves the review gate. Reduces the work Simon does during review (container already filled in). Does not create the "raw tasks bypass review" problem.

**Decision needed from Simon before this can be designed or built.**

---

## Mobile capture (non-Slack)

When Simon is on mobile, Slack is the primary capture method — messages go through the Slack ingest flow above. The Mobile source badge in the app distinguishes items that Simon captured from a mobile context.

In v1, there is no dedicated mobile web interface (minimum supported viewport is 1280px desktop). Mobile capture = Slack.

In v2, mobile web support or a native app could provide a direct capture interface.

---

## n8n workflow (implementation reference)

The n8n workflow is triggered by a Slack webhook (outgoing webhook or Slack app event subscription). Key nodes:

1. **Webhook trigger** — listens for new messages on configured channel(s)
2. **Filter** — ignore bot messages, system messages, and thread replies
3. **Text clean** — strip Slack formatting: `<@userId>` → `@username`, `:emoji:` → removed, `<URL|text>` → text only
4. **HTTP POST** — send to `/api/v1/inbox/ingest` with auth header
5. **Error handler** — log failures to n8n execution log; retry once on non-200

---

## References

- Feature area spec: `feature-areas/inbox.md` — S-C04 (Slack auto-ingest), S-I07 (Raw Capture tab), S-I08 (Process a raw item)
- AI processing flow: `workflows/ai-processing.md`
- n8n deployment: NAS Container Station — `n8n` container
