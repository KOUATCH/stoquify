import { randomUUID } from "node:crypto"
import { PrismaClient } from "@prisma/client"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  if (process.env.RUN_UI_WORKFLOW_POSTGRES !== "1") return { db: {} }
  const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
  const { PrismaClient: Client } = jest.requireActual("@prisma/client")
  return { db: new Client({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } }) }
})
import { db } from "@/prisma/db"
import { readAuditExplorer } from "@/services/audit/audit-explorer.service"

const suite = process.env.RUN_UI_WORKFLOW_POSTGRES === "1" ? describe : describe.skip
type Actor = Parameters<typeof readAuditExplorer>[0]
type Fixture = { actor: Actor; roleId: string; itemId: string }
let observer: PrismaClient
async function fixture(): Promise<Fixture> {
  const suffix = randomUUID(), orgId = `ux-audit-${suffix}`, userId = `ux-auditor-${suffix}`
  const permissions = ["controls.audit.read", "users.read", "inventory.items.read", "inventory.levels.read", "dashboard.read"]
  await db.organization.create({ data: { id: orgId, name: "Synthetic audit fixture", slug: orgId } })
  const role = await db.role.create({ data: { organizationId: orgId, code: "TEST_AUDITOR", nameEn: "Synthetic auditor", permissions } })
  await db.user.create({ data: { id: userId, organizationId: orgId, email: `${suffix}@ui-workflow.invalid`, firstName: "Synthetic", lastName: "Auditor", isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [], roles: { connect: { id: role.id } } } })
  const item = await db.item.create({ data: { organizationId: orgId, slug: suffix, sku: suffix, nameEn: "Synthetic item", imageUrls: [], costPrice: 99, sellingPrice: 101 } })
  return { actor: { orgId, userId, permissions }, roleId: role.id, itemId: item.id }
}
const accessData = (f: Fixture) => ({ organizationId: f.actor.orgId, userId: f.actor.userId, entityType: "User", entityId: f.actor.userId, action: "MEMBER_ACCESS_CHANGED",
  changes: { operation: "roles", added: ["private-role-a", "private-role-b"], removed: ["private-role-c"], beforeActive: true, afterActive: true, token: "PRIVATE-TOKEN", reason: "PRIVATE-REASON", receipt: { private: true } }, ipAddress: "192.0.2.1", userAgent: "PRIVATE-UA" })
