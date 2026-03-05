---
title: Master Todo Viewer
status: published
order: 10
author: claude
created: 2026-03-04
updated: 2026-03-04
---

# Master Todo Viewer

A zero-dependency Node.js server that reads `MASTER-TODO.md` and renders a live dashboard in the browser. Built as a stopgap visibility tool until the ToDo app is production-ready.

## Quick Start

```bash
node ~/Documents/Claude/todo-viewer/server.js
# Open http://localhost:3333
```

Press `R` in the browser to refresh after any update to `MASTER-TODO.md`.

## What It Does

- Parses `MASTER-TODO.md` on every request (no caching, always fresh)
- Serves a dark-themed single-page dashboard at `localhost:3333`
- Four views: Tasks, Dependencies, Big Picture, Completed
- Filters by project (9 projects) and priority (P1/P2/P3)
- Task cards are colour-coded by priority with click-to-expand detail
- Dependency map and sequencing diagram rendered as preformatted text

## Architecture

Two files, no dependencies:

| File | Purpose |
|---|---|
| `server.js` | Node HTTP server, markdown parser, serves `index.html` and `/api/todos` JSON endpoint |
| `index.html` | Dashboard UI — vanilla JS with DOM-only rendering (no innerHTML) |

The server reads `../MASTER-TODO.md` relative to its own directory. The parser extracts tables by section (Big Picture, P1, P2, P3, Completed) and code blocks (Dependencies Map, Current Sequencing).

### API

`GET /api/todos` returns parsed JSON:

```json
{
  "bigPicture": [...],
  "active": { "P1": [...], "P2": [...], "P3": [...] },
  "completed": [...],
  "dependenciesMap": "...",
  "sequencing": "...",
  "stats": { "total": 26, "p1": 5, "p2": 13, "p3": 8, "completed": 19, "projects": [...] }
}
```

## Design Decisions

- **Zero dependencies** — Node built-in `http` and `fs` only. No Express, no build step, no npm install.
- **Read on every request** — MASTER-TODO.md is small. Re-reading it on each API call keeps the viewer always current without file watchers or websockets.
- **DOM-only rendering** — all HTML construction uses `document.createElement` and `textContent`. No innerHTML, consistent with SS42 project security conventions.
- **Embedded in server vs separate HTML** — chose separate `index.html` for easier editing. Server reads it from disk.
- **Port 3333** — avoids conflict with KB (3000), Applyr (3001), ToDo (3002). Configurable via CLI argument: `node server.js 4000`.

## Lifecycle

This tool is intentionally temporary. Once the ToDo app is live with cross-project task management, this viewer will be retired. Until then it provides daily visibility into what is active, blocked, and completed across all SS42 projects.

## Source

`~/Documents/Claude/todo-viewer/` (not a git repo — two files, disposable)
