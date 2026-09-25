jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/accounting/accounting-settings.service", () => ({ collectAccountingSetupReadinessIssues: jest.fn() }))
jest.mock("@/services/payroll/payroll-setup-readiness.service", () => ({ getPayrollSetupReadiness: jest.fn() }))
jest.mock("@/services/compliance/country-pack-hooks", () => ({ resolveEInvoicingMetadata: jest.fn() }))

import type { Prisma } from "@prisma/client"
import { collectAccountingSetupReadinessIssues } from "@/services/accounting/accounting-settings.service"
import { getPayrollSetupReadiness } from "@/services/payroll/payroll-setup-readiness.service"
import { resolveEInvoicingMetadata } from "@/services/compliance/country-pack-hooks"
import { observeModulePreparationInTx, moduleSetupScopeHashInTx, lifecycleEvidenceHash } from "../module-lifecycle-readiness.service"

const now = new Date("2026-09-05T10:00:00Z")
const input = { organizationId: "org-a", actorId: "actor-a", actorPermissions: ["payroll.runs.calculate", "compliance.documents.read"], stoppedModules: [] }
function client() {
  return {
    organizationAccountingSettings: { findUnique: jest.fn().mockResolvedValue({ accountingEnabled: true, setupStatus: "READY", updatedAt: now }) },
    chartOfAccount: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(2) },
    journal: { findMany: jest.fn().mockResolvedValue([]) }, accountingPeriod: { findMany: jest.fn().mockResolvedValue([]) },
    postingRule: { findMany: jest.fn().mockResolvedValue([]) }, postingRuleLine: { findMany: jest.fn().mockResolvedValue([]) },
    providerAccount: { findMany: jest.fn().mockResolvedValue([]) }, pOSStation: { findMany: jest.fn().mockResolvedValue([]) },
    payrollPeriod: { findFirst: jest.fn().mockResolvedValue(null) }, complianceAdapterConfig: { findFirst: jest.fn().mockResolvedValue(null) },
  }
}
const asTx = (value: ReturnType<typeof client>) => value as unknown as Prisma.TransactionClient
beforeEach(() => {
  jest.clearAllMocks()
  ;(collectAccountingSetupReadinessIssues as jest.Mock).mockResolvedValue([])
  ;(getPayrollSetupReadiness as jest.Mock).mockResolvedValue({ status: "READY", input: {}, checks: {}, blockers: [], warnings: [] })
  ;(resolveEInvoicingMetadata as jest.Mock).mockReturnValue({ packVersion: "1", capabilityStatus: "SANDBOX_SUPPORTED", combinedResolutionHash: "current-pack" })
})
it("hashes equivalent JSONB evidence identically while preserving values and array order", () => {
  expect(lifecycleEvidenceHash({ inventory: now, payroll: { status: "READY", version: 1 } })).toBe(lifecycleEvidenceHash({ payroll: { version: 1, status: "READY" }, inventory: now.toISOString() }))
  expect(lifecycleEvidenceHash({ rows: [1, 2] })).not.toBe(lifecycleEvidenceHash({ rows: [2, 1] }))
})

