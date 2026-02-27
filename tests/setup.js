// tests/setup.js
// Sets DATABASE_URL for local development if not already provided by the environment.
// In CI or Docker, DATABASE_URL is set externally and this line is a no-op.
process.env.DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb';
