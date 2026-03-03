// services/shared-auth.js
// Shared auth pool (applyr_staging database) + Passport configuration.
// Connects to shared_auth schema for SSO across SS42 apps.
'use strict';

const { Pool } = require('pg');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getPool, SCHEMA } = require('./database');

// ── Shared auth pool (separate database) ─────────────────
const sharedAuthPool = new Pool({
  connectionString: process.env.SHARED_AUTH_DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@10.0.3.12:5432/applyr_staging',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

sharedAuthPool.on('error', (err) => {
  console.error('Shared auth pool error:', err.message);
});

function getSharedAuthPool() {
  return sharedAuthPool;
}

// ── Passport serialisation ────────────────────────────────

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await sharedAuthPool.query(
      'SELECT id, google_id, email, name, avatar_url, is_active FROM shared_auth.users WHERE id = $1 AND is_active = true',
      [id]
    );
    if (!result.rows[0]) return done(null, false);

    const sharedUser = result.rows[0];

    // Look up KB-specific role
    const kbUser = await getOrCreateKBUser(sharedUser);
    sharedUser.role = kbUser.role;
    sharedUser.display_name = sharedUser.name;
    sharedUser.kb_user_id = kbUser.id;

    done(null, sharedUser);
  } catch (err) {
    done(err);
  }
});

// ── Google Strategy ───────────────────────────────────────

function configurePassport() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

  if (!clientId || !clientSecret) {
    console.warn('Google OAuth not configured — GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing');
    return;
  }

  passport.use(new GoogleStrategy(
    {
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: callbackUrl,
      state: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(null, false, { message: 'no_email' });
        }
        const googleId = profile.id;
        const name = profile.displayName;
        const avatarUrl = profile.photos?.[0]?.value || null;

        // Check allowlist
        const allowed = await sharedAuthPool.query(
          'SELECT email FROM shared_auth.allowed_emails WHERE email = $1',
          [email]
        );
        if (allowed.rows.length === 0) {
          return done(null, false, { message: 'not_allowed' });
        }

        // Find or create shared user — check google_id first, then email
        let result = await sharedAuthPool.query(
          'SELECT * FROM shared_auth.users WHERE google_id = $1',
          [googleId]
        );

        if (result.rows.length === 0) {
          result = await sharedAuthPool.query(
            'SELECT * FROM shared_auth.users WHERE email = $1',
            [email]
          );
        }

        if (result.rows.length === 0) {
          // Create new shared user
          result = await sharedAuthPool.query(
            `INSERT INTO shared_auth.users (google_id, email, name, avatar_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [googleId, email, name, avatarUrl]
          );
        } else {
          // Update profile info and google_id on login
          await sharedAuthPool.query(
            'UPDATE shared_auth.users SET google_id = $1, name = $2, avatar_url = $3, updated_at = now() WHERE id = $4',
            [googleId, name, avatarUrl, result.rows[0].id]
          );
          result = await sharedAuthPool.query(
            'SELECT * FROM shared_auth.users WHERE id = $1',
            [result.rows[0].id]
          );
        }

        const sharedUser = result.rows[0];

        // Ensure KB-specific user exists
        const kbUser = await getOrCreateKBUser(sharedUser);
        sharedUser.role = kbUser.role;
        sharedUser.display_name = sharedUser.name;
        sharedUser.kb_user_id = kbUser.id;

        done(null, sharedUser);
      } catch (err) {
        console.error('[AUTH] Verify callback error:', err.message, err.stack);
        done(err);
      }
    }
  ));
}

// ── KB user mapping ───────────────────────────────────────
// Maps shared_auth.users to knowledge_base.users for KB-specific roles.
// Creates a KB user row on first Google login if none exists.

async function getOrCreateKBUser(sharedUser) {
  const pool = getPool();

  // Look up by email
  const existing = await pool.query(
    `SELECT id, role FROM ${SCHEMA}.users WHERE email = $1`,
    [sharedUser.email]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // First KB user via Google OAuth gets admin role;
  // subsequent users get viewer
  const countRes = await pool.query(`SELECT COUNT(*) FROM ${SCHEMA}.users`);
  const isFirst = parseInt(countRes.rows[0].count) === 0;
  const role = isFirst ? 'admin' : 'viewer';

  const created = await pool.query(
    `INSERT INTO ${SCHEMA}.users (username, email, display_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, role`,
    [sharedUser.email, sharedUser.email, sharedUser.name, role]
  );

  return created.rows[0];
}

module.exports = { configurePassport, getSharedAuthPool, getOrCreateKBUser };
