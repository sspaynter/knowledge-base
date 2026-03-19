---
title: SSA Website — Feature Status
status: published
order: 40
author: claude
created: 2026-03-16
updated: 2026-03-20
---

# SSA Website — Feature Status

## Design Artefacts

| Artefact | Status | Session | Notes |
|---|---|---|---|
| Site content copy | Complete | 1 | All sections locked in `docs/site-content.md` |
| Background narrative | Complete | 1 | Full career narrative in `docs/simon-background.md` |
| Brand definition | Complete | 1-2 | Orange #ED4C05, Archivo, monochrome + accent |
| Logo — interlocking SSA | Complete | 2-3 | SS -12px / SA -20px, no shadow, A on top, 104px in nav |
| Logo — dark/light variants | Complete | 2 | `docs/logo-dark-light.html` |
| Logo — responsive scale | Complete | 2 | 900→800→700→500 weight, documented in `docs/logo-final.html` |
| Theme toggle — sun/moon icon | Complete | 3 | Single icon button in nav, replaces two-button pill |
| Hero — animated headline + character | Complete | 3 | Word-by-word entrance with orange dot pop, cartoon Simon slides in from right, same image in dark/light |
| Three-pillar widget (self-contained) | Complete | 3 | Replaced theme-aware version with dark-card widget (tp-* classes), expandable detail panels, chips, data flow cards |
| Background timeline (reversed) | Complete | 2 | Now at top → Design at bottom, SVG icons, vertical progress line |
| Contact form design | Complete | 2 | Focus glow states, dark/light themed |
| Tablet responsive (1024px) | Complete | 2 | iPad breakpoint added |
| Hero illustration | In review | 3, 7, 9 | V2 cartoon character rejected for hero (D14) — caricature undermines credibility. Built into site anyway as placeholder. Non-photo, non-caricature approach TBD. |
| Background — breakout layout | Complete | 6 | Now card + 6-step arrow timeline with fading chevrons, replaces reversed timeline |
| Hero — system sans-serif typography | Complete | 7 | Title font changed from Archivo to system sans-serif, per-word Caveat subtitles, 14px circle dots |

## Production Pipeline

| # | Phase | Task | Status | Notes |
|---|---|---|---|---|
| 197 | Plan | Write implementation plan | Complete | `docs/plans/2026-03-17-ssa-website-production.md` (10 tasks, session 8) |
| 198 | Validate | Review and approve plan | Complete | Two-pass validation (session 8) |
| 199 | Build | Hugo project + custom theme + content | Complete | Tasks 1-8 built in session 10, 9 commits on `dev` branch |
| 200 | Build | Contact form backend (n8n) | Complete | n8n workflow "Contact Form (simonsaysautomation.com)" — webhook → validate → Gmail → respond. Session 12. |
| 201 | Build | Docker container + nginx config | Complete | Task 9, multi-stage Dockerfile + nginx.conf + rebuild.sh |
| 202 | Build | Cloudflare DNS + tunnel — go live | Complete | Site live at `https://simonsaysautomation.com`. Session 12. |

## SEO & Discoverability

| # | Task | Status | Notes |
|---|---|---|---|
| 229 | robots.txt | Complete | `site/static/robots.txt`, permissive + sitemap pointer. Session 19. |
| 230 | OG + Twitter Card meta tags | Complete | 11 tags in `baseof.html`, OG image Option C (1200x630). Session 19. |
| 231 | Canonical URL | Complete | `<link rel="canonical">` in `baseof.html`. Session 19. |
| 232 | Sitemap submission | Complete | Submitted to Google Search Console (2026-03-19). Allow 3-5 days for indexing. |
| 233 | JSON-LD structured data | Complete | Organization + ProfessionalService + Person in `baseof.html`. Session 19. |

## V2 Updates

