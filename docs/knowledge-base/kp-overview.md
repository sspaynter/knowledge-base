# Knowledge Platform — Overview

**Type:** Project overview page
**Workspace:** IT & Projects
**Section:** Knowledge Platform
**Template:** project-overview
**Status:** Active
**Created:** 2026-02-27
**Author:** Simon Paynter + Claude

---

## What it is

A universal knowledge platform — personal second brain with a human-first authoring interface. The hub for everything Simon writes, documents, and needs to find again.

Content spans all domains: work, personal, IT infrastructure, projects, business, learning, blog ideas. No topic restrictions.

Structured like Confluence. Feels like Notion. Owned entirely.

```
Workspaces  →  Sections  →  Pages  →  Content
(IT & Projects, Personal, Work, Learning, Bag Business)
```

## Why it exists

Twelve interconnected problems drove this:

1. Knowledge scattered across OneNote, Notion, Confluence, GitHub — no single searchable home
2. Every existing tool forces a compromise — structure, ownership, cost, or experience
3. Search is broken — captured knowledge that cannot be found is effectively lost
4. AI rebuilds context every session from scratch — no persistent memory
5. AI configuration changes too fast to track with scattered notes
6. Session knowledge evaporates — decisions and discoveries disappear into chat history
7. No record of how things evolved — what changed, when, why
8. No map of the technology ecosystem — connections live only in Simon's head
9. Artifacts (configs, skills, scripts) are disconnected from their documentation
10. Tools do not share data — Lifeboard, GitHub, mobile, AI — all silos
11. No controlled sharing — access is all-or-nothing
12. Data lock-in — knowledge is trapped inside another tool's format

## What it is not

- Not a task manager — that is Lifeboard
- Not a code repository — that is GitHub
- Not a flat record browser (the old v0.1 model)
- Not a replacement for specialised creative tools

## Scope

**Version 1 (this project):** Personal, self-hosted on QNAP NAS. Multi-user with roles (admin/editor/viewer). Full feature set. Reference implementation.

**Version 2 (future):** Cut-down portable build on Notion or equivalent. For others to adopt without running infrastructure. Informed by Version 1.

## Current state

**Status:** All code complete. 33 tests passing. Ready for NAS deployment.

**Completed:**
- All 5 phases, 30 tasks — database, backend, frontend, deployment wiring
- 12-table PostgreSQL schema in `knowledge_base` on `n8n-postgres`
- Full REST API with auth, workspaces, pages, assets, search, upload, admin
- Three-column Confluence-style frontend with editor, search, map view, settings
- Dockerfile, docker-compose, GitHub Actions CI/CD workflow

**Next step:** NAS deployment — push to GitHub, run migrate + seed, create Container Station container, wire `kb.ss-42.com` Cloudflare tunnel.

**Plan:** `docs/plans/2026-02-27-knowledge-platform-implementation-plan.md` — 6,407 lines, 30 tasks across 5 phases. Session log appended with deployment checklist.

## Related projects

| Project | Role |
|---|---|
| Lifeboard | Task and project tracking — will write project data into this platform |
| GitHub | Code and issue management — logs and decisions will surface here |
| Mobile capture tools | Quick input on the go — push content via API |
| Claude / AI sessions | Query this platform for context, write documentation back into it |
| SS42 HQ | Navigation anchor for the SS42 tool suite — linked from this platform's logo |
