const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const dotenv = require('dotenv');

const migrationName = '20260909093000_add_suspense_posting_cycles';
const migrationPath = `prisma/migrations/${migrationName}/migration.sql`;
const approvedHash = 'cd5d20a342504c2f1d27c8644c3d41a8f80019d56a0a459678166df6ff8f119f';
const approvedDatabase = 'stoquify_replay_next_20260830';
const evidence = __dirname;
const mode = process.argv[2];
if (!['--preflight', '--apply-approved'].includes(mode)) throw new Error('Use --preflight or --apply-approved');
let env = { ...process.env };
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) env = { ...dotenv.parse(fs.readFileSync(file)), ...env };
const redact = value => String(value).replace(/postgres(?:ql)?:\/\/\S+/g, '[connection redacted]');
const save = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function snapshot(client) {
  await client.query('BEGIN READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout = '15s'");
    const target = (await client.query("SELECT current_database() AS database, current_setting('transaction_read_only') AS read_only")).rows[0];
    assert(target.database === approvedDatabase && target.read_only === 'on', 'Unexpected target or non-read-only metadata transaction');
    const columns = (await client.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='ledger_posting_batches' ORDER BY ordinal_position")).rows;
    const indexes = (await client.query("SELECT ci.relname AS index_name, i.indisunique AS is_unique, i.indisvalid AS is_valid, i.indisready AS is_ready, pg_get_indexdef(i.indexrelid) AS definition FROM pg_index i JOIN pg_class ct ON ct.oid=i.indrelid JOIN pg_namespace n ON n.oid=ct.relnamespace JOIN pg_class ci ON ci.oid=i.indexrelid WHERE n.nspname='public' AND ct.relname='ledger_posting_batches' ORDER BY ci.relname")).rows;
    const constraints = (await client.query("SELECT c.conname AS constraint_name, c.contype AS type, c.convalidated AS validated, c.condeferrable AS deferrable, pg_get_constraintdef(c.oid, true) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND t.relname='ledger_posting_batches' ORDER BY c.conname")).rows;
    const migrations = (await client.query('SELECT id, migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count FROM public._prisma_migrations ORDER BY id')).rows;
    return { checkedAt: new Date().toISOString(), target: { host: 'localhost', port: 5432, database: target.database, schema: 'public' }, method: 'Verified BEGIN READ ONLY; catalog and migration metadata only, no business rows', columns, indexes, constraints, migrations };
  } finally { await client.query('ROLLBACK'); }
}

function validIndex(state, name) {
  const index = state.indexes.find(item => item.index_name === name);
  assert(index?.is_unique && index.is_valid && index.is_ready, `Required unique index is absent or unhealthy: ${name}`);
  return index;
}

function assertUnapplied(state) {
  assert(!state.migrations.some(item => item.migration_name === migrationName), 'Migration history already contains the target; refusing reapplication');
  assert(!state.migrations.some(item => !item.finished_at && !item.rolled_back_at), 'Unfinished migration history requires separate review');
  assert(!state.columns.some(item => item.column_name === 'postingCycle'), 'postingCycle already exists; refusing non-idempotent SQL');
  assert(!state.constraints.some(item => item.constraint_name === 'ledger_posting_batches_cycle_scope_check'), 'Cycle check already exists');
  assert(!state.indexes.some(item => item.index_name === 'ledger_posting_batches_source_cycle_key'), 'Replacement index already exists');
  validIndex(state, 'ledger_posting_batches_organizationId_sourceType_sourceId_p_key');
  validIndex(state, 'ledger_posting_batches_organizationId_idempotencyKey_key');
}

function assertSchemaApplied(state, before) {
  const column = state.columns.find(item => item.column_name === 'postingCycle');
  assert(column?.data_type === 'integer' && column.is_nullable === 'NO' && column.column_default === '1', 'postingCycle definition does not match the reviewed migration');
  const check = state.constraints.find(item => item.constraint_name === 'ledger_posting_batches_cycle_scope_check');
  assert(check?.type === 'c' && check.validated && ['postingCycle', 'PAYMENT_SUSPENSE', 'SUSPENSE_RECLASSIFICATION', 'REVERSAL'].every(token => check.definition.includes(token)), 'Cycle scope check is absent or invalid');
  const replacement = validIndex(state, 'ledger_posting_batches_source_cycle_key');
  assert(replacement.definition.includes('("organizationId", "sourceType", "sourceId", "postingPurpose", "postingCycle")'), 'Cycle unique index has unexpected key columns');
  assert(!state.indexes.some(item => item.index_name === 'ledger_posting_batches_organizationId_sourceType_sourceId_p_key'), 'Old unique index was not removed');
  const idempotency = validIndex(state, 'ledger_posting_batches_organizationId_idempotencyKey_key');
  assert(JSON.stringify(idempotency) === JSON.stringify(before.indexes.find(item => item.index_name === idempotency.index_name)), 'Unrelated idempotency index changed');
  assert(JSON.stringify(state.columns.filter(item => item.column_name !== 'postingCycle')) === JSON.stringify(before.columns), 'Unrelated column metadata changed');
  assert(JSON.stringify(state.constraints.filter(item => item.constraint_name !== check.constraint_name)) === JSON.stringify(before.constraints), 'Unrelated constraint metadata changed');
}

(async () => {
  const record = JSON.parse(fs.readFileSync(path.join(evidence, 'postgres-target.json'), 'utf8'));
  const raw = (env.DATABASE_URL || env.DIRECT_URL || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => env[key] || '').replace(/^["']|["']$/g, '').trim();
  const source = new URL(raw);
  assert(['postgres:', 'postgresql:'].includes(source.protocol) && source.hostname === 'localhost' && Number(source.port || 5432) === 5432 && source.pathname === `/${approvedDatabase}` && record.sourceDatabase === approvedDatabase && record.host === 'localhost' && record.port === 5432, 'Refusing unexpected application database target');
  assert(!source.searchParams.has('host'), 'URL host override is not permitted');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const hash = createHash('sha256').update(sql).digest('hex');
  assert(hash === approvedHash, 'Reviewed migration SHA changed');
  const client = new Client({ host: 'localhost', port: 5432, user: decodeURIComponent(source.username), password: decodeURIComponent(source.password), database: approvedDatabase, application_name: 'codex-approved-pos-posting-cycle' });
  const result = { authorization: 'User explicitly requested completion of the remaining APPLICATION postingCycle migration; exact approved local target and migration only', target: { host: 'localhost', port: 5432, database: approvedDatabase, schema: 'public' }, migrationName, migrationPath, sha256: hash, prismaVersion: require('prisma/package.json').version, mode, startedAt: new Date().toISOString(), phase: 'preflight' };
  await client.connect();
  try {
    const before = await snapshot(client);
    assertUnapplied(before);
    if (mode === '--preflight') {
      save('application-migration-preflight.json', { ...result, exit: 0, before });
      console.log(`Preflight passed: ${approvedDatabase}; migration absent; ${before.migrations.length} historical migrations; old indexes valid`);
      return;
    }
    assert(!fs.existsSync(path.join(evidence, 'application-migration-result.json')), 'Application execution evidence already exists; inspect outcome before any retry');
    save('application-migration-before.json', before);
    fs.writeFileSync(path.join(evidence, 'application-migration-approved.sql'), sql);
    result.phase = 'applying-exact-sql';
    save('application-migration-result.json', result);
    await client.query('SET search_path TO public');
    await client.query(sql);
    result.sqlCommittedAt = new Date().toISOString();
    result.phase = 'schema-committed-history-pending';
    save('application-migration-result.json', result);
    const afterSql = await snapshot(client);
    save('application-migration-after-sql.json', afterSql);
    assertSchemaApplied(afterSql, before);
    assert(JSON.stringify(afterSql.migrations) === JSON.stringify(before.migrations), 'Migration history changed unexpectedly during SQL application');
    const target = new URL(source);
    target.search = '';
    target.searchParams.set('schema', 'public');
    const childEnv = { ...env, DATABASE_URL: target.href, DIRECT_URL: target.href, PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1' };
    delete childEnv.DOTENV_CONFIG_OVERRIDE;
    delete childEnv.DOTENV_CONFIG_PATH;
    const args = ['node_modules/prisma/build/index.js', 'migrate', 'resolve', '--config', 'prisma.config.ts', '--schema', 'prisma/schema.prisma', '--applied', migrationName];
    result.historyCommand = `node ${args.join(' ')}`;
    const resolution = spawnSync(process.execPath, args, { cwd: process.cwd(), env: childEnv, encoding: 'utf8', timeout: 120_000, maxBuffer: 5 * 1024 * 1024 });
    fs.writeFileSync(path.join(evidence, 'application-migration-resolve.log'), redact((resolution.stdout || '') + (resolution.stderr || '')) + `\nexit=${resolution.status}\n`);
    result.historyExit = resolution.status;
    save('application-migration-result.json', result);
    assert(resolution.status === 0, `Prisma history reconciliation failed; schema is committed, inspect the retained log (${resolution.error?.code || resolution.status})`);
    const after = await snapshot(client);
    save('application-migration-after.json', after);
    assertSchemaApplied(after, before);
    const history = after.migrations.filter(item => item.migration_name === migrationName);
    assert(history.length === 1 && history[0].finished_at && !history[0].rolled_back_at && history[0].checksum === approvedHash, 'Migration completion history/checksum verification failed');
    assert(JSON.stringify(after.migrations.filter(item => item.migration_name !== migrationName)) === JSON.stringify(before.migrations), 'Unrelated migration history changed');
    result.phase = 'complete';
    result.completedAt = new Date().toISOString();
    result.exit = 0;
    result.verification = { columnAndDefault: true, validatedCycleCheck: true, cycleUniqueIndex: true, oldUniqueIndexRemoved: true, unrelatedIdempotencyIndexPreserved: true, unrelatedColumnsAndConstraintsPreserved: true, matchingCompletedPrismaHistory: true, unrelatedMigrationHistoryPreserved: true };
    save('application-migration-result.json', result);
    console.log(`Approved application migration complete: ${approvedDatabase}; schema and matching Prisma history verified`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (mode === '--apply-approved' && result.phase !== 'preflight') save('application-migration-result.json', { ...result, exit: 1, failedAt: new Date().toISOString(), message: redact(error.message) });
    throw error;
  } finally { await client.end(); }
})().catch(error => { console.error(redact(error.message)); process.exitCode = 1; });
