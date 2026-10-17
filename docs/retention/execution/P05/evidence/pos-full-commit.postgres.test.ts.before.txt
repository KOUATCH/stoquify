/** @jest-environment node */
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"

jest.unmock("@/prisma/db")
jest.unmock("@/lib/inventory/update-inventory-levels")

import { db } from "@/prisma/db"
import { commitPOSSale } from "../pos.service"
import { acquirePOSCheckout, preparePOSCheckout } from "../checkout.service"
import { posCartRevision } from "../cart-revision"
import { postPOSStockIssue } from "@/services/inventory/inventory-stock-event.service"
import { postSale } from "@/services/accounting/postings/post-sale"
import { postPayment } from "@/services/accounting/postings/post-payment"
import { createCustomerLedgerEntry } from "@/services/accounting/customer-ledger.service"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"

const suite = process.env.RUN_POS_FULL_COMMIT_POSTGRES === "1" ? describe : describe.skip
function assertDisposableTarget() {
  const target = new URL(process.env.DATABASE_URL ?? "")
  const name = process.env.POS_DISPOSABLE_DATABASE_NAME ?? ""
  if (target.hostname !== "localhost" || !/^stoquify_pos_audit_\d{8}_[a-f0-9]+$/.test(name)
    || target.pathname !== `/${name}` || target.searchParams.get("schema") !== "public") {
    throw new Error("Refusing full POS commit tests outside the recorded disposable database")
  }
}

