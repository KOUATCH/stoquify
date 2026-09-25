import { Prisma } from "@prisma/client"
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../cart-write-access", () => ({ assertPOSCartWriteAccessInTx: jest.fn() }))
jest.mock("../pos.service", () => ({
  readPOSSaleCommitStatusInTx: jest.fn(), getOrCreateDraftCart: jest.fn(),
  recalculateCartTotals: jest.fn(), lineMath: jest.fn(() => ({ taxAmount: new Prisma.Decimal(0), lineTotal: new Prisma.Decimal(100) })),
}))
import { db } from "@/prisma/db"
import { acquirePOSCheckout, changePOSCheckoutCart, preparePOSCheckout, retainLegacyPOSCheckout } from "../checkout.service"
import { assertCheckoutLeaseInTx, retireShiftDraftsInTx } from "../checkout-state"
import { getOrCreateDraftCart, readPOSSaleCommitStatusInTx } from "../pos.service"

const input = { organizationId: "org", userId: "cashier", locationId: "location", terminalId: "terminal", sessionId: "session", checkoutLeaseId: "00000000-0000-4000-8000-000000000001" }
const request = { clientCommitId: "pos:interrupted", salesOrderId: "cart", locationId: "location", terminalId: "terminal", sessionId: "session", expectedCartRevision: "a".repeat(64), tenders: [{ method: "CASH" as const, amount: 100 }] }
const scope = { sessionId: "session", organizationId: "org", actorId: "cashier" }
const tx = {
  pOSSession: { findFirst: jest.fn() },
  pOSOfflineSyncCertificate: { count: jest.fn() },
  pOSCheckoutWorkspace: { upsert: jest.fn(), findFirst: jest.fn(), findFirstOrThrow: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  salesOrder: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  salesOrderLine: { count: jest.fn(), create: jest.fn(), update: jest.fn() },
  item: { findFirst: jest.fn() }, pOSOfflineEvent: { count: jest.fn() }, pOSCommitResult: { count: jest.fn() }, auditLog: { create: jest.fn() },
}
const transactionClient = tx as unknown as Prisma.TransactionClient
const outcome = readPOSSaleCommitStatusInTx as jest.Mock

beforeEach(() => {
  jest.resetAllMocks()
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(tx))
  tx.pOSSession.findFirst.mockResolvedValue({ id: "session" })
  const workspace = { ...scope, leaseId: input.checkoutLeaseId, leaseExpiresAt: new Date(Date.now() + 60_000), pendingRequest: null }
  tx.pOSCheckoutWorkspace.upsert.mockResolvedValue(workspace)
  tx.pOSCheckoutWorkspace.findFirst.mockResolvedValue(workspace)
  tx.pOSCheckoutWorkspace.findFirstOrThrow.mockResolvedValue(workspace)
  tx.pOSCheckoutWorkspace.findMany.mockResolvedValue([])
  tx.pOSCheckoutWorkspace.updateMany.mockResolvedValue({ count: 1 })
  tx.salesOrder.findMany.mockResolvedValue([])
  tx.salesOrder.updateMany.mockResolvedValue({ count: 1 })
  tx.pOSOfflineEvent.count.mockResolvedValue(0)
  tx.pOSOfflineSyncCertificate.count.mockResolvedValue(0)
  tx.pOSCommitResult.count.mockResolvedValue(0)
  outcome.mockResolvedValue({ kind: "NOT_FOUND" })
})

it("rejects another tab and expired leases before any cart write", async () => {
  await expect(assertCheckoutLeaseInTx(transactionClient, input, "another-tab")).rejects.toThrow("POS_CHECKOUT_OWNERSHIP_REQUIRED")
  tx.pOSCheckoutWorkspace.findFirst.mockResolvedValue({ ...scope, leaseId: input.checkoutLeaseId, leaseExpiresAt: new Date(0) })
  await expect(assertCheckoutLeaseInTx(transactionClient, input, input.checkoutLeaseId)).rejects.toThrow("POS_CHECKOUT_OWNERSHIP_REQUIRED")
  expect(tx.pOSCheckoutWorkspace.updateMany).not.toHaveBeenCalled()
})

