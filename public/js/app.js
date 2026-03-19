// app.js — Application entry point.
// Boot sequence: check session → render nav → bind top bar → start routing.

import * as api  from './api.js';
import { store, applyTheme, toggleTheme, saveSidebarState } from './store.js';
import { showAuthOverlay, hideAuthOverlay } from './auth.js';
import { toastError }  from './toast.js';
import { initials }    from './utils.js';

// ── Static app rail config ─────────────────────
// Core SS42 hub apps — top section of the rail.
const CORE_APPS = [
  { id: 'kb',   label: 'Knowledge Base', icon: 'book-open',    url: null,                      active: true  },
  { id: 'todo', label: 'To Do',          icon: 'check-square', url: 'https://todo.ss-42.com',  active: false },
];

// Built apps — apps created for specific capabilities, shown below the divider.
const BUILT_APPS = [
  { id: 'applyr', label: 'Applyr', icon: 'briefcase', url: 'https://jobs.ss-42.com', active: false },
];

// ── Boot ──────────────────────────────────────
async function boot() {
  applyTheme(store.theme); // Apply persisted theme before any render
  try {
    store.user = await api.getMe();
    api.setAuthenticated(true);
    hideAuthOverlay();
    await initApp();
  } catch (_) {
    showAuthOverlay();
  }
}

async function initApp() {
  renderAvatar();
  await setHqLink();
  await loadWorkspaces();
  bindTopBar();
  bindShortcuts();
  bindDrawer();
  bindWorkspaceStrip();
  window.lucide.createIcons();
}

// ── Avatar ────────────────────────────────────
function renderAvatar() {
  const el = document.getElementById('avatar-initials');
  if (el && store.user) {
    el.textContent = initials(store.user.display_name || store.user.username);
  }
}

// ── HQ link ───────────────────────────────────
async function setHqLink() {
  try {
    const settings = await api.getSettings();
    const hqSetting = settings.find && settings.find(s => s.key === 'hq_url');
    const hqUrl = hqSetting?.value;
    if (hqUrl) {
      document.getElementById('hq-link').href = hqUrl;
    }
  } catch (_) { /* non-critical — HQ URL is optional */ }
}

// ── App rail (static SS42 app switcher) ────────
function renderAppRail() {
  const rail = document.getElementById('app-rail');
  if (!rail) return;
  rail.textContent = '';

  // Core SS42 hub apps (top)
  CORE_APPS.forEach(app => rail.appendChild(makeRailItem(app)));

  // Divider between core and built apps
  const divider = document.createElement('li');
  divider.className = 'rail__divider';
  divider.setAttribute('role', 'separator');
  divider.setAttribute('aria-hidden', 'true');
  rail.appendChild(divider);

  // Built/add-on apps (bottom)
  BUILT_APPS.forEach(app => rail.appendChild(makeRailItem(app)));

  // Version label (bottom of rail)
  fetchVersion().then(v => {
    if (!v) return;
    const ver = document.createElement('li');
    ver.className = 'rail__version';
    ver.setAttribute('aria-hidden', 'true');
    ver.textContent = `v${v}`;
    rail.appendChild(ver);
  });

  window.lucide.createIcons();
}

async function fetchVersion() {
  try {
    const res = await fetch('/api/version');
    if (!res.ok) return null;
    const data = await res.json();
    return data.version || null;
  } catch { return null; }
}

function makeRailItem(app) {
  const li = document.createElement('li');
  li.className = 'rail__item' + (app.active ? ' rail__item--active' : '');
  li.setAttribute('role', 'listitem');
  li.title = app.label;

  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', app.icon);
  icon.setAttribute('aria-hidden', 'true');

  const tooltip = document.createElement('span');
  tooltip.className = 'rail__tooltip';
  tooltip.textContent = app.label;

  li.appendChild(icon);
  li.appendChild(tooltip);

  if (app.url && app.url !== '#') {
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => { window.location.href = app.url; });
  } else if (!app.active) {
    li.style.cursor = 'default';
    li.style.opacity = '0.5';
  }

  return li;
}

