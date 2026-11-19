// Boundary uses the REAL protect implementation; identity, entitlement and domain reads are mocked.
jest.mock("server-only", () => ({}))
jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error { constructor(message: string, public readonly code: string, public readonly status: number) { super(message) } }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn(), SESSION_ASSURANCE_LEVEL: { NONE: 0, PASSWORD: 1 } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/reconciliation/payment-reconciliation-dashboard.service", () => ({ getPaymentReconciliationDashboardData: jest.fn() }))
jest.mock("@/services/reconciliation/payment-reconciliation-certification.service", () => ({ exportReconciliationCertificate: jest.fn(), getReconciliationRunDetail: jest.fn(), signReconciliationRun: jest.fn() }))
jest.mock("@/services/reconciliation/payment-reconciliation-run.service", () => ({ approveManualMatch: jest.fn(), proposeManualMatch: jest.fn(), runPaymentReconciliation: jest.fn() }))
jest.mock("@/services/reconciliation/payment-suspense-workflow.service", () => ({ approveSuspensePosting: jest.fn(), assignPaymentSuspenseItem: jest.fn(), proposeSuspenseReclassification: jest.fn() }))
jest.mock("@/services/reconciliation/payment-suspense-read.service", () => ({ readPaymentSuspenseRecords: jest.fn() }))
jest.mock("@/services/reconciliation/payment-suspense-correction.service", () => ({ previewSuspenseCorrection: jest.fn(), proposeSuspenseCorrection: jest.fn(), reviewSuspenseCorrection: jest.fn(), decideSuspenseCorrection: jest.fn(), readSuspenseCorrectionHistory: jest.fn() }))
jest.mock("@/services/reconciliation/payment-suspense-correction-export.service", () => ({ exportSuspenseCorrection: jest.fn() }))
jest.mock("@/services/reconciliation/reconciliation-certificate-history.service", () => ({ readReconciliationCertificateHistory: jest.fn() }))
jest.mock("@/services/payments/adapters/mobile-money-hmac.adapter", () => ({ MobileMoneyHmacAdapter: jest.fn() }))
jest.mock("@/services/payments/statement-import.service", () => ({ importProviderStatement: jest.fn() }))

import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getPaymentReconciliationDashboardData } from "@/services/reconciliation/payment-reconciliation-dashboard.service"
import { getPaymentReconciliationDashboardAction } from "../reconciliation.actions"

const context = { orgId: "org-current", userId: "actor-current", permissions: ["payments.reconciliation.read"] }
beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(requirePermission).mockResolvedValue(context as Awaited<ReturnType<typeof requirePermission>>)
  jest.mocked(getPaymentReconciliationDashboardData).mockResolvedValue({ openAccountingPeriods: [{ id: "period-private", name: "June", startDate: "2026-06-01T00:00:00.000Z", endDate: "2026-06-30T23:59:59.999Z" }] } as Awaited<ReturnType<typeof getPaymentReconciliationDashboardData>>)
  jest.mocked(observeModuleAccess).mockResolvedValue({ allowed: true, result: "allow_read_only" } as Awaited<ReturnType<typeof observeModuleAccess>>)
})
it("denies suspended module reads before loading period or payment metadata", async () => {
  jest.mocked(observeModuleAccess).mockResolvedValue({ allowed: false, result: "deny" } as Awaited<ReturnType<typeof observeModuleAccess>>)
  expect(await getPaymentReconciliationDashboardAction()).toMatchObject({ success: false, data: null, status: 403 })
  expect(getPaymentReconciliationDashboardData).not.toHaveBeenCalled()
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: context.orgId, userId: context.userId, moduleSlug: "payment_reconciliation", mode: "enforce", accessIntent: "read" }))
})
it("binds allowed period metadata to server actor and tenant", async () => {
  expect(await getPaymentReconciliationDashboardAction()).toMatchObject({ success: true, data: { scope: { organizationId: context.orgId, actorId: context.userId }, openAccountingPeriods: [{ id: "period-private" }] } })
  expect(getPaymentReconciliationDashboardData).toHaveBeenCalledWith(context.orgId)
})
it("does not treat failed entitlement reads as an empty authorized period list", async () => {
  jest.mocked(observeModuleAccess).mockRejectedValue(new Error("Entitlement unavailable"))
  expect(await getPaymentReconciliationDashboardAction()).toMatchObject({ success: false, data: null, status: 500 })
  expect(getPaymentReconciliationDashboardData).not.toHaveBeenCalled()
})
it("denies missing current read authority before module or metadata access", async () => {
  jest.mocked(requirePermission).mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
  expect(await getPaymentReconciliationDashboardAction()).toMatchObject({ success: false, data: null, status: 403 })
  expect(observeModuleAccess).not.toHaveBeenCalled()
  expect(getPaymentReconciliationDashboardData).not.toHaveBeenCalled()
})
