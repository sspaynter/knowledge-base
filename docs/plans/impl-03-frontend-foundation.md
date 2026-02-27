# Knowledge Platform — Implementation Plan
# Phase 3: Frontend Foundation — HTML Shell, CSS Design System, Core JS Modules

**Goal:** Replace the v0.1 frontend with a complete three-column shell, the full design system as CSS custom properties, and the core JavaScript modules needed for boot, navigation, and state.

**Architecture:** Vanilla JS ES6 modules. No bundler. All modules loaded via `<script type="module">`. `store.js` holds central state. `api.js` wraps all backend calls. `app.js` boots the app and owns navigation. All DOM building uses `createElement` and `textContent`; `marked + DOMPurify` (loaded as globals) for markdown content.

**Tech Stack:** HTML5, CSS3 (custom properties), Vanilla JS ES6 modules, Google Fonts (CDN), Lucide (UMD CDN), marked + DOMPurify (UMD CDN).

**Dependencies:** Phase 1 (schema) and Phase 2 (API routes) complete.

**Task numbering continues from Phase 2 (Tasks 7–15).**

---

## Task 16: Rewrite `public/index.html`

**Files:**
- Replace: `public/index.html`

**What this builds:**
The complete HTML shell. Three-column layout with top bar. All overlays (auth, search, settings, editor) included as hidden elements. No inline JS — all behaviour lives in ES modules. CDN scripts loaded synchronously before the module.

**Step 1: Write the file**

