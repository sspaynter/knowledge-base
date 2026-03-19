---
title: SimonSays42 — Overview
status: published
order: 10
author: both
created: 2026-03-11
updated: 2026-03-14
---

# SimonSays42 — Overview

## What it is

Simon's personal blog at simonsays42.com. A Hugo static site serving 29 blog posts on technology, AI, product thinking, bags, hearing loss, and life. Migrated from WordPress.com in February 2026.

Tagline: *"Welcome to my world as I travel as many roads as I can..."*
Site title: *Notes from a Mind That Wanders*

## Why it exists

The WordPress.com Business plan was expensive for what it delivered. The content deserved a home that was:

- **Lightweight** — static HTML, not a PHP application with a database
- **Self-hosted** — running on the QNAP NAS alongside other SS42 services
- **Secure** — no exposed ports, no application server to exploit
- **Fast** — Nginx serving pre-built files with Cloudflare edge caching
- **Simple to maintain** — markdown files, no CMS admin panel to patch

## Current state

**Domain:** `simonsays42.com`
**Container:** `simonsays42-blog` on QNAP NAS (port 8090 external, 8080 internal)
**Theme:** PaperMod (most popular Hugo theme — clean, fast, minimal)
**Content:** 29 posts migrated from WordPress, plus About, Contact, and Search pages

### What works

- All 29 posts present with correct titles, dates, tags, and content
- 23 posts have cover images mapped from WordPress (6 had no WordPress cover image)
- 5 posts with inline images fully restored (Tasmania MTB, Beach, Morning Walks, Bag Philosophy, First Bag)
- 127 images in `site/static/images/` — all referenced in posts or pages
- About page with two-column hero layout (roads image + bio + LinkedIn link), two-column interests grid, profile photo above "42" section
- Logo: image only (no text), 200px height, with custom header template override
- Homepage: 3-column responsive post grid (collapses to 2-col at 1024px, 1-col at 640px)
- Share buttons filtered to X and LinkedIn only
- Theme toggle moved to far right of nav menu
- Contact page: LinkedIn link only
- baseURL set correctly to `https://simonsays42.com/`
- Cloudflare zone for `simonsays42.com` — nameservers changed to Cloudflare, zone pending activation
- `simonsaysautomation.com` redirects 301 → `simonsays42.com` via Cloudflare edge
- Site builds and serves via Docker (multi-stage Hugo build then Nginx)
- Search (Fuse.js), reading time, breadcrumbs, share buttons all functional
- Custom favicon and site logo (ss42-logo.png)

### What remains

| Item | Status |
|---|---|
| Verify site via Cloudflare tunnel | Pending — zone activation in progress |
| Domain transfer to Cloudflare Registrar | Pending — domain unlocked, auth code obtained |
| n8n webhook contact form | Planned — session 5 |
| SSH-over-Cloudflare-tunnel for remote NAS access | Planned — session 5+ |

### Completed (session 3)

| Task | What was done |
|---|---|
| Logo — image only, 200px | Created `site/layouts/partials/header.html` override, removed text label, set iconHeight=200 |
| Homepage — 3-column grid | CSS Grid on `.list .main`, responsive collapse at 1024px and 640px, pagerSize=6 |
| About page — two-column layout | Hero with roads image + bio + LinkedIn, two-column interests grid, profile photo above 42 section |
| Share buttons — X and LinkedIn | Added `ShareButtons = ["x", "linkedin"]` to hugo.toml |
| Theme toggle — repositioned | Moved from logo-switches to end of nav menu (far right) |
| Contact page — simplified | LinkedIn link only, email removed |

### Completed (session 2)

| Task | What was done |
|---|---|
| W1 — Cover images | Mapped 23 posts to WordPress featured images via WP public API |
| W2 — Inline images | Restored images in 5 posts from WordPress source |
| W3 — baseURL fix | Changed from simonsaysautomation.com to simonsays42.com |
| W4 — NAS rebuild | Rsync to NAS, Docker rebuild, verified HTTP 200 with images |
| W5 — DNS transfer | Created Cloudflare zone via Global API Key, added CNAME record |
| W6 — Tunnel route | Added simonsays42.com ingress to main Cloudflare tunnel config |

## Stack

| Layer | Technology |
|---|---|
| Static site generator | Hugo 0.146.0 (extended) |
| Theme | PaperMod |
| Web server | Nginx (Alpine) |
| Tunnel | Cloudflare Tunnel (cloudflared) |
| Container runtime | Docker on QNAP Container Station |
| CDN / SSL / WAF | Cloudflare (free tier) |
| Content format | Markdown with YAML frontmatter |

## What it is not

- Not a CMS — there is no admin panel or database. Content is markdown files.
- Not a web application — it is a static site. Zero server-side logic at runtime.
- Not ephemeral — the NAS hosts both the source files and the built output. The container rebuilds from source on demand.

## Key documents

| Document | Location | Purpose |
|---|---|---|
| Migration plan | `simonsays42/simonsays42-migration-plan.md` | Original WordPress to Hugo migration design |
| Next session plan | `simonsays42/NEXT-SESSION.md` | Detailed go-live execution plan |
| Hugo config | `simonsays42/site/hugo.toml` | Site configuration |
| Docker config | `simonsays42/site/Dockerfile`, `site/docker-compose.yml` | Build and orchestration |
| Architecture | This vault section: `simonsays42-architecture.md` | Stack, build pipeline, infrastructure |
| Content workflow | This vault section: `simonsays42-content-workflow.md` | How to write and publish posts |

## Origin

Built in February 2026 during a Claude Code learning session. The build session predates Claude Code's session logging — the migration plan document is the only design artefact from the original build. The project was reorganised into its current structure (website files in `site/` subfolder) in March 2026.

## Related projects

| Project | Relationship |
|---|---|
| Cloudflare | DNS, tunnel, SSL, caching — shared infrastructure with all SS42 services |
| QNAP NAS | Hosts the container alongside KB, Applyr, and other SS42 containers |
| Knowledge Base | Product documentation lives in the KB vault (this article) |
