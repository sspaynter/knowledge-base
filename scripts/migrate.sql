-- ============================================================
-- Knowledge Platform — Database Migration
-- Run as: nocodb user on n8n-postgres container
-- Creates: knowledge_base schema and all tables
-- ============================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS knowledge_base;

-- Set search path for this migration session
SET search_path TO knowledge_base;

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.workspaces (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT 'folder',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.sections (
  id           SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES knowledge_base.workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT 'folder',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

-- ============================================================
-- PAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.pages (
  id            SERIAL PRIMARY KEY,
  section_id    INTEGER NOT NULL REFERENCES knowledge_base.sections(id) ON DELETE CASCADE,
  parent_id     INTEGER REFERENCES knowledge_base.pages(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  template_type TEXT NOT NULL DEFAULT 'blank',
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  created_by    TEXT NOT NULL DEFAULT 'user' CHECK (created_by IN ('claude', 'user', 'both')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED
);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.assets (
  id            SERIAL PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('skill','config','decision','session','image','file','link','miro')),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  file_path     TEXT,
  url           TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_by    TEXT NOT NULL DEFAULT 'user' CHECK (created_by IN ('claude', 'user')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(content, '')
    )
  ) STORED
);

-- ============================================================
-- ASSET VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.asset_versions (
  id             SERIAL PRIMARY KEY,
  asset_id       INTEGER NOT NULL REFERENCES knowledge_base.assets(id) ON DELETE CASCADE,
  version        TEXT NOT NULL,
  content        TEXT NOT NULL DEFAULT '',
  change_summary TEXT NOT NULL DEFAULT '',
  changed_by     TEXT NOT NULL DEFAULT 'user' CHECK (changed_by IN ('claude', 'user')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAGE ASSETS (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.page_assets (
  id           SERIAL PRIMARY KEY,
  page_id      INTEGER NOT NULL REFERENCES knowledge_base.pages(id) ON DELETE CASCADE,
  asset_id     INTEGER NOT NULL REFERENCES knowledge_base.assets(id) ON DELETE CASCADE,
  display_mode TEXT NOT NULL DEFAULT 'reference' CHECK (display_mode IN ('inline', 'reference')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(page_id, asset_id)
);

-- ============================================================
-- TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.templates (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  template_type   TEXT NOT NULL UNIQUE,
  default_content TEXT NOT NULL DEFAULT '',
  structure       JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ASSET RELATIONSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.asset_relationships (
  id                SERIAL PRIMARY KEY,
  from_asset_id     INTEGER NOT NULL REFERENCES knowledge_base.assets(id) ON DELETE CASCADE,
  to_asset_id       INTEGER NOT NULL REFERENCES knowledge_base.assets(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'loads','uses','generates','deploys-to','connects-to','supersedes','references'
  )),
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_asset_id, to_asset_id, relationship_type)
);

-- ============================================================
-- API TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.api_tokens (
  id          SERIAL PRIMARY KEY,
  label       TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES knowledge_base.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SETTINGS (key-value store)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base.settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Page tree queries
CREATE INDEX IF NOT EXISTS idx_pages_section   ON knowledge_base.pages(section_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent    ON knowledge_base.pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_deleted   ON knowledge_base.pages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pages_status    ON knowledge_base.pages(status);

-- Asset queries
CREATE INDEX IF NOT EXISTS idx_assets_type     ON knowledge_base.assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_metadata ON knowledge_base.assets USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_assets_deleted  ON knowledge_base.assets(deleted_at) WHERE deleted_at IS NULL;

-- Junction table
CREATE INDEX IF NOT EXISTS idx_page_assets_page  ON knowledge_base.page_assets(page_id);
CREATE INDEX IF NOT EXISTS idx_page_assets_asset ON knowledge_base.page_assets(asset_id);

-- Version history
CREATE INDEX IF NOT EXISTS idx_versions_asset ON knowledge_base.asset_versions(asset_id);

-- Relationship map
CREATE INDEX IF NOT EXISTS idx_rel_from ON knowledge_base.asset_relationships(from_asset_id);
CREATE INDEX IF NOT EXISTS idx_rel_to   ON knowledge_base.asset_relationships(to_asset_id);
CREATE INDEX IF NOT EXISTS idx_rel_type ON knowledge_base.asset_relationships(relationship_type);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_pages_fts  ON knowledge_base.pages  USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_assets_fts ON knowledge_base.assets USING GIN(search_vector);

-- Sessions lookup
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON knowledge_base.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON knowledge_base.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON knowledge_base.sessions(expires_at);
