import type { ModuleEntitlementEvaluationInput, TenantModuleEntitlement } from "../module-control-contracts"

jest.mock("@/prisma/db", () => ({ db: {
  organization: { findFirst: jest.fn(), update: jest.fn() },
  tenantModuleConfiguration: { findUnique: jest.fn() },
  tenantModuleGrant: { findMany: jest.fn() },
  tenantModuleConfigurationCommand: { count: jest.fn() },
  auditLog: { create: jest.fn() }, $transaction: jest.fn(),
} }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))

import { db } from "@/prisma/db"
import { activateTenantModule, deriveLegacyEntitlements, evaluateModuleEntitlement, getModuleControlCenterData, observeModuleAccess } from "../module-entitlement.service"

const mockDb = db as unknown as {
  organization: { findFirst: jest.Mock; update: jest.Mock }
  tenantModuleConfiguration: { findUnique: jest.Mock }
  tenantModuleGrant: { findMany: jest.Mock }
  tenantModuleConfigurationCommand: { count: jest.Mock }
  auditLog: { create: jest.Mock }; $transaction: jest.Mock
}
const grant = (changes: Partial<TenantModuleEntitlement> = {}): TenantModuleEntitlement => ({
  moduleSlug: "inventory", status: "active", source: "manual_override", startsAt: null,
  endsAt: null, readOnly: false, trial: false, ...changes,
})
const evaluate = (changes: Partial<ModuleEntitlementEvaluationInput> = {}) => evaluateModuleEntitlement({
  organizationId: "org-1", moduleSlug: "inventory", surfaceType: "api", surface: "/api/items",
  accessIntent: "read", mode: "enforce", now: "2026-09-05T12:00:00Z", explicitEntitlements: [grant()], ...changes,
})

