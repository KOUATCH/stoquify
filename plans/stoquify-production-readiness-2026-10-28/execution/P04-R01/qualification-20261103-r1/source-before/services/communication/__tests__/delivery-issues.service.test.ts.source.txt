jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), $executeRaw: jest.fn(), $queryRaw: jest.fn(),
  customerStatementDelivery: { findMany: jest.fn(), findFirst: jest.fn() }, businessEventOutbox: { findMany: jest.fn() },
  businessEvent: { findMany: jest.fn() }, role: { findMany: jest.fn() } } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/users/user-invitation-authority.service", () => ({ readCurrentInvitationIssuer: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({ hashBusinessPayload: (value: unknown) => JSON.stringify(value) }))

import { db } from "@/prisma/db"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { readCurrentInvitationIssuer } from "@/services/users/user-invitation-authority.service"
import { invitationDigest } from "@/services/users/user-invitation-delivery-contract"
import { deliveryIssuesInput, deliveryStatus, type DeliveryIssue } from "../delivery-issues-contracts"
import { readDeliveryIssues, deliveryWindow } from "../delivery-issues.service"

const at = new Date("2026-10-04T10:00:00Z")
const ctx = { orgId: "org-a", userId: "reader", permissions: ["accounting.exports.create", "customers.read", "users.read", "users.invite", "users.roles.assign"] }
const statement = { id: "delivery-a", channel: "EMAIL", redactedDestination: "a•••@•••", createdAt: at, outboxId: "queue",
  statementSnapshot: { customerId: "customer-a", statementNumber: "ST-01" }, states: [{ status: "DEFERRED", errorCode: "PROVIDER_NOT_CONFIGURED", occurredAt: at }] }
const candidate: DeliveryIssue = { id: "a", reference: "a", recipient: "•••", channel: "EMAIL", recordedAt: at.toISOString(), checkedAt: at.toISOString(), state: "failed", attempts: 1, reason: "review", sourceHref: null }
const payload = { version: 1, organizationId: ctx.orgId, inviteId: "invite", actorId: "issuer", roleId: "role", requestFingerprint: "a".repeat(64), tokenHash: "b".repeat(64), recipientHash: invitationDigest("private@example.invalid"), actorPermissions: ctx.permissions,
  rolePermissions: [], locale: "en", companyName: "Test", roleName: "Member", baseUrl: "https://example.invalid", from: "test@example.invalid", expiresAt: "2026-11-01T00:00:00.000Z" }
const event = () => ({ id: "event", eventSource: "API", schemaVersion: 1, actorId: "issuer", status: "APPLIED", payload,
  payloadHash: JSON.stringify(payload), idempotencyKey: "command", outboxMessages: [{ status: "SENT", attempts: 1, updatedAt: at, lastErrorCode: null, payload, payloadHash: JSON.stringify(payload), idempotencyKey: "command" }] })
beforeEach(() => {
  jest.clearAllMocks()
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(db))
  ;(db.$executeRaw as jest.Mock).mockResolvedValue(0)
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(readCurrentInvitationIssuer as jest.Mock).mockResolvedValue({ permissions: ctx.permissions })
  ;(db.customerStatementDelivery.findMany as jest.Mock).mockResolvedValue([statement])
  ;(db.customerStatementDelivery.findFirst as jest.Mock).mockResolvedValue(null)
  ;(db.businessEventOutbox.findMany as jest.Mock).mockResolvedValue([{ id: "queue", attempts: 2 }])
  ;(db.role.findMany as jest.Mock).mockResolvedValue([{ id: "role", organizationId: ctx.orgId, permissions: [] }])
  ;(db.$queryRaw as jest.Mock).mockResolvedValue([{ id: "event", recordedAt: at, inviteId: "invite", email: "private@example.invalid" }])
  ;(db.businessEvent.findMany as jest.Mock).mockResolvedValue([event()])
})

