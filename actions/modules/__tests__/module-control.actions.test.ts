jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & { __moduleControlProtectOptions?: Array<Record<string, unknown>> }
    store.__moduleControlProtectOptions = store.__moduleControlProtectOptions ?? []
    store.__moduleControlProtectOptions.push(options)
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["*", "MANAGE_SYSTEM_SETTINGS", "dashboard.read"],
        isSuperUser: true,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  activateTenantModule: jest.fn(),
  getModuleControlCenterData: jest.fn(),
  observeModuleAccess: jest.fn(),
}))

import {
  activateTenantModule,
  getModuleControlCenterData,
  observeModuleAccess,
} from "@/services/modules/module-entitlement.service"

import {
  activateTenantModuleAction,
  getModuleControlCenterAction,
  observeModuleAccessAction,
} from "../module-control.actions"

const mockGetModuleControlCenterData = getModuleControlCenterData as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockActivateTenantModule = activateTenantModule as jest.Mock

describe("module control actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetModuleControlCenterData.mockResolvedValue({ mode: "observe" })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: true })
    mockActivateTenantModule.mockResolvedValue({
      organizationId: "org-session",
      moduleSlug: "payment_reconciliation",
      addedModules: ["finance"],
    })
  })

  it("derives tenant and actor from RBAC context for the control center", async () => {
    const result = await getModuleControlCenterAction({ organizationId: "attacker-org" })

    expect(result.success).toBe(true)
    expect(mockGetModuleControlCenterData).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorId: "user-session",
      actorPermissions: ["*", "MANAGE_SYSTEM_SETTINGS", "dashboard.read"],
    })
  })

  it("observes module access through the authenticated tenant scope", async () => {
    const result = await observeModuleAccessAction({
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll",
      accessIntent: "read",
    })

    expect(result.success).toBe(true)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        userId: "user-session",
        actorPermissions: ["*", "MANAGE_SYSTEM_SETTINGS", "dashboard.read"],
        moduleSlug: "payroll",
      }),
    )
  })

  it("registers module control permissions on protected wrappers", () => {
    const store = globalThis as typeof globalThis & { __moduleControlProtectOptions?: Array<Record<string, unknown>> }
    expect(store.__moduleControlProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ permission: "MANAGE_SYSTEM_SETTINGS" }),
        expect.objectContaining({ permission: "dashboard.read" }),
      ]),
    )
  })

  it("activates a module only for the authenticated tenant and actor", async () => {
    const result = await activateTenantModuleAction({
      moduleSlug: "payment_reconciliation",
      organizationId: "attacker-org",
    })

    expect(result.success).toBe(true)
    expect(mockActivateTenantModule).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorId: "user-session",
      moduleSlug: "payment_reconciliation",
    })
  })

  it("requires recent authentication for module activation", () => {
    const store = globalThis as typeof globalThis & { __moduleControlProtectOptions?: Array<Record<string, unknown>> }

    expect(store.__moduleControlProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          permission: "MANAGE_SYSTEM_SETTINGS",
          auditResource: "ModuleEntitlementProvisioning",
          freshAuth: { maxAgeSeconds: 600 },
          tenantGuard: "handler-derived",
        }),
      ]),
    )
  })
})
