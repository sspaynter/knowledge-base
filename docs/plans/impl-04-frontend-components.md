# Knowledge Platform — Implementation Plan
# Phase 4: Frontend Components — Content, Editor, Search, Map, Settings

**Goal:** Build the five remaining frontend modules that make the app functional end-to-end. After this phase, a user can read pages, edit and save them, search, view the relationship map, and manage settings.

**Architecture:** Each module is a lazily-imported ES module. All Markdown rendering uses a `setMarkdownContent(element, md)` helper (defined in utils.js addendum below) that goes through DOMPurify → DOMParser → appendChild. No direct innerHTML assignments.

**Dependencies:** Phase 3 complete — `index.html`, `styles.css`, `api.js`, `store.js`, `toast.js`, `utils.js`, `auth.js`, `app.js` all exist.

**Task numbering continues from Phase 3 (Tasks 16–19).**

---

## Task 20a: Add `setMarkdownContent` to `public/js/utils.js`

**File:** Append to `public/js/utils.js`

Before writing the content modules, add one helper to utils.js. This is the only place markdown is converted to live DOM nodes — via DOMPurify then DOMParser, with no innerHTML assignment anywhere in the codebase.

**Append to `public/js/utils.js`:**

```javascript
/**
 * Render markdown to DOM nodes and append to element.
 * Pipeline: marked.parse → DOMPurify.sanitize → DOMParser → appendChild
 * No innerHTML assignment. Safe for user-authored and AI-authored content.
 * @param {HTMLElement} element  Target container (will be cleared first)
 * @param {string} md            Markdown string
 */
export function setMarkdownContent(element, md) {
  element.textContent = ''; // safe clear
  if (!md) return;
  const sanitized = window.DOMPurify.sanitize(window.marked.parse(md));
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div>' + sanitized + '</div>', 'text/html');
  Array.from(doc.body.firstChild.childNodes).forEach(node => {
    element.appendChild(node.cloneNode(true));
  });
}
```

---

## Task 20: Create `public/js/content.js`

**Files:**
- Create: `public/js/content.js`

**What this builds:**
Renders a full page into the content pane. Breadcrumb trail, page title, action buttons, status badges, Markdown body, asset panel. Called by `app.js` whenever a page is selected.

**Step 1: Write the file**

Create `public/js/content.js`:

