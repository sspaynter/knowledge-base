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
