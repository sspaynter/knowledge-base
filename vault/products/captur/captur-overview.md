---
title: Captur — Overview
order: 10
status: draft
author: both
created: 2026-03-18
updated: 2026-03-18
---
# Captur — Project Overview

**Status:** Design spec complete — implementation planning next
**Subdomain:** captur.ss-42.com (planned)

## What it is

A multi-panel product scoping workbench for structuring how projects and features are defined, documented, and validated before entering the build pipeline. Captur provides a navigable, document-style interface that walks through six scoping stages — from discovery through requirements — capturing decisions, diagrams, and design artifacts along the way.

## Why it exists

- Product scoping is currently done ad-hoc across Claude Code sessions with no persistent, structured view
- Decisions, user flows, and design rationale are scattered across conversation history and markdown files
- Prototypes are not captured in the Knowledge Base
- There is no visual, navigable way to revisit or share scoping work with clients

## What it is not

- **Not an AI tool** — no Claude API integration; Claude Code is the external thinking companion
- **Not a project management tool** — no tasks, sprints, or timelines (that's ToDo)
- **Not an implementation planner** — implementation plans and validation stay in Claude sessions
- **Not a prototype builder** — prototypes are built externally, Captur references and displays them

## Architecture / Stack

| Layer | Technology |
|---|---|
| Server | Node.js / Express |
| Views | Server-side rendered + client-side JS |
| Database | PostgreSQL — `captur` schema (shared DB) |
| Diagrams | Mermaid.js (client-side rendering) |
| Prototypes | iframe embeds from HQ URLs |
| Container | Docker (Node + Nginx) |
| Auth | Cloudflare Access → future shared SSO |

## 6 Panels

Each project/feature node has six panels, navigated via tabs:

1. **Discovery** — Problem statement, personas, JTBD, assumptions, existing alternatives
2. **Scope** — Features in/out, constraints, success criteria, appetite, NFRs, MVP definition
3. **User Flows** — Actors, primary flows, edge cases, state transitions, job stories, service blueprints
4. **Information Architecture** — Data model, content structure, navigation, URL structure, API contracts
5. **Prototype** — Design rationale, iframe embeds, locked decisions, accessibility, responsive behaviour
6. **Requirements / PRD** — Functional/non-functional requirements, acceptance criteria, observability, release plan

Cross-panel sections (Decision Log, Open Questions, Glossary) are available in any tab.

## Content types

- **Text** — markdown-formatted free text, pasted from Claude sessions
- **Mermaid diagrams** — source code with live preview toggle
- **Prototype embeds** — iframes loading HTML prototypes from HQ URLs

## Key features

- **Nested project tree** — unlimited depth sidebar for organising projects, features, sub-features
- **Document-style editor** — guided section headings with helper prompts, scrollable like a document
- **KB export** — on-demand push to Knowledge Base API, generating markdown with mermaid blocks and prototype links
- **App rail integration** — appears alongside KB, ToDo, Applyr in the shared 54px vertical rail

## Key files

| Document | Location |
|---|---|
| Design spec | `~/Documents/Claude/captur/docs/design/2026-03-18-captur-design.md` |
| Architecture mockup | `~/Documents/Claude/captur/docs/design/architecture-overview.html` |
| Layout mockup | `~/Documents/Claude/captur/docs/design/layout-revised.html` |
| UX mockup | `~/Documents/Claude/captur/docs/design/ux-design.html` |

## Related projects

| Project | Relationship |
|---|---|
| Knowledge Base | Export destination — Captur pushes markdown to KB API |
| HQ | Prototype source — iframes load from hq.ss-42.com |
| ToDo | Complementary — ToDo tracks tasks/sprints, Captur tracks scoping |
| Applyr | Sibling app in app rail |

## Origin

Conceived 2026-03-18 during SSA website brainstorming session. Recognised that the visual brainstorming companion mockups being created during design sessions had no persistent home — and that the broader product scoping workflow needed a structured tool rather than ad-hoc Claude sessions.
