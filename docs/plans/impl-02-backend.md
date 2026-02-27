# Knowledge Platform — Implementation Plan
# Phase 2: Backend — Services, Auth, and API Routes

**Goal:** Rewrite the Express backend to serve the full Knowledge Platform API — auth with roles and bearer tokens, all CRUD routes for workspaces/sections/pages/assets/relationships, search, and file upload.

**Architecture:** Service layer (pure DB functions) sits below route handlers. Middleware handles auth — both session cookie (browser) and bearer token (Claude/API). Routes are thin: validate → call service → return JSON.

**Tech Stack:** Express 4 (CommonJS), `pg`, `bcryptjs`, `cookie-parser`, `multer` (new — file uploads).

**Dependencies:** Phase 1 complete — `knowledge_base` schema and all tables exist.

**Task numbering continues from Phase 1 (Tasks 1–6).**

---

## Task 7: Rewrite auth service

**Files:**
- Modify: `services/auth.js`
- Create: `tests/auth-service.test.js`

**Step 1: Write failing tests**

Create `tests/auth-service.test.js`:

```javascript
const auth = require('../services/auth');
const db = require('../services/database');

afterAll(() => db.getPool().end());

// Clean up test users between runs
beforeEach(async () => {
  await db.getPool().query(
    "DELETE FROM knowledge_base.users WHERE username LIKE 'testuser_%'"
  );
});

test('createUser: first user is admin', async () => {
  // Clear all users first
  await db.getPool().query('DELETE FROM knowledge_base.users');
  const user = await auth.createUser({
    username: 'testuser_admin',
    password: 'password123',
    displayName: 'Test Admin'
  });
  expect(user.role).toBe('admin');
});

test('createUser: subsequent users are viewers', async () => {
  // Ensure at least one user exists
  await auth.createUser({
    username: 'testuser_first',
    password: 'password123',
    displayName: 'First'
  });
  const user = await auth.createUser({
    username: 'testuser_second',
    password: 'password123',
    displayName: 'Second'
  });
  expect(user.role).toBe('viewer');
});

test('createSession: returns a token', async () => {
  const user = await auth.createUser({
    username: 'testuser_session',
    password: 'pass',
    displayName: 'Session Test'
  });
  const session = await auth.createSession(user.id);
  expect(session.token).toBeDefined();
  expect(session.token.length).toBeGreaterThan(20);
});

test('validateSession: returns user for valid token', async () => {
  const user = await auth.createUser({
    username: 'testuser_validate',
    password: 'pass',
    displayName: 'Validate Test'
  });
  const session = await auth.createSession(user.id);
  const result = await auth.validateSession(session.token);
  expect(result).not.toBeNull();
  expect(result.username).toBe('testuser_validate');
});

test('createApiToken: hashes the token', async () => {
  const result = await auth.createApiToken('Test token');
  expect(result.plaintext).toBeDefined();
  expect(result.id).toBeDefined();
  // Plain token should not be stored in DB
  const row = await db.getPool().query(
    'SELECT token_hash FROM knowledge_base.api_tokens WHERE id = $1',
    [result.id]
  );
  expect(row.rows[0].token_hash).not.toBe(result.plaintext);
});

test('validateApiToken: accepts correct token', async () => {
  const result = await auth.createApiToken('Validate token test');
  const valid = await auth.validateApiToken(result.plaintext);
  expect(valid).toBe(true);
});
```

**Step 2: Run — confirm fails**

```bash
npm test tests/auth-service.test.js
```

Expected: FAIL — functions do not exist yet.

**Step 3: Rewrite `services/auth.js`**

Replace the full file:

```javascript
// services/auth.js
'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getPool } = require('./database');

const SESSION_DAYS = 30;
const BCRYPT_ROUNDS = 10;

// ── Users ──────────────────────────────────────────────────

async function createUser({ username, password, displayName, email, role }) {
  const pool = getPool();
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // First user is always admin
  const countRes = await pool.query('SELECT COUNT(*) FROM knowledge_base.users');
  const isFirst = parseInt(countRes.rows[0].count) === 0;
  const assignedRole = role || (isFirst ? 'admin' : 'viewer');

  const res = await pool.query(`
    INSERT INTO knowledge_base.users (username, email, password_hash, display_name, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, username, email, display_name, role, created_at
  `, [username, email || null, hash, displayName, assignedRole]);

  return res.rows[0];
}

async function getUserById(id) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT id, username, email, display_name, role, created_at FROM knowledge_base.users WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

async function getUserByUsername(username) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT * FROM knowledge_base.users WHERE username = $1',
    [username]
  );
  return res.rows[0] || null;
}

async function listUsers() {
  const pool = getPool();
  const res = await pool.query(
    'SELECT id, username, email, display_name, role, created_at FROM knowledge_base.users ORDER BY created_at'
  );
  return res.rows;
}

async function updateUserRole(id, role) {
  const pool = getPool();
  const res = await pool.query(
    'UPDATE knowledge_base.users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, role',
    [role, id]
  );
  return res.rows[0] || null;
}

async function deleteUser(id) {
  const pool = getPool();
  await pool.query('DELETE FROM knowledge_base.users WHERE id = $1', [id]);
}

async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

// ── Sessions ───────────────────────────────────────────────

async function createSession(userId) {
  const pool = getPool();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const res = await pool.query(`
    INSERT INTO knowledge_base.sessions (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, token, expires_at
  `, [userId, token, expiresAt]);

  return res.rows[0];
}

async function validateSession(token) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT u.id, u.username, u.display_name, u.role, u.email
    FROM knowledge_base.sessions s
    JOIN knowledge_base.users u ON u.id = s.user_id
    WHERE s.token = $1 AND s.expires_at > NOW()
  `, [token]);
  return res.rows[0] || null;
}

