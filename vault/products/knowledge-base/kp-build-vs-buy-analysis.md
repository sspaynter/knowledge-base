---
title: Knowledge Platform — Build vs Buy Analysis
status: published
author: both
created: 2026-03-06
updated: 2026-03-06
---

# Knowledge Platform — Build vs Buy Analysis

Evaluation conducted in session 61 (2026-03-06). Simon asked whether building a custom KB app was the right choice versus using an existing self-hosted documentation tool.

## What We Built

The Knowledge Platform is a full-stack self-hosted application: Node.js/Express backend, PostgreSQL database, vanilla JS frontend, deployed on QNAP NAS via Docker with Cloudflare tunnel.

| Metric | Value |
|---|---|
| Lines of code | ~7,700 |
| Database tables | 12 |
| API endpoints | 30+ |
| Custom features | 15 |
| Vault content | ~78 articles across 19 directories |
| Development time | ~4 sessions (v1 to v2.1.1) |
| Dependencies | 13 production packages (no ORM, no build tool, no frontend framework) |

### Custom Features Beyond Basic Documentation

1. Bidirectional vault sync engine (chokidar watcher, frontmatter round-trips, suppression loops)
2. Three-layer content fallback (vault file, content_cache, content)
3. Version history with restore (up to 50 snapshots per page)
4. Deep linking with previous_paths resolution (ADR-010)
5. Mermaid diagram rendering with click-to-edit
6. Full-text search (PostgreSQL tsvector with GIN index)
7. Google OAuth SSO with shared auth schema across SS42 apps
8. Asset system with typed relationship map
9. Bulk export with incremental pull (kb-pull.sh, kb-sync.sh)
10. Drag-to-reorder pages
11. Inbox for quick capture
12. Progressive Web App (service worker)
13. App rail switcher (cross-app navigation)
14. Dark mode with system preference detection
15. Frontmatter round-trip (YAML to DB columns and back)

## Alternatives Evaluated

### MkDocs Material (static site generator)

The strongest alternative for documentation rendering. Turns a folder of markdown files into a beautiful static site.

**What it provides for free:** Gorgeous typography out of the box, client-side full-text search (no database), built-in Mermaid rendering, folder-based navigation, dark mode, mobile responsive, zero custom code.

**What it lacks:** No authentication (static HTML files — requires an auth proxy like Cloudflare Access for private content), no RBAC, no web editing, no asset system, no version history (beyond git), no API for Claude Code to push content to. Access is binary (on/off) — no per-user roles or audit trail.

**Claude Code workflow would be:** Write markdown files to vault, run `mkdocs build`, serve via nginx. Simpler than the current API-based sync, but no real-time push — requires a rebuild trigger.

### Wiki.js

Node.js + PostgreSQL (same stack as KB). Markdown with Mermaid, built-in search, Git sync, polished UI. Would have provided most core features with zero custom code.

**Gaps:** You trust their security implementation. Wiki.js has had auth bypass vulnerabilities. No shared auth schema across SS42 apps.

### BookStack

PHP/MySQL. Shelf > Book > Chapter > Page hierarchy matches the workspace > section > page model. Rich editor, API, search.

**Gaps:** PHP stack (different from the rest of SS42). Has had XSS issues. No shared auth. Different technology to maintain.

### Obsidian (local reader)

Local-first markdown reader with search, linking, and graph view. Zero deployment. Quartz can turn an Obsidian vault into a static site for web access.

**Gaps:** No web access without additional publishing step. No API. No multi-device access without Obsidian Sync (paid).

## The Security Argument

This is where the custom build decisively wins. The vault contains personal job search data, infrastructure credential references, operational knowledge, and cross-project architecture documentation. The security posture is:

| Layer | Implementation |
|---|---|
| Authentication | Google OAuth with email allowlist — only pre-approved emails can log in |
| Authorization | Three-tier RBAC (viewer/editor/admin) enforced on every route |
| API tokens | 32-byte random, bcrypt-hashed, capped at editor role |
| Sessions | PostgreSQL-backed, httpOnly, secure, sameSite: lax |
| Network | Cloudflare tunnel (TLS at edge) + Docker NAT (10.0.3.x — unreachable from internet) |
| CSP | Strict — no unsafe-eval, frameAncestors: none, connectSrc: self |
| XSS prevention | Zero innerHTML across entire frontend — DOMPurify + DOMParser everywhere |
| SQL injection | Parameterised queries throughout — no string concatenation |
| Path traversal | Explicit checks on vault file operations |
| Error handling | Internal errors return generic messages — no stack trace leakage |

Static site generators have no authentication at all. Wiki-style platforms (Wiki.js, BookStack) have auth but you trust their security — and both have had CVEs. The custom build means every layer is known, audited, and controlled.

### Encryption Feasibility

Application-layer content encryption was assessed and rejected. The `search_vector` column is `GENERATED ALWAYS` from content columns — encrypting content produces garbage tokenisation. Rebuilding search as a separate decrypted index table would be significant effort for partial protection (vault files on disk remain plaintext regardless).

Infrastructure-level encryption is the correct approach:
- macOS FileVault (already enabled) protects all local files
- QNAP volume encryption (MASTER-TODO #98) would protect all server-side data
- These protect the same content with zero application code changes

## The Claude Code Integration

The one genuinely unique feature is the vault sync pipeline: Claude Code writes a markdown file, pushes via `kb-sync.sh` to `POST /api/pages/by-path`, and the content appears immediately in the browser. The reverse path (`kb-pull.sh`) pulls latest content at session start.

This workflow would need to be replicated in any alternative. With MkDocs, the equivalent would be: write file, trigger `mkdocs build`, wait for static site rebuild. Simpler engineering but higher latency and no real-time push.

## Decision

**Keep the custom build.** The reasons, in order of weight:

1. **Security** — the OAuth allowlist + RBAC + CSP + zero-innerHTML stack is proportionate for personal sensitive content and stronger than any off-the-shelf alternative evaluated
2. **Claude Code integration** — the API-based vault sync is genuinely useful and would need replication in any alternative
3. **Shared auth** — the SSO schema across SS42 apps (KB, Applyr, ToDo) is a cross-cutting concern that no off-the-shelf tool handles
4. **It works** — the app is deployed, stable, and serving 78 articles. Migration cost is real cost for uncertain benefit
5. **Full control** — every security layer, every API endpoint, every rendering decision is known and auditable

**The risk to manage:** Feature creep. The app does what it needs to do. The backlog (content organisation, linking, Mermaid rendering, PM docs) should be evaluated against the Marty Cagan test before building: does this feature enable building and doing, or is it documentation infrastructure for its own sake?

## Related

- Security hardening: MASTER-TODO #33 (K12) — 5 items from audits on 2026-03-04 and 2026-03-06
- QNAP volume encryption: MASTER-TODO #98 (I4)
- macOS FileVault: MASTER-TODO #97 (I3) — confirmed enabled
- Architecture: `products/knowledge-base/kp-architecture.md`
- Design decisions: `products/knowledge-base/kp-design-decisions.md`
