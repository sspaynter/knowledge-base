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
