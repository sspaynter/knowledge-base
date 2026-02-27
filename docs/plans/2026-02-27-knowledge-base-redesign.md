# Knowledge Base — Product Design Specification

**Date:** 2026-02-27
**Status:** Approved
**Author:** Simon Paynter + Claude
**Version:** 1.0

---

## Overview

A complete redesign of the Knowledge Base web app into a **universal knowledge platform** — a personal second brain with a human-first authoring interface, powerful search, and AI integration at its core.

The original v0.1 scaffold was a flat document browser. This spec replaces it with a Confluence/Notion-style documentation portal that covers everything: work notes, personal reference, project documentation, how-tos, blog ideas, business research, IT configuration, and AI system mapping. Content is created directly by the user and injected automatically by AI sessions and connected tools. Both are first-class.

The platform solves a cluster of related problems: knowledge fragmented across multiple tools with no single searchable home; AI sessions that rebuild context from scratch each time; technology ecosystems that exist only in someone's head; and artifacts disconnected from the documentation that describes them. The full problem statement is documented in `docs/plans/2026-02-27-problem-statement.md`.

The app is self-hosted on the QNAP NAS, accessible at `kb.ss-42.com`, and sits within the SS42 suite of internal tools. A portable, platform-based version for others is defined in the Scope section.

---

## 1. Product Definition

### What it is

A universal knowledge platform with a human-first authoring interface and a hierarchical navigation model:

```
Workspaces  →  Sections  →  Pages  →  Content
(IT & Projects, Personal, Work, Learning, Bag Business, ...)
```

- **Workspaces** are independent knowledge areas (like OneNote notebook groups) — fully user-defined
- **Sections** are collapsible topic areas within a workspace (like notebooks)
- **Pages** are hierarchical, multi-level documents within a section — no fixed depth limit
- **Assets** are the raw data behind pages — skill files, config, decisions, session logs, images, links, artifacts

The user is the primary author. Pages, notes, and structure are created directly inside the tool. AI sessions and connected tools (Lifeboard, GitHub, mobile capture) can also inject content automatically. Both paths are first-class. Neither replaces the other.

Content spans any domain: work, personal, IT, projects, business, learning, blogging. The platform imposes no topic restrictions.

### What it is not

- Not a flat record browser (the old model)
- Not a full CMS or public-facing site
- Not a task manager (that is Lifeboard)
- Not a code repository (that is GitHub)
- Not a replacement for specialised creative tools

### Primary use

Reading, writing, and navigating knowledge. The user authors content directly. AI sessions write session logs, decision records, and skill updates automatically. Search and retrieval are the core value — captured knowledge that cannot be found is effectively lost.

---

## 2. Information Architecture

### Workspaces

User-defined at the top level. Initial set:

| Workspace | Icon | Purpose |
|---|---|---|
| IT & Projects | Monitor | Claude config, projects, infrastructure |
| Personal | User | Personal context, health, finance |
| Work | Briefcase | Current role, responsibilities, contacts |
| Learning | Book | Current focus areas, notes, resources |

Workspaces are fully user-defined. New ones can be added at any time. Each workspace is independent — switching workspaces replaces the section sidebar entirely.

### Sections

Within each workspace, sections are the second-level organisation. Also user-defined. Example for IT & Projects:

| Section | Icon | Purpose |
|---|---|---|
| Claude | Bot | Skills, agents, setup, session log |
| Projects | Layout Grid | One sub-section per project |
| Infrastructure | Server | NAS, network, devices |

### Page hierarchy

Pages within each section are hierarchical with no fixed depth limit. Uses an adjacency list model (`parent_id` self-reference). Example:

```
Claude
├── Overview
├── Skills
│   ├── simon-context
│   ├── app-scaffold
│   ├── infra-context
│   └── nas-ops
├── Agents
│   ├── researcher
│   └── builder
├── Setup & Config
└── Session Log
```

### Page content types

A page can contain:
- Markdown body (human-authored narrative or auto-generated)
- Linked assets rendered inline or listed in the asset panel
- Uploaded images and files
- Miro board iframe embeds (v1)
- External links

### Assets

Assets sit behind pages. They are not navigated directly. Types:

| Type | Examples |
|---|---|
| skill | SKILL.md files — with full version history |
| config | CLAUDE.md, docker-compose.yml, env files |
| decision | Architecture and product decision records |
| session | Session logs — what was done, what changed |
| image | Screenshots, wireframes, inspiration references |
| file | Any uploaded binary or document |
| link | External URLs |
| miro | Miro board embed URLs |

