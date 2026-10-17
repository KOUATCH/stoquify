jest.mock("@/prisma/db", () => ({ db: {
  organization: { findFirst: jest.fn() },
  tenantModuleConfiguration: { findUnique: jest.fn() },
  tenantModuleGrant: { findMany: jest.fn() },
  tenantModuleConfigurationCommand: { count: jest.fn() },
  auditLog: { create: jest.fn() },
} }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))

import { db } from "@/prisma/db"
import { observeModuleAccess } from "../module-entitlement.service"
import { observeModuleReadAccessBatch } from "../module-access-batch.service"
import type { CommercialModuleSlug } from "../module-control-contracts"

const now = new Date("2026-09-30T12:00:00Z")
const slugs: CommercialModuleSlug[] = ["finance", "payment_reconciliation", "inventory", "close_assurance", "payroll", "purchasing"]
const common = { organizationId: "org-a", userId: "actor-a", actorPermissions: ["*"], surfaceType: "report" as const, surface: "cash-command.source", now }
const mock = (value: unknown) => value as jest.Mock
const grant = (moduleSlug: string, overrides = {}) => ({ moduleSlug, status: "active", source: "manual", startsAt: null, endsAt: null, readOnly: false, trial: false, ...overrides })
const active = () => [...slugs, "accounting", "reports"].map(slug => grant(slug))

beforeEach(() => {
  jest.resetAllMocks()
  mock(db.organization.findFirst).mockResolvedValue({ id: "org-a", requestedModules: [] })
  mock(db.tenantModuleConfiguration.findUnique).mockResolvedValue({ organizationId: "org-a" })
  mock(db.tenantModuleGrant.findMany).mockResolvedValue(active())
  mock(db.tenantModuleConfigurationCommand.count).mockResolvedValue(0)
  mock(db.auditLog.create).mockResolvedValue({ id: "audit" })
})

it.each([
  ["active", () => active()],
  ["explicit empty", () => []],
  ["expired", () => active().map(row => ({ ...row, endsAt: now }))],
  ["future", () => active().map(row => ({ ...row, startsAt: new Date("2026-10-01T00:00:00Z") }))],
  ["suspended", () => active().map(row => ({ ...row, status: "suspended" }))],
  ["read only", () => active().map(row => ({ ...row, status: "read_only", readOnly: true }))],
  ["suspended dependency", () => active().map(row => row.moduleSlug === "accounting" ? { ...row, status: "suspended" } : row)],
  ["ambiguous grants", () => [...active(), grant("finance", { status: "suspended" })]],
] as const)("preserves individual decisions and denial audits for %s", async (_name, grants) => {
  mock(db.tenantModuleGrant.findMany).mockResolvedValue(grants())
  const singles = await Promise.all(slugs.map(moduleSlug => observeModuleAccess({ ...common, moduleSlug, accessIntent: "read", mode: "enforce" })))
  const audits = mock(db.auditLog.create).mock.calls.map(call => call[0])
  jest.clearAllMocks()
  const batch = await observeModuleReadAccessBatch({ ...common, moduleSlugs: [...slugs, "payroll"] })
  expect([...batch.values()]).toEqual(singles)
  expect(mock(db.auditLog.create).mock.calls.map(call => call[0])).toEqual(audits)
  expect(db.organization.findFirst).toHaveBeenCalledTimes(1)
  expect(db.tenantModuleConfiguration.findUnique).toHaveBeenCalledTimes(1)
  expect(db.tenantModuleGrant.findMany).toHaveBeenCalledTimes(1)
  expect(db.tenantModuleConfigurationCommand.count).not.toHaveBeenCalled()
})

it("retains legacy full-suite access only when configuration, grants and history are absent", async () => {
  mock(db.tenantModuleConfiguration.findUnique).mockResolvedValue(null)
  mock(db.tenantModuleGrant.findMany).mockResolvedValue([])
  const result = await observeModuleReadAccessBatch({ ...common, moduleSlugs: slugs })
  expect([...result.values()].every(decision => decision.allowed)).toBe(true)
  expect(db.tenantModuleConfigurationCommand.count).toHaveBeenCalledTimes(1)
  mock(db.tenantModuleConfigurationCommand.count).mockResolvedValue(1)
  await expect(observeModuleReadAccessBatch({ ...common, moduleSlugs: slugs })).rejects.toThrow("retained configuration record")
})

it("rejects a missing, inactive or deleted organization before reading grants", async () => {
  mock(db.organization.findFirst).mockResolvedValue(null)
  await expect(observeModuleReadAccessBatch({ ...common, moduleSlugs: slugs })).rejects.toThrow("Organization not found")
  expect(db.organization.findFirst).toHaveBeenCalledWith({ where: { id: "org-a", isActive: true, deletedAt: null }, select: { id: true, requestedModules: true } })
  expect(db.tenantModuleGrant.findMany).not.toHaveBeenCalled()
})

it.each(["organization", "configuration", "grants", "history"])("propagates %s read failure without a successful empty result", async stage => {
  if (stage === "history") mock(db.tenantModuleConfiguration.findUnique).mockResolvedValue(null)
  const query = { organization: db.organization.findFirst, configuration: db.tenantModuleConfiguration.findUnique, grants: db.tenantModuleGrant.findMany, history: db.tenantModuleConfigurationCommand.count }[stage]!
  mock(query).mockRejectedValue(new Error("storage unavailable"))
  await expect(observeModuleReadAccessBatch({ ...common, moduleSlugs: slugs })).rejects.toThrow("storage unavailable")
  expect(db.auditLog.create).not.toHaveBeenCalled()
})

it("does not reuse authority across requests or organizations", async () => {
  const a = await observeModuleReadAccessBatch({ ...common, moduleSlugs: ["finance"] })
  expect(a.get("finance")?.allowed).toBe(true)
  mock(db.tenantModuleGrant.findMany).mockResolvedValue([])
  const revoked = await observeModuleReadAccessBatch({ ...common, moduleSlugs: ["finance"] })
  expect(revoked.get("finance")?.allowed).toBe(false)
  mock(db.organization.findFirst).mockResolvedValue({ id: "org-b", requestedModules: [] })
  await observeModuleReadAccessBatch({ ...common, organizationId: "org-b", moduleSlugs: ["finance"] })
  expect(db.organization.findFirst).toHaveBeenCalledTimes(3)
  expect(db.tenantModuleGrant.findMany).toHaveBeenLastCalledWith({ where: { organizationId: "org-b" } })
  expect(db.tenantModuleConfiguration.findUnique).toHaveBeenLastCalledWith({ where: { organizationId: "org-b" } })
})

it("keeps explicit audit suppression and an empty batch side-effect free", async () => {
  expect((await observeModuleReadAccessBatch({ ...common, moduleSlugs: [] })).size).toBe(0)
  expect(db.organization.findFirst).not.toHaveBeenCalled()
  mock(db.tenantModuleGrant.findMany).mockResolvedValue([])
  const result = await observeModuleReadAccessBatch({ ...common, moduleSlugs: slugs, audit: false })
  expect([...result.values()].every(decision => !decision.allowed)).toBe(true)
  expect(db.auditLog.create).not.toHaveBeenCalled()
})
