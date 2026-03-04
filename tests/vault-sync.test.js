// tests/vault-sync.test.js
// Unit tests for vault-sync service.
// Tests handleAdd, handleChange, handleUnlink, inferLocationFromPath, and pure helpers.
// Uses real DB (same pattern as other test files). No filesystem mocking needed
// because handleAdd/handleChange/handleUnlink accept content as a parameter.

'use strict';

const db    = require('../services/database');
const {
  handleAdd,
  handleChange,
  handleUnlink,
  inferLocationFromPath,
  slugify,
  titleFromFilename,
} = require('../services/vault-sync');
const { parseFrontmatter } = require('../services/frontmatter');

const SCHEMA = 'knowledge_base';
const PREFIX = 'test-vault-sync';  // namespace all test data

// ── Cleanup helpers ──────────────────────────────────────────

async function cleanTestData() {
  const pool = db.getPool();
  await pool.query(`DELETE FROM ${SCHEMA}.pages    WHERE file_path LIKE '${PREFIX}/%'`);
  await pool.query(`DELETE FROM ${SCHEMA}.sections WHERE slug LIKE '${PREFIX}-%' OR workspace_id IN (
    SELECT id FROM ${SCHEMA}.workspaces WHERE slug LIKE '${PREFIX}-%'
  )`);
  await pool.query(`DELETE FROM ${SCHEMA}.workspaces WHERE slug LIKE '${PREFIX}-%'`);
}

beforeAll(async () => {
  await cleanTestData();
});

afterAll(async () => {
  await cleanTestData();
  // Pool closed by forceExit in jest.config.js
});

// ── Pure helpers ─────────────────────────────────────────────

describe('slugify', () => {
  test('lowercases input', () => {
    expect(slugify('Hello')).toBe('hello');
  });

  test('converts spaces to dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  test('preserves existing kebab-case', () => {
    expect(slugify('kp-feature-status')).toBe('kp-feature-status');
  });

  test('strips leading and trailing dashes', () => {
    expect(slugify('-hello-')).toBe('hello');
  });

  test('collapses multiple separators', () => {
    expect(slugify('a  b--c')).toBe('a-b-c');
  });

  test('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('titleFromFilename', () => {
  test('strips .md extension', () => {
    expect(titleFromFilename('overview.md')).toBe('Overview');
  });

  test('converts kebab-case to title case', () => {
    expect(titleFromFilename('kp-feature-status.md')).toBe('Kp Feature Status');
  });

  test('handles single word', () => {
    expect(titleFromFilename('readme.md')).toBe('Readme');
  });

  test('handles multiple dashes', () => {
    expect(titleFromFilename('cross-app-auth-architecture.md')).toBe('Cross App Auth Architecture');
  });
});

// ── inferLocationFromPath ────────────────────────────────────

describe('inferLocationFromPath', () => {
  test('creates workspace and section from a 3-part path', async () => {
    const rel = `${PREFIX}-ws/${PREFIX}-sec/page.md`;
    const { sectionId, title } = await inferLocationFromPath(rel);

    expect(typeof sectionId).toBe('number');
    expect(title).toBe('Page');

    // Verify workspace and section exist in DB
    const pool = db.getPool();
    const sec = await pool.query(
      `SELECT s.id, s.slug, w.slug AS ws_slug
       FROM ${SCHEMA}.sections s
       JOIN ${SCHEMA}.workspaces w ON w.id = s.workspace_id
       WHERE s.id = $1`,
      [sectionId]
    );
    expect(sec.rows).toHaveLength(1);
    expect(sec.rows[0].ws_slug).toBe(`${PREFIX}-ws`);
    expect(sec.rows[0].slug).toBe(`${PREFIX}-sec`);
  });

  test('is idempotent — returns same sectionId on second call', async () => {
    const rel = `${PREFIX}-ws/${PREFIX}-sec/another.md`;
    const first  = await inferLocationFromPath(rel);
    const second = await inferLocationFromPath(rel);
    expect(first.sectionId).toBe(second.sectionId);
  });

  test('root-level file uses general workspace and section', async () => {
    const { sectionId, title } = await inferLocationFromPath('Home.md');
    expect(typeof sectionId).toBe('number');
    expect(title).toBe('Home');
  });
});

