import { hashBusinessPayload } from "@/services/events/business-event.service"
import { db } from "@/prisma/db"
import { getPOSSaleCommitStatus } from "../pos.service"
import { getPOSSaleCommitStatusAction } from "@/actions/pos/commit-recovery.actions"
import { logger } from "@/lib/logger"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn().mockResolvedValue({ orgId: "org-1", userId: "cashier-1", permissions: ["pos.read"] }),
  assertCanUseOrganization: jest.fn(), isRbacError: () => false,
}))
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
const input = { organizationId: "org-1", userId: "cashier-1", clientCommitId: "original-1", salesOrderId: "sale-1", locationId: "loc-1", terminalId: "till-1", sessionId: "shift-1", tenders: [{ method: "CASH", amount: 100 }] }
function record() {
  const requestHash = hashBusinessPayload({ requestSchemaVersion: 1, organizationId: input.organizationId, actorId: input.userId, salesOrderId: input.salesOrderId, locationId: input.locationId, terminalId: input.terminalId, sessionId: input.sessionId, customerId: null, notes: null,
    tenders: [{ method: "CASH", amount: "100.00", paymentTransactionId: null, reference: null, cardLast4: null, cardType: null, authorizationCode: null, mobileMoneyProvider: null, mobileMoneyPhoneNumber: null, bankName: null }], receipt: { channel: "NONE", locale: null } })
  const resultEnvelope = { clientCommitId: input.clientCommitId, resultSchemaVersion: 1, replayed: false, saleId: input.salesOrderId, orderNumber: "POS-1", status: "COMPLETED", total: 100, receiptStatus: "READY" }
  return { id: "result-1", ...input, actorId: input.userId, requestSchemaVersion: 1, requestHash, status: "COMPLETED", resultEnvelope, resultHash: hashBusinessPayload(resultEnvelope) }
}
it.each(["CLAIMED", "COMMITTED", "COMPLETED"])("reads %s without any write-capable transaction delegate", async status => {
  const stored = { ...record(), status }
  const tx = { pOSCommitResult: { findFirst: jest.fn().mockResolvedValue(stored) }, salesOrder: { findFirst: jest.fn().mockResolvedValue({ status: "CANCELLED", paymentStatus: "CANCELLED" }) } }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  const result = await getPOSSaleCommitStatus(input)
  if (status === "CLAIMED") expect(result).toEqual({ kind: "PENDING" })
  else expect(result).toMatchObject({ kind: "RECORDED", originalStatus: "COMPLETED", currentStatus: "CANCELLED", receiptStatus: status === "COMMITTED" ? "RETRY_REQUIRED" : "READY" })
  expect(tx.pOSCommitResult.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ organizationId: "org-1", actorId: "cashier-1", terminalId: "till-1", salesOrderId: "sale-1", clientCommitId: "original-1" }) })
})
it("rejects an inconsistent result hash without claiming not-found", async () => {
  const tx = { pOSCommitResult: { findFirst: jest.fn().mockResolvedValue({ ...record(), resultHash: "corrupt" }) } }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  await expect(getPOSSaleCommitStatus(input)).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
})

it("returns a bounded conflict without attaching stored evidence for a changed request", async () => {
  const stored = record()
  const tx = { pOSCommitResult: { findFirst: jest.fn().mockResolvedValue(stored) }, salesOrder: { findFirst: jest.fn() } }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  const error = await getPOSSaleCommitStatus({ ...input, tenders: [{ method: "CASH", amount: 200 }] }).catch(error => error)
  expect(error).toMatchObject({ code: "DUPLICATE_KEY_CONFLICT", status: 409 })
  for (const field of ["existing", "attemptedRequestHash", "cause", "resultEnvelope"]) expect(error).not.toHaveProperty(field)
  expect(JSON.stringify(error)).not.toContain(stored.requestHash)
  expect(JSON.stringify(error)).not.toContain(stored.resultHash)
  expect(tx.salesOrder.findFirst).not.toHaveBeenCalled()
})

it("keeps stored evidence out of the protected action response and error log", async () => {
  const stored = record()
  const tx = { pOSCommitResult: { findFirst: jest.fn().mockResolvedValue(stored) } }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  const logged = jest.spyOn(logger, "error")
  try {
    const response = await getPOSSaleCommitStatusAction({ ...input, tenders: [{ method: "CASH", amount: 200 }] })
    expect(response).toMatchObject({ success: false, data: null, code: "DUPLICATE_KEY_CONFLICT", status: 409 })
    expect(logged).toHaveBeenCalledWith("protected action failed", expect.objectContaining({ err: expect.objectContaining({ code: "DUPLICATE_KEY_CONFLICT" }) }))
    const loggedError = logged.mock.calls.find(call => call[0] === "protected action failed")?.[1]?.err
    for (const field of ["existing", "attemptedRequestHash", "cause", "resultEnvelope"]) expect(loggedError).not.toHaveProperty(field)
    const exposed = JSON.stringify({ response, logs: logged.mock.calls })
    for (const value of [stored.requestHash, stored.resultHash, stored.resultEnvelope.orderNumber]) expect(exposed).not.toContain(value)
  } finally { logged.mockRestore() }
})

it("preserves an unrelated database failure as a failure", async () => {
  const unavailable = new Error("Recovery store unavailable")
  ;(db.$transaction as jest.Mock).mockRejectedValue(unavailable)
  await expect(getPOSSaleCommitStatus(input)).rejects.toBe(unavailable)
})

