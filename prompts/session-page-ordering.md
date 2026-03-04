# KB Session — Fix Page Ordering (#36)

Master Todo #36. Sidebar page tree, section lists, and workspace strip sort alphabetically. They should respect `sort_order` from the database.

## Problem

Pages, sections, and workspaces all have `sort_order` columns in the schema, but the UI displays them alphabetically. This means structured documentation appears jumbled — e.g., "Architecture" should come before "Design Decisions" before "Feature Status", but they sort as A-D-F instead of the intended sequence.

## What to fix

1. **Check the backend queries** in `services/pages.js` (getPageTree), `services/workspaces.js` (listWorkspaces, listSections) — confirm they ORDER BY sort_order
2. **Check the frontend** in `public/js/app.js` and sidebar rendering — confirm it is not re-sorting alphabetically after receiving API data
3. **Fix whichever layer is overriding** the intended order
4. **Seed data** — verify the seed script sets meaningful sort_order values for the 9 workspaces and 14 sections
5. **Vault sync** — when new pages are created from vault files, they get sort_order 0 (default). Consider: should vault sync infer order from filename prefix (e.g., `01-architecture.md`) or frontmatter?

## Done when

- [ ] Workspaces display in seed-defined order (inbox, operations, products, projects, studio, work, personal, learning, archive)
- [ ] Sections within a workspace display in seed-defined order
- [ ] Pages within a section display in sort_order, not alphabetical
- [ ] New pages from vault sync get a sensible default sort_order
- [ ] Tests pass, deployed to staging
