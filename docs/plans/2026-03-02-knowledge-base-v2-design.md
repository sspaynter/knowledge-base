# Knowledge Base v2.0 — Design Specification

**Date:** 2026-03-02
**Status:** Approved
**Author:** Simon Paynter + Claude
**Supersedes:** `2026-02-27-knowledge-base-redesign.md` (v1.0 spec), `kp-v1.1.0-scope.md` (v1.1 plan)

---

## Overview

A major rebuild of the Knowledge Base from a DB-as-source model to a vault-as-source model. The vault — a directory of plain markdown files — becomes the source of truth for all content. The database stores metadata, search indexes, version history, and relationship mapping. The web app reads and writes vault files, syncs the database, and provides search, navigation, and a responsive multi-device experience.

This is not an incremental update. It is a new architecture that delivers on the original design intent: a universal second brain where you own the data, any tool can read it, and the app is one of many presentation layers.

---

## 1. Confirmed Outcomes

These are the 11 outcomes this platform must deliver. Every design decision traces back to one or more of these.

| # | Outcome | What it means |
|---|---|---|
| 1 | **Single home for everything** | One place for all documentation — IT, projects, personal, product management, business, learning, blog ideas, notes. No topic restrictions. Replaces the need for OneNote, Notion, Confluence as separate stores. |
| 2 | **Organised how you think** | Hierarchical structure (workspaces, sections, pages) that mirrors how you categorise knowledge. Not organised by tool or by where it happened to land. |
| 3 | **Everything is findable** | Full-text search across all content. Metadata, filtering by workspace, section, type. Captured knowledge that cannot be found is effectively lost. |
| 4 | **AI has persistent context** | Claude and other AI tools can query your knowledge directly. No more rebuilding context every session. Write once for yourself as a human reader, and AI can access it permanently. |
| 5 | **Version history** | Know what changed, when, and why. Track evolution of decisions, skills, configs, and documentation over time. |
| 6 | **Ecosystem mapping** | Understand how things connect — tools, services, skills, configs, projects. A queryable map of relationships, not just a list of documents. |
| 7 | **Hub for tool integration** | Other tools (Todo app, GitHub, mobile capture, Claude sessions) can write into and read from this platform. Single integration point. |
| 8 | **Product management lifecycle** | Full PM documentation capability — specs, briefs, roadmaps, user journeys, decision records, release notes. Not just note-taking — structured product work. |
| 9 | **You own the data** | No lock-in. Content is plain markdown. Any tool can read it. The app is one presentation layer over data you control. |
| 10 | **Controlled sharing** | Role-based access. Share specific workspaces or content with others without giving access to everything. |
| 11 | **Works on every device** | Viewable and editable on desktop, iPad (landscape primary), and mobile. PWA for add-to-home-screen native feel. |

---

## 2. Content Architecture

**The rule:** Vault markdown files are the source of truth for all content. The database is the metadata, search, and relationship layer.

### What lives where

| Vault (files) | Database |
|---|---|
| Page content (markdown body) | Page metadata (title, slug, section, status, sort order, created_by) |
| Asset content (skill files, configs, decisions) | Asset metadata (type, description, file_path, url) |
| Folder structure = information architecture | Workspace and section definitions |
| | Content cache (synced copy for full-text search) |
| | Search indexes (tsvector) |
| | Version history (asset_versions snapshots) |
| | Relationships (asset_relationships graph) |
| | Users, sessions, tokens, settings |
| | Templates (default content scaffolds) |
| | Page-asset junction (page_assets) |
| | Previous paths (for move resolution) |

### Sync model

1. **App writes:** User saves in the app → app writes `.md` file to vault → updates `content_cache` and `search_vector` in DB
2. **External edits:** User edits in Obsidian/VS Code/Claude → `chokidar` file watcher detects change → reads file → updates `content_cache` and `search_vector` in DB
3. **New files:** If a new `.md` file appears in the vault, the file watcher creates a new `pages` record in DB with metadata inferred from the file path
4. **Deleted files:** If a file is removed from the vault, the watcher soft-deletes the corresponding DB record. Version history in `asset_versions` is preserved.

### Pages table changes

| Column | Purpose |
|---|---|
| `file_path` | Path relative to vault root — e.g. `it-and-projects/claude/skills/simon-context.md` |
| `content_cache` | Synced copy of file content — used for search and fast rendering. NOT the source of truth. |
| `search_vector` | Generated from `content_cache` — powers full-text search |
| `previous_paths` | JSONB array — stores old file paths when a page is moved. Enables path resolution for stale references. |