### Page templates

Templates define the default structure when Claude auto-generates a page or Simon creates a new one:

| Template | Used for |
|---|---|
| project-overview | Landing page for each project |
| skill-page | Each skill — purpose, coverage, change log |
| section-home | Landing page for a new section |
| decision-record | Architecture or product decisions |
| session-log | What was done, what changed, what was decided |
| blank | Empty page, fully manual |

### External integrations (v1 scope)

| Tool | Integration |
|---|---|
| Miro | Iframe embed. Store board URL as a `miro` asset, embed in page content. |
| OneNote | Links only. No API sync. |
| Images | Upload and store locally. Render inline. |

### HQ link

The SS42 logo mark in the top bar links to the internal HQ hub (a subdomain of ss-42.com, locally hosted). URL stored as an environment variable `HQ_URL`. This is the navigation anchor for the SS42 app suite.

---

## 3. Data Model

New `knowledge_base` schema in the existing `n8n-postgres` PostgreSQL container. Completely isolated from NocoDB's schemas.

### Database access

| Actor | Method | Access |
|---|---|---|
| Knowledge Base web app | Direct PostgreSQL as `kb_app` user | FULL on `knowledge_base` schema; SELECT on specific tables in other schemas as needed |
| Claude sessions | KB REST API with bearer token | Writes to `knowledge_base` via the app's own API endpoints |
| Simon (browser) | Session cookie auth | Writes via the same API |
| NocoDB / n8n | Their own credentials | Cannot see `knowledge_base` schema |

Cross-schema reads (e.g. job tracker data) are granted explicitly:
```sql
GRANT SELECT ON pys9d495uci8hea.jobs TO kb_app;
```

### Tables

#### `workspaces`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | text | Display name |
| slug | text | URL-safe, unique |
| icon | text | Lucide icon name |
| sort_order | integer | Position in rail |
| created_at / updated_at | timestamptz | |

#### `sections`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| workspace_id | FK → workspaces | |
| name | text | |
| slug | text | Unique within workspace |
| icon | text | Lucide icon name |
| sort_order | integer | Position in sidebar |
| created_at / updated_at | timestamptz | |

#### `pages`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| section_id | FK → sections | |
| parent_id | FK → pages (nullable) | Null = root page for section |
| title | text | |
| slug | text | URL segment |
| content | text | Markdown body |
| template_type | text | skill, project-overview, decision, session-log, blank, etc. |
| status | text | published / draft |
| created_by | text | claude / simon / both |
| sort_order | integer | Position among siblings |
| deleted_at | timestamptz | Soft delete — null = not deleted |
| created_at / updated_at | timestamptz | |
| search_vector | tsvector | Generated — full-text search |

#### `assets`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| type | text | skill / config / decision / session / image / file / link / miro |
| title | text | |
| description | text | Short summary |
| content | text | Full text content (skills, decisions, session logs) |
| file_path | text | Disk path for uploaded files/images |
| url | text | External URL for links and Miro embeds |
| metadata | jsonb | Type-specific fields — version, tags, project, status, file_size, etc. |
| created_by | text | claude / simon |
| deleted_at | timestamptz | Soft delete |
| created_at / updated_at | timestamptz | |
| search_vector | tsvector | Generated — full-text search |

#### `asset_versions`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| asset_id | FK → assets | |
| version | text | Version string |
| content | text | Snapshot of content at this version |
| change_summary | text | What changed and why (Claude writes this) |
| changed_by | text | claude / simon |
| created_at | timestamptz | Append-only, never updated |

#### `page_assets`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| page_id | FK → pages | |
| asset_id | FK → assets | |
| display_mode | text | inline / reference |
| sort_order | integer | Order within page |

#### `templates`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| name | text | Human label |
| template_type | text | Matches pages.template_type |
| default_content | text | Markdown scaffold with placeholder tokens |
| structure | jsonb | Which asset types to auto-pull and where |
| created_at / updated_at | timestamptz | |

#### `asset_relationships`

Tracks how assets relate to each other. This is the data behind the system map.

| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| from_asset_id | FK → assets | The asset doing the referencing |
| to_asset_id | FK → assets | The asset being referenced |
| relationship_type | text | See types below |
| notes | text | Optional — why this relationship exists |
| created_at | timestamptz | |

