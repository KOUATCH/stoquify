jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), organization: { findFirst: jest.fn() } } }))
import { db } from "@/prisma/db"
import { updateOrganizationSettingsForOrg } from "../organization-profile-update.service"
import { getOrganizationSettingsForOrg, updateOrganizationCurrencyForOrg, updateOrganizationTimezoneForOrg, updateFiscalYearStartForOrg, updateInventoryStartDateForOrg } from "../organization-settings.service"
import { getApiOrganizationById } from "../organization-read.service"

const revision = "2026-09-01T00:00:00.000Z"
const context = { actorUserId: "actor-1", expectedUpdatedAt: revision, session: { id: "session-1", token: "private-test-token" } }
const before = { id: "org-1", name: "Company", currency: "XAF", timezone: "Africa/Douala", defaultLocale: "EN", updatedAt: new Date(revision) }
const tx = { $queryRaw: jest.fn(), organization: { findFirst: jest.fn(), update: jest.fn() }, auditLog: { create: jest.fn() } }
let actor: Record<string, unknown> | null, session: Record<string, unknown> | null, permissions: string[]
beforeEach(() => {
  jest.clearAllMocks()
  actor = { isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null }
  session = { expiresAt: new Date(Date.now() + 600000), assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: "org-1", assuranceLevel: 1, assuranceLockedUntil: null }
  permissions = ["system.organization.update"]
  tx.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) => {
    const sql = strings.join("?")
    if (sql.includes("FROM users")) return actor ? [actor] : []
    if (sql.includes("FROM roles")) return [{ permissions }]
    if (sql.includes("FROM sessions")) return session ? [session] : []
    return [{ id: "org-1" }]
  })
  tx.organization.findFirst.mockResolvedValue(before)
  tx.organization.update.mockImplementation(async ({ data }) => ({ ...before, ...data }))
  ;(db.$transaction as jest.Mock).mockImplementation(async work => work(tx))
})

it("saves only reviewed fields with a monotonic revision and mandatory server-actor audit", async () => {
  const after = await updateOrganizationSettingsForOrg("org-1", { name: "  Changed company  ", defaultLocale: "fr", industry: " " }, context)
  expect(after).toMatchObject({ name: "Changed company", defaultLocale: "FR", industry: null, currency: "XAF" })
  expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime())
  expect(tx.organization.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "org-1", isActive: true, deletedAt: null } }))
  expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: "org-1", userId: "actor-1", action: "ORGANIZATION_SETTINGS_UPDATED", changes: expect.objectContaining({ reviewedUpdatedAt: revision, changedFields: ["name", "industry", "defaultLocale"] }) }) })
  expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(context.session.token)
  expect(tx.$queryRaw.mock.calls.find(call => call[0].join("").includes("FROM sessions")).slice(1)).toEqual([context.session.id, context.session.token, context.actorUserId])
})

it.each([undefined, "invalid", "2026-08-31T00:00:00.000Z"])("rejects an absent or stale reviewed revision: %s", async expectedUpdatedAt => {
  await expect(updateOrganizationSettingsForOrg("org-1", { name: "Changed" }, { ...context, expectedUpdatedAt })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(tx.organization.update).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("rejects a missing or unavailable tenant", async () => {
  tx.organization.findFirst.mockResolvedValue(null)
  await expect(updateOrganizationSettingsForOrg("org-other", { name: "Changed" }, context)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.organization.update).not.toHaveBeenCalled()
})
it.each([null, { isActive: false }, { isVerified: false, emailVerified: false }, { isLocked: true, lockedUntil: null }, { isLocked: true, lockedUntil: new Date(Date.now() + 600000) }])("rejects revoked, missing, unverified or locked current actor: %j", async override => {
  actor = override ? { ...actor, ...override } : null
  await expect(updateOrganizationSettingsForOrg("org-1", { name: "Changed" }, context)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.organization.update).not.toHaveBeenCalled()
})
it("rechecks live role permissions instead of trusting the action's earlier decision", async () => {
  permissions = ["system.organization.read"]
  await expect(updateOrganizationSettingsForOrg("org-1", { name: "Changed" }, context)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.organization.update).not.toHaveBeenCalled()
})
it.each([null, { expiresAt: new Date(0) }, { assuranceVerifiedAt: null }, { assuranceVerifiedAt: new Date(0) }, { assuranceVerifiedAt: new Date(Date.now() + 600000) }, { assuranceMethod: "unsupported" }, { assuranceOrganizationId: "org-other" }, { assuranceLevel: 0 }, { assuranceLockedUntil: new Date(Date.now() + 600000) }])("rejects invalid or stale session assurance: %j", async override => {
  session = override ? { ...session, ...override } : null
  await expect(updateOrganizationSettingsForOrg("org-1", { name: "Changed" }, context)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  expect(tx.organization.update).not.toHaveBeenCalled()
})
it("propagates audit failure through the transaction instead of acknowledging an unaudited change", async () => {
  tx.auditLog.create.mockRejectedValueOnce(new Error("owned audit failure"))
  await expect(updateOrganizationSettingsForOrg("org-1", { name: "Changed" }, context)).rejects.toThrow("owned audit failure")
})
it("prevents both the general and shortcut transport from relabelling existing monetary values", async () => {
  await expect(updateOrganizationSettingsForOrg("org-1", { currency: "EUR" }, context)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  await expect(updateOrganizationCurrencyForOrg("org-1", "EUR", context)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(tx.organization.update).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("binds every shortcut to the same actor, revision, authentication and audit contract", async () => {
  for (const operation of [() => updateOrganizationCurrencyForOrg("org-1", "XAF", context), () => updateOrganizationTimezoneForOrg("org-1", "Europe/Paris", context), () => updateFiscalYearStartForOrg("org-1", "04-01", context), () => updateInventoryStartDateForOrg("org-1", new Date("2026-01-01"), context)]) await operation()
  expect(tx.auditLog.create).toHaveBeenCalledTimes(4)
  await expect(updateOrganizationSettingsForOrg("org-1", { name: "Changed" })).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("filters inactive and deleted tenants consistently for settings and API reads", async () => {
  await getOrganizationSettingsForOrg("org-1"); await getApiOrganizationById("org-1")
  expect(db.organization.findFirst).toHaveBeenCalledTimes(2)
  for (const [args] of (db.organization.findFirst as jest.Mock).mock.calls) expect(args.where).toEqual({ id: "org-1", isActive: true, deletedAt: null })
})
