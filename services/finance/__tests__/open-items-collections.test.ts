jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
import { db } from "@/prisma/db"
import { getSalesCollections } from "@/services/analytics/sales-collections.service"

it("reads receipt-period evidence without querying credit-issued sales for AR callers", async () => {
  const tx = {
    organization: { findFirst: jest.fn().mockResolvedValue({ id: "org", currency: "XAF", timezone: "Africa/Douala" }) },
    location: { findMany: jest.fn().mockResolvedValue([]) },
    payment: { groupBy: jest.fn().mockResolvedValue([]), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }), count: jest.fn().mockResolvedValue(0) },
    paymentRefund: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }), count: jest.fn().mockResolvedValue(0) },
    customerSettlementAllocation: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(tx))
  const input = { organizationId: "org", preset: "custom" as const, start: "2026-10-01", end: "2026-10-12" }
  const result = await getSalesCollections(input, { includeCreditIssued: false })
  expect(tx.payment.aggregate).not.toHaveBeenCalled()
  expect(tx.payment.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", status: { in: ["PAID", "REFUNDED"] }, processedAt: expect.any(Object) }) }))
  expect(result.net).toBe("0.00")
  await getSalesCollections(input)
  expect(tx.payment.aggregate).toHaveBeenCalledTimes(1)
})