describe("module access integration prerequisites", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([])
    mockDb.tenantModuleConfigurationCommand.count.mockResolvedValue(0)
    mockDb.$transaction.mockImplementation((work: (tx: typeof mockDb) => unknown) => work(mockDb))
  })

  it("treats explicit empty grants as authoritative", () => {
    expect(deriveLegacyEntitlements({ explicitEntitlements: [], requestedModules: [] }).entitlements).toEqual([])
    expect(evaluate({ explicitEntitlements: [] }).allowed).toBe(false)
  })

  it.each([
    { startsAt: "2026-09-06T00:00:00Z" },
    { endsAt: "2026-09-05T12:00:00Z", status: "trial" as const },
    { endsAt: "not-a-date" },
    { startsAt: "2026-09-06T00:00:00Z", endsAt: "2026-09-04T00:00:00Z" },
  ])("rejects grants outside a valid interval: %j", (interval) => {
    expect(evaluate({ explicitEntitlements: [grant(interval)] }).allowed).toBe(false)
  })

  it("accepts the start boundary and rejects the exclusive end boundary", () => {
    expect(evaluate({ explicitEntitlements: [grant({ startsAt: "2026-09-05T12:00:00Z", endsAt: "2026-09-05T12:00:01Z" })] }).allowed).toBe(true)
  })

  it.each(["navigation", "page", "api", "action", "report"] as const)("permits read-only reads through %s", (surfaceType) => {
    expect(evaluate({ surfaceType, explicitEntitlements: [grant({ status: "read_only", readOnly: true })] }).allowed).toBe(true)
  })

  it.each(["write", "export", "job"] as const)("rejects readOnly flag for %s even when status is active", (accessIntent) => {
    expect(evaluate({ accessIntent, explicitEntitlements: [grant({ readOnly: true })] }).allowed).toBe(false)
  })

  it.each(["suspended", "expired", "unavailable"] as const)("rejects a %s required dependency", (status) => {
    const decision = evaluate({ moduleSlug: "pos", explicitEntitlements: [grant({ moduleSlug: "pos" }), grant({ moduleSlug: "sales", status })] })
    expect(decision.allowed).toBe(false)
    expect(decision.missingDependencies.map((item) => item.dependsOnSlug)).toContain("sales")
  })

  it("does not let a writable module use a read-only dependency for writes", () => {
    expect(evaluate({ moduleSlug: "pos", accessIntent: "write", explicitEntitlements: [grant({ moduleSlug: "pos" }), grant({ moduleSlug: "sales", readOnly: true })] }).allowed).toBe(false)
  })

  it("fails closed on duplicate grants independent of input ordering", () => {
    const grants = [grant(), grant({ status: "suspended" })]
    for (const explicitEntitlements of [grants, [...grants].reverse()]) {
      const decision = evaluate({ explicitEntitlements })
      expect(decision.allowed).toBe(false)
      expect(decision.reason).toMatch(/duplicate|ambiguous/i)
    }
  })

  it("reports the mode actually used and a mode-independent entitlement reason", () => {
    const decision = evaluate({ explicitEntitlements: [] })
    expect(decision.hardEnforcementEnabled).toBe(true)
    expect(decision.reason).not.toMatch(/observe/)
    expect(evaluate({ mode: "observe", explicitEntitlements: [] })).toMatchObject({ allowed: true, result: "would_block", hardEnforcementEnabled: false })
  })

  it("does not give nonexistent organizations legacy defaults", async () => {
    mockDb.organization.findFirst.mockResolvedValue(null)
    await expect(observeModuleAccess({ organizationId: "missing", moduleSlug: "inventory", surfaceType: "api", surface: "/api/items" })).rejects.toThrow(/not found/i)
    await expect(getModuleControlCenterData({ organizationId: "missing" })).rejects.toThrow(/not found/i)
    expect(mockDb.auditLog.create).not.toHaveBeenCalled()
  })

  it("preserves all 19 legacy rights when reconciliation is activated", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-1", requestedModules: [] })
    const before = deriveLegacyEntitlements({ requestedModules: [] }).entitlements.map((item) => item.moduleSlug)
    const result = await activateTenantModule({ organizationId: "org-1", actorId: "actor", moduleSlug: "payment_reconciliation" })
    const after = deriveLegacyEntitlements({ requestedModules: result.requestedModules }).entitlements.map((item) => item.moduleSlug)
    expect(before).toHaveLength(19)
    expect(after).toEqual(before)
    expect(result.alreadyActive).toBe(true)
    expect(mockDb.organization.update).not.toHaveBeenCalled()
  })

  it("retains unknown legacy values when extending a limited legacy configuration", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-1", requestedModules: ["Custom legacy tool", "Accounting"] })
    const result = await activateTenantModule({ organizationId: "org-1", actorId: "actor", moduleSlug: "payment_reconciliation" })
    expect(result.requestedModules).toEqual(expect.arrayContaining(["Custom legacy tool", "Accounting", "finance", "payment_reconciliation"]))
  })

  it("uses managed empty grants instead of registration intent or caller-supplied grants", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-1", requestedModules: [] })
    mockDb.tenantModuleConfiguration.findUnique.mockResolvedValue({ organizationId: "org-1" })
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([])
    const decision = await observeModuleAccess({ organizationId: "org-1", moduleSlug: "inventory", surfaceType: "api", surface: "/api/items", mode: "enforce", explicitEntitlements: [grant()] })
    expect(decision.allowed).toBe(false)
    expect(mockDb.tenantModuleGrant.findMany).toHaveBeenCalledWith({ where: { organizationId: "org-1" } })
  })

  it("does not turn an unavailable grant store into legacy full access", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-1", requestedModules: [] })
    mockDb.tenantModuleConfiguration.findUnique.mockRejectedValue(new Error("grant store unavailable"))
    await expect(observeModuleAccess({ organizationId: "org-1", moduleSlug: "inventory", surfaceType: "api", surface: "/api/items" })).rejects.toThrow("grant store unavailable")
  })

  it("fails closed when durable grants remain without their configuration", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-1", requestedModules: [] })
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([grant({ status: "suspended" })])
    await expect(observeModuleAccess({ organizationId: "org-1", moduleSlug: "inventory", surfaceType: "api", surface: "/api/items" })).rejects.toThrow(/configuration/)
  })

  it("does not restore legacy rights when a zero-grant configuration loses its row but retains history", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-1", requestedModules: [] })
    mockDb.tenantModuleConfigurationCommand.count.mockResolvedValue(1)
    await expect(observeModuleAccess({ organizationId: "org-1", moduleSlug: "inventory", surfaceType: "api", surface: "/api/items" })).rejects.toThrow(/configuration/)
  })

  it("requires reviewed configuration changes after migration to durable grants", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org-1", requestedModules: [] })
    mockDb.tenantModuleConfiguration.findUnique.mockResolvedValue({ organizationId: "org-1" })
    mockDb.tenantModuleGrant.findMany.mockResolvedValue([])
    await expect(activateTenantModule({ organizationId: "org-1", actorId: "actor", moduleSlug: "payment_reconciliation" })).rejects.toThrow(/review/)
    expect(mockDb.organization.update).not.toHaveBeenCalled()
  })
})