it.each([
  ["tenant", { organizationId: "org-2" }],
  ["cashier", { userId: "cashier-2" }],
  ["location", { locationId: "loc-2" }],
  ["terminal", { terminalId: "till-2" }],
  ["session", { sessionId: "shift-2" }],
  ["sale", { salesOrderId: "sale-2" }],
  ["commit identity", { clientCommitId: "other-attempt" }],
])("P05 does not disclose another %s's recorded outcome", async (_label, change) => {
  const stored = record()
  const tx = {
    pOSCommitResult: { findFirst: jest.fn(async ({ where }) =>
      Object.entries(where).every(([key, value]) => stored[key as keyof typeof stored] === value) ? stored : null,
    ) },
    salesOrder: { findFirst: jest.fn().mockResolvedValue(null) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  const attempted = { ...input, ...change }
  await expect(getPOSSaleCommitStatus(attempted)).resolves.toEqual({ kind: "NOT_FOUND" })
  expect(tx.pOSCommitResult.findFirst).toHaveBeenCalledWith({ where: {
    organizationId: attempted.organizationId, actorId: attempted.userId,
    locationId: attempted.locationId, terminalId: attempted.terminalId, sessionId: attempted.sessionId,
    salesOrderId: attempted.salesOrderId, clientCommitId: attempted.clientCommitId,
  } })
})

it("P05 recovers original identity and amount after response loss without rewriting current sale state", async () => {
  const stored = record()
  const tx = {
    pOSCommitResult: { findFirst: jest.fn().mockResolvedValue(stored) },
    salesOrder: { findFirst: jest.fn().mockResolvedValue({ status: "CANCELLED", paymentStatus: "CANCELLED" }) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  await expect(getPOSSaleCommitStatus(input)).resolves.toMatchObject({
    kind: "RECORDED", clientCommitId: input.clientCommitId, saleId: input.salesOrderId,
    orderNumber: "POS-1", total: 100, originalStatus: "COMPLETED", currentStatus: "CANCELLED",
  })
  // This transaction double has only reads; accidental completion/posting cannot succeed.
  expect(tx.salesOrder.findFirst).toHaveBeenCalledWith({
    where: { id: input.salesOrderId, organizationId: input.organizationId, createdById: input.userId,
      locationId: input.locationId, terminalId: input.terminalId, sessionId: input.sessionId },
    select: { status: true, paymentStatus: true },
  })
})

it("requires explicit current review for an unrecorded legacy request without changing it", async () => {
  const tx = { pOSCommitResult: { findFirst: jest.fn().mockResolvedValue(null) }, salesOrder: { findFirst: jest.fn().mockResolvedValue({ id: input.salesOrderId, lines: [], session: { status: "ACTIVE", endTime: null } }) } }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  await expect(getPOSSaleCommitStatus(input)).resolves.toEqual({ kind: "CART_REVIEW_REQUIRED" })
  expect(tx.salesOrder.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ organizationId: input.organizationId, createdById: input.userId, id: input.salesOrderId, status: "DRAFT", deletedAt: null }), include: { lines: true, session: { select: { status: true, endTime: true } } } })
  expect(input).not.toHaveProperty("expectedCartRevision")
})

it("does not expose a review path when the scoped draft is absent", async () => {
  const tx = { pOSCommitResult: { findFirst: jest.fn().mockResolvedValue(null) }, salesOrder: { findFirst: jest.fn().mockResolvedValue(null) } }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  await expect(getPOSSaleCommitStatus(input)).resolves.toEqual({ kind: "NOT_FOUND" })
})

it("proves a nonempty retired cart cannot commit after its shift closed", async () => {
  const tx = { pOSCommitResult: { findFirst: jest.fn().mockResolvedValue(null) }, salesOrder: { findFirst: jest.fn().mockResolvedValue({
    id: input.salesOrderId, posCartState: "RETIRED", lines: [{ id: "preserved-line" }], session: { status: "CLOSED", endTime: new Date() },
  }) } }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  await expect(getPOSSaleCommitStatus(input)).resolves.toEqual({ kind: "NOT_COMMITTED", reason: "RETIRED_CART_CLOSED_SHIFT" })
})

it.each([
  { session: { status: "CLOSED", endTime: new Date("2026-09-20T04:29:21Z") }, lines: [], kind: "NOT_COMMITTED" },
  { session: { status: "ACTIVE", endTime: null }, lines: [], kind: "CART_REVIEW_REQUIRED" },
  { session: { status: "CLOSED", endTime: null }, lines: [], kind: "CART_REVIEW_REQUIRED" },
  { session: { status: "CLOSED", endTime: new Date("2026-09-20T04:29:21Z") }, lines: [{ id: "retained-item" }], kind: "CART_REVIEW_REQUIRED" },
  { session: null, lines: [], kind: "CART_REVIEW_REQUIRED" },
])("returns $kind for an unrecorded draft with session $session and lines $lines", async ({ session, lines, kind }) => {
  const tx = {
    pOSCommitResult: { findFirst: jest.fn().mockResolvedValue(null) },
    salesOrder: { findFirst: jest.fn().mockResolvedValue({ id: input.salesOrderId, session, lines }) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(async callback => callback(tx))
  const result = await getPOSSaleCommitStatus(input)
  expect(result.kind).toBe(kind)
  if (kind === "NOT_COMMITTED") expect(result).toEqual({ kind, reason: "EMPTY_CART_CLOSED_SHIFT" })
})