---

## 3. Information Architecture

### Hierarchy

```
Workspaces  →  Sections  →  Pages  →  Child pages (no depth limit)
```

### Vault-to-DB mapping

| Vault | DB |
|---|---|
| Top-level folder (e.g. `work/`) | `workspaces` row |
| Subfolder (e.g. `work/job-search/`) | `sections` row |
| `.md` file (e.g. `work/job-search/scoring-pipeline.md`) | `pages` row with `file_path` |
| Nested folder (e.g. `projects/knowledge-base/`) | Child pages with `parent_id` |

### Current vault structure (starting point)

```
vault/
├── Home.md
├── it-and-projects/
│   ├── claude/
│   ├── infrastructure/
│   └── projects/
│       ├── knowledge-base/
│       ├── lifeboard/
│       └── simonsays42/
├── work/
│   ├── engineering-practice/
│   └── job-search/
├── personal/
└── learning/
```

Workspaces and sections are fully user-defined. New ones are created by adding folders (via the app or manually). The app creates the corresponding DB records on detection.

### Move handling

When a page is moved in the app:
1. App moves the `.md` file to the new vault folder
2. App appends the old `file_path` to `previous_paths` JSONB array
3. App updates `file_path`, `section_id`, and `parent_id` in the DB
4. All API-based references (by `id`) continue to work unchanged
5. `GET /api/pages/by-path?path=...` checks current paths first, then `previous_paths` across all pages

For Claude direct file reads: Claude can search via the REST API (`GET /api/search?q=...`) to find the current location of any doc.

---

## 4. Write Paths

### 1. Simon via web app (browser)

```
Open page → App reads .md file from vault → renders in editor
Edit → Save → App writes updated .md file to vault
              → App updates content_cache + search_vector in DB
              → Creates asset_versions snapshot with change_summary
```

### 2. Simon via Obsidian / VS Code

```
Edit .md file directly → save
chokidar file watcher detects change
  → Reads new file content
  → Updates content_cache + search_vector in DB
  → Creates asset_versions snapshot (change_summary: "External edit detected")
```

New files detected by watcher:
- Infers workspace/section from folder path
- Creates pages record with file_path, title (from filename or H1), status: draft
- Syncs content_cache + search_vector

### 3. Claude sessions

**Option A — Direct file write (preferred for bulk updates):**
Claude writes/updates `.md` file in vault → file watcher syncs DB automatically.
Or Claude calls `POST /api/sync { file_path: "..." }` for immediate sync.

**Option B — API-only write (preferred for structured operations):**
Claude calls `POST /api/pages { title, section_id, content, template_type }`.
API writes `.md` file to vault at the correct path, creates/updates DB record.

### 4. External tools (Todo app, GitHub, mobile capture)

External tool calls `POST /api/pages` or `POST /api/assets` via bearer token.
API writes `.md` file to vault, creates/updates DB record. Same path as Claude Option B.

### Conflict handling (v1)

Last write wins. File watcher debounces changes (500ms). Both versions captured in `asset_versions`. Acceptable for a single-user system.

---

## 5. UI Design

### Visual direction

Aligned to the Applyr aesthetic — part of the SS42 suite design system:

| Element | Value |
|---|---|
| Primary font | Plus Jakarta Sans (replaces DM Sans + Lora) |
| Mono font | JetBrains Mono (code, metadata, paths) |
| Accent colour | Indigo palette (replaces teal) |
| Sidebar | Dark gradient (matching Applyr) |
| Icons | Lucide icon set |
| Overall feel | Modern, open, clean — generous spacing for large screens |

Article body content: max-width ~700px for readability. Layout around it breathes with generous spacing.

**ADR-006 (Lora serif body) is superseded** by suite-wide visual consistency.

### Responsive layout

**Desktop (1024px+):**
```
[Rail 54px] [Sidebar 244px] [Content pane flex]
```

**Tablet / iPad portrait (768px–1023px):**
```
[Sidebar 244px, toggle-able] [Content pane flex]
```
Rail collapses into sidebar (workspace selector becomes dropdown). Sidebar toggles with hamburger.

**Mobile (below 768px):**
```
[Content pane full-width]
```
Navigation behind slide-out drawer. Simplified top bar. Single-view editor (toggle edit/preview, no split).

**iPad landscape (1024px+):** Gets the full desktop three-column layout.

### PWA

- Web manifest for add-to-home-screen on iOS and Android
- Full-screen mode (no browser chrome)
- Service worker for offline reading (cache pages on visit)
- Offline editing deferred to v2 (read-only cache in v1)