```javascript
// content.js — Renders a page into the content pane.
// Imported lazily from app.js: const { renderPage } = await import('./content.js')
// Markdown is rendered via setMarkdownContent (DOMPurify + DOMParser, no innerHTML).

import { store }        from './store.js';
import { setMarkdownContent, formatDate } from './utils.js';
import { toastError }   from './toast.js';
import * as api         from './api.js';

const pane = document.getElementById('content-pane');

const ASSET_ICONS = {
  skill:    'zap',
  config:   'settings-2',
  decision: 'clipboard-list',
  session:  'scroll-text',
  image:    'image',
  file:     'file-code',
  link:     'external-link',
  miro:     'layout-template',
};

/**
 * Render a full page object into the content pane.
 * @param {object} page  Full page from GET /api/pages/:id (includes assets array)
 */
export function renderPage(page) {
  pane.textContent = ''; // safe clear

  const view = document.createElement('div');
  view.className = 'page-view';

  view.appendChild(buildBreadcrumb(page));
  view.appendChild(buildHeader(page));
  view.appendChild(buildMeta(page));

  const divider = document.createElement('hr');
  divider.className = 'page-divider';
  view.appendChild(divider);

  view.appendChild(buildBody(page));

  if (page.assets && page.assets.length > 0) {
    view.appendChild(buildAssetPanel(page.assets));
  }

  pane.appendChild(view);
  window.lucide.createIcons();
}

// ── Breadcrumb ──────────────────────────────
function buildBreadcrumb(page) {
  const nav = document.createElement('nav');
  nav.className = 'page-breadcrumb';
  nav.setAttribute('aria-label', 'Breadcrumb');

  const crumbs = [
    { text: store.currentWorkspace?.name, href: '#' },
    { text: store.currentSection?.name,   href: '#' },
    { text: page.title,                   href: null },
  ].filter(c => c.text);

  crumbs.forEach((crumb, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'page-breadcrumb__sep';
      sep.textContent = '›'; // safe
      nav.appendChild(sep);
    }
    if (crumb.href) {
      const a = document.createElement('a');
      a.href = crumb.href;
      a.textContent = crumb.text; // textContent — safe
      nav.appendChild(a);
    } else {
      const span = document.createElement('span');
      span.textContent = crumb.text; // textContent — safe
      nav.appendChild(span);
    }
  });

  return nav;
}

// ── Header (title + edit button) ────────────
function buildHeader(page) {
  const header = document.createElement('div');
  header.className = 'page-header';

  const title = document.createElement('h1');
  title.className = 'page-title';
  title.textContent = page.title; // textContent — safe

  const actions = document.createElement('div');
  actions.className = 'page-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn--ghost btn--sm';

  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', 'pencil');
  icon.setAttribute('aria-hidden', 'true');
  editBtn.appendChild(icon);
  editBtn.appendChild(document.createTextNode(' Edit'));
  editBtn.addEventListener('click', () => {
    import('./editor.js').then(m => m.openEditor(page));
  });

  actions.appendChild(editBtn);
  header.appendChild(title);
  header.appendChild(actions);
  return header;
}

// ── Meta (badges + date) ────────────────────
function buildMeta(page) {
  const meta = document.createElement('div');
  meta.className = 'page-meta';

  if (page.status) {
    const badge = document.createElement('span');
    badge.className = 'badge badge--' + page.status;
    badge.textContent = page.status; // textContent — safe
    meta.appendChild(badge);
  }

  if (page.template_type && page.template_type !== 'blank') {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = page.template_type; // textContent — safe
    meta.appendChild(badge);
  }

  if (page.updated_at) {
    const date = document.createElement('span');
    date.style.cssText = 'font-size:11px;font-family:"JetBrains Mono",monospace;color:var(--text-3);margin-left:auto;';
    date.textContent = 'Updated ' + formatDate(page.updated_at); // textContent — safe
    meta.appendChild(date);
  }

  return meta;
}

// ── Article body (markdown → DOM) ───────────
function buildBody(page) {
  const article = document.createElement('article');
  article.className = 'article-body';

  if (page.content) {
    // setMarkdownContent: DOMPurify.sanitize → DOMParser → appendChild
    // No innerHTML used. See utils.js.
    setMarkdownContent(article, page.content);
  } else {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--text-3);font-style:italic;';
    p.textContent = 'This page has no content yet. Click Edit to add some.';
    article.appendChild(p);
  }

  return article;
}

// ── Asset panel ──────────────────────────────
function buildAssetPanel(assets) {
  const panel = document.createElement('section');
  panel.className = 'asset-panel';
  panel.setAttribute('aria-label', 'Linked assets');

  const header = document.createElement('div');
  header.className = 'asset-panel__header';

  const title = document.createElement('span');
  title.className = 'asset-panel__title';
  title.textContent = 'Assets (' + assets.length + ')'; // textContent — safe

  header.appendChild(title);
  panel.appendChild(header);

  assets.forEach(asset => {
    const row = document.createElement('div');
    row.className = 'asset-row';

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', ASSET_ICONS[asset.type] || 'file');
    icon.className = 'asset-row__icon';
    icon.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'asset-row__name';
    name.textContent = asset.title; // textContent — safe

    const meta = document.createElement('span');
    meta.className = 'asset-row__meta';
    meta.textContent = asset.type; // textContent — safe

    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(meta);
    row.addEventListener('click', () => showAssetDetail(asset));
    panel.appendChild(row);
  });

  return panel;
}

// ── Asset detail ─────────────────────────────
function showAssetDetail(asset) {
  pane.querySelector('.asset-detail-panel')?.remove();

  const detail = document.createElement('div');
  detail.className = 'asset-detail-panel';
  detail.style.cssText = 'padding:16px 40px 40px;max-width:820px;margin:0 auto;';

  const titleEl = document.createElement('h3');
  titleEl.style.cssText = 'font-size:16px;font-weight:600;margin-bottom:8px;';
  titleEl.textContent = asset.title; // textContent — safe

  const desc = document.createElement('p');
  desc.style.cssText = 'font-size:13px;color:var(--text-2);margin-bottom:12px;';
  desc.textContent = asset.description || ''; // textContent — safe

  detail.appendChild(titleEl);
  detail.appendChild(desc);

  if (asset.content) {
    const body = document.createElement('div');
    body.className = 'article-body';
    setMarkdownContent(body, asset.content);
    detail.appendChild(body);
  }

  if (asset.url) {
    const link = document.createElement('a');
    link.href = asset.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = asset.url; // textContent — safe
    link.style.fontSize = '13px';
    detail.appendChild(link);
  }

  pane.appendChild(detail);
  detail.scrollIntoView({ behavior: 'smooth' });
}
```

