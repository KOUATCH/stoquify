import { Prisma } from "@prisma/client"
import { listCustomerStatementHistory, getCustomerStatementRecord } from "../customer-statement-history.service"
jest.mock("@/prisma/db", () => ({ db: {} }))

const date = new Date("2026-08-01T00:00:00Z")
const row = { id: "statement", statementNumber: "STM-1", version: 1, contentHash: "hash", businessEventId: "event", periodStart: date, periodEnd: date, asOf: date, recordedThrough: date, createdAt: date, currency: "XAF", openingBalance: new Prisma.Decimal(10), periodDebits: new Prisma.Decimal(20), periodCredits: new Prisma.Decimal(5), closingBalance: new Prisma.Decimal(25), overdueBalance: new Prisma.Decimal(0), itemCount: 1, movementCount: 1, truncated: false }
function fixture() {
  const tx = {
    customer: { findFirst: jest.fn().mockResolvedValue({ id: "customer" }) },
    customerStatementSnapshot: { findFirst: jest.fn().mockResolvedValue(row), findMany: jest.fn().mockResolvedValue([row]) },
    customerStatementDelivery: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    businessEventOutbox: { findMany: jest.fn().mockResolvedValue([]) },
  }
  const client = { $transaction: jest.fn(async work => work(tx)) } as unknown as NonNullable<Parameters<typeof listCustomerStatementHistory>[1]>
  return { tx, client }
}
const input = { organizationId: "org", customerId: "customer" }
it("scopes every history lookup and returns stored amounts without snapshot source payload", async () => {
  const { tx, client } = fixture()
  const result = await listCustomerStatementHistory(input, client)
  expect(tx.customer.findFirst).toHaveBeenCalledWith({ where: { id: "customer", organizationId: "org" }, select: { id: true } })
  expect(tx.customerStatementSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: input, take: 11 }))
  expect(result.statements[0]).toMatchObject({ closingBalance: "25.00", currency: "XAF", statementId: "statement" })
  expect(result.statements[0]).not.toHaveProperty("payload")
  expect(tx.customerStatementSnapshot.findMany.mock.calls[0][0].select).not.toHaveProperty("statementPayload")
})
it("denies missing or foreign customers before reading statements", async () => {
  const { tx, client } = fixture(); tx.customer.findFirst.mockResolvedValue(null)
  await expect(listCustomerStatementHistory(input, client)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.customerStatementSnapshot.findMany).not.toHaveBeenCalled()
})
it("rejects a foreign cursor instead of leaking or restarting the page", async () => {
  const { tx, client } = fixture(); tx.customerStatementSnapshot.findFirst.mockResolvedValue(null)
  await expect(listCustomerStatementHistory({ ...input, cursor: "foreign" }, client)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.customerStatementSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { ...input, id: "foreign" } }))
  expect(tx.customerStatementSnapshot.findMany).not.toHaveBeenCalled()
})
it("uses a stable scoped keyset and identifies another page", async () => {
  const { tx, client } = fixture(); tx.customerStatementSnapshot.findMany.mockResolvedValue([row, { ...row, id: "older" }])
  const result = await listCustomerStatementHistory({ ...input, cursor: "statement", limit: 1 }, client)
  expect(result.nextCursor).toBe("statement"); expect(result.statements).toHaveLength(1)
  expect(tx.customerStatementSnapshot.findMany.mock.calls[0][0].where).toMatchObject({ ...input, OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: "statement" } }] })
})
it("does not turn a failed query into successful empty history", async () => {
  const { tx, client } = fixture(); tx.customerStatementSnapshot.findMany.mockRejectedValue(new Error("database unavailable"))
  await expect(listCustomerStatementHistory(input, client)).rejects.toThrow("database unavailable")
})
it("rejects a foreign statement before reading its deliveries", async () => {
  const { tx, client } = fixture(); tx.customerStatementSnapshot.findFirst.mockResolvedValue(null)
  await expect(getCustomerStatementRecord({ ...input, statementId: "foreign" }, client)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.customerStatementDelivery.findMany).not.toHaveBeenCalled()
})
it("shows expiry, revocation and absent state separately from outbox processing", async () => {
  const { tx, client } = fixture()
  const delivery = { id: "delivery", createdAt: date, channel: "EMAIL", redactedDestination: "r***@example.invalid", consentCapturedAt: date, outboxId: "outbox", states: [], token: { id: "token", status: "ACTIVE", expiresAt: date, revokedAt: null } }
  tx.customerStatementDelivery.findMany.mockResolvedValue([delivery, { ...delivery, id: "revoked", token: { ...delivery.token, revokedAt: date } }])
  tx.businessEventOutbox.findMany.mockResolvedValue([{ id: "outbox", status: "FAILED", attempts: 2, availableAt: date, lastErrorCode: "PROVIDER_FAILURE" }])
  const result = await getCustomerStatementRecord({ ...input, statementId: "statement" }, client)
  expect(result.deliveries[0]).toMatchObject({ status: null, statusRecordedAt: null, token: { status: "EXPIRED" }, queue: { status: "FAILED", attempts: 2 } })
  expect(result.deliveries[1].token.status).toBe("REVOKED")
  const selection = tx.customerStatementDelivery.findMany.mock.calls[0][0].select
  expect(selection).not.toHaveProperty("payloadHash"); expect(selection.token.select).not.toHaveProperty("tokenHash")
  expect(result).not.toHaveProperty("sealedEnvelope")
})
it("can read a truncated historical record but preserves its unusable flag", async () => {
  const { tx, client } = fixture(); tx.customerStatementSnapshot.findFirst.mockResolvedValue({ ...row, truncated: true })
  expect((await getCustomerStatementRecord({ ...input, statementId: "statement" }, client)).statement.truncated).toBe(true)
})
