const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const dotenv = require('dotenv');
const evidence = __dirname;
let env = { ...process.env };
for (const file of ['.env.local', '.env']) {
  if (fs.existsSync(file)) env = { ...dotenv.parse(fs.readFileSync(file)), ...env };
}
(async () => {
  const record = JSON.parse(fs.readFileSync(path.join(evidence, 'postgres-target.json'), 'utf8'));
  const raw = (env.DATABASE_URL || env.DIRECT_URL || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => env[key] || '').replace(/^["']|["']$/g, '').trim();
  const source = new URL(raw);
  if (source.hostname !== 'localhost' || record.host !== 'localhost' || Number(source.port || 5432) !== record.port || !/^stoquify_pos_audit_\d{8}_[a-f0-9]+$/.test(record.disposableDatabase) || source.pathname === `/${record.disposableDatabase}` || record.method !== 'schema-only clone; no user records') {
    throw new Error('Refusing unexpected disposable database record or source');
  }
  const target = new URL(source);
  target.pathname = `/${record.disposableDatabase}`;
  target.searchParams.set('schema', 'public');
  const client = new Client({ host: record.host, port: record.port, user: decodeURIComponent(target.username), password: decodeURIComponent(target.password), database: record.disposableDatabase });
  await client.connect();
  try {
    const result = await client.query('SELECT current_database() AS db');
    if (result.rows[0].db !== record.disposableDatabase) throw new Error('Disposable database mismatch');
  } finally { await client.end(); }
  env = { ...env, NODE_ENV: 'test', DATABASE_URL: target.href, DIRECT_URL: target.href, POS_DISPOSABLE_DATABASE_NAME: record.disposableDatabase, TS_NODE_TRANSPILE_ONLY: 'true', TS_NODE_COMPILER_OPTIONS: '{"moduleResolution":"node"}', RUN_POS_COMMIT_POSTGRES_CERTIFICATION: '1', RUN_POS_SHIFT_CLOSE_POSTGRES_CERTIFICATION: '1' };
  const results = [];
  for (const [label, file] of [['commit', 'pos-commit-result.postgres.test.ts'], ['close', 'pos-shift-close.postgres.test.ts'], ['lifecycle', 'checkout-lifecycle.postgres.test.ts'], ['corrections', 'pos-corrections.postgres.test.ts'], ['full-commit', 'pos-full-commit.postgres.test.ts']]) {
    if (process.argv[2] && process.argv[2] !== label) continue;
    const testEnv = { ...env };
    if (label === 'lifecycle') {
      const scoped = new URL(target); scoped.searchParams.set('schema', 'codex_pos_lifecycle_20260920');
      testEnv.DATABASE_URL = scoped.href; testEnv.DIRECT_URL = scoped.href; testEnv.RUN_POS_LIFECYCLE_POSTGRES = '1';
    }
    if (label === 'corrections') testEnv.RUN_POS_CORRECTIONS_POSTGRES = '1';
    if (label === 'full-commit') testEnv.RUN_POS_FULL_COMMIT_POSTGRES = '1';
    const args = ['node_modules/jest/bin/jest.js', '--runInBand', '--roots', 'services/pos/__tests__', '--runTestsByPath', `services/pos/__tests__/${file}`, ...(label === 'full-commit' ? [] : ['--silent'])];
    const startedAt = new Date().toISOString();
    const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: testEnv, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    fs.writeFileSync(path.join(evidence, `services-postgres-${label}-final.log`), (result.stdout || '') + (result.stderr || '') + `\nexit=${result.status}\n`);
    results.push({ label, command: `node ${args.join(' ')}`, database: record.disposableDatabase, schema: label === 'lifecycle' ? 'codex_pos_lifecycle_20260920' : 'public', startedAt, completedAt: new Date().toISOString(), exit: result.status, startError: result.error?.code });
    console.log(`${label}: exit=${result.status}`);
  }
  fs.writeFileSync(path.join(evidence, `services-postgres-exits${process.argv[2] ? `-${process.argv[2]}` : ''}.json`), JSON.stringify(results, null, 2));
  process.exitCode = results.some(result => result.exit !== 0) ? 1 : 0;
})().catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connection redacted]')); process.exitCode = 1; });
