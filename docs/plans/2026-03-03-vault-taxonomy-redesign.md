# Vault Taxonomy Redesign — Decision Document

**Date:** 2026-03-03
**Status:** APPROVED — pending implementation
**Session:** AI Operating Model discussion

---

## Decision

Replace the current KB vault workspace structure with a new taxonomy based on
modified PARA principles, informed by existing OneDrive folder patterns and
the distinction between employment vs self-directed work.

---

## The Problem With the Current Structure

```
it-and-projects/   ← ambiguous — mixes IT ops with active project builds
work/              ← used inconsistently
personal/          ← too broad, no capture mechanism
learning/          ← acceptable but isolated
```

Issues:
- `it-and-projects` conflates infrastructure/operations with active project
  builds — fundamentally different things
- No home for self-directed businesses (ss42, SimonSaysAutomation, bags)
- No capture/inbox workspace — everything requires filing decision on input,
  which creates friction and lost notes
- Employment and self-employment are not distinguished
- No `products` category for long-running owned apps (Applyr, KB) that never
  "complete" in the PARA sense
- Applyr and KB projects currently write vault docs to `it-and-projects/` —
  wrong workspace, needs correcting

---

## Framework — Modified PARA

PARA (Tiago Forte): Projects → Areas → Resources → Archive

| PARA concept | Applied here | Why modified |
|---|---|---|
| Projects | `projects/clients/` only | Personal apps are products (no completion), not projects |
| Areas | `operations/`, `studio/`, `work/`, `personal/` | Ongoing responsibilities |
| Resources | `learning/` | Reference knowledge |
| Archive | `archive/` | Inactive items |
| (not in PARA) | `products/` | PARA has no home for owned apps maintained indefinitely |
| (not in PARA) | `inbox/` | PARA implies capture; made explicit here |

---

## New Structure

```
inbox/              Capture — brain dumps, dated session notes, unprocessed ideas
                    Convention: YYYY-MM-DD-topic.md
                    Processed regularly: move to right workspace or delete

operations/         How I work — AI model, infra, tools, processes
                    Ongoing areas with no completion state
  ai-operating-model/
  infrastructure/
  automation/

products/           Own apps maintained indefinitely
                    Continuous updates, no end state — not projects
  applyr/
  knowledge-base/
  todo/
  n8n/

projects/           Finite outcomes with defined deliverables
  clients/
    {client-name}/
      {engagement-name}/

studio/             Personal businesses — self-directed commercial activity
                    Named "studio" to capture maker/builder identity across
                    services, physical products, and creative content
  ss42/             Personal brand — blog, content, website, identity
    blog/
    content/
    brand/
  automation/       SimonSaysAutomation — AI services, consulting, delivery
    services/
    solutions/
  bags/             Bags business (name TBD)
    design/
    materials/
    production/

work/               Employment — working for someone else
                    One folder per company, mirrors existing OneDrive pattern
  jbhifi/
  nec/
  datacom/
  ajilon/
  uxc/
  toll/
  jbsolutions/

learning/           Knowledge — courses, tech, frameworks, research
  ai/
  product/
  it/
  python/

personal/           Personal life — family, health, finance, fitness, job search
  family/
  health/
  finance/
  fitness/
  job-search/
    resume/
    applications/

archive/            Inactive — completed projects, past employers, old content
```

---

## Rationale — Key Decisions

| Decision | Rationale |
|---|---|
| `operations/` replaces `it-and-projects/` | Operations = ongoing areas (never done). IT is one component. Projects is a separate concept. |
| `products/` is separate from `projects/` | Applyr and KB will have continuous updates indefinitely. They do not have a completion state. PARA projects are finite. |
| `studio/` not `ventures/` | Studio captures the maker/builder identity across services, physical products, and creative content. Scales naturally to future businesses. |
| `studio/` not `businesses/` | Studio carries identity and intention; businesses is flat description. |
| Employment vs self-employment split | `work/` = employed by others. `studio/` = own businesses. Mirrors existing OneDrive A_ structure and Simon's mental model. |
| `inbox/` as first-class workspace | Replaces OneNote General section. Dated markdown files are searchable, metadata-capable, and link to the right workspace after processing. Removes the decision friction of needing to file immediately. |
| `personal/` includes job search | Job search is an ongoing personal responsibility with no single deliverable — it is an Area (PARA), not a Project. |
| `projects/` is clients-only | Personal finite work either becomes a product, goes to `inbox/`, or lives under `personal/`. Keeps `projects/` clean. |

