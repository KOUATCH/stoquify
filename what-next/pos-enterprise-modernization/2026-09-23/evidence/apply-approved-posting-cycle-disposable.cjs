const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Client } = require('pg');
const dotenv = require('dotenv');
const approvedDatabase = 'stoquify_pos_audit_20260923_d1532fb1';
const approvedHash = 'cd5d20a342504c2f1d27c8644c3d41a8f80019d56a0a459678166df6ff8f119f';
const migrationPath = 'prisma/migrations/20260909093000_add_suspense_posting_cycles/migration.sql';
let env = { ...process.env };
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) env = { ...dotenv.parse(fs.readFileSync(file)), ...env };
(async () => {
  const record = JSON.parse(fs.readFileSync(path.join(__dirname, 'postgres-target.json'), 'utf8'));
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const hash = createHash('sha256').update(sql).digest('hex');
  const raw = (env.DATABASE_URL || env.DIRECT_URL || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => env[key] || '').replace(/^["']|["']$/g, '').trim();
  const source = new URL(raw);
  if (hash !== approvedHash || record.disposableDatabase !== approvedDatabase || record.host !== 'localhost' || record.port !== 5432 || source.hostname !== 'localhost' || Number(source.port || 5432) !== 5432 || source.pathname !== `/${record.sourceDatabase}` || record.sourceDatabase === approvedDatabase) {
    throw new Error('Refusing migration: approved hash or exact disposable target does not match');
  }
  const client = new Client({ host: 'localhost', port: 5432, user: decodeURIComponent(source.username), password: decodeURIComponent(source.password), database: approvedDatabase });
  const report = { authorization: 'User explicitly approved this exact disposable-only migration after initial automatic-review rejection', host: 'localhost', port: 5432, database: approvedDatabase, migrationPath, sha256: hash, applicationDatabaseExcluded: record.sourceDatabase, startedAt: new Date().toISOString() };
  await client.connect();
  try {
    const target = await client.query('SELECT current_database() AS database');
    if (target.rows[0].database !== approvedDatabase) throw new Error('Connected database is not the approved target');
    const before = await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ledger_posting_batches' AND column_name='postingCycle'");
    if (before.rowCount) throw new Error('Column already exists; refusing to reapply a non-idempotent migration');
    fs.writeFileSync(path.join(__dirname, 'postgres-approved-posting-cycle.sql'), sql);
    await client.query('SET search_path TO public');
    await client.query(sql);
    const after = await client.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='ledger_posting_batches' AND column_name='postingCycle'");
    if (after.rowCount !== 1) throw new Error('Approved migration did not produce the required column');
    fs.writeFileSync(path.join(__dirname, 'postgres-approved-posting-cycle.json'), JSON.stringify({ ...report, completedAt: new Date().toISOString(), exit: 0, column: after.rows[0] }, null, 2));
    console.log(`Approved migration completed only in ${approvedDatabase}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    fs.writeFileSync(path.join(__dirname, 'postgres-approved-posting-cycle.json'), JSON.stringify({ ...report, completedAt: new Date().toISOString(), exit: 1, code: error.code, message: error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connection redacted]') }, null, 2));
    throw error;
  } finally { await client.end(); }
})().catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connection redacted]')); process.exitCode = 1; });