**Step 2: Verify**

Click any page in the sidebar. Content pane should show:
- [ ] Breadcrumb: `Workspace › Section › Page title`
- [ ] Page title at 28px
- [ ] Edit button top right
- [ ] Status / template badges
- [ ] Markdown body rendered in Lora serif (via setMarkdownContent — DOMPurify + DOMParser)
- [ ] Asset panel if page has linked assets
- [ ] Lucide icons in asset rows render

---

## Task 21: Create `public/js/editor.js`

**Files:**
- Create: `public/js/editor.js`

**What this builds:**
Opens the editor overlay when Edit is clicked. Populates title and content fields. Live Markdown preview (using setMarkdownContent). Auto-saves draft every 30 seconds. Save patches the page and re-renders.

**Step 1: Write the file**

Create `public/js/editor.js`:

```javascript
// editor.js — Page editor overlay.
// Preview uses setMarkdownContent (DOMPurify + DOMParser, no innerHTML).

import * as api      from './api.js';
import { store }     from './store.js';
import { setMarkdownContent } from './utils.js';
import { toastSuccess, toastError } from './toast.js';

const overlay    = document.getElementById('editor-overlay');
const titleInput = document.getElementById('editor-title');
const textarea   = document.getElementById('editor-textarea');
const preview    = document.getElementById('editor-preview');
const saveBtn    = document.getElementById('editor-save');
const discardBtn = document.getElementById('editor-discard');

let currentPage   = null;
let autoSaveTimer = null;
let isDirty       = false;

/**
 * Open the editor overlay for a page.
 * @param {object} page  Full page from the store or API
 */
export function openEditor(page) {
  currentPage      = page;
  isDirty          = false;
  titleInput.value = page.title   || '';
  textarea.value   = page.content || '';

  updatePreview();
  overlay.hidden = false;
  titleInput.focus();

  clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(autoSave, 30_000);
}

export function closeEditor() {
  overlay.hidden = true;
  clearInterval(autoSaveTimer);
  autoSaveTimer = null;
  currentPage   = null;
  isDirty       = false;
}

// ── Live preview ─────────────────────────────
function updatePreview() {
  // setMarkdownContent: DOMPurify.sanitize → DOMParser → appendChild (no innerHTML)
  setMarkdownContent(preview, textarea.value);
}

let previewTimer = null;
textarea.addEventListener('input', () => {
  isDirty = true;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 300);
});

titleInput.addEventListener('input', () => { isDirty = true; });

// ── Save ─────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  if (!currentPage) return;
  await persistEdits({ showToast: true, publish: true });
});

async function persistEdits({ showToast = false, publish = false } = {}) {
  if (!currentPage) return;

  const payload = {
    title:   titleInput.value.trim() || currentPage.title,
    content: textarea.value,
  };
  if (publish) payload.status = 'published';

  saveBtn.disabled    = true;
  saveBtn.textContent = 'Saving…';

  try {
    const updated     = await api.updatePage(currentPage.id, payload);
    currentPage       = updated;
    store.currentPage = updated;
    isDirty           = false;

    // Update sidebar title
    const sidebarTitle = document.querySelector('.page-item[data-id="' + updated.id + '"] span');
    if (sidebarTitle) sidebarTitle.textContent = updated.title; // textContent — safe

    if (showToast) {
      toastSuccess('Page saved');
      closeEditor();
      const { renderPage } = await import('./content.js');
      renderPage(updated);
    }
  } catch (err) {
    toastError('Save failed: ' + err.message);
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Save';
  }
}

async function autoSave() {
  if (!isDirty || !currentPage) return;
  await persistEdits({ showToast: false });
}

// ── Discard ───────────────────────────────────
discardBtn.addEventListener('click', () => {
  if (isDirty && !window.confirm('Discard unsaved changes?')) return;
  closeEditor();
});
```

**Step 2: Verify**

