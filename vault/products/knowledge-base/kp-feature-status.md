# Knowledge Platform — Feature Status (As-Built)

**Type:** Reference page
**Workspace:** IT & Projects
**Section:** Knowledge Platform
**Status:** Active — updated each build session
**Created:** 2026-03-03
**Updated:** 2026-03-04 (Map view populated, session 39)
**Author:** Simon Paynter + Claude

---

## Purpose

This page tracks what is actually running in the app, not what was originally planned. It is the delta between the design spec and the as-built state. Updated at the end of each build session.

Design spec: `knowledge-base/docs/plans/2026-03-02-knowledge-base-v2-design.md`
Implementation plan: `knowledge-base/docs/plans/2026-03-03-kb-v2-implementation-plan.md`

---

## Feature status by area

### Content reading and navigation

| Feature | Status | Notes |
|---|---|---|
| Workspace / Section / Page hierarchy | Live | Three-level hierarchy, adjacency list for page depth |
| Page reading (vault-first) | Live | Three-layer fallback: vault file → content_cache → content column |
| Mermaid diagram rendering | Live | Fenced `mermaid` code blocks render as inline SVG via DOMParser |
| Markdown rendering | Live | marked + DOMPurify pipeline; no innerHTML anywhere |
| Breadcrumb navigation | Live | Workspace › Section › Page |
| Previous paths fallback | Live | GET /api/pages/by-path checks previous_paths JSONB |
| Syntax highlighting | Not built | Deferred |

### Editing and authoring

