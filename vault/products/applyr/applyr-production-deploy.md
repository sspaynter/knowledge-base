---
author: both
order: 100
title: Applyr Production Setup & Recovery
---



# Applyr Production Setup & Recovery

Reference for creating the Applyr production environment from scratch — container, database, profile data, n8n workflows, and release tagging. Use this when setting up a new environment or recovering from a disaster. For routine releases (v1.1.0, v1.2.0, etc.), use the `lifecycle:release` skill instead.

> **Initial setup executed:** 2026-03-11 (session 66). Procedure steps incorporate all fixes discovered during that deploy.

## Prerequisites

All prerequisites must be complete before starting the deploy.

| # | Prerequisite | Status | Session |
|---|---|---|---|
| #122 | Staging container recreated with uploads volume mount | Done | 65 |
| #123 | n8n workflows duplicated — 3 staging + 3 production copies | Done | 65 |
| #91 | MVP verification on staging | Done | 64 |
| — | Production uploads directory created (`/share/CACHEDEV1_DATA/Container/applyr/uploads`) | Done | 65 |
| — | Cloudflare tunnel route for `jobs.ss-42.com` → port 8084 | Pending — configured in dashboard, awaiting container |

## Architecture

### Environment separation

| Resource | Staging | Production |
|---|---|---|
| Container | `applyr-staging` | `applyr` |
| Image tag | `:dev` | `:latest` |
| Port | 8083 | 8084 |
| Database | `applyr_staging` | `applyr` |
| URL | `applyr-staging.ss-42.com` | `jobs.ss-42.com` |
| Branch | `dev` | `main` |

### Database credentials

Both environments connect to the same PostgreSQL instance (`n8n-postgres` at `10.0.3.12:5432`) using the `nocodb` user. This is by design — the shared_auth SSO schema lives inside the Applyr databases, and all SS42 apps connect to it using the same database user. Production uses database `applyr`, staging uses `applyr_staging`.

### n8n workflows

| Workflow | Staging (active) | Production (inactive until deploy) |
|---|---|---|
| Job Capture Webhook | `K9qRsldsOGrXYpX8` | `tJT3mQ0OSsZdouh0` |
| Job Alert Discovery | `6p2qClZtpnJX5zgK` | `DSB3wLtICaVej4xl` |
| Job Alert Backfill | `VhVowq1g60AG0AJ6` | `FZBepvUncvKpF88H` |

Production copies point at `https://jobs.ss-42.com/api/v1/ingest`. Staging copies remain pointed at `https://applyr-staging.ss-42.com/api/v1/ingest`. Each environment has independent workflows.

## Deploy sequence

### Phase 1: Create production container

1. **Verify production database exists** — `applyr` database on `n8n-postgres`. Should already exist (created during shared_auth setup).

2. **Ensure `:latest` image exists.** If this is the first production deploy and `main` has never been built by CI, no `:latest` tag exists. Tag the current `:dev` image locally on the NAS:

```bash
DOCKER=/share/CACHEDEV2_DATA/.qpkg/container-station/usr/bin/.libs/docker
$DOCKER tag ghcr.io/sspaynter/applyr:dev ghcr.io/sspaynter/applyr:latest
```

After the first merge to main, CI builds the real `:latest` and Watchtower auto-updates.

3. **Create the container:**

```bash
DOCKER=/share/CACHEDEV2_DATA/.qpkg/container-station/usr/bin/.libs/docker
$DOCKER run -d \
  --name applyr \
  --restart unless-stopped \
  -p 8084:3000 \
  -v /share/CACHEDEV1_DATA/Container/applyr/uploads:/app/uploads \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATABASE_URL='postgresql://nocodb:****@10.0.3.12:5432/applyr' \
  -e SESSION_SECRET='****' \
  -e GOOGLE_CLIENT_ID='****' \
  -e GOOGLE_CLIENT_SECRET='****' \
  -e GOOGLE_CALLBACK_URL='https://jobs.ss-42.com/auth/google/callback' \
  -e COOKIE_DOMAIN='.ss-42.com' \
  -e INGEST_SECRET='****' \
  -l 'com.centurylinklabs.watchtower.enable=true' \
  ghcr.io/sspaynter/applyr:latest
```

Key differences from staging:
- `NODE_ENV=production`
- Port `8084` (staging is `8083`)
- Database `applyr` (staging is `applyr_staging`)
- Callback URL uses `jobs.ss-42.com`
- Image tag `:latest` (staging is `:dev`)

4. **Verify container starts** — check logs for `Applyr listening on port 3000 (production)`.

5. **Run migrations manually.** Migrations do not auto-run on startup — they require an explicit CLI step:

```bash
$DOCKER exec applyr node scripts/migrate.js
```

> **Fresh database note:** Migration 002 moves `public.sessions` to `shared_auth` schema, but `connect-pg-simple` only creates the sessions table on first HTTP request. On a fresh database, this migration fails. See [NAS Deployment Lessons](/page/operations/infrastructure/nas-deployment-lessons) for the manual bootstrap procedure.

