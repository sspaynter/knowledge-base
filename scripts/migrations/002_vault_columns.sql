-- ============================================================
-- Migration 002: Add vault columns to pages table
-- Adds file_path, content_cache, previous_paths for vault sync.
-- Regenerates search_vector to include content_cache.
-- ============================================================

-- Add vault columns
ALTER TABLE knowledge_base.pages
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS content_cache TEXT,
  ADD COLUMN IF NOT EXISTS previous_paths JSONB NOT NULL DEFAULT '[]';

-- Unique index on file_path (NULL values excluded — multiple NULLs allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_file_path
  ON knowledge_base.pages(file_path)
  WHERE file_path IS NOT NULL;

-- Regenerate search_vector to include content_cache.
-- PostgreSQL does not support ALTER on generated columns, so drop and re-add.
DROP INDEX IF EXISTS knowledge_base.idx_pages_fts;
ALTER TABLE knowledge_base.pages DROP COLUMN IF EXISTS search_vector;
ALTER TABLE knowledge_base.pages ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(content_cache, content, '')
  )
) STORED;
CREATE INDEX idx_pages_fts ON knowledge_base.pages USING GIN(search_vector);