**Relationship types:**

| Type | Meaning | Example |
|---|---|---|
| `loads` | Asset A loads/requires asset B at runtime | Agent loads skill |
| `uses` | Asset A uses asset B | Skill uses config |
| `generates` | Asset A creates asset B | Session generates decision record |
| `deploys-to` | Asset A runs on asset B | Container deploys to NAS |
| `connects-to` | Asset A integrates with asset B | n8n connects to PostgreSQL |
| `supersedes` | Asset A replaces asset B | New skill version supersedes old |
| `references` | General reference — A mentions or links B | |

This table is what powers the **Map view** (Section 5.5). Claude sessions write relationships as part of normal documentation. Example: when updating a skill, Claude writes `{ from: researcher-agent, to: simon-context-skill, type: loads }`.

#### `api_tokens`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| label | text | e.g. "Claude sessions" |
| token_hash | text | bcrypt hash — never store plain |
| last_used_at | timestamptz | |
| created_at | timestamptz | |

#### `users` + `sessions`
Retained from existing scaffold. Moved into `knowledge_base` schema.

### Indexes

```sql
-- Page tree queries
CREATE INDEX idx_pages_section   ON knowledge_base.pages(section_id);
CREATE INDEX idx_pages_parent    ON knowledge_base.pages(parent_id);
CREATE INDEX idx_pages_deleted   ON knowledge_base.pages(deleted_at) WHERE deleted_at IS NULL;

-- Asset queries
CREATE INDEX idx_assets_type     ON knowledge_base.assets(type);
CREATE INDEX idx_assets_metadata ON knowledge_base.assets USING GIN(metadata);
CREATE INDEX idx_assets_deleted  ON knowledge_base.assets(deleted_at) WHERE deleted_at IS NULL;

-- Junction table
CREATE INDEX idx_page_assets_page  ON knowledge_base.page_assets(page_id);
CREATE INDEX idx_page_assets_asset ON knowledge_base.page_assets(asset_id);

-- Version history
CREATE INDEX idx_versions_asset  ON knowledge_base.asset_versions(asset_id);

-- Full-text search
CREATE INDEX idx_pages_fts   ON knowledge_base.pages  USING GIN(search_vector);
CREATE INDEX idx_assets_fts  ON knowledge_base.assets USING GIN(search_vector);
```

### Extensibility

| Need | How |
|---|---|
| New workspace | INSERT into workspaces |
| New section | INSERT into sections |
| New asset type | INSERT into assets with new type value |
| New metadata fields | Add keys to JSONB — no migration needed |
| New template | INSERT into templates |
| Cross-schema read | GRANT SELECT on specific table to kb_app |
| Deeper page nesting | Already supported — adjacency list has no depth limit |

### Migration

The existing 12 records from the NocoDB `documents` table become `assets` records. Their content is preserved. They are linked to auto-generated pages in the appropriate sections. A migration script runs once at setup.

---

## 4. API Design

The web app exposes a REST API. Claude sessions write to it via bearer token (`api_tokens` table).

### Auth

- Browser users: session cookie (existing auth flow)
- Claude sessions: `Authorization: Bearer <token>` header

### Key endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | /api/workspaces | List all workspaces |
| GET | /api/workspaces/:id/sections | Sections for a workspace |
| GET | /api/sections/:id/pages | Page tree for a section |
| GET | /api/pages/:id | Single page with linked assets |
| POST | /api/pages | Create page |
| PATCH | /api/pages/:id | Update page content or metadata |
| DELETE | /api/pages/:id | Soft delete |
| PATCH | /api/pages/:id/move | Move page (new parent or sort position) |
| GET | /api/assets | List assets (filterable by type) |
| GET | /api/assets/:id | Single asset with version history |
| POST | /api/assets | Create asset |
| PATCH | /api/assets/:id | Update asset (creates new version record) |
| POST | /api/assets/:id/link | Link asset to a page |
| POST | /api/upload | Upload image or file — returns asset record |
| GET | /api/search?q= | Full-text search across pages and assets |
| GET | /api/relationships | List all relationships (filterable by type, asset) |
| POST | /api/relationships | Create a relationship between two assets |
| DELETE | /api/relationships/:id | Remove a relationship |
| GET | /api/assets/:id/relationships | All relationships from/to a specific asset |
| GET | /api/health | Docker health check |

