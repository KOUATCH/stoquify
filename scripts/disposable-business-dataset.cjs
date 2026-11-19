#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { Client } = require('pg');
const { loadDatabaseUrl, resolveTarget, createNewDatabase } = require('./prisma-local-fresh-bootstrap');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/engineering/database/disposable-dataset-2026-10-28');
const NAME = /^stoquify_replay_dataset_[a-z0-9_]{1,35}$/;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const save = (name, value) => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n');
};
const redact = value => String(value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[REDACTED_DATABASE_URL]');
const errorDetail = error => redact(error.message || error.code || error.name || 'Unknown failure');

function targetFor(databaseName, sourceUrl = loadDatabaseUrl()) {
  if (!NAME.test(databaseName || '')) throw new Error('Explicit stoquify_replay_dataset_<unique-name> target required');
  const source = new URL(sourceUrl);
  if (decodeURIComponent(source.pathname.slice(1)) === databaseName) throw new Error('Application database is not a disposable target');
  const target = resolveTarget({ databaseName, sourceUrl: source.toString() });
  target.search = '';
  target.searchParams.set('schema', 'public');
  target.searchParams.set('connection_limit', '5');
  target.searchParams.set('connect_timeout', '5');
  return target;
}

function assertManifestTarget(target, manifest) {
  const expected=manifest.target;
  if(target.hostname.toLowerCase()!==expected.host.toLowerCase() || (target.port||'5432')!==String(expected.port||'5432') || decodeURIComponent(target.pathname.slice(1))!==expected.database || target.searchParams.get('schema')!==expected.schema) throw new Error('Connection identity differs from the retained database manifest');
}

function ownedTarget(databaseName) {
  const manifest=JSON.parse(fs.readFileSync(path.join(OUT,'manifest.json'),'utf8'));
  if(manifest.status!=='schema-verified'||manifest.target.database!==databaseName)throw new Error('Owned, schema-verified target manifest required');
  if(manifest.schemaSha256!==sha(fs.readFileSync(path.join(ROOT,'prisma/schema.prisma'))))throw new Error('Schema changed since certification');
  const target=targetFor(databaseName);assertManifestTarget(target,manifest);return target;
}

function childEnv(target) {
  // Only carry OS/runtime variables. Never inherit application/provider credentials.
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  const emptyEnv = path.join(ROOT, '.seed-artifacts/disposable-dataset-2026-10-28/empty.env');
  fs.mkdirSync(path.dirname(emptyEnv), { recursive: true });
  if (!fs.existsSync(emptyEnv)) fs.writeFileSync(emptyEnv, '# Isolated test environment: intentionally no provider credentials.\n');
  const secretsFile = path.join(path.dirname(emptyEnv), 'runtime-secrets.json');
  if (!fs.existsSync(secretsFile)) fs.writeFileSync(secretsFile, JSON.stringify({ auth: crypto.randomBytes(48).toString('hex'), payroll: crypto.randomBytes(48).toString('hex') }), { mode: 0o600 });
  const secrets = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
  return { ...env, DOTENV_CONFIG_PATH: emptyEnv, NODE_ENV: 'test', AUTH_SECRET: secrets.auth, PAYROLL_PAYMENT_DESTINATION_HASH_SECRET: secrets.payroll, NEXTAUTH_URL: 'http://localhost:3187', NEXT_PUBLIC_BASE_URL: 'http://localhost:3187', DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SHADOW_DATABASE_URL: target.toString(), AQSTOQFLOW_FRESH_REPLAY_DATABASE_URL: target.toString(), PRISMA_HIDE_UPDATE_MESSAGE: '1', TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' }) };
}

async function runNode(label, args, target) {
  const startedAt = new Date().toISOString();
  const logFile = path.join(OUT, label + '.log');
  if (label === 'seed' && fs.existsSync(path.join(OUT, 'seed-results.json'))) {
    const archive = path.join(OUT, 'attempts', startedAt.replace(/[:.]/g, '-'));
    fs.mkdirSync(archive, {recursive:true});
    for (const file of fs.readdirSync(OUT).filter(name => name === 'seed-results.json' || /^synth12_.*-workflows\.json$/.test(name))) fs.copyFileSync(path.join(OUT,file),path.join(archive,file));
  }
  if (fs.existsSync(logFile)) fs.copyFileSync(logFile, path.join(OUT, label + '-' + startedAt.replace(/[:.]/g, '-') + '-previous.log'));
  fs.writeFileSync(logFile, '');
  const result = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...childEnv(target), RESEND_API_KEY: '', UPLOADTHING_TOKEN: '' }, windowsHide: true, timeout: label.startsWith('history') ? 3600000 : label.startsWith('remaining') ? 1800000 : 600000 });
    let failure = null;
    const capture = chunk => fs.appendFileSync(logFile, redact(chunk.toString()));
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    child.on('error', error => { failure = error; });
    child.on('close', status => resolve({ status, error: failure }));
  });
  const evidence = { label, args, startedAt, finishedAt: new Date().toISOString(), exitCode: result.status, errorCode: result.error?.code || null };
  save(label + '.json', evidence);
  console.log(JSON.stringify(evidence));
  if (result.status !== 0 || result.error) throw new Error(label + ' failed; see sanitized log');
}