// Synthetic zero-tax accounting fixture. These balanced mappings exercise real
// kernels; they are not a country pack, statutory chart or accounting certification.
async function fixture() {
  assertDisposableTarget()
  const suffix = randomUUID()
  const organizationId = `org-full-pos-${suffix}`
  const userId = `actor-full-pos-${suffix}`
  const locationId = `location-full-pos-${suffix}`
  const terminalId = `terminal-full-pos-${suffix}`
  const sessionId = `shift-full-pos-${suffix}`
  const salesOrderId = `sale-full-pos-${suffix}`
  const customerId = `customer-full-pos-${suffix}`
  const itemId = `item-full-pos-${suffix}`
  const drawerId = `drawer-full-pos-${suffix}`
  await db.organization.create({ data: { id: organizationId, name: "Synthetic full POS transaction test", slug: organizationId, currency: "XAF", requestedModules: [] } })
  await db.user.create({ data: { id: userId, email: `${suffix}@full-pos.invalid`, organizationId, firstName: "Test", lastName: "Cashier", mfaBackupCodes: [] } })
  await db.location.create({ data: { id: locationId, organizationId, name: "Test store", code: suffix, type: "STORE", allowNegativeStock: false } })
  await db.customer.create({ data: { id: customerId, organizationId, name: "Test credit customer", code: suffix, creditLimit: 100, currentBalance: 0 } })
  await db.item.create({ data: { id: itemId, organizationId, slug: suffix, sku: suffix, nameEn: "Tracked test item", imageUrls: [], trackInventory: true, sellingPrice: 10, costPrice: 4 } })
  await db.inventoryLevel.create({ data: { itemId, locationId, quantityOnHand: 5, quantityAvailable: 5, quantityReserved: 0, averageCost: 4, totalValue: 20 } })
  const year = new Date().getUTCFullYear()
  const fiscalYear = await db.fiscalYear.create({ data: { organizationId, name: `Synthetic FY ${year}`, startDate: new Date(Date.UTC(year, 0, 1)), endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) } })
  await db.accountingPeriod.create({ data: { organizationId, fiscalYearId: fiscalYear.id, periodNumber: 1, name: "Synthetic open period", startDate: fiscalYear.startDate, endDate: fiscalYear.endDate } })
  const accounts = await Promise.all([
    { code: "TEST_AR", type: "ASSET", normalBalance: "DEBIT" },
    { code: "TEST_CASH", type: "ASSET", normalBalance: "DEBIT" },
    { code: "TEST_REVENUE", type: "REVENUE", normalBalance: "CREDIT" },
    { code: "TEST_COGS", type: "EXPENSE", normalBalance: "DEBIT" },
    { code: "TEST_STOCK", type: "ASSET", normalBalance: "DEBIT" },
  ].map(account => db.chartOfAccount.create({ data: { organizationId, nameEn: account.code, code: account.code, type: account.type as "ASSET" | "REVENUE" | "EXPENSE", normalBalance: account.normalBalance as "DEBIT" | "CREDIT", currency: "XAF" } })))
  const [receivable, cash, revenue, cogs, stock] = accounts
  await db.journal.createMany({ data: [
    { organizationId, code: "TEST_SALES", nameEn: "Synthetic sales", type: "SALES", isDefault: true },
    { organizationId, code: "TEST_CASH", nameEn: "Synthetic cash", type: "CASH", isDefault: true },
  ] })
  await db.postingRule.create({ data: { organizationId, code: "TEST_POS_SALE", nameEn: "Synthetic sale rule", sourceType: "POS_SALE", postingPurpose: "SALE_COMPLETION", lines: { create: [
    { organizationId, accountId: receivable.id, lineNumber: 1, side: "DEBIT", amountSource: "GROSS_AMOUNT" },
    { organizationId, accountId: revenue.id, lineNumber: 2, side: "CREDIT", amountSource: "NET_AMOUNT" },
    { organizationId, accountId: cogs.id, lineNumber: 3, side: "DEBIT", amountSource: "COST_AMOUNT" },
    { organizationId, accountId: stock.id, lineNumber: 4, side: "CREDIT", amountSource: "COST_AMOUNT" },
  ] } } })
  await db.postingRule.create({ data: { organizationId, code: "TEST_POS_PAYMENT", nameEn: "Synthetic cash payment rule", sourceType: "POS_PAYMENT", postingPurpose: "PAYMENT_RECEIPT", lines: { create: [
    { organizationId, accountId: cash.id, lineNumber: 1, side: "DEBIT", amountSource: "SOURCE_AMOUNT" },
    { organizationId, accountId: receivable.id, lineNumber: 2, side: "CREDIT", amountSource: "SOURCE_AMOUNT" },
  ] } } })
  await db.pOSStation.create({ data: { id: terminalId, organizationId, locationId, terminalNumber: suffix, name: "Test till", hasCashDrawer: true } })
  await db.pOSSession.create({ data: { id: sessionId, organizationId, locationId, terminalId, userId, sessionNumber: suffix, status: "ACTIVE", openingBalance: 100, expectedBalance: 100 } })
  await db.pOSStation.update({ where: { id: terminalId }, data: { currentSessionId: sessionId } })
  await db.cashDrawer.create({ data: { id: drawerId, terminalId, locationId, name: "Test drawer", drawerNumber: suffix, currentBalance: 100, expectedBalance: 100, isOpen: true } })
  await db.cashDrawerTransaction.create({ data: { cashDrawerId: drawerId, sessionId, userId, type: "OPENING_BALANCE", amount: 100, balanceBefore: 0, balanceAfter: 100 } })
  await db.salesOrder.create({ data: { id: salesOrderId, organizationId, locationId, terminalId, sessionId, customerId, createdById: userId, orderNumber: suffix, subtotal: 10, total: 10, lines: { create: { itemId, quantity: 1, unitPrice: 10, lineTotal: 10 } } } })
  const scope = { organizationId, userId, locationId, terminalId, sessionId, checkoutLeaseId: randomUUID() }
  await acquirePOSCheckout(scope)
  const cart = await db.salesOrder.findUniqueOrThrow({ where: { id: salesOrderId }, include: { lines: true } })
  const request = { ...scope, salesOrderId, clientCommitId: `pos:${randomUUID()}`, expectedCartRevision: posCartRevision(cart), tenders: [{ method: "CASH" as const, amount: 6 }, { method: "ON_ACCOUNT" as const, amount: 4 }] }
  await preparePOSCheckout(request)
  return { ...scope, salesOrderId, customerId, itemId, drawerId, request }
}

