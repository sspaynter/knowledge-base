---
author: both
order: 140
title: NAS Deployment Lessons
---



# NAS Deployment Lessons

Operational lessons from deploying containers on the QNAP NAS. These apply across all SS42 projects, not just the project where they were discovered. Reference this page before any new container deploy or database migration.

## PostgreSQL

### No cross-database queries

PostgreSQL does not support `SELECT ... FROM other_database.table` syntax. The `dblink` extension requires superuser privileges (the `nocodb` user does not have them).

**Pattern — COPY pipe via temp files inside the postgres container:**

```bash
DOCKER=/share/CACHEDEV2_DATA/.qpkg/container-station/usr/bin/.libs/docker

# Export from source database
$DOCKER exec n8n-postgres bash -c \
  'psql -U nocodb -d source_db -c "COPY (SELECT col1, col2 FROM table WHERE condition) TO STDOUT WITH CSV" > /tmp/data.csv'

# Import to target database
$DOCKER exec n8n-postgres bash -c \
  'psql -U nocodb -d target_db -c "COPY target_table (col1, col2) FROM STDIN WITH CSV" < /tmp/data.csv'

# Clean up
$DOCKER exec n8n-postgres rm /tmp/data.csv
```

This runs entirely inside the postgres container — no temp files on the host, no superuser needed.

*Source: Applyr v1.0.0 deploy (session 66) — profile data migration from staging to production.*

### connect-pg-simple sessions table timing

`connect-pg-simple` creates the `sessions` table on first HTTP request, not at application startup. On a fresh database, the table does not exist until someone hits the app.

**Impact:** Any migration that references `public.sessions` (e.g. moving it to another schema) will fail on a fresh database.

**Pattern:** Either create the sessions table explicitly in an early migration, or guard schema-move migrations with `IF EXISTS`.

*Source: Applyr v1.0.0 deploy (session 66) — migration 002 failed on fresh production database.*

### Auto-created records on first sign-in

Some apps create default records during the OAuth sign-in flow (e.g. user_settings, role_tracks). If a data migration tries to INSERT these records after the user has already signed in, it fails with duplicate key violations.

**Pattern:** Always check for existing data before INSERT. Use `INSERT ... ON CONFLICT DO UPDATE` or check row counts first. For settings-type tables, prefer UPDATE over INSERT when migrating.

*Source: Applyr v1.0.0 deploy (session 66) — role_tracks and user_settings already existed from sign-in.*

## Docker / Watchtower

### No image tag before first CI build

When creating a container that uses `:latest`, the tag may not exist if CI has never built for the `main` branch. Only `:dev` exists from dev branch pushes.

**Pattern:** Before creating the container, tag the current `:dev` image as `:latest` locally on the NAS:

```bash
$DOCKER tag ghcr.io/{repo}:dev ghcr.io/{repo}:latest
```

After the first merge to main, CI builds the real `:latest` and Watchtower auto-updates.

*Source: Applyr v1.0.0 deploy (session 66).*

### Watchtower restarts clear in-memory state

When Watchtower pulls a new image and restarts a container, any in-memory state resets. This includes rate limiters, caches, and non-persistent session stores. PostgreSQL-backed sessions survive, but if the user was in a blocked state (e.g. rate limited), the restart clears it.

**Impact:** If a user was repeatedly hitting a rate-limited endpoint, the restart resets the counter. This is usually helpful, but be aware that Watchtower restarts can happen at any time after a push to the tracked branch.

*Source: Applyr v1.0.0 deploy (session 66) — user hit rate limiter on /auth/denied, restart cleared it.*

### Migrations are manual unless wired into startup

Container applications do not auto-run database migrations on startup unless explicitly coded to do so. After creating a new container or updating an image, always run migrations manually:

```bash
$DOCKER exec {container} node scripts/migrate.js
```

Do not assume "the app runs migrations on startup" unless you have verified it in `server/index.js` or equivalent entry point.

*Source: Applyr v1.0.0 deploy (session 66) — runbook incorrectly stated migrations auto-run.*

## n8n

### Webhook paths must be unique across all workflows

On a shared n8n instance, webhook paths are globally unique. If staging and production workflows use the same webhook path (e.g. `job-capture`), activating the second one fails with a conflict error.

**Pattern:** Use environment-suffixed webhook paths:
- Staging: `job-capture`, `job-backfill`
- Production: `job-capture-prod`, `job-backfill-prod`

This allows both environments to run simultaneously on the same n8n instance.

*Source: Applyr v1.0.0 deploy (session 66) — webhook activation conflict between staging and production.*

### n8n API PUT accepts only specific fields

The `PUT /api/v1/workflows/{id}` endpoint rejects requests that include fields beyond `name`, `nodes`, `connections`, and `settings`. Sending the full GET response back as a PUT body fails with "must NOT have additional properties."

**Pattern:** When updating a workflow via API, strip the response to allowed fields:

```bash
# GET the workflow, modify nodes, then PUT only allowed fields
curl -s -H "X-N8N-API-KEY: $KEY" "http://192.168.86.18:32777/api/v1/workflows/$WID" \
  | jq '{name, nodes, connections, settings}' \
  > /tmp/workflow-update.json

# Modify nodes in the file, then:
curl -s -X PUT -H "X-N8N-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d @/tmp/workflow-update.json \
  "http://192.168.86.18:32777/api/v1/workflows/$WID"
```

*Source: Applyr v1.0.0 deploy (session 66) — webhook path update via API.*

## Related documents

- [NAS Containers](/page/operations/infrastructure/nas-containers)
- [Applyr Production Deploy Runbook](/page/products/applyr/applyr-production-deploy)
- [Secrets Management](/page/operations/infrastructure/secrets-management)
- [Cross-App Auth Architecture](/page/operations/infrastructure/cross-app-auth-architecture)
