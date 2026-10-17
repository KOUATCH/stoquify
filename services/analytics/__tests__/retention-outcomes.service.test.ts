jest.mock("server-only", () => ({}), { virtual: true })
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/lib/security/rbac", () => ({
  requireAllPermissions: jest.fn(), assertCanUseOrganization: jest.fn(),
  RbacError: class extends Error {},
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/_shared/action-errors", () => ({ BusinessRuleError: class extends Error {}, NotFoundError: class extends Error {} }))

import { db } from "@/prisma/db"
import { requireAllPermissions, assertCanUseOrganization } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getRetentionOutcomeReadModel, RETENTION_SOURCE_LIMIT } from "../retention-outcomes.service"
import { commit, correction, outcomeWindow } from "./retention-fixtures"

const input = { start: outcomeWindow.start, endExclusive: outcomeWindow.endExclusive }
const ctx = { orgId: "synthetic-org-a", userId: "reader", permissions: ["reports.read", "sales.read"] }
function transaction() {
  return {
    organization: { findFirst: jest.fn().mockResolvedValue({ id: ctx.orgId }) },
    location: { findFirst: jest.fn().mockResolvedValue({ id: "site-1" }) },
    pOSCommitResult: { findMany: jest.fn().mockResolvedValue([commit()]) },
    businessEvent: { findMany: jest.fn().mockResolvedValue([correction()]) },
  }
}
let tx: ReturnType<typeof transaction>
beforeEach(() => {
  jest.resetAllMocks()
  jest.useFakeTimers().setSystemTime(outcomeWindow.asOf)
  tx = transaction()
  ;(requireAllPermissions as jest.Mock).mockResolvedValue(ctx)
  ;(assertCanUseOrganization as jest.Mock).mockImplementation(async (actor, org) => {
    if (actor.orgId !== org) throw new Error("Cross-organization access denied")
  })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
})
afterEach(() => jest.useRealTimers())

it("uses fresh authorization, bounded scalar queries and one consistent snapshot", async () => {
  const result = await getRetentionOutcomeReadModel({ ...input, locationId: "site-1" })
  expect(result).toMatchObject({ completedOperations: 1, correctionEvents: 1 })
  expect(requireAllPermissions).toHaveBeenCalledWith(["reports.read", "sales.read"], { resource: "RetentionOutcomes" })
  expect(assertCanUseOrganization).toHaveBeenCalledWith(ctx, ctx.orgId)
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: ctx.orgId, moduleSlug: "sales", mode: "enforce" }))
  expect(tx.location.findFirst).toHaveBeenCalledWith({ where: { id: "site-1", organizationId: ctx.orgId }, select: { id: true } })
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  const commits = tx.pOSCommitResult.findMany.mock.calls[0][0]
  const events = tx.businessEvent.findMany.mock.calls[0][0]
  expect(commits.where).toMatchObject({ organizationId: ctx.orgId, locationId: "site-1", OR: [
    { committedAt: { gte: input.start, lt: input.endExclusive } }, { committedAt: null, createdAt: { gte: input.start, lt: input.endExclusive } },
  ] })
  expect(events.where).toMatchObject({ organizationId: ctx.orgId, locationId: "site-1", eventSource: "POS", occurredAt: { gte: input.start, lt: input.endExclusive } })
  expect(commits.take).toBe(RETENTION_SOURCE_LIMIT + 1); expect(events.take).toBe(RETENTION_SOURCE_LIMIT + 1)
  expect(Object.keys(commits.select).sort()).toEqual(["committedAt", "createdAt", "id", "locationId", "organizationId", "salesOrderId", "status"])
  expect(Object.keys(events.select).sort()).toEqual(["eventSource", "eventType", "id", "locationId", "occurredAt", "organizationId", "recordedAt", "schemaVersion", "sourceId", "sourceType", "status"])
})
it("rejects a caller's foreign tenant before any domain read", async () => {
  await expect(getRetentionOutcomeReadModel({ ...input, organizationId: "foreign" })).rejects.toThrow("Cross-organization")
  expect(db.$transaction).not.toHaveBeenCalled(); expect(observeModuleAccess).not.toHaveBeenCalled()
})
it("does not accept caller-supplied identity/provenance or as-of overrides", async () => {
  const result = await getRetentionOutcomeReadModel({ ...input, asOf: new Date("2099-01-01"), traffic: "HUMAN", role: "admin", userId: "forged" } as typeof input)
  expect(result.asOf).toBe(outcomeWindow.asOf.toISOString()); expect(result.humanAdoption.state).toBe("UNKNOWN")
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ userId: "reader" }))
})
it.each(["signed out", "revoked", "missing reports.read", "missing sales.read"])("stops a %s authorization rejection", async message => {
  ;(requireAllPermissions as jest.Mock).mockRejectedValue(new Error(message))
  await expect(getRetentionOutcomeReadModel(input)).rejects.toThrow(message)
  expect(db.$transaction).not.toHaveBeenCalled()
})
it("enforces module denial", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  await expect(getRetentionOutcomeReadModel(input)).rejects.toThrow("module is not available")
  expect(db.$transaction).not.toHaveBeenCalled()
})
it.each(["organization", "location"] as const)("rejects an unavailable %s before reading outcomes", async field => {
  tx[field].findFirst.mockResolvedValue(null)
  await expect(getRetentionOutcomeReadModel({ ...input, locationId: "site-1" })).rejects.toThrow("not found")
  expect(tx.pOSCommitResult.findMany).not.toHaveBeenCalled()
})
it.each(["pOSCommitResult", "businessEvent"] as const)("fails a truncated %s read instead of returning misleading counts", async table => {
  tx[table].findMany.mockResolvedValue(Array(RETENTION_SOURCE_LIMIT + 1).fill(table === "pOSCommitResult" ? commit() : correction()))
  await expect(getRetentionOutcomeReadModel(input)).rejects.toThrow("source limit")
})
it("propagates read failure rather than producing a zero cohort", async () => {
  tx.pOSCommitResult.findMany.mockRejectedValue(new Error("synthetic database unavailable"))
  await expect(getRetentionOutcomeReadModel(input)).rejects.toThrow("database unavailable")
})
it("detects a foreign source row even if a query adapter returns one", async () => {
  tx.pOSCommitResult.findMany.mockResolvedValue([commit({ organizationId: "foreign" })])
  await expect(getRetentionOutcomeReadModel(input)).rejects.toThrow("authorized scope")
})
it("rejects invalid dates before domain reads", async () => {
  await expect(getRetentionOutcomeReadModel({ ...input, start: new Date("invalid") })).rejects.toThrow("31 days")
  expect(db.$transaction).not.toHaveBeenCalled()
})