Click Edit on any page:
- [ ] Editor overlay opens full-screen
- [ ] Title and content fields populated
- [ ] Right pane shows live preview as you type (Lora serif, correct styling)
- [ ] Save PATCHes the page, closes editor, re-renders content pane
- [ ] Auto-save fires silently every 30 seconds
- [ ] Discard prompts confirmation when dirty

---

## Task 22: Create `public/js/search.js`

**Files:**
- Create: `public/js/search.js`

**What this builds:**
Handles search results in the search overlay. Called by `app.js` on search input. Debounced at 280ms. Results stagger in. Clicking a page result navigates to it.

**Step 1: Write the file**

Create `public/js/search.js`:

```javascript
// search.js — Search overlay results handler.
// All content rendered via textContent — no HTML from API is trusted.

import * as api         from './api.js';
import { store }        from './store.js';
import { debounce, excerpt } from './utils.js';

const resultsList = document.getElementById('search-results');
const emptyEl     = document.getElementById('search-empty');

let lastQuery = '';

const doSearch = debounce(async (q) => {
  if (!q.trim()) {
    resultsList.textContent = '';
    emptyEl.hidden = true;
    return;
  }
  try {
    const params = {};
    if (store.searchFilter && store.searchFilter !== 'all') params.type = store.searchFilter;
    const results = await api.search(q.trim(), params);
    renderResults(results);
  } catch (_) { /* non-critical */ }
}, 280);

export function handleSearch(q) {
  lastQuery = q;
  doSearch(q);
}

function renderResults(results) {
  resultsList.textContent = ''; // safe clear

  if (!results || results.length === 0) {
    emptyEl.hidden = !lastQuery.trim();
    return;
  }
  emptyEl.hidden = true;

  results.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'search-result-item';
    li.style.animationDelay = (i * 20) + 'ms';
    li.setAttribute('role', 'option');

    const title = document.createElement('div');
    title.className = 'search-result-item__title';
    title.textContent = item.title || item.name || 'Untitled'; // textContent — safe

    const path = document.createElement('div');
    path.className = 'search-result-item__path';
    path.textContent = item.breadcrumb || item.type || ''; // textContent — safe

    li.appendChild(title);
    li.appendChild(path);

    const raw = item.content || item.description || '';
    if (raw) {
      const ex = document.createElement('div');
      ex.className = 'search-result-item__excerpt';
      ex.textContent = excerpt(raw, 120); // textContent — safe
      li.appendChild(ex);
    }

    li.addEventListener('click', () => {
      document.getElementById('search-overlay').hidden = true;
      document.getElementById('search-input').value = '';
      resultsList.textContent = '';
      store.searchQuery = '';

      if (item.kind === 'page' || item.section_id) {
        import('./app.js').then(m => m.selectPage(item));
      }
    });

    resultsList.appendChild(li);
  });
}
```

**Step 2: Verify**

Open search (⌘K):
- [ ] Typing triggers debounced search
- [ ] Results stagger in with animation
- [ ] Each result: title, path, excerpt — all plain text, no rendered HTML
- [ ] Clicking a page result navigates there and closes search
- [ ] "No results found" appears on empty results
- [ ] Filter chips narrow results

---

## Task 23: Create `public/js/map.js`

**Files:**
- Create: `public/js/map.js`

**What this builds:**
Replaces the content pane with a filterable table of all asset relationships. The v1 relationship map — structured, queryable, no graph library needed.

**Step 1: Write the file**

Create `public/js/map.js`:

