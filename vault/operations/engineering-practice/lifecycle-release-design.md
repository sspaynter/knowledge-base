# lifecycle:release — Design Document

**Date:** 2026-03-02
**Status:** Approved — ready for implementation
**Skill location:** `~/.claude/skills/lifecycle-release/SKILL.md`
**MASTER-TODO:** #23 (Approach A), #29 (future Approach C upgrade)

---

## Purpose

A Claude skill that executes the full release pipeline for any SS42 project — from pre-flight verification through to a tagged GitHub Release, updated CHANGELOG, and KB vault release page. Fully automated after a single human confirmation gate.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Automation level | Fully automated | Simon confirmed: Claude runs everything |
| Version bump source | Claude analyzes commits, recommends, human confirms | AI-native; no conventional commits required; single gate before irreversible steps |
| Version bump fallback | Simon specifies at invocation (`lifecycle:release minor`) | Until lifecycle:ideation + lifecycle:prioritize feed structured issue data |
| On pre-flight failure | Hard stop, create GitHub Issue | Surface problem as a tracked item, never proceed silently into broken state |
| Branching model | `dev` → `main` (simplified gitflow) | Matches existing infra-context standard |
| Feature/trial branches | Supported as source for experimental releases | Pre-flight checks branch context and warns if not on `dev`; can override |
| Docker versioned tag | `:vX.Y.Z` added alongside `:latest` | Enables rollback by version; requires CI workflow update |
| KB vault page | Written to `knowledge-base/vault/it-and-projects/projects/{project}/releases/` | Vault is source of truth; separate git commit from knowledge-base repo |
| Approach C upgrade | Deferred — logged as #29 | Requires lifecycle:ideation + lifecycle:prioritize to exist first |

---

## Architecture — 5 Phases

### Phase 1: Pre-flight (read-only — hard stop on failure)

Checks run before anything else. Each failure creates a GitHub Issue and stops immediately.

| Check | Failure action |
|---|---|
| Working tree is clean (no uncommitted changes) | Issue: "Uncommitted changes prevent release" |
| `gh` CLI is authenticated | Issue: "gh CLI not authenticated" |
| `dev` is ahead of `main` (commits to release) | Issue: "Nothing to release — dev and main are in sync" |
| Current branch is `dev` (or explicit override) | Warn: "Not on dev branch — confirm release source" |
| CI workflow exists in `.github/workflows/` | Warn: "No CI workflow found — Docker image will not be built" |
| CI workflow includes semver tag detection | Warn: "CI workflow does not build `:vX.Y.Z` tag — rollback by version will not be possible" |
| Dev branch CI workflow exists | Warn (not hard stop): "No dev branch CI — staging auto-deploy not configured" |

Warnings do not stop execution. Only hard-stop failures do.

### Phase 2: Commit Analysis (read-only)

1. Read `git log {last-tag}..HEAD` (or full log if no tags exist yet)
2. For each commit, classify using AI analysis of message + diff:
   - `feat` — new capability added
   - `fix` — bug corrected
   - `chore` — maintenance, deps, config (no user-visible change)
   - `breaking` — existing behaviour changed incompatibly
3. Determine recommended version bump:
   - Any `breaking` → **major**
   - Any `feat`, no breaking → **minor**
   - Only `fix` / `chore` → **patch**
   - No prior tags → start at `v0.1.0`
4. Draft CHANGELOG entry (Keep a Changelog format)
5. Draft GitHub Release notes (summary paragraph + categorised commit list)

### Phase 3: Confirmation Gate (single human checkpoint)

Present to Simon:
```
Project: {project-name}
Current version: v1.2.1
Recommended: v1.3.0 (minor — 3 features, 2 fixes)

Changes:
  feat: [commit summary]
  feat: [commit summary]
  feat: [commit summary]
  fix:  [commit summary]
  fix:  [commit summary]

Draft release notes:
  [AI-generated summary paragraph]

Release as v1.3.0? (yes / no / specify version)
```

- `yes` → proceed with recommended version
- `v1.4.0` or any version string → use that instead
- `no` → stop, nothing touched

### Phase 4: Execution (fully automated after confirmation)

Steps run in sequence. If any step fails, output exact rollback/recovery commands and stop.

