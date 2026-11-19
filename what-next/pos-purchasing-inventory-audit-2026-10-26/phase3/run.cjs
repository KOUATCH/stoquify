// Task-owned runner: a new local database only; no reset, drop, or application URL.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { loadDatabaseUrl, createNewDatabase } = require(path.join(process.cwd(), 'scripts/prisma-local-fresh-bootstrap'));
const database = 'stoquify_pos_audit_20261026_d30f';
const clean = value => String(value ?? '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted database URL]');
async function main() {
  const mode = process.argv[2];
  if (!['prepare', 'pos', 'chain', 'browser'].includes(mode)) throw new Error('Explicit phase-3 mode required');
  const source = new URL(loadDatabaseUrl());
  if (process.env.NODE_ENV === 'production' || !['postgres:', 'postgresql:'].includes(source.protocol)
      || !['localhost', '127.0.0.1'].includes(source.hostname) || decodeURIComponent(source.pathname.slice(1)) === database) throw new Error('Refusing application or remote target');
  const target = new URL(source); target.hostname = 'localhost'; target.pathname = '/' + database;
  target.searchParams.set('schema', 'public'); target.searchParams.set('connection_limit', '8');
  const env = { ...process.env, DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SHADOW_DATABASE_URL: target.toString(), NODE_ENV: 'test',
    POS_DISPOSABLE_DATABASE_NAME: database, RUN_POS_FULL_COMMIT_POSTGRES: '1', RUN_RETENTION_OFFLINE_BROWSER: mode === 'browser' ? '1' : '0',
    WORKFLOW_PHASE3_DATABASE: database, RETENTION_VERIFICATION_EVIDENCE_DIR: __dirname };
  const receiptPath = path.join(__dirname, 'target.json');
  if (mode === 'prepare') {
    await createNewDatabase(target, database);
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, encoding: 'utf8', windowsHide: true, timeout: 240000 });
    fs.writeFileSync(path.join(__dirname, 'migrations.log'), clean(result.stdout) + clean(result.stderr));
    const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
    let identity, migrations;
    try { await client.connect(); identity = (await client.query('SELECT current_database() AS database, version() AS version')).rows[0];
      migrations = (await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at')).rows;
    } finally { await client.end(); }
    fs.writeFileSync(receiptPath, JSON.stringify({ at: new Date().toISOString(), database, local: true, ...identity, prepared: result.status === 0, migrationExit: result.status, migrations }, null, 2));
    console.log(JSON.stringify({ database, exit: result.status, migrations: migrations?.length }));
    if (result.error || result.status !== 0) process.exitCode = 1;
    return;
  }
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  if (receipt.database !== database || !receipt.prepared) throw new Error('Prepared migrated target receipt required');
  const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  try { await client.connect(); if ((await client.query('SELECT current_database() AS name')).rows[0].name !== database) throw new Error('Wrong database'); } finally { await client.end(); }
  const tests = mode === 'chain' ? ['services/inventory/__tests__/cross-workflow.phase3.postgres.test.ts'] : ['services/pos/__tests__/pos-full-commit.postgres.test.ts'];
  const args = ['node_modules/jest/bin/jest.js', '--config', 'jest.cross-workflow-phase3.config.cjs', '--runInBand', '--no-cache', '--runTestsByPath', ...tests,
    ...(mode === 'browser' ? ['--testNamePattern=P06 integrates durable browser'] : []), '--json', '--outputFile=' + path.join(__dirname, mode + '-results.json')];
  const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', windowsHide: true, timeout: 300000, maxBuffer: 12 * 1024 * 1024 });
  fs.writeFileSync(path.join(__dirname, mode + '.log'), clean(result.stdout) + clean(result.stderr));
  console.log(clean(result.stdout) + clean(result.stderr));
  if (result.error || result.status !== 0) process.exitCode = 1;
}
main().catch(error => { console.error(clean(error.message)); process.exitCode = 1; });