### Editor

| Device | Editor behaviour |
|---|---|
| Desktop | Split view: markdown left, live preview right. Auto-save every 30s. |
| Tablet | Same as desktop, or full-width toggle |
| Mobile | Single view: toggle between edit mode and preview mode |

**Diagram rendering:** Mermaid code blocks render as interactive SVG diagrams in the preview pane and reading view. In WYSIWYG mode, diagrams display as rendered SVGs with click-to-edit. See §15 for full diagramming design.

### Search

- Global search (Cmd+K / tap search icon): full-screen overlay
- Results: title, breadcrumb path, content excerpt with highlights
- Filters by workspace, section, asset type
- PostgreSQL tsvector full-text search against content_cache
- Debounced input (280ms)

### Map view

Filterable table showing `asset_relationships`:
- Columns: From, Relationship type, To, Notes
- Filter by asset type, relationship type, workspace/project
- Auto-generated visual graph view deferred to v3 (user-created diagrams via Mermaid are in v2.0 — see §15)

---

## 6. Integrations

| Tool | Method | What it does |
|---|---|---|
| Claude Code | Direct vault file read/write + REST API | Read docs by path. Write session docs. Search via API. Create relationships via API. |
| Todo app | REST API (bearer token) | Push project updates, task completions into KB pages |
| GitHub | REST API (bearer token) | Push release notes, issue summaries into KB pages |
| Mobile capture | REST API (bearer token) | Quick notes land in `personal/inbox/` section for later processing |
| Obsidian | Direct vault file access | Read and edit any doc. Changes sync via file watcher. |

The REST API with bearer token is the universal integration point for all external tools.

**Inbox pattern:** A designated section (`personal/inbox/`) receives mobile captures and unsorted notes. Process later — move to the right workspace/section, add metadata, link to other docs.

---

## 7. Data Migration (v1.0 → v2.0)

### Preserve everything

1. **Vault files (16 docs):** Already in place. Become the source of truth.
2. **DB content (v1.0 pages):** Export any pages that do not already have corresponding vault files → write as `.md` files to the correct vault paths.
3. **DB assets (17 NocoDB migrated + any new):** Export content to vault files. Update `file_path` column.
4. **Schema changes:** Add `file_path`, `content_cache`, `previous_paths` columns to `pages`. Rename/repurpose `content` → `content_cache` semantically.
5. **Rebuild indexes:** Populate `content_cache` from vault files. Regenerate `search_vector`.
6. **Workspaces and sections:** Reconcile DB records with vault folder structure. Create any missing.
7. **Relationships, versions, users, tokens, settings:** Unchanged — these are DB-only and carry forward.

No data loss. The vault gains files. The DB gains columns. Everything else carries forward.

---

## 8. What Stays from v1.0

| Component | Notes |
|---|---|
| Express backend (Node 20 + Express 4 + CommonJS) | Same framework |
| PostgreSQL schema (12 tables, `knowledge_base`) | Same structure, minor column additions |
| Auth layer (session cookies + bearer tokens) | Unchanged |
| REST API endpoints | Same routes, new parameters for vault operations |
| Search (tsvector full-text) | Identical user experience, data source changes |
| Map view (filterable relationship table) | Unchanged |
| Settings / Admin | Unchanged |
| CI/CD (GitHub Actions → GHCR → Watchtower) | Unchanged |
| Test suite (Jest + Supertest) | Extended for vault sync tests |

## 9. What Changes

| Component | v1.0 | v2.0 |
|---|---|---|
| Content source | DB `content` column | Vault `.md` files (DB has `content_cache`) |
| Write path | API writes to DB | API writes `.md` file → syncs DB |
| External edits | Not supported | chokidar file watcher syncs DB |
| Visual design | DM Sans + Lora, teal, editorial | Plus Jakarta Sans, indigo, gradient sidebar, Applyr-aligned |
| Responsive | Desktop only (fixed three-column) | Desktop + tablet + mobile (three breakpoints) |
| PWA | No | Yes — add-to-home-screen, offline reading |

## 10. What Is New

