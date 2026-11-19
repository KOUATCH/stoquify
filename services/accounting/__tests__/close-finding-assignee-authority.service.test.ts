jest.mock("server-only", () => ({}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ getManagedModuleState: jest.fn(), evaluateModuleEntitlement: jest.fn() }))
jest.mock("../managed-accountant-access.service", () => ({
  accountantScopeKeys: (clientId: string, userId: string) => [`${clientId}:${userId}`, `managed:${clientId}:${userId}`],
  assertManagedAccountantAccess: jest.fn(),
}))

import type { Prisma } from "@prisma/client"
import { evaluateModuleEntitlement, getManagedModuleState } from "@/services/modules/module-entitlement.service"
import { assertManagedAccountantAccess } from "../managed-accountant-access.service"
import { lockCloseFindingAssigneeInTx, prelockCloseFindingAssigneeOrganizationsInTx } from "../close-finding-assignee-authority.service"

const now = new Date("2026-11-10T12:00:00Z")
const permissions = ["accounting.close.read", "accounting.close.finding.comment"]
const tx = { user: { findUnique: jest.fn() }, $queryRaw: jest.fn() }
const client = tx as unknown as Prisma.TransactionClient
let home: string, organizations: any[], user: any, roles: any[], memberships: any[], grants: any[]
const grant = () => ({ id: "grant", organizationId: "client", accountantUserId: "recipient", activeScopeKey: "client:recipient", status: "ACTIVE", role: "PREPARER",
  effectiveFrom: new Date("2026-10-01"), expiresAt: new Date("2027-01-01"), revokedAt: null, revokedById: null })
function configure(external = false) {
  home = external ? "a-firm" : "client"
  organizations = [...new Set(["client", home])].map(id => ({ id, isActive: true, deletedAt: null, requestedModules: ["accounting", "close_assurance"] }))
  user = { id: "recipient", organizationId: home, isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null }
  roles = [{ id: "role", organizationId: home, permissions }]; memberships = [{ roleId: "role" }]; grants = external ? [grant()] : []
  tx.user.findUnique.mockImplementation(async () => ({ id: "recipient", organizationId: home }))
  tx.$queryRaw.mockImplementation(async (query: Prisma.Sql) => {
    const sql = query.strings.join("")
    if (sql.includes('FROM "organizations"')) return organizations
    if (sql.includes('FROM "users"')) return [user]
    if (sql.includes('FROM "roles"')) return roles
    if (sql.includes('FROM "_UserRoles"')) return memberships
    if (sql.includes('FROM "accountant_access_grants"')) return grants
    return []
  })
}
const prelock = () => prelockCloseFindingAssigneeOrganizationsInTx(client, { organizationId: "client", assigneeId: "recipient" })
const lock = async () => lockCloseFindingAssigneeInTx(client, await prelock())
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers().setSystemTime(now)
  jest.mocked(getManagedModuleState).mockResolvedValue({ explicitEntitlements: [] } as any)
  jest.mocked(evaluateModuleEntitlement).mockReturnValue({ allowed: true } as any)
  jest.mocked(assertManagedAccountantAccess).mockResolvedValue(undefined)
  configure()
})
afterEach(() => { jest.useRealTimers() })

test("allows an offline local contributor without assignment, approval or session authority", async () => {
  const authority = await lock(); await authority.revalidate()
  expect(assertManagedAccountantAccess).not.toHaveBeenCalled()
  expect(evaluateModuleEntitlement).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "client", moduleSlug: "accounting", accessIntent: "read" }))
  expect(evaluateModuleEntitlement).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "client", moduleSlug: "close_assurance", accessIntent: "write" }))
  expect(tx.$queryRaw.mock.calls.every(([query]) => !query.strings.join("").includes('"sessions"'))).toBe(true)
})