---

## 5. UI Design

### Layout

Three-column layout, persistent:

```
[Rail 54px] [Sidebar 244px] [Content pane flex]
```

**Top bar** (50px, full width):
- Left: HQ logo mark (links to `HQ_URL`) + "Knowledge Base" app label
- Centre: Global search input (⌘K)
- Right: Settings icon, light/dark toggle, user avatar

**Workspace rail** (54px):
- SS42 logo mark at top — links to HQ
- Workspace icons (Lucide) — active state with teal left border
- Tooltip on hover showing workspace name
- `+` at bottom to add new workspace

**Section sidebar** (244px, resizable by drag in future):
- Workspace label at top
- Sections as collapsible groups — expand/collapse independently
- Pages as indented tree items within each section
- Active page has teal left accent and accent-tinted background
- `+ Add section` at bottom
- All icons from Lucide icon set — consistent 2D line style

**Content pane** (flex):
- Breadcrumb trail at top
- Page title + Edit button (top right) + `⋯` actions menu
- Status/type/scope badges + version + modified date
- Horizontal divider
- Scrollable article body

### Navigation behaviour

- URL reflects location: `/[workspace]/[section]/[page-slug]`
- Browser back/forward works correctly
- Collapsible sidebar groups — state persisted in localStorage
- Drag to reorder pages within same parent (v1: manual reorder via `⋯` menu; drag in v2)
- Right-click or `⋯` on any page/section: Add child, Rename, Move, Delete

### Content pane detail

- Breadcrumb: Workspace › Section › Page
- Page title: 28px, DM Sans 600, letter-spacing -0.7px
- Edit button: top-right, teal-tinted, Lucide pencil icon
- Badges: status (active/draft/archived), type, scope — pill with hairline border
- Markdown body: max-width 700px, Lora serif, 15.5px, line-height 1.82
- Asset panel: collapsible at bottom of page — shows linked assets with type icon, name, metadata
- Asset panel rows: clickable, expands asset detail inline or opens in overlay

### Map view (relationship visualisation)

Accessible from a **Map** button in the top bar or from any asset/page detail. Shows how assets connect across the whole environment.

**v1 — structured table/list view:**

A filterable table showing all relationships. Columns: From, Relationship type, To, Notes. Filter by asset type, relationship type, or project. This makes the connections visible without requiring a graph rendering library.

Example view — "What does the `researcher` agent load?":

```
researcher (agent)  →  loads  →  simon-context (skill)
researcher (agent)  →  loads  →  infra-context (skill)
researcher (agent)  →  loads  →  nas-ops (skill)
researcher (agent)  →  loads  →  [project CLAUDE.md] (config)
```

**v2 — visual graph (out of scope for v1):**

An interactive node-link diagram. Click a node to highlight its connections. Filter by relationship type. This is the long-term vision — showing the full dependency web of Simon's environment visually.

**Why the table-first approach for v1:**
Building an interactive graph (D3, Cytoscape) is a significant effort and hard to maintain. A well-designed table with filters gives the same information value immediately. The `asset_relationships` table is already wired up — adding the graph view later is additive, not a rebuild.

### Editor mode

- Split view: markdown editor left, live preview right
- Toggle full-screen
- Asset picker: attach existing assets or upload new file
- Auto-saves draft every 30 seconds
- Save publishes immediately; draft status is a manual toggle

### Search

- Global search (⌘K): full-screen overlay, results stagger in
- Results show: title, breadcrumb path, content excerpt
- Filters by workspace, section, asset type
- Powered by PostgreSQL full-text search (`tsvector`)

---

## 6. Visual Design

### Aesthetic direction

Refined dark utility with Apple-esque polish. Content is the hero. Chrome recedes. One strong accent against near-black.

### Colour tokens

| Token | Dark | Light | Role |
|---|---|---|---|
| `--base` | #0d0d11 | #f5f5f7 | Page background |
| `--surface` | #13131a | #ffffff | Sidebar, topbar |
| `--surface-2` | #18181f | #f0f0f5 | Hover, subtle backgrounds |
| `--elevated` | #1e1e28 | #e8e8f0 | Cards, inputs, elevated surfaces |
| `--border` | #28283a | #d4d4de | Interactive borders |
| `--border-soft` | #1c1c26 | #e4e4ec | Structural dividers |
| `--text-1` | #f0ede8 | #111118 | Primary text |
| `--text-2` | #8c8ca0 | #6a6a80 | Secondary text, labels |
| `--text-3` | #52526a | #a0a0b8 | Placeholders, metadata, disabled |
| `--accent` | #2dd4bf | #0d9488 | Active states, links, highlights |
| `--accent-bg` | rgba(45,212,191,0.09) | rgba(13,148,136,0.08) | Accent-tinted backgrounds |

