# Implementation Plan — KB Frontmatter Metadata Parsing (#35)

**Master Todo:** #35
**Spec:** `prompts/session-frontmatter-parsing.md`
**Depends on:** Nothing
**Blocks:** #36 (page ordering), #13 (drag-to-reorder)
**Version:** v2.0.1 (patch)

---

## Task 1: Add js-yaml dependency

- spec: session-frontmatter-parsing.md § REQ-1 — Parse YAML frontmatter
- files: `package.json` (MODIFY)
- action: `npm install js-yaml`
- acceptance: WHEN `require('js-yaml')` is called THEN it resolves without error

## Task 2: Schema migration — add 'archived' to status CHECK

- spec: session-frontmatter-parsing.md § REQ-2 — Status field supports draft/published/archived
- files: `scripts/migrations/003_archived_status.sql` (CREATE), `scripts/migrate.sql` (reference only)
- code: `ALTER TABLE knowledge_base.pages DROP CONSTRAINT IF EXISTS pages_status_check; ALTER TABLE knowledge_base.pages ADD CONSTRAINT pages_status_check CHECK (status IN ('published', 'draft', 'archived'));`
- test: `npm test` — existing tests pass; new test confirms 'archived' status accepted
- acceptance: WHEN a page is inserted with `status = 'archived'` THEN the INSERT succeeds AND WHEN `status = 'invalid'` THEN the INSERT fails

## Task 3: Create frontmatter parser utility

- spec: session-frontmatter-parsing.md § REQ-1 — Parse YAML frontmatter from .md files
- files: `services/vault-sync.js` (MODIFY — add parseFrontmatter, stripFrontmatter, serializeFrontmatter functions)
- code:
  - `parseFrontmatter(content)` → returns `{ data: {}, content: strippedBody }`
  - `serializeFrontmatter(metadata, body)` → returns full file content with `---` delimiters
  - Handles files with no frontmatter (returns empty data, full content)
  - Handles empty frontmatter block (`---\n---`)
  - Maps frontmatter keys to DB columns: `order→sort_order`, `status→status`, `parent→parent_id` (slug→ID lookup), `author→created_by`, `title→title`, `created→created_at`, `updated→updated_at`, `tags→metadata (future)`
- test: Unit tests for parseFrontmatter with various inputs (valid YAML, no frontmatter, empty block, malformed)
- acceptance: WHEN content starts with `---\n` THEN frontmatter is extracted AND body is returned without delimiters AND WHEN content has no frontmatter THEN data is empty object and content is unchanged

## Task 4: Update handleAdd — parse frontmatter on new page creation

- spec: session-frontmatter-parsing.md § REQ-3 — Vault sync maps frontmatter fields to DB columns
- files: `services/vault-sync.js` (MODIFY — handleAdd function, lines 118–149)
- code:
  - Parse frontmatter from content before INSERT
  - Map parsed fields to INSERT columns (title, status, created_by, sort_order, created_at, updated_at)
  - Store stripped body (no frontmatter) in content_cache
  - Resolve `parent` slug to parent_id via DB lookup
  - If `title` in frontmatter, use it instead of filename-derived title
  - Fallback: if no sort_order in frontmatter, use MAX(sort_order) + 10 for the section (gapped numbering for #36)
- test: handleAdd with frontmatter content → verify DB columns match frontmatter values; handleAdd without frontmatter → verify defaults unchanged
- acceptance: WHEN a vault file with `order: 30` frontmatter is added THEN the page gets sort_order=30 AND WHEN frontmatter has `status: draft` THEN page status is 'draft' AND WHEN no frontmatter exists THEN behavior is unchanged from current

## Task 5: Update handleChange — parse frontmatter on file update

- spec: session-frontmatter-parsing.md § REQ-3 — Vault sync maps frontmatter fields to DB columns
- files: `services/vault-sync.js` (MODIFY — handleChange function, lines 97–115)
- code:
  - Parse frontmatter from updated content
  - Update content_cache with stripped body
  - Update any changed metadata columns (status, sort_order, title, created_by, updated_at)
  - Build dynamic SET clause for only the fields present in frontmatter
- test: handleChange with updated frontmatter → verify DB columns reflect new values
- acceptance: WHEN a vault file is changed and frontmatter `status` changes from published to draft THEN the DB page status updates to draft

## Task 6: Round-trip — writeVaultFile prepends frontmatter

- spec: session-frontmatter-parsing.md § REQ-4 — Web editor saves re-add frontmatter when saving back to vault
- files: `services/pages.js` (MODIFY — writeVaultFile function lines 311–316, updatePage function lines 170–182)
- code:
  - writeVaultFile accepts optional metadata object
  - If metadata provided, serialize as YAML frontmatter and prepend to content
  - updatePage passes current page metadata (status, sort_order, created_by, title) to writeVaultFile
  - createPage also passes metadata when writing vault file
- test: Create page via API with status=draft → read vault file → verify frontmatter block present with `status: draft`
- acceptance: WHEN a page is saved via the web editor THEN the vault .md file contains YAML frontmatter with current metadata AND WHEN the file is re-synced THEN the same metadata is preserved (round-trip)

## Task 7: Update initial-vault-sync.js

- spec: session-frontmatter-parsing.md § REQ-3 — Vault sync maps frontmatter fields to DB columns
- files: `scripts/initial-vault-sync.js` (MODIFY — main loop lines 60–108)
- code:
  - After reading file content, parse frontmatter
  - Use extracted fields in INSERT statement
  - Store stripped body in content/content_cache
- test: Manual verification (script is run once)
- acceptance: WHEN initial-vault-sync processes a file with frontmatter THEN DB columns reflect frontmatter values

## Task 8: Test suite for frontmatter parsing

- spec: session-frontmatter-parsing.md § REQ-5 — Tests cover all cases
- files: `tests/vault-sync.test.js` (MODIFY — add frontmatter test section)
- tests to add:
  1. parseFrontmatter — valid YAML extracts data and strips body
  2. parseFrontmatter — no frontmatter returns empty data, full content
  3. parseFrontmatter — empty frontmatter block returns empty data
  4. parseFrontmatter — malformed YAML returns empty data, full content (no crash)
  5. serializeFrontmatter — generates valid YAML with delimiters
  6. handleAdd with frontmatter — DB columns match parsed values
  7. handleAdd without frontmatter — backward compatible (no regression)
  8. handleChange with frontmatter — metadata columns updated
  9. Round-trip — write page via API → read vault file → verify frontmatter preserved
  10. Parent slug resolution — `parent: some-slug` resolves to correct parent_id
- acceptance: WHEN `npm test` runs THEN all new and existing tests pass