Replace `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Knowledge Base</title>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <!-- Icons (Lucide UMD — exposes window.lucide) -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

  <!-- Markdown + sanitizer (UMD — exposes window.marked and window.DOMPurify) -->
  <script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>

  <link rel="stylesheet" href="/css/styles.css" />
</head>
<body>

  <!-- AUTH OVERLAY — shown until session confirmed -->
  <div id="auth-overlay" class="overlay overlay--fullscreen" hidden>
    <div class="auth-card" id="auth-card">
      <div class="auth-logo">
        <svg viewBox="0 0 40 40" class="logo-mark" aria-hidden="true">
          <text x="2" y="30" font-family="DM Sans,sans-serif" font-size="28"
                font-weight="600" fill="currentColor">42</text>
        </svg>
        <span class="auth-title">Knowledge Base</span>
      </div>

      <form id="login-form" class="auth-form" novalidate>
        <h2 class="auth-heading">Sign in</h2>
        <div class="field">
          <label for="login-username" class="label">Username</label>
          <input id="login-username" name="username" type="text"
                 class="input" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="login-password" class="label">Password</label>
          <input id="login-password" name="password" type="password"
                 class="input" autocomplete="current-password" required />
        </div>
        <p id="login-error" class="auth-error" hidden></p>
        <button type="submit" class="btn btn--primary btn--full">Sign in</button>
        <p class="auth-switch">No account?
          <button type="button" class="link-btn" data-action="show-register">Register</button>
        </p>
      </form>

      <form id="register-form" class="auth-form" hidden novalidate>
        <h2 class="auth-heading">Create account</h2>
        <div class="field">
          <label for="reg-display" class="label">Display name</label>
          <input id="reg-display" name="displayName" type="text" class="input" required />
        </div>
        <div class="field">
          <label for="reg-username" class="label">Username</label>
          <input id="reg-username" name="username" type="text"
                 class="input" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="reg-password" class="label">Password</label>
          <input id="reg-password" name="password" type="password"
                 class="input" autocomplete="new-password" required />
        </div>
        <p id="register-error" class="auth-error" hidden></p>
        <button type="submit" class="btn btn--primary btn--full">Create account</button>
        <p class="auth-switch">Have an account?
          <button type="button" class="link-btn" data-action="show-login">Sign in</button>
        </p>
      </form>
    </div>
  </div>

  <!-- MAIN APP — hidden until auth confirmed -->
  <div id="app" hidden>

    <!-- TOP BAR -->
    <header class="topbar" role="banner">
      <div class="topbar__left">
        <a href="#" id="hq-link" class="hq-link" title="SS42 HQ" aria-label="SS42 HQ">
          <svg viewBox="0 0 40 40" class="logo-mark" aria-hidden="true">
            <text x="2" y="30" font-family="DM Sans,sans-serif" font-size="28"
                  font-weight="600" fill="currentColor">42</text>
          </svg>
        </a>
        <span class="topbar__app-label">Knowledge Base</span>
      </div>
      <div class="topbar__centre">
        <button class="search-trigger" id="search-trigger"
                aria-label="Search (Cmd+K)" aria-keyshortcuts="Meta+K">
          <i data-lucide="search" aria-hidden="true"></i>
          <span class="search-trigger__label">Search…</span>
          <kbd class="search-trigger__kbd">⌘K</kbd>
        </button>
      </div>
      <div class="topbar__right">
        <button class="icon-btn" id="map-btn" title="Map view" aria-label="Map view">
          <i data-lucide="network" aria-hidden="true"></i>
        </button>
        <button class="icon-btn" id="settings-btn" title="Settings" aria-label="Settings">
          <i data-lucide="settings" aria-hidden="true"></i>
        </button>
        <button class="icon-btn" id="theme-btn" title="Toggle theme" aria-label="Toggle theme">
          <i data-lucide="moon" aria-hidden="true" id="theme-icon"></i>
        </button>
        <button class="avatar-btn" id="avatar-btn" aria-label="User menu">
          <span id="avatar-initials" class="avatar">?</span>
        </button>
      </div>
    </header>

    <!-- BODY -->
    <div class="body-layout">

      <!-- WORKSPACE RAIL (54px) -->
      <nav class="rail" role="navigation" aria-label="Workspaces">
        <ul class="rail__list" id="workspace-rail" role="list"></ul>
        <div class="rail__footer">
          <button class="rail__add-btn" id="add-workspace-btn"
                  title="Add workspace" aria-label="Add workspace">
            <i data-lucide="plus" aria-hidden="true"></i>
          </button>
        </div>
      </nav>

      <!-- SECTION SIDEBAR (244px) -->
      <aside class="sidebar" role="complementary" aria-label="Sections and pages">
        <div class="sidebar__header">
          <span class="sidebar__workspace-label" id="sidebar-workspace-label"></span>
        </div>
        <nav class="sidebar__nav">
          <ul class="section-list" id="section-list" role="list"></ul>
        </nav>
        <div class="sidebar__footer">
          <button class="sidebar__add-btn" id="add-section-btn"
                  title="Add section" aria-label="Add section">
            <i data-lucide="plus" aria-hidden="true"></i>
            <span>Add section</span>
          </button>
        </div>
      </aside>

      <!-- CONTENT PANE (flex) -->
      <main class="content-pane" id="content-pane" role="main">
        <div class="content-placeholder" id="content-placeholder">
          <i data-lucide="book-open" aria-hidden="true"></i>
          <p>Select a page to get started</p>
        </div>
      </main>

    </div><!-- /body-layout -->
  </div><!-- /app -->

  <!-- SEARCH OVERLAY -->
  <div id="search-overlay" class="overlay overlay--search" hidden
       role="dialog" aria-modal="true" aria-label="Search">
    <div class="search-modal">
      <div class="search-modal__input-wrap">
        <i data-lucide="search" class="search-modal__icon" aria-hidden="true"></i>
        <input type="text" id="search-input" class="search-modal__input"
               placeholder="Search pages and assets…" autocomplete="off"
               aria-label="Search" aria-controls="search-results" />
        <button class="search-modal__close" id="search-close" aria-label="Close search">
          <kbd>Esc</kbd>
        </button>
      </div>
      <div class="search-modal__filters" id="search-filters">
        <button class="filter-chip filter-chip--active" data-filter="all">All</button>
        <button class="filter-chip" data-filter="pages">Pages</button>
        <button class="filter-chip" data-filter="assets">Assets</button>
      </div>
      <ul class="search-results" id="search-results" role="listbox"
          aria-label="Search results"></ul>
      <p class="search-empty" id="search-empty" hidden>No results found</p>
    </div>
  </div>

  <!-- SETTINGS OVERLAY -->
  <div id="settings-overlay" class="overlay overlay--panel" hidden
       role="dialog" aria-modal="true" aria-label="Settings">
    <div class="settings-panel">
      <div class="settings-panel__header">
        <h2 class="settings-panel__title">Settings</h2>
        <button class="icon-btn" id="settings-close" aria-label="Close settings">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="settings-panel__layout">
        <nav class="settings-panel__nav">
          <button class="settings-nav-item settings-nav-item--active"
                  data-section="workspaces">Workspaces</button>
          <button class="settings-nav-item" data-section="users">Users &amp; Roles</button>
          <button class="settings-nav-item" data-section="tokens">API Tokens</button>
          <button class="settings-nav-item" data-section="account">Account</button>
          <button class="settings-nav-item settings-nav-item--danger"
                  data-section="danger">Danger Zone</button>
        </nav>
        <div class="settings-panel__body" id="settings-body">
          <!-- Populated by settings.js (Phase 4) -->
        </div>
      </div>
    </div>
  </div>

  <!-- EDITOR OVERLAY -->
  <div id="editor-overlay" class="overlay overlay--editor" hidden
       role="dialog" aria-modal="true" aria-label="Page editor">
    <div class="editor-modal">
      <div class="editor-modal__header">
        <input type="text" id="editor-title" class="editor-title-input"
               placeholder="Page title" aria-label="Page title" />
        <div class="editor-modal__actions">
          <button class="btn btn--ghost" id="editor-discard">Discard</button>
          <button class="btn btn--primary" id="editor-save">Save</button>
        </div>
      </div>
      <div class="editor-modal__body">
        <div class="editor-split">
          <textarea id="editor-textarea" class="editor-textarea"
                    placeholder="Write in Markdown…"
                    aria-label="Page content editor"
                    spellcheck="true"></textarea>
          <div class="editor-preview" id="editor-preview"
               aria-label="Preview" aria-live="polite"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- TOAST CONTAINER -->
  <div class="toast-container" id="toast-container"
       role="status" aria-live="polite" aria-atomic="true"></div>

  <!-- App entry point -->
  <script type="module" src="/js/app.js"></script>

</body>
</html>
```

**Step 2: Verify**

Open in browser. Expected: black page (dark theme from `data-theme="dark"`). No JS errors from the HTML itself. Lucide, marked, and DOMPurify globals should all be defined in DevTools console before the module loads.

---

## Task 17: Rewrite `public/css/styles.css`

**Files:**
- Replace: `public/css/styles.css`

**What this builds:**
Full design system as a single CSS file. Design tokens via custom properties on `:root` (dark) and `[data-theme="light"]`. Three-column layout. All component styles. Animations.

**Step 1: Write the file**

Replace `public/css/styles.css`:

