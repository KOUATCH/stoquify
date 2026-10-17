// Generates reviewable SQL only; never connects to a database or executes SQL.
const fs = require('node:fs')
const path = require('node:path')
const dir = path.resolve('docs/UI/UX/evidence/pos-finance-sales-2026-10-12/terminal-011-repair')
const before = JSON.parse(fs.readFileSync(path.join(dir, 'snapshot-native-timestamps.json'), 'utf8'))
const repairId = 'pos-terminal-011-fixture-repair-20261012'
const reason = 'User confirmed Terminal 011 offline records are disposable local test fixtures. Retire unused seed evidence; no sale, payment, replay or certification is asserted.'
const q = value => value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const json = value => `${q(JSON.stringify(value))}::jsonb`
const rows = [
  { table: 'pos_offline_events', row: before.events[0], status: 'REJECTED', updates: { status: 'REJECTED', blockerCode: 'LOCAL_TEST_FIXTURE_RETIRED', blockerMessage: reason }, restore: ['status', 'blockerCode', 'blockerMessage', 'metadata', 'updatedAt'] },
  { table: 'pos_offline_sync_conflicts', row: before.conflicts[0], status: 'DISMISSED', updates: { status: 'DISMISSED', resolutionNote: reason }, restore: ['status', 'resolutionNote', 'resolvedAt', 'metadata', 'updatedAt'] },
  { table: 'pos_offline_sync_certificates', row: before.certificates[0], status: 'EXPIRED', updates: { status: 'EXPIRED', closeBlocker: false, blockerCode: 'LOCAL_TEST_FIXTURE_RETIRED', blockerMessage: reason }, restore: ['status', 'closeBlocker', 'blockerCode', 'blockerMessage', 'metadata', 'updatedAt'] },
]
if (before.database !== 'stoquify_replay_next_20260830' || before.organizationId !== 'rds_org_001' || before.events.length !== 1 || before.conflicts.length !== 1 || before.certificates.length !== 1 || before.events[0].payload.seed !== true || before.events[0].businessEventId || before.events[0].postingBatchId || before.events[0].documentHash || before.events[0].sessionId || before.conflicts[0].eventId) throw new Error('Snapshot is not the reviewed seed-only scope')
const header = `-- Prepared only. Execute through a reviewed local connection after approval.\nBEGIN ISOLATION LEVEL SERIALIZABLE;\nSET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '10s';\n`
const identity = `IF current_database() <> ${q(before.database)} OR inet_server_addr() IS NOT NULL AND inet_server_addr() NOT IN ('127.0.0.1'::inet, '::1'::inet) THEN RAISE EXCEPTION 'Wrong local database'; END IF;`
const scope = `"organizationId"=${q(before.organizationId)} AND "deviceId"=${q(before.device.id)}`
const audit = (suffix, action) => `INSERT INTO audit_logs (id,"entityType","entityId",action,changes,"organizationId","createdAt") VALUES (${q(`${repairId}-${suffix}`)},'POSOfflineDevice',${q(before.device.id)},${q(action)},${json({ repairId, reason, before: rows.map(({ table, row }) => ({ table, row })) })},${q(before.organizationId)},CURRENT_TIMESTAMP);`
let apply = header + `DO $repair$\nDECLARE current_row jsonb;\nBEGIN\n${identity}\n`
// Short table locks prevent new offline evidence racing the snapshot checks.
apply += `LOCK TABLE pos_offline_devices, pos_offline_events, pos_offline_sync_conflicts, pos_offline_sync_certificates IN SHARE ROW EXCLUSIVE MODE;\n`
apply += `IF (SELECT count(*) FROM pos_offline_devices WHERE "organizationId"=${q(before.organizationId)} AND "terminalId"=${q(before.device.terminalId)}) <> 1 THEN RAISE EXCEPTION 'Device scope changed'; END IF;\n`
for (const { table, row } of rows) {
  const rowScope = table === 'pos_offline_sync_conflicts' ? scope : `(${scope}) OR ("organizationId"=${q(before.organizationId)} AND "terminalId"=${q(before.device.terminalId)})`
  apply += `IF (SELECT count(*) FROM ${table} WHERE ${rowScope}) <> 1 THEN RAISE EXCEPTION 'Scope changed: ${table}'; END IF;\n`
  apply += `SELECT to_jsonb(t) INTO STRICT current_row FROM ${table} t WHERE id=${q(row.id)} AND ${scope} FOR UPDATE;\nIF current_row IS DISTINCT FROM to_jsonb(jsonb_populate_record(NULL::${table}, ${json(row)})) THEN RAISE EXCEPTION 'Snapshot changed: ${table}'; END IF;\n`
}
for (const { table, row, updates } of rows) {
  const set = Object.entries(updates).map(([key, value]) => `"${key}"=${typeof value === 'boolean' ? value : q(value)}`)
  set.push(`metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('localFixtureRepair',jsonb_build_object('id',${q(repairId)},'reason',${q(reason)},'at',CURRENT_TIMESTAMP))`, '"updatedAt"=CURRENT_TIMESTAMP')
  if (table === 'pos_offline_sync_conflicts') set.push('"resolvedAt"=CURRENT_TIMESTAMP')
  apply += `UPDATE ${table} SET ${set.join(',')} WHERE id=${q(row.id)} AND ${scope};\n`
}
apply += audit('apply', 'LOCAL_POS_TEST_FIXTURE_RETIRED') + '\nEND $repair$;\nCOMMIT;\n'
let rollback = header + `DO $repair$\nBEGIN\n${identity}\n`
for (const { table, row, status, restore } of rows) {
  rollback += `PERFORM 1 FROM ${table} WHERE id=${q(row.id)} AND ${scope} AND status=${q(status)} AND metadata->'localFixtureRepair'->>'id'=${q(repairId)} AND "updatedAt"=(SELECT "createdAt" FROM audit_logs WHERE id=${q(`${repairId}-apply`)}) FOR UPDATE;\nIF NOT FOUND THEN RAISE EXCEPTION 'Repair state changed: ${table}; investigate before rollback'; END IF;\n`
  rollback += `UPDATE ${table} t SET ${restore.map(key => `"${key}"=saved."${key}"`).join(',')} FROM jsonb_populate_record(NULL::${table},${json(row)}) saved WHERE t.id=${q(row.id)} AND t."organizationId"=${q(before.organizationId)};\n`
}
rollback += audit('rollback', 'LOCAL_POS_TEST_FIXTURE_RESTORED') + '\nEND $repair$;\nCOMMIT;\n'
for (const [name, sql] of [['apply-native.sql', apply], ['rollback-native.sql', rollback]]) fs.writeFileSync(path.join(dir, name), sql, { flag: 'wx' })
console.log('Prepared apply-native.sql and rollback-native.sql with exact database timestamps; no database changes executed.')
