import type { TenantModuleEntitlement } from "../module-control-contracts"

jest.mock("@/prisma/db", () => ({
  db: {
    organization: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}))

import { db } from "@/prisma/db"

import { normalizeModuleSlug } from "../module-catalog.service"
import {
  deriveLegacyEntitlements,
  evaluateModuleEntitlement,
  observeModuleAccess,
} from "../module-entitlement.service"

const mockDb = db as unknown as {
  organization: { findFirst: jest.Mock }
  auditLog: { create: jest.Mock }
}

describe("module entitlement service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("normalizes registration module labels into canonical module slugs", () => {
    expect(normalizeModuleSlug("Payment reconciliation")).toBe("payment_reconciliation")
    expect(normalizeModuleSlug("POS")).toBe("pos")
    expect(normalizeModuleSlug("Stock")).toBe("inventory")
    expect(normalizeModuleSlug("unknown module")).toBeNull()
  })

  it("derives legacy full-suite observe entitlements when no requested modules exist", () => {
    const result = deriveLegacyEntitlements({ requestedModules: [] })

    expect(result.entitlements.length).toBeGreaterThan(10)
    expect(result.entitlements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduleSlug: "inventory", status: "legacy_default" }),
        expect.objectContaining({ moduleSlug: "settings", status: "system_default" }),
      ]),
    )
  })

  it("keeps observe mode allowed while marking non-entitled modules as would-block even for wildcard RBAC", () => {
    const decision = evaluateModuleEntitlement({
      organizationId: "org-1",
      userId: "user-1",
      moduleSlug: "payroll",
      requestedModules: ["POS", "Inventory"],
      surfaceType: "page",
      surface: "/dashboard/payroll",
      actorPermissions: ["*"],
    })

    expect(decision.allowed).toBe(true)
    expect(decision.result).toBe("would_block")
    expect(decision.wouldBlock).toBe(true)
    expect(decision.rbacWildcardPresent).toBe(true)
    expect(decision.rbacWildcardBypassedEntitlement).toBe(false)
  })

  it("flags required dependency gaps without hard denial in observe mode", () => {
    const decision = evaluateModuleEntitlement({
      organizationId: "org-1",
      moduleSlug: "payment_reconciliation",
      requestedModules: ["Payment reconciliation", "Accounting"],
      surfaceType: "page",
      surface: "/dashboard/finance/reconciliation",
    })

    expect(decision.allowed).toBe(true)
    expect(decision.wouldBlock).toBe(true)
    expect(decision.missingDependencies).toEqual(
      expect.arrayContaining([expect.objectContaining({ dependsOnSlug: "finance" })]),
    )
  })

  it("denies write access for read-only entitlements only when enforcement is requested", () => {
    const readOnly: TenantModuleEntitlement = {
      moduleSlug: "inventory",
      status: "read_only",
      source: "manual_override",
      startsAt: null,
      endsAt: null,
      readOnly: true,
      trial: false,
    }

    const observeDecision = evaluateModuleEntitlement({
      organizationId: "org-1",
      moduleSlug: "inventory",
      explicitEntitlements: [readOnly],
      surfaceType: "action",
      surface: "inventory.stock.adjust",
      accessIntent: "write",
    })
    const enforceDecision = evaluateModuleEntitlement({
      organizationId: "org-1",
      moduleSlug: "inventory",
      explicitEntitlements: [readOnly],
      surfaceType: "action",
      surface: "inventory.stock.adjust",
      accessIntent: "write",
      mode: "enforce",
    })

    expect(observeDecision.allowed).toBe(true)
    expect(observeDecision.result).toBe("would_block")
    expect(enforceDecision.allowed).toBe(false)
    expect(enforceDecision.result).toBe("deny")
  })

  it("writes observe-mode would-block audit logs without denying the request", async () => {
    mockDb.organization.findFirst.mockResolvedValue({
      id: "org-1",
      requestedModules: ["Inventory"],
    })
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" })

    const decision = await observeModuleAccess({
      organizationId: "org-1",
      userId: "user-1",
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll",
      actorPermissions: ["*"],
    })

    expect(decision.allowed).toBe(true)
    expect(decision.wouldBlock).toBe(true)
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "ModuleEntitlementDecision",
          action: "MODULE_ENTITLEMENT_OBSERVED",
          organizationId: "org-1",
          userId: "user-1",
        }),
      }),
    )
  })
})

