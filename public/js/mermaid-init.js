// mermaid-init.js — Initializes Mermaid.js and renders diagrams in content.
// Mermaid is loaded via CDN in index.html (window.mermaid).

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

      // Add hover toolbar stub (non-functional in Phase 1)
      const toolbar = document.createElement('div');
      toolbar.className = 'mermaid-toolbar';
      toolbar.appendChild(makeToolbarBtn('copy', 'Copy SVG'));
      toolbar.appendChild(makeToolbarBtn('download', 'Download PNG'));
      toolbar.appendChild(makeToolbarBtn('code-2', 'Edit Source'));
      wrapper.appendChild(toolbar);

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