```
1. git checkout main
2. git merge dev --no-ff -m "Release vX.Y.Z"
3. git tag -a vX.Y.Z -m "Release vX.Y.Z"
4. git push origin main
5. git push origin vX.Y.Z
   → CI triggers: builds :latest AND :vX.Y.Z (requires updated workflow)
6. gh release create vX.Y.Z
     --title "vX.Y.Z"
     --notes "{draft release notes}"
7. Write/update CHANGELOG.md in project root
     → Create if not exists (first release)
     → Prepend new entry in Keep a Changelog format
8. git add CHANGELOG.md && git commit -m "docs: update CHANGELOG for vX.Y.Z"
9. git push origin main
10. Write KB vault release page:
      Path: knowledge-base/vault/it-and-projects/projects/{project}/releases/vX.Y.Z.md
      Content: version, date, categorised changes, rollback command
11. git -C {knowledge-base-path} add vault/...
    git -C {knowledge-base-path} commit -m "release: {project} vX.Y.Z notes"
    git -C {knowledge-base-path} push origin main
```

### Phase 5: Post-release Verification

```
gh release view vX.Y.Z          → confirm release exists on GitHub
gh run list --branch main --limit 1  → confirm CI triggered
```

Output:
```
✅ Release vX.Y.Z complete

  GitHub Release: https://github.com/{repo}/releases/tag/vX.Y.Z
  CHANGELOG: updated
  KB vault page: knowledge-base/vault/.../vX.Y.Z.md
  CI build: triggered (Watchtower will auto-pull :latest to production)

  Rollback if needed:
    docker pull ghcr.io/{repo}:{previous-version}
    (on NAS) $DOCKER stop {container} && $DOCKER rm {container}
    Update docker-compose.yml image tag to :{previous-version}
    $DOCKER compose up -d {service}
```

---

## Branch Handling

The skill is designed for the standard `dev` → `main` release flow but supports branching variations:

| Scenario | Behaviour |
|---|---|
| On `dev`, releasing to `main` | Standard flow — no warnings |
| On a feature branch | Pre-flight warns, asks if this is intentional before proceeding |
| Experimental/trial release from feature branch | User confirms override, skill proceeds with branch as source |
| `main` is ahead of `dev` (hotfix applied to main) | Pre-flight warns — recommend syncing dev from main before release |

---

## CI Workflow Update Required

The current `deploy.yml` only builds `:latest` and `:sha-{commit}`. To enable versioned rollback, add semver tag detection:

```yaml
tags: |
  type=raw,value=latest,enable={{is_default_branch}}
  type=sha,prefix=sha-
  type=semver,pattern={{version}}
  type=semver,pattern={{major}}.{{minor}}
```

This causes CI to build `:v1.3.0` and `:1.3` automatically when a `v1.3.0` git tag is pushed. The skill will check for this and warn if absent.

Updating the CI workflow for each project is a separate task — the skill handles detection and warning, not the workflow update itself.

---

## Dev Branch CI (Staging Pipeline Gap)

The staging auto-deploy pipeline (Development Pipeline Step 4) requires a `dev` branch trigger in the CI workflow. Currently no projects have this. The release skill warns if absent but does not block.

Fixing the staging gap is a separate task per project — add a `dev` branch trigger to `deploy.yml` that builds and pushes `:dev` tag.

---

## KB Vault Release Page Format

```markdown
# {Project} — Release vX.Y.Z

**Date:** YYYY-MM-DD
**Type:** major / minor / patch
**GitHub Release:** [vX.Y.Z](https://github.com/{repo}/releases/tag/vX.Y.Z)

## What changed

### New features
- [commit summary]

### Bug fixes
- [commit summary]

### Maintenance
- [commit summary]

## Rollback

```bash
docker pull ghcr.io/{repo}:{previous-version}
```
```

---

## Future: Approach C Upgrade (#29)

When `lifecycle:ideation` and `lifecycle:prioritize` exist and are feeding structured issue data (type: feature/fix/breaking, user impact, context), upgrade the KB vault page to a full narrative release:

- AI writes a summary paragraph explaining what changed and why it matters
- User impact described in plain English, not just commit summaries
- Links to relevant KB articles for new features
- Richer than a changelog — closer to a product update post

**Dependency:** Both lifecycle:ideation and lifecycle:prioritize must be shipping structured issue data before this is worthwhile.

---

## References

- `~/.claude/skills/infra-context/SKILL.md` — versioning standard, branch strategy, staging environment pattern, vault location
- `~/.claude/CLAUDE.md` — Development Pipeline steps 4-6
- `knowledge-base/vault/it-and-projects/claude/claude-workflow.md` — full workflow documentation
- MASTER-TODO items #23, #29
