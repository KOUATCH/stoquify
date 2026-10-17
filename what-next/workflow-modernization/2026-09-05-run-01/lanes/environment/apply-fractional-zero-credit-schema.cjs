"use strict";
const local = require('./registration-local.cjs');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const mode = process.argv[2];
assert.ok(['inspect', 'apply'].includes(mode) && process.argv.length === 3, 'Usage: inspect|apply');
const migration = '20260930231500_supplier_credit_zero_value_evidence';
const file = path.join(local.root, 'prisma/migrations', migration, 'migration.sql');
const sql = fs.readFileSync(file, 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const checksum = hash(sql);
assert.equal(checksum, '4e56dc79850e0937c8671500da573373f8d0aff8a4f45cf1527255684d464eec');
// Execute the pinned transaction body with assertions before COMMIT. The
// rehearsal executes exactly this body and rolls it back before the real apply.
assert.match(sql, /BEGIN;[\s\S]+COMMIT;\s*$/);
const body = sql.slice(sql.indexOf('BEGIN;') + 6).replace(/COMMIT;\s*$/, '');
const output = path.join(__dirname, 'fractional-zero-credit-schema-' + mode + '-' + crypto.randomUUID() + '.json');
const report = { at: new Date().toISOString(), mode, migration, checksum, database: local.database, applied: false, historyRecorded: false, driverSha256: hash(fs.readFileSync(__filename)) };
const tables = ['supplier_credit_notes', 'supplier_credit_note_lines', 'purchase_returns', 'purchase_return_lines', 'goods_receipts', 'goods_receipt_lines', 'supplier_invoices', 'supplier_invoice_lines', 'inventory_transactions', 'journal_entries', 'journal_entry_lines'];
const targets = ['supplier_credit_nonnegative_amounts', 'supplier_credit_line_nonnegative_amounts'];
async function constraints(c) {
  return (await c.query(`SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid IN ('supplier_credit_notes'::regclass, 'supplier_credit_note_lines'::regclass) ORDER BY conname`)).rows;
}
async function triggers(c) {
  return (await c.query(`SELECT tgrelid::regclass::text AS table_name, tgname, pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('supplier_credit_notes'::regclass, 'supplier_credit_note_lines'::regclass) ORDER BY tgname`)).rows;
}
async function snapshot(c) {
  const result = {};
  for (const table of tables) result[table] = (await c.query(`SELECT count(*)::int AS count, md5(coalesce(string_agg(to_jsonb(s)::text, '' ORDER BY id), '')) AS hash FROM "${table}" s`)).rows[0];
  return result;
}
function assertNew(rows) {
  const header = rows.find(r => r.conname === targets[0])?.definition;
  const line = rows.find(r => r.conname === targets[1])?.definition;
  assert.match(header || '', /\btotal >=/); assert.match(header || '', /subtotal \+ "taxAmount"/);
  assert.match(line || '', /"lineTotal" >=/);
}
async function main() {
  await local.withClient(local.targetUrl(), async c => {
    await local.assertOwned(c);
    report.historyBefore = (await c.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    const names = fs.readdirSync(path.join(local.root, 'prisma/migrations'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    report.pending = names.filter(name => !report.historyBefore.some(r => r.migration_name === name && r.finished_at && !r.rolled_back_at));
    report.constraintsBefore = await constraints(c); report.triggersBefore = await triggers(c); report.before = await snapshot(c);
    assert.equal(report.historyBefore.filter(r => r.migration_name === migration).length, 0, 'One-use apply requires an unapplied migration');
    assert.match(report.constraintsBefore.find(r => r.conname === targets[0])?.definition || '', /\btotal >/);
    assert.doesNotMatch(report.constraintsBefore.find(r => r.conname === targets[0])?.definition || '', /\btotal >=/);
    assert.match(report.constraintsBefore.find(r => r.conname === targets[1])?.definition || '', /"lineTotal" >/);
    if (mode === 'inspect') { report.passed = true; return; }
    async function transaction(commit) {
      await c.query('BEGIN');
      try {
        await c.query(body);
        assertNew(await constraints(c));
        assert.deepEqual((await constraints(c)).filter(r => !targets.includes(r.conname)), report.constraintsBefore.filter(r => !targets.includes(r.conname)));
        assert.deepEqual(await triggers(c), report.triggersBefore);
        assert.deepEqual(await snapshot(c), report.before);
        await c.query(commit ? 'COMMIT' : 'ROLLBACK');
      } catch (error) { await c.query('ROLLBACK'); throw error; }
    }
    await transaction(false); report.rehearsalRolledBack = true;
    assert.deepEqual(await constraints(c), report.constraintsBefore);
    await transaction(true); report.applied = true;
    report.constraintsAfter = await constraints(c); report.after = await snapshot(c);
    assert.deepEqual(report.after, report.before);
  });
  if (mode === 'apply') {
    const target = local.targetUrl().toString();
    const result = spawnSync(process.execPath, [path.join(local.root, 'node_modules/prisma/build/index.js'), 'migrate', 'resolve', '--applied', migration], { cwd: local.root, env: { ...process.env, DATABASE_URL: target, DIRECT_URL: target }, encoding: 'utf8', windowsHide: true });
    report.historyExitCode = result.status;
    assert.equal(result.status, 0, 'SQL applied; local history registration needs recovery');
    await local.withClient(local.targetUrl(), async c => {
      await local.assertOwned(c);
      const after = (await c.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
      const row = after.filter(r => r.migration_name === migration);
      assert.equal(row.length, 1); assert.equal(row[0].checksum, checksum); assert.ok(row[0].finished_at && !row[0].rolled_back_at);
      assert.deepEqual(after.filter(r => r.migration_name !== migration), report.historyBefore);
      assertNew(await constraints(c));
    });
    report.historyRecorded = true;
  }
  report.passed = true;
}
main().catch(e => { report.error = { code: e.code || e.name, message: String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]') }; process.exitCode = 1; }).finally(() => {
  fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, mode, passed: report.passed, applied: report.applied, historyRecorded: report.historyRecorded, pending: report.pending, constraints: report.constraintsAfter || report.constraintsBefore, error: report.error }));
});