// ── Workspaces ────────────────────────────────
async function loadWorkspaces() {
  try {
    store.workspaces = await api.listWorkspaces();
    renderAppRail();
    renderWorkspaceStrip();
    populateWorkspaceSelect();
    if (store.workspaces.length > 0) {
      await selectWorkspace(store.workspaces[0]);
    }
  } catch (_) {
    toastError('Could not load workspaces');
  }
}

function renderWorkspaceStrip() {
  const list = document.getElementById('workspace-strip-list');
  if (!list) return;
  list.textContent = '';

  store.workspaces.forEach(ws => {
    const li = document.createElement('li');
    li.className = 'workspace-strip__item' +
      (store.currentWorkspace?.id === ws.id ? ' workspace-strip__item--active' : '');
    li.dataset.id = ws.id;
    li.setAttribute('role', 'listitem');
    li.title = ws.name;

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', ws.icon || 'folder');
    icon.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'workspace-strip__item-label';
    label.textContent = ws.name;

    li.appendChild(icon);
    li.appendChild(label);
    li.addEventListener('click', () => selectWorkspace(ws));
    list.appendChild(li);
  });

  window.lucide.createIcons();
}

/** Populate the sidebar workspace <select> (used on tablet/mobile) */
function populateWorkspaceSelect() {
  const sel = document.getElementById('sidebar-workspace-select');
  if (!sel) return;
  sel.textContent = '';
  store.workspaces.forEach(ws => {
    const opt = document.createElement('option');
    opt.value = ws.id;
    opt.textContent = ws.name;
    if (store.currentWorkspace?.id === ws.id) opt.selected = true;
    sel.appendChild(opt);
  });
}

async function selectWorkspace(ws) {
  store.currentWorkspace = ws;
  store.currentSection   = null;
  store.currentPage      = null;
  renderWorkspaceStrip();

  // Keep select in sync
  const sel = document.getElementById('sidebar-workspace-select');
  if (sel) sel.value = ws.id;

  const label = document.getElementById('sidebar-workspace-label');
  if (label) label.textContent = ws.name;

  await loadSections(ws.id);
}

// ── Sections ──────────────────────────────────
async function loadSections(workspaceId) {
  const list = document.getElementById('section-list');
  list.textContent = '';
  try {
    const sections = await api.listSections(workspaceId);
    renderSections(sections);
  } catch (_) {
    toastError('Could not load sections');
  }
}

function renderSections(sections) {
  const list = document.getElementById('section-list');
  list.textContent = '';

  sections.forEach(section => {
    const isExpanded = store.sidebarState[section.id] !== false; // default open

    const headerLi = document.createElement('li');
    const header   = document.createElement('div');
    header.className = 'section-header' + (isExpanded ? '' : ' section-header--collapsed');

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', section.icon || 'folder');
    icon.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.textContent = section.name;

    const chevron = document.createElement('i');
    chevron.setAttribute('data-lucide', 'chevron-down');
    chevron.className = 'section-header__chevron';
    chevron.setAttribute('aria-hidden', 'true');

    header.appendChild(icon);
    header.appendChild(name);
    header.appendChild(chevron);
    headerLi.appendChild(header);
    list.appendChild(headerLi);

    const pagesLi = document.createElement('li');
    pagesLi.id = `pages-${section.id}`;
    pagesLi.hidden = !isExpanded;
    list.appendChild(pagesLi);

    header.addEventListener('click', () => {
      const nowExpanded = pagesLi.hidden;
      pagesLi.hidden = !nowExpanded;
      header.classList.toggle('section-header--collapsed', !nowExpanded);
      store.sidebarState[section.id] = nowExpanded;
      saveSidebarState();
      if (nowExpanded) {
        // Set current section when user expands it
        store.currentSection = section;
        if (!pagesLi.dataset.loaded) {
          loadPages(section.id, pagesLi);
        }
      }
    });

    if (isExpanded) {
      loadPages(section.id, pagesLi);
    }
  });

  window.lucide.createIcons();
}

