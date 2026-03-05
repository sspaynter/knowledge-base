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

- Not a task manager — that is To Do
- Not a code repository — that is GitHub
- Not a flat record browser (the old v0.1 model)
- Not a replacement for specialised creative tools

## Scope

**Version 1 (this project):** Personal, self-hosted on QNAP NAS. Multi-user with roles (admin/editor/viewer). Full feature set. Reference implementation.

**Version 2 (future):** Cut-down portable build on Notion or equivalent. For others to adopt without running infrastructure. Informed by Version 1.

## Current state

**Version:** v2.1.1 — live at `kb.ss-42.com`
**Staging:** `kb-staging.ss-42.com`
**Released:** 2026-03-05

**Architecture:**
- Vault-as-source — markdown files are source of truth, DB for metadata/search/relationships
- Three-layer content fallback: vault file → content_cache → DB content column
- chokidar v5 file watcher for Obsidian/VS Code/Claude sync
- API-first vault sync via `kb-sync.sh` (push) and `kb-pull.sh` (pull)
- Visual design aligned to Applyr aesthetic (Plus Jakarta Sans, indigo accent, gradient sidebar)
- Responsive layout (desktop 3-col, tablet 2-col, mobile drawer)
- PWA for add-to-home-screen on iOS/iPad
- No innerHTML — DOM APIs only (DOMParser for markdown rendering)

**Key capabilities:**
- Workspace/section/page hierarchy with drag-to-reorder
- Markdown editor with toolbar (bold/italic/heading/link/code/list), split/source mode
- Mermaid.js diagramming with click-to-edit, live preview, 7 templates, SVG/PNG export
- Full-text search across all content
- Asset browser with type filter and linked pages
- Page versioning (50-version history with restore)
- Dark/light mode with Mermaid theme sync
- App rail (SS42 switcher: KB, To Do, Applyr)
- Google OAuth SSO shared across SS42 apps (`.ss-42.com` cookie domain)
- API token auth for Claude/automation access
- Cloudflare Access bypass for `/api/*` paths

**Release history:** See `products/knowledge-base/releases/` for per-version notes.

**Plans:**
- `docs/plans/2026-02-27-knowledge-platform-implementation-plan.md` — v1.0 build (30 tasks, completed)
- `docs/plans/2026-03-02-knowledge-base-v2-design.md` — v2.0 design spec (approved)
- `docs/plans/2026-03-04-getpagetree-hierarchy-fix.md` — v2.1.1 bug fix plan

## Related projects

| Project | Role |
|---|---|
| To Do | Task and project tracking — will write project data into this platform |
| GitHub | Code and issue management — logs and decisions will surface here |
| Mobile capture tools | Quick input on the go — push content via API |
| Claude / AI sessions | Query this platform for context, write documentation back into it |
| SS42 HQ | Navigation anchor for the SS42 tool suite — linked from this platform's logo |
