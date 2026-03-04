# KB Session — Frontmatter Metadata Parsing (#35)

Master Todo #35. Vault sync engine does not parse YAML frontmatter from markdown files. All pages sync as `published` with no metadata. This session adds frontmatter support.

## Problem

When Claude or Obsidian writes a vault file, metadata like status, author, tags, and ordering has no way to reach the database. The sync engine reads the entire file as content, including any frontmatter block. This means:
- Every page appears as `published` regardless of intent
- No way to set draft status from a markdown file
- No page ordering from vault files
- Tags and authorship not captured

## What to build

Update `services/vault-sync.js` to:

1. **Detect frontmatter** — look for `---` delimiters at the top of `.md` files
2. **Parse YAML** — extract key-value pairs (use `js-yaml` or similar lightweight parser)
3. **Map to DB columns:**

| Frontmatter field | DB column | Notes |
|---|---|---|
| `status` | `pages.status` | draft / published / archived |
| `order` | `pages.sort_order` | Integer, controls sidebar position |
| `parent` | `pages.parent_id` | Slug of parent page — resolve to ID |
| `author` | `pages.created_by` | claude / user / both |
| `created` | `pages.created_at` | ISO date |
| `updated` | `pages.updated_at` | ISO date |
| `title` | `pages.title` | Override auto-generated title from filename |
| `tags` | (future) | Store in metadata JSONB or new table — capture now, use later |

4. **Strip frontmatter from content** — store only the body in `content_cache`, not the YAML block
5. **Preserve round-trip** — when the web editor saves back to vault, re-add frontmatter to the file
6. **Handle missing frontmatter** — files without frontmatter work exactly as they do today (no regression)

## Example

```markdown
---
status: draft
order: 2
author: claude
title: Architecture Overview
tags: [infrastructure, deployment]
---

# Architecture Overview

Content here...
```

## Tests

- File with frontmatter: fields parsed and mapped to DB columns
- File without frontmatter: works as before (no regression)
- Frontmatter with unknown fields: ignored, no error
- Round-trip: edit in web UI → save to vault → frontmatter preserved
- Content stored without frontmatter block (no YAML in content_cache)

## Done when

- [ ] Vault sync parses frontmatter and sets DB fields
- [ ] Existing vault files without frontmatter continue to work
- [ ] Web editor preserves frontmatter on save
- [ ] Tests cover all cases above
- [ ] Deployed to staging and verified