it("keeps a second owner read-only when the compare-and-set loses", async () => {
  tx.pOSCheckoutWorkspace.updateMany.mockResolvedValue({ count: 0 })
  await expect(acquirePOSCheckout(input)).rejects.toThrow("POS_CHECKOUT_OWNED_ELSEWHERE")
  expect(tx.pOSCheckoutWorkspace.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining(scope) }))
})

it("persists the exact request before submission so a new tab can recover it", async () => {
  await preparePOSCheckout({ ...input, ...request })
  expect(tx.pOSCheckoutWorkspace.update).toHaveBeenCalledWith({ where: { sessionId: "session" }, data: { pendingRequest: request } })
  tx.pOSCheckoutWorkspace.findFirstOrThrow.mockResolvedValue({ ...scope, pendingRequest: request })
  expect((await acquirePOSCheckout(input)).pendingRequest).toEqual(request)
})

it.each(["NOT_FOUND", "PENDING"])("does not erase an uncertain %s attempt on startup", async kind => {
  tx.pOSCheckoutWorkspace.findMany.mockResolvedValue([{ ...scope, pendingRequest: request }])
  outcome.mockResolvedValue({ kind })
  await acquirePOSCheckout(input)
  expect(tx.pOSCheckoutWorkspace.update).not.toHaveBeenCalled()
})

it.each(["RECORDED", "NOT_COMMITTED"])("settles %s evidence with an audit record and no new sale", async kind => {
  tx.pOSCheckoutWorkspace.findMany.mockResolvedValueOnce([{ ...scope, pendingRequest: request }]).mockResolvedValueOnce([])
  outcome.mockResolvedValue({ kind, saleId: "cart", orderNumber: "POS-1", total: 100 })
  const recovered = await acquirePOSCheckout(input)
  expect(recovered.settled).toBe(true)
  expect(recovered.recoveredSales).toEqual(kind === "RECORDED" ? [{ salesOrderId: "cart", orderNumber: "POS-1", total: 100 }] : [])
  expect(tx.pOSCheckoutWorkspace.update).toHaveBeenCalledWith({ where: { sessionId: "session" }, data: { pendingRequest: Prisma.DbNull } })
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "POS_CHECKOUT_RECOVERY_SETTLED", changes: { clientCommitId: request.clientCommitId, outcome: kind } }) }))
})

