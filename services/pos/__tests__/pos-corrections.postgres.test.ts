/** @jest-environment node */
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"

jest.unmock("@/prisma/db")
// Real POS/database transactions; integration kernels below are simulations.
// This suite proves drawer/payment/sale rollback and ordering, not ledger or RBAC correctness.
jest.mock("@/services/pos/tender-write-access", () => ({
  assertPOSTenderWriteAccessInTx: jest.fn(), auditPOSTenderWriteDenial: jest.fn(),
}))
jest.mock("@/services/accounting/postings/post-refund", () => ({ postRefund: jest.fn() }))
jest.mock("@/services/accounting/postings/post-void", () => ({ postVoid: jest.fn() }))
jest.mock("@/services/accounting/postings/post-payment", () => ({ postPayment: jest.fn() }))
jest.mock("@/services/accounting/postings/post-sale", () => ({ postSale: jest.fn() }))
jest.mock("@/services/inventory/inventory-stock-event.service", () => ({
  postPOSStockIssue: jest.fn(), postPOSStockReturn: jest.fn(),
}))
jest.mock("@/services/events/business-event.service", () => ({
  ...jest.requireActual("@/services/events/business-event.service"), recordBusinessEventInTx: jest.fn(),
}))
jest.mock("@/services/pos/receipt.service", () => ({
  getPOSSaleCommitReceipt: jest.fn(), getSalesReceipt: jest.fn(), sendReceipt: jest.fn(),
}))

import { db } from "@/prisma/db"
import { postRefund } from "@/services/accounting/postings/post-refund"
import { postVoid } from "@/services/accounting/postings/post-void"
import { postPOSStockReturn } from "@/services/inventory/inventory-stock-event.service"
import { refundPOSSale, voidPOSSale } from "../pos.service"

const enabled = process.env.RUN_POS_CORRECTIONS_POSTGRES === "1"
const suite = enabled ? describe : describe.skip
function assertDisposableTarget() {
  const target = new URL(process.env.DATABASE_URL ?? "")
  const name = process.env.POS_DISPOSABLE_DATABASE_NAME ?? ""
  if (target.hostname !== "localhost" || !/^stoquify_pos_audit_\d{8}_[a-f0-9]+$/.test(name)
    || target.pathname !== `/${name}` || target.searchParams.get("schema") !== "public") {
    throw new Error("Refusing POS correction tests outside the recorded disposable database")
  }
}

async function fixture() {
  assertDisposableTarget()
  const suffix = randomUUID()
  const organizationId = `org-correction-${suffix}`
  const userId = `actor-correction-${suffix}`
  const locationId = `location-correction-${suffix}`
  const terminalId = `terminal-correction-${suffix}`
  const sessionId = `shift-correction-${suffix}`
  const salesOrderId = `sale-correction-${suffix}`
  const customerId = `customer-correction-${suffix}`
  const itemId = `item-correction-${suffix}`
  const drawerId = `drawer-correction-${suffix}`
  const olderDrawerId = `older-drawer-correction-${suffix}`
  await db.organization.create({ data: { id: organizationId, name: "Disposable POS correction", slug: organizationId, currency: "XAF" } })
  await db.user.create({ data: { id: userId, email: `${suffix}@correction.invalid`, organizationId, firstName: "Test", lastName: "Cashier", mfaBackupCodes: [] } })
  await db.location.create({ data: { id: locationId, organizationId, name: "Test store", code: suffix, type: "STORE" } })
  await db.customer.create({ data: { id: customerId, organizationId, name: "Test customer", code: suffix } })
  await db.item.create({ data: { id: itemId, organizationId, slug: suffix, sku: suffix, nameEn: "Untracked test item", imageUrls: [], trackInventory: false, sellingPrice: 10 } })
  await db.pOSStation.create({ data: { id: terminalId, organizationId, locationId, terminalNumber: suffix, name: "Test till", hasCashDrawer: true } })
  await db.pOSSession.create({ data: { id: sessionId, organizationId, locationId, terminalId, userId, sessionNumber: suffix, status: "ACTIVE", openingBalance: 100, expectedBalance: 110, totalSales: 10, cashTotal: 10, transactionCount: 1 } })
  await db.pOSStation.update({ where: { id: terminalId }, data: { currentSessionId: sessionId } })
  await db.cashDrawer.create({ data: { id: olderDrawerId, terminalId, locationId, name: "Unrelated older drawer", drawerNumber: `old-${suffix}`, currentBalance: 999, expectedBalance: 999, isOpen: true, createdAt: new Date("2000-01-01T00:00:00Z") } })
  await db.cashDrawer.create({ data: { id: drawerId, terminalId, locationId, name: "Shift opening drawer", drawerNumber: suffix, currentBalance: 110, expectedBalance: 110, isOpen: true } })
  await db.cashDrawerTransaction.create({ data: { cashDrawerId: drawerId, sessionId, userId, type: "OPENING_BALANCE", amount: 100, balanceBefore: 0, balanceAfter: 100 } })
  await db.salesOrder.create({ data: { id: salesOrderId, organizationId, locationId, terminalId, sessionId, customerId, createdById: userId, orderNumber: suffix, status: "COMPLETED", paymentStatus: "PAID", subtotal: 10, total: 10, lines: { create: { itemId, quantity: 1, unitPrice: 10, lineTotal: 10 } } } })
  const payment = await db.payment.create({ data: { organizationId, salesOrderId, paymentNumber: suffix, amount: 10, method: "CASH", status: "PAID", processedById: userId } })
  return { organizationId, userId, locationId, terminalId, sessionId, salesOrderId, paymentId: payment.id, drawerId, olderDrawerId, reason: "Disposable correction verification" }
}