// ── handleAdd ────────────────────────────────────────────────

describe('handleAdd', () => {
  test('creates a new page record', async () => {
    const rel     = `${PREFIX}-ws/${PREFIX}-sec/new-page.md`;
    const content = '# New Page\n\nHello world.';

    const pageId = await handleAdd(rel, content);
    expect(typeof pageId).toBe('number');

    const pool = db.getPool();
    const page = await pool.query(
      `SELECT title, slug, content_cache, file_path, deleted_at FROM ${SCHEMA}.pages WHERE id = $1`,
      [pageId]
    );
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].file_path).toBe(rel);
    expect(page.rows[0].content_cache).toBe(content);
    expect(page.rows[0].deleted_at).toBeNull();
    expect(page.rows[0].title).toBe('New Page');
  });

  test('restores a soft-deleted page rather than creating a duplicate', async () => {
    const rel     = `${PREFIX}-ws/${PREFIX}-sec/restore-me.md`;
    const content = '# Restored';

    // Create, then soft-delete it
    const firstId = await handleAdd(rel, content);
    await handleUnlink(rel);

    // Confirm it was soft-deleted
    const pool = db.getPool();
    const deleted = await pool.query(
      `SELECT deleted_at FROM ${SCHEMA}.pages WHERE id = $1`, [firstId]
    );
    expect(deleted.rows[0].deleted_at).not.toBeNull();

    // Add again — should restore
    const restoredId = await handleAdd(rel, '# Restored again');
    expect(restoredId).toBe(firstId);

    const restored = await pool.query(
      `SELECT deleted_at, content_cache FROM ${SCHEMA}.pages WHERE id = $1`, [firstId]
    );
    expect(restored.rows[0].deleted_at).toBeNull();
    expect(restored.rows[0].content_cache).toBe('# Restored again');
  });
});

// ── handleChange ─────────────────────────────────────────────

describe('handleChange', () => {
  test('updates content_cache for an existing page', async () => {
    const rel     = `${PREFIX}-ws/${PREFIX}-sec/change-me.md`;
    const initial = '# Initial';
    const updated = '# Updated content';

    const pageId = await handleAdd(rel, initial);
    await handleChange(rel, updated);

    const pool = db.getPool();
    const page = await pool.query(
      `SELECT content_cache FROM ${SCHEMA}.pages WHERE id = $1`, [pageId]
    );
    expect(page.rows[0].content_cache).toBe(updated);
  });

  test('creates a new page if no record exists for the path', async () => {
    const rel     = `${PREFIX}-ws/${PREFIX}-sec/change-create.md`;
    const content = '# Created via change';

    // No handleAdd first — simulate change event on unknown file
    await handleChange(rel, content);

    const pool = db.getPool();
    const page = await pool.query(
      `SELECT id, content_cache FROM ${SCHEMA}.pages WHERE file_path = $1`, [rel]
    );
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].content_cache).toBe(content);
  });
});

// ── handleUnlink ─────────────────────────────────────────────

describe('handleUnlink', () => {
  test('soft-deletes an existing page', async () => {
    const rel     = `${PREFIX}-ws/${PREFIX}-sec/delete-me.md`;
    const pageId  = await handleAdd(rel, '# Delete me');

    await handleUnlink(rel);

    const pool = db.getPool();
    const page = await pool.query(
      `SELECT deleted_at FROM ${SCHEMA}.pages WHERE id = $1`, [pageId]
    );
    expect(page.rows[0].deleted_at).not.toBeNull();
  });

  test('is a no-op when file path does not exist in DB', async () => {
    // Should not throw
    await expect(handleUnlink(`${PREFIX}-ws/nonexistent/ghost.md`)).resolves.toBeUndefined();
  });

  test('does not affect already-deleted page', async () => {
    const rel    = `${PREFIX}-ws/${PREFIX}-sec/double-delete.md`;
    const pageId = await handleAdd(rel, '# Double delete');

    await handleUnlink(rel);

    const pool = db.getPool();
    const first = await pool.query(
      `SELECT deleted_at FROM ${SCHEMA}.pages WHERE id = $1`, [pageId]
    );
    const firstDeleted = first.rows[0].deleted_at;

    // Second unlink — deleted_at should not change
    await new Promise(r => setTimeout(r, 10));  // ensure time passes
    await handleUnlink(rel);

    const second = await pool.query(
      `SELECT deleted_at FROM ${SCHEMA}.pages WHERE id = $1`, [pageId]
    );
    expect(second.rows[0].deleted_at.getTime()).toBe(firstDeleted.getTime());
  });
});

