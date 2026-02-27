# Knowledge Base — Build Plan

**Last updated:** 2026-02-27
**Session:** Design spec session — COMPLETED

---

## Status

| Phase | Status | Notes |
|---|---|---|
| Design spec | ✅ COMPLETED | `docs/plans/2026-02-27-knowledge-base-redesign.md` |
| Visual preview | ✅ COMPLETED | `preview.html` — approved design |
| Implementation plan | ⏳ PENDING | To be written in next session using `superpowers:writing-plans` |
| Build | ⏳ PENDING | After implementation plan is written |

---

## What was decided in the 2026-02-27 design session

### The concept changed significantly

The original v0.1 was a flat document browser. The redesign is a **Confluence/Notion-style documentation portal AND system map**.

Key shift: the Knowledge Base is not just for reading docs — it maps how everything in Simon's environment interconnects. Skills, agents, projects, containers, integrations. The relationship layer is what makes it valuable.

### Architecture decisions

1. **Full redesign** (Approach C) — not an incremental update to v0.1
2. **Three-level navigation**: Workspaces → Sections → Pages (like OneNote notebooks → sections → pages)
3. **New PostgreSQL schema** `knowledge_base` in existing n8n-postgres container, dedicated `kb_app` user
4. **Claude writes via REST API** with bearer token — not NocoDB API (NocoDB is no longer needed for KB)
5. **Assets separate from pages** — pages are the documentation surface, assets are the raw data layer
6. **Relationship mapping** — `asset_relationships` table tracks how skills, agents, configs, projects interconnect
7. **Auto-generated content** — ~90% of content written by Claude sessions, 10% human narrative

### Data model (new `knowledge_base` schema)

Tables: `workspaces`, `sections`, `pages`, `assets`, `asset_versions`, `page_assets`, `asset_relationships`, `templates`, `api_tokens`, `users`, `user_sessions`

Key addition from late in session: `asset_relationships` table — tracks `loads`, `uses`, `generates`, `deploys-to`, `connects-to`, `supersedes`, `references` relationships between assets.

### Visual design (approved)

- **Aesthetic**: Refined dark utility, Apple-esque polish
- **Fonts**: DM Sans (UI), Lora serif (body content), JetBrains Mono (metadata/code)
- **Accent**: Teal `#2dd4bf` (dark) / `#0d9488` (light)
- **Icons**: Lucide icon set throughout — no emoji
- **Light/dark toggle**: CSS custom properties on `data-theme` attribute
- **Logo mark**: SS42 "42" SVG mark — links to internal HQ hub (`HQ_URL` env var)

### External integrations (v1 scope)

- Miro: iframe embed (store URL as miro asset)
- OneNote: links only, no API sync
- Images: upload and serve locally
- HQ hub: logo mark links to internal subdomain (not ss-42.com public site)

### Map view

- v1: filterable table showing asset relationships
- v2 (future): visual node-link graph

---

## Next session kickoff prompt

Open a new Claude Code session in `~/Documents/Claude/knowledge-base/` and use:

> Read `docs/plans/2026-02-27-knowledge-base-redesign.md` — this is the fully approved design spec for a complete rebuild of the Knowledge Base app. I want to write the implementation plan and then build it. Use the `superpowers:writing-plans` skill to create the implementation plan first, saved to `docs/plans/`.

---

## Key reference files

| File | Purpose |
|---|---|
| `docs/plans/2026-02-27-knowledge-base-redesign.md` | Full approved design spec — single source of truth |
| `preview.html` | Approved visual design mockup |
| `CLAUDE.md` | Project context, tech stack, DB connection details |

---

## Open questions for next session

1. What is the PostgreSQL superuser password for n8n-postgres? (Needed to create the schema and `kb_app` user — check via `docker inspect nocodb` on NAS)
2. What port does n8n-postgres expose externally on the NAS? (Needed for migration runner)
3. What will the HQ hub subdomain be? (Needed for `HQ_URL` env var)
4. Does NocoDB need to stay running after the KB migration, or can it be decommissioned? (Job tracker data still uses NocoDB)
