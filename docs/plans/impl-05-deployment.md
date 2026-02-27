# Knowledge Platform — Implementation Plan
# Phase 5: Deployment — Dockerfile, Docker Compose, CI/CD, Environment

**Goal:** Wire up the full deployment pipeline. Local dev via Docker Compose. Production via GitHub Actions → GHCR → Watchtower auto-pull on the QNAP NAS.

**Infrastructure:**
- Container registry: `ghcr.io/sspaynter/knowledge-base`
- NAS host: `10.0.3.12` (internal) / `192.168.86.18` (LAN dev)
- Database: `n8n-postgres` container on the NAS — PostgreSQL, DB `nocodb`, schema `knowledge_base`
- Public URL: `kb.ss-42.com` via Cloudflare tunnel
- Watchtower is running on the NAS and auto-pulls on `latest` tag push

**Dependencies:** All previous phases complete.

**Task numbering continues from Phase 4 (Tasks 20–24).**

---

## Task 25: Write `Dockerfile`

**Files:**
- Replace: `Dockerfile`

**What this builds:**
Node 20 Alpine image. Non-root user for security. Static files served by Express. Health check endpoint included. Uploads directory volume-mounted for persistence.

**Step 1: Write the file**

Replace `Dockerfile`:

```dockerfile
# ── Build stage ───────────────────────────────
FROM node:20-alpine AS base

# Non-root user for security
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application
COPY . .

# Create uploads dir with correct ownership
RUN mkdir -p uploads && chown -R app:app /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 3000

# Health check — matches /api/health route from Phase 2
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start
CMD ["node", "server.js"]
```

**Notes:**
- No build step — vanilla JS, no bundler
- `--omit=dev` excludes Jest and other dev dependencies from the image
- `uploads/` is created inside the container but should be bind-mounted in production for persistence (see docker-compose)

**Step 2: Verify**

```bash
docker build -t kb-test .
docker run --rm -p 3001:3000 --env-file .env kb-test
# Open http://localhost:3001 — should show auth overlay
```

---

## Task 26: Write `docker-compose.yml`

**Files:**
- Replace: `docker-compose.yml`

**What this builds:**
Local dev compose file. Connects to the NAS PostgreSQL directly (no local DB container — same DB as production, schema is isolated). Bind-mounts uploads directory and source for hot reload.

**Step 1: Write the file**

Replace `docker-compose.yml`:

```yaml
version: "3.9"

services:
  knowledge-base:
    build: .
    container_name: knowledge-base-dev
    ports:
      - "3001:3000"
    environment:
      NODE_ENV: development
      PORT: 3000
      # Database — uses NAS PostgreSQL (LAN access during local dev)
      DB_HOST: ${DB_HOST:-192.168.86.18}
      DB_PORT: ${DB_PORT:-32775}
      DB_NAME: ${DB_NAME:-nocodb}
      DB_USER: ${DB_USER:-kb_app}
      DB_PASS: ${DB_PASS}
      DB_SCHEMA: knowledge_base
      # Auth
      SESSION_SECRET: ${SESSION_SECRET}
      # App
      HQ_URL: ${HQ_URL:-http://hq.local}
    volumes:
      # Persist uploads across container restarts
      - ./uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

**Notes:**
- No `db` service — the NAS PostgreSQL is used directly during dev
- `DB_HOST` defaults to the NAS LAN IP; override in `.env` for different environments
- `DB_PORT` defaults to `32775` — the externally-mapped port for `n8n-postgres` on the NAS (confirm this in NAS Container Station)
- `DB_USER` is `kb_app` — the limited user created by the migration script (Phase 1)

**Step 2: Verify**

```bash
cp .env.example .env
# Fill in DB_PASS and SESSION_SECRET in .env
docker compose up --build
# Open http://localhost:3001
```

---

## Task 27: Write `.env.example`

**Files:**
- Create: `.env.example`

**What this builds:**
Documents all required environment variables. Committed to the repo. The actual `.env` is gitignored.

**Step 1: Write the file**

Create `.env.example`:

```bash
# ── Knowledge Platform — Environment Variables ──
# Copy to .env and fill in values. Never commit .env to git.

# ── Database ──────────────────────────────────
# NAS internal IP and port (use 10.0.3.12 in production container)
DB_HOST=192.168.86.18
# External mapped port for n8n-postgres container (check Container Station)
DB_PORT=32775
DB_NAME=nocodb
# Limited user created by migrate.sql (not the superuser)
DB_USER=kb_app
DB_PASS=your_kb_app_password_here
DB_SCHEMA=knowledge_base

# ── Auth ──────────────────────────────────────
# Long random string — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=generate_a_long_random_string_here

# ── App ───────────────────────────────────────
PORT=3000
NODE_ENV=production
# Internal HQ hub URL (displayed in logo link)
HQ_URL=https://hq.ss-42.com
```

**Step 2: Update `.gitignore`**

Ensure `.gitignore` contains:

```
.env
uploads/
node_modules/
coverage/
```

---

## Task 28: Write `package.json` updates

**Files:**
- Modify: `package.json`

**What this builds:**
Adds multer (file uploads), updates scripts to include migrate, seed, and test commands.

**Step 1: Ensure dependencies are correct**

`package.json` dependencies section must include:

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  }
}
```

