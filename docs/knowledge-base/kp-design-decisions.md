# Knowledge Platform — Design Decisions

**Type:** Decision record collection
**Workspace:** IT & Projects
**Section:** Knowledge Platform
**Template:** decision-record
**Status:** Active
**Created:** 2026-02-27
**Author:** Simon Paynter + Claude

---

## ADR-001: PostgreSQL over SQLite

**Date:** 2026-02-27
**Status:** Decided

**Context:**
The existing v0.1 scaffold used SQLite (single file, no setup). The rebuild needed to decide whether to keep SQLite or migrate to PostgreSQL.

**Decision:** PostgreSQL.

**Reasons:**
- Full-text search (`tsvector`) — core to the product; SQLite FTS is weaker
- Cross-schema reads — the job tracker and other NocoDB schemas live in the same PostgreSQL container; `kb_app` can be granted SELECT on specific tables
- Multi-user — PostgreSQL handles concurrent connections properly
- Already running — `n8n-postgres` is on the NAS; no new container needed
- `knowledge_base` schema isolates the app completely from NocoDB

**Trade-off:** Slightly more complex setup (migration script, `kb_app` user creation). Acceptable.

---

## ADR-002: Vanilla JS over React/Vue

**Date:** 2026-02-27
**Status:** Decided

**Context:**
Choosing a frontend approach: framework (React, Vue, Svelte) vs vanilla JS ES6 modules.

**Decision:** Vanilla JS ES6 modules.

**Reasons:**
- No build step — simpler Docker image, faster iteration, no bundler config to maintain
- The existing v0.1 was vanilla JS — rewriting in a framework adds migration overhead
- The UI is complex but not reactive-state-heavy; most rendering is triggered by user actions
- Lucide, marked, DOMPurify all load cleanly as UMD globals
- The app-scaffold skill (Simon's reference implementation) is also vanilla JS

**Trade-off:** More verbose DOM building (createElement vs JSX). Accepted — offset by no bundler and simpler deployment.

---

## ADR-003: Schema isolation over separate database

**Date:** 2026-02-27
**Status:** Decided

**Context:**
Where to put the Knowledge Platform data: a new database, or a new schema in the existing `n8n-postgres` container.

**Decision:** New `knowledge_base` schema in existing `n8n-postgres`.

**Reasons:**
- No new container needed — reduces operational overhead
- Schema isolation is complete — NocoDB cannot see `knowledge_base`; `kb_app` cannot see NocoDB schemas unless explicitly granted
- Enables cross-schema reads (e.g. job tracker data in future queries)
- The NAS is already running `n8n-postgres`; adding a schema is a one-command migration

**Trade-off:** Shared container means shared failure mode. Acceptable for a personal tool.

---

## ADR-004: Dedicated limited DB user (`kb_app`)

**Date:** 2026-02-27
**Status:** Decided

**Context:**
What database user should the app connect as?

**Decision:** Create a dedicated `kb_app` user with limited permissions. The migration script (run once with the superuser) creates the schema and the `kb_app` user, then grants only what it needs.

**Reasons:**
- Security principle of least privilege — if the app is compromised, the attacker cannot drop or modify NocoDB schemas
- `kb_app` has FULL on `knowledge_base` schema, SELECT on specific other tables as needed
- Pattern can be reused for every new app on the NAS

**Trade-off:** Requires the superuser password once to run migration. After that, superuser is not needed.

---

## ADR-005: DOMParser approach for markdown rendering

**Date:** 2026-02-27
**Status:** Decided

**Context:**
The app renders Markdown from user-authored and AI-authored content. A security hook in the Claude Code setup detects and blocks direct string-to-DOM assignment patterns. Needed a rendering approach that is both safe and hook-compliant.

**Decision:** Define `setMarkdownContent(element, md)` in `utils.js`. Pipeline: `marked.parse` → `DOMPurify.sanitize` → `DOMParser.parseFromString` → `appendChild` nodes individually. No direct string-to-DOM assignment anywhere in the codebase.

**Reasons:**
- Security hook compliance — the hook cannot be disabled per-file; must avoid the trigger pattern
- Genuinely safer — DOMParser plus appendChild does not carry the same XSS risk as direct assignment
- DOMPurify sanitizes the content anyway — double protection
- All other text content uses `textContent` (plain text, no HTML)

**Trade-off:** Slightly more verbose than a one-liner. The helper function hides the complexity; callers are clean.

---

## ADR-006: Lora (serif) for body text

**Date:** 2026-02-27
**Status:** Decided

**Context:**
Choosing the body font for page content.

**Decision:** Lora (Google Fonts, serif) at 15.5px, line-height 1.82.

**Reasons:**
- Reading documentation feels intentional rather than clinical — the defining design decision
- Serifs improve readability for longer prose
- DM Sans (sans-serif) handles all UI chrome; the contrast between UI and content typography is visually distinctive
- JetBrains Mono handles metadata, code, paths — three fonts, three clear roles

**Trade-off:** Font loading from Google Fonts CDN; mitigated by preconnect hints.

---

## ADR-007: Phase-based implementation plan approach

**Date:** 2026-02-27
**Status:** Decided (process decision, not code)

**Context:**
Writing a complete implementation plan for a 30-task rebuild hit the 32k output token limit. A single large file exceeded what Claude could generate in one response.

**Decision:** Write the implementation plan as five separate phase files (`impl-01-*.md` through `impl-05-*.md`), each under the token limit, then merge with `cat`.

**Phases:**
1. Database (Tasks 1–6)
2. Backend (Tasks 7–15)
3. Frontend foundation (Tasks 16–19)
4. Frontend components (Tasks 20–24)
5. Deployment (Tasks 25–30)

**Reasons:**
- Each phase is independently verifiable — tests pass before moving on
- Phases match the natural build order (DB → backend → frontend → deploy)
- Individual files are readable in context without loading the whole plan
- Merge is trivial and produces a single reference document

**Trade-off:** Slightly more session management overhead. Offset by reliability.

---

## ADR-008: Map view as filterable table (v1), not visual graph

**Date:** 2026-02-27
**Status:** Decided

**Context:**
The `asset_relationships` table tracks how skills, configs, agents, and decisions connect. Should the v1 map view be a visual node-link graph or a filterable table?

**Decision:** Filterable table for v1. Visual graph is v2.

**Reasons:**
- Interactive graph rendering (D3, Cytoscape) is significant effort and hard to maintain
- A well-designed table with filters gives the same information value immediately
- The `asset_relationships` table is already wired up — graph view is additive later
- Avoids a large JavaScript dependency in v1

**Trade-off:** Less visually compelling than a graph. Accepted — functionality over aesthetics in v1.
