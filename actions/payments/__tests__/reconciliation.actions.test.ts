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

jest.mock("@/services/reconciliation/payment-suspense-read.service", () => ({
  ...jest.requireActual("@/services/reconciliation/payment-suspense-read.service"),
  readPaymentSuspenseRecords: jest.fn(),
}))

jest.mock("@/services/reconciliation/payment-reconciliation-certification.service", () => ({
  exportReconciliationCertificate: jest.fn(),
  getReconciliationRunDetail: jest.fn(),
  signReconciliationRun: jest.fn(),
}))
jest.mock("@/services/reconciliation/reconciliation-certificate-history.service", () => ({ readReconciliationCertificateHistory: jest.fn() }))
import { readReconciliationCertificateHistory } from "@/services/reconciliation/reconciliation-certificate-history.service"
import { readReconciliationCertificateHistoryAction } from "../reconciliation.actions"

it("keeps certificate history tenant and actor server-derived with read module enforcement", async () => {
  setPaymentReconProtectContext()
  await readReconciliationCertificateHistoryAction({ kind: "runs", search: "provider" })
  expect(readReconciliationCertificateHistory).toHaveBeenCalledWith({ kind: "runs", search: "provider" }, expect.objectContaining({ organizationId: "org-session", actorId: "user-session" }))
  expect(protectOptions()).toContainEqual(expect.objectContaining({ auditResource: "ReconciliationCertificateHistory", permission: "payments.reconciliation.read", module: expect.objectContaining({ accessIntent: "read", mode: "enforce" }) }))
  await expect(readReconciliationCertificateHistoryAction({ kind: "runs", organizationId: "foreign" })).rejects.toThrow()
})

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
jest.mock("@/services/reconciliation/payment-suspense-correction.service", () => ({
  previewSuspenseCorrection: jest.fn(), proposeSuspenseCorrection: jest.fn(), reviewSuspenseCorrection: jest.fn(),
  decideSuspenseCorrection: jest.fn(), readSuspenseCorrectionHistory: jest.fn(),
}))
import { decideSuspenseCorrection, previewSuspenseCorrection } from "@/services/reconciliation/payment-suspense-correction.service"
jest.mock("@/services/reconciliation/payment-suspense-correction-export.service", () => ({ exportSuspenseCorrection: jest.fn() }))
import { exportSuspenseCorrection } from "@/services/reconciliation/payment-suspense-correction-export.service"
import { exportSuspenseCorrectionAction } from "../reconciliation.actions"
import { decideSuspenseCorrectionAction, previewSuspenseCorrectionAction } from "../reconciliation.actions"

import { getPaymentReconciliationWorkbench } from "@/services/payments/payment-reconciliation-workbench.service"
import { getReconciliationRunDetail, signReconciliationRun, exportReconciliationCertificate } from "@/services/reconciliation/payment-reconciliation-certification.service"
import { exportReconciliationCertificateAction } from "../reconciliation.actions"
import { getPaymentReconciliationWorkbenchAction } from "../reconciliation-workbench.actions"
import { getReconciliationRunDetailAction, signReconciliationRunAction, proposeManualMatchAction, approveManualMatchAction, approveSuspensePostingAction } from "../reconciliation.actions"
import { approveSuspensePosting } from "@/services/reconciliation/payment-suspense-workflow.service"
import { getPaymentReconciliationDashboardData } from "@/services/reconciliation/payment-reconciliation-dashboard.service"
import { getPaymentReconciliationDashboardAction } from "../reconciliation.actions"
import { getPaymentSuspenseRecordsAction } from "../reconciliation.actions"
import { readPaymentSuspenseRecords } from "@/services/reconciliation/payment-suspense-read.service"
import { proposeManualMatch, approveManualMatch } from "@/services/reconciliation/payment-reconciliation-run.service"

const mockGetPaymentReconciliationWorkbench = getPaymentReconciliationWorkbench as jest.Mock
const mockGetPaymentReconciliationDashboardData = getPaymentReconciliationDashboardData as jest.Mock
const mockGetReconciliationRunDetail = getReconciliationRunDetail as jest.Mock

const mockSignReconciliationRun = signReconciliationRun as jest.Mock

