/** @jest-environment node */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'

// Supplied trusted service controls are intentional; no HTTP session proof.
jest.mock('@/lib/security/auth-session', () => ({ SESSION_ASSURANCE_LEVEL: { NONE: 0, PASSWORD: 1 } }))

import { db } from '@/prisma/db'
import { fixture, financialSnapshot } from '@upgrade-fixture'
import { commitPOSSale } from '@/services/pos/pos.service'
import { collectCustomerSettlementWithControls } from '@/services/accounting/customer-settlement.service'
import { reverseCustomerSettlementWithControls } from '@/services/accounting/customer-settlement-reversal.service'
import { getTrialBalance } from '@/services/accounting/reports.service'

const context = JSON.parse(fs.readFileSync(process.env.UPGRADE_PHASE_CONTEXT!, 'utf8'))
const phase = process.env.UPGRADE_PHASE
const plain = (value: unknown) => JSON.parse(JSON.stringify(value))
const write = (filename: string, value: unknown) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })

beforeAll(async () => {
  expect(['before', 'after']).toContain(phase)
  expect(process.env.NODE_ENV).toBe('test')
  expect(process.env.DATABASE_URL).toBe(`postgresql://${context.user}@localhost:${context.port}/${context.database}?schema=public`)
  expect(context.database).toMatch(/^stoquify_pos_audit_20261109_[a-f0-9]{10}$/)
  const [identity] = await db.$queryRaw<Array<{ database: string; actor: string; directory: string }>>`SELECT current_database() AS database,current_user AS actor,current_setting('data_directory') AS directory`
  expect(identity.database).toBe(context.database); expect(identity.actor).toBe(context.user)
  expect(fs.realpathSync(identity.directory).toLowerCase()).toBe(fs.realpathSync(path.join(context.clusterDirectory, 'data')).toLowerCase())
  const [history] = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
  expect(Number(history.count)).toBe(phase === 'before' ? 120 : 121)
  for (const kernel of [db.$transaction, commitPOSSale, collectCustomerSettlementWithControls, reverseCustomerSettlementWithControls, getTrialBalance]) expect(jest.isMockFunction(kernel)).toBe(false)
})
afterAll(async () => db.$disconnect())

async function addBankConfiguration(f: any) {
  const ar = await db.chartOfAccount.findFirstOrThrow({ where: { organizationId: f.organizationId, code: 'TEST_AR' } })
  await db.chartOfAccount.update({ where: { id: ar.id }, data: { mappingKey: 'ACCOUNTS_RECEIVABLE' } })
  await db.chartOfAccount.create({ data: { organizationId: f.organizationId, code: 'TEST_BANK', nameEn: 'Synthetic upgrade bank', type: 'ASSET', normalBalance: 'DEBIT', currency: 'XAF', mappingKey: 'BANK' } })
  await db.journal.create({ data: { organizationId: f.organizationId, code: 'TEST_BANK', nameEn: 'Synthetic upgrade bank', type: 'BANK', isDefault: true } })
  await db.postingRule.create({ data: { organizationId: f.organizationId, code: 'TEST_AR_SETTLEMENT', nameEn: 'Synthetic upgrade collection', sourceType: 'CUSTOMER_SETTLEMENT', postingPurpose: 'CUSTOMER_SETTLEMENT', lines: { create: [
    { organizationId: f.organizationId, mappingKey: 'BANK', lineNumber: 1, side: 'DEBIT', amountSource: 'SOURCE_AMOUNT' },
    { organizationId: f.organizationId, mappingKey: 'ACCOUNTS_RECEIVABLE', lineNumber: 2, side: 'CREDIT', amountSource: 'SOURCE_AMOUNT' },
  ] } } })
  return db.user.create({ data: { organizationId: f.organizationId, email: `${randomUUID()}@upgrade.invalid`, firstName: 'Independent', lastName: 'Upgrade checker', mfaBackupCodes: [] } })
}

