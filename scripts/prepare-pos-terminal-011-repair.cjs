// Read-only inspection and backup. This script cannot apply a repair.
const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')
const { loadDatabaseUrl } = require('./prisma-local-fresh-bootstrap.js')

const database = 'stoquify_replay_next_20260830'
const org = 'rds_org_001'
const conflictId = 'rds_org_001_pos_offline_sync_conflict_011'
async function main() {
  const url = new URL(loadDatabaseUrl())
  if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || decodeURIComponent(url.pathname.slice(1)) !== database) throw new Error('Refusing unreviewed target')
  const client = new Client({ connectionString: url.toString() })
  await client.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const identity = (await client.query('SELECT current_database() AS name')).rows[0]
    if (identity.name !== database) throw new Error('Database identity changed')
    const conflicts = (await client.query('SELECT * FROM pos_offline_sync_conflicts WHERE id=$1 AND "organizationId"=$2', [conflictId, org])).rows
    if (conflicts.length !== 1) throw new Error('Expected conflict unavailable')
    const deviceId = conflicts[0].deviceId
    const devices = (await client.query('SELECT id, "organizationId", "terminalId", "locationId", "deviceLabel", status, metadata FROM pos_offline_devices WHERE id=$1 AND "organizationId"=$2', [deviceId, org])).rows
    if (devices.length !== 1) throw new Error('Expected device unavailable')
    const device = devices[0]
    const events = (await client.query('SELECT * FROM pos_offline_events WHERE "deviceId"=$1 OR ("organizationId"=$2 AND "terminalId"=$3) ORDER BY id', [deviceId, org, device.terminalId])).rows
    const allConflicts = (await client.query('SELECT * FROM pos_offline_sync_conflicts WHERE "deviceId"=$1 ORDER BY id', [deviceId])).rows
    const certificates = (await client.query('SELECT * FROM pos_offline_sync_certificates WHERE "deviceId"=$1 OR ("organizationId"=$2 AND "terminalId"=$3) ORDER BY id', [deviceId, org, device.terminalId])).rows
    const batches = (await client.query('SELECT id, "organizationId", "deviceId", status, metadata FROM pos_offline_sync_batches WHERE "deviceId"=$1 ORDER BY id', [deviceId])).rows
    await client.query('ROLLBACK')
    const backup = { preparedAt: new Date().toISOString(), database, organizationId: org, device, events, conflicts: allConflicts, certificates, batches }
    const dir = path.resolve('docs/UI/UX/evidence/pos-finance-sales-2026-10-12/terminal-011-repair')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `snapshot-${Date.now()}.json`)
    fs.writeFileSync(file, JSON.stringify(backup, null, 2), { flag: 'wx' })
    console.log(JSON.stringify({ backup: file, database, device, events: events.map(({ id, status, sessionId, payload, metadata, businessEventId, postingBatchId, documentHash }) => ({ id, status, sessionId, payload, metadata, businessEventId, postingBatchId, documentHash })), conflicts: allConflicts.map(({ id, status, eventId, metadata }) => ({ id, status, eventId, metadata })), certificates: certificates.map(({ id, status, closeBlocker, metadata }) => ({ id, status, closeBlocker, metadata })), batches }, null, 2))
  } finally { await client.end() }
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1 })
