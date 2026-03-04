# Changelog

All notable changes to the Knowledge Base project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-03-04

### Added
- Frontmatter metadata parsing — js-yaml parses YAML frontmatter in vault files, maps 7 fields to DB columns, round-trip writes prepend frontmatter on save (#35)
- Gapped sort ordering — seed data, vault sync, and auto-created workspaces/sections use gapped numbering (10, 20, 30...) (#36)
- Drag-to-reorder pages in sidebar — native HTML5 drag-and-drop, PATCH /api/pages/reorder bulk endpoint, vault frontmatter updated on reorder (#13)
- Version label at bottom of app rail — fetched from /api/version endpoint
- Skill asset registration script — registers 50 assets and 34 relationships into Map view
- Migration 004: archived page status
- 31 new tests (22 frontmatter unit, 5 vault sync integration, 4 reorder API)

[2.0.1]: https://github.com/sspaynter/knowledge-base/releases/tag/v2.0.1

## [2.0.0] - 2026-03-04

Complete rewrite of the Knowledge Platform. Pages served from an Obsidian-compatible
vault with three-layer read fallback, responsive frontend with rail app switcher,
and Google OAuth SSO via shared auth.

### Added
- Vault sync engine with chokidar file watcher and three-layer content fallback
- Mermaid diagram rendering with click-to-edit and diagram templates
- Split-view editor with vault-first writes
- Page version history
- Rail app switcher (two-tier: core apps above divider, built apps below)
- Responsive layout with mobile drawer
- Progressive Web App with service worker
- Full-text search across vault content
- Diagram SVG/PNG export
- Dark mode with system preference detection
- v1-to-v2 data migration script
- Inbox for quick capture
- Asset browser
- Status filtering (published/draft)
- Map diagram toggle
- Google OAuth SSO via shared_auth schema
- 88 tests across 17 suites
- CI/CD test gate on every push
- Vault taxonomy restructure (9 PARA-informed workspaces)
- Incremental migration runner for CI

### Fixed
- Dockerfile healthcheck uses 127.0.0.1 to avoid Alpine IPv6 resolution failure
- Favicon link tag added to index.html

[2.0.0]: https://github.com/sspaynter/knowledge-base/releases/tag/v2.0.0