6. **Add Google OAuth redirect URI** — `https://jobs.ss-42.com/auth/google/callback` must be registered in the Google Cloud Console OAuth client configuration. Without this, sign-in will fail.

### Phase 2: Verify Cloudflare tunnel

1. Confirm `jobs.ss-42.com` routes to `http://192.168.86.18:8084` in the Cloudflare tunnel config.
2. Test: `curl -s https://jobs.ss-42.com/` should return the SPA shell HTML.
3. If NXDOMAIN: `sudo killall -HUP mDNSResponder` to flush local DNS.

### Phase 3: Sign in and migrate profile data

#### 3a. Sign in

Navigate to `https://jobs.ss-42.com` and sign in with Google. This creates the user record in the production database. Note the new `user_id` (will differ from staging).

> **Auto-created records:** The sign-in flow automatically creates default `role_tracks` (PM and IT) and `user_settings` for the new user. The migration steps below account for this — they check for existing data before inserting and use UPDATE for settings.

#### 3b. Migrate profile data

The migration moves 4 tables from staging to production. These tables carry the "learning" — voice profile, role track scoring criteria, resume content, and user settings. All job-related transactional data (jobs, scores, cover letters, etc.) starts fresh.

**What migrates:**

| Table | Content | Why |
|---|---|---|
| `voice_profiles` | Writing style, tone, natural phrases, avoidance patterns, framework logic | Accumulated learning — hardest to recreate |
| `role_tracks` | PM and IT track definitions, scoring criteria and dimension weights | Defines how jobs are scored against preferences |
| `resumes` | Resume metadata, parsed text content, file paths | Links to DOCX files, extracted text used for tailoring |
| `user_settings` | Anthropic API key, notification prefs, company blacklist/whitelist, timezone | User configuration |

**What starts fresh (not migrated):**

| Table | Reason |
|---|---|
| `jobs`, `job_scores` | Staging jobs are test data — real jobs flow in from production n8n workflows |
| `cover_letters`, `resume_tailorings` | Tied to staging test jobs |
| `application_questions`, `contacts`, `company_research` | Tied to staging test jobs |
| `notifications`, `activity_log` | Transient operational data |

**Migration steps:**

> **Important:** PostgreSQL does not support cross-database queries (`applyr_staging.table` syntax does not work). All migration uses the COPY pipe pattern — export to temp file inside the postgres container, then import from that file. See [NAS Deployment Lessons](/page/operations/infrastructure/nas-deployment-lessons) for details.

1. Look up staging `user_id` and production `user_id`:

```bash
DOCKER=/share/CACHEDEV2_DATA/.qpkg/container-station/usr/bin/.libs/docker

# Staging user_id
$DOCKER exec n8n-postgres psql -U nocodb -d applyr_staging -t -A \
  -c "SELECT id FROM shared_auth.users WHERE email = 'paynter.simon@gmail.com';"

# Production user_id
$DOCKER exec n8n-postgres psql -U nocodb -d applyr -t -A \
  -c "SELECT id FROM shared_auth.users WHERE email = 'paynter.simon@gmail.com';"
```

Set variables: `STAGING_UID={result}`, `PROD_UID={result}`.

2. **role_tracks** — skip if already created by sign-in (check first):

```bash
# Check if role_tracks already exist
$DOCKER exec n8n-postgres psql -U nocodb -d applyr -c \
  "SELECT id, slug FROM role_tracks WHERE user_id = $PROD_UID;"

# If rows exist with matching slugs (pm, it), skip this step.
# The sign-in flow creates default tracks automatically.
# If you need to update scoring_criteria from staging, use UPDATE:
$DOCKER exec n8n-postgres bash -c \
  "psql -U nocodb -d applyr_staging -c \"COPY (SELECT slug, scoring_criteria FROM role_tracks WHERE user_id = $STAGING_UID) TO STDOUT WITH CSV\" > /tmp/tracks.csv"

# Then for each row, UPDATE the production track's scoring_criteria by slug.
```

3. **resumes** — export from staging, import to production with track_id remapping:

```bash
# Export resumes with track slug (for remapping)
$DOCKER exec n8n-postgres bash -c \
  "psql -U nocodb -d applyr_staging -c \"COPY (SELECT rt.slug as track_slug, r.label, r.filename, r.file_path, r.content_text, r.parsed_data, r.uploaded_at FROM resumes r JOIN role_tracks rt ON r.track_id = rt.id WHERE r.user_id = $STAGING_UID) TO STDOUT WITH CSV\" > /tmp/resumes.csv"

# Import — map track_slug to production track_id
# For each row in the CSV, run INSERT with a subquery to resolve track_id:
$DOCKER exec n8n-postgres psql -U nocodb -d applyr -c \
  "INSERT INTO resumes (user_id, track_id, label, filename, file_path, content_text, parsed_data, uploaded_at)
   SELECT $PROD_UID, rt.id, '{label}', '{filename}', '{file_path}', '{content_text}', '{parsed_data}', '{uploaded_at}'
   FROM role_tracks rt WHERE rt.slug = '{track_slug}' AND rt.user_id = $PROD_UID;"
```

