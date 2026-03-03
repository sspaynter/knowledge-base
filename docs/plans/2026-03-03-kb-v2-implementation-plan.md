# Knowledge Base v2.0 — Implementation Plan

**Date:** 2026-03-03
**Design Spec:** `docs/plans/2026-03-02-knowledge-base-v2-design.md`
**Status:** Phase 1 + Phase 2 + Phase 3 COMPLETE — deployed to staging

---

## Build Log

### Phase 1 — COMPLETED (session 28, 2026-03-03)

All 18 tasks completed. Vault sync engine running, pages served from vault files, Mermaid diagrams rendering, new indigo visual design applied, staging deployed.

**Files created/modified:**
- `scripts/migrations/002_vault_columns.sql` — adds file_path, content_cache, previous_paths columns
- `services/vault-config.js` — VAULT_DIR resolution and path helpers
- `services/vault-sync.js` — chokidar file watcher + DB sync (dynamic import for ESM compat)
- `services/pages.js` — three-layer content fallback (vault → cache → content), getPageByPath
- `routes/sync.js` — POST /api/sync endpoint
- `routes/pages.js` — GET /api/pages/by-path endpoint
- `scripts/initial-vault-sync.js` — one-time vault→DB sync (17 files synced)
- `public/js/mermaid-init.js` — Mermaid.js initialization and rendering
- `public/js/content.js` — integrated Mermaid rendering after markdown pipeline
- `public/index.html` — Plus Jakarta Sans fonts, Mermaid CDN, JetBrains Mono
- `public/css/styles.css` — complete visual redesign (indigo palette, dark gradient sidebar, article typography, Mermaid diagram styling)
- `Dockerfile` — VAULT_DIR, CHOKIDAR_USEPOLLING
- `docker-compose.yml` — vault bind mount, env vars
- `.github/workflows/deploy.yml` — multi-branch build (dev→:dev, main→:latest)
- `.env.example` — VAULT_DIR documentation
- `package.json` — chokidar ^5.0.0

**Infrastructure:**
- Staging container: `knowledge-base-staging` (port 32780, NAT IP 10.0.3.16)
- Staging vault: `/share/CACHEDEV1_DATA/Container/knowledge-base-staging/vault/`
- Cloudflare tunnel: version 19, `kb-staging.ss-42.com → http://192.168.86.18:32780`
- DNS: CNAME `kb-staging` → tunnel
- Watchtower: enabled (label `com.centurylinklabs.watchtower.enable=true`)
- Git: committed to `dev` branch, pushed to origin
- CI: GitHub Actions build succeeded, image `ghcr.io/sspaynter/knowledge-base:dev`

**Key technical decisions:**
- chokidar v5 ESM-only — lazy-loaded via `await import('chokidar')` in startWatcher()
- PostgreSQL generated column — must DROP + re-ADD (cannot ALTER expression)
- Workspace alias mapping: `it-and-projects` → `it-projects` in vault-sync
- Same database for staging and production (shared `knowledge_base` schema — content is identical)
- Session secret: separate per environment

**Next:** Phase 2 (Editor + Write Paths) or Phase 3 (Layout) can start. Verify staging in browser first.

---

### Phase 2 — COMPLETED (session 30, 2026-03-03)

All 9 tasks completed. Vault-first write paths, split-view editor with toolbar, Mermaid live preview, diagram template picker, click-to-edit diagrams, version snapshots.

**Files created/modified:**
- `scripts/migrations/003_page_versions.sql` — new page_versions table (50-version cap per page)
- `services/pages.js` — vault-first write on create/update, file_path generation, movePage with vault file move + previous_paths, version snapshots via createPageVersion()
- `routes/pages.js` — GET /:id/versions, POST /:id/versions/:versionId/restore
- `services/vault-sync.js` — creates version snapshot on external edit sync
- `services/shared-auth.js` — stripped [AUTH] debug console.log statements
- `routes/auth.js` — stripped [AUTH] debug console.log statements
- `public/js/editor.js` — toolbar (bold/italic/heading/link/code/list), mode toggle (split/source-only), Mermaid live preview (500ms debounce), insertAtCursor() export
- `public/js/diagram-templates.js` — 7 pre-populated Mermaid templates with dropdown picker UI
- `public/js/mermaid-init.js` — rerenderDiagram() for live update of individual diagrams
- `public/js/content.js` — setupClickToEdit() for inline Mermaid editing in reading view
- `public/index.html` — editor toolbar HTML, diagram picker container
- `public/css/styles.css` — toolbar, mode toggle, diagram picker, inline editor styles

**Key technical decisions:**
- page_versions table (separate from asset_versions — pages are not assets)
- _change_summary and _changed_by are underscore-prefixed to distinguish from page field updates
- rerenderDiagram() updates SVG in place via DOMParser (no innerHTML)
- replaceMermaidBlock() uses regex to find-and-replace specific mermaid fence in content string
- Split mode toggle uses CSS class on editor-split container (no JS layout recalc)
- Diagram picker positioned absolute below the Insert Diagram button, closed on outside-click

**Infrastructure:**
- Migration 003 applied directly to staging DB (no rollback risk — CREATE TABLE IF NOT EXISTS)
- Pushed to dev branch, GitHub Actions built :dev image, Watchtower deployed to kb-staging

---

## Phasing Strategy

Six phases, each delivering working value. This is a v1.0 → v2.0 migration — not a greenfield build. Auth, database connection, CI/CD, and the core API layer carry forward. The biggest changes are: vault-as-source (chokidar file watcher + sync), visual redesign (Applyr-aligned), responsive layout, PWA, and Mermaid diagramming.

Phase 1 is the architecture proof: vault sync running, pages served from vault files, new visual design applied, Mermaid diagrams rendering. If Phase 1 works, the rest is incremental feature delivery.