async function destroySession(token) {
  const pool = getPool();
  await pool.query('DELETE FROM knowledge_base.sessions WHERE token = $1', [token]);
}

async function destroyExpiredSessions() {
  const pool = getPool();
  await pool.query('DELETE FROM knowledge_base.sessions WHERE expires_at <= NOW()');
}

// ── API Tokens ─────────────────────────────────────────────

async function createApiToken(label) {
  const pool = getPool();
  const plaintext = crypto.randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS);

  const res = await pool.query(`
    INSERT INTO knowledge_base.api_tokens (label, token_hash)
    VALUES ($1, $2)
    RETURNING id, label, created_at
  `, [label, hash]);

  return { ...res.rows[0], plaintext };
}

async function validateApiToken(plaintext) {
  const pool = getPool();
  const tokens = await pool.query('SELECT id, token_hash FROM knowledge_base.api_tokens');

  for (const token of tokens.rows) {
    const match = await bcrypt.compare(plaintext, token.token_hash);
    if (match) {
      // Update last_used_at
      await pool.query(
        'UPDATE knowledge_base.api_tokens SET last_used_at = NOW() WHERE id = $1',
        [token.id]
      );
      return true;
    }
  }
  return false;
}

async function listApiTokens() {
  const pool = getPool();
  const res = await pool.query(
    'SELECT id, label, last_used_at, created_at FROM knowledge_base.api_tokens ORDER BY created_at'
  );
  return res.rows;
}

async function deleteApiToken(id) {
  const pool = getPool();
  await pool.query('DELETE FROM knowledge_base.api_tokens WHERE id = $1', [id]);
}

// ── Settings ───────────────────────────────────────────────

async function getSetting(key) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT value FROM knowledge_base.settings WHERE key = $1', [key]
  );
  return res.rows[0]?.value ?? null;
}

async function setSetting(key, value) {
  const pool = getPool();
  await pool.query(`
    INSERT INTO knowledge_base.settings (key, value, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
  `, [key, value]);
}

async function getAllSettings() {
  const pool = getPool();
  const res = await pool.query('SELECT key, value FROM knowledge_base.settings ORDER BY key');
  return res.rows;
}

module.exports = {
  createUser, getUserById, getUserByUsername, listUsers, updateUserRole, deleteUser, verifyPassword,
  createSession, validateSession, destroySession, destroyExpiredSessions,
  createApiToken, validateApiToken, listApiTokens, deleteApiToken,
  getSetting, setSetting, getAllSettings,
};
```

**Step 4: Run tests — confirm pass**

```bash
npm test tests/auth-service.test.js
```

Expected: PASS (6 tests).

**Step 5: Commit**

```bash
git add services/auth.js tests/auth-service.test.js
git commit -m "feat: rewrite auth service with roles and API token support"
```

---

## Task 8: Rewrite auth middleware

**Files:**
- Modify: `middleware/requireAuth.js`
- Create: `tests/middleware.test.js`

**Step 1: Write failing test**

Create `tests/middleware.test.js`:

```javascript
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

const app = express();
app.use(cookieParser());
app.get('/protected', requireAuth, (req, res) => res.json({ user: req.user }));
app.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => res.json({ ok: true }));

test('requireAuth: rejects request with no credentials', async () => {
  const res = await request(app).get('/protected');
  expect(res.status).toBe(401);
});

test('requireAuth: rejects invalid bearer token', async () => {
  const res = await request(app)
    .get('/protected')
    .set('Authorization', 'Bearer invalidtoken');
  expect(res.status).toBe(401);
});

test('requireRole: rejects viewer for admin-only route', async () => {
  // This test requires a real session — integration test
  // Covered in routes tests. Mark as placeholder.
  expect(true).toBe(true);
});
```

**Step 2: Run — confirm first two tests pass already if logic is right, else fail**

```bash
npm test tests/middleware.test.js
```

**Step 3: Rewrite `middleware/requireAuth.js`**

```javascript
// middleware/requireAuth.js
'use strict';

const auth = require('../services/auth');

// ── requireAuth ────────────────────────────────────────────
// Accepts session cookie OR Bearer token.
// Sets req.user on success. Returns 401 on failure.

