# lifecycle:release — Skill Reference

**Type:** Claude skill reference
**Status:** Shipped — 2026-03-02. Updated 2026-03-13 (step 1 package.json bump, step 13 living docs, common mistakes).
**Skill location:** `~/.claude/skills/lifecycle-release/SKILL.md`
**Design doc:** `vault/it-and-projects/claude/lifecycle-release-design.md`
**MASTER-TODO:** #23 ✅ complete

---

## What it does

`lifecycle:release` executes the full release pipeline for any SS42 project. It is invoked at step 6 of the Development Pipeline — after staging has been verified and before touching `main`.

One command triggers the full sequence: pre-flight checks → commit analysis → version recommendation → single human confirmation → automated execution → post-release verification.

---

## When to invoke it

After verifying the feature on staging (`{project}-staging.ss-42.com`). Say:

```
lifecycle:release
```

Or specify the version bump if needed:

```
lifecycle:release minor
```

---

## What it does — 5 phases

### Phase 1: Pre-flight (read-only)

Runs 7 checks before any git operation. Hard-stop failures create a GitHub Issue and halt execution. Warnings surface but do not block.

**Hard stops:**
- Working tree is dirty
- `gh` CLI not authenticated
- `dev` is not ahead of `main` (nothing to release)

**Warnings:**
- Not on `dev` branch
- No CI workflow found
- CI workflow missing semver tag detection (`:vX.Y.Z` Docker tags not built)
- No dev branch CI trigger (staging auto-deploy not configured)

### Phase 2: Commit analysis

Reads git log since the last tag, classifies each commit (`feat` / `fix` / `chore` / `breaking`), and recommends a version bump. Drafts CHANGELOG entry and GitHub Release notes.

### Phase 3: Confirmation gate

Presents a full summary and waits for explicit approval. Nothing irreversible runs before this.

```
Project: knowledge-base
Current version: v1.0.0
Recommended: v1.1.0 (minor — 4 features, 2 fixes)

Release as v1.1.0? (yes / no / specify version)
```

### Phase 4: Execution (13 steps, fully automated after confirmation)

1. Bump `package.json` version to X.Y.Z (if project has one) — commit and push to `dev`
2. Checkout `main`
3. Merge `dev` → `main` (no-ff)
4. Create annotated tag `vX.Y.Z`
5. Push `main`
6. Push tag (triggers CI: builds `:latest` and `:vX.Y.Z`)
7. Create GitHub Release with generated notes
8. Write/update `CHANGELOG.md` in project root (creates on first release)
9. Commit CHANGELOG and push
10. Write KB vault release page at `vault/products/{project}/releases/vX.Y.Z.md` and sync via `kb-sync.sh`
11. Update MEMORY.md with the new version, release date, and phase status
12. Update living documentation — version references across all docs:
    - Project CLAUDE.md (`Current version:` line)
    - MASTER-TODO.md Big Picture table (project row status)
    - KB vault overview page (`Version:` and `Released:` lines)
    - KB vault feature-status page (production deploy row + session log entry)
    - Sync updated vault pages and commit
13. Sync `dev` with `main` (fast-forward merge + push)

### Phase 5: Post-release verification

Confirms the GitHub Release exists and CI has triggered. Outputs rollback commands regardless of release outcome. Confirms MEMORY.md version matches the release. Verifies `/api/version` returns the correct version (if project has one).

---

## Non-negotiables

| What | Why |
|---|---|
| package.json version is bumped | The `/api/version` endpoint reads from package.json. Users see a stale version in the UI if this is skipped. |
| CHANGELOG.md is created/updated | GitHub Releases do not replace it. It is the version-controlled record in the project repo. |
| KB vault release page is written | Contains the rollback command. Required for every release — not optional. |
| MEMORY.md version is updated | Stale versions in memory cause confusion in future sessions. Update immediately — do not rely on end-of-session to catch it. |
| Living docs are updated | CLAUDE.md, MASTER-TODO, KB overview, KB feature-status — all version references must match the release. |
| Rollback commands always shown | Even on success. Needed at 11pm when something goes wrong. |
| Hard-stop failures create GitHub Issues | Failures are tracked items, not silent blocks. |

---

## CI workflow gaps

The skill detects but does not fix two common gaps:

| Gap | Impact | Fix |
|---|---|---|
| No semver tag detection in CI | Docker only builds `:latest`, not `:vX.Y.Z`. Rollback by version is not possible. | Add `type=semver` to `docker/metadata-action` tags in `deploy.yml` |
| No dev branch CI trigger | Staging does not auto-deploy on push to `dev`. | Add `branches: [dev]` trigger to `deploy.yml` |

Both are per-project fixes, not skill fixes.

---

## Rollback procedure (produced by the skill)

```bash
docker pull ghcr.io/{repo}:{previous-version}
# On NAS:
$DOCKER stop {container} && $DOCKER rm {container}
# Update docker-compose.yml image tag to :{previous-version}
$DOCKER compose up -d {service}
```

---

## Design decisions

See `vault/it-and-projects/claude/lifecycle-release-design.md` for full architecture decisions including:
- Why Approach A (commit analysis + AI recommendation) was chosen over manual version specification
- Approach C (narrative release notes) deferred until lifecycle:ideation + lifecycle:prioritize exist (MASTER-TODO #29)
- Branch handling for feature/trial branches