```javascript
// map.js — Asset relationship map view (v1: filterable table).
// All content rendered via textContent — no untrusted HTML from API.

import * as api from './api.js';
import { toastError } from './toast.js';

const REL_TYPES = ['loads', 'uses', 'generates', 'deploys-to', 'connects-to', 'supersedes', 'references'];

const ASSET_ICONS = {
  skill: 'zap', config: 'settings-2', decision: 'clipboard-list',
  session: 'scroll-text', image: 'image', file: 'file-code',
  link: 'external-link', miro: 'layout-template',
};

export async function renderMapView() {
  const pane = document.getElementById('content-pane');
  pane.textContent = ''; // safe clear

  // Show skeleton
  const sk = buildSkeleton();
  pane.appendChild(sk);

  let relationships = [];
  try {
    relationships = await api.listRelationships();
  } catch (_) {
    toastError('Could not load relationship map');
    pane.textContent = '';
    return;
  }

  pane.textContent = '';
  pane.appendChild(buildMapView(relationships));
  window.lucide.createIcons();
}

function buildSkeleton() {
  const wrap = document.createElement('div');
  wrap.style.padding = '24px 32px';
  const sk1 = document.createElement('div');
  sk1.className = 'skeleton skeleton--title';
  wrap.appendChild(sk1);
  for (let i = 0; i < 6; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton skeleton--text';
    wrap.appendChild(sk);
  }
  return wrap;
}

function buildMapView(relationships) {
  const container = document.createElement('div');
  container.className = 'map-view';

  // Header
  const header = document.createElement('div');
  header.className = 'map-view__header';
  const title = document.createElement('h2');
  title.className = 'map-view__title';
  title.textContent = 'Relationship Map'; // textContent — safe
  const count = document.createElement('span');
  count.style.cssText = 'font-size:13px;color:var(--text-3);font-family:"JetBrains Mono",monospace;';
  count.textContent = relationships.length + ' relationships'; // textContent — safe
  header.appendChild(title);
  header.appendChild(count);
  container.appendChild(header);

  // Filter bar
  const filters = document.createElement('div');
  filters.className = 'map-filters';
  const typeSelect = makeSelect(['All types', ...REL_TYPES]);
  const nameInput  = makeInput('Filter by asset name…');
  filters.appendChild(typeSelect);
  filters.appendChild(nameInput);
  container.appendChild(filters);

  // Table
  const wrap = document.createElement('div');
  wrap.style.overflowX = 'auto';
  const table = buildTable(relationships);
  wrap.appendChild(table);
  container.appendChild(wrap);

  // Filter logic
  function applyFilters() {
    const type  = typeSelect.value === 'All types' ? '' : typeSelect.value;
    const asset = nameInput.value.toLowerCase();
    table.querySelectorAll('tbody tr').forEach(tr => {
      const matchType  = !type  || tr.dataset.relType === type;
      const matchAsset = !asset || tr.dataset.from.toLowerCase().includes(asset)
                                 || tr.dataset.to.toLowerCase().includes(asset);
      tr.hidden = !(matchType && matchAsset);
    });
  }

  typeSelect.addEventListener('change', applyFilters);
  nameInput.addEventListener('input',  applyFilters);

  return container;
}

function buildTable(relationships) {
  const table = document.createElement('table');
  table.className = 'map-table';

  const thead = document.createElement('thead');
  const hrow  = document.createElement('tr');
  ['From', 'Type', 'To', 'Notes'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text; // textContent — safe
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (relationships.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.style.cssText = 'text-align:center;color:var(--text-3);padding:32px;font-size:13px;';
    td.textContent = 'No relationships recorded yet. Claude sessions write these automatically.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    relationships.forEach(rel => {
      const tr = document.createElement('tr');
      tr.dataset.from    = rel.from_title || String(rel.from_asset_id || '');
      tr.dataset.to      = rel.to_title   || String(rel.to_asset_id   || '');
      tr.dataset.relType = rel.relationship_type || '';

      tr.appendChild(makeAssetCell(rel.from_title || String(rel.from_asset_id), rel.from_type));
      tr.appendChild(makeTypeCell(rel.relationship_type));
      tr.appendChild(makeAssetCell(rel.to_title   || String(rel.to_asset_id),   rel.to_type));
      tr.appendChild(makeNotesCell(rel.notes));

      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);
  return table;
}

function makeAssetCell(name, type) {
  const td = document.createElement('td');
  if (type) {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', ASSET_ICONS[type] || 'file');
    icon.setAttribute('aria-hidden', 'true');
    icon.style.cssText = 'color:var(--text-3);margin-right:6px;vertical-align:middle;';
    td.appendChild(icon);
  }
  const span = document.createElement('span');
  span.textContent = name; // textContent — safe
  td.appendChild(span);
  if (type) {
    const badge = document.createElement('span');
    badge.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--text-3);margin-left:6px;';
    badge.textContent = type; // textContent — safe
    td.appendChild(badge);
  }
  return td;
}

function makeTypeCell(type) {
  const td = document.createElement('td');
  const span = document.createElement('span');
  span.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--accent);';
  span.textContent = type || '—'; // textContent — safe
  td.appendChild(span);
  return td;
}

function makeNotesCell(notes) {
  const td = document.createElement('td');
  td.style.cssText = 'color:var(--text-2);font-size:12px;max-width:220px;';
  td.textContent = notes || ''; // textContent — safe
  return td;
}

function makeSelect(options) {
  const sel = document.createElement('select');
  sel.className = 'input';
  sel.style.cssText = 'width:180px;border-radius:var(--r-full);padding:5px 12px;font-size:13px;';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt; // textContent — safe
    sel.appendChild(o);
  });
  return sel;
}

function makeInput(placeholder) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.style.width = '220px';
  input.placeholder = placeholder;
  return input;
}
```

