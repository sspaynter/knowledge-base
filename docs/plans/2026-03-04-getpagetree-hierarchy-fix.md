# KB Bug Fix — getPageTree Flat Array (#46)

**Master Todo:** #46
**Version:** v2.0.2 (patch)
**Depends on:** #35 (frontmatter parsing), #36 (gapped sort ordering) — both complete
**Priority:** P1 — page hierarchy is not rendering in the sidebar

---

## Bug Description

`getPageTree()` in `services/pages.js` passes DB rows through `buildTree()` before returning them. `buildTree()` produces a **nested** structure — top-level pages have a `children: []` array containing their child pages, recursively.

The client's `renderPageTree()` in `public/js/app.js` expects a **flat** array and does its own recursive filtering:

```javascript
pages.filter(p => (p.parent_id ?? null) === parentId)
```

When all pages had `parent_id = null` (no hierarchy), `buildTree()` returned everything at the top level with empty `children: []` — the mismatch was invisible.

Now that real page hierarchy exists (e.g., the ToDo product docs section), children are nested inside `children[]` on the server response. The client's flat filter never finds them. Only the root page renders in the sidebar — all children are invisible.

---

## Root cause

```javascript
// services/pages.js — current (broken)
async function getPageTree(sectionId) {
  const res = await getPool().query(`...`, [sectionId]);
  return buildTree(res.rows);  // ← wraps in nested structure the client cannot use
}

function buildTree(rows, parentId = null) {
  return rows
    .filter(r => r.parent_id === parentId)
    .map(r => ({ ...r, children: buildTree(rows, r.id) }));
}
```

---

## Task 1: Fix getPageTree — return flat rows directly — COMPLETED (session 51)

Removed `buildTree()` function entirely. `getPageTree()` returns `res.rows` directly. Staging and production verified — nested pages render correctly in sidebar.

- **spec:** this document § Bug Description
- **files:** `services/pages.js` (MODIFY — lines 13–28)
- **code:**

```javascript
// services/pages.js — fixed
// Returns flat array ordered by sort_order, title.
// The client's renderPageTree() handles recursive tree-building
// by filtering on parent_id itself — do not nest here.
async function getPageTree(sectionId) {
  const res = await getPool().query(`
    SELECT id, parent_id, title, slug, status, template_type,
           created_by, sort_order, created_at, updated_at
    FROM ${SCHEMA}.pages
    WHERE section_id = $1 AND deleted_at IS NULL
    ORDER BY sort_order, title
  `, [sectionId]);
  return res.rows;
}
```

Remove the `buildTree()` function entirely — it is no longer used anywhere.

- **test:** `npm test` — all existing tests pass. Manually verify in the browser that a section with nested pages (e.g., Products → ToDo) renders the full hierarchy in the sidebar.
- **acceptance:**
  - WHEN a section has pages with `parent_id` set THEN the sidebar renders them at the correct indented depth
  - WHEN a section has only root-level pages (all `parent_id = null`) THEN rendering is unchanged from current behaviour
  - WHEN `npm test` is run THEN all existing tests pass with no regressions

---

## Affected files

| File | Change |
|---|---|
| `services/pages.js` | Remove `buildTree()` call and function — return `res.rows` directly |

No migration required. No schema change. No frontend change.

---

## How this was discovered

During a cross-session review of staging KB (2026-03-04), the ToDo product docs hierarchy was correctly structured in the DB (22 pages, correct `parent_id` values) but the sidebar only showed the root page. Investigation traced the issue to the client/server array format mismatch described above.

The fix was validated by hot-patching the staging container — sidebar rendered the full 4-level hierarchy correctly. The patch was then reverted from `dev` to go through the proper pipeline.

---

## Verification checklist

- [ ] `npm test` passes with no regressions
- [ ] Staging KB sidebar shows full nested hierarchy for a section with subpages
- [ ] Sections with no subpages (flat layout) render unchanged
- [ ] `buildTree()` function removed from `services/pages.js`