```css
/* ═══════════════════════════════════════════
   KNOWLEDGE PLATFORM — Design System v1
   ═══════════════════════════════════════════ */

/* ── 1. DESIGN TOKENS ─────────────────────── */
:root {
  /* Dark theme (default) */
  --base:        #0d0d11;
  --surface:     #13131a;
  --surface-2:   #18181f;
  --elevated:    #1e1e28;
  --border:      #28283a;
  --border-soft: #1c1c26;
  --text-1:      #f0ede8;
  --text-2:      #8c8ca0;
  --text-3:      #52526a;
  --accent:      #2dd4bf;
  --accent-bg:   rgba(45,212,191,0.09);
  --accent-hover:rgba(45,212,191,0.14);

  /* Status */
  --green:  #4ade80;
  --amber:  #fbbf24;
  --red:    #f87171;
  --purple: #c084fc;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.6);

  /* Layout */
  --topbar-h:  50px;
  --rail-w:    54px;
  --sidebar-w: 244px;

  /* Radii */
  --r-xs:   4px;
  --r-sm:   6px;
  --r-md:   8px;
  --r-lg:   10px;
  --r-xl:   12px;
  --r-pill: 20px;
  --r-full: 22px;

  /* Transitions */
  --t-fast: 120ms ease;
  --t-base: 180ms ease;
  --t-slow: 220ms ease;
}

[data-theme="light"] {
  --base:        #f5f5f7;
  --surface:     #ffffff;
  --surface-2:   #f0f0f5;
  --elevated:    #e8e8f0;
  --border:      #d4d4de;
  --border-soft: #e4e4ec;
  --text-1:      #111118;
  --text-2:      #6a6a80;
  --text-3:      #a0a0b8;
  --accent:      #0d9488;
  --accent-bg:   rgba(13,148,136,0.08);
  --accent-hover:rgba(13,148,136,0.13);
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.1);
  --shadow-md:   0 4px 16px rgba(0,0,0,0.12);
  --shadow-lg:   0 12px 40px rgba(0,0,0,0.16);
}

/* ── 2. RESET & BASE ──────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; overflow: hidden; }

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 14px;
  background: var(--base);
  color: var(--text-1);
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
button { cursor: pointer; font-family: inherit; font-size: inherit; border: none; background: none; color: inherit; }
input, textarea, select { font-family: inherit; font-size: inherit; color: inherit; }
ul, ol { list-style: none; }
i[data-lucide] { display: inline-flex; width: 16px; height: 16px; }

/* ── 3. LAYOUT ────────────────────────────── */
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--topbar-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border-soft);
  display: flex;
  align-items: center;
  padding: 0 12px 0 0;
  gap: 8px;
  z-index: 100;
}

.body-layout {
  display: flex;
  height: 100vh;
  padding-top: var(--topbar-h);
  overflow: hidden;
}

/* ── 4. WORKSPACE RAIL ────────────────────── */
.rail {
  width: var(--rail-w);
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 10;
}

.rail__list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  width: 100%;
  padding: 0 7px;
}

.rail__item {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-lg);
  color: var(--text-2);
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast);
}
.rail__item:hover { background: var(--surface-2); color: var(--text-1); }
.rail__item--active {
  color: var(--accent);
  background: var(--accent-bg);
}
.rail__item--active::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}

.rail__tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--elevated);
  border: 1px solid var(--border);
  color: var(--text-1);
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: var(--r-md);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--t-fast);
  z-index: 200;
}
.rail__item:hover .rail__tooltip { opacity: 1; }

.rail__footer { padding: 8px 0; }
.rail__add-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--r-md);
  color: var(--text-3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t-fast), color var(--t-fast);
}
.rail__add-btn:hover { background: var(--surface-2); color: var(--text-1); }

/* ── 5. SECTION SIDEBAR ───────────────────── */
.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar__header {
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--border-soft);
  min-height: 40px;
  display: flex;
  align-items: center;
}

.sidebar__workspace-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'JetBrains Mono', monospace;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar__footer {
  padding: 8px 8px 12px;
  border-top: 1px solid var(--border-soft);
}

.sidebar__add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--r-md);
  color: var(--text-3);
  font-size: 13px;
  width: 100%;
  transition: background var(--t-fast), color var(--t-fast);
}
.sidebar__add-btn:hover { background: var(--surface-2); color: var(--text-1); }

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: var(--r-md);
  margin: 0 4px;
  cursor: pointer;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  transition: background var(--t-fast), color var(--t-fast);
  user-select: none;
}
.section-header:hover { background: var(--surface-2); color: var(--text-1); }
.section-header__chevron { margin-left: auto; transition: transform var(--t-base); }
.section-header--collapsed .section-header__chevron { transform: rotate(-90deg); }

.page-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--r-md);
  margin: 1px 4px;
  cursor: pointer;
  color: var(--text-2);
  font-size: 13px;
  transition: background var(--t-fast), color var(--t-fast);
  user-select: none;
}
.page-item:hover { background: var(--surface-2); color: var(--text-1); }
.page-item--active {
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 500;
}
.page-item[data-depth="1"] { padding-left: 26px; }
.page-item[data-depth="2"] { padding-left: 40px; }
.page-item[data-depth="3"] { padding-left: 54px; }

/* ── 6. TOP BAR COMPONENTS ────────────────── */
.topbar__left {
  display: flex;
  align-items: center;
  width: calc(var(--rail-w) + var(--sidebar-w));
  flex-shrink: 0;
  padding-left: 8px;
  gap: 0;
}

.hq-link {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-md);
  color: var(--text-1);
  transition: background var(--t-fast);
  flex-shrink: 0;
}
.hq-link:hover { background: var(--surface-2); text-decoration: none; }
.logo-mark { width: 28px; height: 28px; }

.topbar__app-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  padding-left: 8px;
  border-left: 1px solid var(--border-soft);
  margin-left: 4px;
}

.topbar__centre {
  flex: 1;
  display: flex;
  justify-content: center;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  padding: 6px 14px;
  color: var(--text-3);
  font-size: 13px;
  width: 280px;
  max-width: 100%;
  transition: border-color var(--t-fast), background var(--t-fast);
}
.search-trigger:hover {
  border-color: var(--accent);
  background: var(--surface-2);
  color: var(--text-2);
}
.search-trigger__label { flex: 1; text-align: left; }
.search-trigger__kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-xs);
  padding: 1px 5px;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 4px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-md);
  color: var(--text-2);
  transition: background var(--t-fast), color var(--t-fast);
}
.icon-btn:hover { background: var(--surface-2); color: var(--text-1); }

.avatar-btn { width: 32px; height: 32px; border-radius: 50%; padding: 0; margin-left: 4px; }
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--elevated);
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  font-family: 'JetBrains Mono', monospace;
}

/* ── 7. CONTENT PANE ──────────────────────── */
.content-pane {
  flex: 1;
  overflow-y: auto;
  background: var(--base);
  position: relative;
}

.content-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-3);
}
.content-placeholder i { width: 40px; height: 40px; }
.content-placeholder p { font-size: 14px; }

.page-view {
  max-width: 820px;
  margin: 0 auto;
  padding: 32px 40px 80px;
  animation: fade-in 150ms ease;
}

.page-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-3);
  margin-bottom: 20px;
}
.page-breadcrumb a { color: var(--text-3); }
.page-breadcrumb a:hover { color: var(--text-2); }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.7px;
  color: var(--text-1);
  line-height: 1.2;
}

.page-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; padding-top: 4px; }

.page-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  border: 1px solid currentColor;
  opacity: 0.85;
}
.badge--active   { color: var(--green); }
.badge--draft    { color: var(--amber); }
.badge--archived { color: var(--red); }
.badge--global   { color: var(--purple); }

.page-divider {
  border: none;
  border-top: 1px solid var(--border-soft);
  margin-bottom: 24px;
}

/* Article body (Lora serif) */
.article-body {
  font-family: 'Lora', Georgia, serif;
  font-size: 15.5px;
  line-height: 1.82;
  color: var(--text-1);
  max-width: 700px;
}
.article-body h1 { font-family: 'DM Sans', sans-serif; font-size: 24px; font-weight: 600; margin: 32px 0 12px; }
.article-body h2 { font-family: 'DM Sans', sans-serif; font-size: 20px; font-weight: 600; margin: 28px 0 10px; }
.article-body h3 { font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 600; margin: 20px 0 8px; }
.article-body p  { margin-bottom: 16px; }
.article-body ul, .article-body ol { margin: 0 0 16px 24px; }
.article-body li { margin-bottom: 4px; }
.article-body ul { list-style: disc; }
.article-body ol { list-style: decimal; }
.article-body a  { color: var(--accent); }
.article-body blockquote {
  border-left: 3px solid var(--accent);
  padding: 4px 0 4px 16px;
  color: var(--text-2);
  margin: 16px 0;
}
.article-body code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background: var(--elevated);
  padding: 1px 5px;
  border-radius: var(--r-xs);
  color: var(--accent);
}
.article-body pre {
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 16px;
}
.article-body pre code { background: none; padding: 0; color: var(--text-1); font-size: 13px; }
.article-body table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px; font-family: 'DM Sans', sans-serif; }
.article-body th {
  background: var(--elevated);
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.article-body td { border: 1px solid var(--border-soft); padding: 8px 12px; }
.article-body hr { border: none; border-top: 1px solid var(--border-soft); margin: 24px 0; }
.article-body img { max-width: 100%; border-radius: var(--r-md); }

/* Asset panel */
.asset-panel {
  margin-top: 40px;
  border-top: 1px solid var(--border-soft);
  padding-top: 20px;
}
.asset-panel__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.asset-panel__title {
  font-size: 11px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-3);
}
.asset-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--r-md);
  cursor: pointer;
  transition: background var(--t-fast);
}
.asset-row:hover { background: var(--surface-2); }
.asset-row__icon { color: var(--text-3); flex-shrink: 0; }
.asset-row__name { font-size: 13px; font-weight: 500; }
.asset-row__meta { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text-3); margin-left: auto; }

/* ── 8. OVERLAYS ──────────────────────────── */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.overlay[hidden] { display: none; }
.overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* Auth overlay */
.overlay--fullscreen { align-items: center; justify-content: center; }
.auth-card {
  position: relative;
  z-index: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  padding: 32px;
  width: 360px;
  box-shadow: var(--shadow-lg);
}
.auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.auth-title { font-size: 16px; font-weight: 600; }
.auth-heading { font-size: 18px; font-weight: 600; margin-bottom: 20px; }
.auth-form .field { margin-bottom: 14px; }
.label { display: block; font-size: 12px; font-weight: 500; color: var(--text-2); margin-bottom: 5px; }
.input {
  width: 100%;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  padding: 8px 14px;
  font-size: 14px;
  color: var(--text-1);
  outline: none;
  transition: border-color var(--t-fast);
}
.input:focus { border-color: var(--accent); }
.input::placeholder { color: var(--text-3); }
.auth-error {
  font-size: 13px;
  color: var(--red);
  margin-bottom: 10px;
  padding: 8px 12px;
  background: rgba(248,113,113,0.08);
  border-radius: var(--r-md);
  border: 1px solid rgba(248,113,113,0.2);
}
.auth-switch { text-align: center; font-size: 13px; color: var(--text-2); margin-top: 14px; }
.link-btn { color: var(--accent); text-decoration: underline; cursor: pointer; font-size: inherit; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: var(--r-lg);
  font-size: 13px;
  font-weight: 500;
  transition: background var(--t-fast), opacity var(--t-fast), border-color var(--t-fast);
  border: 1px solid transparent;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--primary { background: var(--accent); color: #0a1a18; border-color: var(--accent); }
.btn--primary:hover:not(:disabled) { opacity: 0.88; }
.btn--ghost { background: transparent; color: var(--text-2); border-color: var(--border); }
.btn--ghost:hover:not(:disabled) { background: var(--surface-2); color: var(--text-1); }
.btn--full { width: 100%; }
.btn--sm { padding: 4px 10px; font-size: 12px; }

/* Search overlay */
.overlay--search { align-items: flex-start; padding-top: 80px; }
.search-modal {
  position: relative;
  z-index: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  width: 580px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.search-modal__input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-soft);
}
.search-modal__icon { color: var(--text-3); flex-shrink: 0; }
.search-modal__input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--text-1);
}
.search-modal__input::placeholder { color: var(--text-3); }
.search-modal__close {
  color: var(--text-3);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-xs);
  padding: 2px 6px;
  cursor: pointer;
}
.search-modal__filters { display: flex; gap: 6px; padding: 10px 16px; border-bottom: 1px solid var(--border-soft); }
.filter-chip {
  padding: 3px 10px;
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: 500;
  background: var(--elevated);
  border: 1px solid var(--border);
  color: var(--text-2);
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
}
.filter-chip:hover { color: var(--text-1); }
.filter-chip--active { background: var(--accent-bg); border-color: var(--accent); color: var(--accent); }
.search-results { overflow-y: auto; padding: 8px 0; flex: 1; }
.search-result-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background var(--t-fast);
  animation: stagger-in 180ms ease both;
}
.search-result-item:hover { background: var(--surface-2); }
.search-result-item__title { font-size: 14px; font-weight: 500; }
.search-result-item__path { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--text-3); }
.search-result-item__excerpt { font-size: 13px; color: var(--text-2); margin-top: 2px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.search-empty { padding: 24px; text-align: center; color: var(--text-3); font-size: 13px; }

/* Settings overlay */
.overlay--panel { align-items: stretch; justify-content: flex-end; }
.settings-panel {
  position: relative;
  z-index: 1;
  background: var(--surface);
  border-left: 1px solid var(--border);
  width: 600px;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: var(--shadow-lg);
}
.settings-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}
.settings-panel__title { font-size: 16px; font-weight: 600; }
.settings-panel__layout { display: flex; flex: 1; overflow: hidden; }
.settings-panel__nav {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-right: 1px solid var(--border-soft);
  width: 160px;
  flex-shrink: 0;
  gap: 2px;
}
.settings-nav-item {
  padding: 7px 10px;
  border-radius: var(--r-md);
  font-size: 13px;
  text-align: left;
  color: var(--text-2);
  transition: background var(--t-fast), color var(--t-fast);
}
.settings-nav-item:hover { background: var(--surface-2); color: var(--text-1); }
.settings-nav-item--active { background: var(--accent-bg); color: var(--accent); font-weight: 500; }
.settings-nav-item--danger { color: var(--red); }
.settings-nav-item--danger:hover { background: rgba(248,113,113,0.08); }
.settings-panel__body { flex: 1; overflow-y: auto; padding: 20px; }

/* Editor overlay */
.overlay--editor { align-items: stretch; justify-content: stretch; padding: 0; }
.overlay--editor::before { background: rgba(0,0,0,0.9); }
.editor-modal {
  position: relative;
  z-index: 1;
  background: var(--base);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.editor-modal__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}
.editor-title-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-1);
}
.editor-title-input::placeholder { color: var(--text-3); }
.editor-modal__actions { display: flex; gap: 8px; }
.editor-modal__body { flex: 1; overflow: hidden; }
.editor-split { display: grid; grid-template-columns: 1fr 1fr; height: 100%; }
.editor-textarea {
  background: var(--base);
  border: none;
  border-right: 1px solid var(--border-soft);
  outline: none;
  padding: 24px 28px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-1);
  resize: none;
  height: 100%;
}
.editor-preview {
  overflow-y: auto;
  padding: 24px 28px;
  font-family: 'Lora', serif;
  font-size: 15.5px;
  line-height: 1.82;
  color: var(--text-1);
}

/* ── 9. TOASTS ────────────────────────────── */
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-md);
  font-size: 13px;
  font-weight: 500;
  max-width: 320px;
  animation: toast-in 200ms ease;
  pointer-events: all;
}
.toast--success { border-color: rgba(74,222,128,0.3); }
.toast--error   { border-color: rgba(248,113,113,0.3); color: var(--red); }
.toast--info    { border-color: rgba(45,212,191,0.3); }

/* ── 10. MAP VIEW ─────────────────────────── */
.map-view { padding: 24px 32px; }
.map-view__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.map-view__title { font-size: 22px; font-weight: 600; letter-spacing: -0.4px; }
.map-filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.map-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.map-table th {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-3);
  border-bottom: 1px solid var(--border);
  padding: 6px 12px;
  text-align: left;
}
.map-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-soft); vertical-align: middle; }
.map-table tr:hover td { background: var(--surface-2); }

/* ── 11. SKELETON STATES ──────────────────── */
.skeleton {
  background: linear-gradient(90deg, var(--elevated) 25%, var(--surface-2) 50%, var(--elevated) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--r-md);
}
.skeleton--text  { height: 14px; margin-bottom: 8px; }
.skeleton--title { height: 28px; margin-bottom: 16px; width: 60%; }
.skeleton--line  { height: 12px; margin-bottom: 6px; }

/* ── 12. SCROLLBARS ───────────────────────── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-3); }

/* ── 13. ANIMATIONS ───────────────────────── */
@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes stagger-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

**Step 2: Verify**

Open the app with no JS (temporarily comment out the module script). Checklist:
- [ ] Dark background visible on `<body>`
- [ ] Auth overlay card centred and styled
- [ ] Three-column layout dimensions correct
- [ ] Google Fonts loaded (check Network tab)
- [ ] No CSS parse errors in DevTools

---

## Task 18: Rewrite `public/js/api.js` and create `public/js/store.js`

**Files:**
- Replace: `public/js/api.js`
- Create: `public/js/store.js`

**What this builds:**
`api.js` — single module that wraps every backend call. Handles 401 redirects. Returns parsed JSON or throws.
`store.js` — central state object with helpers for theme and sidebar persistence.

**Step 1: Write `public/js/api.js`**

Replace `public/js/api.js`:

```javascript
// api.js — Central API client. All fetch() calls go through here only.