| Phase | Deliverable | Depends On |
|---|---|---|
| 1 | Vault sync engine running, page rendered from vault with new visual design, Mermaid diagrams rendering, staging deployed | — |
| 2 | Editor writes to vault, split-view editing, Mermaid click-to-edit, diagram templates, version snapshots | Phase 1 |
| 3 | Rail app switcher, sidebar overhaul, responsive three-breakpoint layout, mobile drawer | Phase 1 |
| 4 | PWA manifest + service worker, offline reading, global search overlay (Cmd+K), diagram export | Phase 2, 3 |
| 5 | v1.0 → v2.0 data migration, inbox section, asset browser, page status filtering, map view diagram toggle | Phase 1 |
| 6 | Full test suite, Dockerfile + CI updates, production deploy, verification | Phase 4, 5 |

---

## Phase 1: Vault Engine + Visual Foundation + Mermaid

**Deliverable:** The fundamental architecture change is proven. Vault sync is running — chokidar watches the vault, external edits sync to DB. Pages are served from `.md` files. The new Applyr-aligned visual design is applied. Mermaid diagrams render inline. Staging is deployed at `kb-staging.ss-42.com`.

### Task 1.1: Schema migration — vault columns

- spec: 2026-03-02-knowledge-base-v2-design.md § 2 — Content Architecture (Pages table changes)
- files: `scripts/migrations/002_vault_columns.sql`
- description: Add three columns to `knowledge_base.pages`: `file_path` (TEXT, nullable, unique — path relative to vault root), `content_cache` (TEXT — synced copy of vault file content for search), `previous_paths` (JSONB DEFAULT '[]' — stores old file paths on move). Rename semantic intent: the existing `content` column becomes the fallback for pages not yet in the vault. Add index on `file_path`. Regenerate `search_vector` to include `content_cache` when populated.
- acceptance:
  - WHEN migration runs THEN `file_path`, `content_cache`, and `previous_paths` columns exist on `pages`
  - AND `file_path` has a unique index
  - AND existing pages retain their `content` data unchanged

### Task 1.2: Vault config and chokidar dependency

- spec: 2026-03-02-knowledge-base-v2-design.md § 12 — Tech Stack
- files: `package.json`, `.env.example`, `services/vault-config.js`
- description: Add `chokidar` to package.json dependencies. Add `VAULT_DIR` to .env.example with default `/app/vault`. Create `vault-config.js` that exports: `VAULT_DIR` (from env), `resolveVaultPath(relativePath)` (joins VAULT_DIR + relative), `toRelativePath(absolutePath)` (strips VAULT_DIR prefix), `toVaultPath(filePath)` (inverse). Validate VAULT_DIR exists on startup.
- acceptance:
  - WHEN `npm install` runs THEN chokidar is installed
  - AND `resolveVaultPath('work/job-search/scoring.md')` returns `{VAULT_DIR}/work/job-search/scoring.md`
  - AND `toRelativePath('{VAULT_DIR}/work/job-search/scoring.md')` returns `work/job-search/scoring.md`

### Task 1.3: Vault sync service — file watcher

- spec: 2026-03-02-knowledge-base-v2-design.md § 2 — Content Architecture (Sync model)
- files: `services/vault-sync.js`
- description: Create vault sync service using chokidar. Watch `VAULT_DIR` for `.md` files (ignore dotfiles, node_modules). Debounce changes at 500ms. Export `startWatcher()` that returns the chokidar watcher instance. Emit structured events: `{ type: 'add'|'change'|'unlink', relativePath, absolutePath }`. Log watcher ready and each event at debug level.
- acceptance:
  - WHEN `startWatcher()` is called THEN chokidar begins watching VAULT_DIR
  - AND when a `.md` file is created in the vault THEN an `add` event is emitted within 500ms
  - AND when a `.md` file is modified THEN a `change` event is emitted
  - AND when a `.md` file is deleted THEN an `unlink` event is emitted
  - AND non-`.md` files are ignored

### Task 1.4: Vault sync DB operations

- spec: 2026-03-02-knowledge-base-v2-design.md § 4 — Write Paths (External edits, New files, Deleted files)
- files: `services/vault-sync.js` (extend)
- description: Add DB sync handlers to the vault sync service. On `change`: read file content, find page by `file_path`, update `content_cache` and `search_vector`. On `add`: read file, infer workspace/section from folder path, extract title from filename or first H1, INSERT into pages with `file_path`, `content_cache`, `search_vector`, status `draft`. On `unlink`: find page by `file_path`, soft-delete (set `deleted_at`). All operations use the existing database service and `knowledge_base` schema.
- acceptance:
  - WHEN a vault file changes THEN the corresponding page `content_cache` is updated in DB
  - AND `search_vector` is regenerated from new content
  - WHEN a new `.md` file appears THEN a new page record is created with correct `file_path`, `section_id`, and title
  - WHEN a vault file is deleted THEN the page is soft-deleted (not hard-deleted)
  - AND `asset_versions` history is preserved

### Task 1.5: Server startup — mount vault watcher

- spec: 2026-03-02-knowledge-base-v2-design.md § 2 — Content Architecture (Sync model)
- files: `server.js`
- description: After `db.init()` succeeds, call `startWatcher()` from vault-sync service. Log "Vault watcher started on {VAULT_DIR}". If VAULT_DIR is not set or does not exist, log a warning and continue without watcher (graceful degradation for dev environments without a vault).
- acceptance:
  - WHEN server starts with valid VAULT_DIR THEN "Vault watcher started" is logged
  - AND file changes in the vault are synced to DB
  - WHEN server starts without VAULT_DIR THEN a warning is logged AND server runs without watcher

### Task 1.6: POST /api/sync endpoint

- spec: 2026-03-02-knowledge-base-v2-design.md § 10 — What Is New (Sync trigger endpoint)
- files: `routes/sync.js`, `server.js`
- description: Create `POST /api/sync` route. Accepts `{ file_path: "relative/path.md" }`. Reads the vault file at that path, updates or creates the page record (same logic as the chokidar change handler). Returns `{ success: true, page_id }`. Mount in server.js. Protected by existing auth middleware. This is the endpoint Claude calls after writing a vault file directly.
- acceptance:
  - WHEN `POST /api/sync { file_path: "work/job-search/scoring.md" }` is called THEN that page's `content_cache` is updated from the vault file
  - AND response includes the `page_id`
  - WHEN file_path does not exist in vault THEN 404 is returned