type Fixture = Awaited<ReturnType<typeof fixture>>
async function financialSnapshot(input: Fixture) {
  const [sale, customer, stock, session, drawer, payments, refundCount, registryCount, movementCount, journalCount, batchCount, ledgerCount, receivableCount, stateCount, eventCount, outboxCount, auditCount, ledgerAuditCount, sourceLinkCount] = await Promise.all([
    db.salesOrder.findUniqueOrThrow({ where: { id: input.salesOrderId } }),
    db.customer.findUniqueOrThrow({ where: { id: input.customerId } }),
    db.inventoryLevel.findFirstOrThrow({ where: { itemId: input.itemId, locationId: input.locationId } }),
    db.pOSSession.findUniqueOrThrow({ where: { id: input.sessionId } }),
    db.cashDrawer.findUniqueOrThrow({ where: { id: input.drawerId } }),
    db.payment.findMany({ where: { salesOrderId: input.salesOrderId }, orderBy: { method: "asc" } }),
    db.cashDrawerTransaction.count({ where: { sessionId: input.sessionId } }),
    db.pOSCommitResult.count({ where: { organizationId: input.organizationId } }),
    db.inventoryTransaction.count({ where: { organizationId: input.organizationId } }),
    db.journalEntry.count({ where: { organizationId: input.organizationId } }),
    db.ledgerPostingBatch.count({ where: { organizationId: input.organizationId } }),
    db.customerLedgerEntry.count({ where: { organizationId: input.organizationId } }),
    db.customerReceivableDocument.count({ where: { organizationId: input.organizationId } }),
    db.customerReceivableDocumentState.count({ where: { organizationId: input.organizationId } }),
    db.businessEvent.count({ where: { organizationId: input.organizationId } }),
    db.businessEventOutbox.count({ where: { organizationId: input.organizationId } }),
    db.auditLog.count({ where: { organizationId: input.organizationId } }),
    db.ledgerAuditEvent.count({ where: { organizationId: input.organizationId } }),
    db.accountingSourceLink.count({ where: { organizationId: input.organizationId } }),
  ])
  return {
    status: sale.status, paymentStatus: sale.paymentStatus, customerBalance: String(customer.currentBalance),
    stockQuantity: String(stock.quantityOnHand), stockAvailable: String(stock.quantityAvailable), stockValue: String(stock.totalValue), stockVersion: stock.version,
    sessionExpected: String(session.expectedBalance), cashTotal: String(session.cashTotal), creditTotal: String(session.creditTotal), transactionCount: session.transactionCount,
    drawerCurrent: String(drawer.currentBalance), drawerExpected: String(drawer.expectedBalance),
    payments: payments.map(payment => ({ method: payment.method, amount: String(payment.amount), status: payment.status })),
    drawerTransactionCount: refundCount, registryCount, movementCount, journalCount, batchCount, ledgerCount, receivableCount, stateCount, eventCount, outboxCount, auditCount, ledgerAuditCount, sourceLinkCount,
  }
}

