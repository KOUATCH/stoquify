#!/usr/bin/env node
// One-off repair for the explicitly authorized local RDS001 fixture. No DDL,
// trigger bypass, reseeding, postings, period changes, or nominal-amount edits.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { Prisma, PrismaClient } = require('@prisma/client')

const DATABASE = 'stoquify_replay_next_20260830'
const ORG = 'rds_org_001'
const VERSION = 'rds001-functional-amount-repair-v1'
const ACTION = 'DEMO_JOURNAL_BASE_AMOUNTS_REPAIRED'
const pad = n => String(n).padStart(3, '0')
const IDS = Array.from({ length: 12 }, (_, i) => `${ORG}_journal_entry_${pad(i + 1)}`)
const json = value => JSON.parse(JSON.stringify(value))
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const decimal = value => new Prisma.Decimal(value)

function validateTarget(raw, production = process.env.NODE_ENV === 'production') {
  const url = new URL(raw)
  assert(!production, 'Production is prohibited')
  assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Local database required')
  assert.equal(decodeURIComponent(url.pathname.slice(1)), DATABASE, 'Unexpected database')
}

function validateSnapshot(snapshot) {
  assert.equal(snapshot.settings.baseCurrency, 'XAF', 'Unexpected base currency')
  assert.equal(snapshot.entries.length, 12, 'Exactly 12 entries required')
  let missing = 0
  let totalDebit = decimal(0)
  for (const [index, entry] of snapshot.entries.entries()) {
    const suffix = pad(index + 1)
    assert.equal(entry.id, IDS[index], 'Unexpected journal identity/order')
    assert.equal(entry.organizationId, ORG)
    assert.equal(entry.entryNumber, `RDS001-JE-${suffix}`)
    assert.equal(entry.status, 'POSTED')
    assert.equal(entry.currency, 'XAF')
    assert.equal(entry.sourceType, 'POS_SALE')
    assert.equal(entry.sourceId, `${ORG}_sales_order_${suffix}`)
    assert.equal(entry.memo, `Seed sale recognition RDS001-SO-${suffix}`)
    assert.equal(entry.reversalOfEntryId, null)
    const batch = entry.postingBatch
    assert.equal(batch.id, `${ORG}_ledger_posting_batch_${suffix}`)
    assert.equal(batch.organizationId, ORG)
    assert.equal(batch.sourceId, entry.sourceId)
    assert.equal(batch.status, 'POSTED')
    assert.equal(batch.metadata?.seed, true, 'Seed provenance required')
    assert.equal(batch.metadata?.sourceNumber, `RDS001-SO-${suffix}`)
    assert.equal(entry.lines.length, 5)
    let debit = decimal(0), credit = decimal(0)
    for (const [lineIndex, line] of entry.lines.entries()) {
      assert.equal(line.id, `${ORG}_journal_entry_line_${pad(index * 5 + lineIndex + 1)}`)
      assert.equal(line.organizationId, ORG)
      assert.equal(line.journalEntryId, entry.id)
      assert.equal(line.lineNumber, lineIndex + 1)
      assert.equal(line.currency, 'XAF')
      assert(decimal(line.exchangeRate).eq(1), 'Unit exchange rate required')
      assert(snapshot.accounts.some(account => account.id === line.accountId && account.organizationId === ORG))
      const d = decimal(line.debit), c = decimal(line.credit)
      assert(d.isFinite() && c.isFinite() && d.gte(0) && c.gte(0) && !(d.gt(0) && c.gt(0)), 'Invalid nominal amounts')
      debit = debit.plus(d); credit = credit.plus(c)
      if (line.baseDebit === null && line.baseCredit === null) missing++
      else {
        assert(line.baseDebit !== null && line.baseCredit !== null, 'Partial evidence requires review')
        assert(decimal(line.baseDebit).eq(d) && decimal(line.baseCredit).eq(c), 'Conflicting functional amounts')
      }
    }
    assert(debit.eq(credit) && debit.gt(0), 'Original journal must balance')
    totalDebit = totalDebit.plus(debit)
  }
  assert(missing === 60 || missing === 0, 'Partial repair requires review')
  // The legacy seed has a CLOSED January placeholder even though the journal is
  // dated May. Preserve those unrelated fixture fields; never reopen a period.
  // Refuse actual close assessments, certified exports, decisions or source hashes.
  for (const run of snapshot.closeRun) assert(run.id.startsWith(`${ORG}_close_run_`) && run.status === 'DRAFT' && !run.completedAt && !run.summary && !run.provenance, 'Close assessment requires review')
  for (const item of snapshot.closeEvidenceItem) assert(item.id.startsWith(`${ORG}_close_evidence_item_`) && !item.sourceId && !item.sourceHash, 'Bound close evidence requires review')
  for (const item of snapshot.closePackExport) assert(item.id.startsWith(`${ORG}_close_pack_export_`) && !item.isCertified && item.rowCount === 0 && item.contentHash.startsWith('hash-rds-org001-'), 'Exported close evidence requires review')
  for (const review of snapshot.accountantReview) assert(review.id.startsWith(`${ORG}_accountant_review_`) && review.status === 'OPEN' && !review.reviewedAt, 'Accountant decision requires review')
  return { missing, entries: 12, lines: 60, activityDebit: totalDebit.toFixed(2), activityCredit: totalDebit.toFixed(2) }
}

