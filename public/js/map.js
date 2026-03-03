// map.js — Asset relationship map view. Two modes: filterable table + Mermaid diagram.
// All content rendered via textContent / DOM APIs — no innerHTML from untrusted data.

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

  // Table / Diagram toggle
  const modeToggle = document.createElement('div');
  modeToggle.className = 'map-mode-toggle';
  const tableBtn   = makeModeBtn('table-2',  'Table',   true);
  const diagramBtn = makeModeBtn('git-branch', 'Diagram', false);
  modeToggle.appendChild(tableBtn);
  modeToggle.appendChild(diagramBtn);
  container.appendChild(modeToggle);

  // Filter bar
  const filters = document.createElement('div');
  filters.className = 'map-filters';
  const typeSelect = makeSelect(['All types', ...REL_TYPES]);
  const nameInput  = makeInput('Filter by asset name…');
  filters.appendChild(typeSelect);
  filters.appendChild(nameInput);
  container.appendChild(filters);

  // Table view
  const tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';
  const table = buildTable(relationships);
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);

  // Diagram view (lazy-rendered)
  const diagramWrap = document.createElement('div');
  diagramWrap.className = 'map-diagram-wrap';
  diagramWrap.hidden = true;
  container.appendChild(diagramWrap);

  // Filter logic (applies to table rows and affects diagram data)
  function getFilteredRels() {
    const type  = typeSelect.value === 'All types' ? '' : typeSelect.value;
    const asset = nameInput.value.toLowerCase();
    return relationships.filter(rel => {
      const matchType  = !type  || rel.relationship_type === type;
      const matchAsset = !asset
        || (rel.from_title || '').toLowerCase().includes(asset)
        || (rel.to_title   || '').toLowerCase().includes(asset);
      return matchType && matchAsset;
    });
  }

  function applyFilters() {
    const filtered = getFilteredRels();
    // Update table visibility
    table.querySelectorAll('tbody tr').forEach(tr => {
      const matchType  = !typeSelect.value || typeSelect.value === 'All types' || tr.dataset.relType === typeSelect.value;
      const asset = nameInput.value.toLowerCase();
      const matchAsset = !asset || tr.dataset.from.toLowerCase().includes(asset)
                                 || tr.dataset.to.toLowerCase().includes(asset);
      tr.hidden = !(matchType && matchAsset);
    });
    // Refresh diagram if visible
    if (!diagramWrap.hidden) renderDiagram(filtered, diagramWrap);
  }

  typeSelect.addEventListener('change', applyFilters);
  nameInput.addEventListener('input',  applyFilters);

  // Mode toggle logic
  tableBtn.addEventListener('click', () => {
    tableBtn.classList.add('map-mode-btn--active');
    diagramBtn.classList.remove('map-mode-btn--active');
    tableWrap.hidden   = false;
    diagramWrap.hidden = true;
  });
  diagramBtn.addEventListener('click', async () => {
    diagramBtn.classList.add('map-mode-btn--active');
    tableBtn.classList.remove('map-mode-btn--active');
    tableWrap.hidden   = true;
    diagramWrap.hidden = false;
    renderDiagram(getFilteredRels(), diagramWrap);
  });

  return container;
}

function makeModeBtn(icon, label, active) {
  const btn = document.createElement('button');
  btn.className = 'map-mode-btn' + (active ? ' map-mode-btn--active' : '');
  const i = document.createElement('i');
  i.setAttribute('data-lucide', icon);
  i.setAttribute('aria-hidden', 'true');
  const span = document.createElement('span');
  span.textContent = label;
  btn.appendChild(i);
  btn.appendChild(span);
  return btn;
}

/** Generate a Mermaid flowchart from filtered relationships and render it. */
async function renderDiagram(relationships, container) {
  container.textContent = '';

  if (relationships.length === 0) {
    const msg = document.createElement('p');
    msg.style.cssText = 'color:var(--text-3);text-align:center;padding:32px;font-size:13px;';
    msg.textContent = 'No relationships to display. Adjust the filter to see the diagram.';
    container.appendChild(msg);
    return;
  }

  // Build node set (deduplicated by id)
  const nodes = new Map();
  const edges = [];

  relationships.forEach(rel => {
    const fromId  = `a${rel.from_asset_id}`;
    const toId    = `a${rel.to_asset_id}`;
    const fromLbl = sanitiseMermaidLabel(rel.from_title || fromId);
    const toLbl   = sanitiseMermaidLabel(rel.to_title   || toId);

    nodes.set(fromId, fromLbl);
    nodes.set(toId,   toLbl);
    edges.push({ from: fromId, to: toId, label: rel.relationship_type || '' });
  });

  // Build Mermaid syntax
  let mermaid = 'flowchart LR\n';
  for (const [id, label] of nodes) {
    mermaid += `  ${id}["${label}"]\n`;
  }
  for (const edge of edges) {
    const edgeLabel = edge.label ? `|${edge.label}|` : '';
    mermaid += `  ${edge.from} -->${edgeLabel} ${edge.to}\n`;
  }

  // Render using Mermaid library
  if (!window.mermaid) {
    const msg = document.createElement('p');
    msg.style.cssText = 'color:var(--text-3);padding:24px;font-size:13px;';
    msg.textContent = 'Mermaid library not loaded — refresh and try again.';
    container.appendChild(msg);
    return;
  }

  try {
    const diagramId = `map-diagram-${Date.now()}`;
    const { svg } = await window.mermaid.render(diagramId, mermaid);

    // Parse SVG safely via DOMParser
    const parser = new DOMParser();
    const doc    = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl  = doc.documentElement;
    if (svgEl && svgEl.tagName === 'svg') {
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-diagram';
      wrapper.style.margin = '24px auto';
      wrapper.appendChild(document.adoptNode(svgEl));
      container.appendChild(wrapper);
      window.lucide.createIcons();
    }
  } catch (err) {
    const errEl = document.createElement('p');
    errEl.style.cssText = 'color:var(--danger);padding:24px;font-size:13px;';
    errEl.textContent = 'Diagram error: ' + err.message;
    container.appendChild(errEl);
  }
}

/** Sanitise a label string for use inside Mermaid quoted node labels. */
function sanitiseMermaidLabel(str) {
  return String(str).replace(/"/g, "'").replace(/[<>]/g, '').slice(0, 40);
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
