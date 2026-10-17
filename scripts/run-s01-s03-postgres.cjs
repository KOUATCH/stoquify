// Creates ONE new loopback-only database. Never resets/drops/reuses a database.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveWorkflowTestTarget } = require('./ui-workflow-postgres-target.cjs');
const { createNewDatabase } = require('./prisma-local-fresh-bootstrap.js');
const { Client } = require('pg');
async function main() {
  const [name, evidenceDirectory] = process.argv.slice(2);
  if (!name || !evidenceDirectory || process.argv.length !== 4 || !fs.statSync(evidenceDirectory).isDirectory()) throw new Error('Provide a new stoquify_local_ui_workflow_<name> and existing evidence directory');
  const target = resolveWorkflowTestTarget(name);
  await createNewDatabase(target, name);
  const env = { ...process.env, DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SHADOW_DATABASE_URL: target.toString(), NODE_ENV: 'test', RUN_UI_WORKFLOW_POSTGRES: '1', UI_WORKFLOW_POSTGRES_DATABASE: name };
  const sanitize = text => (text || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]');
  const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, encoding: 'utf8', timeout: 240000, maxBuffer: 10e6 });
  fs.writeFileSync(path.join(evidenceDirectory, name + '-migration.log'), sanitize(migration.stdout) + sanitize(migration.stderr), { flag: 'wx' });
  if (migration.status !== 0) throw new Error('Isolated migration failed; inspect sanitized evidence. Database retained.');
  const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const identity = (await client.query('SELECT current_database() AS name, version() AS version')).rows[0];
    if (identity.name !== name) throw new Error('Unexpected database identity');
    const migrations = (await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    const crypto = require('node:crypto');
    const matches = migrations.every(m => m.finished_at && !m.rolled_back_at && crypto.createHash('sha256').update(fs.readFileSync(path.join('prisma/migrations', m.migration_name, 'migration.sql'))).digest('hex') === m.checksum);
    fs.writeFileSync(path.join(evidenceDirectory, name + '-database.json'), JSON.stringify({ identity, migrations, sourceChecksumsMatch: matches, applicationDatabaseChanged: false }, null, 2), { flag: 'wx' });
    if (!matches) throw new Error('Migration source mismatch');
  } finally { await client.end(); }
  // Resolver in the suite must derive the disposable name from the original
  // local source, not mistake this explicit test URL for the application URL.
  const testEnv = { ...process.env, NODE_ENV: 'test', RUN_UI_WORKFLOW_POSTGRES: '1', UI_WORKFLOW_POSTGRES_DATABASE: name };
  const test = spawnSync(process.execPath, ['node_modules/jest/bin/jest.js', '--config', 'jest.s01-s03-postgres.config.cjs', '--runInBand', '--no-cache', '--silent', '--json', '--outputFile=' + path.join(evidenceDirectory, name + '-tests.json')], { env: testEnv, stdio: 'inherit', timeout: 240000 });
  process.exitCode = test.status === 0 ? 0 : 1;
}
main().catch(() => { console.error('Isolated PostgreSQL verification failed. No reset or application database mutation attempted. Inspect the local evidence.'); process.exitCode = 1; });
