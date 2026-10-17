jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), $executeRaw: jest.fn(), $queryRaw: jest.fn(), user: { findFirst: jest.fn() } } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
import { db } from "@/prisma/db"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { readAuditExplorer } from "../audit-explorer.service"
import { auditExplorerInput, projectAuditDetails } from "../audit-explorer-contracts"

const permissions = ["controls.audit.read", "users.read", "inventory.items.read", "inventory.levels.read", "dashboard.read"]
const ctx = { orgId: "org-a", userId: "reader", permissions }
const date = new Date("2026-10-04T10:00:00.000Z")
const actor = (grants = permissions, code = "manager") => ({ isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, roles: [{ code, permissions: grants }] })
const anchor = { id: "snapshot", createdAt: date }
const row = { id: "event", createdAt: date, entityType: "User", entityId: "member", action: "MEMBER_ACCESS_CHANGED", actorId: "actor", safeDetails: { operation: "roles", addedRoles: 1, removedRoles: 0, beforeActive: true, afterActive: true, ipAddress: "secret", reason: "private", token: "secret" } }
beforeEach(() => {
  jest.resetAllMocks()
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(db))
  ;(db.$executeRaw as jest.Mock).mockResolvedValue(0)
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(actor())
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(db.$queryRaw as jest.Mock).mockResolvedValueOnce([anchor]).mockResolvedValueOnce([row])
})
it("validates dates, cursor pairing and the closed filter vocabulary", () => {
  for (const request of [{ from: "2026-02-30" }, { from: "2026-10-10", through: "2026-10-01" }, { beforeId: "unbound" }, { organizationId: "other" }, { action: "PAYROLL_PAID" }]) expect(auditExplorerInput.safeParse(request).success).toBe(false)
})
it("does not read audit records without the global audit permission", async () => {
  await expect(readAuditExplorer({ ...ctx, permissions: ["users.read"] }, {})).rejects.toThrow()
  expect(db.$transaction).not.toHaveBeenCalled()
})
it.each(["revoked", "locked", "inactive"])("rechecks current stored authority: %s", async reason => {
  const current = actor(reason === "revoked" ? ["users.read"] : permissions)
  if (reason === "locked") current.isLocked = true
  if (reason === "inactive") current.isActive = false
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(current)
  await expect(readAuditExplorer(ctx, {})).rejects.toThrow()
  expect(db.$queryRaw).not.toHaveBeenCalled()
})
it("requires source permissions in both session and current stored grants", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(actor(["controls.audit.read"]))
  const result = await readAuditExplorer(ctx, {})
  expect(result).toMatchObject({ entries: [], accessAvailable: false, itemDecisionsAvailable: false, stockChangesAvailable: false })
  expect(db.$queryRaw).not.toHaveBeenCalled()
})
it("filters tenant, entity and managed location scope before every event and cursor read", async () => {
  ;(db.$queryRaw as jest.Mock).mockReset().mockResolvedValueOnce([anchor]).mockResolvedValueOnce([{ id: "cursor", createdAt: date }]).mockResolvedValueOnce([row])
  await readAuditExplorer(ctx, { throughId: "snapshot", beforeId: "cursor", actorId: "actor", entityId: "member", from: "2026-10-01", through: "2026-10-04" })
  expect(db.$queryRaw).toHaveBeenCalledTimes(3)
  for (const [query] of (db.$queryRaw as jest.Mock).mock.calls) {
    expect(query.sql).toContain('a."organizationId" =')
    expect(query.sql).toContain('u."organizationId" =')
    expect(query.sql).toContain('i."organizationId" =')
    expect(query.sql).toContain('l."organizationId" =')
    expect(query.sql).toContain('l."managerId" =')
    expect(query.values).toContain("org-a")
    expect(query.values).toContain("reader")
    expect(query.values).toContain("member")
    expect(query.values).toContain("2026-10-05T00:00:00.000Z")
  }
})
it("uses current stored administrator authority for tenant-wide stock scope", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(actor(permissions, "admin"))
  await readAuditExplorer(ctx, {})
  expect((db.$queryRaw as jest.Mock).mock.calls[0][0].sql).not.toContain('l."managerId" =')
  expect((db.$queryRaw as jest.Mock).mock.calls[0][0].sql).toContain('l."organizationId" =')
})
it("does not include inventory families when inventory entitlement is denied", async () => {
  ;(observeModuleAccess as jest.Mock).mockImplementation(({ moduleSlug }) => Promise.resolve({ allowed: moduleSlug !== "inventory" }))
  const result = await readAuditExplorer(ctx, {})
  expect(result.itemDecisionsAvailable).toBe(false)
  expect((db.$queryRaw as jest.Mock).mock.calls[0][0].sql).not.toContain("stock_adjustments")
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ moduleSlug: "inventory", mode: "enforce" }))
})
it("withholds actor identity and rejects actor filters without member read authority", async () => {
  const restricted = { ...ctx, permissions: permissions.filter(value => value !== "users.read") }
  await expect(readAuditExplorer(restricted, { actorId: "someone" })).rejects.toThrow()
  expect(db.$queryRaw).not.toHaveBeenCalled()
  await readAuditExplorer(restricted, { family: "items" })
  expect((db.$queryRaw as jest.Mock).mock.calls[1][0].sql).toContain('NULL::text AS "actorId"')
})
it("projects only reviewed details with authorized source links", async () => {
  const result = await readAuditExplorer(ctx, {})
  expect(result.entries[0]).toMatchObject({ details: { operation: "roles", addedRoles: 1, removedRoles: 0, beforeActive: true, afterActive: true }, detailState: "limited", sourceHref: "/dashboard/settings/users/update/member" })
  expect(JSON.stringify(result)).not.toMatch(/secret|private|ipAddress|safeDetails|reason|token/)
  const query = (db.$queryRaw as jest.Mock).mock.calls[1][0].sql
  expect(query).not.toMatch(/a\.\*|a\.changes AS|ipAddress|userAgent|unitCost/)
})
it("uses one upper-bound event on later pages and bounds the lookahead", async () => {
  const older = { id: "cursor", createdAt: new Date("2026-10-03T10:00:00Z") }
  ;(db.$queryRaw as jest.Mock).mockReset().mockResolvedValueOnce([anchor]).mockResolvedValueOnce([older]).mockResolvedValueOnce(Array.from({ length: 26 }, (_, index) => ({ ...row, id: String(index) })))
  const result = await readAuditExplorer(ctx, { throughId: anchor.id, beforeId: older.id })
  expect(result).toMatchObject({ throughId: anchor.id, recordedThrough: date.toISOString(), nextCursor: "24" })
  expect(result.entries).toHaveLength(25)
  const query = (db.$queryRaw as jest.Mock).mock.calls[2][0]
  expect(query.sql).toContain('(a."createdAt", a.id) <=')
  expect(query.sql).toContain('(a."createdAt", a.id) <')
  expect(query.sql).toContain("LIMIT 26")
  expect(query.sql).toContain('SELECT bound."createdAt", bound.id FROM audit_logs bound')
  expect(query.sql).toContain('SELECT prior."createdAt", prior.id FROM audit_logs prior')
  expect(query.values).toContain(anchor.id)
  expect(query.values).toContain(older.id)
  expect(query.values.some((value: unknown) => value instanceof Date)).toBe(false)
})
it("does not silently restart a foreign, deleted or revoked snapshot", async () => {
  ;(db.$queryRaw as jest.Mock).mockReset().mockResolvedValueOnce([])
  await expect(readAuditExplorer(ctx, { throughId: "foreign" })).rejects.toThrow("Audit snapshot unavailable")
  expect(db.$queryRaw).toHaveBeenCalledTimes(1)
})
it("does not page past an unavailable cursor", async () => {
  ;(db.$queryRaw as jest.Mock).mockReset().mockResolvedValueOnce([anchor]).mockResolvedValueOnce([])
  await expect(readAuditExplorer(ctx, { throughId: "snapshot", beforeId: "foreign" })).rejects.toThrow("Audit cursor unavailable")
  expect(db.$queryRaw).toHaveBeenCalledTimes(2)
})
it("strictly separates event-family fields and rejects malformed values", () => {
  expect(projectAuditDetails("MEMBER_ACCESS_CHANGED", { operation: "secret", addedRoles: -1, removedRoles: "4", beforeActive: "true", permission: "secret", token: "secret" })).toEqual({})
  expect(projectAuditDetails("PERMISSION_GRANTED", { permission: "payroll.payments.read", operation: "roles" })).toEqual({})
  expect(projectAuditDetails("POST_STOCK_ADJUSTMENT", { ledger: "secret", beforeActive: true, requiresApproval: false })).toEqual({})
  expect(projectAuditDetails("POST_STOCK_ADJUSTMENT", { adjustmentType: "WRITE_OFF", unitCost: "secret" })).toEqual({ adjustmentType: "WRITE_OFF" })
  expect(projectAuditDetails("POST_STOCK_ADJUSTMENT", { adjustmentType: "arbitrary private text" })).toEqual({})
  expect(projectAuditDetails("REQUEST_MANUAL_ITEM_STOCK_ADJUSTMENT", { mode: "delta", requiresApproval: true, quantityDelta: "500", unitCost: "secret" })).toEqual({ operation: "delta", requiresApproval: true })
})
