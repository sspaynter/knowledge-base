// scripts/migrate-nocodb.js
// One-time migration: NocoDB documents → knowledge_base.assets
// Safe to run again — skips already-migrated records.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://nocodb:nocodb2026@192.168.86.18:32775/nocodb'
});

// Map NocoDB document types to valid asset types.
// Types not in the schema (agent, plan, reference) map to 'file'.
// The original NocoDB type is preserved in metadata.original_type.
function mapType(nocoType) {
  const map = {
    'skill':        'skill',
    'config':       'config',
    'configuration':'config',
    'decision':     'decision',
    'session':      'session',
    'session-log':  'session',
    'image':        'image',
    'file':         'file',
    'link':         'link',
    'miro':         'miro',
    // Types from existing NocoDB data that don't have a direct equivalent
    'agent':        'file',
    'plan':         'file',
    'reference':    'file',
    'deliverable':  'file',
  };
  return map[nocoType?.toLowerCase()] || 'file';
}

// Map created_by values to valid schema values
function mapCreatedBy(val) {
  if (!val) return 'user';
  const v = val.toLowerCase();
  if (v.includes('claude')) return 'claude';
  return 'user';
}

async function migrateNocoDB() {
  const client = await pool.connect();
  try {
    // Fetch all existing NocoDB documents
    const docs = await client.query(
      'SELECT * FROM pg33xhvewcmmwir.documents ORDER BY id'
    );
    console.log(`Found ${docs.rows.length} documents to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const doc of docs.rows) {
      // Skip if already migrated
      const exists = await client.query(
        "SELECT id FROM knowledge_base.assets WHERE metadata->>'nocodb_id' = $1",
        [String(doc.id)]
      );
      if (exists.rows.length > 0) {
        skipped++;
        continue;
      }

      const metadata = {
        source:          'nocodb',
        nocodb_id:       String(doc.id),
        original_type:   doc.type || '',
        project:         doc.project || '',
        status:          doc.status || 'active',
        tags:            doc.tags || '',
        version:         doc.version || '',
        session_context: doc.session_context || '',
        supersedes:      doc.supersedes || '',
      };

      await client.query(`
        INSERT INTO knowledge_base.assets
          (type, title, description, content, file_path, metadata, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        mapType(doc.type),
        doc.title || 'Untitled',
        doc.summary || '',
        doc.content || '',
        doc.file_path || null,
        JSON.stringify(metadata),
        mapCreatedBy(doc.created_by1),
        doc.created_at || new Date(),
        doc.updated_at || new Date(),
      ]);

      migrated++;
    }

    console.log(`✓ Migrated: ${migrated} | Skipped (already done): ${skipped}`);
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateNocoDB();