async function bootstrap(databaseName) {
  const target = targetFor(databaseName);
  fs.mkdirSync(OUT, { recursive: true });
  if (fs.existsSync(path.join(OUT, 'manifest.json'))) {
    const previous = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
    if (previous.status !== 'blocked' || previous.serverVersion) throw new Error('Retained dataset manifest already exists; refusing to replace its evidence');
  }
  const manifest = { version: 1, dataset: 'synthetic-business-12-months', referenceDate: '2026-10-28', historyStart: '2025-11-01', historyEnd: '2026-10-28', organizationsPlanned: 3, target: { host: target.hostname, port: target.port || '5432', database: databaseName, schema: 'public' }, schemaSha256: sha(fs.readFileSync(path.join(ROOT, 'prisma/schema.prisma'))), createdAt: new Date().toISOString(), status: 'creating', seeded: false };
  save('manifest.json', manifest);
  try {
    await createNewDatabase(target, databaseName);
    manifest.status = 'created'; save('manifest.json', manifest);
    const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const identity = (await client.query('SELECT current_database() AS database, version() AS version')).rows[0];
      if (identity.database !== databaseName) throw new Error('Database identity mismatch');
      manifest.serverVersion = identity.version;
    } finally { await client.end(); }
    const cli = path.join(ROOT, 'node_modules/prisma/build/index.js');
    await runNode('migration-deploy-1', [cli, 'migrate', 'deploy'], target);
    await runNode('migration-deploy-2', [cli, 'migrate', 'deploy'], target);
    await runNode('migration-certification', ['scripts/prisma-fresh-replay-certification.js', '--mode', 'fail', '--out', path.join(OUT, 'migration-certification.md'), '--json-out', path.join(OUT, 'migration-certification-result.json')], target);
    manifest.status = 'schema-verified';
  } catch (error) {
    manifest.status = 'blocked'; manifest.error = errorDetail(error); throw error;
  } finally { save('manifest.json', manifest); }
}

async function main() {
  const [command, databaseName] = process.argv.slice(2);
  if (process.argv.length !== 4 || !['bootstrap', 'inventory', 'seed', 'verify', 'probe','history','history-pilot','scenarios','scenarios-foundation','scenarios-operations','remaining','remaining-commerce','remaining-people','remaining-firm-close','remaining-platform','remaining-stock-pos'].includes(command)) throw new Error('Explicit supported command and owned database required');
  if (command === 'bootstrap') return bootstrap(databaseName);
  const target = ownedTarget(databaseName);
  if (command === 'inventory') return runNode('inventory', ['scripts/disposable-dataset-inventory.cjs'], target);
  if (command === 'verify') return runNode('verify', ['scripts/verify-disposable-dataset.cjs'], target);
  if (command === 'probe') return runNode('probe', ['scripts/probe-disposable-dataset.cjs'], target);
  if (command.startsWith('remaining')) return runNode(command,['-r','ts-node/register/transpile-only','-r','./scripts/register-server-only-shim.js','-r','tsconfig-paths/register','prisma/disposable-remaining.ts',command==='remaining'?'all':command.slice('remaining-'.length)],target);
  if (command === 'history'||command==='history-pilot') return runNode(command,['-r','ts-node/register/transpile-only','-r','./scripts/register-server-only-shim.js','-r','tsconfig-paths/register','prisma/disposable-history.ts',...(command==='history-pilot'?['--pilot']:[])],target);
  if (command.startsWith('scenarios')) return runNode(command,['-r','ts-node/register/transpile-only','-r','./scripts/register-server-only-shim.js','-r','tsconfig-paths/register','prisma/disposable-scenarios.ts',...(command==='scenarios-foundation'?['--foundation']:command==='scenarios-operations'?['--skip-count']:[])],target);
  return runNode('seed', ['-r', 'ts-node/register/transpile-only', '-r', './scripts/register-server-only-shim.js', '-r', 'tsconfig-paths/register', 'prisma/disposable-business-dataset.ts'], target);
}
if (require.main === module) main().catch(error => { console.error(errorDetail(error)); process.exitCode = 1; });
module.exports = { NAME, OUT, targetFor, ownedTarget, assertManifestTarget, childEnv, redact, bootstrap };
