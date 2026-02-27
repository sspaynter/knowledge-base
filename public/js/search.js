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
