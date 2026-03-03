-- ============================================================
-- Migration 003: Page version history
-- Creates page_versions table for tracking changes to pages.
-- Separate from asset_versions (assets and pages are distinct types).
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_base.page_versions (
  id          BIGSERIAL PRIMARY KEY,
  page_id     BIGINT NOT NULL REFERENCES knowledge_base.pages(id) ON DELETE CASCADE,
  content     TEXT,
  change_summary TEXT NOT NULL DEFAULT 'Updated',
  changed_by  TEXT NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_versions_page_id
  ON knowledge_base.page_versions(page_id, created_at DESC);
