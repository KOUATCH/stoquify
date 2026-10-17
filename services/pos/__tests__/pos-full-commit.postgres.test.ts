/** @jest-environment node */
import { randomUUID, generateKeyPairSync, sign } from "node:crypto"
import { Prisma } from "@prisma/client"

jest.unmock("@/prisma/db")
jest.unmock("@/lib/inventory/update-inventory-levels")
// Keep real receipt behavior; expose configurable exports for boundary timing/failure probes.
jest.mock("../receipt.service", () => ({ ...jest.requireActual("../receipt.service") }))

import { db } from "@/prisma/db"
import { commitPOSSale, getPOSSaleCommitStatus } from "../pos.service"
const receiptService: typeof import("../receipt.service") = require("../receipt.service")
import { acquirePOSCheckout, preparePOSCheckout } from "../checkout.service"
import { posCartRevision } from "../cart-revision"
import { postPOSStockIssue } from "@/services/inventory/inventory-stock-event.service"
import { postSale } from "@/services/accounting/postings/post-sale"
import { postPayment } from "@/services/accounting/postings/post-payment"
import { createCustomerLedgerEntry } from "@/services/accounting/customer-ledger.service"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { registerOfflineDevice, ingestOfflineSyncBatch, buildOfflineEventEntryHash, replayPendingOfflineSaleEnvelope } from "../offline-sync.service"
import { assertNoQueuedCheckoutInTx } from "../checkout-state"
import { createServer } from "node:http"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"
import { transpileModule, ModuleKind, ScriptTarget } from "typescript"

