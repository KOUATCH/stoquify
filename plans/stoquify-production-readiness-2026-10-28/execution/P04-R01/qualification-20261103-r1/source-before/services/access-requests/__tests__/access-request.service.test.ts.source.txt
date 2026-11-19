jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/users/member-access.service", () => ({ changeMemberAccessInTx: jest.fn() }))
jest.mock("@/services/users/member-access-read.service", () => ({ getMemberAccess: jest.fn() }))
import { db } from "@/prisma/db"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { changeMemberAccessInTx } from "@/services/users/member-access.service"
import { memberAccessRevision, accessDigest } from "@/services/users/member-access-policy"
import { ConflictError } from "@/services/_shared/action-errors"
import { submitAccessRequest, listAccessRequests, withdrawAccessRequest, decideAccessRequest, applyAccessRequest, accessRequestReturnPath, canReviewAccessRequests, readAccessRequestHistory, previewAccessRequest } from "../access-request.service"

const now = new Date("2026-10-04T10:00:00.000Z")
const permissions = ["users.read", "users.roles.assign", "inventory.items.read", "dashboard.read"]
const admin = { orgId: "org", userId: "reviewer", permissions }
const requester = { orgId: "org", userId: "requester", permissions: ["dashboard.read"] }
const submit = { commandId: "bb7a2cdd-ac91-4c82-bf31-9d47e7bdf608", target: "items", reason: "Count the items" }
const account = { id: "requester", email: "requester@example.invalid", firstName: null, lastName: null, updatedAt: now, isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null }
let tx: any, row: any, roles: any[], stored: string[], member: any, sqlCalls: { text: string; values: unknown[] }[], existing: boolean, appliedPermissions: string[], rollback: boolean
const input = () => ({ id: row.id, revision: row.revision })
const revision = () => memberAccessRevision(member, member.roles.map((r: any) => r.id), roles)
const decision = (extra = {}) => ({ ...input(), decision: "APPROVED", reason: "Inventory duties", roleIds: ["stock"], memberRevision: revision(), ...extra })
const session = { id: "session", token: "unit-fixture" }