// ── Pages ─────────────────────────────────────
async function loadPages(sectionId, container) {
  container.dataset.loaded = 'true';
  try {
    const pages = await api.listPages(sectionId);
    renderPageTree(pages, container);
  } catch (_) { /* empty sections are fine */ }
}

function renderPageTree(pages, container, parentId = null, depth = 0) {
  pages
    .filter(p => (p.parent_id ?? null) === parentId)
    .forEach(page => {
      const status     = page.status || 'published';
      const isArchived = status === 'archived';
      const isDraft    = status === 'draft';
      const isHidden   = (isArchived && !store.showArchived) || (isDraft && !store.showDrafts);

      const li   = document.createElement('li');
      const item = document.createElement('div');
      item.className  = 'page-item'
        + (store.currentPage?.id === page.id ? ' page-item--active' : '')
        + (isDraft    ? ' page-item--draft'    : '')
        + (isArchived ? ' page-item--archived' : '');
      item.dataset.id     = page.id;
      item.dataset.depth  = depth;
      item.dataset.status = status;
      if (isHidden) item.hidden = true;

      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', isArchived ? 'archive' : isDraft ? 'file-pen' : 'file-text');
      icon.setAttribute('aria-hidden', 'true');

      const title = document.createElement('span');
      title.textContent = page.title;

      item.appendChild(icon);
      item.appendChild(title);
      item.addEventListener('click', (e) => {
        if (e.defaultPrevented) return; // Skip if drag just finished
        selectPage(page);
      });

      // Drag-to-reorder for editors
      if (store.user?.role === 'editor' || store.user?.role === 'admin') {
        item.draggable = true;
        attachDragHandlers(item, container);
      }

      li.appendChild(item);
      container.appendChild(li);

      renderPageTree(pages, container, page.id, depth + 1);
    });

  window.lucide.createIcons();
}

// ── Drag-to-reorder ──────────────────────────
let _dragSrc = null;

function attachDragHandlers(item, container) {
  item.addEventListener('dragstart', (e) => {
    _dragSrc = item;
    item.classList.add('page-item--dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.id);
  });

  item.addEventListener('dragend', () => {
    if (_dragSrc) _dragSrc.classList.remove('page-item--dragging');
    container.querySelectorAll('.page-drop-indicator').forEach(el => el.remove());
    container.querySelectorAll('.page-item--drag-over').forEach(el => {
      el.classList.remove('page-item--drag-over');
    });
    _dragSrc = null;
  });

  item.addEventListener('dragover', (e) => {
    if (!_dragSrc || _dragSrc === item) return;
    if (_dragSrc.dataset.depth !== item.dataset.depth) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Clear previous indicators
    container.querySelectorAll('.page-drop-indicator').forEach(el => el.remove());
    container.querySelectorAll('.page-item--drag-over').forEach(el => {
      el.classList.remove('page-item--drag-over');
    });

    // Show drop indicator above or below based on cursor position
    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const indicator = document.createElement('div');
    indicator.className = 'page-drop-indicator';

    const li = item.closest('li');
    if (e.clientY < midY) {
      li.before(indicator);
    } else {
      li.after(indicator);
    }
    item.classList.add('page-item--drag-over');
  });

  item.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!_dragSrc || _dragSrc === item) return;
    if (_dragSrc.dataset.depth !== item.dataset.depth) return;

    // Clean up
    container.querySelectorAll('.page-drop-indicator').forEach(el => el.remove());
    item.classList.remove('page-item--drag-over');

    // Determine insert position
    const rect = item.getBoundingClientRect();
    const insertBefore = e.clientY < (rect.top + rect.height / 2);

    // DOM reorder
    const srcLi = _dragSrc.closest('li');
    const tgtLi = item.closest('li');
    if (insertBefore) {
      tgtLi.before(srcLi);
    } else {
      tgtLi.after(srcLi);
    }

    await commitReorder(container, Number(_dragSrc.dataset.depth));
  });
}

