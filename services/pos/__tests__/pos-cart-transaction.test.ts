import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { addPOSCartLine, removePOSCartLine, updatePOSCartLine } from "../pos.service"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))

const input = { organizationId: "org-1", userId: "cashier-1", locationId: "location-1", terminalId: "terminal-1", sessionId: "session-1", salesOrderId: "sale-1", lineId: "line-1", itemId: "item-1", quantity: 1 }
const transaction = db.$transaction as jest.Mock

describe("POS cart transaction recovery", () => {
  beforeEach(() => { jest.resetAllMocks(); require("@/services/modules/module-entitlement.service").evaluateModuleAccessInTx.mockResolvedValue({ allowed: true }) })

  it.each([addPOSCartLine, updatePOSCartLine, removePOSCartLine])("uses serializable transactions and bounds retries of proven aborts", async edit => {
    transaction.mockRejectedValue({ code: "P2034" })
    await expect(edit(input)).rejects.toMatchObject({ code: "CONFLICT" })
    expect(transaction).toHaveBeenCalledTimes(3)
    expect(transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  })

  it("does not retry a transport failure with an unknown commit outcome", async () => {
    const error = new Error("Connection lost after write")
    transaction.mockRejectedValue(error)
    await expect(addPOSCartLine(input)).rejects.toBe(error)
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it.each([updatePOSCartLine, removePOSCartLine])("requires the cart owner's active linked shift before editing lines", async edit => {
    const tx = {
      salesOrder: { findFirst: jest.fn().mockResolvedValue({ sessionId: "session-1", locationId: "location-1", terminalId: "terminal-1" }) },
      pOSSession: { findFirst: jest.fn().mockResolvedValue(null) },
      salesOrderLine: { findFirst: jest.fn() },
    }
    transaction.mockImplementation(async callback => callback(tx))
    await expect(edit(input)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
    expect(tx.salesOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", createdById: "cashier-1", status: "DRAFT" }) }))
    expect(tx.pOSSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "cashier-1", organizationId: "org-1", status: "ACTIVE", terminal: { is: { currentSessionId: "session-1" } } }) }))
    expect(tx.salesOrderLine.findFirst).not.toHaveBeenCalled()
  })
})

jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))
beforeEach(() => {
  const { evaluateModuleAccessInTx } = require("@/services/modules/module-entitlement.service")
  evaluateModuleAccessInTx.mockResolvedValue({ allowed: true })
})
