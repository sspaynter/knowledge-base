# Knowledge Platform — Architecture

**Type:** Reference page
**Workspace:** IT & Projects
**Section:** Knowledge Platform
**Template:** blank
**Status:** Active
**Created:** 2026-02-27
**Updated:** 2026-03-05 (v2.1.0 — API-first vault sync)
**Author:** Simon Paynter + Claude

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 20 (Alpine Docker) | |
| Framework | Express 4 (CommonJS) | |
| Database | PostgreSQL via `pg` | `knowledge_base` schema in `n8n-postgres` container |
| Auth | Passport.js + Google OAuth 2.0 + connect-pg-simple | SSO session cookie (browser) + Bearer token (API/Claude) |
| File uploads | multer | Files stored in `/app/uploads`, bind-mounted for persistence |
| Vault sync | chokidar v5 (ESM) | Watches `/app/vault` for `.md` file changes, syncs to DB |
| Frontend | Vanilla JS ES6 modules | No bundler, no framework |
| Icons | Lucide (CDN UMD) | `window.lucide.createIcons()` called after DOM changes |
| Markdown | marked + DOMPurify (CDN UMD) | DOMPurify sanitizes all markdown before rendering |
| Diagrams | Mermaid.js 11 (CDN UMD) | Renders fenced mermaid code blocks as inline SVG |
| Fonts | Plus Jakarta Sans, JetBrains Mono | Google Fonts CDN |
| CI/CD | GitHub Actions → GHCR | `:dev` on push to `dev`, `:latest` on push to `main` |
| Hosting | QNAP NAS, Cloudflare tunnel | Production: `kb.ss-42.com`, Staging: `kb-staging.ss-42.com` |

## Database

**Host (NAS internal):** `10.0.3.12:5432` — `n8n-postgres` container
**Host (local dev):** `192.168.86.18:32775` — confirmed open and responding
**Superuser password:** Found in Container Station → n8n-postgres → Environment → `POSTGRES_PASSWORD`
**Database name:** `nocodb`
**Schema:** `knowledge_base` — isolated from NocoDB schemas
**App user:** `kb_app` — limited permissions, created by migration script

### Tables (13)

| Table | Purpose |
|---|---|
| `workspaces` | Top-level knowledge areas (IT & Projects, Personal, Work, Learning) |
| `sections` | Topic areas within a workspace |
| `pages` | Hierarchical documents within sections — adjacency list (parent_id). v2.0 adds `file_path`, `content_cache`, `previous_paths` columns for vault sync |
| `page_versions` | Append-only page history — up to 50 versions, restore endpoint. Added Phase 2 |
| `assets` | Raw artifacts: skills, configs, decisions, sessions, images, files, links, miro |
| `asset_versions` | Append-only snapshot history for every PATCH to an asset |
| `page_assets` | Junction — links assets to pages with display mode and sort order |
| `templates` | Default content structures for new pages |
| `asset_relationships` | How assets connect: loads, uses, generates, deploys-to, connects-to, supersedes, references |
| `api_tokens` | Bearer tokens for Claude sessions and external tool integrations |
| `users` | Multi-user with roles: admin / editor / viewer |
| `sessions` | Browser session cookies |
| `settings` | Key-value app configuration (HQ_URL, etc.) |

## Pre-build setup (one-time)

Three things required before `npm run migrate` can run:

### 1. Expose n8n-postgres to LAN

n8n-postgres has no external port by default (NAT only). Add one in Container Station:

Port `32775` is already mapped and confirmed open. No changes needed in Container Station.

### 2. Find superuser password

Container Station → `n8n-postgres` → Environment tab → `POSTGRES_PASSWORD`

### 3. Run migration and seed

```bash
# From Mac, using nocodb superuser (needed only for this step)
DATABASE_URL=postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb npm run migrate
DATABASE_URL=postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb npm run seed
```

This creates the `knowledge_base` schema, 12 tables, the `kb_app` user, and inserts seed data. Run once, with the superuser. The app uses `kb_app` for all subsequent operations — the superuser is not used again.

---

## Authentication

Two auth paths — both go through the same `requireAuth` middleware:

| Path | Mechanism | Used by |
|---|---|---|
| Browser | Google OAuth → Passport.js session → shared `connect.sid` cookie on `.ss-42.com` | Web app (SSO across all SS42 apps) |
| API / Claude | `Authorization: Bearer <token>` → `knowledge_base.api_tokens` table | Claude sessions, external tools |

Session store: `shared_auth.sessions` table in `applyr_staging` database (connect-pg-simple). User identity: `shared_auth.users` table. KB-specific roles: `knowledge_base.users` table (mapped by email). Invite gate: `shared_auth.allowed_emails` table. See [Cross-App Auth Architecture](../../infrastructure/cross-app-auth-architecture.md) for full SSO details.

## Content Architecture (v2.0)

### Vault-as-source

Markdown files in `/app/vault/` are the source of truth. The vault is bind-mounted from the NAS host filesystem. chokidar watches for file changes and syncs to the database.

### Three-layer read fallback

When serving page content:
1. **Vault file** — if `file_path` is set and the file exists, read from vault
2. **content_cache** — if vault file is missing, use the cached copy in DB
3. **content** — original DB content for pre-migration pages