### Task 1.7: GET /api/pages/by-path endpoint

- spec: 2026-03-02-knowledge-base-v2-design.md § 3 — Information Architecture (Move handling)
- files: `routes/pages.js` (extend)
- description: Add `GET /api/pages/by-path?path=relative/path.md` to the pages router. First queries `WHERE file_path = $1`. If no match, queries `WHERE previous_paths @> $1::jsonb` across all pages. Returns the full page object including content from vault file (not content_cache). If no match in either query, returns 404.
- acceptance:
  - WHEN path matches current `file_path` THEN page is returned with vault content
  - WHEN path matches a value in `previous_paths` THEN page is returned (redirect resolution)
  - WHEN path matches nothing THEN 404 is returned

### Task 1.8: Page service — read from vault

- spec: 2026-03-02-knowledge-base-v2-design.md § 9 — What Changes (Content source)
- files: `services/pages.js`
- description: Modify `getPageById` (or equivalent) to read content from the vault file when `file_path` is set. If the vault file exists, return its content. If the vault file is missing (deleted externally), fall back to `content_cache`. If neither exists, fall back to the existing `content` column. This layered fallback ensures no content is lost during migration.
- acceptance:
  - WHEN page has `file_path` and vault file exists THEN content is read from vault file
  - WHEN page has `file_path` but vault file is missing THEN `content_cache` is returned
  - WHEN page has no `file_path` THEN existing `content` column is returned (pre-migration pages)

### Task 1.9: Initial vault sync script

- spec: 2026-03-02-knowledge-base-v2-design.md § 7 — Data Migration (v1.0 → v2.0)
- files: `scripts/initial-vault-sync.js`
- description: One-time script to populate `file_path` and `content_cache` for all existing vault files. Scans the vault directory recursively for `.md` files. For each file: tries to match to an existing page by title or slug, or creates a new page record. Sets `file_path`, reads content into `content_cache`, regenerates `search_vector`. Reports: matched N, created N, unmatched N.
- acceptance:
  - WHEN script runs against the current vault (16 docs) THEN each vault file has a corresponding page record
  - AND `file_path` is set on each matched/created page
  - AND `content_cache` matches the vault file content
  - AND `search_vector` is populated

### Task 1.10: Mermaid.js library integration

- spec: 2026-03-02-knowledge-base-v2-design.md § 15 — Diagramming (Core: Mermaid.js)
- files: `public/index.html`, `public/js/mermaid-init.js`
- description: Add Mermaid.js CDN script to index.html. Create `mermaid-init.js` that initializes Mermaid with configuration: `startOnLoad: false`, theme from current app theme (default or dark). Export `renderMermaidBlocks()` function that finds all `pre > code.language-mermaid` elements, renders them as SVG using `mermaid.render()`, and replaces the code block with the rendered SVG wrapped in a `.mermaid-diagram` container div.
- acceptance:
  - WHEN page loads THEN Mermaid library is available
  - WHEN `renderMermaidBlocks()` is called THEN all mermaid code blocks are replaced with SVG diagrams
  - AND diagrams are wrapped in `.mermaid-diagram` containers

### Task 1.11: Mermaid rendering in content view

- spec: 2026-03-02-knowledge-base-v2-design.md § 15 — Diagramming (Editor integration — Reading view)
- files: `public/js/content.js`
- description: After the markdown-to-HTML rendering step in content.js (where `marked.parse` + `DOMPurify.sanitize` runs), call `renderMermaidBlocks()` on the content container. Configure `marked` with a custom renderer that wraps fenced code blocks with language `mermaid` in `<pre><code class="language-mermaid">` (standard behaviour — just ensure the class is preserved through DOMPurify).
- acceptance:
  - WHEN a page containing a mermaid code block is viewed THEN the diagram renders as an inline SVG
  - AND the SVG is visible within the page flow (not overlapping or collapsed)
  - WHEN a page has no mermaid blocks THEN rendering completes normally with no errors

### Task 1.12: CSS design tokens — new visual foundation

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Visual direction)
- files: `public/css/styles.css`
- description: Replace the existing CSS custom properties block with the new design system. Fonts: Plus Jakarta Sans (primary), JetBrains Mono (mono). Colours: indigo palette (primary-50 through primary-900, neutral scale, semantic colours). Spacing scale (4px base). Border radius tokens. Shadow tokens. Update Google Fonts import in index.html to load Plus Jakarta Sans (400, 500, 600, 700) and JetBrains Mono (400, 500). Remove DM Sans and Lora references.
- acceptance:
  - WHEN page loads THEN Plus Jakarta Sans is the body font
  - AND JetBrains Mono is used for code and metadata
  - AND indigo is the primary colour family
  - AND no references to DM Sans, Lora, or teal remain in CSS

### Task 1.13: Sidebar visual redesign

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Visual direction — Sidebar)
- files: `public/css/styles.css`, `public/index.html`
- description: Restyle the sidebar with dark gradient background (matching Applyr aesthetic). Update navigation tree: workspace headers, section items, page items with hover/active states using the new indigo accent. Active page gets a subtle indigo background highlight. Sidebar width: 244px fixed. Lucide icons for navigation items. Workspace/section collapse toggles.
- acceptance:
  - WHEN app loads THEN sidebar has dark gradient background
  - AND navigation items use the new typography and colour system
  - AND active page is highlighted with indigo accent
  - AND sidebar width is 244px

