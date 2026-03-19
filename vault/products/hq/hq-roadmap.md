---
title: SS42 HQ — Roadmap
status: published
order: 30
author: claude
created: 2026-03-12
updated: 2026-03-13
---

# SS42 HQ — Roadmap

## Phase 1 — Infrastructure (H2–H7) — COMPLETE

Completed session 69 (2026-03-13). All tasks done.

| Task | Seq | Status |
|---|---|---|
| Create NAS folder structure | H2 | Done |
| Deploy nginx container | H3 | Done — port 8085, bridge network |
| Configure Cloudflare tunnel route | H4 | Done — tunnel config v24, CNAME record |
| Configure Cloudflare Access | H5 | Done — Google OAuth, personal email |
| Upload first content | H6 | Done — lifecycle flow + prototype v2 |
| Update nas-containers.md | H7 | Done — KB page 94 updated |

## Phase 2 — Index page (H8) — COMPLETE

Completed session 69. Dark-theme index page at `hq.ss-42.com/` with three content sections (Plans, Prototypes, Builds) and links to all hosted artefacts.

## Phase 3 — Content migration — COMPLETE

Both target artefacts deployed in session 69:

| Artefact | Path | Status |
|---|---|---|
| Item lifecycle flow | `/plans/item-lifecycle-flow.html` | Deployed |
| ToDo prototype v2 | `/prototypes/todo-prototype-v2.html` | Deployed (with prev/next nav) |

## Future considerations

**shared_auth migration**
When the SSO pattern is stable across KB, Applyr, and ToDo, migrate HQ auth to the same session cookie. Lower priority — Cloudflare Access works fine for a personal tool.

**Subdomain expansion**
If the content volume grows significantly, consider splitting by type:
- `plans.ss-42.com` — plans only
- `lab.ss-42.com` — prototypes and experiments

Not needed at current volume. One subdomain, three folders is the right structure for now.

**Content lifecycle**
No formal process needed yet. When a plan or prototype becomes obsolete, archive it (move to `/archive/` subfolder) rather than deleting. URLs should be stable.