async function readSnapshot(tx) {
  const entries = await tx.journalEntry.findMany({ where: { id: { in: IDS }, organizationId: ORG }, include: { lines: { orderBy: { lineNumber: 'asc' } }, postingBatch: true, period: true }, orderBy: { id: 'asc' } })
  const snapshot = {
    settings: await tx.organizationAccountingSettings.findUniqueOrThrow({ where: { organizationId: ORG } }),
    accounts: await tx.chartOfAccount.findMany({ where: { id: { in: [...new Set(entries.flatMap(e => e.lines.map(l => l.accountId)))] } }, select: { id: true, organizationId: true }, orderBy: { id: 'asc' } }),
    entries,
  }
  // All organization close records, including date-overlapping runs, are checked.
  for (const model of ['closeRun', 'closeEvidenceItem', 'closePackExport', 'accountantReview']) snapshot[model] = await tx[model].findMany({ where: { organizationId: ORG }, orderBy: { id: 'asc' } })
  snapshot.triggers = await tx.$queryRawUnsafe("SELECT t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t WHERE t.tgrelid = 'journal_entry_lines'::regclass AND NOT t.tgisinternal ORDER BY t.tgname")
  return json(snapshot)
}

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] || '--dry-run'
  assert(['--dry-run', '--rehearse', '--apply'].includes(mode), 'Unknown mode')
  assert(mode === '--dry-run' ? args.length <= 1 : args.length === 2 && /^[a-f0-9]{64}$/.test(args[1]), 'Supply the reviewed dry-run snapshot hash')
  require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} })
  const raw = (process.env.DATABASE_URL || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => process.env[key] || '').replace(/^['"]|['"]$/g, '').trim()
  validateTarget(raw)
  const db = new PrismaClient({ datasources: { db: { url: raw } } })
  const directory = path.resolve('.codex-tmp', VERSION)
  fs.mkdirSync(directory, { recursive: true })
  let report, originalHash
  const rollback = new Error('REHEARSAL_ROLLBACK')
  try {
    try {
      await db.$transaction(async tx => {
        const [connected] = await tx.$queryRawUnsafe('SELECT current_database() AS name')
        assert.equal(connected.name, DATABASE)
        if (mode === '--dry-run') await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
        else {
          await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'")
          await tx.$queryRaw`SELECT id FROM accounting_periods WHERE "organizationId" = ${ORG} ORDER BY id FOR UPDATE`
          await tx.$queryRaw`SELECT id FROM journal_entries WHERE id IN (${Prisma.join(IDS)}) ORDER BY id FOR UPDATE`
          await tx.$queryRaw`SELECT id FROM journal_entry_lines WHERE "journalEntryId" IN (${Prisma.join(IDS)}) ORDER BY id FOR UPDATE`
        }
        const before = await readSnapshot(tx)
        const plan = validateSnapshot(before)
        originalHash = hash(before)
        const auditCount = await tx.auditLog.count({ where: { organizationId: ORG, action: ACTION, entityId: { in: IDS } } })
        report = { database: DATABASE, organizationId: ORG, mode, snapshotHash: originalHash, ...plan }
        if (!plan.missing) {
          assert.equal(auditCount, 12, 'Completed evidence without repair audit')
          report.outcome = 'ALREADY_REPAIRED'
          return
        }
        assert.equal(auditCount, 0, 'Unexpected previous repair audit')
        if (mode === '--dry-run') {
          fs.writeFileSync(path.join(directory, `${originalHash}.before.json`), JSON.stringify(before, null, 2), { flag: 'w' })
          report.outcome = 'PROPOSED'
          return
        }
        assert.equal(originalHash, args[1], 'Database changed since reviewed dry run')
        const backup = JSON.parse(fs.readFileSync(path.join(directory, `${originalHash}.before.json`), 'utf8'))
        assert.deepEqual(backup, before, 'Durable backup differs from current data')
        for (const entry of before.entries) {
          for (const line of entry.lines) {
            const changed = await tx.journalEntryLine.updateMany({ where: { id: line.id, organizationId: ORG, journalEntryId: entry.id, baseDebit: null, baseCredit: null }, data: { baseDebit: line.debit, baseCredit: line.credit } })
            assert.equal(changed.count, 1, 'Expected exactly one target line')
          }
          await tx.auditLog.create({ data: {
            organizationId: ORG, entityType: 'JournalEntry', entityId: entry.id, action: ACTION,
            userAgent: 'Codex local fixture maintenance; explicitly authorized by workspace owner',
            changes: { version: VERSION, synthetic: true, reason: 'Recover missing functional amounts from existing XAF nominal amounts at recorded rate 1', snapshotHash: originalHash,
              before: entry.lines,
              after: entry.lines.map(line => ({ ...line, baseDebit: line.debit, baseCredit: line.credit })),
              preserved: ['journal headers', 'nominal amounts', 'accounts', 'dates', 'statuses', 'periods', 'posting batches', 'close placeholders'],
            },
          } })
        }
        const after = await readSnapshot(tx)
        const expected = structuredClone(before)
        for (const entry of expected.entries) for (const line of entry.lines) { line.baseDebit = line.debit; line.baseCredit = line.credit }
        assert.deepEqual(after, expected, 'Unexpected changes outside the 120 missing base fields')
        assert.equal(validateSnapshot(after).missing, 0)
        assert.equal(await tx.auditLog.count({ where: { organizationId: ORG, action: ACTION, entityId: { in: IDS } } }), 12)
        report.outcome = mode === '--rehearse' ? 'ROLLED_BACK' : 'REPAIRED'
        report.afterHash = hash(after)
        if (mode === '--rehearse') throw rollback
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 })
    } catch (error) { if (error !== rollback) throw error }
    if (mode === '--rehearse' && report.outcome === 'ROLLED_BACK') {
      assert.equal(hash(await readSnapshot(db)), originalHash, 'Rehearsal failed to roll back')
      assert.equal(await db.auditLog.count({ where: { organizationId: ORG, action: ACTION, entityId: { in: IDS } } }), 0)
      report.rollbackVerified = true
    }
    fs.writeFileSync(path.join(directory, `${mode.slice(2)}-result.json`), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
  } finally { await db.$disconnect() }
}

module.exports = { validateTarget, validateSnapshot }
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
