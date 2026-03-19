---
title: Work Domains — System, Platform, Product
status: published
author: both
created: 2026-03-11
updated: 2026-03-11
---

# Work Domains — System, Platform, Product

All SS42 work falls into one of three domains. Knowing which domain a task belongs to determines where it is documented, how it is tracked, and when it gets done.

## How it works

### The three domains

| Domain | Tag | What it is | Where executable config lives | Where documented |
|---|---|---|---|---|
| **System** | `Sys` | The operating system for how Simon works with Claude. Skills, agents, conventions, processes, context loading, infrastructure. | `~/.claude/` (skills, agents, CLAUDE.md, hooks) | KB vault `operations/` |
| **Platform** | `Plat` | Tools built to support work. These are projects, but their purpose is to serve the System domain. | Project repos (`knowledge-base/`, `todo/`, `todo-viewer/`) | KB vault `products/{tool}/` |
| **Product** | `Prod` | Things built for use — by Simon or by customers. | Project repos (`job-app/`, `simonsays42/`, future customer repos) | KB vault `products/{product}/` |

Each domain consumes the one above it:

- Platform tools pull conventions from System (not the other way around)
- Products are built using Platform tools and System conventions
- System improvements benefit every Platform and Product session after them

### Relationship to execution layers

The [SS42 Agent Architecture Standard](/page/operations/ai-operating-model/architecture) defines execution layers — **how** work runs:

| Execution Layer | Description | Status |
|---|---|---|
| Interactive | Claude Code, human-in-loop | Live |
| Automated | n8n, no human | Live |
| Ambient | Dev Server workers, between sessions | Designed |

Work Domains are orthogonal — they describe **what kind of work** is being done. You can do System work interactively. You can run Product automation via n8n. Both dimensions matter, but they answer different questions:

- **Execution Layer** answers: *How does this work get done?*
- **Work Domain** answers: *What is the purpose of this work?*

## When to use

Apply domain classification when:

- Adding a task to MASTER-TODO (tag with `Sys`, `Plat`, or `Prod`)
- Planning a session (am I improving the machine or building something?)
- Deciding what to work on next (system improvements multiply the value of everything after them)
- Naming sprints (include the domain: `system-context-loading`, not `audit-v2`)

## Rules

1. **Every task has exactly one domain.** If a task touches both System and Product (e.g., "create web-researcher skill for Applyr agent sprint"), classify by primary output. A global skill is System, even if motivated by a Product need.

2. **System work is tracked separately.** MASTER-TODO items are tagged with a Domain column. Sprint names include the domain when the sprint is domain-specific.

3. **System sessions are deliberate.** Do not mix System work into the middle of a Product build session. When a build session surfaces a System improvement need, add it to the System backlog — do not fix it in place unless it is a 5-minute change.

4. **Platform tools consume System conventions, they do not define them.** If the ToDo app needs a new data model convention, that convention is defined in `operations/` first, then the ToDo app implements it. The convention lives in System; the implementation lives in Platform.

5. **The improvement cycle runs continuously.** Every 3-5 build sessions, run a dedicated System session to address the highest-impact items from the System backlog.

## The improvement cycle

```
Build session (any domain)
    │
    ├── Hit friction? → Add to System backlog in MASTER-TODO
    │                   (tagged Domain: Sys)
    │
    ├── End of session → end-of-session skill runs
    │                    → checks for new System items surfaced
    │                    → updates MEMORY.md
    │
    └── Periodic system session (every 3-5 build sessions)
        → Pull System backlog
        → Execute highest-impact items
        → Every improvement benefits all subsequent sessions
```

This pattern is validated by industry practice:

- **Boris Cherny** (Claude Code tech lead at Anthropic) runs a "mistake ledger" — CLAUDE.md is updated during code review with lessons learned. The config improves continuously as a side effect of normal work.
- **Claudefa.st** documents a session memory graduation path — `/remember` captures patterns, high-confidence patterns graduate to persistent config.
- **everything-claude-code** (GitHub) formalises "instinct to skill graduation" with confidence scoring — raw patterns are captured, evaluated, and high-confidence ones become permanent skills.

SS42's implementation: the end-of-session skill already captures learnings. Rule 5 adds the deliberate system session cadence that ensures those learnings get acted on.

## Examples

### Classifying tasks

| Task | Domain | Why |
|---|---|---|
| Write global web-researcher skill | Sys | Global skill usable by any project |
| Build KB inter-page hyperlinks | Plat | KB is a platform tool; this adds a feature to it |
| Fix Applyr resume export bug | Prod | Applyr is a product; this is a feature fix |
| Update writing-plans skill | Sys | Skill improvement, benefits all future plans |
| ToDo prototype v2 | Plat | ToDo is a platform tool; design work for it |
| Deploy SimonSays42 to production | Prod | Blog is a product; shipping it |
| Add Domain column to MASTER-TODO | Sys | Improving the task tracking convention |
| Compress simon-context to under 150 lines | Sys | Context loading optimisation |

### Sprint naming convention

| Sprint name | Domain | Content |
|---|---|---|
| `system-context-loading` | Sys | Context loading optimisation items |
| `system-agent-pattern` | Sys | Agent architecture reference implementation |
| `system-build-tooling` | Sys | writing-plans upgrade, standard doc template |
| `products-go-live` | Prod | Ship SimonSays42 |
| `kb-usability-1` | Plat | KB navigation features |
| `todo-design` | Plat | ToDo prototype and implementation plan |

## Related

- [AI Operating Model — Overview](/page/operations/ai-operating-model/overview)
- [SS42 Agent Architecture Standard](/page/operations/ai-operating-model/architecture)
- [Context Loading Architecture](/page/operations/engineering-practice/context-loading-architecture)
- [Claude Workflow](/page/operations/engineering-practice/claude-workflow)
- [Agent Catalogue](/page/operations/ai-operating-model/agent-catalogue)