suite("POS correction PostgreSQL transaction boundaries", () => {
  jest.setTimeout(60_000)
  beforeEach(() => {
    ;(postRefund as jest.Mock).mockResolvedValue({ id: "simulated-refund-ledger", postingBatchId: "simulated-refund-batch" })
    ;(postVoid as jest.Mock).mockResolvedValue({ id: "simulated-void-ledger", postingBatchId: "simulated-void-batch" })
    ;(postPOSStockReturn as jest.Mock).mockResolvedValue({ totalCost: new Prisma.Decimal(0) })
  })
  afterAll(async () => { await db.$disconnect() })

  it.each([
    { operation: "refund", correct: refundPOSSale, status: "RETURNED", transactionType: "REFUND" },
    { operation: "void", correct: voidPOSSale, status: "CANCELLED", transactionType: "RETURN" },
  ])("$operation writes only the shift opening drawer, preserving the older drawer", async ({ correct, status, transactionType }) => {
    const input = await fixture()
    await correct(input)
    const drawer = await db.cashDrawer.findUniqueOrThrow({ where: { id: input.drawerId } })
    const older = await db.cashDrawer.findUniqueOrThrow({ where: { id: input.olderDrawerId } })
    const session = await db.pOSSession.findUniqueOrThrow({ where: { id: input.sessionId } })
    expect(String(drawer.currentBalance)).toBe("100")
    expect(String(drawer.expectedBalance)).toBe("100")
    expect(String(session.expectedBalance)).toBe("100")
    expect(String(older.currentBalance)).toBe("999")
    expect(await db.cashDrawerTransaction.count({ where: { sessionId: input.sessionId, type: transactionType as "REFUND" | "RETURN", cashDrawerId: input.drawerId } })).toBe(1)
    expect((await db.salesOrder.findUniqueOrThrow({ where: { id: input.salesOrderId } })).status).toBe(status)
  })

  it("permits one concurrent refund and leaves one outflow and one payment refund", async () => {
    const input = await fixture()
    const results = await Promise.allSettled([refundPOSSale(input), refundPOSSale(input)])
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1)
    expect(await db.paymentRefund.count({ where: { paymentId: input.paymentId } })).toBe(1)
    expect(await db.cashDrawerTransaction.count({ where: { sessionId: input.sessionId, type: "REFUND" } })).toBe(1)
    expect(String((await db.cashDrawer.findUniqueOrThrow({ where: { id: input.drawerId } })).currentBalance)).toBe("100")
    const session = await db.pOSSession.findUniqueOrThrow({ where: { id: input.sessionId } })
    expect(String(session.expectedBalance)).toBe("100")
    expect(session.transactionCount).toBe(0)
  })

  it("rolls back sale, payment, drawer, shift and refund rows after a later posting failure", async () => {
    const input = await fixture()
    ;(postRefund as jest.Mock).mockRejectedValueOnce(new Error("injected accounting failure"))
    await expect(refundPOSSale(input)).rejects.toThrow("injected accounting failure")
    expect((await db.salesOrder.findUniqueOrThrow({ where: { id: input.salesOrderId } })).status).toBe("COMPLETED")
    const payment = await db.payment.findUniqueOrThrow({ where: { id: input.paymentId } })
    expect(payment.status).toBe("PAID")
    expect(String(payment.refundedAmount)).toBe("0")
    expect(String((await db.cashDrawer.findUniqueOrThrow({ where: { id: input.drawerId } })).currentBalance)).toBe("110")
    const session = await db.pOSSession.findUniqueOrThrow({ where: { id: input.sessionId } })
    expect(String(session.expectedBalance)).toBe("110")
    expect(session.transactionCount).toBe(1)
    expect(await db.paymentRefund.count({ where: { paymentId: input.paymentId } })).toBe(0)
    expect(await db.cashDrawerTransaction.count({ where: { sessionId: input.sessionId, type: "REFUND" } })).toBe(0)
    expect(await db.auditLog.count({ where: { entityId: input.salesOrderId, action: "POS_SALE_REFUND" } })).toBe(0)
  })
})
