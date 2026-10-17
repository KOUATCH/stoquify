// Explicit lanes only. Bootstrap creates a new local database; never resets or drops it.
// Run database lanes sequentially: fault injection installs DDL on shared tables.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { createNewDatabase } = require('./prisma-local-fresh-bootstrap.js');
const { resolveTarget } = require('./s04-s05-target.cjs');
const lanes = {
  ap: ['tests/s04-s05/ap-payment.postgres.test.ts'],
  pos: ['services/pos/__tests__/pos-full-commit.postgres.test.ts'],
  lifecycle: ['services/pos/__tests__/checkout-lifecycle.postgres.test.ts'],
  browser: ['lib/pos/__tests__/offline-local-queue.test.ts'],
  unit: ['services/purchasing/__tests__/payment-posting-recovery.service.test.ts', 'services/pos/__tests__/offline-sync.service.test.ts', 'services/pos/__tests__/commit-recovery.service.test.ts', 'services/events/__tests__/business-event.service.test.ts'],
};
async function main() {
  const [lane, name, evidenceDirectory] = process.argv.slice(2);
  if (process.argv.length !== 5 || (!lanes[lane] && lane !== 'bootstrap') || !fs.statSync(evidenceDirectory).isDirectory()) throw new Error('Usage: lane new-database-name existing-evidence-directory');
  const target = resolveTarget(name);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = path.join(evidenceDirectory, `${name}-${lane}-${stamp}`);
  const identityPath = path.join(evidenceDirectory, `${name}-identity.json`);
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SHADOW_DATABASE_URL: target.toString() };
  const sanitize = text => (text || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]');
  if (lane === 'bootstrap') {
    await createNewDatabase(target, name);
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, encoding: 'utf8', timeout: 240000, maxBuffer: 10e6 });
    fs.writeFileSync(prefix + '.log', sanitize(result.stdout) + sanitize(result.stderr), { flag: 'wx' });
    if (result.status !== 0) throw new Error('Disposable migration failed; inspect sanitized log');
  } else if (!['browser', 'unit'].includes(lane)) {
    const identity = JSON.parse(fs.readFileSync(identityPath, 'utf8'));
    if (identity.name !== name || identity.host !== 'localhost') throw new Error('Owned database identity required');
  }
  if (!['browser', 'unit'].includes(lane)) {
    const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const identity = (await client.query('SELECT current_database() AS name, version() AS version')).rows[0];
      if (identity.name !== name) throw new Error('Database identity mismatch');
      const migrations = (await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
      const sourceNames = fs.readdirSync('prisma/migrations').filter(n => fs.existsSync(path.join('prisma/migrations', n, 'migration.sql'))).sort();
      if (JSON.stringify(sourceNames) !== JSON.stringify(migrations.map(m => m.migration_name)) || !migrations.every(m => m.finished_at && !m.rolled_back_at && crypto.createHash('sha256').update(fs.readFileSync(path.join('prisma/migrations', m.migration_name, 'migration.sql'))).digest('hex') === m.checksum)) throw new Error('Migration source mismatch');
      if (lane === 'bootstrap') fs.writeFileSync(identityPath, JSON.stringify({ ...identity, host: 'localhost', migrations, sourceChecksumsMatch: true }, null, 2), { flag: 'wx' });
    } finally { await client.end(); }
  }
  if (lane === 'bootstrap') { console.log(`Created and verified new local test database: ${name}`); return; }
  delete env.RUN_S04_S05_POSTGRES;
  if (!['browser', 'unit'].includes(lane)) {
    env.RUN_S04_S05_POSTGRES = '1'; env.POS_DISPOSABLE_DATABASE_NAME = name;
    env.RUN_POS_FULL_COMMIT_POSTGRES = '1'; env.RUN_POS_LIFECYCLE_POSTGRES = '1';
    if (lane === 'lifecycle') {
      target.searchParams.set('schema', 'codex_pos_lifecycle_20260920');
      env.DATABASE_URL = target.toString(); env.DIRECT_URL = target.toString(); env.SHADOW_DATABASE_URL = target.toString();
    }
  }
  const result = spawnSync(process.execPath, ['node_modules/jest/bin/jest.js', '--config', 'jest.s04-s05.config.cjs', '--runInBand', '--no-cache', '--runTestsByPath', ...lanes[lane], '--json', '--outputFile=' + prefix + '.json'], { env, encoding: 'utf8', timeout: 300000, maxBuffer: 15e6 });
  fs.writeFileSync(prefix + '.log', sanitize(result.stdout) + sanitize(result.stderr), { flag: 'wx' });
  console.log(`Lane ${lane}: exit ${result.status}; evidence ${prefix}.json`);
  if (result.status !== 0) throw new Error('Verification failed; inspect sanitized evidence');
  const report = JSON.parse(fs.readFileSync(prefix + '.json', 'utf8'));
  if (!report.numPassedTests || report.numPendingTests || report.numFailedTests) throw new Error('Empty, skipped, or failed tests do not satisfy this lane');
}
main().catch(error => { console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]') : 'Verification failed'); process.exitCode = 1; });