---

## Migration Map

### Current → New

| Current location | New location | Action |
|---|---|---|
| `it-and-projects/` | Dissolve — redistribute content below | Delete workspace after migration |
| `it-and-projects/applyr*` | `products/applyr/` | Move files |
| `it-and-projects/knowledge-base*` | `products/knowledge-base/` | Move files |
| `it-and-projects/infrastructure*` | `operations/infrastructure/` | Move files |
| `it-and-projects/n8n*` | `operations/automation/` | Move files |
| `it-and-projects/` (anything else) | Assess individually | Move or archive |
| `work/` content | `work/{company}/` | Keep, reorganise sub-folders |
| `personal/` content | `personal/` | Keep, add `job-search/` sub-folder |
| `learning/` content | `learning/` | Keep |

### New workspaces with no current vault content

- `inbox/` — start fresh; first entry can be the AI Operating Model discussion
- `operations/ai-operating-model/` — **created this session** (`overview.md` written)
- `products/` — migrate from `it-and-projects/`
- `projects/clients/` — empty, ready for first client engagement
- `studio/` — no current KB content; source material is in OneDrive

---

## Impact on Other Projects

These CLAUDE.md files reference vault paths and need updating:

### Applyr (`~/Documents/Claude/applyr/CLAUDE.md`)
- Currently writes vault docs to: `it-and-projects/` area
- Update to: `products/applyr/`

### Knowledge Base (`~/Documents/Claude/knowledge-base/CLAUDE.md`)
- Currently writes vault docs to: `it-and-projects/` area
- Update to: `products/knowledge-base/`

### Job App (`~/Documents/Claude/job-app/CLAUDE.md`)
- Job search content → `personal/job-search/`
- Check if any vault path references exist and update

### KB workspace alias (code)
- Current alias: `it-and-projects` → `it-projects`
- Remove this alias after migration
- Add any new aliases needed for long workspace names

---

## Implementation Checklist

Execute in the KB project session:

**Vault restructure:**
- [ ] Create new workspace directories in vault
- [ ] Audit `it-and-projects/` — list all files and map to new locations
- [ ] Move `it-and-projects/` content to correct new locations
- [ ] Delete `it-and-projects/` workspace directory
- [ ] Update `vault/Home.md` to reflect new workspace structure

**CLAUDE.md updates:**
- [ ] Update `applyr/CLAUDE.md` — change vault path references to `products/applyr/`
- [ ] Update `knowledge-base/CLAUDE.md` — change vault path references to `products/knowledge-base/`
- [ ] Update `job-app/CLAUDE.md` — check and update any vault references

**KB app code:**
- [ ] Update workspace alias mapping — remove `it-and-projects` → `it-projects`
- [ ] Add any new workspace aliases needed
- [ ] Test KB navigation with new workspace names
- [ ] Verify sidebar renders new workspaces correctly

**Validation:**
- [ ] Open KB in browser — confirm all workspaces visible
- [ ] Navigate to `operations/ai-operating-model/overview.md` — confirm it renders
- [ ] Navigate to a migrated `products/` article — confirm it renders
- [ ] Write a test `inbox/` entry — confirm it saves and appears

---

## Related

- `vault/operations/ai-operating-model/overview.md` — first article written
  under new structure (created this session)
- `docs/plans/2026-03-03-kb-v2-implementation-plan.md` — KB build plan
  (workspace section will need updating)