async function stockEvent(f: Fixture, managed: boolean, itemId = f.itemId) {
  const suffix = randomUUID()
  const location = await db.location.create({ data: { organizationId: f.actor.orgId, name: "Synthetic location", code: suffix, type: "WAREHOUSE", managerId: managed ? f.actor.userId : null } })
  const adjustment = await db.stockAdjustment.create({ data: { organizationId: f.actor.orgId, adjustmentNumber: suffix, type: "CORRECTION", reason: "Synthetic", locationId: location.id,
    lines: { create: { itemId, systemQuantity: 2, actualQuantity: 1, adjustedQuantity: -1, unitCost: 99, totalCost: 99 } } } })
  const event = await db.auditLog.create({ data: { organizationId: f.actor.orgId, userId: f.actor.userId, entityType: "StockAdjustment", entityId: adjustment.id, action: "POST_STOCK_ADJUSTMENT", changes: { after: { adjustmentType: "CORRECTION", totalCost: 99, reason: "PRIVATE-REASON" } } } })
  return { event, location }
}
suite("Audit explorer on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
    observer = new PrismaClient({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } })
    const identity = await observer.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    expect(identity[0].name).toBe(process.env.UI_WORKFLOW_POSTGRES_DATABASE)
  })
  afterAll(async () => { await Promise.all([db.$disconnect(), observer?.$disconnect()]) })
  it("projects only approved access fields from stored private audit payloads", async () => {
    const f = await fixture(), event = await db.auditLog.create({ data: accessData(f) })
    await db.auditLog.create({ data: { ...accessData(f), action: "UNSUPPORTED_PRIVATE_ACTION" } })
    const result = await readAuditExplorer(f.actor, { family: "access" })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({ id: event.id, actorId: f.actor.userId, details: { operation: "roles", addedRoles: 2, removedRoles: 1, beforeActive: true, afterActive: true }, detailState: "limited" })
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|private-role|192\.0\.2\.1/)
  })
  it("pages equal timestamps under a fixed upper bound while documenting backfill visibility", async () => {
    const f = await fixture(), ids = Array.from({ length: 55 }, (_, index) => `${f.actor.orgId}-${String(index).padStart(3, "0")}`)
    await db.auditLog.createMany({ data: ids.map(id => ({ ...accessData(f), id, createdAt: new Date("2026-10-04T11:00:00.123Z") })) })
    const first = await readAuditExplorer(f.actor, { family: "access" })
    const newer = await db.auditLog.create({ data: { ...accessData(f), createdAt: new Date("2026-10-04T12:00:00Z") } })
    const backfill = await db.auditLog.create({ data: { ...accessData(f), createdAt: new Date("2026-10-04T10:00:00Z") } })
    const second = await readAuditExplorer(f.actor, { family: "access", throughId: first.throughId!, beforeId: first.nextCursor! })
    const third = await readAuditExplorer(f.actor, { family: "access", throughId: first.throughId!, beforeId: second.nextCursor! })
    const seen = [first, second, third].flatMap(page => page.entries.map(entry => entry.id))
    expect([first.entries.length, second.entries.length, third.entries.length]).toEqual([25, 25, 6])
    expect(seen).toEqual([...ids.reverse(), backfill.id]); expect(new Set(seen).size).toBe(56); expect(seen).not.toContain(newer.id)
    expect(second.throughId).toBe(first.throughId); expect(third.nextCursor).toBeNull()
  })
  it("rejects foreign or changed-scope cursor anchors", async () => {
    const f = await fixture(), other = await fixture()
    const local = await db.auditLog.create({ data: accessData(f) }), foreign = await db.auditLog.create({ data: accessData(other) })
    await expect(readAuditExplorer(f.actor, { family: "access", throughId: foreign.id })).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(readAuditExplorer(f.actor, { family: "access", throughId: local.id, beforeId: foreign.id })).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(readAuditExplorer(f.actor, { family: "access", action: "DEACTIVATE_USER", throughId: local.id })).rejects.toMatchObject({ code: "CONFLICT" })
  })
  it("checks stored revoked authority and current account usability", async () => {
    const f = await fixture(); await db.auditLog.create({ data: accessData(f) })
    await observer.role.update({ where: { id: f.roleId }, data: { permissions: [] } })
    await expect(readAuditExplorer(f.actor, {})).rejects.toMatchObject({ code: "FORBIDDEN" })
    await observer.role.update({ where: { id: f.roleId }, data: { permissions: f.actor.permissions } })
    await observer.user.update({ where: { id: f.actor.userId }, data: { isLocked: true } })
    await expect(readAuditExplorer(f.actor, {})).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
  it("scopes stock events before pagination and rejects a cross-tenant item line", async () => {
    const f = await fixture(), other = await fixture()
    const allowed = await stockEvent(f, true), denied = await stockEvent(f, false)
    await stockEvent(f, true, other.itemId)
    const page = await readAuditExplorer(f.actor, { family: "items" })
    expect(page.entries.map(entry => entry.id)).toEqual([allowed.event.id])
    expect(page.entries[0].details).toEqual({ adjustmentType: "CORRECTION" })
    await observer.role.update({ where: { id: f.roleId }, data: { code: "admin" } })
    expect((await readAuditExplorer(f.actor, { family: "items" })).entries.map(entry => entry.id).sort()).toEqual([allowed.event.id, denied.event.id].sort())
    await observer.role.update({ where: { id: f.roleId }, data: { code: "TEST_AUDITOR" } })
    await observer.location.update({ where: { id: allowed.location.id }, data: { managerId: null } })
    expect((await readAuditExplorer(f.actor, { family: "items" })).entries).toEqual([])
  })
  it("redacts actor identity and rejects actor filtering without user-read authority", async () => {
    const f = await fixture()
    await db.auditLog.create({ data: { organizationId: f.actor.orgId, userId: f.actor.userId, entityType: "SecurityEvent", entityId: f.itemId, action: "PERMISSION_DENIED", changes: { resource: "Item", resourceId: f.itemId, permission: "inventory.items.update", private: "PRIVATE" } } })
    const permissions = f.actor.permissions.filter(permission => permission !== "users.read")
    await observer.role.update({ where: { id: f.roleId }, data: { permissions } })
    const actor = { ...f.actor, permissions }
    const page = await readAuditExplorer(actor, { family: "items" })
    expect(page.entries).toHaveLength(1); expect(page.entries[0]).toMatchObject({ actorId: null, details: { permission: "inventory.items.update" } })
    await expect(readAuditExplorer(actor, { actorId: f.actor.userId })).rejects.toMatchObject({ code: "FORBIDDEN" })
    await db.tenantModuleConfiguration.create({ data: { organizationId: f.actor.orgId, manifestHash: "synthetic-empty-grants" } })
    expect((await readAuditExplorer(actor, { family: "items" })).entries).toEqual([])
  })
  it("combines action, actor, entity and UTC-day filters before selecting rows", async () => {
    const f = await fixture()
    const included = await db.auditLog.create({ data: { ...accessData(f), createdAt: new Date("2026-10-04T23:59:59.999Z") } })
    await db.auditLog.create({ data: { ...accessData(f), createdAt: new Date("2026-10-05T00:00:00Z") } })
    await db.auditLog.create({ data: { ...accessData(f), action: "DEACTIVATE_USER", createdAt: new Date("2026-10-04T23:59:59Z") } })
    const page = await readAuditExplorer(f.actor, { family: "access", action: "MEMBER_ACCESS_CHANGED", actorId: f.actor.userId, entityId: f.actor.userId, from: "2026-10-04", through: "2026-10-04" })
    expect(page.entries.map(entry => entry.id)).toEqual([included.id])
  })
})