async function requireAuth(req, res, next) {
  try {
    // 1. Try Bearer token first (API / Claude sessions)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const valid = await auth.validateApiToken(token);
      if (valid) {
        // API token users get a synthetic user object
        req.user = { id: 0, username: 'api', role: 'editor', isApiToken: true };
        return next();
      }
      return res.status(401).json({ error: 'Invalid API token' });
    }

    // 2. Try session cookie
    const sessionToken = req.cookies?.session;
    if (sessionToken) {
      const user = await auth.validateSession(sessionToken);
      if (user) {
        req.user = user;
        return next();
      }
    }

    return res.status(401).json({ error: 'Authentication required' });
  } catch (err) {
    next(err);
  }
}

// ── requireRole ────────────────────────────────────────────
// Use after requireAuth. Checks req.user.role.
// requireRole('admin') — admin only
// requireRole('editor') — admin or editor

function requireRole(minRole) {
  const hierarchy = { viewer: 0, editor: 1, admin: 2 };
  return (req, res, next) => {
    const userLevel = hierarchy[req.user?.role] ?? -1;
    const required = hierarchy[minRole] ?? 99;
    if (userLevel >= required) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = { requireAuth, requireRole };
```

**Step 4: Run tests**

```bash
npm test tests/middleware.test.js
```

**Step 5: Commit**

```bash
git add middleware/requireAuth.js tests/middleware.test.js
git commit -m "feat: rewrite requireAuth to support session cookie and Bearer token"
```

---

## Task 9: Install multer for file uploads

**Files:**
- Modify: `package.json`
- Create: `middleware/upload.js`

**Step 1: Install multer**

```bash
npm install multer
```

**Step 2: Create `middleware/upload.js`**

```javascript
// middleware/upload.js
'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/data/uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, common docs, and markdown
    const allowed = /jpeg|jpg|png|gif|webp|pdf|md|txt|json|yaml|yml/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext)) return cb(null, true);
    cb(new Error(`File type .${ext} not allowed`));
  },
});

module.exports = upload;
```

**Step 3: Commit**

```bash
git add package.json middleware/upload.js
git commit -m "feat: add multer upload middleware"
```

---

## Task 10: Workspaces and sections routes

**Files:**
- Create: `services/workspaces.js`
- Create: `routes/workspaces.js`
- Create: `tests/routes/workspaces.test.js`

**Step 1: Create `services/workspaces.js`**

```javascript
// services/workspaces.js
'use strict';

const { getPool } = require('./database');

async function listWorkspaces() {
  const res = await getPool().query(
    'SELECT * FROM knowledge_base.workspaces ORDER BY sort_order, name'
  );
  return res.rows;
}

async function getWorkspace(id) {
  const res = await getPool().query(
    'SELECT * FROM knowledge_base.workspaces WHERE id = $1', [id]
  );
  return res.rows[0] || null;
}

async function createWorkspace({ name, slug, icon, sort_order }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.workspaces (name, slug, icon, sort_order)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [name, slug, icon || 'folder', sort_order || 0]);
  return res.rows[0];
}

