# KB v2.0 Implementation Plan — Session Prompt

Paste this into a new Claude Code session in the `knowledge-base` project folder.

---

## Prompt

Write the KB v2.0 implementation plan using `superpowers:writing-plans`.

**Read these files (and only these) before writing:**

1. **Design spec:** `docs/plans/2026-03-02-knowledge-base-v2-design.md` — the complete design (16 sections). This is the source of truth for what to build.

2. **Applyr implementation plan (format reference):** `../job-app/docs/plans/2026-03-02-applyr-implementation-plan.md` — read the first 100 lines only. Use the same format: phasing table, task structure (spec reference, files, description, acceptance criteria in WHEN/THEN/AND).

3. **Existing v1.0 structure (what we are modifying):**
   - `server.js` — Express entry point
   - `routes/` directory listing — existing API routes
   - `services/` directory listing — existing service layer
   - `public/` directory listing — existing frontend
   - `package.json` — current dependencies
   - `Dockerfile` — current Docker setup
   - `CLAUDE.md` — project context

Do NOT read the full content of every route/service file. A directory listing is enough to know what exists. Only read individual files if you need to understand a specific integration point.

**What to produce:**

Write the implementation plan to `docs/plans/2026-03-03-kb-v2-implementation-plan.md`.

Structure:
- Phasing strategy table (each phase delivers working value)
- Phase 1 fully detailed (fine-grained 2-5 minute builder-agent tasks)
- Phases 2+ at task level with spec references and acceptance criteria
- Every task has: spec reference, files, description, WHEN/THEN acceptance criteria

**Key context for phasing:**

- This is a v1.0 → v2.0 migration, not a greenfield build. The app already exists with Express, PostgreSQL, auth, routes, services, and a frontend.
- The biggest changes are: vault-as-source (chokidar file watcher + sync), visual redesign (Applyr-aligned), responsive layout, PWA, and Mermaid diagramming.
- Existing auth, database connection, CI/CD, and much of the API layer carry forward unchanged.
- Phase 1 should deliver: vault sync engine working, one page rendering with new visual design, Mermaid diagram rendering. This proves the core architecture change.
- Diagramming is in §15 of the design spec. It needs its own phase or tasks within the frontend phase.

**Constraints:**
- Do not read files beyond what is listed above
- Do not start building — only write the plan
- Follow SDD conventions: every task has a `spec:` line linking to the design doc section
