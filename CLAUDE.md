# Knowledge Platform — Project Context

## What This Is

A self-hosted knowledge platform — personal second brain with a human-first authoring interface. Structured like Confluence, feels like Notion, owned entirely.

Content spans all domains: work, personal, IT infrastructure, projects, business, learning. Anything worth remembering lives here.

**Current version:** v2.2.2 — live at `kb.ss-42.com`
**Owner:** Simon Paynter (paynter.simon@gmail.com, GitHub: sspaynter)
**Public URL:** `kb.ss-42.com` (Cloudflare tunnel — pending container creation)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 20 (Alpine Docker) |
| Framework | Express 4 (CommonJS require, modular routes) |
| Database | PostgreSQL via `pg` — `knowledge_base` schema in `n8n-postgres` on NAS |
| Auth | bcryptjs + cookie-parser — HttpOnly session cookies (browser) + Bearer token (API/Claude) |
| File uploads | multer — disk storage, 50MB limit, allowlisted types |
| Frontend | Vanilla JS ES6 modules — no build step, no framework |
| Markdown | marked + DOMPurify (CDN UMD globals) |
| Icons | Lucide (CDN UMD) — `window.lucide.createIcons()` after DOM changes |
| Fonts | DM Sans (UI), Lora (article body), JetBrains Mono (metadata/code) |
| CI/CD | GitHub Actions → GHCR → Watchtower auto-pull on NAS |
| Hosting | QNAP NAS, Cloudflare tunnel at `kb.ss-42.com` |

---

## Database

| Setting | Value |
|---|---|
| Container | `n8n-postgres` (QNAP NAS) |
| Host — LAN (dev) | `192.168.86.18:32775` |
| Host — Docker NAT (production container) | `10.0.3.12:5432` |
| Database | `nocodb` |
| Schema | `knowledge_base` |
| App user | `kb_app` (limited — created by migration script) |
| Superuser | `nocodb / nocodb2026` — used ONLY for initial migration |

**Connection:** Always via `DATABASE_URL` env var.
- Local dev: `postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb`
- Production: `postgresql://kb_app:<pass>@10.0.3.12:5432/nocodb`

### Schema — 12 tables

workspaces, sections, pages, assets, asset_versions, page_assets, templates, asset_relationships, api_tokens, users, sessions, settings

---

## Environment Variables

```
DATABASE_URL=postgresql://kb_app:<pass>@<host>:<port>/nocodb
SESSION_SECRET=<32-byte-hex>
UPLOAD_DIR=/app/uploads
PORT=3000
NODE_ENV=production
HQ_URL=https://hq.ss-42.com
```

See `.env.example`. Never hardcode credentials.

---

## Key Files

```
knowledge-base/
├── server.js                    # Express entry point, all routes mounted
├── services/
│   ├── database.js              # pg Pool, init(), getPool(), SCHEMA
│   ├── auth.js                  # user/session/token management
│   ├── workspaces.js            # workspace + section CRUD
│   ├── pages.js                 # page tree, soft delete, reparent
│   ├── assets.js                # asset CRUD, version snapshots
│   └── relationships.js         # asset relationship queries
├── middleware/
│   ├── requireAuth.js           # Bearer token -> session; requireRole()
│   ├── upload.js                # multer config
│   └── errorHandler.js          # central error handler
├── routes/
│   ├── auth.js                  # /api/auth: login, register, logout, check
│   ├── workspaces.js            # /api/workspaces + sections
│   ├── pages.js                 # /api/pages: CRUD, tree, move
│   ├── assets.js                # /api/assets: CRUD, versions
│   ├── relationships.js         # /api/relationships
│   ├── search.js                # /api/search: full-text
│   ├── upload.js                # /api/upload
│   └── admin.js                 # /api/admin: users, tokens, settings
├── scripts/
│   ├── migrate.sql              # Full schema DDL
│   ├── run-migration.js         # npm run migrate
│   ├── seed.js                  # npm run seed
│   └── migrate-nocodb.js        # one-time NocoDB migration (17 docs moved)
├── public/
│   ├── index.html               # SPA shell, three-column layout
│   ├── css/styles.css           # Complete design system
│   └── js/
│       ├── app.js / api.js / store.js / auth.js   # boot + nav
│       ├── content.js / editor.js                 # page view + edit
│       ├── search.js / map.js / settings.js        # overlays
│       └── toast.js / utils.js                     # helpers
├── tests/                       # Jest + Supertest, 33 tests, 11 suites
├── Dockerfile                   # Node 20 Alpine, non-root user
├── docker-compose.yml           # Local dev: port 3001, NAS DB
├── .env.example                 # All vars documented
└── .github/workflows/deploy.yml # push to main → GHCR :latest
```

---

## Running the App

**Local (bare node):**
```bash
DATABASE_URL=postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb \
UPLOAD_DIR=/tmp/kb-uploads node server.js
```

**Local (Docker):**
```bash
cp .env.example .env  # fill DATABASE_URL + SESSION_SECRET
docker compose up --build
# http://localhost:3001
```

**Tests:**
```bash
DATABASE_URL=postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb \
UPLOAD_DIR=/tmp/kb-test npm test
```

---

## Frontend Security

All DOM content via `textContent` only. No `innerHTML`.

Markdown: `setMarkdownContent(element, md)` in `utils.js`:
`marked.parse` → `DOMPurify.sanitize` → `DOMParser` → `appendChild`

---

## NAS Deployment Checklist

1. `git push origin main` — triggers GitHub Actions build → image pushed to `ghcr.io/sspaynter/knowledge-base:latest`
2. Migration already run (Session 4). Schema `knowledge_base` exists in `n8n-postgres`.
3. Container Station: create from `ghcr.io/sspaynter/knowledge-base:latest`
   - Network: NAT (10.0.3.x)
   - Volume: `/share/CACHEDEV1_DATA/Container/knowledge-base/data` → `/app/uploads`
   - Label: `com.centurylinklabs.watchtower.enable=true` (enables Watchtower auto-update)
   - Set all env vars (see below)
4. Cloudflare tunnel: `kb.ss-42.com` → `http://192.168.86.18:32779`
5. `curl https://kb.ss-42.com/api/health` → `{"status":"ok","schema":"knowledge_base"}`

**Production env vars for Container Station:**
```
DATABASE_URL=postgresql://kb_app:eb8aa0f9f18a0e279fc05f8b836cd328750d542acb3ba2f3@10.0.3.12:5432/nocodb
SESSION_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
UPLOAD_DIR=/app/uploads
PORT=3000
NODE_ENV=production
HQ_URL=https://hq.ss-42.com
```

Details: `docs/plans/impl-05-deployment.md`

---

## Knowledge Base Vault

KB project documentation lives at `knowledge-base/vault/products/knowledge-base/`.

**Workspace:** `products/knowledge-base/`

At session end, write or update vault articles under `products/knowledge-base/`:
- `products/knowledge-base/kp-overview.md` — architecture, status, key decisions
- `products/knowledge-base/kp-architecture.md` — vault sync, three-layer read, DB schema
- `products/knowledge-base/kp-feature-status.md` — phase progress, what is live

## Background Skills (applied silently)

- `code-quality` — coding standards
- `infra-context` — DATABASE_URL pattern, Docker networking
- `nas-ops` — NAS IPs, container ports