const suite = process.env.RUN_POS_FULL_COMMIT_POSTGRES === "1" ? describe : describe.skip
const integratedBrowserCase = process.env.RUN_RETENTION_OFFLINE_BROWSER === "1" ? it : it.skip
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
async function offlineFixture() {
  const input = await fixture()
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
  const device = await registerOfflineDevice({ ...input, deviceLabel: "Synthetic signed offline fixture", deviceFingerprintHash: randomUUID(), signingPublicKeyPem: publicKey.export({ format: "pem", type: "spki" }).toString() })
  const payload = { commitSale: input.request }
  const payloadHash = hashBusinessPayload(payload)
  const event = { eventType: "OFFLINE_SALE_CAPTURED" as const, schemaVersion: 1, deviceSeq: 1, idempotencyKey: randomUUID(), capturedAtDevice: new Date(), payload, payloadHash, prevHash: null, entryHash: "", signature: "" }
  event.entryHash = buildOfflineEventEntryHash({ ...event, deviceId: device.id })
  event.signature = sign("sha256", Buffer.from(event.entryHash, "utf8"), privateKey).toString("base64")
  const envelope = { ...input, deviceId: device.id, events: [event] }
  const accepted = await ingestOfflineSyncBatch(envelope)
  expect(accepted).toMatchObject({ acceptedCount: 1, conflictCount: 0, certificate: { closeBlocker: true } })
  const retained = await db.pOSOfflineEvent.findFirstOrThrow({ where: { organizationId: input.organizationId, idempotencyKey: event.idempotencyKey } })
  return { input, envelope, retained }
}
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

  it("P05 rejects a substituted retained commit ID without financial effects and permits the original retry", async () => {
    const input = await fixture()
    const before = await financialSnapshot(input)
    await expect(commitPOSSale({ ...input.request, clientCommitId: `pos:${randomUUID()}` }))
      .rejects.toThrow("POS_CHECKOUT_RECOVERY_REQUIRED")
    expect(await financialSnapshot(input)).toEqual(before)
    const workspace = await db.pOSCheckoutWorkspace.findUniqueOrThrow({ where: { sessionId: input.sessionId } })
    expect(workspace.pendingRequest).toMatchObject({ clientCommitId: input.request.clientCommitId })
    const original = await commitPOSSale(input.request)
    const after = await financialSnapshot(input)
    await expect(commitPOSSale(input.request)).resolves.toEqual({ ...original, replayed: true })
    expect(original.clientCommitId).toBe(input.request.clientCommitId)
    expect(await financialSnapshot(input)).toEqual(after)
  })

  it("P05 rejects foreign scope for recorded evidence and commit retry without changing effects", async () => {
    const input = await fixture()
    const foreign = await fixture()
    await commitPOSSale(input.request)
    const { auditCount: initialAuditCount, ...before } = await financialSnapshot(input)
    let previousAuditCount = initialAuditCount
    const cases: Array<{ field: string; auditDelta: number }> = []
    expect(await getPOSSaleCommitStatus(input.request)).toMatchObject({ kind: "RECORDED" })
    for (const field of ["organizationId", "userId", "locationId", "terminalId", "sessionId"] as const) {
      const request = { ...input.request, [field]: foreign[field] }
      expect(await getPOSSaleCommitStatus(request)).toMatchObject({ kind: "NOT_FOUND" })
      await expect(commitPOSSale(request)).rejects.toThrow()
      // Rejection audit evidence is expected; monetary and stock effects must
      // remain unchanged. Use real foreign identities so audit FKs also apply.
      const { auditCount, ...after } = await financialSnapshot(input)
      expect(after).toEqual(before)
      expect(auditCount).toBeGreaterThanOrEqual(initialAuditCount)
      cases.push({ field, auditDelta: auditCount - previousAuditCount })
      previousAuditCount = auditCount
    }
    // Some scopes reject before the idempotency-conflict boundary; do not
    // invent an audit-per-denial policy. Account for all audit growth separately.
    expect(await db.auditLog.count({ where: { organizationId: input.organizationId, action: "POS_SALE_COMMIT_IDEMPOTENCY_CONFLICT" } })).toBe(previousAuditCount - initialAuditCount)
    if (process.env.RETENTION_VERIFICATION_EVIDENCE_DIR) writeFileSync(join(process.env.RETENTION_VERIFICATION_EVIDENCE_DIR, `scope-isolation-${Date.now()}.json`), JSON.stringify({ cases, financialEffects: before, status: "PASS", limitation: "Trusted service boundary; not a deployed role/entitlement matrix" }, null, 2))
  })

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

  it("preserves the original caller identity when a retry wins receipt completion", async () => {
    const input = await fixture()
    const originalReceipt = receiptService.getPOSSaleCommitReceipt
    let reached!: () => void, resume!: () => void
    const ready = new Promise<void>(resolve => { reached = resolve })
    const release = new Promise<void>(resolve => { resume = resolve })
    // Delay only receipt rendering after the real financial commit, not a kernel.
    const receipt = jest.spyOn(receiptService, "getPOSSaleCommitReceipt").mockImplementationOnce(async request => {
      reached(); await release; return originalReceipt(request)
    })
    const first = commitPOSSale(input.request)
    try {
      await Promise.race([ready, first.then(() => { throw new Error("Original caller did not reach receipt boundary") })])
      const retry = await commitPOSSale(input.request)
      expect(retry.replayed).toBe(true)
      resume()
      expect((await first).replayed).toBe(false)
      expect((await financialSnapshot(input)).registryCount).toBe(1)
    } finally { resume(); await first.catch(() => undefined); receipt.mockRestore() }
  })

  it("keeps a committed sale recoverable after receipt failure and rejects changed retry intent", async () => {
    const input = await fixture()
    const receipt = jest.spyOn(receiptService, "getPOSSaleCommitReceipt").mockRejectedValueOnce(new Error("injected receipt read failure"))
    let committed
    try { committed = await commitPOSSale(input.request) } finally { receipt.mockRestore() }
    expect(committed).toMatchObject({ saleId: input.salesOrderId, status: "COMPLETED", receipt: null, receiptStatus: "RETRY_REQUIRED" })
    const before = await financialSnapshot(input)
    expect(await getPOSSaleCommitStatus(input.request)).toMatchObject({ kind: "RECORDED", currentStatus: "COMPLETED" })
    expect((await commitPOSSale(input.request)).saleId).toBe(input.salesOrderId)
    expect(await financialSnapshot(input)).toEqual(before)
    await expect(commitPOSSale({ ...input.request, tenders: [{ method: "CASH", amount: 10 }] })).rejects.toMatchObject({ code: "DUPLICATE_KEY_CONFLICT" })
    expect(await financialSnapshot(input)).toEqual({ ...before, auditCount: before.auditCount + 1 })
    expect((await receiptService.getPOSSaleCommitReceipt({ organizationId: input.organizationId, salesOrderId: input.salesOrderId })).receipt.id).toBe(input.salesOrderId)
  })

  it.each(["stale cart", "insufficient stock"])("rejects %s without partial financial effects", async kind => {
    const input = await fixture()
    if (kind === "stale cart") await db.salesOrderLine.updateMany({ where: { salesOrderId: input.salesOrderId }, data: { quantity: 2 } })
    else await db.inventoryLevel.updateMany({ where: { itemId: input.itemId, locationId: input.locationId }, data: { quantityOnHand: 0, quantityAvailable: 0, totalValue: 0 } })
    const before = await financialSnapshot(input)
    await expect(commitPOSSale(input.request)).rejects.toThrow()
    expect(await financialSnapshot(input)).toEqual(before)
    expect((await db.pOSCheckoutWorkspace.findUniqueOrThrow({ where: { sessionId: input.sessionId } })).pendingRequest).toMatchObject({ clientCommitId: input.request.clientCommitId })
  })

  it("invalidates previously certified close evidence in the sale transaction", async () => {
    const input = await fixture()
    const period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: input.organizationId } })
    const close = await db.closeRun.create({ data: { organizationId: input.organizationId, periodId: period.id, status: "CERTIFIED" } })
    await commitPOSSale(input.request)
    expect(await db.closeRun.findUniqueOrThrow({ where: { id: close.id } })).toMatchObject({ status: "BLOCKED", metadata: { staleState: { status: "EVIDENCE_STALE" } } })
  })

  it("recovers a signed offline event after sale commit but before server acknowledgement without another sale", async () => {
    const { input, envelope, retained } = await offlineFixture()
    const originalFlag = process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS
    process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = "1"
    const name = `offline_ack_${randomUUID().replaceAll("-", "")}`, probe = `${name}_probe`
    await db.$executeRawUnsafe(`CREATE SEQUENCE public."${probe}"`)
    await db.$executeRawUnsafe(`CREATE FUNCTION public."${name}"() RETURNS trigger AS $$ BEGIN IF NEW."organizationId" = '${input.organizationId}' AND NEW.action = 'POS_OFFLINE_SALE_REPLAYED' THEN PERFORM nextval('public."${probe}"'); RAISE EXCEPTION 'injected server acknowledgement failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`)
    await db.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public."${name}"()`)
    const request = { organizationId: input.organizationId, userId: input.userId, offlineEventId: retained.id }
    try {
      expect((await financialSnapshot(input)).registryCount).toBe(0)
      expect((await ingestOfflineSyncBatch(envelope)).duplicateCount).toBe(1)
      await expect(replayPendingOfflineSaleEnvelope(request)).rejects.toThrow()
      expect((await db.$queryRawUnsafe<Array<{ is_called: boolean }>>(`SELECT is_called FROM public."${probe}"`))[0].is_called).toBe(true)
      expect(await db.pOSOfflineEvent.findUniqueOrThrow({ where: { id: retained.id } })).toMatchObject({ status: "PENDING_REPLAY", payloadHash: retained.payloadHash, entryHash: retained.entryHash })
      expect(await financialSnapshot(input)).toMatchObject({ status: "COMPLETED", registryCount: 1, movementCount: 1, journalCount: 2, stockQuantity: "4", customerBalance: "4", cashTotal: "6" })
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER "${name}" ON public.audit_logs`)
      await db.$executeRawUnsafe(`DROP FUNCTION public."${name}"()`)
      await db.$executeRawUnsafe(`DROP SEQUENCE public."${probe}"`)
      if (originalFlag === undefined) delete process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS
      else process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = originalFlag
    }
    process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = "1"
    try {
      expect(await replayPendingOfflineSaleEnvelope(request)).toMatchObject({ status: "DUPLICATE_REPLAY", saleId: input.salesOrderId })
      const after = await financialSnapshot(input)
      expect(await replayPendingOfflineSaleEnvelope(request)).toMatchObject({ status: "DUPLICATE_REPLAY", saleId: input.salesOrderId })
      expect(await financialSnapshot(input)).toEqual(after)
      expect(after).toMatchObject({ registryCount: 1, movementCount: 1, journalCount: 2, batchCount: 2, ledgerCount: 1, stockQuantity: "4", customerBalance: "4", cashTotal: "6" })
      expect(await db.pOSOfflineEvent.findUniqueOrThrow({ where: { id: retained.id } })).toMatchObject({ status: "REPLAYED", payloadHash: retained.payloadHash, entryHash: retained.entryHash })
      expect(await db.businessEvent.count({ where: { organizationId: input.organizationId, eventType: "pos.offline.event.replayed" } })).toBe(1)
      expect(await db.businessEventOutbox.count({ where: { organizationId: input.organizationId, channel: "SYNC_ACK", eventName: "pos.offline.event.replayed" } })).toBe(1)
    } finally {
      if (originalFlag === undefined) delete process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS
      else process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = originalFlag
    }
  })

  it("retains an offline payload conflict without replacing accepted evidence or creating a sale", async () => {
    const { input, envelope, retained } = await offlineFixture()
    const changed = { ...envelope.events[0], payload: { changed: true }, payloadHash: hashBusinessPayload({ changed: true }) }
    const result = await ingestOfflineSyncBatch({ ...envelope, events: [changed] })
    expect(result).toMatchObject({ conflictCount: 1, acceptedCount: 0, certificate: { closeBlocker: true } })
    expect(await db.pOSOfflineEvent.findUniqueOrThrow({ where: { id: retained.id } })).toEqual(retained)
    expect(await financialSnapshot(input)).toMatchObject({ registryCount: 0, movementCount: 0, journalCount: 0, stockQuantity: "5", customerBalance: "0", cashTotal: "0" })
  })

  it("P06 concurrent original-event replay converges on one financial effect and one acknowledgement", async () => {
    const { input, retained } = await offlineFixture()
    await expect(db.$transaction(tx => assertNoQueuedCheckoutInTx(tx, input))).rejects.toThrow("POS_CHECKOUT_OFFLINE_PENDING")
    const flag = process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS
    process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = "1"
    try {
      const request = { organizationId: input.organizationId, userId: input.userId, offlineEventId: retained.id }
      const attempts = await Promise.allSettled([replayPendingOfflineSaleEnvelope(request), replayPendingOfflineSaleEnvelope(request)])
      expect(attempts.some(result => result.status === "fulfilled")).toBe(true)
      const recovered = await replayPendingOfflineSaleEnvelope(request)
      expect(recovered.saleId).toBe(input.salesOrderId)
      const after = await financialSnapshot(input)
      expect(after).toMatchObject({ registryCount: 1, movementCount: 1, journalCount: 2, batchCount: 2, ledgerCount: 1, stockQuantity: "4", customerBalance: "4", cashTotal: "6" })
      await replayPendingOfflineSaleEnvelope(request)
      expect(await financialSnapshot(input)).toEqual(after)
      expect(await db.businessEvent.count({ where: { organizationId: input.organizationId, eventType: "pos.offline.event.replayed" } })).toBe(1)
      expect(await db.businessEventOutbox.count({ where: { organizationId: input.organizationId, channel: "SYNC_ACK", eventName: "pos.offline.event.replayed" } })).toBe(1)
      expect(await db.pOSOfflineEvent.findUniqueOrThrow({ where: { id: retained.id } })).toMatchObject({ payloadHash: retained.payloadHash, entryHash: retained.entryHash })
      await expect(db.$transaction(tx => assertNoQueuedCheckoutInTx(tx, input))).resolves.toBeUndefined()
    } finally {
      if (flag === undefined) delete process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS
      else process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = flag
    }
  })

  it("P06 revocation after ingestion retains blocked evidence without committing a sale", async () => {
    const { input, retained } = await offlineFixture()
    await db.pOSOfflineDevice.update({ where: { id: retained.deviceId }, data: { status: "REVOKED", revokedAt: new Date(), revokedById: input.userId } })
    const flag = process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS
    process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = "1"
    try {
      expect(await replayPendingOfflineSaleEnvelope({ organizationId: input.organizationId, userId: input.userId, offlineEventId: retained.id }))
        .toMatchObject({ status: "BLOCKED", blockerCode: "OFFLINE_REPLAY_DEVICE_INACTIVE" })
      expect(await financialSnapshot(input)).toMatchObject({ registryCount: 0, movementCount: 0, journalCount: 0, stockQuantity: "5", cashTotal: "0" })
      expect(await db.pOSOfflineEvent.findUniqueOrThrow({ where: { id: retained.id } })).toMatchObject({ status: "BLOCKED", payloadHash: retained.payloadHash, entryHash: retained.entryHash })
      expect(await db.pOSOfflineSyncCertificate.count({ where: { organizationId: input.organizationId, deviceId: retained.deviceId, closeBlocker: true } })).toBeGreaterThan(0)
      await expect(db.$transaction(tx => assertNoQueuedCheckoutInTx(tx, input))).rejects.toThrow("POS_CHECKOUT_OFFLINE_PENDING")
    } finally {
      if (flag === undefined) delete process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS
      else process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = flag
    }
  })

  it("P06 expired policy quarantines original signed evidence without a financial effect", async () => {
    const input = await fixture()
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
    const device = await registerOfflineDevice({ ...input, deviceLabel: "Expired policy fixture", deviceFingerprintHash: randomUUID(), signingPublicKeyPem: publicKey.export({ format: "pem", type: "spki" }).toString(), policyExpiresAt: new Date(0) })
    const payload = { commitSale: input.request }, payloadHash = hashBusinessPayload(payload)
    const event = { eventType: "OFFLINE_SALE_CAPTURED" as const, schemaVersion: 1, deviceSeq: 1, idempotencyKey: randomUUID(), capturedAtDevice: new Date(), payload, payloadHash, prevHash: null, entryHash: "", signature: "" }
    event.entryHash = buildOfflineEventEntryHash({ ...event, deviceId: device.id })
    event.signature = sign("sha256", Buffer.from(event.entryHash, "utf8"), privateKey).toString("base64")
    expect(await ingestOfflineSyncBatch({ ...input, deviceId: device.id, events: [event] })).toMatchObject({ acceptedCount: 0, conflictCount: 1, certificate: { closeBlocker: true } })
    expect(await db.pOSOfflineEvent.findFirstOrThrow({ where: { organizationId: input.organizationId, idempotencyKey: event.idempotencyKey } })).toMatchObject({ status: "QUARANTINED", payloadHash, entryHash: event.entryHash, payload })
    expect(await db.pOSOfflineDevice.findUniqueOrThrow({ where: { id: device.id } })).toMatchObject({ lastSequence: 0 })
    expect(await financialSnapshot(input)).toMatchObject({ registryCount: 0, movementCount: 0, journalCount: 0, stockQuantity: "5", cashTotal: "0" })
    await expect(db.$transaction(tx => assertNoQueuedCheckoutInTx(tx, input))).rejects.toThrow("POS_CHECKOUT_OFFLINE_PENDING")
  })

  integratedBrowserCase("P06 integrates durable browser queue, real ingestion and replay after lost HTTP responses", async () => {
    const input = await fixture()
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
    const device = await registerOfflineDevice({ ...input, deviceLabel: "Browser integration fixture", deviceFingerprintHash: randomUUID(), signingPublicKeyPem: publicKey.export({ format: "pem", type: "spki" }).toString() })
    const payload = { commitSale: input.request }, idempotencyKey = randomUUID()
    const entryHash = buildOfflineEventEntryHash({ deviceId: device.id, deviceSeq: 1, eventType: "OFFLINE_SALE_CAPTURED", schemaVersion: 1, payloadHash: hashBusinessPayload(payload), prevHash: null })
    const signature = sign("sha256", Buffer.from(entryHash, "utf8"), privateKey).toString("base64")
    const source = transpileModule(readFileSync(join(process.cwd(), "lib/pos/offline-local-queue.ts"), "utf8"), { compilerOptions: { module: ModuleKind.ES2022, target: ScriptTarget.ES2022 } }).outputText
    let dropIngestion = true, dropReplay = true
    const timing: Array<Record<string, unknown>> = []
    const originalFlag = process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS
    process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = "1"
    // Test-only transport adapter with a fixed server-owned actor/scope. This is
    // not the authenticated Next route and never enables deployed offline replay.
    const server = createServer(async (req, res) => {
      try {
        if (req.url === "/ingest" && req.method === "POST") {
          let body = ""
          for await (const chunk of req) { body += chunk; if (body.length > 100000) throw new Error("Fixture payload too large") }
          const batch = await ingestOfflineSyncBatch({ ...JSON.parse(body), organizationId: input.organizationId, userId: input.userId })
          timing.push({ operation: "ingest", utc: new Date().toISOString(), batchId: batch.batchId, duplicateCount: batch.duplicateCount, responseDropped: dropIngestion })
          if (dropIngestion) { req.socket.destroy(); return }
          res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(batch)); return
        }
        if (req.url === "/replay" && req.method === "POST") {
          const event = await db.pOSOfflineEvent.findFirstOrThrow({ where: { organizationId: input.organizationId, idempotencyKey } })
          const replay = await replayPendingOfflineSaleEnvelope({ organizationId: input.organizationId, userId: input.userId, offlineEventId: event.id })
          timing.push({ operation: "replay", utc: new Date().toISOString(), saleId: replay.saleId, responseDropped: dropReplay })
          if (dropReplay) { req.socket.destroy(); return }
          res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(replay)); return
        }
        res.setHeader("Content-Type", req.url === "/queue.js" ? "text/javascript" : "text/html")
        res.end(req.url === "/queue.js" ? source : "<!doctype html><title>P06 isolated integrated fixture</title>")
      } catch { res.statusCode = 500; res.end("Fixture operation failed; retain original evidence") }
    })
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
    try {
      await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
      const address = server.address()
      if (!address || typeof address === "string") throw new Error("Fixture server missing")
      browser = await chromium.launch({ headless: true })
      const context = await browser.newContext(), page = await context.newPage()
      const config = { organizationKey: input.organizationId, deviceId: device.id, locationId: input.locationId, terminalId: input.terminalId, sessionId: input.sessionId }
      const load = async () => {
        await page.goto(`http://127.0.0.1:${address.port}`)
        await page.addScriptTag({ type: "module", content: 'import * as q from "/queue.js"; window.queue = q;' })
        await page.waitForFunction(() => Boolean((window as any).queue))
      }
      await load()
      const original = await page.evaluate(async ({ config, payload, idempotencyKey, signature }) => (window as any).queue.enqueueOfflineLocalEvent(config, { eventType: "OFFLINE_SALE_CAPTURED", payload, idempotencyKey, signature }), { config, payload, idempotencyKey, signature })
      expect(original.event.entryHash).toBe(entryHash)
      const flush = () => page.evaluate(async config => {
        const q = (window as any).queue, claim = await q.claimOfflineLocalQueueBatch(config)
        if (claim.skipped) throw new Error("Expected retained claim")
        try {
          const response = await fetch("/ingest", { method: "POST", body: JSON.stringify(claim.envelope) })
          if (!response.ok) throw new Error("Ingestion failed")
          const batch = await response.json()
          await q.settleOfflineLocalQueueBatch(config, claim, { status: "SYNCED", serverBatchId: batch.batchId })
          return { batch, state: await q.loadOfflineLocalQueue(config) }
        } catch {
          await q.settleOfflineLocalQueueBatch(config, claim, { status: "UNCERTAIN" })
          return { state: await q.loadOfflineLocalQueue(config) }
        }
      }, config)
      const lost = await flush()
      expect(lost.state.entries[0]).toMatchObject({ event: original.event, status: "UNCERTAIN" })
      await expect(db.$transaction(tx => assertNoQueuedCheckoutInTx(tx, input))).rejects.toThrow("POS_CHECKOUT_OFFLINE_PENDING")
      await context.setOffline(true); await context.setOffline(false); await load()
      // Keep suppression active across Chromium's automatic transport retries.
      dropIngestion = false
      const acknowledged = await flush()
      expect(acknowledged.batch).toMatchObject({ acceptedCount: 0, duplicateCount: 1, conflictCount: 0 })
      expect(acknowledged.state.entries[0]).toMatchObject({ event: original.event, status: "SYNCED", syncAttempts: 2 })
      expect((await financialSnapshot(input)).registryCount).toBe(0)
      // Reconnect retains the original owner/key and reacquires its legitimate
      // lease through the real service; this fixture does not bypass stale leases.
      await acquirePOSCheckout(input)
      const replay = () => page.evaluate(async () => { try { const r = await fetch("/replay", { method: "POST" }); return r.ok ? await r.json() : null } catch { return null } })
      expect(await replay()).toBeNull()
      const committed = await financialSnapshot(input)
      expect(committed).toMatchObject({ registryCount: 1, movementCount: 1, journalCount: 2, stockQuantity: "4", cashTotal: "6" })
      dropReplay = false
      expect(await replay()).toMatchObject({ status: "DUPLICATE_REPLAY", saleId: input.salesOrderId })
      expect(await financialSnapshot(input)).toEqual(committed)
      await expect(db.$transaction(tx => assertNoQueuedCheckoutInTx(tx, input))).resolves.toBeUndefined()
      if (process.env.RETENTION_VERIFICATION_EVIDENCE_DIR) writeFileSync(join(process.env.RETENTION_VERIFICATION_EVIDENCE_DIR, `offline-browser-${Date.now()}.json`), JSON.stringify({ browser: browser.version(), timing, original, lost, acknowledged, financial: committed, limitation: "Real browser + PostgreSQL via test-only HTTP adapter; not authenticated application UI or unsent-local close visibility" }, null, 2))
      await context.close()
    } finally {
      await browser?.close()
      await new Promise<void>(resolve => server.close(() => resolve()))
      if (originalFlag === undefined) delete process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS
      else process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS = originalFlag
    }
  }, 180000)

  it("retries a serialization failure at sale evidence with one complete financial effect", async () => {
    const input = await fixture(), name = `pos_retry_${randomUUID().replaceAll("-", "")}`, probe = `${name}_probe`
    await db.$executeRawUnsafe(`CREATE SEQUENCE public."${probe}"`)
    await db.$executeRawUnsafe(`CREATE FUNCTION public."${name}"() RETURNS trigger AS $$ BEGIN IF NEW."organizationId" = '${input.organizationId}' AND NEW."eventType" = 'pos.sale.finalized' AND nextval('public."${probe}"') = 1 THEN RAISE EXCEPTION 'injected serialization retry' USING ERRCODE = '40001'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`)
    await db.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON public.business_events FOR EACH ROW EXECUTE FUNCTION public."${name}"()`)
    try {
      expect(await commitPOSSale(input.request)).toMatchObject({ saleId: input.salesOrderId, replayed: false })
      expect(Number((await db.$queryRawUnsafe<Array<{ last_value: bigint }>>(`SELECT last_value FROM public."${probe}"`))[0].last_value)).toBe(2)
      const after = await financialSnapshot(input)
      expect(after).toMatchObject({ registryCount: 1, movementCount: 1, journalCount: 2, batchCount: 2, ledgerCount: 1, stockQuantity: "4", customerBalance: "4", cashTotal: "6" })
      expect((await commitPOSSale(input.request)).replayed).toBe(true)
      expect(await financialSnapshot(input)).toEqual(after)
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER "${name}" ON public.business_events`)
      await db.$executeRawUnsafe(`DROP FUNCTION public."${name}"()`)
      await db.$executeRawUnsafe(`DROP SEQUENCE public."${probe}"`)
    }
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
