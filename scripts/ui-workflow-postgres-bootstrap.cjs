const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { resolveWorkflowTestTarget } = require('./ui-workflow-postgres-target.cjs');
const { createNewDatabase } = require('./prisma-local-fresh-bootstrap');

async function main() {
  const [option, databaseName] = process.argv.slice(2);
  if (option !== '--database' || process.argv.length !== 4) throw new Error('Use --database stoquify_local_ui_workflow_<unique-name>');
  const target = resolveWorkflowTestTarget(databaseName);
  // Refuses an existing target. No reset, drop, application migration or seed.
  await createNewDatabase(target, databaseName);
  const evidence = { databaseName, local: true, createdAt: new Date().toISOString(), applicationDatabaseChanged: false, seeded: false, migrationExitCode: null };
  const result = spawnSync(process.execPath, [path.join(process.cwd(), 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 180000,
    env: { ...process.env, DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SHADOW_DATABASE_URL: target.toString() },
  });
  evidence.migrationExitCode = result.status;
  const directory = path.join(process.cwd(), 'what-next/ui-workflow-roadmap');
  const sanitize = value => (value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted database URL]');
  fs.writeFileSync(path.join(directory, 'postgres-migration-rehearsal.log'), sanitize(result.stdout) + sanitize(result.stderr));
  const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const identity = await client.query('SELECT current_database() AS database, version() AS version');
    if (identity.rows[0].database !== databaseName) throw new Error('Isolated database identity mismatch');
    evidence.serverVersion = identity.rows[0].version;
    const applied = await client.query('SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at');
    evidence.migrations = applied.rows;
  } finally { await client.end(); }
  fs.writeFileSync(path.join(directory, 'postgres-migration-rehearsal.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ databaseName, migrationExitCode: result.status, appliedMigrations: evidence.migrations.filter(m => m.finished_at && !m.rolled_back_at).length }));
  if (result.error || result.status !== 0) process.exitCode = 1;
}
main().catch(() => { console.error('UI workflow database bootstrap failed; inspect sanitized rehearsal evidence when present. No automatic reset was attempted.'); process.exitCode = 1; });