it("keeps the actual certificate-export authentication age and rejects mismatched provenance before issuing bytes", async () => {
  const lastAuthAt = setPaymentReconProtectContext()
  const command = { runId: "run", expectedCertificateHash: "a".repeat(64), idempotencyKey: "abcde123-1234-4123-8123-abcdef123456" }
  ;(exportReconciliationCertificate as jest.Mock).mockResolvedValue({ inboxItemId: "receipt" })
  expect(await exportReconciliationCertificateAction(command)).toMatchObject({ success: true, data: { scope: { organizationId: "org-session", actorId: "user-session" } } })
  expect(exportReconciliationCertificate).toHaveBeenCalledWith(expect.objectContaining({ ...command, organizationId: "org-session", exportedById: "user-session", control: expect.objectContaining({ lastAuthAt }) }))
  ;(exportReconciliationCertificate as jest.Mock).mockClear()
  setPaymentReconProtectContext("foreign")
  try { await expect(exportReconciliationCertificateAction(command)).rejects.toThrow("Fresh authentication required"); expect(exportReconciliationCertificate).not.toHaveBeenCalled() }
  finally { setPaymentReconProtectContext() }
  await expect(exportReconciliationCertificateAction({ ...command, actorId: "forged" })).rejects.toThrow()
  await expect(exportReconciliationCertificateAction({ runId: "run" })).rejects.toThrow()
  expect(exportReconciliationCertificate).not.toHaveBeenCalled()
})

it("exports correction evidence using verified authentication, server scope and a retained-read module gate", async () => {
  const lastAuthAt = setPaymentReconProtectContext()
  const command = { suspenseItemId: "owned", recordId: "record", expectedRevision: "sha256:" + "a".repeat(64), idempotencyKey: "abcde123-1234-4123-8123-abcdef123456" }
  ;(exportSuspenseCorrection as jest.Mock).mockResolvedValue({ receiptId: "issued" })
  expect(await exportSuspenseCorrectionAction(command)).toMatchObject({ success: true, data: { receiptId: "issued", scope: { organizationId: "org-session", actorId: "user-session" } } })
  expect(exportSuspenseCorrection).toHaveBeenCalledWith(command, expect.objectContaining({ lastAuthAt, organizationId: "org-session", actorId: "user-session" }))
  expect(protectOptions()).toContainEqual(expect.objectContaining({ permission: "payments.export", freshAuth: { maxAgeSeconds: 300 }, auditAllowed: true, module: expect.objectContaining({ accessIntent: "read", mode: "enforce" }) }))
  ;(exportSuspenseCorrection as jest.Mock).mockClear()
  setPaymentReconProtectContext("foreign")
  try { await expect(exportSuspenseCorrectionAction(command)).rejects.toThrow("Fresh authentication required"); expect(exportSuspenseCorrection).not.toHaveBeenCalled() }
  finally { setPaymentReconProtectContext() }
  await expect(exportSuspenseCorrectionAction({ ...command, organizationId: "foreign" })).rejects.toThrow()
  expect(exportSuspenseCorrection).not.toHaveBeenCalled()
})

it("binds correction previews to server identity and rejects client authority fields", async () => {
  setPaymentReconProtectContext()
  ;(previewSuspenseCorrection as jest.Mock).mockResolvedValue({ revision: "sha256:" + "a".repeat(64) })
  const draft = { suspenseItemId: "owned", reason: "Source requires correction", reversalDate: "2026-09-09" }
  const result = await previewSuspenseCorrectionAction(draft)
  expect(previewSuspenseCorrection).toHaveBeenCalledWith(draft, expect.objectContaining({ organizationId: "org-session", actorId: "user-session" }))
  expect(result).toMatchObject({ success: true, data: { scope: { organizationId: "org-session", actorId: "user-session" } } })
  await expect(previewSuspenseCorrectionAction({ ...draft, organizationId: "foreign", actorId: "forged" })).rejects.toThrow()
})

it("passes only verified fresh-auth provenance to correction decisions and enforces write metadata", async () => {
  const lastAuthAt = setPaymentReconProtectContext()
  const command = { suspenseItemId: "owned", proposalId: "proposal", expectedRevision: "sha256:" + "a".repeat(64), decision: "APPROVE", reason: "Independently reviewed" }
  ;(decideSuspenseCorrection as jest.Mock).mockResolvedValue({ receiptId: "receipt", outcome: "REOPENED", replayed: false })
  await decideSuspenseCorrectionAction(command)
  expect(decideSuspenseCorrection).toHaveBeenCalledWith(command, expect.objectContaining({ organizationId: "org-session", actorId: "user-session", lastAuthAt }))
  expect(protectOptions()).toContainEqual(expect.objectContaining({ permission: "payments.reconciliation.suspense.post", freshAuth: { maxAgeSeconds: 300 }, module: expect.objectContaining({ accessIntent: "write", mode: "enforce" }) }))
  ;(decideSuspenseCorrection as jest.Mock).mockClear()
  setPaymentReconProtectContext("foreign")
  try { await expect(decideSuspenseCorrectionAction(command)).rejects.toThrow("Fresh authentication required"); expect(decideSuspenseCorrection).not.toHaveBeenCalled() }
  finally { setPaymentReconProtectContext() }
})

