# KB Vault Management

How vault files are written, synced, and kept in sync with the staging database.

## How It Works

The Knowledge Base has two layers that must stay in sync:

| Layer | Location | What it holds |
|---|---|---|
| Local vault (Mac) | `~/Documents/Claude/knowledge-base/vault/` | Source files — what Claude edits during sessions |
| NAS staging vault | `/share/CACHEDEV1_DATA/Container/knowledge-base-staging/vault/` | What staging actually reads |
| Staging DB | `knowledge_base` schema on n8n-postgres | Pages, sections, workspaces — generated from vault files |

The staging container runs a chokidar watcher that monitors the NAS vault. When files change, it fires events that update the DB automatically:
- `add` → creates a new page record (or restores a soft-deleted one)
- `change` → updates content in the DB
- `unlink` → soft-deletes the page (`deleted_at = NOW()`)

**The gap:** Claude writes to the local vault on the Mac. The NAS vault is not updated automatically — it requires an explicit rsync.

## End-of-Session Vault Sync

Run at the end of every KB session where vault files were created or modified:

```bash
rsync -av --delete --exclude='.obsidian' \
  ~/Documents/Claude/knowledge-base/vault/ \
  nas:/share/CACHEDEV1_DATA/Container/knowledge-base-staging/vault/
```

The `--delete` flag removes files on the NAS that no longer exist locally. This is safe — chokidar soft-deletes the corresponding DB records rather than hard-deleting them.

This step is built into the end-of-session skill (Step 5c).

## Vault File Locations

When Claude writes a new vault article, it must go in the right workspace/section folder. The taxonomy:

```
vault/
├── inbox/                        # Captured items pending review
├── operations/
│   ├── ai-operating-model/       # AI system design and prompts
│   ├── engineering-practice/     # Claude workflow, skills, SDD conventions
│   │   └── skills/               # Individual skill write-ups
│   ├── infrastructure/           # NAS, containers, networking
│   └── automation/               # n8n workflows
├── products/
│   ├── applyr/                   # Applyr feature status, architecture
│   ├── knowledge-base/           # KB feature status, design decisions
│   ├── todo/                     # ToDo app docs
│   └── n8n/                      # n8n configuration docs
├── projects/
│   └── clients/                  # Client project work
├── studio/                       # Bag design and fabrication
├── work/                         # Current professional work
├── personal/
│   ├── job-search/               # Job search pipeline and analysis
│   ├── general/                  # Personal notes
│   └── bag-business/             # Business planning
├── learning/                     # AI, product, IT learning notes
└── archive/                      # Completed or deprecated items
```

## Taxonomy Change Process

When restructuring workspaces or sections, follow this checklist — order matters:

**1. Update local vault**
- Move/rename files and directories
- Verify the new structure with `ls vault/`

**2. Update code if workspace names changed**
- `services/vault-sync.js` — update `WORKSPACE_ALIASES` if vault folder name differs from DB slug
- `scripts/initial-vault-sync.js` — same alias update
- `scripts/seed.js` — add new workspaces and sections; remove old ones

**3. rsync to NAS staging** (with `--delete`)
```bash
rsync -av --delete --exclude='.obsidian' \
  ~/Documents/Claude/knowledge-base/vault/ \
  nas:/share/CACHEDEV1_DATA/Container/knowledge-base-staging/vault/
```

**4. Clean up orphaned DB records**

Chokidar soft-deletes pages but never touches workspace or section rows. After a taxonomy change, old workspace/section records remain in the DB and appear in the nav.

Check what's there:
```bash
ssh nas "/share/CACHEDEV2_DATA/.qpkg/container-station/usr/bin/docker exec n8n-postgres psql -U nocodb -d nocodb -c \"
SELECT w.slug as workspace, s.slug as section,
       COUNT(p.id) FILTER (WHERE p.deleted_at IS NULL) as live_pages
FROM knowledge_base.workspaces w
LEFT JOIN knowledge_base.sections s ON s.workspace_id = w.id
LEFT JOIN knowledge_base.pages p ON p.section_id = s.id
GROUP BY w.slug, s.slug ORDER BY w.slug, s.slug;\""
```

Delete old workspaces (cascades to sections and pages):
```bash
ssh nas "/share/CACHEDEV2_DATA/.qpkg/container-station/usr/bin/docker exec n8n-postgres psql -U nocodb -d nocodb -c \"
DELETE FROM knowledge_base.workspaces WHERE slug IN ('old-slug-1', 'old-slug-2');\""
```

Delete orphaned sections from a workspace you are keeping:
```bash
ssh nas "/share/CACHEDEV2_DATA/.qpkg/container-station/usr/bin/docker exec n8n-postgres psql -U nocodb -d nocodb -c \"
DELETE FROM knowledge_base.sections
WHERE workspace_id = (SELECT id FROM knowledge_base.workspaces WHERE slug = 'work')
  AND slug IN ('old-section-1', 'old-section-2');\""
```

**5. Verify staging**
- Refresh `https://kb-staging.ss-42.com`
- Confirm new workspaces appear, old ones are gone
- Spot-check that pages landed in the right sections

**6. Commit and push**
- Stage all vault changes: `git add vault/`
- Commit as part of the session commit
- Push to `dev` to trigger CI and build the staging Docker image

## Git Hygiene

Vault files live in the `knowledge-base` git repo. The API push (`kb-sync.sh`) is the source of truth for content — git commit is for repo hygiene only.

**Why it matters:** Uncommitted vault files accumulate across sessions. When a code release needs a clean working tree, dozens of untracked vault files block the process (88 files over 6 days blocked KB v2.2.1).

**Rule:** At session end, after all API pushes are done, commit vault changes:

```bash
cd ~/Documents/Claude/knowledge-base
git add vault/
git diff --cached --quiet || git commit -m "vault: sync session [N] changes"
```

Do not push — pushing happens with the project's normal git flow (feature branch → dev → main). The end-of-session skill (Step 5b) automates this.

---

## What Chokidar Does Not Handle

These always require manual DB intervention:

- Workspace record creation/deletion
- Section record creation/deletion
- Renaming a workspace or section (slug change)
- Moving pages between sections (path change creates a new record; old record is soft-deleted)