async function tieOut(f: any, outstanding: string, bank: string, paid: string) {
  const [period, document, customer, ledger, journals, snapshot] = await Promise.all([
    db.accountingPeriod.findFirstOrThrow({ where: { organizationId: f.organizationId } }),
    db.customerReceivableDocument.findFirstOrThrow({ where: { organizationId: f.organizationId, sourceSalesOrderId: f.salesOrderId } }),
    db.customer.findFirstOrThrow({ where: { id: f.customerId, organizationId: f.organizationId } }),
    db.customerLedgerEntry.findMany({ where: { organizationId: f.organizationId, customerId: f.customerId } }),
    db.journalEntry.findMany({ where: { organizationId: f.organizationId }, include: { lines: true, sourceLinks: true } }),
    financialSnapshot(f),
  ])
  const report = await getTrialBalance({ organizationId: f.organizationId, periodId: period.id, includeZeroBalance: true })
  const rows = new Map(report.rows.map(row => [row.code, row]))
  expect(report.totals.isBalanced).toBe(true)
  expect(rows.get('TEST_AR')).toMatchObject({ debitBalance: outstanding, creditBalance: '0.00' })
  expect(rows.get('TEST_BANK')).toMatchObject({ debitBalance: bank, creditBalance: '0.00' })
  expect(rows.get('TEST_CASH')).toMatchObject({ debitBalance: '6.00', creditBalance: '0.00' })
  expect(rows.get('TEST_REVENUE')).toMatchObject({ activityCredit: '10.00', creditBalance: '10.00' })
  expect(rows.get('TEST_COGS')).toMatchObject({ activityDebit: '4.00', debitBalance: '4.00' })
  expect(rows.get('TEST_STOCK')).toMatchObject({ activityCredit: '4.00', creditBalance: '4.00' })
  expect(customer.currentBalance.toFixed(2)).toBe(outstanding)
  expect(ledger.reduce((sum, row) => sum.plus(row.debit).minus(row.credit), new Prisma.Decimal(0)).toFixed(2)).toBe(outstanding)
  const state = await db.customerReceivableDocumentState.findFirstOrThrow({ where: { organizationId: f.organizationId, documentId: document.id }, orderBy: { version: 'desc' } })
  expect(state.paidAmount.toFixed(2)).toBe(paid); expect(state.unpaidAmount.toFixed(2)).toBe(outstanding)
  expect(state.paidAmount.plus(state.unpaidAmount).eq(document.totalAmount)).toBe(true)
  for (const journal of journals) {
    expect(['POSTED', 'REVERSED']).toContain(journal.status)
    expect(journal.lines.reduce((sum, line) => sum.plus(line.debit).minus(line.credit), new Prisma.Decimal(0)).eq(0)).toBe(true)
    expect(journal.sourceLinks.some(link => link.postingBatchId === journal.postingBatchId && link.sourceId === journal.sourceId)).toBe(true)
  }
  return { outstanding, bank, paid, balanced: true, journalCount: journals.length, snapshot, documentId: document.id }
}

const retainedPOSFields = ['status', 'paymentStatus', 'payments', 'stockQuantity', 'stockAvailable', 'stockValue', 'stockVersion', 'sessionExpected', 'cashTotal', 'creditTotal', 'transactionCount', 'drawerCurrent', 'drawerExpected', 'drawerTransactionCount', 'movementCount', 'registryCount', 'receivableCount']
function assertPOSUnchanged(snapshot: any, sold: any) {
  for (const field of retainedPOSFields) expect(snapshot[field]).toEqual(sold[field])
}
function withoutControlAudit(snapshot: any) {
  const { auditCount, ...financial } = snapshot
  return financial
}