### Task 1.14: Content pane visual redesign

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Visual direction — Article body)
- files: `public/css/styles.css`
- description: Restyle the content reading view. Article body max-width ~700px centred with generous spacing. Headings: Plus Jakarta Sans semibold, clear hierarchy (h1–h4). Body text: 16px/1.6 line height. Code blocks: JetBrains Mono with subtle background. Blockquotes: left border accent. Tables: clean borders, alternating row shading. Metadata bar: JetBrains Mono small caps. Breadcrumb path above title.
- acceptance:
  - WHEN a page is viewed THEN article body is max ~700px wide and centred
  - AND headings, body text, code blocks, and tables follow the new design system
  - AND there is generous whitespace around the content area

### Task 1.15: Mermaid diagram styling

- spec: 2026-03-02-knowledge-base-v2-design.md § 15 — Diagramming (Editor integration — Reading view)
- files: `public/css/styles.css`
- description: Style `.mermaid-diagram` containers: centred, full content width, subtle border, rounded corners, padding. On hover: show a floating toolbar stub (three buttons: Copy SVG, Download PNG, Edit Source — non-functional in Phase 1, wired up in Phase 4). SVG diagrams should scale responsively within the container. Ensure Mermaid theme matches the app colour scheme (indigo accents).
- acceptance:
  - WHEN a Mermaid diagram renders THEN it is centred within the content area
  - AND has a subtle border and rounded corners
  - AND on hover a toolbar placeholder appears
  - AND the diagram scales to fit the container width

### Task 1.16: Dockerfile update — vault volume + chokidar

- spec: 2026-03-02-knowledge-base-v2-design.md § 13 — Deployment (Docker volumes)
- files: `Dockerfile`, `docker-compose.yml`
- description: Update Dockerfile: create `/app/vault` directory with correct ownership, add `VAULT_DIR=/app/vault` env var default. Update docker-compose.yml: add bind mount for vault directory (local path configurable via env var, default `./vault`), add `VAULT_DIR=/app/vault` to environment. Ensure chokidar works in Alpine (may need to set `CHOKIDAR_USEPOLLING=true` for Docker).
- acceptance:
  - WHEN `docker compose up` runs THEN vault directory is mounted at `/app/vault`
  - AND chokidar watcher detects file changes inside the container
  - AND VAULT_DIR env var is set

### Task 1.17: GitHub Actions — copy vault directory in build

- spec: 2026-03-02-knowledge-base-v2-design.md § 13 — Deployment
- files: `.github/workflows/deploy.yml`
- description: Update the deploy workflow to include the `services/vault-sync.js` and `services/vault-config.js` files in the Docker image (these are new files not in the existing COPY list). No vault content is baked into the image — the vault is mounted at runtime.
- acceptance:
  - WHEN GitHub Actions builds the image THEN all new service files are included
  - AND the image does not contain vault content (vault is a runtime volume)

### Task 1.18: Staging infrastructure setup

- spec: 2026-03-02-knowledge-base-v2-design.md § 13 — Deployment
- files: (NAS infrastructure — no code files)
- description: Set up staging environment on QNAP NAS. Create vault directory on NAS at `/share/CACHEDEV1_DATA/Container/knowledge-base-staging/vault/`. Copy current vault content into staging vault. Create container from `:dev` image with vault bind mount. Add Cloudflare tunnel route for `kb-staging.ss-42.com`. Verify health check passes.
- acceptance:
  - WHEN container starts THEN `curl https://kb-staging.ss-42.com/api/health` returns `{"status":"ok"}`
  - AND vault files are accessible inside the container at `/app/vault/`
  - AND chokidar watcher starts and detects vault files

---

## Phase 2: Editor + Write Paths

**Deliverable:** Full authoring experience. Save in the editor writes to vault files, then syncs DB. Split-view editor on desktop (markdown left, preview right). Mermaid diagrams are editable inline (click diagram → code editor panel). Insert Diagram toolbar button with template picker. Version snapshots created on every save.

### Task 2.1: Page write path — vault-first save

- spec: 2026-03-02-knowledge-base-v2-design.md § 4 — Write Paths (Simon via web app)
- files: `services/pages.js`, `routes/pages.js`
- description: Modify the page save/update flow. When saving: write `.md` file to vault at the page's `file_path`, then update `content_cache` + `search_vector` in DB, then create an `asset_versions` snapshot. If page has no `file_path` yet (pre-migration), generate one from workspace/section/title and write the file.
- acceptance:
  - WHEN a page is saved via the API THEN the vault `.md` file is written
  - AND `content_cache` matches the vault file
  - AND an `asset_versions` snapshot is created with `change_summary`
  - WHEN saving a page without `file_path` THEN a file_path is generated and the file is created

### Task 2.2: New page creation — vault file + DB record

- spec: 2026-03-02-knowledge-base-v2-design.md § 4 — Write Paths (Simon via web app)
- files: `services/pages.js`, `routes/pages.js`
- description: When creating a new page via the API, generate `file_path` from workspace folder + section folder + slugified title + `.md`. Write the initial `.md` file to vault. Create the DB record with `file_path`, `content_cache`, `search_vector`. If a file already exists at that path, append a numeric suffix.
- acceptance:
  - WHEN a new page is created THEN a `.md` file exists in the vault at the correct path
  - AND the DB record has `file_path` set
  - WHEN a file collision occurs THEN the filename gets a numeric suffix (e.g. `page-2.md`)

### Task 2.3: Page move — vault file + previous_paths

- spec: 2026-03-02-knowledge-base-v2-design.md § 3 — Information Architecture (Move handling)
- files: `services/pages.js`
- description: When a page is moved (section_id or parent_id changes), move the vault `.md` file to the new directory path. Append the old `file_path` to `previous_paths` JSONB array. Update `file_path` to the new location. Create parent directories if needed.
- acceptance:
  - WHEN a page is moved to a different section THEN the vault file is at the new path
  - AND the old path is in `previous_paths`
  - AND `GET /api/pages/by-path` with the old path still resolves the page

### Task 2.4: Page delete — vault soft-delete

