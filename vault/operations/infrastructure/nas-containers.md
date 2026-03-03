# NAS Container Inventory — Job Search Project

## Access

- NAS LAN IP: `192.168.86.18`
- SSH: `ssh nas` (key: `~/.ssh/nas_claude`)
- Docker binary: `/share/CACHEDEV2_DATA/.qpkg/container-station/usr/bin/.libs/docker`
- Container data: `/share/CACHEDEV1_DATA/Container/`

## Containers

### n8n (workflow automation)

| Property | Value |
|---|---|
| Container name | `n8n` |
| Image | `n8nio/n8n` |
| LAN URL | `http://192.168.86.18:32777` |
| External URL | `https://n8n.ss-42.com` (Cloudflare Tunnel) |
| Network | bridge |
| Restart policy | unless-stopped |

Runs three workflows:
- **Job Alert Discovery** (`6p2qClZtpnJX5zgK`) — processes new email alerts on schedule
- **Job Alert Backfill** (`VhVowq1g60AG0AJ6`) — manual trigger, reprocesses last 3 days
- **Job Capture Webhook** (`K9qRsldsOGrXYpX8`) — receives captures from Claude Code

### n8n-postgres (PostgreSQL)

| Property | Value |
|---|---|
| Container name | `n8n-postgres` |
| Image | `postgres:16-alpine` |
| Internal IP | `10.0.3.12` |
| External port | `32775` (mapped to 5432 internally) |
| Databases | `n8n`, `nocodb` (includes `knowledge_base` schema), `applyr`, `applyr_staging` |
| User | `nocodb` (limited), `n8n` (superuser) |
| Network | bridge |

Hosts the `jobs` table (schema `pys9d495uci8hea`), `knowledge_base` schema (12 tables), and calibration tables. Shared by n8n, NocoDB, the review app (via NocoDB API), Applyr, and the Knowledge Platform.

**Databases:**
- `n8n` — n8n internal data
- `nocodb` — NocoDB data including the original `jobs` table (schema `pys9d495uci8hea`)
- `applyr` — Applyr production database (15 tables, owned by `nocodb`)
- `applyr_staging` — Applyr staging database (15 tables, owned by `nocodb`)

### nocodb (database web UI)

| Property | Value |
|---|---|
| Container name | `nocodb` |
| Image | `nocodb/nocodb:latest` |
| LAN URL | `http://192.168.86.18:32778` |
| Internal IP | `10.0.3.14` |
| Network | bridge |
| Restart policy | unless-stopped |
| Data volume | `/share/CACHEDEV1_DATA/Container/nocodb/data` |

Provides grid, gallery, kanban, and form views over the PostgreSQL `jobs` table. Also exposes a REST API used by the review app.

**API token:** `CtZC_qUs2EVeJxVXXi7TTTCSYj1-PlVH_jffElx6`
**Base ID:** `pys9d495uci8hea`
**Jobs table ID:** `mcgr1va82zwmcax`

### job-review-app (nginx — review interface)

| Property | Value |
|---|---|
| Container name | `job-review-app` |
| Image | `nginx:alpine` |
| LAN URL | `http://192.168.86.18:8082` |
| Port mapping | `8082 → 80` |
| Network | bridge |
| Restart policy | unless-stopped |
| Volume | `/share/CACHEDEV1_DATA/Container/web-apps/review-app` → `/usr/share/nginx/html:ro` |

Serves the custom job review app — a single HTML file that talks to NocoDB's REST API via browser fetch calls. No backend needed.

**To update the review app:** Copy the new `index.html` to the NAS volume folder. Nginx serves it immediately, no container restart needed.

```
scp review-app/index.html nas:/share/CACHEDEV1_DATA/Container/web-apps/review-app/
```

### knowledge-base (Knowledge Platform — production)

