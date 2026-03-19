---
title: "Incident: Vault Directory Ownership Mismatch"
status: published
author: both
created: 2026-03-19
updated: 2026-03-19
---

# Incident: Vault Directory Ownership Mismatch

**Date:** 2026-03-19
**Severity:** Medium — blocked writes to one vault section
**Duration:** Unknown onset → fixed same day
**Affected:** `products/ssa-website/` vault directory on NAS

## Symptoms

The SSA Website project session could not sync vault content via `kb-sync.sh`. The API returned HTTP 500 errors when writing to the `products/ssa-website/` section. Other sections (e.g. `products/captur/`) worked normally.

Sync log entries (`~/.kb-sync.log`):
- 2026-03-18 23:42:49 — `ssa-website-feature-status.md` sync failed (500)
- 2026-03-18 23:43:09 — `ssa-website-feature-status.md` retry failed (500)
- 2026-03-18 23:47:19 — `ssa-website-updates-v2.md` sync failed (500)

## Root Cause

The `products/ssa-website/` directory and all 4 files inside it were owned by **UID 501:GID 20** (macOS user `simonpaynter:staff`) instead of **UID 100:GID 101** (container user `app:app`).

The KB container runs as the `app` user (UID 100). With the directory owned by UID 501, the container could read files (world-readable permissions) but could not write — causing the `fs.writeFileSync` in `POST /api/pages/by-path` to throw EACCES, which surfaced as HTTP 500.

Every other directory in the vault was correctly owned by 100:101.

## How It Happened

The SSA Website vault pages were first created 2026-03-16/17. The normal write path (`kb-sync.sh` → HTTP API → container writes as `app`) produces correct UID 100 ownership.

The `ssa-website` directory was created by a process that wrote directly to the NAS filesystem from macOS — likely via SSH, rsync, or a Claude session that bypassed the API. macOS UID 501 was preserved on the files, and the container's `app` user could not write to them.

**Initially suspected cause — ghost cleanup (session 76):** Investigation ruled this out. The ghost cleanup in session 76 soft-deleted 4 engineering-practice pages (534, 535, 537, 548) via API calls only. The KB codebase has no code that deletes vault files from disk (`fs.unlinkSync` does not exist anywhere). The ghost cleanup never touched the filesystem and is unrelated to the ssa-website directory.

## Resolution

### Immediate fix (session 79)

```bash
ssh nas "chown -R 100:101 /share/Container/knowledge-base/vault/products/ssa-website/"
```

Vault-wide audit confirmed no other directories had wrong ownership.

### Guardrail — entrypoint ownership fix (session 79)

Added `entrypoint.sh` to the KB container that runs `chown -R app:app /app/vault /app/uploads` on every startup before dropping privileges to the `app` user via `su-exec`. This ensures volume-mounted directories always have correct ownership regardless of how they were created on the host.

Files changed:
- `entrypoint.sh` (new) — chown + privilege drop
- `Dockerfile` — install `su-exec`, copy entrypoint, replace `USER app` + `CMD` with `ENTRYPOINT`

### Operational rule

Never write to the NAS vault directory directly via SSH, rsync, or scp. Always use `kb-sync.sh` (which goes through the HTTP API, writing as the container's `app` user).

## Lessons Learned

1. **Docker volume UID mismatch is a classic problem.** Build-time `chown` does not apply to runtime volume mounts. An entrypoint script that fixes ownership is the standard solution.
2. **Initial diagnosis can mislead.** The ghost cleanup was suspected but investigation proved it was unrelated — API-only operations that never touch the filesystem.
3. **The sync log (`~/.kb-sync.log`) was the key evidence** that pinpointed when the failures started and which paths were affected.