// ── Frontmatter integration ─────────────────────────────────

describe('handleAdd with frontmatter', () => {
  test('parses frontmatter and sets DB columns', async () => {
    const rel = `${PREFIX}-ws/${PREFIX}-sec/fm-add.md`;
    const content = '---\nstatus: published\norder: 20\nauthor: claude\ntitle: Custom Title\n---\n\n# Custom Title\n\nBody.';

    const pageId = await handleAdd(rel, content);
    const pool = db.getPool();
    const page = await pool.query(
      `SELECT title, status, created_by, sort_order, content_cache FROM ${SCHEMA}.pages WHERE id = $1`,
      [pageId]
    );

    expect(page.rows[0].title).toBe('Custom Title');
    expect(page.rows[0].status).toBe('published');
    expect(page.rows[0].created_by).toBe('claude');
    expect(page.rows[0].sort_order).toBe(20);
    // content_cache should NOT contain frontmatter
    expect(page.rows[0].content_cache).not.toContain('---');
    expect(page.rows[0].content_cache).toContain('# Custom Title');
  });

  test('works without frontmatter (backward compatible)', async () => {
    const rel = `${PREFIX}-ws/${PREFIX}-sec/fm-none.md`;
    const content = '# No Frontmatter\n\nJust a regular file.';

    const pageId = await handleAdd(rel, content);
    const pool = db.getPool();
    const page = await pool.query(
      `SELECT title, status, created_by, content_cache FROM ${SCHEMA}.pages WHERE id = $1`,
      [pageId]
    );

    expect(page.rows[0].title).toBe('Fm None');
    expect(page.rows[0].status).toBe('draft');
    expect(page.rows[0].created_by).toBe('user');
    expect(page.rows[0].content_cache).toBe(content);
  });

  test('assigns gapped sort_order when not in frontmatter', async () => {
    const rel1 = `${PREFIX}-ws/${PREFIX}-sec/fm-gap1.md`;
    const rel2 = `${PREFIX}-ws/${PREFIX}-sec/fm-gap2.md`;

    await handleAdd(rel1, '---\norder: 10\n---\n\n# First');
    const id2 = await handleAdd(rel2, '# Second (no frontmatter)');

    const pool = db.getPool();
    const page2 = await pool.query(
      `SELECT sort_order FROM ${SCHEMA}.pages WHERE id = $1`, [id2]
    );

    // Should be MAX(sort_order in section) + 10 = 20
    expect(page2.rows[0].sort_order).toBeGreaterThanOrEqual(20);
  });
});

describe('handleChange with frontmatter', () => {
  test('updates metadata columns from frontmatter', async () => {
    const rel = `${PREFIX}-ws/${PREFIX}-sec/fm-change.md`;
    await handleAdd(rel, '---\nstatus: draft\n---\n\n# Original');

    await handleChange(rel, '---\nstatus: published\norder: 50\n---\n\n# Updated');

    const pool = db.getPool();
    const page = await pool.query(
      `SELECT status, sort_order, content_cache FROM ${SCHEMA}.pages WHERE file_path = $1`,
      [rel]
    );

    expect(page.rows[0].status).toBe('published');
    expect(page.rows[0].sort_order).toBe(50);
    expect(page.rows[0].content_cache).not.toContain('---');
    expect(page.rows[0].content_cache).toContain('# Updated');
  });

  test('strips frontmatter from content_cache on change', async () => {
    const rel = `${PREFIX}-ws/${PREFIX}-sec/fm-strip.md`;
    await handleAdd(rel, '# Initial');

    await handleChange(rel, '---\ntitle: New Title\n---\n\n# New Title');

    const pool = db.getPool();
    const page = await pool.query(
      `SELECT title, content_cache FROM ${SCHEMA}.pages WHERE file_path = $1`,
      [rel]
    );

    expect(page.rows[0].title).toBe('New Title');
    expect(page.rows[0].content_cache).toBe('\n# New Title');
  });
});