| Feature | Status | Notes |
|---|---|---|
| Page editor (markdown source) | Live | Toolbar: bold, italic, heading, link, code, list |
| Split-view mode (edit + preview) | Live | CSS toggle, no JS layout recalc |
| Source-only mode | Live | Toggle between split and source |
| Vault-first writes | Live | createPage, updatePage, movePage all write .md file first |
| Page version history | Live | 50-version cap per page, restore endpoint |
| Mermaid live preview in editor | Live | 500ms debounce, rerenderDiagram via DOMParser |
| Insert Diagram picker | Live | 7 pre-populated templates with dropdown picker |
| Click-to-edit Mermaid in reading view | Live | Inline editor panel, live preview, writes back to content |
| WYSIWYG editor (contenteditable) | Not built | Prototype explored it; current build uses markdown source only |
| File attachment upload | Live | multer, /uploads static mount, /api/upload endpoint. **Security note:** `/uploads` route is unauthenticated static — needs `requireAuth` middleware (TODO #33, remediation: `docs/knowledge-base/kp-security-hardening.md`) |

### Search

| Feature | Status | Notes |
|---|---|---|
| Full-text search | Live | PostgreSQL tsvector, GET /api/search?q= |
| Cmd+K search overlay | Live | Keyboard shortcut, result list with breadcrumb (workspace › section) |
| Search result breadcrumbs | Live | Fixed in Phase 4 — workspace and section names shown |
| Search across assets | Live | Searches pages and assets |

### Map view (relationships)

| Feature | Status | Notes |
|---|---|---|
| Filterable relationship table | Live | Filter by from_asset, to_asset, relationship_type |
| Mermaid diagram toggle | Live | Table/Diagram mode; flowchart LR generated from filtered relationships |
| Interactive graph (D3/Cytoscape) | Not built | ADR-008 deferred — Mermaid toggle is the Phase 5 middle ground |

### Asset browser

| Feature | Status | Notes |
|---|---|---|
| Asset grid view | Live | Cards with type icon, type filter, name filter |
| Asset detail panel | Live | Inline panel (not modal): title, type, description, URL, linked pages |
| Linked pages list | Live | JOIN through page_assets → pages → sections → workspaces |
| Asset creation / editing | Live | Backend only — no dedicated UI form (use page_assets link flow) |
| Asset workspace filter | Not built | Deferred — assets link to pages, not directly to workspaces |

### Page status filtering (sidebar)

| Feature | Status | Notes |
|---|---|---|
| Draft pages filter | Live | Toggle in sidebar footer; client-side visibility via data-status |
| Archived pages filter | Live | Toggle in sidebar footer |
| Status icons in page tree | Live | file-text (active), file-pen (draft), archive (archived) |

### Layout and navigation

| Feature | Status | Notes |
|---|---|---|
| Three-column layout (desktop) | Live | Rail 54px + strip 152px + sidebar 244px + content pane |
| Two-tier app rail | Live | CORE_APPS (KB, To Do) above divider; BUILT_APPS (Applyr) below |
| Version label in rail | Live | Bottom of rail, fetched from /api/version, JetBrains Mono 10px |
| Workspace strip (collapsible) | Live | 152px, collapse persisted to localStorage |
| Responsive (tablet 768–1023px) | Live | Rail + strip hidden, sidebar as overlay |
| Responsive (mobile <768px) | Live | Full-width, sidebar as slide-out drawer with backdrop |
| Workspace dropdown (tablet/mobile) | Live | Replaces workspace strip |
| Page title in topbar (mobile) | Live | Replaces search pill |
| Hamburger toggle / Escape to close | Live | Drawer control |

### PWA and offline

| Feature | Status | Notes |
|---|---|---|
| PWA manifest | Live | /manifest.json, KB SVG icon |
| Service worker | Live | Cache-first static, network-first API, offline fallback page |
| Favicon (browser tab) | Live | `<link rel="icon">` added Phase 5/session 34 |
| Add to home screen | Live | Manifest enables iOS/Android install prompt |
| Background sync | Not built | Deferred |

### Inbox

| Feature | Status | Notes |
|---|---|---|
| POST /api/inbox | Live | Creates page in personal/inbox, auto-title from timestamp |
| Inbox UI | Not built | API exists, no dedicated frontend view |

### Authentication

| Feature | Status | Notes |
|---|---|---|
| Google OAuth sign-in | Live | Passport.js, shared_auth schema in applyr_staging DB |
| SSO across SS42 apps | Live | `.ss-42.com` cookie domain — sign into KB authenticates Applyr and vice versa |
| Bearer token auth | Live | API tokens table for Claude sessions and external tools |
| Session persistence | Live | connect-pg-simple, shared_auth.sessions |

### Vault sync

| Feature | Status | Notes |
|---|---|---|
| chokidar file watcher | Live | v5 ESM, lazy-loaded, 500ms debounce, watches /app/vault |
| POST /api/sync | Live | Trigger sync for specific vault file |
| Initial vault sync script | Live | scripts/initial-vault-sync.js — one-time, 17 files synced |
| v1→v2 migration script | Live | scripts/migrate-v2.js — idempotent: vault→DB, DB→vault, search_vector refresh |
| Frontmatter metadata parsing | Live | #35 — js-yaml parses `---` delimited YAML; maps status/order/parent/author/title/created/updated to DB columns; strips frontmatter from content_cache; round-trip: writeVaultFile prepends frontmatter on save |
| sort_order from frontmatter | Live | #36 — vault sync reads `order` from frontmatter; falls back to MAX(sort_order) + 10; gapped numbering (10, 20, 30...) for future drag-to-reorder (#13) |

### Page ordering

| Feature | Status | Notes |
|---|---|---|
| SQL ORDER BY sort_order | Live | All queries order by sort_order, then name/title |
| Frontend respects API order | Live | No client-side re-sorting |
| Seed data sort_order values | Live | 9 workspaces (10-90) and 14 sections (10-40 per workspace) — gapped numbering |
| Vault sync sets sort_order | Live | #36 — reads from frontmatter `order` field; falls back to MAX + 10 |
| Workspace/section auto-create sort_order | Live | #36 — new workspaces and sections get MAX(sort_order) + 10 |
| Drag-to-reorder | Live | #13 — native HTML5 drag-and-drop, PATCH /api/pages/reorder bulk endpoint, gapped sort_order assignment, vault frontmatter updated on reorder. Editor/admin role required. |

### Dark / light mode

| Feature | Status | Notes |
|---|---|---|
| Theme toggle | Live | CSS custom properties on [data-theme], persisted to localStorage |
| System preference detection | Live | prefers-color-scheme used when no saved preference |
| Mermaid re-render on toggle | Live | reinitMermaid() re-renders diagrams with correct theme |

### Diagram tools

| Feature | Status | Notes |
|---|---|---|
| Copy SVG to clipboard | Live | Hover toolbar on rendered diagram |
| Download PNG (2× resolution) | Live | Canvas render from SVG, downloadable |
| Edit Source (click-to-edit) | Live | Inline editor panel in reading view |
| Export to Excalidraw | Not built | Deferred to v2.1 |

### Admin

| Feature | Status | Notes |
|---|---|---|
| User management | Live | GET/PATCH/DELETE /api/admin/users |
| API token management | Live | GET/POST/DELETE /api/admin/tokens |
| App settings | Live | GET/PATCH /api/admin/settings (key-value, e.g. HQ_URL) |

### Testing and CI/CD

| Feature | Status | Notes |
|---|---|---|
| Vault sync unit tests | Live | 20 tests: slugify, titleFromFilename, inferLocationFromPath, handleAdd, handleChange, handleUnlink |
| API endpoint tests | Live | 40+ tests across pages, assets, workspaces, inbox, search, sync, health — Bearer auth |
| Mermaid rendering tests | Live | 8 tests: security invariants (no innerHTML, DOMParser) + DB storage round-trip |
| Migration script tests | Live | 20 tests: schema idempotency, seed idempotency, GENERATED ALWAYS AS behaviour, helper functions |
| npm test CI gate | Live | GitHub Actions: test job (Postgres service) gates build job — fail fast on test failures |
| .dockerignore | Live | Excludes node_modules, tests, vault, docs from build context |
| Production deploy | Live | v2.0.0 deployed to kb.ss-42.com — session 37 |

---

## Decisions that differ from the design spec

| Decision | Design spec said | What was built | Reason |
|---|---|---|---|
| Font: Plus Jakarta Sans | Design spec (v1) used Lora serif body, DM Sans UI | Plus Jakarta Sans for everything (+ JetBrains Mono for code) | v2.0 design aligned to Applyr aesthetic — cohesion across SS42 apps outweighs individual expressiveness |
| Map view | "Visual graph is v2" | Mermaid diagram toggle added alongside table in Phase 5 | Mermaid was already a dependency — low cost to add; D3/Cytoscape interactive graph still deferred |
| WYSIWYG editor | Prototype used contenteditable + floating toolbar | Markdown source editor with toolbar | Implementation complexity; source mode is more reliable and AI-friendly |
| Inbox UI | Full inbox view planned | API exists, no UI yet | Deferred to Phase 5+ — quick capture via API is sufficient for now |

---

## Session build log

| Session | Phase | Key deliverables |
|---|---|---|
| 27 | Planning | KB v2.0 implementation plan written (6 phases, 42 tasks) |
| 28 | 1 | Vault sync engine, chokidar watcher, three-layer fallback, Mermaid rendering, indigo visual redesign, staging deployed |
| 31 | 2 + 3 | Vault-first writes, page_versions, editor toolbar, split-view, Mermaid click-to-edit, 7 diagram templates, app rail, workspace strip, responsive layout, mobile drawer, SSO |
| 32 | 4 | PWA manifest, service worker, Cmd+K search, search breadcrumb fix, diagram export (SVG/PNG), dark/light mode, two-tier rail refactor |
| 33 | 5 | Migration script, inbox endpoint, asset browser, page status filtering, map diagram toggle |
| 34 | — | Favicon fix, kp-architecture.md updated (Phases 2–5), kp-design-decisions.md updated (ADR-006 superseded, ADR-009 added, ADR-008 updated) |
| 36 | 6 | 88 tests (17 suites), CI/CD test gate, .dockerignore, vault taxonomy restructured (it-and-projects → operations/products/personal), NAS vault + DB cleaned, kb-vault-management.md written |
| 37 | 6.7 | Production deploy: Dockerfile healthcheck fix (IPv6), CI migration runner fix, container recreated with vault mount, DB cleaned, v2.0.0 tagged and released |
| 38 | — | Security audit: `/uploads` unauthenticated static route identified, security checklist updated, remediation doc created, TODO #33 added |
| 39 | — | Skill asset registration: 50 assets (20 global skills, 5 agents, 14 superpowers, 9 job-app skills, 2 job-app agents) + 34 relationships registered via `scripts/register-skills.js`. Map view populated. TODO #32 completed. |
| 40 | #35 + #36 | Frontmatter metadata parsing (js-yaml, 7 field mappings, round-trip writes) + gapped sort_order (seed 10/20/30, vault sync MAX+10, archived status migration). 27 new tests (22 unit + 5 integration). New file: `services/frontmatter.js`. |
| 40 | #13 + UI | Drag-to-reorder: native HTML5 DnD in sidebar, PATCH /api/pages/reorder bulk endpoint (transactional), vault frontmatter updated on reorder, 4 new API tests. Version number in rail UI. package.json → 2.0.0. Global CLAUDE.md vault writing instructions added. |

---

## Deferred features

- **Security hardening** — authenticated uploads, remove hardcoded DB fallback credentials, COOKIE_DOMAIN startup warning (TODO #33, `docs/knowledge-base/kp-security-hardening.md`)
- Inbox UI (API exists, no frontend view)
- WYSIWYG editor (markdown source mode is current)
- Excalidraw export
- Asset workspace filter
- Background sync (PWA)
- Syntax highlighting in code blocks
