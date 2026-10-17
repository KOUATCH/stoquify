"use strict";
// Inert unless explicitly invoked. Only the established owned loopback fixture.
async function main() {
  const local = require('./registration-local.cjs'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
  const { spawnSync } = require('node:child_process');
  const migration = '20261004000000_close_evidence_notifications', sql = fs.readFileSync(path.join(local.root, 'prisma/migrations', migration, 'migration.sql'), 'utf8');
  const report = { at: new Date().toISOString(), migration, checksum: crypto.createHash('sha256').update(sql).digest('hex'), database: local.database, applied: false };
  const output = path.join(__dirname, 'close-notification-schema-' + crypto.randomUUID() + '.json');
  try {
    await local.withClient(local.targetUrl(), async client => {
      await local.assertOwned(client);
      assert.equal((await client.query('SELECT 1 FROM _prisma_migrations WHERE migration_name=$1', [migration])).rowCount, 0);
      assert.equal((await client.query("SELECT to_regclass('public.close_evidence_notifications') AS existing")).rows[0].existing, null);
      const snapshot = async () => (await client.query('SELECT count(*)::int AS count, md5(coalesce(string_agg(to_jsonb(s)::text, \'\' ORDER BY id), \'\')) AS hash FROM business_event_outbox s')).rows[0];
      report.before = await snapshot();
      await client.query('BEGIN');
      try { await client.query("SET LOCAL lock_timeout='5s'"); await client.query(sql); assert.deepEqual(await snapshot(), report.before); }
      finally { await client.query('ROLLBACK'); }
      report.rehearsalRolledBack = true;
      assert.equal((await client.query("SELECT to_regclass('public.close_evidence_notifications') AS existing")).rows[0].existing, null);
      await client.query('BEGIN');
      try {
        await client.query("SET LOCAL lock_timeout='5s'"); await client.query(sql); report.after = await snapshot(); assert.deepEqual(report.after, report.before);
        await client.query('COMMIT'); report.applied = true;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    });
    const target = local.targetUrl().toString();
    const result = spawnSync(process.execPath, [path.join(local.root, 'node_modules/prisma/build/index.js'), 'migrate', 'resolve', '--applied', migration], { cwd: local.root, env: { ...process.env, DATABASE_URL: target, DIRECT_URL: target }, encoding: 'utf8', windowsHide: true });
    report.historyExitCode = result.status; assert.equal(result.status, 0, 'Applied SQL; owned history needs recovery');
    await local.withClient(local.targetUrl(), async client => {
      await local.assertOwned(client);
      const rows = (await client.query('SELECT checksum,finished_at,rolled_back_at FROM _prisma_migrations WHERE migration_name=$1', [migration])).rows;
      assert.equal(rows.length, 1); assert.equal(rows[0].checksum, report.checksum); assert.ok(rows[0].finished_at && !rows[0].rolled_back_at);
    });
    report.historyRecorded = true; report.passed = true;
  } catch (error) { report.error = String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]'); }
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ output, ...report })); process.exitCode = report.passed ? 0 : 1;
}
if (require.main === module && process.argv[2] === '--apply') main();