4. **voice_profiles:**

```bash
$DOCKER exec n8n-postgres bash -c \
  "psql -U nocodb -d applyr_staging -c \"COPY (SELECT profile_data, training_sample_count, updated_at FROM voice_profiles WHERE user_id = $STAGING_UID) TO STDOUT WITH CSV\" > /tmp/voice.csv"

$DOCKER exec n8n-postgres bash -c \
  "psql -U nocodb -d applyr -c \"COPY voice_profiles (user_id, profile_data, training_sample_count, updated_at) FROM STDIN WITH CSV\" < /tmp/voice.csv"
```

Note: The COPY FROM approach works for voice_profiles because user_id is not in the export — prepend `$PROD_UID` to each CSV line, or use INSERT with the exported values.

5. **user_settings** — UPDATE, not INSERT (sign-in creates defaults):

```bash
# Export settings from staging
$DOCKER exec n8n-postgres psql -U nocodb -d applyr_staging -t -A -F',' \
  -c "SELECT anthropic_api_key, timezone FROM user_settings WHERE user_id = $STAGING_UID;"

# Update production settings with staging values
$DOCKER exec n8n-postgres psql -U nocodb -d applyr -c \
  "UPDATE user_settings SET anthropic_api_key = '{key}', timezone = '{tz}', updated_at = NOW() WHERE user_id = $PROD_UID;"
```

3. Copy resume DOCX files:

```bash
cp /share/CACHEDEV1_DATA/Container/applyr-staging/uploads/resume-*.docx \
   /share/CACHEDEV1_DATA/Container/applyr/uploads/
```

4. Verify inside the production container:

```bash
$DOCKER exec applyr ls -la /app/uploads/
```

### Phase 4: Merge and release

1. **Merge `dev` → `main`** — triggers GitHub Actions to build `:latest` image.
2. **Watchtower picks up** `:latest` and restarts the production container.
3. **Verify container restarted** with the new image.
4. **Tag release** — use `lifecycle:release` skill to tag `v1.0.0`, create GitHub Release, write CHANGELOG, write KB release notes.

### Phase 5: Activate production n8n workflows

Only after the production container is confirmed live and serving requests.

> **Webhook path uniqueness:** Staging and production workflows on the same n8n instance must use different webhook paths. Production uses `-prod` suffix: `job-capture-prod`, `job-backfill-prod`. See [NAS Deployment Lessons](/page/operations/infrastructure/nas-deployment-lessons).

1. Activate each production workflow via API or n8n UI:

```bash
N8N_KEY=$(cat ~/.config/n8n/api-key)
for WID in tJT3mQ0OSsZdouh0 DSB3wLtICaVej4xl FZBepvUncvKpF88H; do
  curl -s -X PATCH -H "X-N8N-API-KEY: $N8N_KEY" -H "Content-Type: application/json" \
    -d '{"active": true}' \
    "http://192.168.86.18:32777/api/v1/workflows/$WID"
done
```

2. **Test the webhook** — send a test payload to the production Job Capture Webhook to confirm end-to-end flow.

3. **Verify** a job appears in the production database and is visible in the UI.

### Phase 6: Post-deploy verification

- [ ] `jobs.ss-42.com` loads the SPA
- [ ] Google OAuth sign-in works
- [ ] Voice profile visible in settings
- [ ] Role tracks (PM, IT) visible and correct
- [ ] Resumes listed with correct metadata
- [ ] Resume DOCX export downloads correctly
- [ ] n8n Job Capture Webhook delivers a test job
- [ ] AI scoring triggers on new job (requires Anthropic API key in settings)
- [ ] Cover letter generation works with voice profile

## Rollback

If something goes wrong:

1. **Container issue** — staging remains untouched at `applyr-staging.ss-42.com`. No user-facing impact.
2. **Database issue** — production `applyr` database is independent. Drop and recreate if needed; staging data is not affected.
3. **n8n workflows** — production copies can be deactivated immediately. Staging copies continue running independently.
4. **Merge rollback** — revert the merge commit on `main` if the `:latest` image has issues. Watchtower will pick up the reverted image.

## Deployment notes

The v1.0.0 deploy (session 66) encountered several issues that are now documented in two places:

- **Procedure fixes** — folded into the steps above (image bootstrap, manual migrations, COPY pipe pattern, auto-created records, webhook path uniqueness)
- **Cross-project lessons** — [NAS Deployment Lessons](/page/operations/infrastructure/nas-deployment-lessons) (KB page 549) — reusable patterns for all SS42 container deploys

## Related documents

- [Applyr Overview](/page/products/applyr/applyr-overview)
- [Applyr Architecture](/page/products/applyr/applyr-architecture)
- [Cross-App Auth Architecture](/page/operations/infrastructure/cross-app-auth-architecture)
- [Secrets Management](/page/operations/infrastructure/secrets-management)
- [NAS Containers](/page/operations/infrastructure/nas-containers)
