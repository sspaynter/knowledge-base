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
