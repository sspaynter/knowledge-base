---
title: SimonSays42 — Decisions Log
status: published
order: 50
author: both
created: 2026-03-13
updated: 2026-03-13
---

# SimonSays42 — Decisions Log

Architectural, design, and technical decisions for the SimonSays42 personal site. Each decision records what was chosen, why, and when.

## Infrastructure

### Stack: Hugo + Nginx + Cloudflare Tunnel

**Decided:** Build session (Feb 2026)

Chose Hugo static site generator over Ghost (overkill CMS for ~29 posts, 250-400 MB RAM) and Grav (PHP-based, more overhead). Hugo produces static HTML with near-zero attack surface, ~15 MB RAM footprint, no database, markdown-first authoring.

Multi-stage Docker build: Hugo builds HTML (stage 1), Nginx serves it (stage 2). Final image ~25 MB. Cloudflare Tunnel provides public access with no exposed ports.

### Network: Bridge mode, shared tunnel

**Decided:** Session 5 (2026-03-13)

Custom docker-compose networks caused 502 tunnel routing failures. Switched to `network_mode: bridge` — standard Docker bridge network (`10.0.3.x`), consistent with all NAS containers. The shared `cloudflared-1` container handles tunnel routing for all services.

### Domain: simonsays42.com primary, simonsaysautomation.com redirect

**Decided:** Build session, formalised session 2

`simonsays42.com` is the primary domain. `simonsaysautomation.com` redirects 301 via Cloudflare edge rule. The redirect preserves SEO link equity and handles visitors with the old URL.

Domain transfer from WordPress.com (Automattic) to Cloudflare Registrar initiated 2026-03-13. Transfer pending — awaiting previous registrar release.

### Contact form: n8n webhook, not server-side

**Decided:** Session 6 (2026-03-13)

Hugo is a static site — no server-side processing. The contact form submits via JavaScript fetch from the visitor's browser to an n8n webhook at `https://n8n.ss-42.com/webhook/contact`. n8n validates the submission and sends an email notification via Gmail OAuth2.

This requires a Cloudflare Access bypass for the `/webhook` path (the n8n dashboard remains protected) and Cloudflare rate limiting on the webhook endpoint.

Alternative considered: adding a backend proxy to the blog container. Rejected — would add complexity to a deliberately simple static site architecture.

### Webhook security: layered defence

**Decided:** Session 6 (2026-03-13)

Three layers protect the contact form webhook:

1. **Honeypot field** — hidden form field (`website`) that bots auto-fill. n8n rejects any submission where it has a value.
2. **Cloudflare rate limiting** — 3 requests per 10 seconds per IP. Blocks automated flooding.
3. **Field validation** — n8n workflow rejects submissions with empty name, email, or message.

The default Cloudflare leaked-credential-check rule was replaced with the rate limiter. Rationale: all SS42 services use Google OAuth, not password-based login. Leaked credential databases are irrelevant to the OAuth authentication model.

A WAF managed challenge rule was considered and briefly deployed, but removed because it does not render properly with JavaScript fetch-based form submissions (the browser receives a challenge HTML page instead of the expected JSON response).

## Design

### Theme: PaperMod

**Decided:** Build session (Feb 2026)

Most popular Hugo theme. Clean, minimal, fast, highly customisable. Aligns with the card-based design from the WordPress site.

Known limitation: PaperMod uses `| absURL` in templates, which overrides Hugo's `relativeURLs = true`. All generated URLs are absolute regardless of config.

### Visual identity: Sora font, orange accent

**Decided:** Build session (Feb 2026)

- Font: Sora (Google Fonts) — matches the WordPress site visual identity
- Accent colour: `#ED4C05` (orange) — migrated from WordPress
- Light background: `#FAFAFA`, with PaperMod dark mode support

### Logo: image only, no text

**Decided:** Session 3 (2026-03-13)

200px height logo with 1rem top padding. Text label removed from PaperMod default. Implemented via template override at `layouts/partials/header.html`.

### Homepage: 3-column responsive grid

**Decided:** Session 3 (2026-03-13)

CSS Grid with 3 columns (desktop), 2 columns (tablet at 1024px), 1 column (mobile at 640px). Pagination at 6 posts per page optimised for the 3-column layout.

### About page: two-column hero

**Decided:** Session 3 (2026-03-13)

Roads hero image + bio side-by-side, two-column interests grid below. Responsive — stacks at 768px.

### Contact page: form + LinkedIn

**Decided:** Session 6 (2026-03-13), updated from session 3

Session 3 set LinkedIn-only contact. Session 6 added an n8n webhook contact form with name, email, and message fields. LinkedIn link retained below the form.

### Share buttons: X and LinkedIn only

**Decided:** Session 3 (2026-03-13)

Removed Facebook, Reddit, and other options. Aligned with Simon's audience and communication channels.

### Theme toggle: far right of nav

**Decided:** Session 3 (2026-03-13)

Moved from PaperMod's default position (near logo) to the far right of the navigation menu, after Search.

## Content

### 29 posts migrated from WordPress

**Decided:** Build session (Feb 2026)

All posts exported from WordPress.com admin, converted to Hugo markdown with YAML frontmatter. 23 posts have cover images (mapped via WordPress public API). 5 posts have inline images fully restored.

### Markdown-first authoring

**Decided:** Build session (Feb 2026)

Content authored as markdown files in `site/content/posts/`. No CMS, no web editor. Deployed via rsync + rebuild on the NAS.

## Nginx

### Security headers

**Decided:** Build session (Feb 2026)

Comprehensive security header set: X-Frame-Options (SAMEORIGIN), X-Content-Type-Options (nosniff), X-XSS-Protection, Referrer-Policy, Content-Security-Policy, Permissions-Policy. Server tokens disabled.

### Caching: 30-day assets, 1-hour HTML

**Decided:** Build session (Feb 2026)

Static assets (CSS, JS, images, fonts) cache for 30 days with immutable flag. HTML pages cache for 1 hour — Cloudflare edge handles longer-term caching.

## Deployment

### Deploy via rsync + rebuild.sh

**Decided:** Build session (Feb 2026)

No CI/CD pipeline. Content changes are deployed by rsync from Mac to NAS, then `rebuild.sh` rebuilds the Docker image and restarts the container. This is appropriate for a static site with infrequent updates.

### No staging environment

**Decided:** Implicit (build session)

Unlike GHCR-based projects (KB, Applyr), SimonSays42 does not have a staging container. The site is built locally or directly on the NAS. LAN preview at `http://192.168.86.18:8090` serves as the verification step.