const BASE = '';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  if (res.status === 401) {
    import('./auth.js').then(m => m.showAuthOverlay());
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Expose request for ad-hoc calls (e.g. settings)
export { request };

// Auth
export const login    = (body) => request('POST', '/api/auth/login',    body);
export const register = (body) => request('POST', '/api/auth/register', body);
export const logout   = ()     => request('POST', '/api/auth/logout');
export const getMe    = ()     => request('GET',  '/api/auth/me');

// Workspaces
export const listWorkspaces  = ()         => request('GET',    '/api/workspaces');
export const createWorkspace = (body)     => request('POST',   '/api/workspaces',        body);
export const updateWorkspace = (id, body) => request('PATCH',  `/api/workspaces/${id}`,  body);
export const deleteWorkspace = (id)       => request('DELETE', `/api/workspaces/${id}`);

// Sections
export const listSections  = (wsId)      => request('GET',    `/api/workspaces/${wsId}/sections`);
export const createSection = (body)      => request('POST',   '/api/sections',        body);
export const updateSection = (id, body)  => request('PATCH',  `/api/sections/${id}`,  body);
export const deleteSection = (id)        => request('DELETE', `/api/sections/${id}`);

// Pages
export const listPages  = (sectionId)  => request('GET',    `/api/sections/${sectionId}/pages`);
export const getPage    = (id)         => request('GET',    `/api/pages/${id}`);
export const createPage = (body)       => request('POST',   '/api/pages',         body);
export const updatePage = (id, body)   => request('PATCH',  `/api/pages/${id}`,   body);
export const deletePage = (id)         => request('DELETE', `/api/pages/${id}`);
export const movePage   = (id, body)   => request('PATCH',  `/api/pages/${id}/move`, body);

// Assets
export const listAssets  = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/api/assets${qs ? '?' + qs : ''}`);
};
export const getAsset    = (id)        => request('GET',   `/api/assets/${id}`);
export const createAsset = (body)      => request('POST',  '/api/assets',        body);
export const updateAsset = (id, body)  => request('PATCH', `/api/assets/${id}`,  body);
export const linkAsset   = (id, body)  => request('POST',  `/api/assets/${id}/link`, body);

// File upload (multipart — bypasses JSON wrapper)
export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

// Search
export const search = (q, params = {}) => {
  const qs = new URLSearchParams({ q, ...params }).toString();
  return request('GET', `/api/search?${qs}`);
};

// Relationships
export const listRelationships      = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/api/relationships${qs ? '?' + qs : ''}`);
};
export const createRelationship     = (body) => request('POST',   '/api/relationships',      body);
export const deleteRelationship     = (id)   => request('DELETE', `/api/relationships/${id}`);
export const listAssetRelationships = (id)   => request('GET',    `/api/assets/${id}/relationships`);