- spec: 2026-03-02-knowledge-base-v2-design.md § 2 — Content Architecture (Sync model — Deleted files)
- files: `services/pages.js`
- description: When a page is soft-deleted via the API, do NOT delete the vault file. Set `deleted_at` in DB. Leave the vault file in place (user can manually clean up or restore). If the page is restored (deleted_at set back to NULL), the vault file is already there.
- acceptance:
  - WHEN a page is soft-deleted THEN the vault `.md` file still exists
  - AND the page is excluded from navigation queries
  - AND `asset_versions` history is preserved

### Task 2.5: Editor split-view layout

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Editor)
- files: `public/js/editor.js`, `public/css/styles.css`
- description: Redesign the editor for desktop split-view: markdown source on the left, live preview on the right. Auto-save every 30 seconds. Preview updates on keystroke (debounced 500ms). Toolbar above the editor with formatting buttons. Tab to switch between split and full-width source modes.
- acceptance:
  - WHEN editing on desktop THEN split view shows markdown left and preview right
  - AND preview updates within 500ms of typing
  - AND auto-save fires every 30 seconds
  - WHEN user toggles full-width THEN the preview pane hides

### Task 2.6: Editor — Mermaid live preview

- spec: 2026-03-02-knowledge-base-v2-design.md § 15 — Diagramming (Editor integration — WYSIWYG editing)
- files: `public/js/editor.js`, `public/js/mermaid-init.js`
- description: In the preview pane, Mermaid code blocks render as SVG diagrams (reuse `renderMermaidBlocks()`). In the source pane, Mermaid blocks display as regular code. When the user types inside a mermaid fence, the preview diagram updates in real time (debounced 500ms).
- acceptance:
  - WHEN editing a page with a mermaid block THEN the preview pane shows the rendered diagram
  - AND changes to mermaid syntax update the preview within 500ms
  - WHEN mermaid syntax is invalid THEN an error message renders in the diagram area (not a crash)

### Task 2.7: Editor — click-to-edit Mermaid diagrams

- spec: 2026-03-02-knowledge-base-v2-design.md § 15 — Diagramming (Editor integration — WYSIWYG editing)
- files: `public/js/editor.js`, `public/css/styles.css`
- description: In the reading/preview view, clicking a rendered Mermaid diagram expands a code editor panel below it. The panel shows the Mermaid source with syntax highlighting. Live preview above updates as the user types (debounced 500ms). Click outside or press Escape to collapse back to the rendered diagram. Changes are written back to the markdown source.
- acceptance:
  - WHEN a user clicks a diagram THEN a code editor panel appears below it
  - AND the Mermaid source is editable
  - AND changes update the diagram preview in real time
  - WHEN Escape is pressed THEN the panel collapses and the diagram shows the updated rendering

### Task 2.8: Insert Diagram toolbar button + template picker

- spec: 2026-03-02-knowledge-base-v2-design.md § 15 — Diagramming (Insert diagram, Diagram templates)
- files: `public/js/editor.js`, `public/js/diagram-templates.js`, `public/css/styles.css`
- description: Add an "Insert Diagram" button (graph icon from Lucide) to the editor toolbar. Clicking opens a dropdown/modal showing the 7 diagram templates from §15: Infrastructure Map, Data Flow, Component Diagram, Agent Hierarchy, Sequence Flow, State Lifecycle, Database Schema. Each template shows a label and brief description. Selecting inserts a pre-populated mermaid code fence at the cursor position.
- acceptance:
  - WHEN "Insert Diagram" is clicked THEN template picker appears with 7 options
  - WHEN a template is selected THEN a pre-populated mermaid code fence is inserted at the cursor
  - AND the inserted template matches the definitions in §15

### Task 2.9: Version snapshots on save

- spec: 2026-03-02-knowledge-base-v2-design.md § 4 — Write Paths (asset_versions snapshot)
- files: `services/assets.js` (extend), `services/pages.js`
- description: On every page save (both via editor and via external sync), create an `asset_versions` row with: content snapshot, change_summary (user-provided or "External edit detected" for watcher syncs), timestamp. Limit: keep last 50 versions per page (delete oldest beyond 50).
- acceptance:
  - WHEN a page is saved via the editor THEN an `asset_versions` row is created
  - WHEN a page is synced from external edit THEN a version is created with "External edit detected"
  - AND no page has more than 50 version rows

---

### Phase 3 — COMPLETED (session 31, 2026-03-03)

All 6 tasks completed. App rail repurposed as SS42 suite switcher. Workspace strip added. Three-breakpoint responsive layout. Sidebar becomes slide-out drawer on tablet/mobile.

**Files modified:**
- `public/index.html` — rail restructured (42 logo + app icons), workspace strip added, sidebar workspace select added, drawer backdrop added, hamburger button in topbar, page title span in topbar
- `public/css/styles.css` — `--workspace-strip-w: 152px` token, rail__hq-link styles, workspace strip component, drawer backdrop, nav-toggle-btn, topbar mobile styles, three breakpoint media queries
- `public/js/app.js` — `renderAppRail()` (static 4-icon app switcher), `renderWorkspaceStrip()` (dynamic workspaces), `populateWorkspaceSelect()` (tablet/mobile dropdown), `openSidebar()` / `closeSidebar()` (drawer), `bindDrawer()`, `bindWorkspaceStrip()` (collapse + select change), `selectPage()` updated (closes drawer, sets topbar title), `store.currentSection` now set when user expands a section

**Key technical decisions:**
- Sidebar IS the drawer on mobile (CSS transform repositions it to fixed) — no duplicate DOM
- Workspace strip collapses to 48px icon-only mode, state persisted in localStorage
- Rail app switcher is fully static (4 hardcoded icons) — no API needed
- App icon URLs: KB = current app (`null`), Applyr = `https://jobs.ss-42.com`, Lifeboard = `https://todo.ss-42.com`, Projects = `#` (placeholder)
- "42" logo moved from topbar into rail top — **DESIGN NOTE: Simon flagged this for review next session. He does not like the 42 in the rail and does not understand what it does. Consider: hide it, move it back to topbar, or replace with KB initials.**

