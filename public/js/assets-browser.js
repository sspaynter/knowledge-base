// assets-browser.js — Asset browser view.
// Lists all assets with type filter. Click an asset to view detail and linked pages.
// All DOM rendering uses textContent / createElement — no innerHTML from untrusted data.

import * as api from './api.js';
import { toastError } from './toast.js';

const ASSET_ICONS = {
  skill: 'zap', config: 'settings-2', decision: 'clipboard-list',
  session: 'scroll-text', image: 'image', file: 'file-code',
  link: 'external-link', miro: 'layout-template',
};

const ASSET_TYPES = ['skill', 'config', 'decision', 'session', 'image', 'file', 'link', 'miro'];

export async function renderAssetBrowser() {
  const pane = document.getElementById('content-pane');
  pane.textContent = '';

  pane.appendChild(buildSkeleton());

  let assets = [];
  try {
    assets = await api.listAssets();
  } catch (_) {
    toastError('Could not load assets');
    pane.textContent = '';
    return;
  }

  pane.textContent = '';
  pane.appendChild(buildBrowser(assets));
  window.lucide.createIcons();
}

function buildSkeleton() {
  const wrap = document.createElement('div');
  wrap.style.padding = '24px 32px';
  const sk1 = document.createElement('div');
  sk1.className = 'skeleton skeleton--title';
  wrap.appendChild(sk1);
  for (let i = 0; i < 8; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton skeleton--text';
    wrap.appendChild(sk);
  }
  return wrap;
}

function buildBrowser(assets) {
  const container = document.createElement('div');
  container.className = 'asset-browser';

  // Header
  const header = document.createElement('div');
  header.className = 'map-view__header'; // reuse map header style
  const title = document.createElement('h2');
  title.className = 'map-view__title';
  title.textContent = 'Asset Browser';
  const count = document.createElement('span');
  count.className = 'asset-browser__count';
  count.textContent = assets.length + ' assets';
  header.appendChild(title);
  header.appendChild(count);
  container.appendChild(header);

  // Filter bar
  const filters = document.createElement('div');
  filters.className = 'map-filters'; // reuse map filter bar style
  const typeSelect = makeTypeSelect();
  const nameInput  = makeNameInput();
  filters.appendChild(typeSelect);
  filters.appendChild(nameInput);
  container.appendChild(filters);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'asset-grid';

  if (assets.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'asset-browser__empty';
    empty.textContent = 'No assets found. Assets are linked to pages — create a page to get started.';
    container.appendChild(empty);
    return container;
  }

  assets.forEach(asset => {
    grid.appendChild(buildAssetCard(asset, container));
  });
  container.appendChild(grid);

  // Detail panel (hidden until an asset is clicked)
  const detail = document.createElement('div');
  detail.id = 'asset-detail-panel';
  detail.className = 'asset-detail-panel';
  detail.hidden = true;
  container.appendChild(detail);

  // Filter logic
  function applyFilters() {
    const type = typeSelect.value;
    const name = nameInput.value.toLowerCase();
    grid.querySelectorAll('.asset-card').forEach(card => {
      const matchType = !type || card.dataset.type === type;
      const matchName = !name || card.dataset.title.toLowerCase().includes(name);
      card.hidden = !(matchType && matchName);
    });
  }
  typeSelect.addEventListener('change', applyFilters);
  nameInput.addEventListener('input',  applyFilters);

  return container;
}

function buildAssetCard(asset, container) {
  const card = document.createElement('div');
  card.className = 'asset-card';
  card.dataset.type  = asset.type || '';
  card.dataset.title = asset.title || '';
  card.dataset.id    = asset.id;

  const iconEl = document.createElement('i');
  iconEl.setAttribute('data-lucide', ASSET_ICONS[asset.type] || 'file');
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.className = 'asset-card__icon';

  const info = document.createElement('div');
  info.className = 'asset-card__info';

  const cardTitle = document.createElement('span');
  cardTitle.className = 'asset-card__title';
  cardTitle.textContent = asset.title || '(untitled)';

  const meta = document.createElement('span');
  meta.className = 'asset-card__meta';
  meta.textContent = asset.type || 'file';

  info.appendChild(cardTitle);
  info.appendChild(meta);

  card.appendChild(iconEl);
  card.appendChild(info);

  card.addEventListener('click', () => showAssetDetail(asset, container));

  return card;
}