// Admin
export const listUsers   = ()         => request('GET',    '/api/admin/users');
export const updateUser  = (id, body) => request('PATCH',  `/api/admin/users/${id}`, body);
export const deleteUser  = (id)       => request('DELETE', `/api/admin/users/${id}`);
export const listTokens  = ()         => request('GET',    '/api/admin/tokens');
export const createToken = (body)     => request('POST',   '/api/admin/tokens',      body);
export const deleteToken = (id)       => request('DELETE', `/api/admin/tokens/${id}`);
```

**Step 2: Create `public/js/store.js`**

Create `public/js/store.js`:

```javascript
// store.js — Central application state. Import this from any module.

export const store = {
  user:             null,  // { id, username, displayName, role } | null
  workspaces:       [],    // array from /api/workspaces
  currentWorkspace: null,  // workspace object | null
  currentSection:   null,  // section object | null
  currentPage:      null,  // full page object (with assets) | null
  sidebarState:     {},    // { [sectionId]: boolean } — true = expanded
  theme:            localStorage.getItem('kb-theme') || 'dark',
  searchQuery:      '',
  searchResults:    [],
  searchFilter:     'all', // 'all' | 'pages' | 'assets'
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
```

**Step 3: Verify**

In DevTools console after app loads:

```javascript
// Should print store object with all keys present
const m = await import('/js/store.js');
console.log(m.store);
```

---

## Task 19: Toast, utils, auth forms, and app boot

**Files:**
- Create: `public/js/toast.js`
- Create: `public/js/utils.js`
- Replace: `public/js/auth.js`
- Replace: `public/js/app.js`

**Step 1: Create `public/js/toast.js`**

```javascript
// toast.js — Transient notification toasts

const container = document.getElementById('toast-container');

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 * @param {number} [duration=3000]
 */
export function toast(message, type = 'info', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message; // textContent — safe, no HTML
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms ease';
    setTimeout(() => el.remove(), 210);
  }, duration);
}