**Infrastructure:**
- Committed to `dev` branch, GitHub Actions built `:dev`, Watchtower deployed to `kb-staging`
- Health check verified: `https://kb-staging.ss-42.com/api/health` → `{"status":"ok"}`

**Remaining deferred items from Phase 3 spec:**
- Editor single-view toggle on mobile (CSS scaffolding is in place, mode toggle button not yet wired for mobile)
- HQ launcher overlay for "42" logo (deferred, links to `#` currently)

---

## Phase 3: Navigation + Responsive Layout

**Deliverable:** Full multi-device navigation. Rail app switcher for SS42 suite. Sidebar redesigned with collapsible workspace strip. Three-breakpoint responsive CSS. Mobile drawer navigation. Tablet layout with toggle sidebar.

### Task 3.1: Rail — SS42 app switcher

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Responsive layout — Desktop)
- files: `public/index.html`, `public/css/styles.css`, `public/js/app.js`
- description: Add a 54px rail on the left edge with the SS42 hub app switcher. Icons for KB (active), Lifeboard, Applyr, Projects. "42" logo at top opens HQ launcher overlay. Rail is visible on desktop (1024px+), collapses on tablet/mobile. Links point to external app URLs.
- acceptance:
  - WHEN on desktop THEN the rail is visible at 54px wide with 4 app icons
  - AND KB icon is highlighted as active
  - AND clicking other app icons navigates to their URLs
  - WHEN below 1024px THEN the rail is hidden

### Task 3.2: Workspace navigation strip

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Responsive layout — Desktop)
- files: `public/index.html`, `public/css/styles.css`, `public/js/app.js`
- description: Between the rail and sidebar, add a collapsible workspace navigation strip (48-152px). Shows workspace names vertically. Click to select workspace (filters sidebar). Collapse/expand toggle. On tablet/mobile: replaced by compact dropdown at top of sidebar.
- acceptance:
  - WHEN on desktop THEN workspace strip is visible between rail and sidebar
  - AND clicking a workspace filters the sidebar to show only that workspace's sections
  - AND the strip is collapsible

### Task 3.3: Sidebar overhaul — section/page tree

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Responsive layout — Desktop)
- files: `public/js/app.js`, `public/css/styles.css`
- description: Redesign sidebar content area (244px) to show sections and pages for the selected workspace. Collapsible section headers. Page tree with indentation for child pages. Active page highlighted. Add page button per section. Search input at top. Lucide icons for sections and page types.
- acceptance:
  - WHEN a workspace is selected THEN sidebar shows its sections and pages
  - AND sections are collapsible
  - AND child pages are indented under parent pages
  - AND active page is highlighted with indigo accent

### Task 3.4: Responsive breakpoints — desktop and tablet

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Responsive layout)
- files: `public/css/styles.css`
- description: Implement three-breakpoint responsive CSS. Desktop (1024px+): full layout `[Rail 54px][Workspace strip][Sidebar 244px][Content flex]`. Tablet (768–1023px): rail hidden, workspace strip replaced by dropdown in sidebar, sidebar toggleable with hamburger, content fills remaining space. iPad landscape gets desktop layout.
- acceptance:
  - WHEN viewport is 1024px+ THEN full three-column layout renders
  - WHEN viewport is 768-1023px THEN rail is hidden AND sidebar is toggleable
  - AND workspace selector is a dropdown in the sidebar header

### Task 3.5: Mobile layout + drawer navigation

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Responsive layout — Mobile)
- files: `public/css/styles.css`, `public/js/app.js`
- description: Below 768px: content is full-width. All navigation behind a slide-out drawer (hamburger icon in simplified top bar). Drawer contains: workspace dropdown, section/page tree. Selecting a page closes the drawer. Editor switches to single-view toggle (edit/preview, not split).
- acceptance:
  - WHEN viewport is below 768px THEN content is full-width
  - AND navigation is in a slide-out drawer activated by hamburger
  - AND selecting a page closes the drawer
  - AND editor is single-view toggle mode

### Task 3.6: Top bar redesign

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design
- files: `public/index.html`, `public/css/styles.css`
- description: Redesign the top bar: page title as breadcrumb (Workspace > Section > Page), search icon (opens global search), dark/light mode toggle, user avatar/menu. On mobile: hamburger icon replaces breadcrumb, search icon, compact layout.
- acceptance:
  - WHEN on desktop THEN top bar shows breadcrumb, search icon, theme toggle, user menu
  - WHEN on mobile THEN top bar shows hamburger, page title, search icon

---

## Phase 4: PWA + Search + Export

**Deliverable:** PWA for add-to-home-screen with offline reading. Global search overlay (Cmd+K). Diagram export: Copy SVG and Download PNG. The app feels like a native tool on any device.

### Task 4.1: Web manifest

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (PWA)
- files: `public/manifest.json`, `public/index.html`
- description: Create PWA manifest with app name, icons (192px + 512px), theme colour (indigo), background colour, display standalone, start_url. Link in index.html. Add Apple-specific meta tags for iOS.
- acceptance:
  - WHEN manifest is loaded THEN browser recognises the app as installable
  - AND "Add to Home Screen" prompt appears on supported browsers

### Task 4.2: Service worker — offline reading

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (PWA)
- files: `public/sw.js`, `public/js/app.js`
- description: Service worker with cache-first strategy for static assets (CSS, JS, fonts, icons). Network-first for API calls with offline fallback page. Cache visited pages on navigation for offline reading. Register service worker on app load. No offline editing in v2.0 — read-only cache.
- acceptance:
  - WHEN the app goes offline THEN previously visited pages are readable from cache
  - AND static assets (CSS, JS) load from cache
  - WHEN navigating to an uncached page offline THEN an offline fallback page appears