it("checks accounting once for shared dependencies and reports simultaneous provider gaps", async () => {
  const tx = client()
  ;(collectAccountingSetupReadinessIssues as jest.Mock).mockResolvedValue(["Missing open accounting period"])
  const results = await observeModulePreparationInTx(asTx(tx), { ...input, modules: ["accounting", "finance", "close_assurance", "payment_reconciliation"] }, now)
  expect(collectAccountingSetupReadinessIssues).toHaveBeenCalledTimes(1)
  expect(results.map(step => step.code)).toEqual(["ACCOUNTING_SETUP_REQUIRED", "PROVIDER_SETUP_REQUIRED"])
  expect(results.every(step => step.status === "WAITING_INPUT")).toBe(true)
})
it("does not mistake active provider count for approved, mapped reconciliation setup", async () => {
  const tx = client()
  const provider = { id: "provider-1", status: "ACTIVE", updatedAt: now, settlementLedgerAccountId: "ledger-a", suspenseLedgerAccountId: "ledger-b", paymentRail: { id: "rail-1", isActive: true }, settlementAccounts: [] }
  tx.providerAccount.findMany.mockResolvedValue([provider])
  const missing = await observeModulePreparationInTx(asTx(tx), { ...input, modules: ["payment_reconciliation"] }, now)
  expect(missing.find(step => step.moduleSlug === "payment_reconciliation")?.status).toBe("WAITING_INPUT")
  tx.providerAccount.findMany.mockResolvedValue([{ ...provider, settlementAccounts: [{ id: "approved-settlement", updatedAt: now }] }])
  const ready = await observeModulePreparationInTx(asTx(tx), { ...input, modules: ["payment_reconciliation"] }, now)
  expect(ready.find(step => step.moduleSlug === "payment_reconciliation")?.status).toBe("SUCCEEDED")
  expect(tx.providerAccount.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { organizationId: "org-a" }, select: expect.objectContaining({ settlementAccounts: expect.objectContaining({ where: expect.objectContaining({ approvalStatus: "APPROVED", effectiveFrom: { lte: now } }) }) }) }))
  tx.chartOfAccount.count.mockResolvedValue(1)
  const foreignLedger = await observeModulePreparationInTx(asTx(tx), { ...input, modules: ["payment_reconciliation"] }, now)
  expect(foreignLedger.find(step => step.moduleSlug === "payment_reconciliation")?.status).toBe("WAITING_INPUT")
})
it("requires a real active terminal and its declared drawer", async () => {
  const tx = client()
  tx.pOSStation.findMany.mockResolvedValue([{ id: "terminal-1", locationId: "location-1", updatedAt: now, hasCashDrawer: true, cashDrawers: [] }])
  const missing = await observeModulePreparationInTx(asTx(tx), { ...input, modules: ["pos"] }, now)
  expect(missing.find(step => step.moduleSlug === "pos")?.status).toBe("WAITING_INPUT")
  tx.pOSStation.findMany.mockResolvedValue([{ id: "terminal-1", locationId: "location-1", updatedAt: now, hasCashDrawer: false, cashDrawers: [] }])
  expect((await observeModulePreparationInTx(asTx(tx), { ...input, modules: ["pos"] }, now)).find(step => step.moduleSlug === "pos")?.status).toBe("SUCCEEDED")
})
it("passes actual tenant payroll dates and country to domain readiness and blocks unscoped or unauthorized checks", async () => {
  const tx = client()
  const period = { id: "period-a", countryCode: "CM", periodStart: new Date("2026-09-01"), periodEnd: new Date("2026-09-30"), payDate: new Date("2026-10-02"), updatedAt: now }
  tx.payrollPeriod.findFirst.mockResolvedValue(period)
  const scoped = { ...input, modules: ["payroll" as const], setupInputs: { payrollPeriodId: period.id } }
  const ready = await observeModulePreparationInTx(asTx(tx), scoped, now)
  expect(ready[0].status).toBe("SUCCEEDED")
  expect(getPayrollSetupReadiness).toHaveBeenCalledWith(expect.objectContaining({ countryCode: "CM", periodStart: period.periodStart, periodEnd: period.periodEnd, payDate: period.payDate, maxRows: 1000 }), tx)
  expect(tx.payrollPeriod.findFirst).toHaveBeenCalledWith({ where: { id: period.id, organizationId: "org-a", status: { not: "CLOSED" } } })
  ;(getPayrollSetupReadiness as jest.Mock).mockClear()
  expect((await observeModulePreparationInTx(asTx(tx), { ...scoped, actorPermissions: [] }, now))[0].status).toBe("WAITING_INPUT")
  expect(getPayrollSetupReadiness).not.toHaveBeenCalled()
  tx.payrollPeriod.findFirst.mockResolvedValue(null)
  expect((await observeModulePreparationInTx(asTx(tx), scoped, now))[0].status).toBe("WAITING_INPUT")
  expect(getPayrollSetupReadiness).not.toHaveBeenCalled()
})
it("verifies only the existing scoped sandbox and does not claim production compliance", async () => {
  const tx = client()
  const adapter = { id: "adapter-a", countryCode: "CM", authorityChannel: "CM_DGI_E_SERVICES", adapterKey: "CM_DGI_SANDBOX", environment: "SANDBOX", status: "ACTIVE", credentialReference: "vault://tenant-a/dgi", credentialExpiresAt: null, officialSpecHash: "hash", officialSpecVersion: "v1", officialSpecPublishedAt: now, officialSpecReference: "reference", reviewStatus: "EXPERT_APPROVED", reviewEvidenceHash: "review", reviewedAt: now, reviewedById: "reviewer", countryPackVersion: "1", capabilityStatus: "SANDBOX_SUPPORTED" }
  tx.complianceAdapterConfig.findFirst.mockResolvedValue(adapter)
  const scoped = { ...input, modules: ["compliance" as const], setupInputs: { complianceAdapterId: adapter.id } }
  const result = await observeModulePreparationInTx(asTx(tx), scoped, now)
  expect(result[0].code).toBe("COMPLIANCE_SANDBOX_VERIFIED")
  expect(result[0].evidence).not.toHaveProperty("credentialReference")
  tx.complianceAdapterConfig.findFirst.mockResolvedValue({ ...adapter, environment: "PRODUCTION" })
  expect((await observeModulePreparationInTx(asTx(tx), scoped, now))[0]).toEqual(expect.objectContaining({ status: "WAITING_INPUT", code: "COMPLIANCE_SCOPE_UNAVAILABLE" }))
})
it("binds operational scope changes while allowing setup status to be re-observed", async () => {
  const tx = client()
  const adapter = { id: "adapter-a", countryCode: "CM", authorityChannel: "DGI", environment: "SANDBOX", adapterKey: "CM_DGI_SANDBOX", status: "DRAFT" }
  tx.complianceAdapterConfig.findFirst.mockResolvedValue(adapter)
  const setup = { complianceAdapterId: adapter.id }
  const before = await moduleSetupScopeHashInTx(asTx(tx), "org-a", setup)
  tx.complianceAdapterConfig.findFirst.mockResolvedValue({ ...adapter, status: "ACTIVE" })
  expect(await moduleSetupScopeHashInTx(asTx(tx), "org-a", setup)).toBe(before)
  tx.complianceAdapterConfig.findFirst.mockResolvedValue({ ...adapter, environment: "PRODUCTION" })
  expect(await moduleSetupScopeHashInTx(asTx(tx), "org-a", setup)).not.toBe(before)
})
it("propagates readiness source failures instead of successful zero rows", async () => {
  const tx = client()
  tx.providerAccount.findMany.mockRejectedValue(new Error("provider database unavailable"))
  await expect(observeModulePreparationInTx(asTx(tx), { ...input, modules: ["payment_reconciliation"] }, now)).rejects.toThrow("provider database unavailable")
})