suite("full POS commit real PostgreSQL kernels", () => {
  jest.setTimeout(120_000)
  beforeAll(async () => {
    assertDisposableTarget()
    const prerequisite = await db.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ledger_posting_batches' AND column_name = 'postingCycle'`
    if (prerequisite.length !== 1) {
      throw new Error("Full POS transaction verification is blocked: ledger_posting_batches.postingCycle is missing. The reviewed posting-cycle migration requires explicit approval; this suite does not apply it.")
    }
    for (const kernel of [db.$transaction, postPOSStockIssue, postSale, postPayment, createCustomerLedgerEntry, recordBusinessEventInTx]) {
      expect(jest.isMockFunction(kernel)).toBe(false)
    }
  })
  afterAll(async () => { await db.$disconnect() })

  it("commits stock, cash, receivable, ledger, events and durable result exactly once under duplicate completion", async () => {
    const input = await fixture()
    const results = await Promise.all([commitPOSSale(input.request), commitPOSSale(input.request)])
    expect(results.map(result => result.replayed).sort()).toEqual([false, true])
    expect(new Set(results.map(result => result.saleId)).size).toBe(1)
    const snapshot = await financialSnapshot(input)
    expect(snapshot).toMatchObject({ status: "COMPLETED", paymentStatus: "PARTIAL", customerBalance: "4", stockQuantity: "4", stockAvailable: "4", stockValue: "16", sessionExpected: "106", cashTotal: "6", creditTotal: "4", transactionCount: 1, drawerCurrent: "106", drawerExpected: "106", registryCount: 1, movementCount: 1, journalCount: 2, batchCount: 2, ledgerCount: 1, receivableCount: 1, stateCount: 1, drawerTransactionCount: 2 })
    expect(snapshot.payments).toEqual([{ method: "CASH", amount: "6", status: "PAID" }, { method: "CREDIT", amount: "4", status: "PENDING" }])
    const journals = await db.journalEntry.findMany({ where: { organizationId: input.organizationId }, include: { lines: true } })
    expect(journals.every(journal => journal.status === "POSTED" && journal.lines.reduce((sum, line) => sum.plus(line.debit).minus(line.credit), new Prisma.Decimal(0)).eq(0))).toBe(true)
    expect(await db.businessEvent.count({ where: { organizationId: input.organizationId, eventType: "pos.sale.finalized" } })).toBe(1)
    expect(await db.businessEvent.count({ where: { organizationId: input.organizationId, eventType: "pos.sale.stock_issued" } })).toBe(1)
    expect(await db.businessEventOutbox.count({ where: { organizationId: input.organizationId, eventName: "pos.sale.fiscalization.requested" } })).toBe(1)
    expect((await db.pOSCommitResult.findFirstOrThrow({ where: { organizationId: input.organizationId } })).status).toBe("COMPLETED")
    const replay = await commitPOSSale(input.request)
    expect(replay.replayed).toBe(true)
    expect(await financialSnapshot(input)).toEqual(snapshot)
  })

  it("rolls back every real kernel when durable commit-result finalization fails, preserving the retained request", async () => {
    const input = await fixture()
    const before = await financialSnapshot(input)
    const functionName = `pos_audit_commit_failure_${randomUUID().replaceAll("-", "")}`
    const triggerName = `${functionName}_trigger`
    const probeName = `${functionName}_probe`
    assertDisposableTarget()
    await db.$executeRawUnsafe(`CREATE SEQUENCE public."${probeName}"`)
    await db.$executeRawUnsafe(`CREATE FUNCTION public."${functionName}"() RETURNS trigger AS $$ BEGIN IF NEW."organizationId" = '${input.organizationId}' AND NEW."status"::text = 'COMMITTED' THEN PERFORM nextval('public."${probeName}"'); RAISE EXCEPTION 'injected final commit evidence failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`)
    await db.$executeRawUnsafe(`CREATE TRIGGER "${triggerName}" BEFORE UPDATE ON public.pos_commit_results FOR EACH ROW EXECUTE FUNCTION public."${functionName}"()`)
    try {
      await expect(commitPOSSale(input.request)).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
      // Sequence advancement is not transactional: prove the injected final
      // boundary was reached, rather than passing on an earlier unrelated failure.
      const probe = await db.$queryRawUnsafe<Array<{ is_called: boolean }>>(`SELECT is_called FROM public."${probeName}"`)
      expect(probe[0].is_called).toBe(true)
      expect(await financialSnapshot(input)).toEqual(before)
      const workspace = await db.pOSCheckoutWorkspace.findUniqueOrThrow({ where: { sessionId: input.sessionId } })
      expect(workspace.pendingRequest).toMatchObject({ clientCommitId: input.request.clientCommitId })
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER "${triggerName}" ON public.pos_commit_results`)
      await db.$executeRawUnsafe(`DROP FUNCTION public."${functionName}"()`)
      await db.$executeRawUnsafe(`DROP SEQUENCE public."${probeName}"`)
    }
    const retry = await commitPOSSale(input.request)
    expect(retry.saleId).toBe(input.salesOrderId)
    expect((await financialSnapshot(input)).registryCount).toBe(1)
  })
})
