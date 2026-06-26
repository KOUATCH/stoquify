jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & { __paymentReconProtectOptions?: Array<Record<string, unknown>> }
    store.__paymentReconProtectOptions = store.__paymentReconProtectOptions ?? []
    store.__paymentReconProtectOptions.push(options)

    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["payments.reconciliation.read"],
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/payments/payment-reconciliation-workbench.service", () => ({
  getPaymentReconciliationWorkbench: jest.fn(),
}))

jest.mock("@/services/reconciliation/payment-reconciliation-dashboard.service", () => ({
  getPaymentReconciliationDashboardData: jest.fn(),
}))

jest.mock("@/services/reconciliation/payment-reconciliation-certification.service", () => ({
  exportReconciliationCertificate: jest.fn(),
  getReconciliationRunDetail: jest.fn(),
  signReconciliationRun: jest.fn(),
}))

jest.mock("@/services/reconciliation/payment-reconciliation-run.service", () => ({
  approveManualMatch: jest.fn(),
  proposeManualMatch: jest.fn(),
  runPaymentReconciliation: jest.fn(),
}))

jest.mock("@/services/reconciliation/payment-suspense-workflow.service", () => ({
  approveSuspensePosting: jest.fn(),
  assignPaymentSuspenseItem: jest.fn(),
  proposeSuspenseReclassification: jest.fn(),
}))

jest.mock("@/services/payments/adapters/mobile-money-hmac.adapter", () => ({
  MobileMoneyHmacAdapter: jest.fn().mockImplementation((providerCode: string) => ({ providerCode })),
}))

jest.mock("@/services/payments/statement-import.service", () => ({
  importProviderStatement: jest.fn(),
}))

import { getPaymentReconciliationWorkbench } from "@/services/payments/payment-reconciliation-workbench.service"
import { getPaymentReconciliationWorkbenchAction } from "../reconciliation-workbench.actions"
import "../reconciliation.actions"

const mockGetPaymentReconciliationWorkbench = getPaymentReconciliationWorkbench as jest.Mock

function protectOptions() {
  return ((globalThis as typeof globalThis & { __paymentReconProtectOptions?: Array<Record<string, unknown>> })
    .__paymentReconProtectOptions ?? [])
}

describe("payment reconciliation action RBAC", () => {
  beforeEach(() => {
    mockGetPaymentReconciliationWorkbench.mockReset()
    mockGetPaymentReconciliationWorkbench.mockResolvedValue({ kind: "workbench" })
  })

  it("lets the reconciliation workbench read model use read-only permission and tenant context", async () => {
    const result = await getPaymentReconciliationWorkbenchAction({ organizationId: "attacker-org" })

    expect(result).toEqual({ success: true, data: { kind: "workbench" }, error: null, status: 200 })
    expect(mockGetPaymentReconciliationWorkbench).toHaveBeenCalledWith({
      organizationId: "org-session",
      period: "mtd",
    })
    expect(protectOptions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ permission: "payments.reconciliation.read", auditResource: "PaymentReconciliation" }),
      ]),
    )
  })

  it("keeps reconciliation mutations on elevated permissions", () => {
    expect(protectOptions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ permission: "payments.reconciliation.import" }),
        expect.objectContaining({ permission: "payments.reconciliation.run" }),
        expect.objectContaining({ permission: "payments.reconciliation.match" }),
        expect.objectContaining({ permission: "payments.reconciliation.override", freshAuth: true }),
        expect.objectContaining({ permission: "payments.reconciliation.exception.assign" }),
        expect.objectContaining({ permission: "payments.reconciliation.suspense.propose" }),
        expect.objectContaining({ permission: "payments.reconciliation.suspense.post", freshAuth: true }),
        expect.objectContaining({ permission: "payments.reconciliation.sign", freshAuth: true }),
        expect.objectContaining({ permission: "payments.reconciliation.certificate.export", freshAuth: true }),
      ]),
    )
  })
})