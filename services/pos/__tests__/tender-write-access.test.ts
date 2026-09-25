import { db } from "@/prisma/db"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { commitPOSSale, refundPOSSale, voidPOSSale } from "../pos.service"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), auditLog: { create: jest.fn() } } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))

const scope = { organizationId: "org-1", userId: "cashier-1", salesOrderId: "sale-1", locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1" }
const input = { ...scope, clientCommitId: "commit-unique-1", tenders: [{ method: "CASH", amount: 100 }], reason: "Customer correction", receipt: { channel: "NONE" } }
const transaction = db.$transaction as jest.Mock
const access = evaluateModuleAccessInTx as jest.Mock
const audit = db.auditLog.create as jest.Mock
const operations = [["commit", commitPOSSale], ["refund", refundPOSSale], ["void", voidPOSSale]] as const

describe("POS tender transaction admission", () => {
  beforeEach(() => { jest.resetAllMocks(); audit.mockResolvedValue({ id: "denial-1" }) })

  it.each(operations)("%s denies before financial reads or writes and audits only after rollback", async (operation, perform) => {
    let rolledBack = false
    const tx = { pOSCommitResult: { findUnique: jest.fn().mockResolvedValue(null) }, salesOrder: { findFirst: jest.fn() } }
    transaction.mockImplementation(async callback => { try { return await callback(tx) } catch (error) { rolledBack = true; throw error } })
    access.mockResolvedValue({ allowed: false })
    audit.mockImplementation(async () => { expect(rolledBack).toBe(true); return { id: "denial-1" } })
    await expect(perform(input)).rejects.toMatchObject({ code: "FORBIDDEN", metadata: { reason: "POS_TENDER_WRITE_UNAVAILABLE", policyId: `pos.tender.${operation}` } })
    expect(access).toHaveBeenCalledWith(tx, expect.objectContaining({ organizationId: scope.organizationId, userId: scope.userId, moduleSlug: "pos", surface: `actions/pos/tender.actions.ts:${operation}POSSaleAction`, mode: "enforce", accessIntent: "write" }))
    expect(tx.salesOrder.findFirst).not.toHaveBeenCalled()
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(audit).toHaveBeenCalledTimes(1)
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: scope.organizationId, userId: scope.userId, entityId: scope.salesOrderId, action: "POS_TENDER_WRITE_ENTITLEMENT_DENIED" }) }))
  })

  it.each(operations)("%s fails closed on an authority read failure without inventing a denial audit", async (_operation, perform) => {
    const tx = { pOSCommitResult: { findUnique: jest.fn().mockResolvedValue(null) }, salesOrder: { findFirst: jest.fn() } }
    transaction.mockImplementation(async callback => callback(tx))
    access.mockRejectedValue(new Error("Authority unavailable"))
    await expect(perform(input)).rejects.toThrow()
    expect(tx.salesOrder.findFirst).not.toHaveBeenCalled()
    expect(audit).not.toHaveBeenCalled()
  })

  it("does not retry or report success if the post-rollback denial audit fails", async () => {
    transaction.mockImplementation(async callback => callback({}))
    access.mockResolvedValue({ allowed: false })
    const error = new Error("Audit unavailable")
    audit.mockRejectedValue(error)
    await expect(refundPOSSale(input)).rejects.toBe(error)
    expect(transaction).toHaveBeenCalledTimes(1)
  })
})