### Task 4.3: Global search overlay — Cmd+K

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Search)
- files: `public/js/search.js`, `public/css/styles.css`
- description: Redesign search as a full-screen overlay triggered by Cmd+K (desktop) or search icon (mobile). Debounced input (280ms). Results show: title, breadcrumb path, content excerpt with highlights. Filter chips: by workspace, section, asset type. Escape or click outside to close. Uses existing `/api/search` endpoint.
- acceptance:
  - WHEN Cmd+K is pressed THEN search overlay opens with focused input
  - AND results appear within 280ms of typing
  - AND results show title, breadcrumb, and highlighted excerpt
  - AND filter chips filter by workspace/section
  - WHEN Escape is pressed THEN overlay closes

### Task 4.4: Diagram export — Copy SVG

- spec: 2026-03-02-knowledge-base-v2-design.md § 15 — Diagramming (Export)
- files: `public/js/mermaid-init.js`, `public/css/styles.css`
- description: Wire up the "Copy SVG" button in the diagram hover toolbar. On click: get the SVG innerHTML of the rendered diagram, copy to clipboard using the Clipboard API. Show a toast confirmation "SVG copied to clipboard".
- acceptance:
  - WHEN "Copy SVG" is clicked THEN the diagram SVG markup is copied to clipboard
  - AND a toast confirmation appears

### Task 4.5: Diagram export — Download PNG

- spec: 2026-03-02-knowledge-base-v2-design.md § 15 — Diagramming (Export)
- files: `public/js/mermaid-init.js`
- description: Wire up the "Download PNG" button. On click: render the SVG to a canvas element at 2x resolution, convert canvas to PNG blob, trigger a download with filename `{page-title}-diagram-{n}.png`.
- acceptance:
  - WHEN "Download PNG" is clicked THEN a PNG file downloads
  - AND the PNG is at 2x resolution of the rendered SVG
  - AND the filename includes the page title

### Task 4.6: Dark/light mode toggle

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Visual direction)
- files: `public/css/styles.css`, `public/js/app.js`
- description: Implement dark/light mode. CSS custom properties for both themes. Toggle button in top bar. Persist preference in localStorage. Mermaid diagrams re-render with matching theme on toggle. Default: follows system preference via `prefers-color-scheme`.
- acceptance:
  - WHEN toggle is clicked THEN the entire UI switches theme
  - AND Mermaid diagrams re-render with the correct theme
  - AND preference persists across page reloads
  - WHEN no preference is set THEN system preference is used

---

## Phase 5: Data Migration + New Features

**Deliverable:** Complete v1.0 → v2.0 data migration script. Inbox section for mobile capture. Asset browser. Page status filtering in navigation. Map view with Mermaid diagram toggle.

### Task 5.1: Data migration script — v1.0 → v2.0

- spec: 2026-03-02-knowledge-base-v2-design.md § 7 — Data Migration (v1.0 → v2.0)
- files: `scripts/migrate-v2.js`
- description: One-time migration script that: (a) exports any DB pages without corresponding vault files → writes as `.md` to correct vault paths, (b) exports asset content to vault files, updates `file_path`, (c) runs schema migration if not applied, (d) populates `content_cache` from vault files, (e) regenerates `search_vector`, (f) reconciles workspaces/sections with vault folder structure. Reports totals. Safe to run multiple times (idempotent).
- acceptance:
  - WHEN script runs THEN all pages have corresponding vault files
  - AND all vault files have corresponding page records with `file_path`
  - AND `content_cache` and `search_vector` are populated for all pages
  - AND workspace/section records match the vault folder structure
  - WHEN run a second time THEN no duplicate records are created

### Task 5.2: Inbox section

- spec: 2026-03-02-knowledge-base-v2-design.md § 6 — Integrations (Inbox pattern)
- files: `services/pages.js`, `routes/pages.js`
- description: Ensure `personal/inbox/` section exists (create workspace/section if needed). Add a quick-capture API endpoint `POST /api/inbox` that creates a new page in the inbox section with title (auto-generated from timestamp if not provided), content, and status `draft`. The vault file is written to `vault/personal/inbox/{slug}.md`.
- acceptance:
  - WHEN `POST /api/inbox { content: "Quick note" }` is called THEN a page is created in personal/inbox
  - AND a vault file exists at the correct path
  - WHEN no title is provided THEN title is auto-generated from timestamp

### Task 5.3: Asset browser

- spec: 2026-03-02-knowledge-base-v2-design.md § 10 — What Is New (Asset browser)
- files: `public/js/assets-browser.js`, `public/css/styles.css`, `routes/assets.js`
- description: Add an asset browser view accessible from the sidebar (replaces or supplements the existing map view link). Lists all assets regardless of page linkage. Filter by: type, workspace. Search within assets. Click an asset to view its detail and linked pages. Uses existing `/api/assets` endpoint.
- acceptance:
  - WHEN asset browser is opened THEN all assets are listed with type, title, and workspace
  - AND filters by type and workspace work correctly
  - AND clicking an asset shows its detail and linked pages

### Task 5.4: Page status filtering in navigation

- spec: 2026-03-02-knowledge-base-v2-design.md § 10 — What Is New (Page status filtering)
- files: `public/js/app.js`, `routes/pages.js`
- description: In the sidebar page tree, filter pages by status. Default: show only `published` pages. Toggle to show `draft` pages (dimmed styling). `archived` pages hidden by default, accessible via a "Show archived" toggle. Admin users see all statuses. Filtering happens client-side from the page tree data.
- acceptance:
  - WHEN sidebar loads THEN only published pages are shown by default
  - AND toggling "Show drafts" reveals draft pages with dimmed styling
  - AND toggling "Show archived" reveals archived pages

### Task 5.5: Map view — Mermaid diagram toggle

- spec: 2026-03-02-knowledge-base-v2-design.md § 5 — UI Design (Map view)
- files: `public/js/map.js`, `public/css/styles.css`
- description: Add a Table/Diagram toggle to the map view. Table mode: existing filterable relationship table. Diagram mode: render the filtered relationships as a Mermaid flowchart (nodes = assets, edges = relationships with labels). Auto-generate the Mermaid syntax from the filtered data. Render using the existing Mermaid library.
- acceptance:
  - WHEN map view opens THEN it defaults to table mode (existing behaviour)
  - AND a Table/Diagram toggle is visible
  - WHEN Diagram mode is selected THEN relationships render as a Mermaid flowchart
  - AND applying filters updates the diagram

