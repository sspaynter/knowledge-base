---
title: Observability
status: published
author: both
parent: overview
created: 2026-03-14
updated: 2026-03-14
---

# Observability

No observability tooling exists in the SS42 operating model today. This page documents what we will measure and why — a framing document, not a dashboard spec. Implementation will follow when the Dev Server is built and agent volume justifies instrumentation.

---

## What Matters

Four categories of signal would make the operating model measurably better:

### Token usage per agent type

Different agents consume tokens at different rates. Builder agents generate code across multiple files. Reviewer agents loop until tests pass. Researcher agents scan and summarise. Understanding the token profile per agent type reveals where optimisation effort should go.

What to measure: tokens consumed per agent invocation, broken down by agent type (builder, reviewer, researcher, role agent, workflow agent) and by model (Opus, Sonnet, Haiku).

### Task completion rate

Not every task started in a session gets finished. Some are abandoned, some are blocked, some are deferred. Tracking completion rate at the task level (not session level) reveals patterns — which task types stall, which sprints drag, which agent types fail more often.

What to measure: tasks marked done vs tasks started (from sprint.json status transitions), tasks abandoned mid-session (started but not completed by session end).

### Session duration and turns

Sessions vary from 15 minutes to 3 hours. Long sessions may indicate scope creep, context pollution, or tasks that should have been broken down further. Short sessions may indicate blocked work or insufficient preparation.

What to measure: number of turns per session, elapsed wall-clock time, number of /compact calls (a proxy for context pressure).

### Cost per workflow

The Claude Max plan is a flat rate for interactive Claude Code use. But n8n automation workflows call the Anthropic API directly and incur real per-token costs. As automation volume grows, cost visibility becomes necessary.

What to measure: API cost per n8n workflow execution, monthly n8n API spend, cost per job scored in the discovery pipeline.

---

## What We Have Today

Observability today is manual and informal:

| Source | What it captures | Limitations |
|---|---|---|
| Session logs (`.jsonl`) | Full conversation transcript per session | Not aggregated, not queryable, large files |
| MEMORY.md | Key decisions and state across sessions | Manual, selective, no metrics |
| End-of-session skill | Structured close-out with implementation plan, memory update, vault sync | Captures what happened, not how well it went |
| n8n execution history | Per-workflow run status, duration, error count | Built into n8n UI, not exported or aggregated |
| sprint.json | Task status transitions (pending → in_progress → done) | No timestamps on transitions, no duration tracking |

These sources contain useful signal but none of them aggregate, trend, or alert. Observability today means reading session logs after the fact.

---

## What We Want

### Automated cost tracking per n8n workflow

When n8n automation volume increases, track API token usage per workflow execution. The Anthropic API returns token counts in every response. n8n could log these to a table for aggregation.

**Implementation trigger:** When n8n API costs exceed $20/month or when more than 3 automation workflows are active.

### Agent performance metrics from Dev Server

The Dev Server (future infrastructure — see [Future State](/page/operations/ai-operating-model/future-state)) will run agents as background services. When it exists, instrument:

- Task duration per agent type
- Retry count per reviewer loop
- Error rate per workflow agent
- Token consumption per task

**Implementation trigger:** Dev Server MVP is built and running background agents.

### Feedback loop scoring from Applyr

The cover letter rubric (planned in the CL Learning Loop sprint) will score generated output against quality criteria. These scores, aggregated over time, measure whether the system is getting better at its job.

**Implementation trigger:** Cover letter rubric is implemented (MASTER-TODO #157 and related items).

### Sprint velocity tracking

sprint.json already tracks task status. Adding timestamps to status transitions would enable:

- Average task duration
- Sprint cycle time (first task started → last task done)
- Throughput (tasks completed per session)

**Implementation trigger:** ToDo app is live and replaces sprint.json with a proper task store that timestamps transitions.

---

## Industry Context

The agent observability space is maturing:

- **OpenTelemetry for agents** — extending the OpenTelemetry standard to instrument LLM calls, tool use, and agent workflows. The pattern: treat each agent invocation as a span, each tool call as a child span, token counts and latency as attributes.
- **Langfuse** — open-source LLM observability platform. Traces prompt chains, measures quality via user feedback, tracks cost. Self-hostable.
- **Maxim AI** — evaluation and observability for AI workflows. Focused on quality scoring and regression detection.

These tools solve real problems but are designed for production SaaS applications processing thousands of requests. SS42 processes dozens of sessions per week. The cost-benefit of adopting a dedicated platform is not there yet.

**Recommendation:** Evaluate when the Dev Server is running background agents at volume. Until then, lightweight custom instrumentation (logging token counts to PostgreSQL) is sufficient.

---

## What We Will Not Do

- **Build dashboards before there is data to display.** No Grafana, no Prometheus, no monitoring stack until agent volume justifies it.
- **Add instrumentation to Claude Code sessions.** The interactive layer is human-paced. Observability adds friction without insight at current volume.
- **Adopt a third-party observability platform prematurely.** Langfuse and similar tools are worth evaluating when the Dev Server exists — not before.

---

## Related

- [AI Operating Model — Overview](/page/operations/ai-operating-model/overview)
- [Future State](/page/operations/ai-operating-model/future-state)
- [Model Strategy](/page/operations/ai-operating-model/model-strategy)
- [Autoresearch Learning Loop Pattern](/page/operations/engineering-practice/autoresearch-learning-loop-pattern)
- [Context Hygiene](/page/operations/engineering-practice/context-hygiene)