Status colours follow the same pattern: green for active, amber for draft, red for archived/error, purple for global scope.

### Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| UI / navigation / headings | DM Sans | 10–28px | 400–600 |
| Page body content | Lora (serif) | 15.5px | 400 |
| Metadata / paths / code / tags | JetBrains Mono | 11–13px | 400–500 |

The serif body font is the defining design decision. It makes reading documentation feel intentional rather than clinical.

### Iconography

Lucide icon set throughout. Consistent 2D line icons, same stroke weight. No emoji. Key icons:

| Element | Lucide icon |
|---|---|
| IT & Projects workspace | `monitor` |
| Personal workspace | `user` |
| Work workspace | `briefcase` |
| Learning workspace | `book-open` |
| Claude section | `bot` |
| Projects section | `layout-grid` |
| Infrastructure section | `server` |
| Skill asset | `zap` |
| Config asset | `settings-2` |
| Decision asset | `clipboard-list` |
| Session log | `scroll-text` |
| File asset | `file-code` |
| Image asset | `image` |
| Link asset | `external-link` |
| Miro embed | `layout-template` |
| Search | `search` |
| Settings | `settings` |
| Edit | `pencil` |
| Add | `plus` |

### Motion

- Page content: fade in 150ms on load
- Sidebar section expand/collapse: 200ms ease-out
- Search overlay: results stagger in with 20ms delay per item
- Asset panel: slides open with 200ms ease-out
- Hover states: 120–140ms transitions
- No loading spinners where avoidable — skeleton states instead

### Border radius

| Element | Radius |
|---|---|
| Workspace rail items | 10px |
| Section headers | 8px |
| Page items | 8px |
| Logo mark | 8px |
| Buttons | 10px |
| Asset cards | 12px |
| Badges | 20px (pill) |
| Input fields | 22px (pill) |
| Code blocks | 6px |

### Theming

Light and dark mode via CSS custom properties on `[data-theme]` attribute. Toggle button (sun/moon Lucide icons) in the top bar. Preference stored in localStorage.

### HQ logo mark

The "42" minimal SVG mark in the top-left and workspace rail. Links to the internal HQ hub URL (`HQ_URL` environment variable — a locally-hosted subdomain). Serves as the navigation anchor for the SS42 tool suite.

---

## 7. Write Paths

### Claude sessions → Knowledge Base

Claude writes documentation via the KB REST API using a bearer token:

```
POST /api/assets          — create or update a skill/decision/session record
PATCH /api/assets/:id     — update (triggers automatic version snapshot)
POST /api/pages           — create a new auto-generated page
POST /api/assets/:id/link — link an asset to a page
```

This replaces the previous NocoDB API write path. Claude never connects directly to PostgreSQL.

### Auto-generation flow

When Claude completes a session or updates a skill:
1. POST to `/api/assets` with type, content, change_summary, changed_by
2. The API stores the asset and creates an `asset_versions` snapshot automatically
3. If a page exists for this asset, the page's template section re-renders from the latest asset data on next load
4. If no page exists, Claude can POST to `/api/pages` to create one from a template

---

## 8. Settings & Admin

Accessible via the settings icon (⚙) in the top bar:

| Setting | Purpose |
|---|---|
| Workspaces | Create, rename, reorder, delete workspaces |
| Users & roles | Invite users, assign roles (Admin / Editor / Viewer), revoke access |
| API tokens | Create and revoke tokens for Claude session access and external tool integrations |
| HQ URL | Configure the HQ hub link (`HQ_URL`) |
| Theme | Light / dark (also available via top bar toggle) |
| User account | Change password, update display name |
| Danger zone | Export all data, reset |

### Roles

| Role | Capabilities |
|---|---|
| Admin | Full access — all workspaces, settings, user management |
| Editor | Read and write all content — cannot manage users or tokens |
| Viewer | Read-only access to published pages |

Role scope is per-instance in v1 (not per-workspace). Per-workspace role assignment is a v2 consideration.

