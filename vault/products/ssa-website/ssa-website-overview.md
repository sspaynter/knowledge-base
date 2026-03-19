---
title: SSA Website — Overview
status: published
order: 10
author: both
created: 2026-03-16
updated: 2026-03-17
---

# SSA Website — Overview

## What it is

Professional website for Simon Says Automation (SSA), Simon's sole trader AI consulting business. A single-page site with four sections: Hero, What We Do, Background, and Contact.

Domain: simonsaysautomation.com (owned, email simon@ active)

## Why it exists

Simon needs a credibility anchor — when someone asks what he does, he points them here. Not a lead funnel or content platform. A clean, professional page that says: here is who I am, here is what I do, here is how to reach me.

The differentiator is Simon's operational depth: design training, technical leadership, enterprise cloud, product management, and now AI capability building. The site needs to communicate that without overselling.

## Architecture

Hugo static site with custom theme (not PaperMod — SSA has its own design language). Docker/Nginx on NAS, Cloudflare tunnel. Same hosting pattern as simonsays42.com. See `ssa-website-architecture.md` for full technical details.

## Current state

**Phase:** Prototype v2 complete, test hosting live, pre-build.

All content, branding, and logo decisions are locked. A working HTML/CSS/JS prototype exists at `docs/site-mockup.html` with animated hero (headline + cartoon Simon character), sun/moon theme toggle, self-contained three-pillar widget with expandable panels, background timeline, and contact form.

**Test container live:** `ssa-website` (`nginx:alpine`, port 8091) serving prototype at `http://192.168.86.18:8091`. This will be replaced by the Hugo multi-stage build once the Hugo project is initialised (#191).

## Branding

| Element | Value |
|---|---|
| Primary colour | Orange #ED4C05 |
| Background | True black #000 (dark mode), #f5f5f5 (light mode) |
| Font | Archivo (Google Fonts) |
| Logo | SSA interlocking — SS overlap -12px, SA overlap -20px, A on top (z-index:3), no shadow, 104px in nav |
| Weight scale | 900 (hero) → 800 (logo) → 700 (nav) → 500 (small) |
| Theme toggle | Single sun/moon icon button in nav |
| Design language | Apple-inspired: frosted glass nav, generous whitespace, scroll animations, pill buttons |

## Content structure

| Section | Content |
|---|---|
| Hero | Animated "Redesign. Build. Empower." (word-by-word) + three subtitle lines + cartoon Simon character |
| What We Do | Three interactive pillars: Process Redesign → Capability Build → Data & Value |
| Background | Reversed timeline (Now at top → Design at bottom) with 7 career highlight beats |
| Contact | Form (name, email, message) + email + LinkedIn |

Full copy locked in `docs/site-content.md`.

## Key files

| File | Purpose |
|---|---|
| `docs/site-mockup.html` | Main prototype — animated hero, sun/moon toggle, three-pillar widget, all sections, tablet responsive |
| `docs/simon-cropped.png` | Cartoon Simon character for hero |
| `docs/site-content.md` | Locked copy for all sections |
| `docs/simon-background.md` | Full background narrative |
| `docs/logo-final.html` | Logo exploration — selected treatment documented |
| `Mockup/three-pillars.html` | Interactive widget from Claude Chat (source for integrated version) |
| `Mockup/hero-v2.html` | Hero animation concept (whiteboard with handwritten text — explored, not used) |