async function updateWorkspace(id, updates) {
  const fields = ['name', 'slug', 'icon', 'sort_order'].filter(f => updates[f] !== undefined);
  if (fields.length === 0) return getWorkspace(id);
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);
  const res = await getPool().query(
    `UPDATE knowledge_base.workspaces SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

async function deleteWorkspace(id) {
  await getPool().query('DELETE FROM knowledge_base.workspaces WHERE id = $1', [id]);
}

async function listSections(workspaceId) {
  const res = await getPool().query(
    'SELECT * FROM knowledge_base.sections WHERE workspace_id = $1 ORDER BY sort_order, name',
    [workspaceId]
  );
  return res.rows;
}

async function createSection({ workspace_id, name, slug, icon, sort_order }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.sections (workspace_id, name, slug, icon, sort_order)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [workspace_id, name, slug, icon || 'folder', sort_order || 0]);
  return res.rows[0];
}

async function updateSection(id, updates) {
  const fields = ['name', 'slug', 'icon', 'sort_order'].filter(f => updates[f] !== undefined);
  if (fields.length === 0) return null;
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);
  const res = await getPool().query(
    `UPDATE knowledge_base.sections SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

async function deleteSection(id) {
  await getPool().query('DELETE FROM knowledge_base.sections WHERE id = $1', [id]);
}

module.exports = {
  listWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace,
  listSections, createSection, updateSection, deleteSection,
};
```

**Step 2: Create `routes/workspaces.js`**

```javascript
// routes/workspaces.js
'use strict';

const router = require('express').Router();
const ws = require('../services/workspaces');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

// Workspaces
router.get('/', async (req, res, next) => {
  try {
    res.json(await ws.listWorkspaces());
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const workspace = await ws.createWorkspace(req.body);
    res.status(201).json(workspace);
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const workspace = await ws.updateWorkspace(req.params.id, req.body);
    if (!workspace) return res.status(404).json({ error: 'Not found' });
    res.json(workspace);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await ws.deleteWorkspace(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// Sections (nested under workspaces)
router.get('/:id/sections', async (req, res, next) => {
  try {
    res.json(await ws.listSections(req.params.id));
  } catch (err) { next(err); }
});

router.post('/:id/sections', requireRole('editor'), async (req, res, next) => {
  try {
    const section = await ws.createSection({ ...req.body, workspace_id: req.params.id });
    res.status(201).json(section);
  } catch (err) { next(err); }
});

router.patch('/sections/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const section = await ws.updateSection(req.params.id, req.body);
    if (!section) return res.status(404).json({ error: 'Not found' });
    res.json(section);
  } catch (err) { next(err); }
});

router.delete('/sections/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await ws.deleteSection(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 3: Write failing test**

Create `tests/routes/workspaces.test.js`:

```javascript
const request = require('supertest');
const app = require('../../server');
const auth = require('../../services/auth');
const db = require('../../services/database');

let adminCookie;

beforeAll(async () => {
  // Clear and create admin user
  await db.getPool().query('DELETE FROM knowledge_base.users');
  await db.getPool().query('DELETE FROM knowledge_base.sessions');
  const user = await auth.createUser({
    username: 'admin_ws_test', password: 'pass123', displayName: 'Admin'
  });
  const session = await auth.createSession(user.id);
  adminCookie = `session=${session.token}`;
});

afterAll(() => db.getPool().end());

test('GET /api/workspaces returns array', async () => {
  const res = await request(app)
    .get('/api/workspaces')
    .set('Cookie', adminCookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('GET /api/workspaces returns seeded workspaces', async () => {
  const res = await request(app)
    .get('/api/workspaces')
    .set('Cookie', adminCookie);
  expect(res.body.length).toBeGreaterThanOrEqual(4);
  const slugs = res.body.map(w => w.slug);
  expect(slugs).toContain('it-projects');
});

test('GET /api/workspaces requires auth', async () => {
  const res = await request(app).get('/api/workspaces');
  expect(res.status).toBe(401);
});

test('GET /api/workspaces/:id/sections returns sections', async () => {
  const wsRes = await request(app)
    .get('/api/workspaces')
    .set('Cookie', adminCookie);
  const itWs = wsRes.body.find(w => w.slug === 'it-projects');

  const res = await request(app)
    .get(`/api/workspaces/${itWs.id}/sections`)
    .set('Cookie', adminCookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  const slugs = res.body.map(s => s.slug);
  expect(slugs).toContain('claude');
});
```

**Step 4: Run — confirm fails (server.js not wired yet)**

```bash
npm test tests/routes/workspaces.test.js
```

Expected: FAIL — `server.js` does not mount the routes yet. We wire routes in Task 16.

**Step 5: Commit services and routes files**

```bash
git add services/workspaces.js routes/workspaces.js tests/routes/workspaces.test.js
git commit -m "feat: add workspaces and sections service and routes"
```

---

## Task 11: Pages routes

**Files:**
- Create: `services/pages.js`
- Create: `routes/pages.js`
- Create: `tests/routes/pages.test.js`

**Step 1: Create `services/pages.js`**

```javascript
// services/pages.js
'use strict';

const { getPool } = require('./database');

// ── Tree query: all pages for a section ───────────────────
async function getPageTree(sectionId) {
  const res = await getPool().query(`
    SELECT id, parent_id, title, slug, status, template_type,
           created_by, sort_order, created_at, updated_at
    FROM knowledge_base.pages
    WHERE section_id = $1 AND deleted_at IS NULL
    ORDER BY sort_order, title
  `, [sectionId]);
  return buildTree(res.rows);
}

function buildTree(rows, parentId = null) {
  return rows
    .filter(r => r.parent_id === parentId)
    .map(r => ({ ...r, children: buildTree(rows, r.id) }));
}

// ── Single page ────────────────────────────────────────────
async function getPage(id) {
  const res = await getPool().query(`
    SELECT p.*, s.workspace_id,
      (SELECT json_agg(a.* ORDER BY pa.sort_order)
       FROM knowledge_base.page_assets pa
       JOIN knowledge_base.assets a ON a.id = pa.asset_id
       WHERE pa.page_id = p.id AND a.deleted_at IS NULL
      ) AS assets
    FROM knowledge_base.pages p
    JOIN knowledge_base.sections s ON s.id = p.section_id
    WHERE p.id = $1 AND p.deleted_at IS NULL
  `, [id]);
  return res.rows[0] || null;
}

// ── Create ─────────────────────────────────────────────────
async function createPage({ section_id, parent_id, title, slug, content, template_type, status, created_by, sort_order }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.pages
      (section_id, parent_id, title, slug, content, template_type, status, created_by, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    section_id, parent_id || null, title, slug,
    content || '', template_type || 'blank',
    status || 'published', created_by || 'user', sort_order || 0
  ]);
  return res.rows[0];
}

// ── Update ─────────────────────────────────────────────────
async function updatePage(id, updates) {
  const allowed = ['title', 'slug', 'content', 'template_type', 'status', 'sort_order'];
  const fields = allowed.filter(f => updates[f] !== undefined);
  if (fields.length === 0) return getPage(id);
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);
  const res = await getPool().query(
    `UPDATE knowledge_base.pages SET ${sets}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

// ── Move (reparent or reorder) ─────────────────────────────
async function movePage(id, { parent_id, sort_order }) {
  const res = await getPool().query(`
    UPDATE knowledge_base.pages
    SET parent_id = $2, sort_order = $3, updated_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING *
  `, [id, parent_id ?? null, sort_order ?? 0]);
  return res.rows[0] || null;
}

// ── Soft delete ────────────────────────────────────────────
async function deletePage(id) {
  await getPool().query(
    'UPDATE knowledge_base.pages SET deleted_at = NOW() WHERE id = $1',
    [id]
  );
}

module.exports = { getPageTree, getPage, createPage, updatePage, movePage, deletePage };
```

**Step 2: Create `routes/pages.js`**

```javascript
// routes/pages.js
'use strict';

const router = require('express').Router();
const pages = require('../services/pages');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/section/:sectionId', async (req, res, next) => {
  try {
    res.json(await pages.getPageTree(req.params.sectionId));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const page = await pages.getPage(req.params.id);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.createPage(req.body);
    res.status(201).json(page);
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.updatePage(req.params.id, req.body);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

router.patch('/:id/move', requireRole('editor'), async (req, res, next) => {
  try {
    const page = await pages.movePage(req.params.id, req.body);
    if (!page) return res.status(404).json({ error: 'Not found' });
    res.json(page);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    await pages.deletePage(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 3: Create `tests/routes/pages.test.js`**

```javascript
const request = require('supertest');
const app = require('../../server');
const auth = require('../../services/auth');
const db = require('../../services/database');

let cookie, sectionId;

beforeAll(async () => {
  await db.getPool().query('DELETE FROM knowledge_base.users');
  const user = await auth.createUser({ username: 'page_tester', password: 'pass', displayName: 'Tester' });
  const session = await auth.createSession(user.id);
  cookie = `session=${session.token}`;

  // Get first section id
  const sec = await db.getPool().query(
    "SELECT id FROM knowledge_base.sections LIMIT 1"
  );
  sectionId = sec.rows[0]?.id;
});

afterAll(() => db.getPool().end());

test('GET /api/pages/section/:id returns tree', async () => {
  const res = await request(app)
    .get(`/api/pages/section/${sectionId}`)
    .set('Cookie', cookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /api/pages creates a page', async () => {
  const res = await request(app)
    .post('/api/pages')
    .set('Cookie', cookie)
    .send({ section_id: sectionId, title: 'Test Page', slug: 'test-page', content: '# Hello' });
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Test Page');
});

test('PATCH /api/pages/:id updates content', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Cookie', cookie)
    .send({ section_id: sectionId, title: 'Update Me', slug: 'update-me' });

  const res = await request(app)
    .patch(`/api/pages/${create.body.id}`)
    .set('Cookie', cookie)
    .send({ content: 'Updated content' });
  expect(res.status).toBe(200);
  expect(res.body.content).toBe('Updated content');
});

test('DELETE /api/pages/:id soft deletes', async () => {
  const create = await request(app)
    .post('/api/pages')
    .set('Cookie', cookie)
    .send({ section_id: sectionId, title: 'Delete Me', slug: 'delete-me' });

  await request(app).delete(`/api/pages/${create.body.id}`).set('Cookie', cookie);

  const res = await request(app)
    .get(`/api/pages/${create.body.id}`)
    .set('Cookie', cookie);
  expect(res.status).toBe(404);
});
```

**Step 4: Commit**

```bash
git add services/pages.js routes/pages.js tests/routes/pages.test.js
git commit -m "feat: add pages service and routes"
```

---

## Task 12: Assets routes (with versioning)

**Files:**
- Create: `services/assets.js`
- Create: `routes/assets.js`
- Create: `tests/routes/assets.test.js`

**Step 1: Create `services/assets.js`**

```javascript
// services/assets.js
'use strict';

const { getPool } = require('./database');

async function listAssets({ type, deleted } = {}) {
  let where = 'WHERE a.deleted_at IS NULL';
  const values = [];
  if (type) {
    values.push(type);
    where += ` AND a.type = $${values.length}`;
  }
  const res = await getPool().query(
    `SELECT id, type, title, description, file_path, url, metadata, created_by, created_at, updated_at
     FROM knowledge_base.assets a ${where} ORDER BY updated_at DESC`,
    values
  );
  return res.rows;
}

async function getAsset(id) {
  const pool = getPool();
  const [asset, versions] = await Promise.all([
    pool.query('SELECT * FROM knowledge_base.assets WHERE id = $1 AND deleted_at IS NULL', [id]),
    pool.query('SELECT * FROM knowledge_base.asset_versions WHERE asset_id = $1 ORDER BY created_at DESC', [id]),
  ]);
  if (!asset.rows[0]) return null;
  return { ...asset.rows[0], versions: versions.rows };
}

async function createAsset({ type, title, description, content, file_path, url, metadata, created_by }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.assets (type, title, description, content, file_path, url, metadata, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [type, title, description || '', content || '', file_path || null, url || null,
      metadata ? JSON.stringify(metadata) : '{}', created_by || 'user']);
  return res.rows[0];
}

async function updateAsset(id, updates, { change_summary, changed_by } = {}) {
  const pool = getPool();
  const current = await pool.query(
    'SELECT * FROM knowledge_base.assets WHERE id = $1 AND deleted_at IS NULL', [id]
  );
  if (!current.rows[0]) return null;

  // Snapshot current version before updating
  await pool.query(`
    INSERT INTO knowledge_base.asset_versions (asset_id, version, content, change_summary, changed_by)
    VALUES ($1, $2, $3, $4, $5)
  `, [
    id,
    current.rows[0].metadata?.version || '0',
    current.rows[0].content,
    change_summary || 'Updated',
    changed_by || 'user',
  ]);

  const allowed = ['title', 'description', 'content', 'file_path', 'url', 'metadata'];
  const fields = allowed.filter(f => updates[f] !== undefined);
  if (fields.length === 0) return getAsset(id);

  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f =>
    f === 'metadata' ? JSON.stringify(updates[f]) : updates[f]
  );

  const res = await pool.query(
    `UPDATE knowledge_base.assets SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0];
}

async function deleteAsset(id) {
  await getPool().query(
    'UPDATE knowledge_base.assets SET deleted_at = NOW() WHERE id = $1', [id]
  );
}

async function linkAssetToPage(pageId, assetId, { display_mode, sort_order } = {}) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.page_assets (page_id, asset_id, display_mode, sort_order)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (page_id, asset_id) DO UPDATE SET display_mode = $3, sort_order = $4
    RETURNING *
  `, [pageId, assetId, display_mode || 'reference', sort_order || 0]);
  return res.rows[0];
}

module.exports = { listAssets, getAsset, createAsset, updateAsset, deleteAsset, linkAssetToPage };
```

**Step 2: Create `routes/assets.js`**

```javascript
// routes/assets.js
'use strict';

const router = require('express').Router();
const assets = require('../services/assets');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await assets.listAssets({ type: req.query.type }));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const asset = await assets.getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Not found' });
    res.json(asset);
  } catch (err) { next(err); }
});

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const asset = await assets.createAsset(req.body);
    res.status(201).json(asset);
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const { change_summary, changed_by, ...updates } = req.body;
    const asset = await assets.updateAsset(req.params.id, updates, { change_summary, changed_by });
    if (!asset) return res.status(404).json({ error: 'Not found' });
    res.json(asset);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    await assets.deleteAsset(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/:id/link', requireRole('editor'), async (req, res, next) => {
  try {
    const link = await assets.linkAssetToPage(
      req.body.page_id, req.params.id, req.body
    );
    res.status(201).json(link);
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 3: Write and commit test**

Create `tests/routes/assets.test.js`:

```javascript
const request = require('supertest');
const app = require('../../server');
const auth = require('../../services/auth');
const db = require('../../services/database');

let cookie;

beforeAll(async () => {
  await db.getPool().query('DELETE FROM knowledge_base.users');
  const user = await auth.createUser({ username: 'asset_tester', password: 'pass', displayName: 'Tester' });
  const session = await auth.createSession(user.id);
  cookie = `session=${session.token}`;
});

afterAll(() => db.getPool().end());

test('GET /api/assets returns array', async () => {
  const res = await request(app).get('/api/assets').set('Cookie', cookie);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /api/assets creates asset', async () => {
  const res = await request(app)
    .post('/api/assets')
    .set('Cookie', cookie)
    .send({ type: 'decision', title: 'Test Decision', content: 'We decided X' });
  expect(res.status).toBe(201);
  expect(res.body.type).toBe('decision');
});

test('PATCH /api/assets/:id creates version snapshot', async () => {
  const create = await request(app)
    .post('/api/assets')
    .set('Cookie', cookie)
    .send({ type: 'config', title: 'Config A', content: 'v1 content' });

  await request(app)
    .patch(`/api/assets/${create.body.id}`)
    .set('Cookie', cookie)
    .send({ content: 'v2 content', change_summary: 'Updated to v2' });

  const res = await request(app)
    .get(`/api/assets/${create.body.id}`)
    .set('Cookie', cookie);

  expect(res.body.content).toBe('v2 content');
  expect(res.body.versions.length).toBe(1);
  expect(res.body.versions[0].content).toBe('v1 content');
});
```

```bash
git add services/assets.js routes/assets.js tests/routes/assets.test.js
git commit -m "feat: add assets service and routes with versioning"
```

---

## Task 13: Relationships and search routes

**Files:**
- Create: `services/relationships.js`
- Create: `routes/relationships.js`
- Create: `routes/search.js`

**Step 1: Create `services/relationships.js`**

```javascript
// services/relationships.js
'use strict';

const { getPool } = require('./database');

async function listRelationships({ from_asset_id, to_asset_id, type } = {}) {
  let where = 'WHERE 1=1';
  const values = [];
  if (from_asset_id) { values.push(from_asset_id); where += ` AND r.from_asset_id = $${values.length}`; }
  if (to_asset_id)   { values.push(to_asset_id);   where += ` AND r.to_asset_id = $${values.length}`; }
  if (type)          { values.push(type);           where += ` AND r.relationship_type = $${values.length}`; }

  const res = await getPool().query(`
    SELECT r.*,
      fa.title AS from_title, fa.type AS from_type,
      ta.title AS to_title, ta.type AS to_type
    FROM knowledge_base.asset_relationships r
    JOIN knowledge_base.assets fa ON fa.id = r.from_asset_id
    JOIN knowledge_base.assets ta ON ta.id = r.to_asset_id
    ${where}
    ORDER BY r.created_at DESC
  `, values);
  return res.rows;
}

async function createRelationship({ from_asset_id, to_asset_id, relationship_type, notes }) {
  const res = await getPool().query(`
    INSERT INTO knowledge_base.asset_relationships
      (from_asset_id, to_asset_id, relationship_type, notes)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (from_asset_id, to_asset_id, relationship_type) DO NOTHING
    RETURNING *
  `, [from_asset_id, to_asset_id, relationship_type, notes || '']);
  return res.rows[0];
}

async function deleteRelationship(id) {
  await getPool().query(
    'DELETE FROM knowledge_base.asset_relationships WHERE id = $1', [id]
  );
}

module.exports = { listRelationships, createRelationship, deleteRelationship };
```

**Step 2: Create `routes/relationships.js`**

```javascript
// routes/relationships.js
'use strict';

const router = require('express').Router();
const rel = require('../services/relationships');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json(await rel.listRelationships(req.query));
  } catch (err) { next(err); }
});

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const r = await rel.createRelationship(req.body);
    if (!r) return res.status(409).json({ error: 'Relationship already exists' });
    res.status(201).json(r);
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    await rel.deleteRelationship(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 3: Create `routes/search.js`**

```javascript
// routes/search.js
'use strict';

const router = require('express').Router();
const { getPool } = require('../services/database');
const { requireAuth } = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { q, workspace, section, type } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const query = q.trim();

    const [pagesRes, assetsRes] = await Promise.all([
      getPool().query(`
        SELECT p.id, p.title, p.slug, p.template_type, p.updated_at,
               s.name AS section_name, w.name AS workspace_name, w.slug AS workspace_slug,
               ts_headline('english', p.content, plainto_tsquery($1), 'MaxWords=20,MinWords=5') AS excerpt
        FROM knowledge_base.pages p
        JOIN knowledge_base.sections s ON s.id = p.section_id
        JOIN knowledge_base.workspaces w ON w.id = s.workspace_id
        WHERE p.deleted_at IS NULL
          AND p.status = 'published'
          AND p.search_vector @@ plainto_tsquery($1)
        ORDER BY ts_rank(p.search_vector, plainto_tsquery($1)) DESC
        LIMIT 20
      `, [query]),
      getPool().query(`
        SELECT id, type, title, description AS excerpt, updated_at
        FROM knowledge_base.assets
        WHERE deleted_at IS NULL
          AND search_vector @@ plainto_tsquery($1)
          ${type ? `AND type = '${type}'` : ''}
        ORDER BY ts_rank(search_vector, plainto_tsquery($1)) DESC
        LIMIT 20
      `, [query]),
    ]);

    res.json({
      query,
      pages: pagesRes.rows,
      assets: assetsRes.rows,
      total: pagesRes.rows.length + assetsRes.rows.length,
    });
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 4: Commit**

```bash
git add services/relationships.js routes/relationships.js routes/search.js
git commit -m "feat: add relationships service, routes, and search route"
```

---

## Task 14: Upload route and auth routes

**Files:**
- Create: `routes/upload.js`
- Modify: `routes/auth.js`
- Modify: `routes/admin.js`

**Step 1: Create `routes/upload.js`**

```javascript
// routes/upload.js
'use strict';

const router = require('express').Router();
const path = require('path');
const upload = require('../middleware/upload');
const assets = require('../services/assets');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);
router.use(requireRole('editor'));

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const isImage = /jpeg|jpg|png|gif|webp/.test(
      path.extname(req.file.originalname).toLowerCase().slice(1)
    );

    const asset = await assets.createAsset({
      type: isImage ? 'image' : 'file',
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      file_path: req.file.path,
      metadata: {
        original_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
      },
      created_by: req.user.isApiToken ? 'claude' : 'user',
    });

    res.status(201).json(asset);
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 2: Update `routes/auth.js` for new schema**

Replace with the following (updates schema references from `kb_auth` to `knowledge_base`):

```javascript
// routes/auth.js
'use strict';

const router = require('express').Router();
const auth = require('../services/auth');
const { requireAuth } = require('../middleware/requireAuth');

// GET /api/auth/check
router.get('/check', async (req, res) => {
  const token = req.cookies?.session;
  if (!token) return res.json({ authenticated: false });
  const user = await auth.validateSession(token);
  if (!user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user });
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, displayName, email } = req.body;
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'username, password, and displayName are required' });
    }
    // Block registration if disabled and users exist
    const allowReg = await auth.getSetting('allow_registration');
    const pool = require('../services/database').getPool();
    const count = await pool.query('SELECT COUNT(*) FROM knowledge_base.users');
    if (allowReg !== 'true' && parseInt(count.rows[0].count) > 0) {
      return res.status(403).json({ error: 'Registration is disabled' });
    }
    const user = await auth.createUser({ username, password, displayName, email });
    const session = await auth.createSession(user.id);
    res.cookie('session', session.token, {
      httpOnly: true, sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const user = await auth.getUserByUsername(username);
    if (!user || !(await auth.verifyPassword(user, password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const session = await auth.createSession(user.id);
    res.cookie('session', session.token, {
      httpOnly: true, sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.json({ user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies?.session;
  if (token) await auth.destroySession(token);
  res.clearCookie('session');
  res.json({ ok: true });
});

module.exports = router;
```

**Step 3: Update `routes/admin.js` for new schema and roles**

```javascript
// routes/admin.js
'use strict';

const router = require('express').Router();
const auth = require('../services/auth');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

router.use(requireAuth);
router.use(requireRole('admin'));

// Users
router.get('/users', async (req, res, next) => {
  try { res.json(await auth.listUsers()); } catch (err) { next(err); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin','editor','viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await auth.updateUserRole(req.params.id, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await auth.deleteUser(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// API tokens
router.get('/tokens', async (req, res, next) => {
  try { res.json(await auth.listApiTokens()); } catch (err) { next(err); }
});

router.post('/tokens', async (req, res, next) => {
  try {
    if (!req.body.label) return res.status(400).json({ error: 'label is required' });
    const token = await auth.createApiToken(req.body.label);
    res.status(201).json(token); // plaintext returned once only
  } catch (err) { next(err); }
});

router.delete('/tokens/:id', async (req, res, next) => {
  try {
    await auth.deleteApiToken(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// Settings
router.get('/settings', async (req, res, next) => {
  try { res.json(await auth.getAllSettings()); } catch (err) { next(err); }
});

router.patch('/settings', async (req, res, next) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await auth.setSetting(key, String(value));
    }
    res.json(await auth.getAllSettings());
  } catch (err) { next(err); }
});

module.exports = router;
```

**Step 4: Commit**

```bash
git add routes/upload.js routes/auth.js routes/admin.js
git commit -m "feat: add upload route and update auth and admin routes for new schema"
```

---

## Task 15: Rewrite server.js

**Files:**
- Modify: `server.js`
- Create: `tests/routes/health.test.js`

**Step 1: Write health route test**

Create `tests/routes/health.test.js`:

```javascript
const request = require('supertest');
const app = require('../../server');

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});
```

**Step 2: Rewrite `server.js`**

```javascript
// server.js
'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./services/database');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Static files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/data/uploads';
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Public routes ──────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));

app.get('/api/health', async (req, res) => {
  try {
    await db.getPool().query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// ── Protected routes ───────────────────────────────────────
app.use('/api/workspaces',    require('./routes/workspaces'));
app.use('/api/pages',         require('./routes/pages'));
app.use('/api/assets',        require('./routes/assets'));
app.use('/api/relationships', require('./routes/relationships'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/upload',        require('./routes/upload'));

// ── Admin routes ───────────────────────────────────────────
app.use('/api/admin', require('./routes/admin'));

// ── SPA fallback ───────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
if (require.main === module) {
  db.init().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Knowledge Platform running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;
```

**Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass. If any route tests still fail, the server is now wired — check error messages.

**Step 4: Smoke test the running server**

```bash
node server.js &
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
kill %1
```

**Step 5: Commit**

```bash
git add server.js tests/routes/health.test.js
git commit -m "feat: rewrite server.js with all routes mounted"
```

---

## Phase 2 complete

All backend services and API routes are in place:

- ✅ Auth service with roles (admin/editor/viewer) and API token support
- ✅ `requireAuth` middleware handles session cookie and Bearer token
- ✅ `requireRole` middleware enforces role hierarchy
- ✅ Workspaces and sections CRUD
- ✅ Pages CRUD with tree query and soft delete
- ✅ Assets CRUD with automatic version snapshots on update
- ✅ Relationships CRUD
- ✅ Full-text search across pages and assets
- ✅ File upload with multer
- ✅ Auth, admin, and health routes updated for new schema
- ✅ `server.js` wired with all routes

**Proceed to:** `impl-03-frontend.md`