| Feature | Description |
|---|---|
| Vault sync engine | chokidar watcher + sync logic: detect changes → update DB cache → index |
| By-path API endpoint | `GET /api/pages/by-path?path=...` — resolves current and previous paths |
| Sync trigger endpoint | `POST /api/sync` — Claude calls for immediate sync after file writes |
| PWA manifest + service worker | Offline reading, add-to-home-screen, full-screen mode |
| Responsive CSS | Media queries for three breakpoints |
| Mobile drawer navigation | Slide-out sidebar for mobile/tablet |
| Inbox section | `personal/inbox/` for mobile capture landing zone |
| Asset browser | Browse all assets regardless of page linkage (from v1.1.0 scope) |
| Page status filtering | Draft/archived pages filtered in nav by role (from v1.1.0 scope) |
| Mermaid.js diagramming | Embedded diagrams in markdown — flowcharts, architecture, mindmaps, sequences, state machines. See §15. |
| Diagram templates | Pre-built starting points for infrastructure maps, data flows, agent hierarchies, and more |
| Diagram export | Copy SVG to clipboard or download PNG for use in presentations and external docs |

## 11. Out of Scope (Deferred)

| Feature | Deferred to |
|---|---|
| Visual graph map view (auto-generated from asset_relationships) | v3 — distinct from user-created Mermaid diagrams which are in v2.0 |
| Excalidraw freeform canvas | v2.1 — lightweight embeddable canvas for freeform visual work. See §15 stretch. |
| Auto-generated diagrams from `.claude/` directory | v2.1+ — scan agent/skill structure and generate hierarchy diagrams automatically |
| Visual drag-and-drop diagram editor | v3 — Excalidraw or similar for visual diagram creation |
| Drag-to-reorder in sidebar | v3 |
| Per-workspace role assignment | v3 |
| Page restore UI | v3 |
| OneNote sync | v3 |
| Comments on pages | v3 |
| Public/shareable links | v3 |
| Offline editing with sync-on-reconnect | v3 |
| Native iOS/Android apps | v3+ (PWA is the v2 mobile story) |

---

## 12. Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Runtime | Node.js 20 (Alpine Docker) | Unchanged |
| Framework | Express 4 (CommonJS) | Unchanged |
| Database | PostgreSQL via `pg` | `knowledge_base` schema in n8n-postgres |
| Auth | bcryptjs + cookie-parser | Unchanged |
| Frontend | Vanilla JS ES6 modules | Unchanged — no bundler |
| Icons | Lucide (CDN or bundled) | Unchanged |
| Markdown | marked + DOMPurify | Unchanged |
| Diagrams | Mermaid.js (CDN or bundled) | New — renders fenced `mermaid` code blocks as SVG diagrams |
| Fonts | Plus Jakarta Sans, JetBrains Mono | Via Google Fonts CDN |
| File watcher | chokidar | New — monitors vault for external edits |
| CI/CD | GitHub Actions → GHCR | Unchanged |
| Hosting | QNAP NAS, Cloudflare tunnel | kb.ss-42.com |
| Vault volume | Docker volume | NAS path → container `/app/vault/` |
| Uploads volume | Docker volume | NAS path → container `/app/uploads/` |

---

## 13. Deployment

Same as v1.0 deployment model. Production at `kb.ss-42.com`. Staging at `kb-staging.ss-42.com` (to be set up as part of the build).

### Docker volumes (new)

The vault directory must be bind-mounted into the container:
```
NAS: /share/CACHEDEV1_DATA/Container/knowledge-base/vault/ → /app/vault/:rw
NAS: /share/CACHEDEV1_DATA/Container/knowledge-base/uploads/ → /app/uploads/:rw
```

The chokidar watcher monitors `/app/vault/` inside the container.

---

## 14. Build Context

When implementing this spec, load the following skills:

| Skill | What it covers |
|---|---|
| `nas-ops` | QNAP NAS network config, containers, Cloudflare subdomains |
| `nas-deploy` | Container deployment playbooks and procedures |
| `infra-context` | Full stack awareness — databases, networking, services |
| `code-quality` | Coding standards |
| `simon-context` | Working style, communication preferences |

### Key environment facts

- **Database host (NAS internal):** `10.0.3.12:5432`
- **Database host (local dev):** `192.168.86.18:32775`
- **Database name:** `nocodb`
- **Schema:** `knowledge_base`
- **Production URL:** `kb.ss-42.com`
- **Container registry:** `ghcr.io/sspaynter/knowledge-base`

---

## 15. Diagramming

Diagramming is a first-class content type. Diagrams live inside vault markdown files as text, render as interactive SVGs in the browser, and can be created or updated by Claude.

### Core: Mermaid.js (v2.0 launch)

Mermaid.js is the diagramming engine. It follows the same pattern as the rest of the KB: text in the vault, rendered in the app.

**How it works:**
1. Author writes a fenced code block with language `mermaid` in any markdown page
2. The markdown renderer detects `mermaid` blocks and passes them to the Mermaid.js library
3. Mermaid renders the block as an inline SVG diagram
4. The diagram is interactive: hover states on nodes, click-to-zoom on complex diagrams

