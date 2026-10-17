const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { resolveWorkflowTestTarget } = require('../../../../scripts/ui-workflow-postgres-target.cjs');
const { createNewDatabase } = require('../../../../scripts/prisma-local-fresh-bootstrap');

async function main() {
  const databaseName = 'stoquify_local_ui_workflow_hris_20261007';
  const output = path.join(__dirname, 'hris-time-postgres-bootstrap-20261007');
  if (['.json', '.stdout.log', '.stderr.log'].some(suffix => fs.existsSync(output + suffix))) {
    throw new Error('Preserve the existing bootstrap evidence.');
  }
  const target = resolveWorkflowTestTarget(databaseName);
  await createNewDatabase(target, databaseName); // Refuses an existing database.
  const evidence = { databaseName, createdAt: new Date().toISOString(), applicationDatabaseChanged: false, seeded: false };
  fs.writeFileSync(output + '.json', JSON.stringify(evidence, null, 2) + '\n');
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 180000, windowsHide: true,
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SHADOW_DATABASE_URL: target.toString() },
  });
  const sanitize = text => (text || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted database URL]');
  fs.writeFileSync(output + '.stdout.log', sanitize(result.stdout));
  fs.writeFileSync(output + '.stderr.log', sanitize(result.stderr));
  evidence.migrationExitCode = result.status;
  const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const identity = (await client.query('SELECT current_database() AS name, version() AS version')).rows[0];
    if (identity.name !== databaseName) throw new Error('Isolated database identity mismatch');
    evidence.identity = identity;
    evidence.migrations = (await client.query('SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
  } finally { await client.end(); }
  evidence.completedAt = new Date().toISOString();
  fs.writeFileSync(output + '.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ databaseName, migrationExitCode: result.status, migrations: evidence.migrations.length }));
  if (result.error || result.status !== 0) process.exitCode = 1;
}
main().catch(() => { console.error('Isolated HRIS bootstrap failed. No reset or source-database changes attempted; inspect sanitized evidence if created.'); process.exitCode = 1; });