**Step 2: Ensure scripts section is correct**

```json
{
  "scripts": {
    "start":   "node server.js",
    "dev":     "node --watch server.js",
    "migrate": "node scripts/run-migration.js",
    "seed":    "node scripts/seed.js",
    "test":    "jest --runInBand",
    "test:watch": "jest --watch"
  }
}
```

**Step 3: Install multer**

```bash
npm install multer@1.4.5-lts.1
```

---

## Task 29: Write `.github/workflows/deploy.yml`

**Files:**
- Create: `.github/workflows/deploy.yml`

**What this builds:**
GitHub Actions workflow. On push to `main`, builds the Docker image, pushes to GHCR with the `latest` tag, and Watchtower on the NAS detects and pulls it automatically.

**Step 1: Write the file**

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=sha,prefix=sha-

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Notes:**
- Uses `GITHUB_TOKEN` — no secrets setup needed for GHCR
- Pushes `latest` on every push to `main`
- Watchtower on the NAS polls GHCR for `latest` tag changes and auto-pulls
- Also pushes a `sha-` tagged image for rollback reference

**Step 2: Verify GitHub Actions access**

1. Go to `github.com/sspaynter/knowledge-base` → Settings → Actions → General
2. Confirm "Read and write permissions" is enabled for GITHUB_TOKEN
3. Push to `main` and confirm the workflow runs in the Actions tab
4. Check GHCR: `github.com/sspaynter` → Packages → `knowledge-base`

---

## Task 30: NAS container configuration

**Not a file — this is an operational step. Refer to `nas-ops` and `nas-deploy` skills.**

When deploying to the NAS for the first time:

**Step 1: Run migration on NAS PostgreSQL**

From a machine with NAS LAN access:

```bash
# Set env vars pointing to NAS
export DB_HOST=192.168.86.18
export DB_PORT=32775
export DB_NAME=nocodb
export DB_USER=nocodb        # superuser — needed only for initial migration
export DB_PASS=nocodb2026    # confirm this is still correct
node scripts/run-migration.js
node scripts/seed.js
```

**Note:** The migration script (`scripts/run-migration.js` from Phase 1) creates the `knowledge_base` schema, all 12 tables, the `kb_app` user, and grants. After migration, subsequent operations use `kb_app` — not the superuser.

**Step 2: Create container in Container Station**

| Setting | Value |
|---|---|
| Image | `ghcr.io/sspaynter/knowledge-base:latest` |
| Container name | `knowledge-base` |
| Network | Same bridge network as `n8n-postgres` — or use host IP `10.0.3.12` |
| Port | Map container `3000` → host port (check available ports in nas-ops skill) |
| Restart policy | Always |

**Step 3: Set environment variables in Container Station**

```
DB_HOST=10.0.3.12
DB_PORT=5432
DB_NAME=nocodb
DB_USER=kb_app
DB_PASS=<your_kb_app_password>
DB_SCHEMA=knowledge_base
SESSION_SECRET=<generate_32_byte_hex>
PORT=3000
NODE_ENV=production
HQ_URL=https://hq.ss-42.com
```

**Step 4: Set up Cloudflare tunnel**

In Cloudflare Zero Trust dashboard:
- Add route: `kb.ss-42.com` → `http://localhost:<host_port>`
- Or if using the existing tunnel config on the NAS: add the service to `config.yml`

**Step 5: Verify**

```bash
# From LAN
curl http://192.168.86.18:<host_port>/api/health
# Should return: {"status":"ok","schema":"knowledge_base"}

# From internet
curl https://kb.ss-42.com/api/health
```

---

## Summary — Phase 5 files created or modified

| File | Action | Purpose |
|---|---|---|
| `Dockerfile` | Replace | Node 20 Alpine, non-root user, health check |
| `docker-compose.yml` | Replace | Local dev with NAS DB connection |
| `.env.example` | Create | All env vars documented |
| `.gitignore` | Update | Add .env, uploads/ |
| `package.json` | Update | Add multer, complete scripts |
| `.github/workflows/deploy.yml` | Create | Build → GHCR push on push to main |

---

## Full build sequence — all phases

Once all five phase files are merged (see merge step), the complete build runs in this order:

```
1. Database (Phase 1)
   npm run migrate        ← creates schema, tables, kb_app user
   npm run seed           ← inserts workspaces, sections, templates, settings
   node scripts/migrate-nocodb.js  ← migrates old NocoDB records to assets

2. Backend (Phase 2)
   npm install            ← ensure multer and all deps installed
   npm test               ← all backend route tests must pass before continuing

3. Frontend (Phases 3 + 4)
   Open in browser        ← verify boot, nav, content, editor, search, settings, map

4. Deployment (Phase 5)
   git push origin main   ← triggers GitHub Actions → GHCR push → Watchtower pull
   curl https://kb.ss-42.com/api/health  ← confirm live
```

---

## Outstanding P1 items before build can start

From `MASTER-TODO.md`:

| # | Item | Needed for |
|---|---|---|
| 2 | Resolve DB superuser password for n8n-postgres | `npm run migrate` |
| 3 | Confirm external port for n8n-postgres on LAN | `.env` `DB_PORT` value |
| 4 | Confirm HQ hub subdomain URL | `.env` `HQ_URL` value |

These must be resolved before running the migration in Task 30.
