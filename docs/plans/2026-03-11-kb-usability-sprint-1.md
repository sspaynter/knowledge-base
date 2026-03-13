# KB Usability Sprint 1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver two usability features: dead link indicators for inter-page hyperlinks (#59) and a version history viewer panel (#115).

**Architecture:** #59 extends the existing `bindInternalLinks()` handler in app.js to visually mark unresolvable `/page/` links. #115 adds a right-side slide-in panel to content.js that fetches version history from the existing `GET /api/pages/:id/versions` endpoint, plus a new endpoint to retrieve individual version content for read-only viewing.

**Tech Stack:** Vanilla JS (ES6 modules), Express/pg backend, existing CSS design system tokens. No new dependencies.

**Dependency graph:**
```
Task 1 (dead link CSS)
  └── Task 2 (dead link interception) — depends on Task 1
        └── Task 3 (dead link tests) — depends on Task 2

Task 4 (version content API endpoint)
  └── Task 5 (version API client) — depends on Task 4
        └── Task 6 (version history panel UI) — depends on Task 5
              └── Task 7 (restore + confirmation) — depends on Task 6
```

Tasks 1-3 and Tasks 4-7 are independent tracks — can be built in parallel.

---

## Track A: Dead Link Indicators (#59)

### Task 1: Add dead-link CSS styles
- spec: kp-design-decisions.md § ADR-010 — Dead link visual indicator
- files:
  - MODIFY: public/css/styles.css (add dead-link styles after `.article-body a` at line ~562)
- code:
  ```css
  /* Dead links — unresolvable /page/ references */
  .article-body a.dead-link {
    color: var(--red);
    text-decoration: line-through;
    cursor: not-allowed;
    opacity: 0.7;
  }
  .article-body a.dead-link:hover {
    opacity: 1;
  }
  ```
- test: Visual inspection — no automated CSS test needed
- acceptance:
  - WHEN a link has class `dead-link` THEN it renders in red with strikethrough
  - WHEN user hovers a dead link THEN opacity increases to indicate interactivity
- done-when: `.dead-link` class exists in styles.css and renders visually distinct from normal links
- blocks: Task 2 — dead link interception needs the CSS class

---

### Task 2: Mark dead links after markdown render
- spec: kp-design-decisions.md § ADR-010 — Resolution order step 4 "Not found — render as dead link"
- files:
  - MODIFY: public/js/content.js (add `markDeadLinks()` call after `renderMermaidBlocks`, line ~55)
- code:
  ```js
  // In content.js, after renderMermaidBlocks resolves:
  // Scan all /page/ links in the rendered content and mark unresolvable ones
  async function markDeadLinks(container) {
    const links = container.querySelectorAll('a[href^="/page/"]');
    const checks = Array.from(links).map(async (link) => {
      const href = link.getAttribute('href');
      const hashIdx = href.indexOf('#');
      const pagePath = hashIdx >= 0 ? href.slice(6, hashIdx) : href.slice(6);
      try {
        await api.resolvePage(decodeURIComponent(pagePath));
      } catch {
        link.classList.add('dead-link');
        link.title = 'Page not found: ' + pagePath;
      }
    });
    await Promise.allSettled(checks);
  }
  ```
- test: Manual — create a page with a `/page/nonexistent-slug` link, verify it renders red with strikethrough
- acceptance:
  - WHEN rendered markdown contains `[text](/page/valid-path)` THEN the link renders normally (no dead-link class)
  - WHEN rendered markdown contains `[text](/page/nonexistent)` THEN the link gets `dead-link` class AND title tooltip shows path
  - WHEN a dead link is clicked THEN no navigation occurs (existing `bindInternalLinks` catches error via toast)
- done-when: Unresolvable `/page/` links render with red strikethrough and tooltip after page content loads
- blocked-by: Task 1 — CSS styles

---

### Task 3: Backend test for resolve endpoint 404 behaviour
- spec: kp-design-decisions.md § ADR-010 — Resolution order (404 case)
- files:
  - MODIFY: tests/routes/pages.test.js (add resolve endpoint tests at end of file)
