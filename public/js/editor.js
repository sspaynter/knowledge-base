// editor.js — Page editor overlay.
// Split-view: markdown source left, rendered preview right.
// Preview uses setMarkdownContent (DOMPurify + DOMParser, no innerHTML).

import * as api      from './api.js';
import { store }     from './store.js';
import { setMarkdownContent } from './utils.js';
import { toastSuccess, toastError } from './toast.js';
import { renderMermaidBlocks } from './mermaid-init.js';
import { openDiagramPicker } from './diagram-templates.js';

const overlay    = document.getElementById('editor-overlay');
const titleInput = document.getElementById('editor-title');
const textarea   = document.getElementById('editor-textarea');
const preview    = document.getElementById('editor-preview');
const saveBtn    = document.getElementById('editor-save');
const discardBtn = document.getElementById('editor-discard');
const split      = document.getElementById('editor-split');
const modeBtnEl  = document.getElementById('editor-mode-btn');

let currentPage   = null;
let autoSaveTimer = null;
let isDirty       = false;
let splitMode     = true; // true = split view, false = full-width source

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
  textarea.focus();

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
async function updatePreview() {
  // setMarkdownContent: DOMPurify.sanitize → DOMParser → appendChild (no innerHTML)
  setMarkdownContent(preview, textarea.value);
  // Render Mermaid diagrams in the preview pane
  await renderMermaidBlocks(preview);
}

let previewTimer = null;
textarea.addEventListener('input', () => {
  isDirty = true;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 500);
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

// ── Mode toggle: split / full-width source ────
if (modeBtnEl) {
  modeBtnEl.addEventListener('click', () => {
    splitMode = !splitMode;
    split.classList.toggle('editor-split--source-only', !splitMode);
    modeBtnEl.setAttribute('aria-pressed', String(splitMode));
  });
}

// ── Toolbar formatting actions ─────────────────
const toolbarEl = document.querySelector('.editor-toolbar');
if (toolbarEl) {
  toolbarEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'diagram') {
      openDiagramPicker(btn, insertAtCursor);
      return;
    }
    applyFormat(action);
  });
}

function applyFormat(action) {
  const ta = textarea;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const sel   = ta.value.slice(start, end);
  let before = '', after = '';

  switch (action) {
    case 'bold':        before = '**'; after = '**'; break;
    case 'italic':      before = '_'; after = '_'; break;
    case 'heading':     before = '## '; after = ''; break;
    case 'link':        before = '['; after = '](url)'; break;
    case 'code':
      if (sel.includes('\n')) { before = '```\n'; after = '\n```'; }
      else                    { before = '`'; after = '`'; }
      break;
    case 'bullet-list': before = '- '; after = ''; break;
    default: return;
  }

  const newVal = ta.value.slice(0, start) + before + sel + after + ta.value.slice(end);
  ta.value = newVal;
  const cursor = start + before.length + sel.length + after.length;
  ta.setSelectionRange(cursor, cursor);
  ta.focus();

  isDirty = true;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 500);
}

/**
 * Insert text at cursor position in the editor textarea.
 * @param {string} text
 */
export function insertAtCursor(text) {
  const ta = textarea;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const newVal = ta.value.slice(0, start) + text + ta.value.slice(end);
  ta.value = newVal;
  const pos = start + text.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();

  isDirty = true;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 500);
}