**Step 2: Verify**

Click Map button (network icon) in the top bar:
- [ ] Skeleton shown while loading
- [ ] Table shows From / Type / To / Notes
- [ ] Type dropdown filters rows
- [ ] Name text filter narrows rows
- [ ] Empty state message when no relationships exist

---

## Task 24: Create `public/js/settings.js`

**Files:**
- Create: `public/js/settings.js`

**What this builds:**
The settings overlay. Five panels: Workspaces, Users & Roles, API Tokens, Account, Danger Zone. Admin-gated panels show a message to non-admin users. All text rendered via `textContent`.

**Step 1: Write the file**

Create `public/js/settings.js`:

```javascript
// settings.js — Settings overlay panels.
// All content uses textContent. No untrusted HTML from API rendered.

import * as api from './api.js';
import { store } from './store.js';
import { toastSuccess, toastError } from './toast.js';

const body = document.getElementById('settings-body');
const nav  = document.querySelector('.settings-panel__nav');

let activeSection = 'workspaces';

export function initSettings() {
  if (!nav.dataset.bound) {
    nav.dataset.bound = 'true';
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.settings-nav-item');
      if (!btn) return;
      nav.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('settings-nav-item--active'));
      btn.classList.add('settings-nav-item--active');
      activeSection = btn.dataset.section;
      loadSection(activeSection);
    });
  }
  loadSection(activeSection);
}

function loadSection(section) {
  body.textContent = ''; // safe clear
  const fn = { workspaces: renderWorkspaces, users: renderUsers, tokens: renderTokens, account: renderAccount, danger: renderDanger }[section];
  if (fn) fn();
}

// ── Shared helpers ────────────────────────────
function heading(text) {
  const h = document.createElement('h3');
  h.style.cssText = 'font-size:15px;font-weight:600;margin-bottom:16px;';
  h.textContent = text; // textContent — safe
  return h;
}

function settingsRow(labelText, control) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-soft);gap:12px;';
  const label = document.createElement('span');
  label.style.cssText = 'font-size:13px;flex:1;';
  label.textContent = labelText; // textContent — safe
  div.appendChild(label);
  if (control) div.appendChild(control);
  return div;
}

function btn(label, onClick, danger = false) {
  const b = document.createElement('button');
  b.className = 'btn btn--ghost btn--sm';
  if (danger) b.style.color = 'var(--red)';
  b.textContent = label; // textContent — safe
  b.addEventListener('click', onClick);
  return b;
}

function btnGroup(...buttons) {
  const g = document.createElement('div');
  g.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';
  buttons.forEach(b => g.appendChild(b));
  return g;
}

function notice(text) {
  const p = document.createElement('p');
  p.style.cssText = 'color:var(--text-3);font-size:13px;padding:16px 0;';
  p.textContent = text; // textContent — safe
  return p;
}

function addBtn(label, onClick) {
  const b = document.createElement('button');
  b.className = 'btn btn--ghost btn--sm';
  b.style.marginTop = '16px';
  b.textContent = label; // textContent — safe
  b.addEventListener('click', onClick);
  return b;
}

// ── Workspaces ────────────────────────────────
async function renderWorkspaces() {
  body.appendChild(heading('Workspaces'));
  try {
    const workspaces = await api.listWorkspaces();
    if (workspaces.length === 0) {
      body.appendChild(notice('No workspaces yet.'));
    } else {
      workspaces.forEach(ws => {
        body.appendChild(settingsRow(ws.name, btnGroup(
          btn('Rename', async () => {
            const name = window.prompt('New name:', ws.name);
            if (!name?.trim()) return;
            try {
              await api.updateWorkspace(ws.id, { name: name.trim() });
              toastSuccess('Workspace renamed');
              renderWorkspaces();
            } catch (err) { toastError(err.message); }
          }),
          btn('Delete', async () => {
            if (!window.confirm('Delete workspace "' + ws.name + '"? All content will be removed.')) return;
            try {
              await api.deleteWorkspace(ws.id);
              store.workspaces = store.workspaces.filter(w => w.id !== ws.id);
              toastSuccess('Workspace deleted');
              loadSection('workspaces');
            } catch (err) { toastError(err.message); }
          }, true),
        )));
      });
    }
    body.appendChild(addBtn('+ Add workspace', async () => {
      const name = window.prompt('Workspace name:');
      if (!name?.trim()) return;
      try {
        const ws = await api.createWorkspace({ name: name.trim(), icon: 'folder' });
        store.workspaces.push(ws);
        toastSuccess('Workspace created');
        loadSection('workspaces');
      } catch (err) { toastError(err.message); }
    }));
  } catch (_) {
    body.appendChild(notice('Could not load workspaces.'));
  }
}

// ── Users & Roles ─────────────────────────────
async function renderUsers() {
  body.appendChild(heading('Users & Roles'));
  if (store.user?.role !== 'admin') { body.appendChild(notice('Admin access required.')); return; }
  try {
    const users = await api.listUsers();
    const ROLES = ['admin', 'editor', 'viewer'];
    users.forEach(u => {
      const sel = document.createElement('select');
      sel.className = 'input';
      sel.style.cssText = 'width:100px;padding:4px 8px;font-size:12px;';
      ROLES.forEach(r => {
        const o = document.createElement('option');
        o.value = r;
        o.textContent = r; // textContent — safe
        if (r === u.role) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', async () => {
        try {
          await api.updateUser(u.id, { role: sel.value });
          toastSuccess((u.display_name || u.username) + ' updated to ' + sel.value);
        } catch (err) { toastError(err.message); sel.value = u.role; }
      });
      const controls = btnGroup(sel);
      if (u.id !== store.user?.id) {
        controls.appendChild(btn('Remove', async () => {
          if (!window.confirm('Remove user ' + u.username + '?')) return;
          try { await api.deleteUser(u.id); toastSuccess('User removed'); renderUsers(); }
          catch (err) { toastError(err.message); }
        }, true));
      }
      body.appendChild(settingsRow((u.display_name || u.username) + '  (' + u.username + ')', controls));
    });
  } catch (_) {
    body.appendChild(notice('Could not load users.'));
  }
}

// ── API Tokens ────────────────────────────────
async function renderTokens() {
  body.appendChild(heading('API Tokens'));
  if (store.user?.role !== 'admin') { body.appendChild(notice('Admin access required.')); return; }
  try {
    const tokens = await api.listTokens();
    if (tokens.length === 0) {
      body.appendChild(notice('No tokens yet. Create one for Claude sessions.'));
    } else {
      tokens.forEach(token => {
        const lastUsed = token.last_used_at
          ? new Date(token.last_used_at).toLocaleDateString('en-AU')
          : 'never';
        body.appendChild(settingsRow(
          token.label + '  ·  Last used: ' + lastUsed,
          btn('Revoke', async () => {
            if (!window.confirm('Revoke token "' + token.label + '"?')) return;
            try { await api.deleteToken(token.id); toastSuccess('Token revoked'); renderTokens(); }
            catch (err) { toastError(err.message); }
          }, true),
        ));
      });
    }
    body.appendChild(addBtn('+ Create token', async () => {
      const label = window.prompt('Token label (e.g. "Claude sessions"):');
      if (!label?.trim()) return;
      try {
        const result = await api.createToken({ label: label.trim() });
        // Token shown once — store in password manager
        window.alert('Token created. Copy it now — it will not be shown again:\n\n' + result.token);
        renderTokens();
      } catch (err) { toastError(err.message); }
    }));
  } catch (_) {
    body.appendChild(notice('Could not load tokens.'));
  }
}

// ── Account ───────────────────────────────────
function renderAccount() {
  body.appendChild(heading('Account'));

  const form = document.createElement('form');
  form.noValidate = true;

  function field(labelText, id, type, value, autocomplete) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.style.marginBottom = '14px';
    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.className = 'label';
    lbl.textContent = labelText; // textContent — safe
    const input = document.createElement('input');
    input.type  = type;
    input.id    = id;
    input.name  = id;
    input.className = 'input';
    if (value)       input.value = value;
    if (autocomplete) input.autocomplete = autocomplete;
    wrap.appendChild(lbl);
    wrap.appendChild(input);
    form.appendChild(wrap);
    return input;
  }

  field('Display name',   'acc-display',  'text',     store.user?.displayName || store.user?.display_name || '', 'name');
  field('New password',   'acc-password', 'password', '', 'new-password');
  field('Confirm password','acc-confirm', 'password', '', 'new-password');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn btn--primary btn--sm';
  saveBtn.textContent = 'Save changes'; // textContent — safe
  form.appendChild(saveBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = form.querySelector('#acc-display').value.trim();
    const password    = form.querySelector('#acc-password').value;
    const confirm     = form.querySelector('#acc-confirm').value;
    if (password && password !== confirm) { toastError('Passwords do not match'); return; }
    const payload = {};
    if (displayName) payload.displayName = displayName;
    if (password)    payload.password    = password;
    if (!Object.keys(payload).length) return;
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Saving…'; // textContent — safe
    try {
      await api.request('PATCH', '/api/admin/users/' + store.user.id, payload);
      if (displayName) {
        store.user.displayName = displayName;
        const avatarEl = document.getElementById('avatar-initials');
        if (avatarEl) {
          const { initials } = await import('./utils.js');
          avatarEl.textContent = initials(displayName); // textContent — safe
        }
      }
      toastSuccess('Account updated');
    } catch (err) { toastError(err.message); }
    finally {
      saveBtn.disabled    = false;
      saveBtn.textContent = 'Save changes'; // textContent — safe
    }
  });

  body.appendChild(form);
}

// ── Danger Zone ───────────────────────────────
function renderDanger() {
  body.appendChild(heading('Danger Zone'));
  const warn = document.createElement('p');
  warn.style.cssText = 'font-size:13px;color:var(--text-2);margin-bottom:20px;';
  warn.textContent = 'These actions are permanent.'; // textContent — safe
  body.appendChild(warn);

  body.appendChild(settingsRow('Sign out of all sessions',
    btn('Sign out everywhere', async () => {
      try { await api.logout(); } finally { window.location.reload(); }
    }, true),
  ));

  if (store.user?.role === 'admin') {
    body.appendChild(settingsRow('Export all data as JSON',
      btn('Export', async () => {
        try {
          const data = await api.request('GET', '/api/admin/export');
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = 'kb-export-' + new Date().toISOString().slice(0, 10) + '.json';
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) { toastError('Export failed: ' + err.message); }
      }),
    ));
  }
}
```