async function commitReorder(container, depth) {
  const depthItems = Array.from(
    container.querySelectorAll(`.page-item[data-depth="${depth}"]`)
  );
  const items = depthItems.map((el, i) => ({
    id: Number(el.dataset.id),
    sort_order: (i + 1) * 10,
  }));

  try {
    await api.reorderPages(items);
  } catch (_) {
    toastError('Could not save page order');
    // Reload section from server
    const sectionContainer = container.closest('[id^="pages-"]') || container;
    const sectionId = (sectionContainer.id || '').replace('pages-', '');
    if (sectionId) {
      sectionContainer.textContent = '';
      sectionContainer.dataset.loaded = 'false';
      loadPages(sectionId, sectionContainer);
    }
  }
}

/** Re-apply status filter visibility to all currently-rendered page items. */
function applyStatusFilter() {
  document.querySelectorAll('.page-item[data-status]').forEach(el => {
    const status     = el.dataset.status;
    const isArchived = status === 'archived';
    const isDraft    = status === 'draft';
    el.hidden = (isArchived && !store.showArchived) || (isDraft && !store.showDrafts);
  });
}

export async function selectPage(page) {
  store.currentPage = page;
  document.querySelectorAll('.page-item').forEach(el => {
    el.classList.toggle('page-item--active', el.dataset.id == page.id);
  });

  // Update mobile topbar page title
  const topbarTitle = document.getElementById('topbar-page-title');
  if (topbarTitle) topbarTitle.textContent = page.title;

  // Close drawer on mobile after page selection
  closeSidebar();

  try {
    const full = await api.getPage(page.id);
    store.currentPage = full;
    const { renderPage } = await import('./content.js');
    renderPage(full);
  } catch (_) {
    toastError('Could not load page');
  }
}

// ── Sidebar drawer (tablet + mobile) ──────────
function openSidebar() {
  const sidebar   = document.querySelector('.sidebar');
  const backdrop  = document.getElementById('drawer-backdrop');
  const toggleBtn = document.getElementById('nav-toggle-btn');
  sidebar?.classList.add('sidebar--open');
  backdrop?.classList.add('drawer-backdrop--visible');
  toggleBtn?.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  const sidebar   = document.querySelector('.sidebar');
  const backdrop  = document.getElementById('drawer-backdrop');
  const toggleBtn = document.getElementById('nav-toggle-btn');
  sidebar?.classList.remove('sidebar--open');
  backdrop?.classList.remove('drawer-backdrop--visible');
  toggleBtn?.setAttribute('aria-expanded', 'false');
}

function bindDrawer() {
  document.getElementById('nav-toggle-btn')?.addEventListener('click', () => {
    const isOpen = document.querySelector('.sidebar')?.classList.contains('sidebar--open');
    isOpen ? closeSidebar() : openSidebar();
  });

  document.getElementById('drawer-backdrop')?.addEventListener('click', closeSidebar);
}

// ── Workspace strip collapse ───────────────────
function bindWorkspaceStrip() {
  const collapseBtn = document.getElementById('workspace-strip-collapse');
  const strip       = document.getElementById('workspace-strip');
  if (!collapseBtn || !strip) return;

  // Restore persisted collapse state
  const collapsed = localStorage.getItem('kb-workspace-strip-collapsed') === 'true';
  if (collapsed) {
    strip.classList.add('workspace-strip--collapsed');
    collapseBtn.setAttribute('aria-expanded', 'false');
  }

  collapseBtn.addEventListener('click', () => {
    const isCollapsed = strip.classList.toggle('workspace-strip--collapsed');
    collapseBtn.setAttribute('aria-expanded', String(!isCollapsed));
    localStorage.setItem('kb-workspace-strip-collapsed', String(isCollapsed));
  });

  // Workspace select on tablet/mobile
  document.getElementById('sidebar-workspace-select')?.addEventListener('change', async (e) => {
    const ws = store.workspaces.find(w => w.id == e.target.value);
    if (ws) await selectWorkspace(ws);
  });
}

