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

**Version:** v2.0.0-dev — Phase 1 (vault sync + visual redesign) and Phase 2 (editor + write paths) complete on `dev` branch, staging at `kb-staging.ss-42.com`
**Production:** v1.0.0 still live at `kb.ss-42.com` (pending Phase 6 production deploy)

**v1.0.0 completed:**
- All 5 phases, 30 tasks — database, backend, frontend, deployment wiring
- 12-table PostgreSQL schema in `knowledge_base` on `n8n-postgres`
- Full REST API with auth, workspaces, pages, assets, search, upload, admin
- Three-column Confluence-style frontend with editor, search, map view, settings
- Deployed to NAS — `kb.ss-42.com` via Cloudflare tunnel + Google OAuth
- Admin account created, registration locked

**v2.0.0 in progress (supersedes v1.1.0):**

*Phase 1 (session 28):* Vault sync engine, chokidar watcher, three-layer content fallback, Mermaid.js rendering, Plus Jakarta Sans + indigo visual redesign, staging deployed.

*Phase 2 (session 30):* Vault-first write paths (createPage/updatePage/movePage write .md files), page_versions table (50-version history, restore endpoint), editor toolbar (bold/italic/heading/link/code/list), split/source-only mode toggle, Mermaid live preview in editor pane, 7 diagram templates with Insert Diagram picker, click-to-edit Mermaid in reading view (inline editor panel, live preview, writes back to page content). Google OAuth SSO cross-app verified: sign into KB → Applyr authenticated (shared `.ss-42.com` cookie).

*Phases 3–6:* PENDING — see implementation plan for details.

**v2.0.0 design goals:**
- Vault-as-source architecture — markdown files are source of truth, DB for metadata/search/relationships
- Visual redesign aligned to Applyr aesthetic (Plus Jakarta Sans, indigo accent, gradient sidebar)
- Responsive layout (desktop 3-col, tablet 2-col, mobile drawer)
- PWA for add-to-home-screen on iOS/iPad
- chokidar file watcher for Obsidian/VS Code/Claude sync
- Asset browser and page status filtering (from v1.1.0 scope)
- 11 confirmed outcomes including PM lifecycle documentation and multi-device editing
- Design spec: `docs/plans/2026-03-02-knowledge-base-v2-design.md`
- Clickable prototype approved: `prototype-kb-v2.html`
  - SS42 Hub integration (rail as app switcher, HQ launcher overlay)
  - OneNote-style collapsible workspace strip (separate column between rail and sidebar)
  - WYSIWYG editor with floating toolbar and Source toggle (replaces split markdown/preview)
  - Dark/light mode toggle
  - Responsive: desktop 4-column, tablet/mobile with drawer and workspace dropdown

**Plans:**
- `docs/plans/2026-02-27-knowledge-platform-implementation-plan.md` — v1.0 build (30 tasks, completed)
- `docs/plans/2026-03-02-knowledge-base-v2-design.md` — v2.0 design spec (approved)
- `docs/plans/2026-02-27-v1.1.0-implementation.md` — SUPERSEDED by v2.0
- `docs/plans/2026-02-27-lifecycle-pattern-design.md` — lifecycle design (standalone, still valid)

## Related projects

| Project | Role |
|---|---|
| Lifeboard | Task and project tracking — will write project data into this platform |
| GitHub | Code and issue management — logs and decisions will surface here |
| Mobile capture tools | Quick input on the go — push content via API |
| Claude / AI sessions | Query this platform for context, write documentation back into it |
| SS42 HQ | Navigation anchor for the SS42 tool suite — linked from this platform's logo |
