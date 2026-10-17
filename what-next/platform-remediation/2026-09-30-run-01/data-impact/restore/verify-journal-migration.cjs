const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const { Client } = require('pg')
const dotenv = require('dotenv')
const { assertDisposableDatabaseTarget } = require('../../../../../scripts/disposable-fixture-guard')
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true })
const databaseName = 'stoquify_restore_local_remediation_20260930_run01'
const output = path.join(__dirname, 'journal-migration-verification.json')
if (fs.existsSync(output)) throw Error('EVIDENCE_ALREADY_EXISTS')
const migration = '20260930211500_journal_posted_line_tenant_guards'
const report = { startedAt: new Date().toISOString(), databaseName, migration, sourceDatabaseTouched: false, stages: [], checks: [] }
async function run() {
  let client, transaction = false
  try {
    const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'execution.json'), 'utf8'))
    if (!receipt.databaseCreatedByThisRun || receipt.databaseName !== databaseName || receipt.status !== 'RESTORE_REHEARSAL_READY') throw Error('RESTORE_RECEIPT_REQUIRED')
    const raw = (process.env.DATABASE_URL || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, k) => process.env[k] || '').replace(/^['"]|['"]$/g, '').trim()
    const url = new URL(raw); url.pathname = '/' + databaseName
    const guarded = assertDisposableDatabaseTarget(url.toString(), [databaseName])
    client = new Client({ connectionString: guarded.url, application_name: 'stoquify_remediation_journal_migration', options: '-c statement_timeout=10000 -c lock_timeout=2000' })
    await client.connect()
    if ((await client.query('SELECT current_database() AS name')).rows[0].name !== databaseName) throw Error('RESTORED_DATABASE_IDENTITY_MISMATCH')
    report.migrationSha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join('prisma/migrations', migration, 'migration.sql'))).digest('hex')
    report.migrationsBefore = Number((await client.query('SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows[0].count)
    for (const command of ['deploy', 'status']) {
      const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', command], {
        cwd: process.cwd(), env: { ...process.env, DATABASE_URL: guarded.url, DIRECT_URL: guarded.url },
        encoding: 'utf8', shell: false, windowsHide: true, timeout: 180000, maxBuffer: 5 * 1024 * 1024,
      })
      report.stages.push({ command: 'prisma migrate ' + command, exitCode: result.status, errorCode: result.error?.code, completedAt: new Date().toISOString() })
      if (result.status !== 0 || result.error) throw Error('PRISMA_MIGRATION_' + command.toUpperCase() + '_FAILED')
    }
    const applied = (await client.query('SELECT checksum, finished_at FROM _prisma_migrations WHERE migration_name=$1 AND rolled_back_at IS NULL', [migration])).rows
    if (applied.length !== 1 || !applied[0].finished_at || applied[0].checksum !== report.migrationSha256) throw Error('MIGRATION_CHECKSUM_MISMATCH')
    report.migrationsAfter = Number((await client.query('SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows[0].count)
    await client.query('BEGIN'); transaction = true
    const parent = (await client.query(`SELECT j.id, j."organizationId", j."journalId", j."periodId", p."startDate", j.currency,
      l."accountId" FROM journal_entries j JOIN journal_entry_lines l ON l."journalEntryId"=j.id
      JOIN accounting_periods p ON p.id=j."periodId" WHERE j.status::text='POSTED' ORDER BY j.id,l.id LIMIT 1`)).rows[0]
    if (!parent) throw Error('POSTED_FIXTURE_REQUIRED')
    const other = (await client.query('SELECT id FROM organizations WHERE id<>$1 LIMIT 1', [parent.organizationId])).rows[0]
    if (!other) throw Error('SECOND_TENANT_REQUIRED')
    const suffix = crypto.randomUUID(), draftId = 'journal_guard_draft_' + suffix, lineId = 'journal_guard_line_' + suffix
    async function createEntry(id, status) {
      await client.query(`INSERT INTO journal_entries(id,"organizationId","journalId","periodId","entryNumber","entryDate",status,currency,"sourceType","updatedAt")
        VALUES($1,$2,$3,$4,$1,$5,$6::"JournalEntryStatus",$7,'MANUAL',now())`, [id,parent.organizationId,parent.journalId,parent.periodId,parent.startDate,status,parent.currency])
    }
    async function createLine(id, parentId, number, debit, credit, organizationId = parent.organizationId) {
      return client.query(`INSERT INTO journal_entry_lines(id,"organizationId","journalEntryId","accountId","lineNumber",debit,credit,currency,"baseDebit","baseCredit")
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$6,$7)`, [id,organizationId,parentId,parent.accountId,number,debit,credit,parent.currency])
    }
    await createEntry(draftId, 'DRAFT')
    await createLine(lineId, draftId, 1, 100, 0)
    await createLine(lineId + '_credit', draftId, 2, 0, 100)
    const checks = [
      ['draft_line_update_allowed', false, () => client.query('UPDATE journal_entry_lines SET description=$2 WHERE id=$1', [lineId,'guard fixture'])],
      ['draft_line_delete_allowed', false, () => client.query('DELETE FROM journal_entry_lines WHERE id=$1', [lineId])],
      ['draft_to_posted_allowed', false, () => client.query('UPDATE journal_entries SET status=\'POSTED\' WHERE id=$1', [draftId])],
      ['posted_to_reversed_allowed', false, () => client.query('UPDATE journal_entries SET status=\'REVERSED\', "reversedAt"=now() WHERE id=$1', [parent.id])],
      ['source_posted_parent_with_nested_lines_allowed', false, async () => { const id='journal_guard_posted_'+suffix; await createEntry(id,'POSTED'); await createLine(id+'_debit',id,1,100,0); return createLine(id+'_credit',id,2,0,100) }],
      ['foreign_tenant_draft_line_insert_rejected', true, () => createLine('journal_guard_foreign_'+suffix,draftId,3,0,100,other.id)],
      ['foreign_tenant_draft_line_update_rejected', true, () => client.query('UPDATE journal_entry_lines SET "organizationId"=$2 WHERE id=$1', [lineId,other.id])],
      ['draft_line_move_into_posted_rejected', true, () => client.query('UPDATE journal_entry_lines SET "journalEntryId"=$2,"lineNumber"=999999 WHERE id=$1', [lineId,parent.id])],
    ]
    for (const [name, expectRejection, execute] of checks) {
      await client.query('SAVEPOINT journal_guard_case')
      let sqlState = null, affectedRows = null
      try { affectedRows = (await execute()).rowCount; await client.query('SET CONSTRAINTS ALL IMMEDIATE') }
      catch (error) { sqlState = error.code || 'UNKNOWN' }
      await client.query('ROLLBACK TO SAVEPOINT journal_guard_case')
      await client.query('RELEASE SAVEPOINT journal_guard_case')
      report.checks.push({ name, passed: expectRejection ? sqlState === '23514' : !sqlState && affectedRows === 1, sqlState, affectedRows, rolledBack: true })
    }
    report.status = report.checks.every(c => c.passed) ? 'NARROW_GUARDS_VERIFIED_ON_RESTORED_COPY' : 'GUARD_VERIFICATION_FAILED'
    report.limitations = ['Does not prevent additional INSERTs into an already committed POSTED entry.', 'Does not certify all posted-header mutation, parent-cascade retention, draft-edit/post concurrency, least-privilege role or source-owned correction rules.', 'Production/source database remains at its previous migration count; no historical rows were repaired.']
  } catch (error) {
    report.status = 'VERIFICATION_BLOCKED'
    report.errorCode = /^[A-Z0-9_]+$/.test(error.message || '') ? error.message : error.code || 'SETUP_ERROR'
  } finally {
    if (client) { if (transaction) { try { await client.query('ROLLBACK'); report.fixtureRollbackConfirmed=true } catch { report.fixtureRollbackConfirmed=false } } await client.end().catch(() => {}) }
    report.completedAt = new Date().toISOString()
    fs.writeFileSync(output, JSON.stringify(report,null,2)+'\n')
    console.log(JSON.stringify(report))
    if (report.status !== 'NARROW_GUARDS_VERIFIED_ON_RESTORED_COPY') process.exitCode=1
  }
}
run().catch(() => { process.exitCode=1 })