export const toastSuccess = (msg, dur) => toast(msg, 'success', dur);
export const toastError   = (msg, dur) => toast(msg, 'error',   dur);
export const toastInfo    = (msg, dur) => toast(msg, 'info',    dur);
```

**Step 2: Create `public/js/utils.js`**

```javascript
// utils.js — Pure utility functions. No side effects. No DOM access.
// marked and DOMPurify are loaded as globals via CDN script tags in index.html.

/**
 * Render markdown to sanitized HTML.
 * Use the return value with a sanitized DOM insertion — see content.js for usage.
 * @param {string} md
 * @returns {string} HTML string (safe — DOMPurify sanitized)
 */
export function renderMarkdown(md) {
  if (!md) return '';
  const raw = window.marked.parse(md);
  return window.DOMPurify.sanitize(raw);
}

/**
 * Format ISO date string for display.
 * @param {string} iso
 * @returns {string} e.g. "27 Feb 2026"
 */
export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * Get user initials (max 2 chars) for the avatar.
 * @param {string} displayName
 * @returns {string}
 */
export function initials(displayName) {
  if (!displayName) return '?';
  return displayName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} wait  ms
 */
export function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str, maxLen) {
  if (!str) return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + '…';
}

/**
 * Extract a plain-text excerpt from markdown.
 */