- code:
  ```js
  // follows existing pattern from tests/routes/pages.test.js
  test('GET /api/pages/resolve returns 404 for nonexistent path', async () => {
    const res = await request(app)
      .get('/api/pages/resolve?path=nonexistent/path/here')
      .set('Authorization', bearer);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Page not found');
  });

  test('GET /api/pages/resolve returns 400 without path param', async () => {
    const res = await request(app)
      .get('/api/pages/resolve')
      .set('Authorization', bearer);
    expect(res.status).toBe(400);
  });
  ```
- test: npm test -- --testPathPattern="routes/pages"
- acceptance:
  - WHEN resolve is called with a nonexistent path THEN 404 with `{ error: 'Page not found' }`
  - WHEN resolve is called without a path parameter THEN 400
- done-when: Both new tests pass alongside existing page route tests

**Checkpoint:**
- Run: `npm test`
- Expected: All tests pass
- Commit: `git add public/css/styles.css public/js/content.js tests/routes/pages.test.js && git commit -m "feat(#59): dead link visual indicator for inter-page hyperlinks"`

---

## Track B: Version History Viewer (#115)

### Task 4: Add GET single version content endpoint
- spec: MASTER-TODO.md § #115 — Version history viewer
- files:
  - MODIFY: services/pages.js (add `getPageVersion` function after `getPageVersions` at line ~416)
  - MODIFY: routes/pages.js (add route after existing versions routes at line ~305)
  - TEST: tests/routes/pages.test.js (add version endpoint tests)
- code:
  ```js
  // services/pages.js — add after getPageVersions
  async function getPageVersion(pageId, versionId) {
    const res = await getPool().query(`
      SELECT id, page_id, content, change_summary, changed_by, created_at
      FROM ${SCHEMA}.page_versions
      WHERE id = $1 AND page_id = $2
    `, [versionId, pageId]);
    return res.rows[0] || null;
  }

  // routes/pages.js — add after GET /:id/versions
  router.get('/:id/versions/:versionId', async (req, res, next) => {
    try {
      const version = await pages.getPageVersion(req.params.id, req.params.versionId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      res.json(version);
    } catch (err) { next(err); }
  });
  ```
- test: npm test -- --testPathPattern="routes/pages"
- acceptance:
  - WHEN GET /api/pages/:id/versions/:versionId with valid IDs THEN returns version object with content field
  - WHEN version ID does not exist THEN 404 with `{ error: 'Version not found' }`
- done-when: New endpoint returns full version content including the `content` text field
- blocks: Task 5 — API client needs this endpoint

---

### Task 5: Add version API methods to frontend client
- spec: MASTER-TODO.md § #115 — Version history viewer
- files:
  - MODIFY: public/js/api.js (add 3 new exports after line ~64, before Assets section)
- code:
  ```js
  // Page Versions — follows pattern from existing page API methods
  export const getPageVersions = (pageId) =>
    request('GET', `/api/pages/${pageId}/versions`);
  export const getPageVersion = (pageId, versionId) =>
    request('GET', `/api/pages/${pageId}/versions/${versionId}`);
  export const restorePageVersion = (pageId, versionId) =>
    request('POST', `/api/pages/${pageId}/versions/${versionId}/restore`);
  ```
- test: Manual — call `api.getPageVersions(pageId)` from browser console
- acceptance:
  - WHEN `api.getPageVersions(id)` is called THEN returns array of version metadata
  - WHEN `api.getPageVersion(id, vid)` is called THEN returns version with content
  - WHEN `api.restorePageVersion(id, vid)` is called THEN returns updated page
- done-when: Three new exports exist in api.js and are callable from other modules
- blocked-by: Task 4 — backend endpoint

---

