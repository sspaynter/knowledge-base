---
title: SimonSays42 — Feature Status
status: published
order: 40
author: claude
created: 2026-03-13
updated: 2026-03-13
---

# SimonSays42 — Feature Status

## Current Features

| Feature | Status | Session | Notes |
|---|---|---|---|
| Hugo static site with PaperMod theme | Complete | Build (Feb 2026) | 29 posts migrated from WordPress |
| Cover images (23 posts) | Complete | Session 2 | Mapped via WordPress public API |
| Inline images (5 posts) | Complete | Session 2 | Tasmania MTB, Beach, Morning Walks, Bag Philosophy, First Bag |
| About page — two-column layout | Complete | Session 3 | Roads hero image + bio, two-column interests grid, LinkedIn link |
| Contact page — form + LinkedIn | Complete | Session 6 | n8n webhook form added, LinkedIn retained |
| Logo — image only, 200px | Complete | Session 3 | Template override in `layouts/partials/header.html` |
| Homepage — 3-column grid | Complete | Session 3 | Responsive: 3-col → 2-col → 1-col |
| Share buttons — X and LinkedIn | Complete | Session 3 | `ShareButtons` param in hugo.toml |
| Theme toggle — repositioned | Complete | Session 3 | Moved to far right of nav (after Search) |
| Cloudflare zone + tunnel | Complete | Session 2 | Zone created, CNAME + tunnel route configured |
| Production baseURL deployed | Complete | Session 4 | Dockerfile baseURL flipped to `https://simonsays42.com/` |
| DNS nameserver cutover | Complete | Session 4 | WordPress.com → Cloudflare nameservers |
| Zone activation + site live | Complete | Session 5 | Zone activated via API check, site verified at `https://simonsays42.com/` |
| Docker network standardisation | Complete | Session 5 | Moved from custom `simonsays42_tunnel` network to standard bridge (`10.0.3.x`) |
| simonsaysautomation.com redirect | Complete | Pre-existing | 301 → simonsays42.com via Cloudflare edge |
| Architecture KB — DNS section | Complete | Session 4 | Both domains, request flow, domain transfer plan |
| Docker multi-stage build | Complete | Build (Feb 2026) | Hugo build → Nginx serve |
| Nginx security headers | Complete | Build (Feb 2026) | CSP, X-Frame-Options, caching |
| Fuse.js search | Complete | Build (Feb 2026) | JSON output enabled |
| Docker network standardisation commit | Complete | Session 6 | `network_mode: bridge` committed to git |
| n8n contact form workflow | Complete | Session 6 | Workflow `LWvkUvxSgdsH3cyA`, webhook at `/webhook/contact` |
| Cloudflare Access bypass for webhook | Complete | Session 6 | Path-scoped bypass with `options_preflight_bypass` |
| Cloudflare rate limiting for webhook | Complete | Session 6 | 3 reqs/10s/IP, replaced leaked-credential rule |
| Contact form CSS and HTML | Complete | Session 6 | Form with honeypot, themed to match PaperMod |
| Decisions document | Complete | Session 6 | KB article at `products/simonsays42/simonsays42-decisions.md` |
| Cloudflare security KB article | Complete | Session 6 | `operations/infrastructure/cloudflare-security.md` |
| Domain transfer to Cloudflare Registrar | Complete | Session 7 | Transferred from WordPress.com/Automattic. Auto-renew on, WHOIS privacy enabled, expires 2027-04-11. |
| SSH over Cloudflare Tunnel | Complete | Session 7 | `ssh.ss-42.com` ingress, `cloudflared` on Mac, `Host nas-remote` in SSH config |
| Contact form git commit | Complete | Session 7 | `0561baa` — contact.md + custom.css committed |
| infra-context skill update | Complete | Session 7 | Cloudflare security patterns, n8n REST API, SSH tunnel (master todo #173 + #114) |

## Pending — Content Quality Sprint (`ss42-content`)

| # | Feature | Priority | Blocked by | Notes |
|---|---|---|---|---|
| 177 | Review and rewrite About page text | P2 | — | Align to Simon's voice, remove AI feel, apply anti-slop |
| 178 | Review and rewrite all blog posts | P2 | — | Anti-slop pass across 29 posts, restore natural voice |
| 179 | Identify new blog topics + content workflow | P2 | — | Establish repeatable creation process using blog-workshop skill |

## Session Build Log

| Session | Date | Summary |
|---|---|---|
| Build | Feb 2026 | Initial Hugo site, WordPress content migration, Docker build, NAS deployment |
| Session 1 | 2026-03-11 | Project reorganisation, audit, sprint planning, KB articles |
| Session 2 | 2026-03-11 | Cover images, inline images, baseURL fix, Cloudflare zone + tunnel |
| Session 3 | 2026-03-13 | Design refinements (logo, grid, about page, share buttons, contact page) |
| Session 4 | 2026-03-13 | Go-live: production baseURL, NAS deploy, DNS cutover, architecture KB update |
| Session 5 | 2026-03-13 | Zone activation, 502 fix (Docker bridge network), domain transfer initiated, architecture diagrams converted to Mermaid, KB docs updated |
| Session 6 | 2026-03-13 | Contact form (n8n webhook + Gmail), Cloudflare Access bypass + rate limiting, decisions document, Cloudflare security KB article, docker-compose git commit |
| Session 7 | 2026-03-13 | Git commit of contact form, domain transfer completed, SSH-over-Cloudflare-tunnel configured, infra-context skill updated (#173 + #114) |

## Design Divergences

None — session 3 design matches WordPress look and feel as intended.
