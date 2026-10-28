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
import { getPaymentReconciliationDashboardData } from "@/services/reconciliation/payment-reconciliation-dashboard.service"
import { getReconciliationRunDetail } from "@/services/reconciliation/payment-reconciliation-certification.service"
import { getPaymentReconciliationWorkbenchAction } from "../reconciliation-workbench.actions"
import { getPaymentReconciliationDashboardAction, getReconciliationRunDetailAction } from "../reconciliation.actions"

const mockGetPaymentReconciliationWorkbench = getPaymentReconciliationWorkbench as jest.Mock
const mockGetPaymentReconciliationDashboardData = getPaymentReconciliationDashboardData as jest.Mock
const mockGetReconciliationRunDetail = getReconciliationRunDetail as jest.Mock

function protectOptions() {
  return ((globalThis as typeof globalThis & { __paymentReconProtectOptions?: Array<Record<string, unknown>> })
    .__paymentReconProtectOptions ?? [])
}

describe("payment reconciliation action RBAC", () => {
  beforeEach(() => {
    mockGetPaymentReconciliationWorkbench.mockReset()
    mockGetPaymentReconciliationWorkbench.mockResolvedValue({ kind: "workbench" })
    mockGetPaymentReconciliationDashboardData.mockReset()
    mockGetPaymentReconciliationDashboardData.mockResolvedValue({ kind: "durable-dashboard" })
    mockGetReconciliationRunDetail.mockReset()
    mockGetReconciliationRunDetail.mockResolvedValue({ kind: "run-detail" })
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

  it("lets the durable reconciliation dashboard read action use the session tenant only", async () => {
    const result = await getPaymentReconciliationDashboardAction({ organizationId: "attacker-org" })

    expect(result).toEqual({ success: true, data: { kind: "durable-dashboard" }, error: null, status: 200 })
    expect(mockGetPaymentReconciliationDashboardData).toHaveBeenCalledWith("org-session")
    expect(protectOptions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ permission: "payments.reconciliation.read", auditResource: "PaymentReconciliation" }),
      ]),
    )
  })

  it("lets the run detail proof read action use the session tenant only", async () => {
    const result = await getReconciliationRunDetailAction({ organizationId: "attacker-org", runId: "run-1" })

    expect(result).toEqual({ success: true, data: { kind: "run-detail" }, error: null, status: 200 })
    expect(mockGetReconciliationRunDetail).toHaveBeenCalledWith("org-session", "run-1")
    expect(protectOptions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ permission: "payments.reconciliation.read", auditResource: "PaymentReconciliationRun" }),
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