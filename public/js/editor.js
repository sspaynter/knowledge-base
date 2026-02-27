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
