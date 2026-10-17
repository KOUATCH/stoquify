const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const { Client } = require('pg')
const dotenv = require('dotenv')
const root = path.resolve(__dirname, '../../../..')
const { assertDisposableDatabaseTarget } = require(path.join(root, 'scripts/disposable-fixture-guard'))
for (const file of ['.env.local', '.env']) {
  const full = path.join(root, file)
  if (fs.existsSync(full)) dotenv.config({ path: full, quiet: true })
}
const databaseName = 'stoquify_restore_local_remediation_20260930_run01'
const migration = '20260930213000_journal_posted_status_transitions'
const priorMigration = '20260930211500_journal_posted_line_tenant_guards'
const output = path.join(__dirname, 'journal-guard-supplement-results.json')
if (fs.existsSync(output)) throw Error('EVIDENCE_ALREADY_EXISTS')
const report = {
  startedAt: new Date().toISOString(), databaseName, migration,
  sourceDatabaseTouched: false, recordIdentifiersEmitted: false, stages: [], checks: [],
}
async function run() {
  let client, transaction = false
  try {
    const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, '../data-impact/restore/execution.json'), 'utf8'))
    const previous = JSON.parse(fs.readFileSync(path.join(__dirname, '../data-impact/restore/journal-migration-verification.json'), 'utf8'))
    if (!receipt.databaseCreatedByThisRun || receipt.databaseName !== databaseName || receipt.status !== 'RESTORE_REHEARSAL_READY') throw Error('RESTORE_RECEIPT_REQUIRED')
    if (previous.databaseName !== databaseName || previous.status !== 'NARROW_GUARDS_VERIFIED_ON_RESTORED_COPY') throw Error('PRIOR_MIGRATION_RECEIPT_REQUIRED')
    const raw = (process.env.DATABASE_URL || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => process.env[key] || '').replace(/^['"]|['"]$/g, '').trim()
    const url = new URL(raw)
    url.pathname = '/' + databaseName
    const guarded = assertDisposableDatabaseTarget(url.toString(), [databaseName])
    client = new Client({ connectionString: guarded.url, application_name: 'stoquify_journal_guard_supplement', options: '-c statement_timeout=10000 -c lock_timeout=2000' })
    await client.connect()
    if ((await client.query('SELECT current_database() AS name')).rows[0].name !== databaseName) throw Error('RESTORED_DATABASE_IDENTITY_MISMATCH')
    const prior = (await client.query('SELECT checksum FROM _prisma_migrations WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL', [priorMigration])).rows
    if (prior.length !== 1 || prior[0].checksum !== previous.migrationSha256) throw Error('PRIOR_MIGRATION_CHECKSUM_MISMATCH')
    report.priorMigrationSha256 = prior[0].checksum
    report.migrationSha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'prisma/migrations', migration, 'migration.sql'))).digest('hex')
    report.migrationsBefore = Number((await client.query('SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows[0].count)
    for (const command of ['deploy', 'status']) {
      const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', command], {
        cwd: root, env: { ...process.env, DATABASE_URL: guarded.url, DIRECT_URL: guarded.url },
        encoding: 'utf8', shell: false, windowsHide: true, timeout: 180000, maxBuffer: 5 * 1024 * 1024,
      })
      report.stages.push({ command: 'prisma migrate ' + command, exitCode: result.status, errorCode: result.error?.code, completedAt: new Date().toISOString() })
      if (result.status !== 0 || result.error) throw Error('PRISMA_MIGRATION_' + command.toUpperCase() + '_FAILED')
    }
    const applied = (await client.query('SELECT checksum FROM _prisma_migrations WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL', [migration])).rows
    if (applied.length !== 1 || applied[0].checksum !== report.migrationSha256) throw Error('MIGRATION_CHECKSUM_MISMATCH')
    const retainedPrior = (await client.query('SELECT checksum FROM _prisma_migrations WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL', [priorMigration])).rows
    if (retainedPrior.length !== 1 || retainedPrior[0].checksum !== report.priorMigrationSha256) throw Error('PRIOR_MIGRATION_CHANGED')
    report.priorMigrationChecksumPreserved = true
    report.migrationsAfter = Number((await client.query('SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows[0].count)
    await client.query('BEGIN')
    transaction = true
    const parent = (await client.query(`SELECT j.id,j."organizationId",j."journalId",j."periodId",j.currency,p."startDate",l."accountId"
      FROM journal_entries j JOIN journal_entry_lines l ON l."journalEntryId"=j.id
      JOIN chart_of_accounts a ON a.id=l."accountId" AND a."organizationId"=j."organizationId"
      JOIN accounting_periods p ON p.id=j."periodId"
      WHERE j.status::text='POSTED' AND l."organizationId"=j."organizationId" ORDER BY j.id,l.id LIMIT 1`)).rows[0]
    if (!parent) throw Error('POSTED_FIXTURE_REQUIRED')
    const otherAccount = (await client.query('SELECT id FROM chart_of_accounts WHERE "organizationId"<>$1 LIMIT 1', [parent.organizationId])).rows[0]
    if (!otherAccount) throw Error('FOREIGN_TENANT_ACCOUNT_FIXTURE_REQUIRED')
    const suffix = crypto.randomUUID()
    const draftId = 'guard89_draft_' + suffix, postedId = 'guard89_posted_' + suffix, reversedId = 'guard89_reversed_' + suffix
    async function createEntry(id, status) {
      return client.query(`INSERT INTO journal_entries(id,"organizationId","journalId","periodId","entryNumber","entryDate",status,currency,"sourceType","updatedAt")
        VALUES($1,$2,$3,$4,$1,$5,$6::"JournalEntryStatus",$7,'MANUAL',now())`, [id,parent.organizationId,parent.journalId,parent.periodId,parent.startDate,status,parent.currency])
    }
    async function createLine(id, entryId, number, debit, credit, accountId = parent.accountId) {
      return client.query(`INSERT INTO journal_entry_lines(id,"organizationId","journalEntryId","accountId","lineNumber",debit,credit,currency,"baseDebit","baseCredit")
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$6,$7)`, [id,parent.organizationId,entryId,accountId,number,debit,credit,parent.currency])
    }
    for (const [id, status] of [[draftId,'DRAFT'],[postedId,'POSTED'],[reversedId,'REVERSED']]) {
      await createEntry(id, status)
      await createLine(id + '_debit', id, 1, 100, 0)
      await createLine(id + '_credit', id, 2, 0, 100)
    }
    const changeStatus = (id, status) => client.query('UPDATE journal_entries SET status=$2::"JournalEntryStatus" WHERE id=$1', [id,status])
    const checks = [
      ['posted_line_delete_rejected', true, () => client.query('DELETE FROM journal_entry_lines WHERE id=$1', [postedId+'_debit'])],
      ['reversed_line_delete_rejected', true, () => client.query('DELETE FROM journal_entry_lines WHERE id=$1', [reversedId+'_debit'])],
      ['reversed_line_update_rejected', true, () => client.query('UPDATE journal_entry_lines SET debit=debit+1 WHERE id=$1', [reversedId+'_debit'])],
      ['posted_to_draft_rejected', true, () => changeStatus(postedId,'DRAFT')],
      ['reversed_to_draft_rejected', true, () => changeStatus(reversedId,'DRAFT')],
      ['posted_to_voided_rejected', true, () => changeStatus(postedId,'VOIDED')],
      ['reversed_to_voided_rejected', true, () => changeStatus(reversedId,'VOIDED')],
      ['reversed_to_posted_rejected', true, () => changeStatus(reversedId,'POSTED')],
      ['posted_voided_draft_sequence_rejected', true, async () => { await changeStatus(postedId,'VOIDED'); return changeStatus(postedId,'DRAFT') }],
      ['account_only_tenant_mismatch_insert_rejected', true, () => createLine('guard89_foreign_'+suffix,draftId,3,10,0,otherAccount.id)],
      ['account_only_tenant_mismatch_update_rejected', true, () => client.query('UPDATE journal_entry_lines SET "accountId"=$2 WHERE id=$1', [draftId+'_debit',otherAccount.id])],
      ['posted_to_reversed_allowed', false, () => changeStatus(postedId,'REVERSED')],
      ['posted_same_status_allowed', false, () => changeStatus(postedId,'POSTED')],
      ['reversed_same_status_allowed', false, () => changeStatus(reversedId,'REVERSED')],
      ['draft_to_posted_allowed', false, () => changeStatus(draftId,'POSTED')],
      ['draft_to_voided_allowed', false, () => changeStatus(draftId,'VOIDED')],
      ['source_posted_parent_with_nested_lines_allowed', false, async () => {
        const id = 'guard89_source_' + suffix
        await createEntry(id,'POSTED')
        await createLine(id+'_debit',id,1,100,0)
        return createLine(id+'_credit',id,2,0,100)
      }],
    ]
    for (const [name, expectRejection, execute] of checks) {
      await client.query('SAVEPOINT journal_guard_supplement')
      let sqlState = null, affectedRows = null
      try { affectedRows = (await execute()).rowCount; await client.query('SET CONSTRAINTS ALL IMMEDIATE') }
      catch (error) { sqlState = error.code || 'UNKNOWN' }
      await client.query('ROLLBACK TO SAVEPOINT journal_guard_supplement')
      await client.query('RELEASE SAVEPOINT journal_guard_supplement')
      report.checks.push({ name, passed: expectRejection ? sqlState === '23514' : !sqlState && affectedRows === 1, sqlState, affectedRows, rolledBack: true })
    }
    report.status = report.checks.every(check => check.passed) ? 'SUPPLEMENTAL_GUARDS_VERIFIED_ON_RESTORED_COPY' : 'GUARD_VERIFICATION_FAILED'
    report.limitations = [
      'No source database writes or historical repairs; only migration installation persists on this-run disposable clone.',
      'No complete header immutability, late-insert prevention, tenant reassignment, cascade retention, runtime-role or concurrent draft-edit/post qualification.',
      'This is transactional SQL behavior proof, not complete application producer or reversal workflow qualification.',
    ]
  } catch (error) {
    report.status = 'VERIFICATION_BLOCKED'
    report.errorCode = /^[A-Z0-9_]+$/.test(error.message || '') ? error.message : error.code || 'SETUP_ERROR'
  } finally {
    if (client) {
      if (transaction) {
        try { await client.query('ROLLBACK'); report.fixtureRollbackConfirmed = true }
        catch { report.fixtureRollbackConfirmed = false }
      }
      await client.end().catch(() => {})
    }
    report.completedAt = new Date().toISOString()
    fs.writeFileSync(output, JSON.stringify(report,null,2)+'\n')
    console.log(JSON.stringify(report))
    if (report.status !== 'SUPPLEMENTAL_GUARDS_VERIFIED_ON_RESTORED_COPY' || !report.fixtureRollbackConfirmed) process.exitCode = 1
  }
}
run().catch(() => { process.exitCode = 1 })
