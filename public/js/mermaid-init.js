// mermaid-init.js — Initializes Mermaid.js and renders diagrams in content.
// Mermaid is loaded via CDN in index.html (window.mermaid).

import { toastSuccess, toastError } from './toast.js';
import { store } from './store.js';

let mermaidReady = false;
let renderCounter = 0;

/**
 * Initialize Mermaid with app configuration.
 * Call once after the Mermaid CDN script has loaded.
 */
export function initMermaid() {
  if (!window.mermaid) return;
  window.mermaid.initialize({
    startOnLoad: false,
    theme: document.documentElement.dataset.theme === 'light' ? 'default' : 'dark',
    themeVariables: {
      primaryColor: '#4f46e5',
      primaryTextColor: '#f0ede8',
      primaryBorderColor: '#6366f1',
      lineColor: '#6366f1',
      secondaryColor: '#1e1b4b',
      tertiaryColor: '#18181f',
    },
    flowchart: { curve: 'basis', padding: 16 },
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontSize: 13,
  });
  mermaidReady = true;
}

/**
 * Find all mermaid code blocks in the given container and render them as SVG.
 * Replaces <pre><code class="language-mermaid"> with rendered diagrams.
 * @param {HTMLElement} container
 */
export async function renderMermaidBlocks(container) {
  if (!mermaidReady || !window.mermaid) return;

  const codeBlocks = container.querySelectorAll('pre > code.language-mermaid');
  if (codeBlocks.length === 0) return;

  for (const codeEl of codeBlocks) {
    const pre = codeEl.parentElement;
    const source = codeEl.textContent.trim();
    if (!source) continue;

    const diagramId = `mermaid-diagram-${++renderCounter}`;

    try {
      const { svg } = await window.mermaid.render(diagramId, source);

      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-diagram';
      wrapper.dataset.mermaidSource = source;

      // Parse SVG safely via DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const svgEl = doc.documentElement;
      if (svgEl && svgEl.tagName === 'svg') {
        wrapper.appendChild(document.adoptNode(svgEl));
      }

      // Hover toolbar — Copy SVG, Download PNG, Edit Source
      const toolbar = document.createElement('div');
      toolbar.className = 'mermaid-toolbar';
      const copyBtn = makeToolbarBtn('copy', 'Copy SVG');
      const dlBtn   = makeToolbarBtn('download', 'Download PNG');
      const editBtn = makeToolbarBtn('code-2', 'Edit Source');
      toolbar.appendChild(copyBtn);
      toolbar.appendChild(dlBtn);
      toolbar.appendChild(editBtn);
      wrapper.appendChild(toolbar);

      // Wire Copy SVG
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const svgEl = wrapper.querySelector('svg');
        if (!svgEl) return;
        try {
          const markup = new XMLSerializer().serializeToString(svgEl);
          await navigator.clipboard.writeText(markup);
          toastSuccess('SVG copied to clipboard');
        } catch (_) {
          toastError('Could not copy SVG — check clipboard permissions');
        }
      });

      // Wire Download PNG (SVG → canvas → PNG blob)
      // Note: external fonts (Plus Jakarta Sans) may not render in the exported PNG;
      // system-ui fallback is used instead. Acceptable for v2.0.
      dlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const svgEl = wrapper.querySelector('svg');
        if (!svgEl) return;

        const markup = new XMLSerializer().serializeToString(svgEl);
        const blob   = new Blob([markup], { type: 'image/svg+xml' });
        const url    = URL.createObjectURL(blob);
        const img    = new Image();

        img.onload = () => {
          const scale  = 2; // 2× resolution
          const canvas = document.createElement('canvas');
          canvas.width  = img.naturalWidth  * scale;
          canvas.height = img.naturalHeight * scale;
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);

          canvas.toBlob((pngBlob) => {
            const pngUrl  = URL.createObjectURL(pngBlob);
            const a       = document.createElement('a');
            const pageName = (store.currentPage?.title || 'diagram')
              .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            a.href     = pngUrl;
            a.download = pageName + '-diagram.png';
            a.click();
            URL.revokeObjectURL(pngUrl);
          }, 'image/png');
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          toastError('Could not export diagram as PNG');
        };

        img.src = url;
      });

      pre.replaceWith(wrapper);
    } catch (err) {
      // Render error message instead of crashing
      const errorDiv = document.createElement('div');
      errorDiv.className = 'mermaid-diagram mermaid-diagram--error';
      const errorMsg = document.createElement('p');
      errorMsg.className = 'mermaid-error';
      errorMsg.textContent = 'Diagram error: ' + err.message;
      errorDiv.appendChild(errorMsg);
      pre.replaceWith(errorDiv);
    }
  }
}

function makeToolbarBtn(icon, label) {
  const btn = document.createElement('button');
  btn.className = 'mermaid-toolbar__btn';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  const i = document.createElement('i');
  i.setAttribute('data-lucide', icon);
  i.setAttribute('aria-hidden', 'true');
  btn.appendChild(i);
  return btn;
}

/**
 * Re-initialize Mermaid with a new theme and re-render all diagrams in the DOM.
 * Call this when the user toggles dark/light mode.
 * @param {'dark'|'light'} theme
 */
export async function reinitMermaid(theme) {
  if (!window.mermaid) return;
  window.mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'light' ? 'default' : 'dark',
    themeVariables: {
      primaryColor: '#4f46e5',
      primaryTextColor: theme === 'light' ? '#111118' : '#f0ede8',
      primaryBorderColor: '#6366f1',
      lineColor: '#6366f1',
      secondaryColor: theme === 'light' ? '#e0e0f0' : '#1e1b4b',
      tertiaryColor:  theme === 'light' ? '#f5f5f9' : '#18181f',
    },
    flowchart: { curve: 'basis', padding: 16 },
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontSize: 13,
  });

  // Re-render all diagrams currently visible in the content pane
  const diagrams = document.querySelectorAll('.mermaid-diagram[data-mermaid-source]');
  for (const wrapper of diagrams) {
    const source = wrapper.dataset.mermaidSource;
    if (source) await rerenderDiagram(wrapper, source);
  }
}

/**
 * Re-render a single .mermaid-diagram wrapper with new Mermaid source.
 * Updates the SVG in place and stores new source in dataset.mermaidSource.
 * @param {HTMLElement} wrapper   The .mermaid-diagram element
 * @param {string}      newSource The updated Mermaid diagram source
 */
export async function rerenderDiagram(wrapper, newSource) {
  if (!mermaidReady || !window.mermaid || !newSource.trim()) return;

  const diagramId = `mermaid-diagram-${++renderCounter}`;
  try {
    const { svg } = await window.mermaid.render(diagramId, newSource.trim());

    // Remove old SVG
    const oldSvg = wrapper.querySelector('svg');
    if (oldSvg) oldSvg.remove();
    // Remove error state
    const oldErr = wrapper.querySelector('.mermaid-error');
    if (oldErr) oldErr.remove();

    // Insert new SVG safely via DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = doc.documentElement;
    if (svgEl && svgEl.tagName === 'svg') {
      wrapper.insertBefore(document.adoptNode(svgEl), wrapper.firstChild);
    }

    wrapper.dataset.mermaidSource = newSource;
    wrapper.classList.remove('mermaid-diagram--error');
  } catch (err) {
    // Show error state without crashing
    wrapper.classList.add('mermaid-diagram--error');
    let errEl = wrapper.querySelector('.mermaid-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'mermaid-error';
      wrapper.insertBefore(errEl, wrapper.firstChild);
    }
    errEl.textContent = 'Diagram error: ' + err.message;
  }
}
