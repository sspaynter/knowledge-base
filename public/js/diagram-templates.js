// diagram-templates.js
// Diagram template picker for the editor toolbar.
// 7 pre-populated Mermaid templates per the design spec (§15).

const TEMPLATES = [
  {
    id: 'infrastructure-map',
    label: 'Infrastructure Map',
    description: 'Servers, services, and network topology',
    icon: 'server',
    template: `\`\`\`mermaid
graph TD
  Internet["🌐 Internet"] --> CF["Cloudflare Tunnel"]
  CF --> NAS["QNAP NAS"]
  NAS --> App["App Container"]
  NAS --> DB["PostgreSQL"]
  App --> DB
\`\`\``,
  },
  {
    id: 'data-flow',
    label: 'Data Flow',
    description: 'How data moves through a system',
    icon: 'arrow-right',
    template: `\`\`\`mermaid
flowchart LR
  Input["Input Source"] --> Process["Processing Step"]
  Process --> Store["Data Store"]
  Store --> Output["Output / Consumer"]
\`\`\``,
  },
  {
    id: 'component-diagram',
    label: 'Component Diagram',
    description: 'System components and their relationships',
    icon: 'package',
    template: `\`\`\`mermaid
graph TD
  subgraph Frontend
    UI["UI Layer"]
  end
  subgraph Backend
    API["API Server"]
    SVC["Service Layer"]
  end
  subgraph Storage
    DB["Database"]
  end
  UI --> API
  API --> SVC
  SVC --> DB
\`\`\``,
  },
  {
    id: 'agent-hierarchy',
    label: 'Agent Hierarchy',
    description: 'AI agents, orchestrators, and tools',
    icon: 'brain',
    template: `\`\`\`mermaid
graph TD
  Orchestrator["Orchestrator Agent"] --> ResearchAgent["Research Agent"]
  Orchestrator --> BuildAgent["Build Agent"]
  Orchestrator --> ReviewAgent["Review Agent"]
  ResearchAgent --> WebSearch["Web Search Tool"]
  BuildAgent --> CodeWrite["Code Write Tool"]
  ReviewAgent --> TestRun["Test Runner"]
\`\`\``,
  },
  {
    id: 'sequence-flow',
    label: 'Sequence Flow',
    description: 'Interaction sequence between parties',
    icon: 'list-ordered',
    template: `\`\`\`mermaid
sequenceDiagram
  participant User
  participant App
  participant API
  participant DB

  User->>App: Submit request
  App->>API: POST /api/resource
  API->>DB: INSERT row
  DB-->>API: Row created
  API-->>App: 201 Created
  App-->>User: Success message
\`\`\``,
  },
  {
    id: 'state-lifecycle',
    label: 'State Lifecycle',
    description: 'States and transitions of a process',
    icon: 'git-merge',
    template: `\`\`\`mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Review: Submit
  Review --> Published: Approve
  Review --> Draft: Request changes
  Published --> Archived: Archive
  Archived --> Draft: Restore
\`\`\``,
  },
  {
    id: 'database-schema',
    label: 'Database Schema',
    description: 'Tables, columns, and relationships',
    icon: 'table',
    template: `\`\`\`mermaid
erDiagram
  USERS {
    bigint id PK
    text email
    text name
    timestamptz created_at
  }
  PAGES {
    bigint id PK
    bigint section_id FK
    text title
    text content
    text status
  }
  USERS ||--o{ PAGES : "creates"
\`\`\``,
  },
];

let pickerEl = null;
let onInsert = null;
let anchorEl = null;

/**
 * Open the diagram template picker near the given anchor element.
 * @param {HTMLElement} anchor  The "Insert Diagram" button
 * @param {Function}    insertFn  Callback to insert text at editor cursor
 */
export function openDiagramPicker(anchor, insertFn) {
  onInsert = insertFn;
  anchorEl = anchor;

  if (!pickerEl) {
    pickerEl = document.getElementById('diagram-picker');
    buildPickerContent();
  }

  positionPicker(anchor);
  pickerEl.hidden = false;

  // Close on outside click
  requestAnimationFrame(() => {
    document.addEventListener('click', onOutsideClick, { once: true });
  });
}

function closePicker() {
  if (pickerEl) pickerEl.hidden = true;
  document.removeEventListener('click', onOutsideClick);
}

function onOutsideClick(e) {
  if (pickerEl && !pickerEl.contains(e.target) && e.target !== anchorEl) {
    closePicker();
  }
}

function positionPicker(anchor) {
  const rect = anchor.getBoundingClientRect();
  // Position below the anchor button
  pickerEl.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
  pickerEl.style.left = rect.left + 'px';
}

function buildPickerContent() {
  // Clear existing content using DOM APIs
  while (pickerEl.firstChild) pickerEl.removeChild(pickerEl.firstChild);

  const heading = document.createElement('p');
  heading.className = 'diagram-picker__heading';
  heading.textContent = 'Insert diagram';
  pickerEl.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'diagram-picker__list';
  list.setAttribute('role', 'listbox');

  TEMPLATES.forEach((tmpl) => {
    const li = document.createElement('li');
    li.className = 'diagram-picker__item';
    li.setAttribute('role', 'option');
    li.dataset.templateId = tmpl.id;

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', tmpl.icon);
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'diagram-picker__text';

    const label = document.createElement('strong');
    label.textContent = tmpl.label;

    const desc = document.createElement('span');
    desc.className = 'diagram-picker__desc';
    desc.textContent = tmpl.description;

    text.appendChild(label);
    text.appendChild(desc);
    li.appendChild(icon);
    li.appendChild(text);

    li.addEventListener('click', () => {
      if (onInsert) {
        onInsert('\n' + tmpl.template + '\n');
      }
      closePicker();
      // Re-run lucide for the newly inserted picker icons
      if (window.lucide) window.lucide.createIcons();
    });

    list.appendChild(li);
  });

  pickerEl.appendChild(list);

  // Initialise Lucide icons in the picker
  if (window.lucide) window.lucide.createIcons();
}
