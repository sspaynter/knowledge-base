# Knowledge Platform — Architecture

**Type:** Reference page
**Workspace:** IT & Projects
**Section:** Knowledge Platform
**Template:** blank
**Status:** Active
**Created:** 2026-02-27
**Author:** Simon Paynter + Claude

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 20 (Alpine Docker) | |
| Framework | Express 4 (CommonJS) | |
| Database | PostgreSQL via `pg` | `knowledge_base` schema in `n8n-postgres` container |
| Auth | bcryptjs + cookie-parser | Session cookie (browser) + Bearer token (API/Claude) |
| File uploads | multer | Files stored in `/app/uploads`, bind-mounted for persistence |
| Frontend | Vanilla JS ES6 modules | No bundler, no framework |
| Icons | Lucide (CDN UMD) | `window.lucide.createIcons()` called after DOM changes |
| Markdown | marked + DOMPurify (CDN UMD) | DOMPurify sanitizes all markdown before rendering |
| Fonts | DM Sans, Lora, JetBrains Mono | Google Fonts CDN |
| CI/CD | GitHub Actions → GHCR | Watchtower auto-pulls `latest` tag on NAS |
| Hosting | QNAP NAS, Cloudflare tunnel | `kb.ss-42.com` |

## Database

**Host (NAS internal):** `10.0.3.12:5432` — `n8n-postgres` container
**Host (local dev):** `192.168.86.18:32775` — confirmed open and responding
**Superuser password:** Found in Container Station → n8n-postgres → Environment → `POSTGRES_PASSWORD`
**Database name:** `nocodb`
**Schema:** `knowledge_base` — isolated from NocoDB schemas
**App user:** `kb_app` — limited permissions, created by migration script

### Tables (12)

| Table | Purpose |
|---|---|
| `workspaces` | Top-level knowledge areas (IT & Projects, Personal, Work, Learning) |
| `sections` | Topic areas within a workspace |
| `pages` | Hierarchical documents within sections — adjacency list (parent_id) |
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

Two auth paths — both go through the same middleware:

| Path | Mechanism | Used by |
|---|---|---|
| Browser | Session cookie (`req.session.userId`) | Web app |
| API / Claude | `Authorization: Bearer <token>` → `api_tokens` table | Claude sessions, external tools |

First registered user is automatically admin. Role scope is per-instance (not per-workspace) in v1.

## Write paths

### Browser user
```
User types → POST /api/pages or PATCH /api/pages/:id → PostgreSQL
```

### Claude session
```
Claude → POST /api/assets (with change_summary) → API stores + creates asset_versions snapshot
Claude → POST /api/pages → Creates page from template if none exists
Claude → POST /api/relationships → Records how assets connect
```

Claude never connects to PostgreSQL directly. Always via the REST API with a bearer token.

## Layout

Three-column layout, persistent:

```
[Rail 54px] [Sidebar 244px] [Content pane flex]
```

- **Top bar (50px):** HQ logo link, app label, global search (⌘K), map view, settings, theme toggle, avatar
- **Rail:** Workspace icons — active state with teal left border, tooltips on hover
- **Sidebar:** Section headers (collapsible), page tree (indented by depth, no depth limit)
- **Content pane:** Breadcrumb, page title, edit button, status badges, Markdown body (Lora serif), asset panel

## Design system

- **Accent:** `#2dd4bf` (teal) — dark; `#0d9488` — light
- **Background:** `#0d0d11` — dark; `#f5f5f7` — light
- **Body font:** Lora (serif, 15.5px, line-height 1.82) — the defining design decision
- **UI font:** DM Sans (400/500/600)
- **Mono font:** JetBrains Mono (metadata, code, paths)
- **Theme:** CSS custom properties on `[data-theme]`, toggled via button, persisted in localStorage

## Container registry

`ghcr.io/sspaynter/knowledge-base`

Watchtower on the NAS polls for `latest` tag and auto-pulls on every push to `main`.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string — `postgresql://kb_app:<pass>@<host>:<port>/nocodb` |
| `SESSION_SECRET` | Express session signing secret — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `UPLOAD_DIR` | File upload directory — defaults to `/app/uploads` in container (set `/tmp/kb-uploads` for bare node) |
| `PORT` | App port — default 3000 |
| `NODE_ENV` | `production` or `development` |
| `HQ_URL` | Link target for SS42 logo — `https://hq.ss-42.com` |

**DATABASE_URL by environment:**
- Local dev (bare node): `postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb`
- Local dev (docker-compose): set in `.env`, referenced as `${DATABASE_URL}`
- Production (Container Station): `postgresql://kb_app:<pass>@10.0.3.12:5432/nocodb`