it("retains a legacy request under the authenticated owner and refuses a different request", async () => {
  tx.salesOrder.findFirst.mockResolvedValue({ id: "cart" })
  await retainLegacyPOSCheckout({ ...input, ...request })
  expect(tx.salesOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", createdById: "cashier", id: "cart", terminalId: "terminal", sessionId: "session" }) }))
  tx.pOSCheckoutWorkspace.upsert.mockResolvedValue({ ...scope, pendingRequest: { ...request, clientCommitId: "pos:other-attempt" } })
  await expect(retainLegacyPOSCheckout({ ...input, ...request })).rejects.toThrow("POS_CHECKOUT_RECOVERY_REQUIRED")
})

it("parks a draft without deleting lines or moving stock", async () => {
  tx.salesOrder.findFirst.mockResolvedValue({ id: "cart", sessionId: "session", lines: [{ id: "line" }] })
  expect(await changePOSCheckoutCart({ ...input, salesOrderId: "cart", command: "PARK" })).toEqual({ activeCartId: null })
  expect(tx.salesOrder.update).toHaveBeenCalledWith({ where: { id: "cart" }, data: { posCartState: "PARKED", version: { increment: 1 } } })
  expect(tx.salesOrderLine.update).not.toHaveBeenCalled()
  expect(tx.salesOrderLine.create).not.toHaveBeenCalled()
})

it("refuses parking while a submitted attempt remains unresolved", async () => {
  tx.pOSCheckoutWorkspace.findFirst.mockResolvedValue({ ...scope, leaseId: input.checkoutLeaseId, leaseExpiresAt: new Date(Date.now() + 60_000), pendingRequest: request })
  await expect(changePOSCheckoutCart({ ...input, salesOrderId: "cart", command: "PARK" })).rejects.toThrow("POS_CHECKOUT_RECOVERY_REQUIRED")
  expect(tx.salesOrder.update).not.toHaveBeenCalled()
})

it("allows editing only after an explicit fenced review and still forbids parking that pending attempt", async () => {
  tx.pOSCheckoutWorkspace.findFirst.mockResolvedValue({ ...scope, leaseId: input.checkoutLeaseId, leaseExpiresAt: new Date(Date.now() + 60_000), pendingRequest: { ...request, _cartReview: true } })
  await expect(assertCheckoutLeaseInTx(transactionClient, input, input.checkoutLeaseId, false, true)).resolves.toBeDefined()
  await expect(changePOSCheckoutCart({ ...input, salesOrderId: "cart", command: "PARK" })).rejects.toThrow("POS_CHECKOUT_RECOVERY_REQUIRED")
  await preparePOSCheckout({ ...input, ...request })
  expect(tx.pOSCheckoutWorkspace.update).toHaveBeenLastCalledWith({ where: { sessionId: "session" }, data: { pendingRequest: request } })
})

it("revalidates stock before resuming and leaves unavailable contents intact", async () => {
  tx.salesOrder.findFirst.mockResolvedValue({ id: "cart", sessionId: "session", lines: [{ itemId: "item", quantity: new Prisma.Decimal(2) }] })
  ;(getOrCreateDraftCart as jest.Mock).mockResolvedValue({ id: "cart" })
  tx.item.findFirst.mockResolvedValue({ trackInventory: true, inventoryLevels: [{ quantityAvailable: new Prisma.Decimal(1) }] })
  await expect(changePOSCheckoutCart({ ...input, salesOrderId: "cart", command: "RESUME" })).rejects.toThrow("POS_CHECKOUT_STOCK_CHANGED")
  expect(tx.salesOrderLine.update).not.toHaveBeenCalled()
})

it("retires only active own-shift drafts and preserves parked carts and line history", async () => {
  await retireShiftDraftsInTx(transactionClient, input)
  expect(tx.salesOrder.updateMany).toHaveBeenCalledWith({ where: { organizationId: "org", createdById: "cashier", sessionId: "session", channel: "POS", status: "DRAFT", posCartState: "ACTIVE", deletedAt: null }, data: { posCartState: "RETIRED", version: { increment: 1 } } })
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "POS_SHIFT_DRAFTS_RETIRED" }) }))
})

it("blocks retirement for offline or uncertain financial work", async () => {
  tx.pOSOfflineEvent.count.mockResolvedValue(1)
  await expect(retireShiftDraftsInTx(transactionClient, input)).rejects.toThrow("POS_CHECKOUT_OFFLINE_PENDING")
  tx.pOSOfflineEvent.count.mockResolvedValue(0); tx.pOSCommitResult.count.mockResolvedValue(1)
  await expect(retireShiftDraftsInTx(transactionClient, input)).rejects.toThrow("POS_CHECKOUT_RECOVERY_REQUIRED")
  expect(tx.salesOrder.updateMany).not.toHaveBeenCalled()
})

it("preserves a terminal's offline certificate blocker before retiring any draft", async () => {
  tx.pOSOfflineSyncCertificate.count.mockResolvedValue(1)
  await expect(retireShiftDraftsInTx(transactionClient, input)).rejects.toThrow("POS_CHECKOUT_OFFLINE_PENDING")
  expect(tx.salesOrder.updateMany).not.toHaveBeenCalled()
})

it("retires a legacy closed-shift draft only after scoped result and offline checks", async () => {
  const oldRequest = { ...request, sessionId: "old-session" }
  tx.pOSCheckoutWorkspace.findMany.mockResolvedValueOnce([{ ...scope, sessionId: "old-session", pendingRequest: oldRequest }]).mockResolvedValueOnce([])
  outcome.mockResolvedValueOnce({ kind: "CART_CHANGED" }).mockResolvedValueOnce({ kind: "NOT_COMMITTED" })
  expect((await acquirePOSCheckout(input)).settled).toBe(true)
  expect(tx.salesOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "cart", sessionId: "old-session", session: { status: "CLOSED", endTime: { not: null } } }) }))
})