test.each(["PREPARER", "REVIEWER"])("allows a delegated %s with current client consent and managed contribution access", async role => {
  configure(true); grants[0].role = role
  await lock()
  const first = tx.$queryRaw.mock.calls[0][0] as Prisma.Sql
  expect(first.strings.join("")).toContain('ORDER BY "id" FOR SHARE')
  expect(first.values).toEqual(["a-firm", "client"])
  expect(assertManagedAccountantAccess).toHaveBeenCalledWith(expect.objectContaining({ homeOrganizationId: "a-firm", clientOrganizationId: "client", accountantUserId: "recipient", grantId: "grant", capability: "REVIEW", permission: "accounting.close.finding.comment" }), client, true)
})

test.each(["missing-hint", "inactive-org", "deleted-org", "missing-org", "moved-user", "missing-user", "inactive", "unverified", "locked", "read-permission", "comment-permission", "foreign-role", "missing-membership", "module"])("denies %s eligibility", async failure => {
  if (failure === "missing-hint") tx.user.findUnique.mockResolvedValue(null)
  if (failure === "inactive-org") organizations[0].isActive = false
  if (failure === "deleted-org") organizations[0].deletedAt = now
  if (failure === "missing-org") organizations = []
  if (failure === "moved-user") user.organizationId = "other"
  if (failure === "missing-user") tx.$queryRaw.mockImplementation(async (query: Prisma.Sql) => query.strings.join("").includes('FROM "organizations"') ? organizations : [])
  if (failure === "inactive") user.isActive = false
  if (failure === "unverified") { user.isVerified = false; user.emailVerified = false }
  if (failure === "locked") { user.isLocked = true; user.lockedUntil = null }
  if (failure === "read-permission") roles[0].permissions = [permissions[1]]
  if (failure === "comment-permission") roles[0].permissions = [permissions[0]]
  if (failure === "foreign-role") roles[0].organizationId = "other"
  if (failure === "missing-membership") memberships = []
  if (failure === "module") jest.mocked(evaluateModuleEntitlement).mockReturnValue({ allowed: false } as any)
  await expect(lock()).rejects.toMatchObject({ code: "FORBIDDEN" })
})

test.each(["missing", "ambiguous", "wrong-client", "wrong-accountant", "wrong-key", "revoked", "revoker", "read-only", "future", "expired", "invalid-window", "managed-link"])("denies %s delegated mandate", async failure => {
  configure(true)
  if (failure === "missing") grants = []
  if (failure === "ambiguous") grants.push({ ...grant(), id: "second" })
  if (failure === "wrong-client") grants[0].organizationId = "other"
  if (failure === "wrong-accountant") grants[0].accountantUserId = "other"
  if (failure === "wrong-key") grants[0].activeScopeKey = "other"
  if (failure === "revoked") { grants[0].status = "REVOKED"; grants[0].revokedAt = now }
  if (failure === "revoker") grants[0].revokedById = "revoker"
  if (failure === "read-only") grants[0].role = "READ_ONLY"
  if (failure === "future") grants[0].effectiveFrom = new Date(+now + 1)
  if (failure === "expired") grants[0].expiresAt = now
  if (failure === "invalid-window") grants[0].effectiveFrom = grants[0].expiresAt
  if (failure === "managed-link") jest.mocked(assertManagedAccountantAccess).mockRejectedValue(Object.assign(new Error("Unavailable current engagement"), { code: "FORBIDDEN" }))
  await expect(lock()).rejects.toMatchObject({ code: "FORBIDDEN" })
})

test("rechecks delegated time validity after a business-lock wait", async () => {
  configure(true); grants[0].expiresAt = new Date(+now + 1000)
  const authority = await lock()
  await expect(authority.revalidate(new Date(+now + 1000))).rejects.toMatchObject({ code: "FORBIDDEN" })
})

test("propagates unavailable module or managed-grant reads rather than granting fallback access", async () => {
  jest.mocked(getManagedModuleState).mockRejectedValueOnce(new Error("Module source unavailable"))
  await expect(lock()).rejects.toThrow("Module source unavailable")
  configure(true); jest.mocked(getManagedModuleState).mockResolvedValue({ explicitEntitlements: [] } as any)
  jest.mocked(assertManagedAccountantAccess).mockRejectedValueOnce(new Error("Grant source unavailable"))
  await expect(lock()).rejects.toThrow("Grant source unavailable")
})
