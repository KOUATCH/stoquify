const fs = require('node:fs'), path = require('node:path')
const { Client } = require('pg')
const dotenv = require('dotenv')
const { assertDisposableDatabaseTarget } = require('../../../../../scripts/disposable-fixture-guard')
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true })
const databaseName = 'stoquify_restore_local_remediation_20260930_run01'
const outputName = process.argv[2] || 'journal-boundary-probes'
if (!/^[a-z0-9-]+$/.test(outputName) || fs.existsSync(path.join(__dirname, outputName + '.json'))) throw Error('FRESH_EVIDENCE_NAME_REQUIRED')
const report = { startedAt: new Date().toISOString(), scope: 'ROLLED_BACK_PROBES_ON_THIS_RUN_RESTORED_COPY', databaseName,
  sourceMutationAttempted: false, committedMutation: false, recordIdentifiersEmitted: false, probes: [] }
async function run() {
  let client, transaction = false
  try {
    const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'execution.json'), 'utf8'))
    if (!receipt.databaseCreatedByThisRun || receipt.databaseName !== databaseName || receipt.status !== 'RESTORE_REHEARSAL_READY') throw Error('RESTORE_RECEIPT_REQUIRED')
    const raw = (process.env.DATABASE_URL || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, k) => process.env[k] || '').replace(/^['"]|['"]$/g, '').trim()
    const url = new URL(raw)
    url.pathname = '/' + databaseName
    const guarded = assertDisposableDatabaseTarget(url.toString(), [databaseName])
    client = new Client({ connectionString: guarded.url, application_name: 'stoquify_remediation_rollback_probes',
      options: '-c statement_timeout=10000 -c lock_timeout=2000' })
    await client.connect()
    const identity = (await client.query('SELECT current_database() AS name')).rows[0]
    if (identity.name !== databaseName) throw Error('RESTORED_DATABASE_IDENTITY_MISMATCH')
    await client.query('BEGIN')
    transaction = true
    const candidate = (await client.query(`SELECT l.id, l."organizationId", l."journalEntryId" FROM journal_entry_lines l
      JOIN journal_entries j ON j.id=l."journalEntryId"
      WHERE j.status::text='POSTED' ORDER BY l.id LIMIT 1`)).rows[0]
    const other = candidate && (await client.query('SELECT id FROM organizations WHERE id <> $1 ORDER BY id LIMIT 1', [candidate.organizationId])).rows[0]
    const cases = candidate ? [
      { name: 'posted_line_economic_amount_update', invariant: 'Posted amounts require a compensating correction, not in-place editing.',
        sql: 'UPDATE journal_entry_lines SET debit=debit+1 WHERE id=$1', params: [candidate.id] },
      { name: 'posted_entry_return_to_draft', invariant: 'A posted journal cannot become an editable draft.',
        sql: 'UPDATE journal_entries SET status=\'DRAFT\' WHERE id=$1', params: [candidate.journalEntryId] },
      ...(other ? [{ name: 'line_header_tenant_mismatch', invariant: 'Journal lines and their parent journal must belong to the same tenant.',
        sql: 'UPDATE journal_entry_lines SET "organizationId"=$2 WHERE id=$1', params: [candidate.id, other.id] }] : []),
    ] : []
    for (const probe of cases) {
      await client.query('SAVEPOINT boundary_probe')
      const result = { name: probe.name, invariant: probe.invariant }
      try {
        const changed = await client.query(probe.sql, probe.params)
        await client.query('SET CONSTRAINTS ALL IMMEDIATE')
        result.outcome = changed.rowCount === 1 ? 'DATABASE_ACCEPTED_IN_ROLLED_BACK_TRANSACTION' : 'INCONCLUSIVE_NO_MATCH'
        result.affectedRows = changed.rowCount
      } catch (error) {
        result.outcome = 'DATABASE_REJECTED'
        result.sqlState = error.code || 'UNKNOWN'
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT boundary_probe')
        await client.query('RELEASE SAVEPOINT boundary_probe')
        result.rolledBack = true
      }
      report.probes.push(result)
    }
    report.status = cases.length === 3 ? (report.probes.some(p => p.outcome === 'DATABASE_ACCEPTED_IN_ROLLED_BACK_TRANSACTION') ? 'DATABASE_BOUNDARY_GAPS_REPRODUCED' : 'PROBES_REJECTED_REVIEW_SQL_STATES') : 'INSUFFICIENT_FIXTURE'
    report.limitations = ['No commit was attempted; deferred constraints were forced before each rollback.', 'The configured database role is not proven to match a deployed least-privilege application role.', 'These tests measure database enforcement, not whether the application exposes an authorized path to these writes.']
  } catch (error) {
    report.status = 'PROBE_SETUP_BLOCKED'
    report.errorCode = /^[A-Z0-9_]+$/.test(error.message || '') ? error.message : error.code || 'SETUP_ERROR'
  } finally {
    if (client) {
      if (transaction) { try { await client.query('ROLLBACK'); report.rollbackConfirmed = true } catch { report.rollbackConfirmed = false } }
      await client.end().catch(() => {})
    }
    report.completedAt = new Date().toISOString()
    fs.writeFileSync(path.join(__dirname, outputName + '.json'), JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify(report))
  }
}
run().catch(() => { process.exitCode = 1 })