it("rejects invalid dates, unknown fields and reversed date ranges", () => {
  for (const input of [{ from: "2026-02-30" }, { from: "2026-10-04", through: "2026-10-01" }, { organizationId: "other" }]) expect(deliveryIssuesInput.safeParse(input).success).toBe(false)
})
it("requires active tenant identity and full per-source authority", async () => {
  await expect(readDeliveryIssues({ ...ctx, orgId: "" }, {})).rejects.toThrow()
  const result = await readDeliveryIssues({ ...ctx, permissions: ["customers.read", "users.read"] }, {})
  expect(result.pages.every(page => page.availability === "restricted")).toBe(true)
  expect(db.$transaction).not.toHaveBeenCalled()
})
it("enforces accounting entitlement before reading statements", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  const result = await readDeliveryIssues(ctx, { source: "statements" })
  expect(result.pages[0].availability).toBe("restricted")
  expect(db.customerStatementDelivery.findMany).not.toHaveBeenCalled()
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ mode: "enforce", accessIntent: "read", moduleSlug: "accounting" }))
})
it("uses the latest tenant-scoped state and excludes financial data, tokens and raw errors", async () => {
  const result = await readDeliveryIssues(ctx, { source: "statements", from: "2026-10-01", through: "2026-10-04", channel: "EMAIL" })
  expect(result.pages[0].rows[0]).toMatchObject({ state: "deferred", reason: "disabled", recipient: "a•••@•••", sourceHref: "/dashboard/customers/customer-a/statement", attempts: 2 })
  const call = (db.customerStatementDelivery.findMany as jest.Mock).mock.calls[0][0]
  expect(call).toMatchObject({ take: 101, where: { organizationId: "org-a", channel: "EMAIL", statementSnapshot: { organizationId: "org-a", customer: { organizationId: "org-a" } } }, select: { states: { where: { organizationId: "org-a" }, orderBy: { version: "desc" }, take: 1 } } })
  expect(call.where.createdAt.lt).toEqual(new Date("2026-10-05T00:00:00Z"))
  expect(call.select.token).toBeUndefined()
  expect(call.select.statementSnapshot.select).toEqual({ customerId: true, statementNumber: true })
  expect(JSON.stringify(result)).not.toMatch(/PROVIDER_NOT_CONFIGURED|payload|token|closingBalance/)
})
it("links to the statement workflow under its existing read/export permissions", async () => {
  const result = await readDeliveryIssues(ctx, { source: "statements" })
  expect(result.pages[0].rows[0].sourceHref).toBe("/dashboard/customers/customer-a/statement")
})
it("isolates a statement failure without hiding invitation data", async () => {
  ;(db.customerStatementDelivery.findMany as jest.Mock).mockRejectedValue(new Error("private details"))
  const result = await readDeliveryIssues(ctx, { state: "all" })
  expect(result.pages[0].availability).toBe("unavailable")
  expect(result.pages[1].rows[0]).toMatchObject({ state: "accepted", recipient: "p•••@•••" })
  expect(JSON.stringify(result)).not.toMatch(/private details|private@example|tokenHash|actorPermissions|payloadHash/)
})
it("rechecks stored invitation authority before listing roles or events", async () => {
  ;(readCurrentInvitationIssuer as jest.Mock).mockResolvedValue({ permissions: ["users.read"] })
  expect((await readDeliveryIssues(ctx, { source: "invitations" })).pages[0].availability).toBe("restricted")
  expect(db.role.findMany).not.toHaveBeenCalled()
  expect(db.$queryRaw).not.toHaveBeenCalled()
})
it("bounds a stalled source without dropping the other source", async () => {
  jest.useFakeTimers()
  try {
    ;(observeModuleAccess as jest.Mock).mockImplementation(({ moduleSlug }) => moduleSlug === "accounting" ? new Promise(() => {}) : Promise.resolve({ allowed: true }))
    const request = readDeliveryIssues(ctx, { state: "all" })
    await jest.advanceTimersByTimeAsync(6001)
    const result = await request
    expect(result.pages[0].availability).toBe("unavailable")
    expect(result.pages[1].rows[0].state).toBe("accepted")
  } finally { jest.useRealTimers() }
})
it("does not associate a changed invitation recipient with an older attempt", async () => {
  ;(db.$queryRaw as jest.Mock).mockResolvedValue([{ id: "event", recordedAt: at, inviteId: "invite", email: "different@example.invalid" }])
  const result = await readDeliveryIssues(ctx, { source: "invitations", state: "all" })
  expect(result.pages[0].rows[0]).toMatchObject({ state: "accepted", recipient: "•••" })
})
it("excludes ungrantable and cross-tenant roles before pagination and cursor resolution", async () => {
  ;(db.role.findMany as jest.Mock).mockResolvedValue([
    { id: "role", organizationId: ctx.orgId, permissions: [] },
    { id: "forbidden", organizationId: ctx.orgId, permissions: ["payroll.payments.reconcile"] },
    { id: "foreign", organizationId: "other", permissions: [] },
  ])
  await readDeliveryIssues(ctx, { source: "invitations", invitationCursor: "anchor" })
  const queries = (db.$queryRaw as jest.Mock).mock.calls.map(call => call[0])
  expect(queries).toHaveLength(2)
  expect(queries[1].sql).toContain('SELECT prior."recordedAt", prior.id FROM business_events prior')
  expect(queries[1].values.some((value: unknown) => value instanceof Date)).toBe(false)
  for (const query of queries) {
    expect(query.values).toContain("role")
    expect(query.values).not.toContain("forbidden")
    expect(query.values).not.toContain("foreign")
    expect(query.sql).toContain('i."organizationId" =')
    expect(query.sql).toContain('e."organizationId" =')
  }
})
it("rejects cursors outside authorized scope without revealing a record", async () => {
  ;(db.$queryRaw as jest.Mock).mockResolvedValue([])
  const result = await readDeliveryIssues(ctx, { invitationCursor: "foreign", statementCursor: "foreign" })
  expect(result.pages.every(page => page.availability === "unavailable")).toBe(true)
  expect(db.businessEvent.findMany).not.toHaveBeenCalled()
  expect(db.customerStatementDelivery.findMany).not.toHaveBeenCalled()
})
it.each(["hash", "duplicate", "tenant", "actor", "source"])("does not trust invitation delivery with invalid %s evidence", async bad => {
  const row = event()
  if (bad === "hash") row.payloadHash = "invalid"
  if (bad === "duplicate") row.outboxMessages.push(row.outboxMessages[0])
  if (bad === "tenant") row.payload = { ...payload, organizationId: "other" }
  if (bad === "actor") row.actorId = "other"
  if (bad === "source") row.eventSource = "INTERNAL"
  ;(db.businessEvent.findMany as jest.Mock).mockResolvedValue([row])
  const result = await readDeliveryIssues(ctx, { source: "invitations", state: "all" })
  expect(result.pages[0].rows[0]).toMatchObject({ state: "unknown", reason: "invalidEvidence", attempts: null })
})
it("does not page a silently incomplete role authority universe", async () => {
  ;(db.role.findMany as jest.Mock).mockResolvedValue(Array.from({ length: 1001 }, () => ({ id: "role", organizationId: ctx.orgId, permissions: [] })))
  expect((await readDeliveryIssues(ctx, { source: "invitations" })).pages[0].availability).toBe("unavailable")
  expect(db.$queryRaw).not.toHaveBeenCalled()
})
it("pages after the last consumed record without skipping filtered matches", () => {
  const candidates = Array.from({ length: 101 }, (_, index) => ({ ...candidate, id: String(index), state: index % 2 ? "accepted" as const : "failed" as const }))
  const result = deliveryWindow("statements", candidates, deliveryIssuesInput.parse({ state: "failed" }))
  expect(result.rows).toHaveLength(20)
  expect(result.nextCursor).toBe("38")
  expect(result.windowLimited).toBe(false)
  const sparse = deliveryWindow("statements", candidates.map(row => ({ ...row, state: "accepted" })), deliveryIssuesInput.parse({ state: "failed" }))
  expect(sparse).toMatchObject({ rows: [], nextCursor: "99", windowLimited: true })
})
it("keeps provider acceptance separate from unknown outcomes and missing evidence", () => {
  expect(deliveryStatus("SENT", null)).toBe("accepted")
  expect(deliveryStatus("FAILED", "INVITATION_PROVIDER_OUTCOME_UNKNOWN")).toBe("unknown")
  expect(deliveryStatus("DEFERRED", "PROVIDER_OUTCOME_UNKNOWN")).toBe("unknown")
  expect(deliveryStatus(undefined, null)).toBe("unknown")
})