beforeEach(() => {
  jest.clearAllMocks(); process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED = "true"; process.env.ACCESS_REQUEST_APPLICATION_ENABLED = "true"
  stored = [...permissions]; sqlCalls = []; existing = true; rollback = false; appliedPermissions = ["inventory.items.read"]
  roles = [{ id: "base", organizationId: "org", permissions: ["dashboard.read"], updatedAt: now }, { id: "stock", organizationId: "org", permissions: ["inventory.items.read"], updatedAt: now }]
  member = { ...account, roles: [roles[0]] }
  row = { id: "request", organizationId: "org", requesterId: "requester", reviewerId: null, targetKey: "items", reason: submit.reason, submissionHash: accessDigest(submit), decision: "PENDING", application: "NOT_REQUIRED", revision: 1,
    createdAt: now, expiresAt: new Date(now.getTime() + 604800000), decidedAt: null, appliedAt: null, decisionReason: null, selectedRoleIds: [], memberRevision: null, applicationCommandId: null, applicationError: null, grantAuditId: null, due: false }
  tx = {
    $executeRaw: jest.fn(async () => 0),
    $queryRaw: jest.fn(async (query: any, ...templateValues: any[]) => {
      const text = Array.isArray(query) ? query.join("?") : query.sql, values = Array.isArray(query) ? templateValues : query.values
      sqlCalls.push({ text, values })
      if (text.includes("FROM organizations")) return []
      if (text.startsWith("UPDATE access_requests")) {
        if (text.includes("decision = 'EXPIRED'")) row = { ...row, decision: "EXPIRED" }
        else if (text.includes("decision = 'WITHDRAWN'")) row = { ...row, decision: "WITHDRAWN", application: "NOT_REQUIRED" }
        else if (text.includes("application = 'APPLIED'")) row = { ...row, application: "APPLIED", appliedAt: now, grantAuditId: "grant-audit", applicationError: null }
        else if (text.includes("application = 'FAILED'")) row = { ...row, application: "FAILED", applicationError: values[0] }
        else row = { ...row, decision: values[0], application: values[1], reviewerId: values[2], decidedAt: now, decisionReason: values[3], selectedRoleIds: values[4], memberRevision: values[5], applicationCommandId: values[6] }
        row = { ...row, revision: row.revision + 1 }; return [row]
      }
      if (text.startsWith("INSERT INTO access_requests")) { row = { ...row, id: values[0], organizationId: values[1], requesterId: values[2], targetKey: values[3], reason: values[4], submissionHash: values[5], decision: "PENDING", application: "NOT_REQUIRED", revision: 1, due: false }; existing = true; return [row] }
      if (text.includes('r.id = ?') && values[0] !== row.id && !text.includes('SELECT r.id')) return []
      return existing ? [row] : []
    }),
    user: { findFirst: jest.fn(async ({ where, select }: any) => {
      if (where.id === "reviewer" || select.roles?.where) return { ...account, roles: [{ permissions: where.id === "requester" ? (changeMemberAccessInTx as jest.Mock).mock.calls.length ? appliedPermissions : ["dashboard.read"] : stored }] }
      return member
    }) },
    role: { findMany: jest.fn(async () => roles) },
    auditLog: { create: jest.fn(async ({ data }: any) => data) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(async work => { const snapshot = { ...row }; try { return await work(tx) } catch (error) { row = snapshot; rollback = true; throw error } })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(changeMemberAccessInTx as jest.Mock).mockResolvedValue({ auditId: "grant-audit" })
})
afterEach(() => { delete process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED; delete process.env.ACCESS_REQUEST_APPLICATION_ENABLED })

it("defaults submissions and application to disabled without making DB calls", async () => {
  delete process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED; delete process.env.ACCESS_REQUEST_APPLICATION_ENABLED
  await expect(submitAccessRequest(requester, submit)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  await expect(applyAccessRequest(admin, input(), session)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(db.$transaction).not.toHaveBeenCalled()
})
it.each([{ tenant: "other" }, { permissions: ["*"] }, { reviewerId: "requester" }, { returnUrl: "https://example.invalid" }])("rejects caller authority and callback fields %o", async extra => {
  await expect(submitAccessRequest(requester, { ...submit, ...extra })).rejects.toThrow(); expect(db.$transaction).not.toHaveBeenCalled()
})
it("does not turn a module denial into a permission request", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  await expect(submitAccessRequest(requester, submit)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" }); expect(db.$transaction).not.toHaveBeenCalled()
})
it("creates a tenant-bound request and an audit entry without granting roles", async () => {
  existing = false
  const result = await submitAccessRequest(requester, submit)
  expect(result).toMatchObject({ decision: "PENDING", application: "NOT_REQUIRED", canWithdraw: true })
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org", action: "ACCESS_REQUEST_SUBMITTED" }) }))
  expect(changeMemberAccessInTx).not.toHaveBeenCalled()
  expect(result).not.toHaveProperty("submissionHash")
})
it("replays a submission without changing its payload", async () => {
  row.id = accessDigest([requester.orgId, requester.userId, submit.commandId])
  expect((await submitAccessRequest(requester, submit)).id).toBe(row.id)
  expect(tx.auditLog.create).not.toHaveBeenCalled()
  await expect(submitAccessRequest(requester, { ...submit, reason: "Different purpose" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
})
it("returns the existing open request for a second command", async () => {
  expect((await submitAccessRequest(requester, submit)).id).toBe("request")
  expect(sqlCalls.some(c => c.text.startsWith("INSERT"))).toBe(false)
})
it("expires a pending duplicate before creating a replacement", async () => {
  row.due = true
  const result = await submitAccessRequest(requester, submit)
  expect(result.id).not.toBe("request")
  expect(result.decision).toBe("PENDING")
  expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe("ACCESS_REQUEST_EXPIRED")
  expect(sqlCalls.some(c => c.text.includes("INTERVAL '7 days'"))).toBe(true)
})
it("limits requester reads before paging and retains DB-native cursor ordering", async () => {
  await listAccessRequests(requester, { beforeId: row.id })
  const query = sqlCalls.find(c => c.text.includes("LIMIT 26"))!
  expect(query.text).toContain('r."requesterId" = ?'); expect(query.values).toContain("requester"); expect(query.values).toContain("org")
  expect(query.text).toContain('(SELECT p."createdAt", p.id'); expect(query.values.some(v => v instanceof Date)).toBe(false)
})
it("checks stored reviewer grants before querying the queue", async () => {
  stored = ["users.read", "*"]
  await expect(listAccessRequests(admin, { queue: "review" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(sqlCalls.every(c => !c.text.includes("access_requests"))).toBe(true)
})
it("never treats a wildcard alone as role-assignment authority", () => {
  expect(canReviewAccessRequests(["*"])).toBe(false)
  expect(canReviewAccessRequests(["users.read", "users.roles.assign", "*"])).toBe(false)
})
it("withdraws only the requester's unapplied request", async () => {
  await expect(withdrawAccessRequest(admin, input())).rejects.toMatchObject({ code: "FORBIDDEN" })
  const result = await withdrawAccessRequest(requester, input()); expect(result.decision).toBe("WITHDRAWN"); expect(result.canWithdraw).toBe(false)
})
it("does not withdraw applied access or overwrite a newer request", async () => {
  row.decision = "APPROVED"; row.application = "APPLIED"
  await expect(withdrawAccessRequest(requester, input())).rejects.toMatchObject({ code: "CONFLICT" })
  row.decision = "PENDING"; row.application = "NOT_REQUIRED"
  await expect(withdrawAccessRequest(requester, { ...input(), revision: 999 })).rejects.toMatchObject({ code: "CONFLICT" })
})
it("records expiry rather than a late withdrawal", async () => {
  row.due = true
  expect((await withdrawAccessRequest(requester, input())).decision).toBe("EXPIRED")
  expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe("ACCESS_REQUEST_EXPIRED")
})
it("rejects inaccessible IDs and anchors under the same tenant scope", async () => {
  existing = false
  await expect(listAccessRequests(requester, { beforeId: "foreign" })).rejects.toMatchObject({ code: "CONFLICT" })
  await expect(withdrawAccessRequest(requester, { id: "foreign", revision: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" })
  const reads = sqlCalls.filter(c => c.text.includes("FROM access_requests"))
  expect(reads.every(c => c.text.includes('r."organizationId" = ?') && c.values.includes("org"))).toBe(true)
})
it("approves without granting and retains existing roles", async () => {
  const result = await decideAccessRequest(admin, decision())
  expect(result).toMatchObject({ decision: "APPROVED", application: "PENDING", reviewerId: "reviewer" })
  expect(row.selectedRoleIds).toEqual(["base", "stock"]); expect(changeMemberAccessInTx).not.toHaveBeenCalled()
})
it.each(["self", "revoked", "stale", "expired", "foreign-role", "wildcard-role", "wrong-task", "stale-member"])("rejects unsafe approval: %s", async kind => {
  const command = decision()
  if (kind === "self") row.requesterId = "reviewer"
  if (kind === "revoked") stored = ["users.read"]
  if (kind === "stale") command.revision++
  if (kind === "expired") row.due = true
  if (kind === "foreign-role") command.roleIds = ["foreign"]
  if (kind === "wildcard-role") { roles[1].permissions = ["*"]; command.memberRevision = revision() }
  if (kind === "wrong-task") { roles[1].permissions = ["dashboard.read"]; command.memberRevision = revision() }
  if (kind === "stale-member") member.updatedAt = new Date(now.getTime() + 1)
  await expect(decideAccessRequest(admin, command)).rejects.toThrow()
  expect(sqlCalls.some(c => c.text.startsWith("UPDATE"))).toBe(false); expect(changeMemberAccessInTx).not.toHaveBeenCalled()
})
it("records a decline without grant parameters", async () => {
  const result = await decideAccessRequest(admin, decision({ decision: "DECLINED", roleIds: [] }))
  expect(result).toMatchObject({ decision: "DECLINED", application: "NOT_REQUIRED", canApply: false }); expect(row.selectedRoleIds).toEqual([])
})
async function approve() { await decideAccessRequest(admin, decision()); jest.clearAllMocks(); sqlCalls = [] }
it("applies through the original grant service in the same transaction as its receipt", async () => {
  await approve()
  const result = await applyAccessRequest(admin, input(), session)
  expect(changeMemberAccessInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ session, targetUserId: "requester", command: expect.objectContaining({ roleIds: ["base", "stock"], requestId: row.applicationCommandId }) }))
  expect(result).toMatchObject({ decision: "APPROVED", application: "APPLIED" })
  expect(tx.auditLog.create.mock.calls.at(-1)[0].data.action).toBe("ACCESS_REQUEST_APPLIED")
  await applyAccessRequest(admin, input(), session); expect(changeMemberAccessInTx).toHaveBeenCalledTimes(1)
})
it("records a safe application failure after the grant transaction rolls back", async () => {
  await approve(); (changeMemberAccessInTx as jest.Mock).mockRejectedValue(new ConflictError("private stale record detail"))
  await expect(applyAccessRequest(admin, input(), session)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(rollback).toBe(true); expect(row).toMatchObject({ application: "FAILED", applicationError: "REVIEW_REQUIRED", decision: "APPROVED" })
  expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("private stale")
})
it("rolls back if effective permission verification fails after a grant", async () => {
  await approve(); appliedPermissions = []
  await expect(applyAccessRequest(admin, input(), session)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(rollback).toBe(true); expect(row.application).toBe("FAILED"); expect(row.grantAuditId).toBeNull()
})
it("rejects another reviewer and rejects application after withdrawal", async () => {
  await approve(); row.reviewerId = "another"
  await expect(applyAccessRequest(admin, input(), session)).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(changeMemberAccessInTx).not.toHaveBeenCalled()
  row.reviewerId = "reviewer"; row.decision = "WITHDRAWN"; row.application = "NOT_REQUIRED"
  await expect(applyAccessRequest(admin, input(), session)).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(changeMemberAccessInTx).not.toHaveBeenCalled()
})
it("does not replace a committed application with FAILED after a lost response", async () => {
  await approve()
  const saved = (db.$transaction as jest.Mock).getMockImplementation()!
  ;(db.$transaction as jest.Mock).mockImplementationOnce(async work => { await work(tx); throw new Error("response lost after commit") }).mockImplementation(saved)
  await expect(applyAccessRequest(admin, input(), session)).rejects.toThrow("response lost after commit")
  expect(row.application).toBe("APPLIED")
  expect(sqlCalls.some(c => c.text.includes("application = 'FAILED'"))).toBe(false)
  await applyAccessRequest(admin, input(), session)
  expect(changeMemberAccessInTx).toHaveBeenCalledTimes(1)
})
it("verifies current requester permissions before returning the allowlisted path", async () => {
  await approve(); await applyAccessRequest(admin, input(), session)
  expect(await accessRequestReturnPath(requester, row.id)).toBe("/dashboard/inventory/items")
  appliedPermissions = []
  await expect(accessRequestReturnPath(requester, row.id)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("projects full assignable role permissions under both current ceilings", async () => {
  roles[1].nameEn = "Stock"; roles[1].nameFr = "Stock"
  const preview = await previewAccessRequest(admin, input())
  expect(preview).toMatchObject({ existingRoleCount: 1, memberRevision: revision(), roles: [{ id: "stock", permissions: ["inventory.items.read"] }] })
  expect(preview).not.toHaveProperty("email")
  stored = stored.filter(p => p !== "inventory.items.read")
  await expect(previewAccessRequest(admin, input())).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("excludes wildcard roles from the permission-impact preview", async () => {
  roles[1].permissions = ["*"]
  expect((await previewAccessRequest(admin, input())).roles).toEqual([])
})
it("reads safe history only after authorizing the request", async () => {
  const original = tx.$queryRaw.getMockImplementation()
  tx.$queryRaw.mockImplementation(async (query: any, ...rest: any[]) => {
    if (query.sql?.includes("FROM audit_logs")) return [{ id: "event", createdAt: now, userId: "reviewer", action: "ACCESS_REQUEST_DECIDED", safeState: { revision: 2, decision: "APPROVED", application: "PENDING", target: "items", secret: "private" } }]
    return original(query, ...rest)
  })
  const history = await readAccessRequestHistory(requester, input())
  expect(history.entries[0]).toMatchObject({ actorId: "reviewer", state: { revision: 2, application: "PENDING" } })
  expect(JSON.stringify(history)).not.toContain("private")
  const historyCall = tx.$queryRaw.mock.calls.find(([q]: any) => q.sql?.includes("FROM audit_logs"))[0]
  expect(historyCall.sql).toContain('a."organizationId" = ?'); expect(historyCall.values).toContain("org"); expect(historyCall.values).toContain("request")
})
it("rejects stale history views before loading audit events", async () => {
  await expect(readAccessRequestHistory(requester, { ...input(), revision: 9 })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(sqlCalls.some(c => c.text.includes("audit_logs"))).toBe(false)
})
