jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {
    constructor() {
      super("Fresh authentication required")
      this.name = "FreshAuthRequiredError"
    }
  },
  SESSION_ASSURANCE_LEVEL: {
    NONE: 0,
    PASSWORD: 1,
  },
}))


jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __paymentReconProtectOptions?: Array<Record<string, unknown>>
      __paymentReconProtectContext?: Record<string, unknown>
    }
    store.__paymentReconProtectOptions = store.__paymentReconProtectOptions ?? []
    store.__paymentReconProtectOptions.push(options)

    return async (input: unknown) => {
      const authAt = new Date("2026-06-14T12:00:00Z")
      const context =
        store.__paymentReconProtectContext ??
        {
          orgId: "org-session",
          userId: "user-session",
          permissions: [
            "payments.reconciliation.read",
            "payments.reconciliation.sign",
          ],
          freshAuth: {
            lastAuthAt: authAt,
            claims: {
              userId: "user-session",
              tenantId: "org-session",
              assuranceOrganizationId: "org-session",
              assuranceLevel: 1,
              lastAuthAt: authAt.getTime(),
            },
          },
        }
      const data = await handler(input, context)

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
import { signReconciliationRun } from "@/services/reconciliation/payment-reconciliation-certification.service"
import { getPaymentReconciliationWorkbenchAction } from "../reconciliation-workbench.actions"
import { signReconciliationRunAction } from "../reconciliation.actions"

const mockGetPaymentReconciliationWorkbench = getPaymentReconciliationWorkbench as jest.Mock

const mockSignReconciliationRun = signReconciliationRun as jest.Mock

function setPaymentReconProtectContext(
  assuranceOrganizationId = "org-session",
) {
  const authAt = new Date("2026-06-14T12:00:00Z")
  const store = globalThis as typeof globalThis & {
    __paymentReconProtectContext?: Record<string, unknown>
  }
  store.__paymentReconProtectContext = {
    orgId: "org-session",
    userId: "user-session",
    permissions: [
      "payments.reconciliation.read",
      "payments.reconciliation.sign",
    ],
    freshAuth: {
      lastAuthAt: authAt,
      claims: {
        userId: "user-session",
        tenantId: "org-session",
        assuranceOrganizationId,
        assuranceLevel: 1,
        lastAuthAt: authAt.getTime(),
      },
    },
  }
  return authAt
}


function protectOptions() {
  return ((globalThis as typeof globalThis & { __paymentReconProtectOptions?: Array<Record<string, unknown>> })
    .__paymentReconProtectOptions ?? [])
}

describe("payment reconciliation action RBAC", () => {
  beforeEach(() => {
    mockGetPaymentReconciliationWorkbench.mockReset()
    mockGetPaymentReconciliationWorkbench.mockResolvedValue({ kind: "workbench" })
    mockSignReconciliationRun.mockReset()
    mockSignReconciliationRun.mockResolvedValue({ kind: "signed" })
    setPaymentReconProtectContext()
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
        expect.objectContaining({
          permission: "payments.reconciliation.sign",
          freshAuth: { maxAgeSeconds: 300 },
          module: {
            moduleSlug: "payment_reconciliation",
            surface: "actions/payments/reconciliation.actions.ts",
            surfaceType: "action",
            accessIntent: "write",
            mode: "enforce",
            audit: true,
          },
        }),
        expect.objectContaining({ permission: "payments.reconciliation.certificate.export", freshAuth: true }),
      ]),
    )
  })

  it("passes verified fresh-auth provenance and source evidence to the sign service", async () => {
    const expectedSourceVersionHash = `sha256:${"a".repeat(64)}`

    const result = await signReconciliationRunAction({
      runId: "run-1",
      expectedSourceVersionHash,
      correlationId: "corr-sign",
    })

    expect(result).toEqual({
      success: true,
      data: { kind: "signed" },
      error: null,
      status: 200,
    })
    expect(mockSignReconciliationRun).toHaveBeenCalledWith({
      organizationId: "org-session",
      runId: "run-1",
      signedById: "user-session",
      expectedSourceVersionHash,
      control: {
        actorPermissions: [
          "payments.reconciliation.read",
          "payments.reconciliation.sign",
        ],
        lastAuthAt: new Date("2026-06-14T12:00:00Z"),
      },
      correlationId: "corr-sign",
    })
  })

  it("rejects mismatched session assurance provenance before calling the sign service", async () => {
    setPaymentReconProtectContext("other-org")

    await expect(
      signReconciliationRunAction({ runId: "run-1" }),
    ).rejects.toMatchObject({ name: "FreshAuthRequiredError" })

    expect(mockSignReconciliationRun).not.toHaveBeenCalled()
  })

  it("rejects malformed source evidence before calling the sign service", async () => {
    await expect(
      signReconciliationRunAction({
        runId: "run-1",
        expectedSourceVersionHash: "invalid",
      }),
    ).rejects.toThrow()

    expect(mockSignReconciliationRun).not.toHaveBeenCalled()
  })

})