**Step 2: Verify**

Open Settings:
- [ ] Workspaces panel lists workspaces with Rename / Delete
- [ ] Creating a workspace adds it to the rail
- [ ] Users panel visible only to admin
- [ ] Role selector PATCHes user immediately on change
- [ ] API Tokens panel lists tokens; create shows plain token in alert once
- [ ] Account form updates display name and re-renders avatar initials
- [ ] Danger Zone: sign-out reloads; export downloads JSON file

---

## Summary — Phase 4 files created

| File | Action | Purpose |
|---|---|---|
| `public/js/utils.js` | Append | Add `setMarkdownContent` — DOMPurify + DOMParser rendering helper |
| `public/js/content.js` | Create | Page view: breadcrumb, title, badges, Markdown body, asset panel |
| `public/js/editor.js` | Create | Editor overlay: live preview, auto-save, publish |
| `public/js/search.js` | Create | Search results: debounced, staggered, filter by type |
| `public/js/map.js` | Create | Relationship map: filterable table view |
| `public/js/settings.js` | Create | Settings overlay: workspaces, users, tokens, account, danger |

## Phase 5 preview — what comes next

Phase 5 covers deployment:

| Task | File | Purpose |
|---|---|---|
| 25 | `Dockerfile` | Node 20 Alpine, non-root user, static file serving, health check |
| 26 | `docker-compose.yml` | Local dev with env vars and DB connection |
| 27 | `.github/workflows/deploy.yml` | Build → push GHCR → Watchtower auto-pulls on NAS |
| 28 | `.env.example` | All required env vars documented |
| 29 | `package.json` updates | Add multer, update scripts: migrate, seed, test |
