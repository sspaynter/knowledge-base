---
title: SS42 HQ — Overview
status: published
order: 10
author: claude
created: 2026-03-12
updated: 2026-03-12
---

# SS42 HQ — Overview

## What is HQ

`hq.ss-42.com` is a private internal hub for hosting SS42 work that does not belong in the Knowledge Base. It serves three categories of content:

| Path | Purpose | Example |
|---|---|---|
| `/plans/` | Implementation plans and lifecycle flow diagrams | ToDo item lifecycle flow |
| `/prototypes/` | Clickable HTML prototype builds | ToDo prototype v2 |
| `/builds/` | Standalone HTML tools, calculators, explorers | Playgrounds, scorecards |

It is not a product. It is a static file host with authentication — a place to surface internal artefacts as shareable, accessible URLs.

## Why it exists

The KB is a structured content platform with a defined information architecture. Some artefacts do not fit:

- Full-page HTML files with custom styling, colours, and images
- Prototype builds that are self-contained and do not convert to markdown
- Plan diagrams that are visual-first and lose fidelity as text

HQ provides a URL for those artefacts without forcing them into a format they do not suit.

## Authentication

Access to `hq.ss-42.com` is gated via Cloudflare Access with Google OAuth. Only your Google account can authenticate. This means:

- The site is not public — it will not appear in search results
- You can access it from any device you are logged into Google on (Mac, iPad, iPhone)
- Guests cannot access it without you sharing your screen
- No separate login process — if you are logged into Google, the gate passes automatically

Future consideration: migrate to the shared `shared_auth` schema used by KB Staging and Applyr Staging, so HQ participates in the same SSO session cookie as the rest of the SS42 tool suite.

## Relationship to the SS42 ecosystem

HQ is a passive host. It does not have a database, a backend, or a build pipeline. Content is added manually by copying files to the NAS volume and the URL reflects the folder structure immediately.

It is deliberately simple. The goal is a stable, authenticated URL for internal artefacts — not a product that needs maintaining.

## Current content

| Path | Content | Added |
|---|---|---|
| `/plans/item-lifecycle-flow` | ToDo — Item Lifecycle Flow diagram | First content on launch |