// ── Top bar ───────────────────────────────────
function bindTopBar() {
  // Theme toggle
  const themeBtn  = document.getElementById('theme-btn');
  const themeIcon = document.getElementById('theme-icon');
  themeBtn?.addEventListener('click', async () => {
    toggleTheme();
    themeIcon?.setAttribute('data-lucide', store.theme === 'dark' ? 'moon' : 'sun');
    window.lucide.createIcons();
    // Re-render Mermaid diagrams with updated theme
    const { reinitMermaid } = await import('./mermaid-init.js');
    reinitMermaid(store.theme);
  });
  themeIcon?.setAttribute('data-lucide', store.theme === 'dark' ? 'moon' : 'sun');

  // Settings
  const settingsBtn     = document.getElementById('settings-btn');
  const settingsClose   = document.getElementById('settings-close');
  const settingsOverlay = document.getElementById('settings-overlay');
  settingsBtn?.addEventListener('click', async () => {
    settingsOverlay.hidden = false;
    const { initSettings } = await import('./settings.js');
    initSettings();
  });
  settingsClose?.addEventListener('click', () => { settingsOverlay.hidden = true; });

  // Map view
  document.getElementById('map-btn')?.addEventListener('click', async () => {
    const { renderMapView } = await import('./map.js');
    renderMapView();
  });

  // Asset browser
  document.getElementById('assets-btn')?.addEventListener('click', async () => {
    const { renderAssetBrowser } = await import('./assets-browser.js');
    renderAssetBrowser();
  });

  // Status filter toggles
  document.getElementById('filter-drafts-btn')?.addEventListener('click', (e) => {
    store.showDrafts = !store.showDrafts;
    e.currentTarget.setAttribute('aria-pressed', String(store.showDrafts));
    e.currentTarget.classList.toggle('status-filter-btn--active', store.showDrafts);
    applyStatusFilter();
  });
  document.getElementById('filter-archived-btn')?.addEventListener('click', (e) => {
    store.showArchived = !store.showArchived;
    e.currentTarget.setAttribute('aria-pressed', String(store.showArchived));
    e.currentTarget.classList.toggle('status-filter-btn--active', store.showArchived);
    applyStatusFilter();
  });

  // Search
  document.getElementById('search-trigger')?.addEventListener('click', openSearch);
  document.getElementById('search-close')?.addEventListener('click', closeSearch);

  // Add workspace
  document.getElementById('add-workspace-btn')?.addEventListener('click', promptAddWorkspace);

  // Search input (lazy-load search module)
  document.getElementById('search-input')?.addEventListener('input', async (e) => {
    store.searchQuery = e.target.value;
    const { handleSearch } = await import('./search.js');
    handleSearch(store.searchQuery);
  });

  // Filter chips
  document.getElementById('search-filters')?.addEventListener('click', async (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('filter-chip--active'));
    chip.classList.add('filter-chip--active');
    store.searchFilter = chip.dataset.filter;
    const { handleSearch } = await import('./search.js');
    handleSearch(store.searchQuery);
  });
}

// ── Search ────────────────────────────────────
function openSearch() {
  document.getElementById('search-overlay').hidden = false;
  setTimeout(() => document.getElementById('search-input')?.focus(), 50);
}

function closeSearch() {
  document.getElementById('search-overlay').hidden = true;
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  const results = document.getElementById('search-results');
  if (results) results.textContent = '';
  store.searchQuery = '';
}

// ── Keyboard shortcuts ────────────────────────
function bindShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') {
      closeSearch();
      closeSidebar();
      document.getElementById('settings-overlay').hidden = true;
      document.getElementById('editor-overlay').hidden   = true;
    }
  });
}

// ── Add workspace (v1: simple prompt) ────────
async function promptAddWorkspace() {
  const name = window.prompt('Workspace name:');
  if (!name?.trim()) return;
  try {
    const ws = await api.createWorkspace({ name: name.trim(), icon: 'folder' });
    store.workspaces.push(ws);
    renderWorkspaceStrip();
    populateWorkspaceSelect();
  } catch (_) {
    toastError('Could not create workspace');
  }
}

// ── Auth event listener ───────────────────────
window.addEventListener('kb:authed', () => initApp());

// ── Service worker registration ───────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* non-critical */ });
}

// ── Start ─────────────────────────────────────
boot();