| Property | Value |
|---|---|
| Container name | `knowledge-base` |
| Image | `ghcr.io/sspaynter/knowledge-base:latest` |
| LAN URL | `http://192.168.86.18:32781` |
| External URL | `https://kb.ss-42.com` (Cloudflare Tunnel) |
| Internal IP | `10.0.3.8` |
| Port mapping | `32781 → 3000` |
| Network | bridge |
| Restart policy | always |
| Watchtower | enabled |
| Volume (uploads) | `/share/CACHEDEV1_DATA/Container/knowledge-base/data` → `/app/uploads` |

Node.js/Express application. Uses `knowledge_base` schema in the `nocodb` database on n8n-postgres. Username/password auth (bcryptjs + session cookies) and Bearer token API auth. Auto-deploys via Watchtower on push to `main`.

### knowledge-base-staging (Knowledge Platform — staging)

| Property | Value |
|---|---|
| Container name | `knowledge-base-staging` |
| Image | `ghcr.io/sspaynter/knowledge-base:dev` |
| LAN URL | `http://192.168.86.18:32780` |
| External URL | `https://kb-staging.ss-42.com` (Cloudflare Tunnel) |
| Internal IP | `10.0.3.16` |
| Port mapping | `32780 → 3000` |
| Network | bridge |
| Restart policy | always |
| Watchtower | enabled (`com.centurylinklabs.watchtower.enable=true`) |
| Volume (uploads) | `/share/CACHEDEV1_DATA/Container/knowledge-base-staging/uploads` → `/app/uploads` |
| Volume (vault) | `/share/CACHEDEV1_DATA/Container/knowledge-base-staging/vault` → `/app/vault` |

v2.0 staging with vault sync engine (chokidar file watcher), Mermaid.js diagramming, indigo visual redesign, and Google OAuth SSO via shared_auth schema. Shares the same `knowledge_base` schema as production (same content). Auto-deploys via Watchtower on push to `dev`.

**Environment variables:** `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET` (shared SSO secret from `/share/Container/shared-secrets.env`), `VAULT_DIR=/app/vault`, `CHOKIDAR_USEPOLLING=true`, `HQ_URL=https://hq.ss-42.com`, `SHARED_AUTH_DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL=https://kb-staging.ss-42.com/auth/google/callback`, `COOKIE_DOMAIN=.ss-42.com`

### applyr-staging (Applyr job platform — staging)

| Property | Value |
|---|---|
| Container name | `applyr-staging` |
| Image | `ghcr.io/sspaynter/applyr:dev` |
| LAN URL | `http://192.168.86.18:8083` |
| External URL | `https://applyr-staging.ss-42.com` (Cloudflare Tunnel) |
| Port mapping | `8083 → 3000` |
| Network | bridge |
| Restart policy | unless-stopped |
| Watchtower | enabled (`com.centurylinklabs.watchtower.enable=true`) |
| Volume | `/share/CACHEDEV1_DATA/Container/applyr-staging/uploads` → `/app/uploads` |

Node.js/Express application. Connects to `applyr_staging` database on n8n-postgres. Google OAuth for authentication (invite-only via `allowed_emails` table). Auto-deploys via Watchtower when `:dev` image is pushed to GHCR (CI builds on push to `dev` branch).

**Environment variables:** `NODE_ENV=staging`, `DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL=https://applyr-staging.ss-42.com/auth/google/callback`

## Network

All containers are on the Docker `bridge` network. They can reach each other via internal IPs (10.0.3.x range) or via the NAS LAN IP with mapped ports.

## Adding New Apps

Each proper application (with its own backend) gets its own container. Static frontends can share an nginx container or get their own — one container per app is simpler to manage.

Pattern for a new static app:
1. Create folder: `/share/CACHEDEV1_DATA/Container/web-apps/{app-name}/`
2. Copy files to folder
3. Deploy: `docker run -d --name {app-name} --network bridge --restart unless-stopped -v /share/CACHEDEV1_DATA/Container/web-apps/{app-name}:/usr/share/nginx/html:ro -p {port}:80 nginx:alpine`
