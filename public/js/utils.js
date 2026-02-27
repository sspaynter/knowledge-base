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

/**
 * Render markdown to DOM nodes and append to element.
 * Pipeline: marked.parse → DOMPurify.sanitize → DOMParser → appendChild
 * No innerHTML assignment. Safe for user-authored and AI-authored content.
 * @param {HTMLElement} element  Target container (will be cleared first)
 * @param {string} md            Markdown string
 */
export function setMarkdownContent(element, md) {
  element.textContent = ''; // safe clear
  if (!md) return;
  const sanitized = window.DOMPurify.sanitize(window.marked.parse(md));
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div>' + sanitized + '</div>', 'text/html');
  Array.from(doc.body.firstChild.childNodes).forEach(node => {
    element.appendChild(node.cloneNode(true));
  });
}
