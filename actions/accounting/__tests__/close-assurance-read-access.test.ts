jest.mock("server-only", () => ({}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error {
    constructor(message: string, public readonly code: string, public readonly status: number) { super(message) }
  }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn(), SESSION_ASSURANCE_LEVEL: { NONE: 0, PASSWORD: 1 } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/accounting/close-assurance.service", () => ({ getCloseAssuranceDashboard: jest.fn(), getCloseEvidenceGraph: jest.fn() }))
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({ exportClosePack: jest.fn() }))

import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getCloseAssuranceDashboard, getCloseEvidenceGraph } from "@/services/accounting/close-assurance.service"
import { getCloseAssuranceDashboardAction, getCloseEvidenceGraphAction } from "../close-assurance.actions"

const context = { orgId: "org-session", userId: "reader-session", permissions: ["accounting.close.read"] }

describe.each([
  ["dashboard", getCloseAssuranceDashboardAction, getCloseAssuranceDashboard],
  ["evidence graph", getCloseEvidenceGraphAction, getCloseEvidenceGraph],
] as const)("Close Assurance %s read boundary", (_name, action, service) => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue(context)
    ;(service as jest.Mock).mockResolvedValue({ marker: "private close evidence" })
  })

  it("does not load domain evidence when the current module read is denied", async () => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false, reason: "Suspended close grant", result: "deny" })
    expect(await action({ periodId: "period-1" })).toMatchObject({ success: false, status: 403, data: null })
    expect(service).not.toHaveBeenCalled()
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: context.orgId, userId: context.userId, actorPermissions: context.permissions, moduleSlug: "close_assurance", accessIntent: "read", mode: "enforce" }))
  })

  it("permits retained read evidence using server-derived authority", async () => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true, result: "allow_read_only" })
    expect(await action({ periodId: "period-1" })).toMatchObject({ success: true, data: { marker: "private close evidence" } })
    expect(service).toHaveBeenCalledWith(context.orgId, _name === "dashboard" ? "period-1" : { periodId: "period-1" })
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ accessIntent: "read", organizationId: context.orgId }))
  })

  it("does not turn a failed entitlement query into a successful read", async () => {
    ;(observeModuleAccess as jest.Mock).mockRejectedValue(new Error("Entitlement query unavailable"))
    const result = await action({ periodId: "period-1" })
    expect(result).toMatchObject({ success: false, data: null, status: 500 })
    expect(JSON.stringify(result)).not.toContain("private close evidence")
    expect(service).not.toHaveBeenCalled()
  })
})