This ensures zero data loss during the v1→v2 migration.

### Write paths

**Browser user (Phase 2+):**
```
User types → POST /api/pages or PATCH /api/pages/:id → writes .md to vault → syncs to PostgreSQL
```
Phase 2 made all create/update/move operations vault-first. The DB record reflects the vault file.

**External edit (vault file change):**
```
File saved in vault → chokidar detects → vault-sync updates content_cache in DB
```

**Claude session:**
```
Claude → POST /api/sync { file_path } → reads vault file → updates DB
Claude → POST /api/pages → Creates page from template if none exists
```

Claude never connects to PostgreSQL directly. Always via the REST API with a bearer token.

### Key API endpoints (v2.1)

| Endpoint | Purpose |
|---|---|
| `POST /api/pages/by-path` | Upsert page from raw .md with frontmatter — vault sync push (v2.1.0) |
| `GET /api/pages/export` | Bulk export pages with optional `?since=` filter — vault sync pull (v2.1.0) |
| `POST /api/sync` | Trigger sync for a specific vault file (auth required) |
| `GET /api/pages/by-path?path=...` | Look up page by vault file path (checks `previous_paths` too) |
| `GET /api/pages/:id/versions` | List version history for a page |
| `POST /api/pages/:id/versions/:n/restore` | Restore page to version N |
| `POST /api/inbox` | Create a page in personal/inbox — auto-title from timestamp |
| `GET /api/assets/:id/pages` | List all pages that link to an asset |
| `GET /api/search?q=...` | Full-text search across pages, assets, and relationships |

## Layout

Desktop (1024px+) — four-column layout:

```
[Rail 54px] [Workspace strip 152px collapsible] [Sidebar 244px] [Content pane flex]
```

Tablet (768–1023px): rail and strip hidden, sidebar as overlay drawer.
Mobile (<768px): full-width, sidebar as slide-out drawer (backdrop, hamburger toggle, Escape to close).

- **Top bar (50px):** Book-open icon (desktop only), app label, search (⌘K), asset browser, map view, settings, theme toggle, avatar; page title replaces search on mobile
- **Rail:** Two-tier — CORE_APPS (Knowledge Base active, To Do) above divider; BUILT_APPS (Applyr) below. 54px wide, tooltips on hover.
- **Workspace strip:** 152px collapsible strip showing all workspaces as nav items. Collapse state persisted to localStorage. Hidden on tablet/mobile (replaced by workspace dropdown in sidebar header).
- **Sidebar:** Dark gradient background, workspace select (tablet/mobile), section headers (collapsible), page tree with status-based filtering (Drafts/Archived toggles), status icons (file-text / file-pen / archive)
- **Content pane:** Breadcrumb, page title, edit button, status badges, Markdown body (Plus Jakarta Sans, max-width 700px), Mermaid diagrams with hover toolbar (Copy SVG, Download PNG, Edit Source)

## Design system (v2.0)

- **Accent:** `#6366f1` (indigo) — dark; `#4f46e5` — light
- **Background:** `#0d0d11` — dark; `#f5f5f7` — light
- **Body font:** Plus Jakarta Sans (400/500/600/700, 16px, line-height 1.6)
- **Mono font:** JetBrains Mono (metadata, code, paths)
- **Sidebar:** Dark gradient `linear-gradient(180deg, #111119, #0e0e18)` — consistent across themes
- **Theme:** CSS custom properties on `[data-theme]`, toggled via button, persisted in localStorage
- **Diagrams:** Mermaid.js with dark theme, indigo accent colours, hover toolbar (Copy SVG, Download PNG, Edit Source)

## Container registry

`ghcr.io/sspaynter/knowledge-base`

Watchtower on the NAS polls for both tags — `:latest` (production, push to `main`) and `:dev` (staging, push to `dev`).

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string — `postgresql://kb_app:<pass>@<host>:<port>/nocodb` |
| `SESSION_SECRET` | Express session signing secret — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `UPLOAD_DIR` | File upload directory — defaults to `/app/uploads` in container (set `/tmp/kb-uploads` for bare node) |
| `VAULT_DIR` | Vault directory for markdown source files — defaults to `/app/vault` in container |
| `CHOKIDAR_USEPOLLING` | Set `true` in Docker/Alpine (native fs events may not work) |
| `PORT` | App port — default 3000 |
| `NODE_ENV` | `production` or `development` |
| `HQ_URL` | Link target for SS42 logo — `https://hq.ss-42.com` |
| `SHARED_AUTH_DATABASE_URL` | Connection string for shared auth database — `postgresql://nocodb:nocodb2026@10.0.3.12:5432/applyr_staging` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID — `709232597737-...34f` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret — stored in `/share/Container/shared-secrets.env` |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI — `https://kb-staging.ss-42.com/auth/google/callback` (staging) |
| `COOKIE_DOMAIN` | Session cookie domain — `.ss-42.com` in staging/production, unset in dev |

**DATABASE_URL by environment:**
- Local dev (bare node): `postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb`
- Local dev (docker-compose): set in `.env`, referenced as `${DATABASE_URL}`
- Production (Container Station): `postgresql://kb_app:<pass>@10.0.3.12:5432/nocodb`