### Task 6: Build version history panel UI
- spec: MASTER-TODO.md § #115 — Version history viewer
- files:
  - MODIFY: public/js/content.js (add `buildVersionPanel` function, add History button to `buildHeader`, line ~104)
  - MODIFY: public/css/styles.css (add `.version-panel` styles after `.asset-panel` section, line ~630)
- code:
  ```js
  // content.js — add History button to buildHeader (alongside Edit button)
  const historyBtn = document.createElement('button');
  historyBtn.className = 'btn btn--ghost btn--sm';
  const historyIcon = document.createElement('i');
  historyIcon.setAttribute('data-lucide', 'clock');
  historyIcon.setAttribute('aria-hidden', 'true');
  historyBtn.appendChild(historyIcon);
  historyBtn.appendChild(document.createTextNode(' History'));
  historyBtn.addEventListener('click', () => toggleVersionPanel(page));
  actions.appendChild(historyBtn);

  // Version panel — slide-in from right, shows version list
  async function toggleVersionPanel(page) {
    const existing = document.querySelector('.version-panel');
    if (existing) { existing.remove(); return; }

    const panel = document.createElement('aside');
    panel.className = 'version-panel';
    panel.setAttribute('aria-label', 'Version history');

    // Header
    const header = document.createElement('div');
    header.className = 'version-panel__header';
    const title = document.createElement('span');
    title.className = 'version-panel__title';
    title.textContent = 'Version History';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn--ghost btn--sm';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => panel.remove());
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Fetch and render version list
    try {
      const versions = await api.getPageVersions(page.id);
      if (!versions.length) {
        const empty = document.createElement('p');
        empty.className = 'version-panel__empty';
        empty.textContent = 'No version history yet.';
        panel.appendChild(empty);
      } else {
        const list = document.createElement('div');
        list.className = 'version-list';
        versions.forEach(v => list.appendChild(buildVersionRow(v, page)));
        panel.appendChild(list);
      }
    } catch {
      const err = document.createElement('p');
      err.textContent = 'Failed to load version history.';
      panel.appendChild(err);
    }

    pane.appendChild(panel);
    window.lucide.createIcons();
  }

  function buildVersionRow(version, page) {
    const row = document.createElement('div');
    row.className = 'version-row';
    // timestamp
    const time = document.createElement('span');
    time.className = 'version-row__time';
    time.textContent = formatDate(version.created_at);
    // summary
    const summary = document.createElement('span');
    summary.className = 'version-row__summary';
    summary.textContent = version.change_summary;
    // author badge
    const author = document.createElement('span');
    author.className = 'badge';
    author.textContent = version.changed_by;

    row.appendChild(time);
    row.appendChild(summary);
    row.appendChild(author);

    // Click to view version content
    row.addEventListener('click', () => showVersionContent(version, page));
    return row;
  }
  ```
  ```css
  /* styles.css — version panel (right-side slide-in) */
  .version-panel {
    position: fixed;
    top: var(--topbar-h);
    right: 0;
    bottom: 0;
    width: 360px;
    background: var(--surface);
    border-left: 1px solid var(--border);
    z-index: 50;
    overflow-y: auto;
    padding: var(--sp-5);
    box-shadow: var(--shadow-lg);
    animation: slideInRight 0.2s ease-out;
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  .version-panel__header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: var(--sp-4);
    padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border-soft);
  }
  .version-panel__title {
    font-size: 14px; font-weight: 600; color: var(--text-1);
  }
  .version-panel__empty {
    font-size: 13px; color: var(--text-3); font-style: italic;
  }
  .version-row {
    display: flex; flex-direction: column; gap: 2px;
    padding: var(--sp-3) var(--sp-2);
    border-radius: var(--r-md);
    cursor: pointer;
    transition: background var(--t-fast);
    border-bottom: 1px solid var(--border-soft);
  }
  .version-row:hover { background: var(--surface-2); }
  .version-row__time {
    font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text-3);
  }
  .version-row__summary {
    font-size: 13px; color: var(--text-2);
  }
  ```
