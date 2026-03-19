---
author: claude
order: 10
title: Engineering Practice — Overview
---


# Engineering Practice — Overview

How SS42 is built and shipped. Development process, session management, patterns, standards, and skills. This section answers: **how do we build and ship?**

> **Note:** Four agent architecture articles moved to [AI Operating Model](/page/operations/ai-operating-model/overview) per [ADR-001](/page/operations/ai-operating-model/decisions/001-operations-workspace-restructure): architecture, agent-catalogue, agent-guardrails, agent-research. Those articles define the system, not how to build within it.

---

## Section Map

### Development Process

| Page | What it covers |
|---|---|
| [Claude Workflow](/page/operations/engineering-practice/claude-workflow) | Session workflow — brainstorm, plan, build, review pipeline |
| [SDD Conventions](/page/operations/engineering-practice/sdd-conventions) | Spec-driven development — spec references in plans, SPEC.md persistence |
| [Task Decomposition](/page/operations/engineering-practice/task-decomposition) | Breaking work into 2-5 minute build-ready tasks |
| [Writing Plans Upgrade](/page/operations/engineering-practice/writing-plans-upgrade) | Seven-field plan format design — spec, files, code, test, acceptance, done-when, blocks |
| [Plan Validation Design](/page/operations/engineering-practice/plan-validation-design) | Plan feasibility gate — five check categories, three verdicts |
| [Lifecycle Pattern](/page/operations/engineering-practice/lifecycle-pattern) | Feature lifecycle — dev branch, staging, production, versioning |
| [Lifecycle Release Design](/page/operations/engineering-practice/lifecycle-release-design) | Release skill architecture — 5-phase release process |

### Session Management

| Page | What it covers |
|---|---|
| [Context Hygiene](/page/operations/engineering-practice/context-hygiene) | Context window management, /compact timing, image-heavy session handling |
| [Context Loading Architecture](/page/operations/engineering-practice/context-loading-architecture) | Token budget, skill loading, rules system, agent definitions |
| [Session Handoff Workflow](/page/operations/engineering-practice/session-handoff-workflow) | Cross-session continuity — memory, sprint state, next-session prompts |

### Patterns & Tools

| Page | What it covers |
|---|---|
| [Autoresearch Learning Loop](/page/operations/engineering-practice/autoresearch-learning-loop-pattern) | Autoresearch pattern from Applyr — automated research with feedback loops |
| [Chrome DevTools MCP Auth](/page/operations/engineering-practice/chrome-devtools-mcp-auth) | Chrome DevTools MCP server authentication and configuration |
| [Cross-Project Modification Boundary](/page/operations/engineering-practice/cross-project-modification-boundary) | Session scope boundaries — one active project per session |

### Standards

| Page | What it covers |
|---|---|
| [KB Vault Management](/page/operations/engineering-practice/kb-vault-management) | KB vault taxonomy, directory structure, change process |
| [Standard Product Docs](/page/operations/engineering-practice/standard-product-docs) | Standard product documentation template for new projects |

### Skills

| Page | What it covers |
|---|---|
| [Skills Overview](/page/operations/engineering-practice/skills/skills-overview) | Skills system overview — conventions, structure, loading |
| [Anti-Slop](/page/operations/engineering-practice/skills/anti-slop) | AI writing pattern elimination for human-sounding prose |
| [Design Standards](/page/operations/engineering-practice/skills/design-standards) | Visual design standards for SS42 apps |
| [KB Writing](/page/operations/engineering-practice/skills/kb-writing) | KB article quality rules and templates |
| [Lifecycle Release](/page/operations/engineering-practice/skills/lifecycle-release) | Release process skill reference |
| [Web Researcher](/page/operations/engineering-practice/skills/web-researcher) | Web research agent skill specification |
| [Writing Plans](/page/operations/engineering-practice/skills/writing-plans) | Implementation plan skill — seven-field format |

---

## Related Sections

| Section | Question | Content |
|---|---|---|
| **Engineering Practice** (this section) | How do we build and ship? | Build pipeline, session handoff, release process, SDD conventions, skills |
| [AI Operating Model](/page/operations/ai-operating-model/overview) | What is the system and where is it going? | Strategy, architecture, governance, decisions |
| [Infrastructure](/page/operations/infrastructure/overview) | What runs where? | NAS containers, Cloudflare, auth architecture, deployment runbooks |