| # | Task | Status | Notes |
|---|---|---|---|
| 225 | Hero sub-line font size increase | Pending | 20px Caveat too small relative to 76px titles |
| 226 | Background text — personal connection + dedup | Pending | |
| 227 | Contact section sketch style + button restyle | Pending | Prototype needed |
| 228 | Release pipeline — staging + production CI/CD | Planned | Design spec + 8-task plan validated PASS (session 21). GitHub Actions → GHCR → Watchtower. Staging at `ssa-staging.ss-42.com:8092`. |

## Polish (post-live, independent)

| # | Task | Status | Notes |
|---|---|---|---|
| 203 | Text refinements | Pending | Separate session |
| 204 | Logo update | Pending | Simon has ideas, separate session |
| 205 | Hero illustration polish | Pending | Current cartoon works, future upgrade possible |

## Session Build Log

| Session | Date | Type | Summary |
|---|---|---|---|
| 1 | 2026-03-16 | Brainstorming | Defined scope, content, branding, services, site structure |
| 2 | 2026-03-16 | Design | Finalised logo, built full site mockup with dark/light toggle, integrated three-pillar widget, added tablet responsive |
| 3 | 2026-03-16 | Infrastructure | Created test hosting container on NAS (nginx:alpine, port 8091). Rsynced mockups. Wrote architecture KB page. Updated nas-ops, master todo (#196). |
| 3b | 2026-03-17 | Design refinement | Animated hero with cartoon Simon, sun/moon theme toggle, self-contained three-pillar widget, enlarged logo. Deployed to NAS. |
| 4 | 2026-03-17 | Planning | Completed widget integration. Defined productionization approach. Rewrote master todo (#197-#205). Updated all KB articles. Fixed domain name. Added DNS diagram and go-live checklist. |
| 5 | 2026-03-17 | Content | Pillar detail titles renamed to Redesign/Build/Empower |
| 5b | 2026-03-17 | Design | PNG logo swap test — CSS interlock preferred, PNG rejected |
| 6 | 2026-03-17 | Content/Design | Background copy rewritten (all 7 items), breakout layout selected (Now card + arrow timeline) |
| 7 | 2026-03-17 | Design | Hero V2 character + system sans-serif typography, per-word Caveat subtitles |
| 8 | 2026-03-17 | Planning | 10-task production implementation plan written and validated |
| 9 | 2026-03-18 | Review | V2 hero character rejected (D14), photo ruled out |
| 10 | 2026-03-17 | Build | Hugo site built (Tasks 1-9), deployment blocked by plan quality. Retrospective written. |
| 11 | 2026-03-17 | Planning | Task 10 rewritten as 10a + 10b with executable commands. All Cloudflare IDs, DNS records, tunnel config validated against live infrastructure. Plan-reviewer PASS. |
| 12 | 2026-03-18 | Build/Deploy | Site go-live: NAS deployment (10a), Cloudflare tunnel (10b), n8n webhook (#200). Fixed nginx security headers, hero image, www ingress. |
| 19 | 2026-03-19 | Build/Deploy | SEO foundations: robots.txt, OG image (Option C), OG/Twitter meta tags, canonical URL, JSON-LD structured data (Organization + ProfessionalService + Person), lang="en-AU" fix. Google Search Console verified, sitemap submitted. LinkedIn Company Page created (SSA). |
| 20 | 2026-03-19 | Operational | Populated project CLAUDE.md. Meta description updated: "AI-powered process transformation" → "Operational redesign and automation for businesses that want to move faster." Deployed to production. LinkedIn overview text formatted with zero-width spaces for line breaks. Memory trimmed (static specs moved to CLAUDE.md). |
| 21 | 2026-03-19 | Planning | Release pipeline (#228): design spec + 8-task implementation plan. GitHub Actions → GHCR → Watchtower. Staging at `ssa-staging.ss-42.com:8092`. Validated Cloudflare tunnel API commands (account/tunnel IDs, ingress rule insertion, DNS CNAME). Spec + plan both PASS. |
