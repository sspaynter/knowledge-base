// store.js — Central application state. Import this from any module.

// Resolve initial theme: persisted preference → system preference → dark
const _systemTheme = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

export const store = {
  user:             null,  // { id, username, display_name, role } | null
  workspaces:       [],    // array from /api/workspaces
  currentWorkspace: null,  // workspace object | null
  currentSection:   null,  // section object | null
  currentPage:      null,  // full page object (with assets) | null
  sidebarState:     {},    // { [sectionId]: boolean } — true = expanded
  theme:            localStorage.getItem('kb-theme') || _systemTheme,
  searchQuery:      '',
  searchResults:    [],
  searchFilter:     'all', // 'all' | 'pages' | 'assets'
  showDrafts:       false, // show draft pages in sidebar
  showArchived:     false, // show archived pages in sidebar
};

// Restore persisted sidebar state
try {
  const saved = localStorage.getItem('kb-sidebar-state');
  if (saved) store.sidebarState = JSON.parse(saved);
} catch (_) { /* ignore */ }

/** Persist sidebar collapse state */
export function saveSidebarState() {
  localStorage.setItem('kb-sidebar-state', JSON.stringify(store.sidebarState));
}

/** Apply theme to document root and persist to localStorage */
export function applyTheme(theme) {
  store.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('kb-theme', theme);
}

/** Toggle between dark and light */
export function toggleTheme() {
  applyTheme(store.theme === 'dark' ? 'light' : 'dark');
}

// Apply persisted theme immediately on import (before first paint)
document.documentElement.setAttribute('data-theme', store.theme);