async function showAssetDetail(asset, container) {
  // Mark active card
  container.querySelectorAll('.asset-card').forEach(c => {
    c.classList.toggle('asset-card--active', c.dataset.id == asset.id);
  });

  const panel = container.querySelector('#asset-detail-panel');
  panel.hidden = false;
  panel.textContent = '';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'icon-btn asset-detail-panel__close';
  closeBtn.setAttribute('aria-label', 'Close detail panel');
  const closeIcon = document.createElement('i');
  closeIcon.setAttribute('data-lucide', 'x');
  closeIcon.setAttribute('aria-hidden', 'true');
  closeBtn.appendChild(closeIcon);
  closeBtn.addEventListener('click', () => {
    panel.hidden = true;
    container.querySelectorAll('.asset-card').forEach(c => c.classList.remove('asset-card--active'));
  });
  panel.appendChild(closeBtn);

  // Title
  const titleEl = document.createElement('h3');
  titleEl.className = 'asset-detail-panel__title';
  titleEl.textContent = asset.title || '(untitled)';
  panel.appendChild(titleEl);

  // Type badge
  const typeBadge = document.createElement('span');
  typeBadge.className = 'asset-detail-panel__type';
  typeBadge.textContent = asset.type || 'file';
  panel.appendChild(typeBadge);

  // Description
  if (asset.description) {
    const desc = document.createElement('p');
    desc.className = 'asset-detail-panel__desc';
    desc.textContent = asset.description;
    panel.appendChild(desc);
  }

  // URL (for link type)
  if (asset.url) {
    const urlRow = document.createElement('p');
    urlRow.className = 'asset-detail-panel__url';
    const urlLabel = document.createElement('span');
    urlLabel.textContent = 'URL: ';
    const urlLink = document.createElement('a');
    urlLink.href = asset.url;
    urlLink.textContent = asset.url;
    urlLink.target = '_blank';
    urlLink.rel = 'noopener noreferrer';
    urlRow.appendChild(urlLabel);
    urlRow.appendChild(urlLink);
    panel.appendChild(urlRow);
  }

  // Linked pages section
  const pagesHeading = document.createElement('h4');
  pagesHeading.className = 'asset-detail-panel__section-heading';
  pagesHeading.textContent = 'Linked pages';
  panel.appendChild(pagesHeading);

  const pagesLoading = document.createElement('p');
  pagesLoading.className = 'asset-detail-panel__loading';
  pagesLoading.textContent = 'Loading…';
  panel.appendChild(pagesLoading);

  try {
    const linkedPages = await api.getAssetLinkedPages(asset.id);
    pagesLoading.remove();

    if (linkedPages.length === 0) {
      const none = document.createElement('p');
      none.className = 'asset-detail-panel__none';
      none.textContent = 'Not linked to any pages.';
      panel.appendChild(none);
    } else {
      const pageList = document.createElement('ul');
      pageList.className = 'asset-detail-panel__page-list';
      linkedPages.forEach(p => {
        const li = document.createElement('li');
        li.className = 'asset-detail-panel__page-item';
        const pageIcon = document.createElement('i');
        pageIcon.setAttribute('data-lucide', 'file-text');
        pageIcon.setAttribute('aria-hidden', 'true');
        const pageTitle = document.createElement('span');
        pageTitle.textContent = p.title;
        const pagePath = document.createElement('span');
        pagePath.className = 'asset-detail-panel__page-path';
        pagePath.textContent = `${p.workspace_name} › ${p.section_name}`;
        li.appendChild(pageIcon);
        li.appendChild(pageTitle);
        li.appendChild(pagePath);
        pageList.appendChild(li);
      });
      panel.appendChild(pageList);
    }
  } catch (_) {
    pagesLoading.textContent = 'Could not load linked pages.';
  }

  window.lucide.createIcons();
}

function makeTypeSelect() {
  const sel = document.createElement('select');
  sel.className = 'input';
  sel.style.cssText = 'width:180px;border-radius:var(--r-full);padding:5px 12px;font-size:13px;';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'All types';
  sel.appendChild(all);
  ASSET_TYPES.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    sel.appendChild(opt);
  });
  return sel;
}

function makeNameInput() {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.style.width = '220px';
  input.placeholder = 'Filter by name…';
  return input;
}
