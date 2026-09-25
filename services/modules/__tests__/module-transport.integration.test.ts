import { auth } from "@/lib/auth"
import { db } from "@/prisma/db"
import { protect } from "@/services/_shared/protect"
import { requireApiModuleAccess, requireApiSessionForOrg, requireAppPermission } from "@/lib/security/server-authz"
import type { CommercialModuleSlug, ModuleAccessIntent } from "../module-control-contracts"

// Keep the complete permission/tenant/module decision chain real. Only its
// authenticated-session input and persistence boundary are test doubles.
jest.mock("next/headers", () => ({ headers: jest.fn(async () => ({ get: () => null })) }))
jest.mock("@/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }))
jest.mock("@/prisma/db", () => ({ db: {
  user: { findFirst: jest.fn() },
  organization: { findFirst: jest.fn() },
  tenantModuleConfiguration: { findUnique: jest.fn() },
  tenantModuleGrant: { findMany: jest.fn() },
  tenantModuleConfigurationCommand: { count: jest.fn() },
  auditLog: { create: jest.fn() },
} }))

const ORG = "org-transport-authorized"
const FOREIGN_ORG = "org-transport-foreign"
const USER = "user-transport"
const NOW = new Date("2026-09-05T12:00:00.000Z")
const READ_PERMISSION = "inventory.items.read"
const WRITE_PERMISSION = "inventory.items.update"
const mockDb = db as unknown as {
  user: { findFirst: jest.Mock }
  organization: { findFirst: jest.Mock }
  tenantModuleConfiguration: { findUnique: jest.Mock }
  tenantModuleGrant: { findMany: jest.Mock }
  tenantModuleConfigurationCommand: { count: jest.Mock }
  auditLog: { create: jest.Mock }
}
const mockSession = auth.api.getSession as jest.Mock

function grant(moduleSlug: CommercialModuleSlug, overrides: Record<string, unknown> = {}) {
  return { organizationId: ORG, moduleSlug, status: "active", source: "manual_override", startsAt: null, endsAt: null, readOnly: false, trial: false, ...overrides }
}

function permissions(values = [READ_PERMISSION, WRITE_PERMISSION]) {
  mockDb.user.findFirst.mockResolvedValue({
    id: USER, email: "transport@stoquify.test", firstName: "Transport", lastName: "Verifier", phone: null, image: null,
    emailVerified: true, isVerified: true, isLocked: false, lockedUntil: null, organizationId: ORG,
    organization: { name: "Transport fixture", isActive: true, deletedAt: null },
    roles: [{ id: "role-transport", nameEn: "Transport verifier", nameFr: "Vérificateur", code: "TRANSPORT", permissions: values }],
  })
}

function protectedAction(intent: ModuleAccessIntent, handler: jest.Mock, moduleSlug: CommercialModuleSlug = "inventory") {
  return protect<Record<string, unknown>, { executed: true }>({
    permission: intent === "read" ? READ_PERMISSION : WRITE_PERMISSION,
    module: { moduleSlug, surface: `transport.integration.${intent}`, accessIntent: intent, mode: "enforce" },
  }, handler)
}

// This is the established API-helper composition, not a new application route.
// The module helper assumes callers have already authenticated the tenant.
async function apiOperation(intent: ModuleAccessIntent, handler: jest.Mock, moduleSlug: CommercialModuleSlug = "inventory", organizationId = ORG) {
  const session = await requireApiSessionForOrg(organizationId)
  if (session.error || !session.session) return { status: session.status, decision: null }
  requireAppPermission(session.session.user, intent === "read" ? READ_PERMISSION : WRITE_PERMISSION)
  const gate = await requireApiModuleAccess({ organizationId, user: session.session.user, moduleSlug,
    surface: `${intent === "read" ? "GET" : "POST"} /api/transport-integration`, accessIntent: intent })
  if (!gate.allowed) return gate
  await handler()
  return gate
}

describe("real module evaluator across action and API transports", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
    jest.clearAllMocks()
    mockSession.mockResolvedValue({ user: { id: USER, organizationId: ORG }, session: { id: "session-transport" } })
    permissions()
    mockDb.organization.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => ({ id: where.id, requestedModules: [] }))
    mockDb.tenantModuleConfiguration.findUnique.mockResolvedValue({ organizationId: ORG, revision: 1, activeModules: ["inventory"] })
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([grant("inventory")])
    mockDb.tenantModuleConfigurationCommand.count.mockResolvedValue(0)
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-transport" })
  })

  afterEach(() => jest.useRealTimers())

  it.each([
    { label: "read_only status", restriction: { status: "read_only", readOnly: false } },
    { label: "independent readOnly flag", restriction: { status: "active", readOnly: true } },
  ])("allows genuine API and action reads with $label", async ({ restriction }) => {
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([grant("inventory", restriction)])
    const actionHandler = jest.fn().mockResolvedValue({ executed: true })
    const apiHandler = jest.fn().mockResolvedValue({ executed: true })

    const action = await protectedAction("read", actionHandler)({ organizationId: ORG })
    const api = await apiOperation("read", apiHandler)

    expect(action).toMatchObject({ success: true, status: 200, data: { executed: true } })
    expect(api).toMatchObject({ allowed: true, status: 200, decision: { mode: "enforce", result: "allow", hardEnforcementEnabled: true, accessIntent: "read" } })
    expect(actionHandler).toHaveBeenCalledTimes(1)
    expect(apiHandler).toHaveBeenCalledTimes(1)
    expect(mockSession).toHaveBeenCalledWith(expect.objectContaining({ query: { disableCookieCache: true } }))
    expect(mockDb.tenantModuleGrant.findMany).toHaveBeenCalledWith({ where: { organizationId: ORG } })
  })

  it.each<ModuleAccessIntent>(["write", "export", "job"])("denies read-only %s before either transport executes its handler", async (intent) => {
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([grant("inventory", { status: "read_only", readOnly: true })])
    const actionHandler = jest.fn()
    const apiHandler = jest.fn()

    const action = await protectedAction(intent, actionHandler)({ organizationId: ORG })
    const api = await apiOperation(intent, apiHandler)

    expect(action).toMatchObject({ success: false, status: 403, code: "FORBIDDEN", data: null })
    expect(api).toMatchObject({ allowed: false, status: 403, decision: { result: "deny", accessIntent: intent, hardEnforcementEnabled: true } })
    expect(actionHandler).not.toHaveBeenCalled()
    expect(apiHandler).not.toHaveBeenCalled()
    for (const surfaceType of ["action", "api"]) {
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
        action: "MODULE_ENTITLEMENT_ENFORCED", organizationId: ORG, userId: USER,
        changes: expect.objectContaining({ surfaceType, mode: "enforce", allowed: false, accessIntent: intent }),
      }) }))
    }
  })

  it("enforces the independent readOnly flag for writes even when grant status is active", async () => {
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([grant("inventory", { status: "active", readOnly: true })])
    const actionHandler = jest.fn()
    const apiHandler = jest.fn()
    expect(await protectedAction("write", actionHandler)({})).toMatchObject({ success: false, status: 403 })
    expect(await apiOperation("write", apiHandler)).toMatchObject({ allowed: false, status: 403 })
    expect(actionHandler).not.toHaveBeenCalled()
    expect(apiHandler).not.toHaveBeenCalled()
  })

  it.each([
    { label: "suspended", restriction: { status: "suspended" } },
    { label: "expired validity period", restriction: { status: "trial", trial: true, endsAt: new Date(NOW.getTime() - 1) } },
  ])("denies reconciliation in both transports when its finance dependency is $label", async ({ restriction }) => {
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([
      grant("payment_reconciliation"), grant("accounting"), grant("finance", restriction),
    ])
    const actionHandler = jest.fn()
    const apiHandler = jest.fn()

    const action = await protectedAction("read", actionHandler, "payment_reconciliation")({})
    const api = await apiOperation("read", apiHandler, "payment_reconciliation")

    expect(action).toMatchObject({ success: false, status: 403, code: "FORBIDDEN" })
    expect(api).toMatchObject({ allowed: false, status: 403, decision: { missingDependencies: [expect.objectContaining({ dependsOnSlug: "finance" })] } })
    expect(actionHandler).not.toHaveBeenCalled()
    expect(apiHandler).not.toHaveBeenCalled()
  })

  it("does not let wildcard RBAC turn an explicit empty grant set into legacy access", async () => {
    permissions(["*", READ_PERMISSION, WRITE_PERMISSION])
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([])
    const actionHandler = jest.fn()
    const apiHandler = jest.fn()

    const action = await protectedAction("read", actionHandler)({})
    const api = await apiOperation("read", apiHandler)

    expect(action).toMatchObject({ success: false, status: 403, code: "FORBIDDEN" })
    expect(api).toMatchObject({ allowed: false, status: 403, decision: { entitlement: null, rbacWildcardPresent: true, rbacWildcardBypassedEntitlement: false } })
    expect(mockDb.tenantModuleGrant.findMany).toHaveBeenCalledTimes(2)
    expect(actionHandler).not.toHaveBeenCalled()
    expect(apiHandler).not.toHaveBeenCalled()
  })

  it.each([
    { organizationId: FOREIGN_ORG },
    { orgId: FOREIGN_ORG },
    { data: { organizationId: FOREIGN_ORG } },
    { data: { orgId: FOREIGN_ORG } },
  ])("denies forged action tenant input %j using the real organization check", async (input) => {
    const handler = jest.fn()
    const result = await protectedAction("read", handler)(input)
    expect(result).toMatchObject({ success: false, status: 403, code: "FORBIDDEN" })
    expect(handler).not.toHaveBeenCalled()
    expect(mockDb.organization.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: ORG, deletedAt: null }) }))
    expect(mockDb.tenantModuleGrant.findMany).not.toHaveBeenCalledWith({ where: { organizationId: FOREIGN_ORG } })
  })

  it("denies an API foreign-organization route before module reads or domain effects", async () => {
    const handler = jest.fn()
    const result = await apiOperation("read", handler, "inventory", FOREIGN_ORG)
    expect(result).toMatchObject({ status: 403 })
    expect(mockDb.organization.findFirst).not.toHaveBeenCalled()
    expect(mockDb.tenantModuleGrant.findMany).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it("does not execute either handler when the managed grant store cannot be read", async () => {
    mockDb.tenantModuleGrant.findMany.mockRejectedValue(new Error("Module authority store unavailable"))
    const actionHandler = jest.fn()
    const apiHandler = jest.fn()
    const action = await protectedAction("read", actionHandler)({})
    expect(action).toMatchObject({ success: false, status: 500, data: null })
    await expect(apiOperation("read", apiHandler)).rejects.toThrow("Module authority store unavailable")
    expect(actionHandler).not.toHaveBeenCalled()
    expect(apiHandler).not.toHaveBeenCalled()
  })
})
