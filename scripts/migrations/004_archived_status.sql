-- Migration 004: Add 'archived' to pages status CHECK constraint
-- Required for frontmatter metadata parsing (#35)

ALTER TABLE knowledge_base.pages DROP CONSTRAINT IF EXISTS pages_status_check;
ALTER TABLE knowledge_base.pages ADD CONSTRAINT pages_status_check
  CHECK (status IN ('published', 'draft', 'archived'));