Admin panel is a settings overlay/modal, not a separate route. The first registered user is automatically Admin.

---

## 9. Tech Stack (updated from v0.1)

| Layer | Tech | Notes |
|---|---|---|
| Runtime | Node.js 20 (Alpine Docker) | Unchanged |
| Framework | Express 4 (CommonJS) | Unchanged |
| Database | PostgreSQL via `pg` | New `knowledge_base` schema in n8n-postgres |
| Auth | bcryptjs + cookie-parser | Unchanged pattern; api_tokens table added |
| Frontend | Vanilla JS ES6 modules | Unchanged |
| Icons | Lucide (CDN or self-hosted) | Replaces emoji |
| Markdown | marked + DOMPurify | Unchanged |
| Editor | EasyMDE or CodeMirror | For markdown editing |
| Fonts | DM Sans, Lora, JetBrains Mono | Via Google Fonts CDN |
| Theming | CSS custom properties | Light/dark via data-theme attribute |
| CI/CD | GitHub Actions → GHCR | Unchanged |
| Hosting | QNAP NAS, Cloudflare tunnel | kb.ss-42.com |

---

## 10. Out of Scope (v1)

- OneNote API sync
- Drag-to-reorder in sidebar (v2 — v1 uses menu-based move)
- Graph/visual view of relationships (v2 — v1 uses filterable table)
- Comments on pages
- Page history UI / restore deleted pages (soft delete exists in data model; restore UI is v2)
- Mobile-optimised layout (desktop is the focus; mobile capture via API integrations)
- Public/shareable page links
- Version 2 portable/platform-based build (Notion or equivalent — separate project, informed by v1)

---

## 11. Scope

### Version 1 — Personal, self-hosted (this spec)
Built for a single primary user. Fully extensible, no compromises, self-hosted on personal infrastructure (QNAP NAS, Cloudflare tunnel). All problems from the problem statement are in scope. This is the reference implementation.

Multi-user access is in scope for v1 — the data model and auth layer support multiple users with roles. The Settings panel includes user management. Initial deployment is single-user; additional users can be added without a rebuild.

### Version 2 — Portable, platform-based (separate project)
A cut-down version built on an existing platform such as Notion. Designed for others to adopt without running their own infrastructure. Informed by Version 1 — same data model and problem space, different substrate. Scoped and planned separately once Version 1 is live.

---

## 12. Reference

- Design preview: `knowledge-base/preview.html`
- Existing scaffold: `knowledge-base/` (v0.1 — to be substantially replaced)
- Problem statement: `docs/plans/2026-02-27-problem-statement.md`
- NocoDB schema (read reference only): `pg33xhvewcmmwir.documents` — 12 records to migrate to `assets`

---

## 13. Build Context

When implementing this spec, the following skills and environment context are active and must be loaded. These are not optional references — they contain the infrastructure details, deployment patterns, and constraints that directly affect how this app is built and deployed.

| Skill | Loaded via | What it covers |
|---|---|---|
| `nas-ops` | Global `~/.claude/CLAUDE.md` | QNAP NAS network config, existing containers, Cloudflare subdomains, port assignments |
| `nas-deploy` | Global `~/.claude/CLAUDE.md` | Container deployment playbooks, lessons learned, operational procedures for QNAP Container Station |
| `infra-context` | Global `~/.claude/CLAUDE.md` | Full stack and deployment awareness — databases, networking, external access, existing services |
| `code-quality` | Global `~/.claude/CLAUDE.md` | Coding standards applied silently to all code |
| `simon-context` | Global `~/.claude/CLAUDE.md` | Working style, communication preferences, execution framework |

### Key environment facts for the build

- **Database host (NAS internal):** `10.0.3.12:5432` — `n8n-postgres` container
- **Database host (local dev):** `192.168.86.18:32775`
- **Database name:** `nocodb`
- **New schema:** `knowledge_base` (to be created — isolated from NocoDB schemas)
- **App URL:** `kb.ss-42.com` via Cloudflare tunnel
- **Container registry:** `ghcr.io/sspaynter/knowledge-base`
- **Deployment:** QNAP Container Station, pulled automatically by Watchtower on `latest` tag push
- **NocoDB still active:** Job Tracker uses NocoDB — do not modify or drop NocoDB schemas

Any implementation agent should load `nas-ops` and `infra-context` before writing deployment-related code or configuration.
