import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { approveSuspensePosting, assignPaymentSuspenseItem, proposeSuspenseReclassification } from "@/services/reconciliation/payment-suspense-workflow.service"
import { approveSuspensePostingAction, assignPaymentSuspenseItemAction, proposeSuspenseReclassificationAction } from "../reconciliation.actions"

// Exercise the actual actions through the actual protect wrapper. Only identity,
// entitlement lookup and domain effects are replaced at their external boundaries.
jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error {
    constructor(message: string, public code: string, public status: number) { super(message) }
  }
  return { RbacError, isRbacError: (e: unknown) => e instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => {
  class FreshAuthRequiredError extends Error {}
  return { FreshAuthRequiredError, requireFreshAuth: jest.fn(), SESSION_ASSURANCE_LEVEL: { NONE: 0, PASSWORD: 1 } }
})
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/reconciliation/payment-reconciliation-dashboard.service", () => ({ getPaymentReconciliationDashboardData: jest.fn() }))
jest.mock("@/services/reconciliation/payment-reconciliation-certification.service", () => ({ exportReconciliationCertificate: jest.fn(), getReconciliationRunDetail: jest.fn(), signReconciliationRun: jest.fn() }))
jest.mock("@/services/reconciliation/payment-reconciliation-run.service", () => ({ approveManualMatch: jest.fn(), proposeManualMatch: jest.fn(), runPaymentReconciliation: jest.fn() }))
jest.mock("@/services/reconciliation/payment-suspense-workflow.service", () => ({ approveSuspensePosting: jest.fn(), assignPaymentSuspenseItem: jest.fn(), proposeSuspenseReclassification: jest.fn() }))
jest.mock("@/services/payments/adapters/mobile-money-hmac.adapter", () => ({ MobileMoneyHmacAdapter: jest.fn() }))
jest.mock("@/services/payments/statement-import.service", () => ({ importProviderStatement: jest.fn() }))

const owners = [assignPaymentSuspenseItem, proposeSuspenseReclassification, approveSuspensePosting] as jest.Mock[]
const authAt = new Date("2026-09-09T01:00:00Z")
const claims = { userId: "actor", tenantId: "tenant", assuranceOrganizationId: "tenant", assuranceLevel: 1, lastAuthAt: authAt.getTime() }
describe("suspense actions through the real protection wrapper", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue({ userId: "actor", orgId: "tenant", permissions: ["payments.reconciliation.suspense.post"] })
    ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims })
    ;(assertCanUseOrganization as jest.Mock).mockResolvedValue(true)
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
    owners.forEach(owner => owner.mockResolvedValue({ suspenseItemId: "item" }))
  })

  it.each([
    ["assignment", assignPaymentSuspenseItemAction, { suspenseItemId: "item" }],
    ["proposal", proposeSuspenseReclassificationAction, { suspenseItemId: "item", expectedEvidenceRevision: `sha256:${"a".repeat(64)}`, idempotencyKey: "owned-proposal-request", targetType: "UNKNOWN_CREDIT", reason: "Review source evidence" }],
    ["approval", approveSuspensePostingAction, { suspenseItemId: "item", expectedEvidenceRevision: `sha256:${"a".repeat(64)}` }],
  ] as const)("denies %s before domain effects when module writes are denied", async (_name, action, input) => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
    expect(await action(input)).toMatchObject({ success: false, status: 403, code: "FORBIDDEN" })
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "tenant", userId: "actor", moduleSlug: "payment_reconciliation", accessIntent: "write", mode: "enforce" }))
    owners.forEach(owner => expect(owner).not.toHaveBeenCalled())
  })

  it("stops approval when fresh authentication fails", async () => {
    ;(requireFreshAuth as jest.Mock).mockRejectedValue(new FreshAuthRequiredError())
    expect(await approveSuspensePostingAction({ suspenseItemId: "item", expectedEvidenceRevision: `sha256:${"a".repeat(64)}` })).toMatchObject({ success: false, status: 403, code: "FRESH_AUTH_REQUIRED" })
    expect(approveSuspensePosting).not.toHaveBeenCalled()
  })

  it("rejects assurance for a different tenant without calling the owner", async () => {
    ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { ...claims, assuranceOrganizationId: "foreign" } })
    expect(await approveSuspensePostingAction({ suspenseItemId: "item", expectedEvidenceRevision: `sha256:${"a".repeat(64)}` })).toMatchObject({ success: false, status: 403, code: "FRESH_AUTH_REQUIRED" })
    expect(approveSuspensePosting).not.toHaveBeenCalled()
  })

  it("forwards verified identity and original authentication time on permitted approval", async () => {
    expect(await approveSuspensePostingAction({ suspenseItemId: "item", expectedEvidenceRevision: `sha256:${"a".repeat(64)}` })).toMatchObject({ success: true })
    expect(approveSuspensePosting).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "tenant", approvedById: "actor", control: { actorPermissions: ["payments.reconciliation.suspense.post"], lastAuthAt: authAt } }))
  })
})