it('uses the same frozen writer around the reviewed populated 120 to 121 migration', async () => {
  if (phase === 'before') {
    const f = await fixture(), checker = await addBankConfiguration(f)
    const committed = await commitPOSSale(f.request)
    expect(committed).toMatchObject({ saleId: f.salesOrderId, replayed: false, status: 'COMPLETED' })
    const sold = await tieOut(f, '4.00', '0.00', '6.00')
    expect(sold.snapshot).toMatchObject({ customerBalance: '4', stockQuantity: '4', stockValue: '16', cashTotal: '6', creditTotal: '4', drawerCurrent: '106', journalCount: 2 })
    const registry = await db.pOSCommitResult.findFirstOrThrow({ where: { organizationId: f.organizationId, salesOrderId: f.salesOrderId } })
    write(context.receiptFile, { fixture: f, checkerId: checker.id, committed: plain(committed), registry: plain(registry), sold })
    write(context.beforeProof, { passed: true, phase, database: context.database, organizationId: f.organizationId,
      saleId: f.salesOrderId, receiptIdentity: { saleId: committed.saleId, status: committed.status }, sold,
      evidenceClass: 'Real PostgreSQL sale on 120 migrations using frozen current writer and synthetic trusted service scope' })
    return
  }

  const retained = JSON.parse(fs.readFileSync(context.receiptFile, 'utf8')), f = retained.fixture
  const organization = await db.organization.findUniqueOrThrow({ where: { id: f.organizationId } })
  expect(organization.id).toMatch(/^org-full-pos-/)
  const beforeReplay = await financialSnapshot(f)
  expect(beforeReplay).toEqual(retained.sold.snapshot)
  const replay = await commitPOSSale(f.request)
  expect(replay.replayed).toBe(true)
  expect(plain({ ...replay, replayed: false })).toEqual(retained.committed)
  expect(await financialSnapshot(f)).toEqual(beforeReplay)
  expect(plain(await db.pOSCommitResult.findFirstOrThrow({ where: { organizationId: f.organizationId, salesOrderId: f.salesOrderId } }))).toEqual(retained.registry)
  const reopened = await tieOut(f, '4.00', '0.00', '6.00')
  const collectedAt = new Date()
  const collection = { customerId: f.customerId, method: 'BANK_TRANSFER' as const, amount: '4.00', settlementDate: collectedAt,
    idempotencyKey: `upgrade-collection:${randomUUID()}`, correlationId: `upgrade-collection-correlation:${randomUUID()}`,
    externalReference: `synthetic-upgrade-bank:${randomUUID()}`, documentHash: 'a'.repeat(64), evidenceHash: 'b'.repeat(64),
    allocations: [{ salesOrderId: f.salesOrderId, amount: '4.00' }] }
  const control = { organizationId: f.organizationId, actorId: f.userId, actorPermissions: ['finance.receivables.collect'], lastAuthAt: collectedAt }
  const payment = await collectCustomerSettlementWithControls(collection, control)
  expect(payment.replayed).toBe(false)
  const collected = await tieOut(f, '0.00', '4.00', '10.00'); assertPOSUnchanged(collected.snapshot, retained.sold.snapshot)
  expect(await collectCustomerSettlementWithControls(collection, control)).toMatchObject({ settlementId: payment.settlementId, replayed: true })
  expect(withoutControlAudit(await financialSnapshot(f))).toEqual(withoutControlAudit(collected.snapshot))
  const checker = await db.user.findFirstOrThrow({ where: { id: retained.checkerId, organizationId: f.organizationId, isActive: true } })
  expect(checker.id).not.toBe(f.userId)
  const lastAuthAt = new Date()
  const reversal = { customerSettlementId: payment.settlementId, reversalDate: new Date(), reason: 'Synthetic independent post-upgrade bank collection correction',
    idempotencyKey: `upgrade-reversal:${randomUUID()}`, correlationId: `upgrade-reversal-correlation:${randomUUID()}`,
    documentHash: 'c'.repeat(64), evidenceHash: 'd'.repeat(64) }
  const reversalControl = { organizationId: f.organizationId, actorId: checker.id, actorPermissions: ['finance.receivables.reverse'], freshAuth: { lastAuthAt,
    claims: { userId: checker.id, tenantId: f.organizationId, assuranceOrganizationId: f.organizationId, assuranceLevel: 1, lastAuthAt: lastAuthAt.getTime() } } }
  const reversedPayment = await reverseCustomerSettlementWithControls(reversal, reversalControl)
  expect(reversedPayment).toMatchObject({ settlementId: payment.settlementId, status: 'REVERSED', replayed: false })
  const reversed = await tieOut(f, '4.00', '0.00', '6.00'); assertPOSUnchanged(reversed.snapshot, retained.sold.snapshot)
  expect(await reverseCustomerSettlementWithControls(reversal, reversalControl)).toMatchObject({ reversalJournalEntryId: reversedPayment.reversalJournalEntryId, replayed: true })
  expect(withoutControlAudit(await financialSnapshot(f))).toEqual(withoutControlAudit(reversed.snapshot))
  write(context.afterProof, { passed: true, phase, database: context.database, organizationId: f.organizationId,
    saleId: f.salesOrderId, settlementId: payment.settlementId, independentCheckerId: checker.id,
    replayedOriginalSaleExactly: true, originalRegistryUnchanged: true,
    outstandingSequence: [reopened.outstanding, collected.outstanding, reversed.outstanding],
    bankSequence: [reopened.bank, collected.bank, reversed.bank], reopened, collected, reversed,
    collectionJournalId: payment.journalEntryId, reversalJournalId: reversedPayment.reversalJournalEntryId,
    evidenceClass: 'Real PostgreSQL current frozen writer on upgraded 121-migration catalog; synthetic controls, no predecessor-artifact/session/statutory claim' })
})
