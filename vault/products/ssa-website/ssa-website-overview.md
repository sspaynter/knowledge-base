---
title: SSA Website — Overview
status: published
order: 10
author: both
created: 2026-03-16
updated: 2026-03-19
---

# SSA Website — Overview

## What it is

Professional website for Simon Says Automation (SSA), Simon's sole trader AI consulting business. A single-page site with four sections: Hero, What We Do, Background, and Contact.

Domain: simonsaysautomation.com (owned, email simon@ active)
Live: https://simonsaysautomation.com

## Why it exists

Simon needs a credibility anchor — when someone asks what he does, he points them here. Not a lead funnel or content platform. A clean, professional page that says: here is who I am, here is what I do, here is how to reach me.

The differentiator is Simon's operational depth: design training, technical leadership, enterprise cloud, product management, and now AI capability building. The site needs to communicate that without overselling.

## Architecture

Hugo static site with custom `ssa` theme. Docker/Nginx on NAS, Cloudflare tunnel. Same hosting pattern as simonsays42.com. See `ssa-website-architecture.md` for full technical details.

## Current state

**Phase:** Live in production. V1 complete, V2 updates scoped (#225-#228), SEO foundations complete (#229-#233).

Site is live at `https://simonsaysautomation.com` with all V1 and SEO updates deployed. Google Search Console verified, sitemap submitted.

**Meta description:** "Redesign. Build. Empower. — Operational redesign and automation for businesses that want to move faster."

**LinkedIn Company Page:** Created, overview text populated.

## Branding

| Element | Value |
|---|---|
| Primary colour | Orange #ED4C05 |
| Background | True black #000 (dark mode), #f5f5f5 (light mode) |
| Body font | Archivo (Google Fonts) |
| Hero title font | Inter weight 800 (Google Fonts) |
| Hero sub-line font | Caveat (Google Fonts) |
| Logo | SSA interlocking — SS overlap -12px, SA overlap -20px, A on top (z-index:3), no shadow, 104px in nav |
| Weight scale | 900 (hero) → 800 (logo) → 700 (nav) → 500 (small) |
| Theme toggle | Single sun/moon icon button in nav |
| Design language | Apple-inspired: frosted glass nav, generous whitespace, scroll animations, pill buttons |
| Sketch style | Architectural drafting corners, varying stroke thickness, wobbly bezier paths (baked coords, no SVG filters) |

## Content structure

| Section | Content |
|---|---|
| Hero | Animated "Redesign. Build. Empower." (word-by-word) + per-word Caveat subtitles + cartoon Simon character |
| What We Do | Three interactive pillars: Process Redesign → Capability Build → Data & Value (sketch-style borders) |
| Background | Breakout layout — Now card + 6-step arrow timeline with fading chevrons (sketch-style borders) |
| Contact | Form (name, email, message → n8n webhook) + email + LinkedIn |

Full copy locked in `docs/site-content.md`.
