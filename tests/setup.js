// tests/setup.js
// Sets env vars for local development if not already provided by the environment.
// In CI or Docker, these are set externally and these lines are no-ops.
process.env.DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb';

process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/kb-test-uploads';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-not-for-production';