**Why Mermaid:** Text-based diagrams are the industry standard for documentation platforms. GitHub renders Mermaid natively in markdown. Notion, Obsidian, and Confluence all support it. The text format means diagrams are version-controllable, diffable, and Claude can generate and update them programmatically.

### Supported diagram types

| Mermaid type | Use case | Example |
|---|---|---|
| `flowchart` (LR/TB/RL/BT) | Process flows, data pipelines, decision trees | Scoring pipeline, deployment flow |
| `mindmap` | Hierarchical structures, taxonomies | Claude agent/skill tree, project structure |
| `sequenceDiagram` | Interaction flows between components | API call sequences, webhook chains |
| `stateDiagram-v2` | State machines, lifecycle tracking | Job application status lifecycle |
| `C4Context` / `C4Container` | Architecture diagrams (C4 model) | Infrastructure map, service topology |
| `classDiagram` | Structure and relationships | Data model, schema relationships |
| `erDiagram` | Entity-relationship diagrams | Database schema documentation |
| `gantt` | Timeline and scheduling | Project roadmaps, phase planning |
| `pie` | Distribution and proportions | Scoring breakdowns, category splits |

### Editor integration

**Reading view:**
- Mermaid blocks render as SVG diagrams inline with page content
- Diagrams respect dark/light mode (Mermaid theme switches with app theme)
- Hover on diagram shows a toolbar: **Copy SVG**, **Download PNG**, **Edit source**

**WYSIWYG editing:**
- Mermaid blocks display as rendered diagrams (not raw code)
- Click a diagram → expands to a code editor panel below the diagram with live preview above
- Changes in the code editor update the preview in real time (debounced 500ms)
- Click outside or press Escape → collapses back to rendered diagram

**Source editing:**
- Standard markdown code fence — edit the Mermaid syntax directly
- No special handling needed; diagrams render when switching to reading view

**Insert diagram:**
- Editor toolbar includes an "Insert Diagram" button (graph icon)
- Opens a template picker with pre-configured starting points for each diagram type
- Selecting a template inserts a populated code fence that the user can modify

### Diagram templates

Pre-built starting points for common documentation patterns. These are inserted via the toolbar and customised by the user (or Claude).

| Template name | Mermaid type | Pre-populated with |
|---|---|---|
| Infrastructure Map | C4Container | Service boxes, database cylinders, external systems, connection arrows |
| Data Flow | flowchart LR | Input → process → decision → output pattern |
| Component Diagram | flowchart TB | Top-level system with sub-components and connections |
| Agent Hierarchy | mindmap | Root node with category branches and leaf items |
| Sequence Flow | sequenceDiagram | Three participants with request/response arrows |
| State Lifecycle | stateDiagram-v2 | States with transitions and conditions |
| Database Schema | erDiagram | Three entities with relationships |

### Claude integration

Because diagrams are text in markdown files, Claude can:
- **Generate diagrams** from descriptions ("create an architecture diagram of my NAS infrastructure")
- **Update existing diagrams** by editing the Mermaid code block in the vault file
- **Read and understand diagrams** for context when working on related documentation
- **Create documentation pages with embedded diagrams** via the REST API or direct file write

No special API or integration is needed. Diagrams use the same vault write paths as all other content (§4).

### Export

- **Copy SVG:** Copies the rendered diagram SVG to clipboard (for pasting into presentations, docs)
- **Download PNG:** Renders the SVG to a canvas and downloads as PNG at 2x resolution
- Both options available via the hover toolbar on any rendered diagram

### Stretch: Excalidraw freeform canvas (v2.1)

For freeform visual work (brainstorming, rough sketches, custom layouts), Excalidraw can be embedded as a canvas component in a future release.

**Planned approach:**
- `.excalidraw` JSON files stored in the vault alongside `.md` files
- Pages can embed an Excalidraw canvas via a custom markdown directive or dedicated page type
- Excalidraw's lightweight embeddable library (~800KB) renders the canvas
- Edit in-place within the KB, no external tool needed

This is **not in scope for v2.0 launch** but is the planned next step for visual documentation after Mermaid is established.

---

## 16. Next Step

**Completed:**
- Clickable prototype built and approved (session 23)
- Diagramming capability designed and prototyped (session 25) — §15 added, prototype updated with 4 live Mermaid diagrams, template picker, Map diagram view

**Next:** Write implementation plan using `superpowers:writing-plans`.
