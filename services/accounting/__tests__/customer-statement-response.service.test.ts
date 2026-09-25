/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { listCustomerStatementResponses, getCustomerStatementResponseHistory, reviewCustomerStatementResponse } from "../customer-statement-response.service"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({ ...jest.requireActual("@/services/events/business-event.service"), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor", sessionId: "session" }
const command = { customerId: "customer", actionId: "response", outcome: "ACKNOWLEDGED", reason: "Checking the disputed quantity", requestId: "a0000000-0000-4000-8000-000000000001", expectedStateHash: "" }
function fixture() {
  const payload = { organizationId: "org", statementSnapshotId: "statement", statementContentHash: "c".repeat(64), tokenId: "private-token-id", actionType: "DISPUTE", customerReceivableDocumentId: "document", requestedAmount: "25.00", promisedFor: null, note: "Quantity disputed", idempotencyKey: "recipient-request", correlationId: "correlation" }
  const payloadHash = hashBusinessPayload(payload)
  const state = { id: "s1", organizationId: "org", actionId: "response", version: 1, status: "OPEN", effectiveAt: new Date("2026-08-20T12:00:00Z"), actorType: "STATEMENT_RECIPIENT", actorId: null, reason: null, previousStateHash: null, evidenceHash: "e".repeat(64), businessEventId: "original", stateHash: "" }
  state.stateHash = hashBusinessPayload({ organizationId: "org", statementSnapshotId: "statement", actionType: "DISPUTE", payloadHash, version: state.version, status: state.status, effectiveAt: state.effectiveAt.toISOString(), actorType: state.actorType, previousStateHash: null, evidenceHash: state.evidenceHash })
  return { ...payload, id: "response", requestedAmount: new Prisma.Decimal(25), recipientNote: payload.note, noteHash: hashBusinessPayload(payload.note), payloadHash, createdAt: state.effectiveAt,
    statementSnapshot: { statementNumber: "STM-1", version: 1, contentHash: payload.statementContentHash, currency: "XAF" }, customerReceivableDocument: { documentNumber: "INV-1" }, states: [state] }
}
let row: ReturnType<typeof fixture>, tx: any, client: any
beforeEach(() => {
  jest.clearAllMocks(); row = fixture(); command.expectedStateHash = row.states[0].stateHash
  tx = { $queryRaw: jest.fn().mockResolvedValue([]), user: { findFirst: jest.fn().mockResolvedValue({ isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, roles: [{ permissions: ["customers.read", "customers.update", "accounting.exports.create"] }] }) }, session: { findFirst: jest.fn().mockResolvedValue({ id: "session" }) }, customer: { findFirst: jest.fn().mockResolvedValue({ id: "customer" }) },
    customerStatementRecipientAction: { findFirst: jest.fn().mockImplementation(() => row), findMany: jest.fn().mockImplementation(() => [row]) },
    customerStatementRecipientActionState: { findFirst: jest.fn().mockImplementation(() => row.states[0]), findMany: jest.fn().mockImplementation(() => row.states), create: jest.fn().mockImplementation(({ data }) => ({ ...data, id: "s2" })) },
    businessEvent: { findUnique: jest.fn().mockResolvedValue(null) }, auditLog: { create: jest.fn().mockResolvedValue({}) } }
  client = { $transaction: jest.fn((fn) => fn(tx)) }
  ;(evaluateModuleAccessInTx as jest.Mock).mockResolvedValue({ allowed: true })
  ;(recordBusinessEventInTx as jest.Mock).mockResolvedValue({ event: { id: "event" }, created: true })
})
it("reads the actual response with current tenant-scoped authority and no bearer token", async () => {
  const result = await listCustomerStatementResponses({ customerId: "customer" }, scope, client)
  expect(result.responses[0]).toMatchObject({ note: "Quantity disputed", amount: "25.00", current: { status: "OPEN" } })
  expect(JSON.stringify(result)).not.toContain("private-token-id")
  expect(tx.user.findFirst.mock.calls[0][0].where).toMatchObject({ id: "actor", organizationId: "org" })
  expect(tx.user.findFirst.mock.calls[0][0].select.roles.where).toEqual({ organizationId: "org" })
  expect(tx.customerStatementRecipientAction.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: "org", statementSnapshot: { organizationId: "org", customerId: "customer" } })
})
it.each(["customer", "cursor"])("rejects a foreign %s without returning a successful empty result", async kind => {
  if (kind === "customer") tx.customer.findFirst.mockResolvedValue(null)
  else tx.customerStatementRecipientAction.findFirst.mockResolvedValue(null)
  await expect(listCustomerStatementResponses({ customerId: "customer", ...(kind === "cursor" ? { cursor: "foreign" } : {}) }, scope, client)).rejects.toThrow()
  expect(tx.customerStatementRecipientAction.findMany).not.toHaveBeenCalled()
})
it.each(["note", "amount", "state"])("rejects incomplete %s evidence", async kind => {
  if (kind === "note") row.recipientNote = "changed"
  if (kind === "amount") row.requestedAmount = null as any
  if (kind === "state") row.states[0].stateHash = "b".repeat(64)
  await expect(listCustomerStatementResponses({ customerId: "customer" }, scope, client)).rejects.toThrow()
})
it("does not convert a database failure into a zero-row success", async () => {
  tx.customerStatementRecipientAction.findMany.mockRejectedValue(new Error("unavailable"))
  await expect(listCustomerStatementResponses({ customerId: "customer" }, scope, client)).rejects.toThrow("unavailable")
})
it("requires current customer update, usable account, fresh session and module write authority", async () => {
  for (const denied of ["role", "account", "session", "module"]) {
    tx.user.findFirst.mockResolvedValue({ isActive: denied !== "account", isVerified: true, emailVerified: true, isLocked: false, roles: [{ permissions: ["customers.read", "accounting.exports.create", ...(denied === "role" ? [] : ["customers.update"])] }] })
    tx.session.findFirst.mockResolvedValue(denied === "session" ? null : { id: "session" })
    ;(evaluateModuleAccessInTx as jest.Mock).mockResolvedValue({ allowed: denied !== "module" })
    await expect(reviewCustomerStatementResponse(command, scope, client)).rejects.toThrow()
  }
  expect(tx.customerStatementRecipientActionState.create).not.toHaveBeenCalled()
})
it("binds a decision to the shown revision and appends mandatory evidence", async () => {
  const receipt = await reviewCustomerStatementResponse(command, scope, client)
  expect(receipt).toMatchObject({ requestId: command.requestId, actionId: row.id, status: "ACKNOWLEDGED", version: 2, replayed: false })
  expect(tx.customerStatementRecipientActionState.create).toHaveBeenCalledWith({ data: expect.objectContaining({ previousStateHash: row.states[0].stateHash, actorId: "actor", reason: command.reason, businessEventId: "event" }) })
  expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: "org", userId: "actor", changes: expect.objectContaining({ requestId: command.requestId, reasonHash: hashBusinessPayload(command.reason) }) }) })
  expect(evaluateModuleAccessInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ accessIntent: "write", mode: "enforce" }))
  expect(tx.session.findFirst.mock.calls[0][0].where).toMatchObject({ id: "session", userId: "actor", assuranceOrganizationId: "org", assuranceLevel: { gte: 1 } })
})
it("rejects stale decisions before writing an event", async () => {
  await expect(reviewCustomerStatementResponse({ ...command, expectedStateHash: "b".repeat(64) }, scope, client)).rejects.toThrow(/changed/)
  expect(recordBusinessEventInTx).not.toHaveBeenCalled()
})
it("returns the same receipt for an exact retry, but rejects reuse for a different reason", async () => {
  await reviewCustomerStatementResponse(command, scope, client)
  const state = { ...tx.customerStatementRecipientActionState.create.mock.calls[0][0].data, id: "s2" }
  const payloadHash = hashBusinessPayload({ organizationId: "org", actorId: "actor", ...command })
  tx.businessEvent.findUnique.mockResolvedValue({ id: "event", payloadHash, eventType: "customer.statement.response.reviewed", status: "APPLIED" })
  tx.customerStatementRecipientActionState.findFirst.mockResolvedValue(state)
  expect(await reviewCustomerStatementResponse(command, scope, client)).toMatchObject({ stateId: "s2", replayed: true })
  await expect(reviewCustomerStatementResponse({ ...command, reason: "A different decision basis" }, scope, client)).rejects.toThrow()
  expect(tx.customerStatementRecipientActionState.create).toHaveBeenCalledTimes(1)
})
it("requires reopening a closed review before another terminal outcome", async () => {
  await reviewCustomerStatementResponse({ ...command, outcome: "RESOLVED" }, scope, client)
  const state = { ...tx.customerStatementRecipientActionState.create.mock.calls[0][0].data, id: "s2" }
  row.states.unshift(state)
  await expect(reviewCustomerStatementResponse({ ...command, outcome: "REJECTED", expectedStateHash: state.stateHash }, scope, client)).rejects.toThrow(/Reopen/)
  expect(await reviewCustomerStatementResponse({ ...command, expectedStateHash: state.stateHash }, scope, client)).toMatchObject({ version: 3, status: "ACKNOWLEDGED" })
})
it("returns review history and rejects missing initial evidence", async () => {
  expect((await getCustomerStatementResponseHistory({ customerId: "customer", actionId: row.id }, scope, client)).states).toHaveLength(1)
  tx.customerStatementRecipientActionState.findMany.mockResolvedValue([])
  await expect(getCustomerStatementResponseHistory({ customerId: "customer", actionId: row.id }, scope, client)).rejects.toThrow(/incomplete/)
})
it("rejects injected tenant/actor fields and invalid decisions before a transaction", async () => {
  for (const input of [{ ...command, organizationId: "other" }, { ...command, actorId: "other" }, { ...command, reason: " " }, { ...command, outcome: "PAID" }]) await expect(reviewCustomerStatementResponse(input, scope, client)).rejects.toThrow()
  expect(client.$transaction).not.toHaveBeenCalled()
})