---

## Phase 6: Testing + Production Deploy

**Deliverable:** Full test coverage for all new vault sync functionality. Updated Dockerfile and CI/CD pipeline. Production deployment at `kb.ss-42.com`. End-to-end verification.

### Task 6.1: Vault sync unit tests

- spec: 2026-03-02-knowledge-base-v2-design.md § 8 — What Stays from v1.0 (Test suite extended)
- files: `tests/vault-sync.test.js`
- description: Jest tests for vault sync service: file add creates page, file change updates content_cache, file unlink soft-deletes, debounce works, non-md files ignored, workspace/section inference from path. Use temp directories and mock DB.
- acceptance:
  - WHEN tests run THEN all vault sync scenarios pass
  - AND edge cases (missing dirs, invalid files, rapid changes) are covered

### Task 6.2: Vault API endpoint tests

- spec: 2026-03-02-knowledge-base-v2-design.md § 10 — What Is New (By-path, Sync trigger)
- files: `tests/vault-api.test.js`
- description: Supertest tests for: `POST /api/sync`, `GET /api/pages/by-path`, page CRUD with vault writes, page move with previous_paths. Test auth requirements. Test vault read fallback (missing file → content_cache → content).
- acceptance:
  - WHEN tests run THEN all vault API endpoints pass
  - AND authentication is enforced
  - AND fallback chain works correctly

### Task 6.3: Mermaid rendering tests

- spec: 2026-03-02-knowledge-base-v2-design.md § 15 — Diagramming
- files: `tests/mermaid.test.js`
- description: Tests for Mermaid integration: valid mermaid block renders SVG, invalid syntax shows error (not crash), multiple diagrams on one page, diagram export functions. Can use JSDOM or test via the API response containing correct markup.
- acceptance:
  - WHEN a page with mermaid blocks is rendered THEN SVG output is produced
  - AND invalid mermaid syntax does not crash the page

### Task 6.4: Migration script tests

- spec: 2026-03-02-knowledge-base-v2-design.md § 7 — Data Migration
- files: `tests/migration.test.js`
- description: Tests for the v2.0 migration script: idempotent execution, vault files created for DB-only pages, content_cache populated, search_vector regenerated, workspace/section reconciliation. Use a test database and temp vault directory.
- acceptance:
  - WHEN migration script runs twice THEN no duplicates are created
  - AND all pages have vault files and populated content_cache

### Task 6.5: Dockerfile final update

- spec: 2026-03-02-knowledge-base-v2-design.md § 13 — Deployment
- files: `Dockerfile`
- description: Final Dockerfile review: ensure all new files are copied (vault-sync, vault-config, mermaid-init, diagram-templates, sw.js, manifest.json). VAULT_DIR and UPLOAD_DIR both have correct defaults and ownership. Health check still works. Non-root user has write access to vault and uploads directories.
- acceptance:
  - WHEN image is built THEN all new files are included
  - AND non-root user can write to /app/vault and /app/uploads
  - AND health check passes

### Task 6.6: CI/CD pipeline update

- spec: 2026-03-02-knowledge-base-v2-design.md § 12 — Tech Stack (CI/CD)
- files: `.github/workflows/deploy.yml`
- description: Update GitHub Actions workflow: run `npm test` before building the image (fail fast on test failures). Ensure the workflow builds for both `dev` and `main` branches (`:dev` tag for dev branch, `:latest` for main). Verify Watchtower label is set on NAS containers.
- acceptance:
  - WHEN tests fail THEN the image is not built or pushed
  - WHEN dev branch is pushed THEN `:dev` image is built
  - WHEN main branch is pushed THEN `:latest` image is built

### Task 6.7: Production deployment

- spec: 2026-03-02-knowledge-base-v2-design.md § 13 — Deployment
- files: (NAS infrastructure)
- description: Deploy to production. Run migration script against production DB. Create vault directory on production NAS. Copy vault content. Update production container to use `:latest` image with vault bind mount. Verify health check, vault sync, page rendering, Mermaid diagrams, search, and responsive layout at `kb.ss-42.com`.
- acceptance:
  - WHEN production deploys THEN `curl https://kb.ss-42.com/api/health` returns ok
  - AND pages render from vault files
  - AND Mermaid diagrams render correctly
  - AND search returns results from vault content
  - AND mobile layout works on a real device

---

## Dependencies Between Phases

```
Phase 1 (vault + visual + mermaid)
  ├── Phase 2 (editor + write paths)
  │     └── Phase 4 (PWA + search + export) ──┐
  ├── Phase 3 (navigation + responsive)       │
  │     └── Phase 4 (PWA + search + export) ──┤
  └── Phase 5 (migration + features)          │
                                               ├── Phase 6 (testing + deploy)
                                               │
```

Phase 2 and Phase 3 can run in parallel after Phase 1.
Phase 5 can start after Phase 1 (only needs vault sync, not the full editor or responsive layout).
Phase 4 needs both Phase 2 (editor features for diagram export) and Phase 3 (responsive layout for PWA).
Phase 6 is the final gate — needs all prior phases complete.

---

## Risk Notes

1. **chokidar in Alpine Docker:** May require `CHOKIDAR_USEPOLLING=true` or the `fsevents` optional dependency. Test early in Phase 1.
2. **Mermaid.js bundle size:** CDN load is ~1.5MB. Consider lazy-loading only when a page contains mermaid blocks. Acceptable for v2.0, optimise later.
3. **Vault file permissions in Docker:** Non-root user must have read/write access to the bind-mounted vault directory. NAS folder ownership must match.
4. **content vs content_cache transition:** During migration, some pages will have `content` but no `file_path`. The three-layer fallback (vault file → content_cache → content) handles this gracefully.
5. **Service worker cache invalidation:** When vault content changes, the service worker cache for that page must be invalidated. Use a simple network-first strategy for API calls to avoid stale content.
