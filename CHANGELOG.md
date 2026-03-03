# Changelog

All notable changes to the Knowledge Base project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
