---
title: Development Lifecycle
status: draft
author: both
created: 2026-03-05
updated: 2026-03-05
parent: overview
---

# Development Lifecycle

The Development Platform supports the full SS42 development pipeline — from ideation through release. Each stage produces artifacts, requires Simon's review, and must be approved before the next stage begins.

## Gates and stages

```
IDEATION ──▶ DESIGN ──▶ PLAN ──▶ BUILD ──▶ Deploy/Release

Ideation:     Brain dump, capture idea
Design:       Problem statement, user flows, prototype, architecture
Plan:         SDD task breakdown with spec: references
Build:        Workers execute tasks on isolated branches
```

Every transition between stages requires **Simon's explicit approval**. The Dev Server tracks which gate each feature is at and will not start build tasks for a feature whose design has not been approved.

## What each stage produces

| Stage | Worker type | Output | Stored in | Review method |
|---|---|---|---|---|
| **Ideation** | None (Simon captures) | Idea text | ToDo inbox | Inbox review gate |
| **Problem statement** | Designer | Markdown doc | KB vault | Read in KB or dashboard |
| **User flows** | Designer | Markdown + Mermaid diagrams | KB vault | Read in KB or dashboard |
| **Prototype** | Designer | Single-file HTML/CSS/JS | Project repo `docs/prototypes/` | Open in browser |
| **Architecture** | Designer | Markdown doc | KB vault | Read in KB or dashboard |
| **Plan** | Designer | SDD task list with spec: refs | ToDo (or plan file) | Review in ToDo or dashboard |
| **Build** | Builder | Code changes on isolated branch | Git branch | Diff in dashboard |
| **Review** | Reviewer | Test results + quality report | Dashboard | Read in dashboard |
| **Release** | Simon (manual) | Tag + changelog | GitHub | Standard release process |

## Gate enforcement rules

1. **Build tasks are blocked** if the feature's design gates (problem, prototype, architecture) have not been approved
2. The dashboard shows a clear gate indicator per feature: which gates are complete, which need review, which are next
3. Gate approvals are one-click in the dashboard with optional review notes
4. Features are tracked independently — a project can have multiple features at different stages simultaneously

## Design artifacts flow to KB vault

Design-stage workers write their output to the KB vault:

```
knowledge-base/vault/products/{project}/
├── {feature}-problem-statement.md
├── {feature}-user-flows.md
├── {feature}-architecture.md
└── ...
```

Workers write to the local vault directory and sync to the KB API. The dashboard links to the KB page for each artifact.

## Input during design

Design stages sometimes need Simon's input:

- **MVP:** If a worker cannot complete without input, it fails with a clear question in its output. Simon answers in the dashboard, creates a revised task.
- **Future:** Dashboard supports a "Questions" queue — workers post questions, Simon answers, the answer resumes the session.

## How this maps to the existing pipeline

The Development Platform formalises the existing SS42 pipeline rule (from global CLAUDE.md):

> Brainstorm → Prototype → Plan → Build → Deploy to staging → Verify → Release

The difference: instead of Simon manually running each step in a Claude Code session, the Dev Server orchestrates the steps. Simon's role shifts from *executor* to *reviewer and approver*.
