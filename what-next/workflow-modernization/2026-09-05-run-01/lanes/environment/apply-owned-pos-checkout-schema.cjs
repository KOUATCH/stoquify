const local = require('./registration-local.cjs');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const migration = '20260920060000_pos_checkout_lifecycle';
const sql = fs.readFileSync(path.join(local.root, 'prisma/migrations', migration, 'migration.sql'), 'utf8');
const checksum = crypto.createHash('sha256').update(sql).digest('hex');
const output = path.join(__dirname, 'owned-pos-schema-' + crypto.randomUUID() + '.json');
const report = { at: new Date().toISOString(), migration, checksum, database: local.database, applied: false };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
async function main() {
  await local.withClient(local.targetUrl(), async client => {
    await local.assertOwned(client);
    assert.equal((await client.query('SELECT 1 FROM _prisma_migrations WHERE migration_name=$1', [migration])).rowCount, 0);
    assert.equal((await client.query("SELECT to_regclass('public.pos_checkout_workspaces') AS existing")).rows[0].existing, null);
    assert.equal((await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_orders' AND column_name='posCartState'")).rowCount, 0);
    const snapshot = async () => (await client.query("SELECT count(*)::int AS count, md5(coalesce(string_agg((to_jsonb(s) - 'posCartState')::text, '' ORDER BY id), '')) AS hash FROM sales_orders s")).rows[0];
    report.before = await snapshot();
    // Rehearse the exact additive migration transactionally, then roll it back.
    await client.query('BEGIN');
    try {
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query(sql);
      assert.deepEqual(await snapshot(), report.before);
      assert.equal((await client.query('SELECT count(*)::int AS count FROM sales_orders WHERE "posCartState" <> \'ACTIVE\'')).rows[0].count, 0);
    } finally { await client.query('ROLLBACK'); }
    report.rehearsalRolledBack = true;
    assert.equal((await client.query("SELECT to_regclass('public.pos_checkout_workspaces') AS existing")).rows[0].existing, null);
    await client.query('BEGIN');
    try {
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query(sql);
      report.after = await snapshot();
      assert.deepEqual(report.after, report.before);
      await client.query('COMMIT'); report.applied = true;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  });
  // Record only the inspected migration actually applied to this owned target.
  const target = local.targetUrl().toString();
  const result = spawnSync(process.execPath, [path.join(local.root, 'node_modules/prisma/build/index.js'), 'migrate', 'resolve', '--applied', migration], { cwd: local.root, env: { ...process.env, DATABASE_URL: target, DIRECT_URL: target }, encoding: 'utf8', windowsHide: true });
  report.historyExitCode = result.status;
  assert.equal(result.status, 0, 'SQL applied; local migration history needs recovery');
  await local.withClient(local.targetUrl(), async client => {
    await local.assertOwned(client);
    const rows = (await client.query('SELECT checksum,finished_at,rolled_back_at FROM _prisma_migrations WHERE migration_name=$1', [migration])).rows;
    assert.equal(rows.length, 1); assert.equal(rows[0].checksum, checksum);
    assert.ok(rows[0].finished_at && !rows[0].rolled_back_at);
  });
  report.historyRecorded = true; report.passed = true;
}
main().catch(error => { report.error = String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]'); process.exitCode = 1; }).finally(() => {
  const value = JSON.stringify(report, null, 2), fd = fs.openSync(output, 'r+');
  try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); }
  console.log(JSON.stringify({ output, ...report }));
});