- test: Manual — click History button on a page that has been edited, verify panel slides in with version list
- acceptance:
  - WHEN user clicks History button THEN version panel slides in from right showing version list
  - WHEN user clicks History again (or close button) THEN panel closes
  - WHEN page has no versions THEN panel shows "No version history yet."
  - WHEN version list loads THEN each row shows timestamp, summary, and author badge
- done-when: History button appears next to Edit, clicking it opens/closes a right-side version list panel
- blocked-by: Task 5 — API client methods

---

### Task 7: Version content viewer and restore action
- spec: MASTER-TODO.md § #115 — Version history viewer
- files:
  - MODIFY: public/js/content.js (add `showVersionContent` function and restore handler)
  - MODIFY: public/css/styles.css (add `.version-content` styles after `.version-row`)
- code:
  ```js
  // content.js — show read-only version content in the panel
  async function showVersionContent(version, page) {
    const panel = document.querySelector('.version-panel');
    if (!panel) return;

    // Remove any existing content view
    panel.querySelector('.version-content')?.remove();

    const view = document.createElement('div');
    view.className = 'version-content';

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn--ghost btn--sm';
    backBtn.textContent = '\u2190 Back to list';
    backBtn.addEventListener('click', () => view.remove());
    view.appendChild(backBtn);

    // Fetch full version content
    try {
      const full = await api.getPageVersion(page.id, version.id);
      const body = document.createElement('div');
      body.className = 'article-body version-content__body';
      setMarkdownContent(body, full.content || '');
      view.appendChild(body);
    } catch {
      const err = document.createElement('p');
      err.textContent = 'Failed to load version content.';
      view.appendChild(err);
    }

    // Restore button (editor role check happens server-side)
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn btn--primary btn--sm';
    restoreBtn.textContent = 'Restore this version';
    restoreBtn.addEventListener('click', async () => {
      if (!confirm('Restore this version? Current content will be saved as a new version.')) return;
      try {
        const updated = await api.restorePageVersion(page.id, version.id);
        panel.remove();
        // Re-render page with restored content
        const { renderPage } = await import('./content.js');
        renderPage(updated);
        toastSuccess('Version restored');
      } catch (err) {
        toastError('Restore failed: ' + err.message);
      }
    });
    view.appendChild(restoreBtn);

    panel.appendChild(view);
    window.lucide.createIcons();
  }
  ```
  ```css
  .version-content {
    margin-top: var(--sp-4);
    padding-top: var(--sp-4);
    border-top: 1px solid var(--border);
  }
  .version-content__body {
    max-height: 400px;
    overflow-y: auto;
    padding: var(--sp-3);
    background: var(--elevated);
    border-radius: var(--r-md);
    margin: var(--sp-3) 0;
    font-size: 14px;
  }
  ```
- test: Manual — click a version row, verify content displays read-only, click Restore, confirm dialog, verify page updates
- acceptance:
  - WHEN user clicks a version row THEN version content renders read-only in the panel
  - WHEN user clicks "Back to list" THEN content view is removed, list is visible again
  - WHEN user clicks "Restore this version" THEN confirmation dialog appears
  - WHEN user confirms restore THEN page content updates, panel closes, success toast shown
  - WHEN user cancels restore THEN nothing changes
  - WHEN restore fails (non-editor role) THEN error toast shown
- done-when: Users can view any previous version's content and restore it via confirmation dialog
- blocked-by: Task 6 — panel must exist

**Checkpoint:**
- Run: `npm test`
- Expected: All tests pass (including new version endpoint tests from Task 4)
- Commit: `git add services/pages.js routes/pages.js public/js/api.js public/js/content.js public/css/styles.css tests/routes/pages.test.js && git commit -m "feat(#115): version history viewer panel with restore"`

---

## Post-Plan: Export changes

After both tracks are complete:
1. Run full test suite: `npm test`
2. Manual smoke test on local dev: create page, add inter-page links (valid + invalid), edit page multiple times, open version history, view old version, restore
3. Push to `dev` for staging deployment
