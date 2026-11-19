// Explicitly owned disposable target. Never reset or drop an existing database.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { loadDatabaseUrl, resolveTarget } = require(path.join(process.cwd(), 'scripts/prisma-local-fresh-bootstrap'));
const database = 'stoquify_local_pos_repairs_20261026_a19f';
const receiptFile = path.join(__dirname, 'postgres-target.json');
const clean = value => String(value ?? '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted database URL]');
async function main() {
  const mode = process.argv[2];
  if (!['--prepare', '--test'].includes(mode)) throw new Error('Explicit --prepare or --test required');
  const source = new URL(loadDatabaseUrl());
  if (source.pathname === '/' + database) throw new Error('Application database cannot be the repair target');
  const target = resolveTarget({ databaseName: database, sourceUrl: source.toString() });
  target.searchParams.set('schema', 'public');
  target.searchParams.set('connection_limit', '5');
  const env = { ...process.env, DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SHADOW_DATABASE_URL: target.toString(), NODE_ENV: 'test', REPAIR_DISPOSABLE_DATABASE: database, RUN_WORKFLOW_REPAIR_POSTGRES: '1' };
  if (mode === '--prepare') {
    const admin = new URL(target); admin.pathname = '/postgres'; admin.searchParams.delete('schema');
    const client = new Client({ connectionString: admin.toString(), connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      if ((await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])).rowCount) throw new Error('Refusing an existing target');
      await client.query(`CREATE DATABASE "${database}"`);
    } finally { await client.end(); }
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], { cwd: process.cwd(), env, encoding: 'utf8', windowsHide: true, timeout: 180000 });
    fs.writeFileSync(path.join(__dirname, 'postgres-prepare.log'), clean(result.stdout) + clean(result.stderr));
    fs.writeFileSync(receiptFile, JSON.stringify({ database, host: target.hostname, port: target.port || '5432', createdAt: new Date().toISOString(), schema: 'public', schemaPrepared: result.status === 0, schemaMethod: 'db push into newly created empty database; migration-specific constraints not certified', seeded: false, applicationDatabaseChanged: false }, null, 2));
    if (result.error || result.status !== 0) throw new Error('Disposable schema preparation failed; see sanitized log');
    console.log(JSON.stringify({ database, prepared: true }));
  } else {
    const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
    if (receipt.database !== database || !receipt.schemaPrepared) throw new Error('Prepared-target receipt required');
    const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
    try { await client.connect(); if ((await client.query('SELECT current_database() AS name')).rows[0].name !== database) throw new Error('Database identity mismatch'); } finally { await client.end(); }
    const result = spawnSync(process.execPath, ['node_modules/jest/bin/jest.js', '--config', 'jest.workflow-repairs-postgres.config.cjs', '--runInBand', '--no-cache', '--json', '--outputFile=' + path.join(__dirname, 'postgres-results.json')], { cwd: process.cwd(), env, encoding: 'utf8', windowsHide: true, timeout: 180000 });
    fs.writeFileSync(path.join(__dirname, 'postgres-tests.log'), clean(result.stdout) + clean(result.stderr));
    console.log(clean(result.stdout) + clean(result.stderr));
    if (result.error || result.status !== 0) process.exitCode = 1;
  }
}
main().catch(error => { fs.writeFileSync(path.join(__dirname, 'postgres-blocker.json'), JSON.stringify({ at: new Date().toISOString(), database, error: clean(error.message), code: error.code ?? null }, null, 2)); console.error(clean(error.message)); process.exitCode = 1; });
