const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const dotenv = require('dotenv');
const evidence = __dirname;
const root = process.cwd();
const bin = 'C:/Program Files/PostgreSQL/17/bin';
let env = { ...process.env };
for (const file of ['.env.local', '.env']) {
  if (fs.existsSync(file)) env = { ...dotenv.parse(fs.readFileSync(file)), ...env };
}
function urlValue(raw) {
  return raw.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => env[key] || '').replace(/^["']|["']$/g, '').trim();
}
function run(exe, args, options = {}) {
  const result = spawnSync(exe, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...options });
  if (result.error) throw new Error(`${path.basename(exe)} could not start: ${result.error.code}`);
  return result;
}
(async () => {
  const source = new URL(urlValue(env.DATABASE_URL || env.DIRECT_URL || ''));
  if (source.hostname !== 'localhost') throw new Error('Refusing non-local schema source');
  const targetName = `stoquify_pos_audit_20260923_${randomBytes(4).toString('hex')}`;
  const connection = { host: source.hostname, port: Number(source.port || 5432), user: decodeURIComponent(source.username), password: decodeURIComponent(source.password) };
  const admin = new Client({ ...connection, database: 'postgres' });
  await admin.connect();
  try {
    if ((await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetName])).rowCount) throw new Error('Disposable database collision; refusing reuse');
    await admin.query(`CREATE DATABASE "${targetName}" TEMPLATE template0`);
  } finally { await admin.end(); }
  fs.writeFileSync(path.join(evidence, 'postgres-target.json'), JSON.stringify({ host: source.hostname, port: connection.port, sourceDatabase: source.pathname.slice(1), disposableDatabase: targetName, method: 'schema-only clone; no user records', createdAt: new Date().toISOString(), retainedForReview: true }, null, 2));
  env = { ...env, PGHOST: connection.host, PGPORT: String(connection.port), PGUSER: connection.user, PGPASSWORD: connection.password };
  const dumpPath = path.join(evidence, 'postgres-schema-only.sql');
  const dumped = run(path.join(bin, 'pg_dump.exe'), ['--schema-only', '--schema=public', '--no-owner', '--no-privileges', '--file', dumpPath, source.pathname.slice(1)]);
  fs.writeFileSync(path.join(evidence, 'postgres-schema-dump.log'), dumped.stderr || `exit=${dumped.status}\n`);
  if (dumped.status !== 0) throw new Error(`Schema-only dump failed (${dumped.status})`);
  // template0 still supplies an empty public schema. Preserve it and remove only
  // the dump's redundant creation statement; no source object or row is changed.
  fs.writeFileSync(dumpPath, fs.readFileSync(dumpPath, 'utf8').replace(/^CREATE SCHEMA public;\r?$/m, '-- public schema already exists in the new empty database'));
  const restored = run(path.join(bin, 'psql.exe'), ['-X', '--set', 'ON_ERROR_STOP=1', '--dbname', targetName, '--file', dumpPath]);
  fs.writeFileSync(path.join(evidence, 'postgres-schema-restore.log'), restored.stdout + restored.stderr);
  if (restored.status !== 0) throw new Error(`Disposable schema restore failed (${restored.status}); database preserved for review`);
  const target = new URL(source);
  target.pathname = `/${targetName}`;
  target.searchParams.set('schema', 'public');
  env = { ...env, DATABASE_URL: target.href, DIRECT_URL: target.href, POS_DISPOSABLE_DATABASE_NAME: targetName, TS_NODE_TRANSPILE_ONLY: 'true', TS_NODE_COMPILER_OPTIONS: '{"moduleResolution":"node"}', RUN_POS_COMMIT_POSTGRES_CERTIFICATION: '1', RUN_POS_SHIFT_CLOSE_POSTGRES_CERTIFICATION: '1' };
  let failed = false;
  for (const [label, file] of [['commit', 'pos-commit-result.postgres.test.ts'], ['close', 'pos-shift-close.postgres.test.ts'], ['lifecycle', 'checkout-lifecycle.postgres.test.ts']]) {
    const testEnv = { ...env };
    if (label === 'lifecycle') {
      const scoped = new URL(target); scoped.searchParams.set('schema', 'codex_pos_lifecycle_20260920');
      testEnv.DATABASE_URL = scoped.href; testEnv.DIRECT_URL = scoped.href; testEnv.RUN_POS_LIFECYCLE_POSTGRES = '1';
    }
    const result = run(process.execPath, ['node_modules/jest/bin/jest.js', '--runInBand', '--roots', 'services/pos/__tests__', '--runTestsByPath', `services/pos/__tests__/${file}`, '--silent'], { env: testEnv });
    fs.writeFileSync(path.join(evidence, `services-postgres-${label}.log`), result.stdout + result.stderr + `\nexit=${result.status}\n`);
    console.log(`${label}: exit=${result.status}`);
    failed ||= result.status !== 0;
  }
  console.log(`Disposable database retained: ${targetName}`);
  process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connection redacted]')); process.exitCode = 1; });