it("binds history lookup to protected identity and a read module gate", async () => {
  ;(readPaymentSuspenseRecords as jest.Mock).mockResolvedValue({ items: [], nextCursor: null, asOf: "2026-09-09T00:00:00Z" })
  const result = await getPaymentSuspenseRecordsAction({ itemId: "retained" })
  expect(readPaymentSuspenseRecords).toHaveBeenCalledWith("org-session", { itemId: "retained" })
  expect(result).toMatchObject({ success: true, data: { scope: { organizationId: "org-session", actorId: "user-session" } } })
  expect(protectOptions()).toContainEqual(expect.objectContaining({ permission: "payments.reconciliation.read", auditResource: "SuspenseItem", module: expect.objectContaining({ moduleSlug: "payment_reconciliation", accessIntent: "read", mode: "enforce" }) }))
})

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
  it("enforces current write entitlement for both manual mutation actions", () => {
    for (const permission of ["payments.reconciliation.match", "payments.reconciliation.override"]) {
      expect(protectOptions()).toEqual(expect.arrayContaining([expect.objectContaining({
        permission,
        module: expect.objectContaining({ moduleSlug: "payment_reconciliation", accessIntent: "write", mode: "enforce", audit: true }),
      })]))
    }
  })
  beforeEach(() => {
    ;(approveSuspensePosting as jest.Mock).mockReset()
    ;(proposeManualMatch as jest.Mock).mockReset()
    ;(approveManualMatch as jest.Mock).mockReset()
    mockGetPaymentReconciliationWorkbench.mockReset()
    mockGetPaymentReconciliationWorkbench.mockResolvedValue({ kind: "workbench" })
    mockGetPaymentReconciliationDashboardData.mockReset()
    mockGetPaymentReconciliationDashboardData.mockResolvedValue({ kind: "durable-dashboard" })
    mockGetReconciliationRunDetail.mockReset()
    mockGetReconciliationRunDetail.mockResolvedValue({ kind: "run-detail" })
    mockSignReconciliationRun.mockReset()
    mockSignReconciliationRun.mockResolvedValue({ kind: "signed" })
    setPaymentReconProtectContext()
  })

  it("lets the reconciliation workbench read model use read-only permission and tenant context", async () => {
    const result = await getPaymentReconciliationWorkbenchAction({ organizationId: "attacker-org" })

    expect(result).toEqual({ success: true, data: { kind: "workbench", scope: { actorId: "user-session", organizationId: "org-session" } }, error: null, status: 200 })
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

    expect(result).toEqual({ success: true, data: { kind: "durable-dashboard", scope: { actorId: "user-session", organizationId: "org-session" } }, error: null, status: 200 })
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
        expect.objectContaining({ permission: "payments.reconciliation.certificate.export", freshAuth: { maxAgeSeconds: 300 }, module: expect.objectContaining({ accessIntent: "read", mode: "enforce" }) }),
      ]),
    )
  })

  it("binds recovery scope to protected identity rather than caller-supplied tenant and actor", async () => {
    ;(getPaymentReconciliationDashboardData as jest.Mock).mockResolvedValueOnce({ suspenseQueue: [] })
    const result = await getPaymentReconciliationDashboardAction({ organizationId: "foreign", actorId: "foreign" })
    expect(result).toEqual(expect.objectContaining({ success: true, data: { suspenseQueue: [], scope: { organizationId: "org-session", actorId: "user-session" } } }))
    expect(getPaymentReconciliationDashboardData).toHaveBeenCalledWith("org-session")
  })

  it("enforces current write entitlement for all suspense mutations", () => {
    for (const permission of ["payments.reconciliation.exception.assign", "payments.reconciliation.suspense.propose", "payments.reconciliation.suspense.post"]) {
      expect(protectOptions()).toEqual(expect.arrayContaining([expect.objectContaining({
        permission,
        module: expect.objectContaining({ moduleSlug: "payment_reconciliation", accessIntent: "write", mode: "enforce", audit: true }),
      })]))
    }
  })

  it("passes verified authentication evidence to suspense approval instead of resetting its age", async () => {
    const authAt = setPaymentReconProtectContext()
    await approveSuspensePostingAction({ suspenseItemId: "suspense-1", expectedEvidenceRevision: `sha256:${"a".repeat(64)}`, approvedById: "forged", organizationId: "foreign", control: { lastAuthAt: Date.now() } })
    expect(approveSuspensePosting).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-session", approvedById: "user-session",
      control: expect.objectContaining({ lastAuthAt: authAt }),
    }))
  })

  it("rejects foreign authentication provenance before suspense approval", async () => {
    setPaymentReconProtectContext("foreign")
    await expect(approveSuspensePostingAction({ suspenseItemId: "suspense-1", expectedEvidenceRevision: `sha256:${"a".repeat(64)}` })).rejects.toMatchObject({ name: "FreshAuthRequiredError" })
    expect(approveSuspensePosting).not.toHaveBeenCalled()
  })

  it("passes verified fresh-auth provenance and source evidence to the sign service", async () => {
    const expectedSourceVersionHash = `sha256:${"a".repeat(64)}`
    const expectedEvidenceRevision = `sha256:${"b".repeat(64)}`

    const result = await signReconciliationRunAction({
      runId: "run-1",
      expectedSourceVersionHash,
      expectedEvidenceRevision,
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
      expectedEvidenceRevision,
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
      signReconciliationRunAction({ runId: "run-1", expectedSourceVersionHash: `sha256:${"a".repeat(64)}`, expectedEvidenceRevision: `sha256:${"b".repeat(64)}` }),
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

  it.each(["expectedSourceVersionHash", "expectedEvidenceRevision"])("requires the reviewed %s at the canonical action boundary", async missing => {
    const input: Record<string, string> = { runId: "run-1", expectedSourceVersionHash: `sha256:${"a".repeat(64)}`, expectedEvidenceRevision: `sha256:${"b".repeat(64)}` }
    delete input[missing]
    await expect(signReconciliationRunAction(input)).rejects.toThrow()
    expect(mockSignReconciliationRun).not.toHaveBeenCalled()
  })

  it("uses server identity and permissions for proposal and carries its retry and replacement references", async () => {
    await proposeManualMatchAction({ organizationId: "foreign", proposedById: "forged", control: { actorPermissions: ["forged"] }, providerAccountId: "pa1", paymentTransactionId: "p1", providerEventId: "e1", amountMatched: "60.00", idempotencyKey: "manual-action-request-01", supersedesProposalId: "old-proposal" })
    expect(proposeManualMatch).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", proposedById: "user-session", idempotencyKey: "manual-action-request-01", supersedesProposalId: "old-proposal", control: { actorPermissions: ["payments.reconciliation.read", "payments.reconciliation.sign"] } }))
  })
  it("requires a stable key before calling the proposal owner", async () => {
    await expect(proposeManualMatchAction({ providerAccountId: "pa1", paymentTransactionId: "p1", providerEventId: "e1", amountMatched: "60.00" })).rejects.toThrow()
    expect(proposeManualMatch).not.toHaveBeenCalled()
  })
  it("passes verified authentication time and reviewed evidence to manual approval", async () => {
    const revision = `sha256:${"b".repeat(64)}`
    await approveManualMatchAction({ proposedMatchId: "proposal-1", expectedEvidenceRevision: revision, approvedById: "forged", organizationId: "foreign", control: { lastAuthAt: Date.now() } })
    expect(approveManualMatch).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", approvedById: "user-session", expectedEvidenceRevision: revision, control: { actorPermissions: ["payments.reconciliation.read", "payments.reconciliation.sign"], lastAuthAt: new Date("2026-06-14T12:00:00Z") } }))
  })
  it("rejects foreign authentication provenance before manual approval", async () => {
    setPaymentReconProtectContext("other-org")
    await expect(approveManualMatchAction({ proposedMatchId: "proposal-1", expectedEvidenceRevision: `sha256:${"c".repeat(64)}` })).rejects.toMatchObject({ name: "FreshAuthRequiredError" })
    expect(approveManualMatch).not.toHaveBeenCalled()
  })

})