export function excerpt(md, maxLen = 120) {
  if (!md) return '';
  const plain = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_`[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return truncate(plain, maxLen);
}

/**
 * Build a URL path from workspace, section, page slugs.
 */
export function buildPath(...slugs) {
  return '/' + slugs.filter(Boolean).join('/');
}
```

**Step 3: Write `public/js/auth.js`**

Replace `public/js/auth.js`:

```javascript
// auth.js — Auth overlay: login and register forms

import * as api from './api.js';
import { store }     from './store.js';
import { toastError } from './toast.js';

const overlay      = document.getElementById('auth-overlay');
const appEl        = document.getElementById('app');
const loginForm    = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError   = document.getElementById('login-error');
const regError     = document.getElementById('register-error');

export function showAuthOverlay() {
  overlay.hidden     = false;
  appEl.hidden       = true;
  loginForm.hidden   = false;
  registerForm.hidden = true;
  loginForm.reset();
}

export function hideAuthOverlay() {
  overlay.hidden = true;
  appEl.hidden   = false;
}

function setError(el, msg) {
  el.textContent = msg; // textContent — safe, no HTML
  el.hidden = false;
}

function clearError(el) {
  el.textContent = '';
  el.hidden = true;
}

// Toggle login / register view
overlay.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (action === 'show-register') {
    loginForm.hidden    = true;
    registerForm.hidden = false;
    clearError(loginError);
    clearError(regError);
  }
  if (action === 'show-login') {
    loginForm.hidden    = false;
    registerForm.hidden = true;
    clearError(loginError);
    clearError(regError);
  }
});

// Login submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(loginError);
  const data = Object.fromEntries(new FormData(loginForm));
  const btn  = loginForm.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Signing in…';
  try {
    store.user = await api.login(data);
    hideAuthOverlay();
    window.dispatchEvent(new CustomEvent('kb:authed'));
  } catch (err) {
    setError(loginError, err.message === 'Unauthorized'
      ? 'Invalid username or password.'
      : (err.message || 'Sign in failed.'));
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Sign in';
  }
});

// Register submit
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError(regError);
  const data = Object.fromEntries(new FormData(registerForm));
  const btn  = registerForm.querySelector('button[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Creating account…';
  try {
    store.user = await api.register(data);
    hideAuthOverlay();
    window.dispatchEvent(new CustomEvent('kb:authed'));
  } catch (err) {
    setError(regError, err.message || 'Registration failed. Username may already be taken.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Create account';
  }
});
```

**Step 4: Write `public/js/app.js`**

Replace `public/js/app.js`:

```javascript
// app.js — Application entry point.
// Boot sequence: check session → render nav → bind top bar → start routing.

import * as api  from './api.js';
import { store, applyTheme, toggleTheme, saveSidebarState } from './store.js';
import { showAuthOverlay, hideAuthOverlay } from './auth.js';
import { toastError }  from './toast.js';
import { initials }    from './utils.js';

// ── Boot ──────────────────────────────────────
async function boot() {
  applyTheme(store.theme); // Apply persisted theme before any render
  try {
    store.user = await api.getMe();
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
  window.lucide.createIcons();
}

// ── Avatar ────────────────────────────────────
function renderAvatar() {
  const el = document.getElementById('avatar-initials');
  if (el && store.user) {
    el.textContent = initials(store.user.displayName || store.user.username);
  }
}

// ── HQ link ───────────────────────────────────
async function setHqLink() {
  try {
    const setting = await api.request('GET', '/api/settings/hq-url');
    if (setting?.value) {
      document.getElementById('hq-link').href = setting.value;
    }
  } catch (_) { /* non-critical — HQ URL is optional */ }
}

// ── Workspaces ────────────────────────────────
async function loadWorkspaces() {
  try {
    store.workspaces = await api.listWorkspaces();
    renderRail();
    if (store.workspaces.length > 0) {
      await selectWorkspace(store.workspaces[0]);
    }
  } catch (_) {
    toastError('Could not load workspaces');
  }
}

function renderRail() {
  const rail = document.getElementById('workspace-rail');
  rail.textContent = ''; // clear without innerHTML

  store.workspaces.forEach(ws => {
    const li = document.createElement('li');
    li.className = 'rail__item' + (store.currentWorkspace?.id === ws.id ? ' rail__item--active' : '');
    li.dataset.id = ws.id;
    li.setAttribute('role', 'listitem');

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', ws.icon || 'folder');
    icon.setAttribute('aria-hidden', 'true');

    const tooltip = document.createElement('span');
    tooltip.className = 'rail__tooltip';
    tooltip.textContent = ws.name; // textContent — safe

    li.appendChild(icon);
    li.appendChild(tooltip);
    li.addEventListener('click', () => selectWorkspace(ws));
    rail.appendChild(li);
  });

  window.lucide.createIcons();
}

async function selectWorkspace(ws) {
  store.currentWorkspace = ws;
  store.currentSection   = null;
  store.currentPage      = null;
  renderRail();

  const label = document.getElementById('sidebar-workspace-label');
  if (label) label.textContent = ws.name; // textContent — safe

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
    name.textContent = section.name; // textContent — safe

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
      if (nowExpanded && !pagesLi.dataset.loaded) {
        loadPages(section.id, pagesLi);
      }
    });

    if (isExpanded) loadPages(section.id, pagesLi);
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
      const li   = document.createElement('li');
      const item = document.createElement('div');
      item.className  = 'page-item' + (store.currentPage?.id === page.id ? ' page-item--active' : '');
      item.dataset.id    = page.id;
      item.dataset.depth = depth;

      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'file-text');
      icon.setAttribute('aria-hidden', 'true');

      const title = document.createElement('span');
      title.textContent = page.title; // textContent — safe

      item.appendChild(icon);
      item.appendChild(title);
      item.addEventListener('click', () => selectPage(page));
      li.appendChild(item);
      container.appendChild(li);

      renderPageTree(pages, container, page.id, depth + 1);
    });

  window.lucide.createIcons();
}

export async function selectPage(page) {
  store.currentPage = page;
  document.querySelectorAll('.page-item').forEach(el => {
    el.classList.toggle('page-item--active', el.dataset.id == page.id);
  });
  try {
    const full = await api.getPage(page.id);
    store.currentPage = full;
    const { renderPage } = await import('./content.js');
    renderPage(full);
  } catch (_) {
    toastError('Could not load page');
  }
}

// ── Top bar ───────────────────────────────────
function bindTopBar() {
  // Theme toggle
  const themeBtn  = document.getElementById('theme-btn');
  const themeIcon = document.getElementById('theme-icon');
  themeBtn?.addEventListener('click', () => {
    toggleTheme();
    themeIcon?.setAttribute('data-lucide', store.theme === 'dark' ? 'moon' : 'sun');
    window.lucide.createIcons();
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
    renderRail();
  } catch (_) {
    toastError('Could not create workspace');
  }
}

// ── Auth event listener ───────────────────────
window.addEventListener('kb:authed', () => initApp());

// ── Start ─────────────────────────────────────
boot();
```

**Step 5: Verify — boot sequence checklist**

- [ ] Page loads: dark background visible immediately (no flash of unstyled content)
- [ ] Auth overlay appears on first load (no session)
- [ ] Login form submits → success → app div shown
- [ ] Workspaces appear in the rail
- [ ] Clicking a workspace loads sections in sidebar
- [ ] Section header click collapses / expands with chevron animation
- [ ] Sidebar collapse state persists on page reload
- [ ] Clicking a page item marks it active in sidebar
- [ ] ⌘K opens search overlay; Escape closes it
- [ ] Theme toggle switches dark ↔ light; persists on reload
- [ ] Lucide icons render throughout (rail, sidebar, top bar)
- [ ] No console errors

---

## Summary — Phase 3 files created or replaced

| File | Action | Purpose |
|---|---|---|
| `public/index.html` | Replace | Three-column shell + all overlays |
| `public/css/styles.css` | Replace | Full design system — tokens, layout, all components |
| `public/js/api.js` | Replace | Central fetch wrapper — all API endpoints |
| `public/js/store.js` | Create | Central state + theme/sidebar helpers |
| `public/js/toast.js` | Create | Toast notifications |
| `public/js/utils.js` | Create | renderMarkdown, formatDate, initials, debounce, excerpt |
| `public/js/auth.js` | Replace | Login / register overlay |
| `public/js/app.js` | Replace | Boot, navigation, top bar, shortcuts |

## Phase 4 preview — what comes next

Phase 4 covers the remaining frontend modules:

| Task | File | What it does |
|---|---|---|
| 20 | `public/js/content.js` | Renders page view: breadcrumb, title, badges, article body (markdown → sanitized), asset panel |
| 21 | `public/js/editor.js` | Edit page: open editor overlay, auto-save draft, publish on save |
| 22 | `public/js/search.js` | Search results rendering — debounced, staggered results, filter by type |
| 23 | `public/js/map.js` | Asset relationships map view — filterable table |
| 24 | `public/js/settings.js` | Settings overlay — workspaces, users, API tokens, account, danger zone |
