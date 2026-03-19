---
title: Agent Architecture — Industry Research (2026)
status: published
order: 45
author: claude
parent: overview
created: 2026-03-11
updated: 2026-03-11
---

# Agent Architecture — Industry Research (2026)

This document captures industry research conducted in March 2026 to validate the SS42 Agent Architecture Standard. It explains what the broader AI engineering community is building, and how the SS42 four-tier hierarchy maps to those patterns.

Reference: [SS42 Agent Architecture Standard](/page/operations/ai-operating-model/architecture)

---

## Summary Finding

The SS42 approach — role-based agents with owned tools, a human at the top of the orchestration stack, and skills as shared callable procedures — is consistent with the emerging industry consensus in 2026. The patterns converge on the same core principles: separation of concerns, tool ownership, and human-in-the-loop for consequential decisions.

---

## LangChain: Four Architectural Patterns

LangChain's research into production agent systems identified four repeating patterns across real-world deployments:

### 1. Subagents
Specialised autonomous processes launched to handle a specific subtask. Each subagent gets its own context, tools, and execution lifecycle. The calling agent does not wait — it delegates and continues.

**SS42 mapping:** Workflow agents (discovery-agent, application-agent) are subagents in this sense. They are dispatched by the human, run autonomously between gates, and return a structured output.

### 2. Skills (Callable Procedures)
Single-purpose, callable tools that do one thing and return a result. No decision logic. No sub-calls. Called by agents, not invoked by humans directly.

**SS42 mapping:** Project tools (`job-evaluate`, `cover-letter`) and Global tools (`web-researcher`, `anti-slop`) are skills in this pattern. The SS42 naming convention maps directly.

### 3. Handoffs
A mechanism by which one agent transfers control to another — passing context, state, and the active thread. Used in multi-agent pipelines where different agents handle different phases.

**SS42 mapping:** Not implemented yet in SS42, but the architecture anticipates this at the role-agent → workflow-agent boundary. The role agent can hand off to a workflow agent and return to its conversational surface.

### 4. Router
A routing layer that decides which agent handles a given request. Classifies intent, then dispatches to the appropriate handler.

**SS42 mapping:** The human plays this role in the Claude Code layer (intentionally). In the n8n automation layer, n8n's conditional nodes act as the router — deciding whether to score, ingest, or discard based on the triage result.

---

## MetaGPT: Role-Based Collaboration

MetaGPT formalised the idea of assigning distinct roles to agents rather than building a single generalised agent. In MetaGPT's model:

- Each agent has a defined role (Product Manager, Architect, Engineer, QA)
- Roles own specific tools and output formats
- Agents collaborate by passing structured documents (not raw text)
- No agent can exceed its role's scope

**SS42 mapping:** The SS42 role agent concept follows this logic. `applyr-agent` is the domain expert for job search. `kb-agent` owns knowledge platform interactions. Each role agent loads the context and tools relevant to its domain — and does not stray outside it.

The MetaGPT approach also validates SS42's decision to avoid a generalised "orchestrator agent" sitting above all others. MetaGPT's research showed that role boundaries produce more reliable, auditable outputs than a single agent trying to handle all roles.

---

## Model Context Protocol (MCP)

MCP is Anthropic's open standard for how agents expose and consume tools. By March 2026 it has been adopted by:

- Microsoft (Copilot Studio agent tooling)
- Google (Gemini agent framework)
- LangChain (native MCP support)
- Cursor, Windsurf, and other AI IDEs

The core premise: tools are defined once with a typed schema. Any agent that understands MCP can discover and call any tool — across projects, runtimes, and vendors.

**Why this matters for SS42:**

The current SS42 skill system (SKILL.md files, `@` imports, `Skill` tool invocation) is MCP-compatible in *intent*. Skills are already single-purpose with a defined interface. When MCP tooling matures for self-hosted use, the project-tool and global-tool tiers map cleanly onto MCP servers.

The [SS42 Agent Architecture Standard](/page/operations/ai-operating-model/architecture) captures this under "MCP — Future Wiring Layer". Build skills now in the current pattern. The migration path to MCP is direct.

---

## The Emerging Consensus

Across these frameworks, five principles appear consistently in 2026 production deployments:

| Principle | What it means |
|---|---|
| **Role specialisation** | Agents own a domain. They do not try to handle everything. |
| **Tool ownership** | Each agent has a specific set of tools. Tools are not shared at random — they are assigned deliberately. |
| **Human-in-the-loop at gates** | Autonomous execution between checkpoints is acceptable. But consequential decisions (approve, submit, merge) require a human checkpoint. |
| **Skills as the reuse layer** | Capabilities that are invoked in multiple contexts become callable procedures, not inline instructions. The skill is the unit of reuse. |
| **Standard interfaces** | Tools expose typed schemas. Agents communicate via structured documents, not free-form text. MCP is the direction the industry is converging on for this. |

The SS42 standard was independently designed before this research was conducted. The research validated that it is aligned — not a bespoke invention, but a local implementation of patterns that the industry is converging on for the same reasons.

---

## Why No Top-Level Orchestrator Agent

This question came up during the SS42 architecture design: should there be a master "job applying agent" (or equivalent) sitting above all other agents and orchestrating them?

The answer from both SS42 reasoning and industry practice is: **no, when humans are involved at decision points.**

The argument:

1. Every meaningful workflow in an SS42 app has human decision gates — review outputs, approve actions, decide what to do next
2. These gates cannot be automated — a human has to be there
3. A meta-orchestrator agent between the human and the workflow agents just adds a wrapper around work the human is already doing
4. The wrapper does not reduce cognitive load — it adds indirection

The distinction LangChain and MetaGPT draw is: **fully automated pipelines can benefit from an orchestrator because there are no human gates to interrupt the flow.** This is exactly the n8n layer in SS42 — Gmail fires → score → ingest → no human in the loop. n8n as orchestrator makes sense there.

Where humans are present, the human *is* the orchestrator. Encode that directly, do not fight it.

---

## Related Documents

- [SS42 Agent Architecture Standard](/page/operations/ai-operating-model/architecture)
- [Applyr — Claude Code Architecture](/page/products/applyr/applyr-claude-code-architecture)
- [Applyr — Update Agent Sprint](/page/products/applyr/applyr-update-agent-sprint)
- [web-researcher Skill](/page/operations/engineering-practice/skills/web-researcher)
