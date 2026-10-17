import { deriveLegacyEntitlements, evaluateModuleEntitlement } from "../module-entitlement.service"

jest.mock("@/prisma/db", () => ({ db: {} }))

describe("P04 read-only and export entitlement distinction", () => {
  it.each(["read", "write", "export", "job"] as const)("evaluates %s independently of RBAC wildcard", (accessIntent) => {
    const entitlements = deriveLegacyEntitlements({ requestedModules: [] }).entitlements.map(grant =>
      grant.moduleSlug === "inventory" ? { ...grant, status: "read_only" as const, readOnly: true } : grant,
    )
    const result = evaluateModuleEntitlement({
      organizationId: "org-a", userId: "actor-a", actorPermissions: ["*"],
      moduleSlug: "inventory", explicitEntitlements: entitlements,
      accessIntent, mode: "enforce", surfaceType: "action", surface: "p04.synthetic.boundary",
      now: new Date("2026-10-13T10:00:00Z"),
    })
    expect(result.allowed).toBe(accessIntent === "read")
    expect(result.rbacWildcardBypassedEntitlement).toBe(false)
  })
})
