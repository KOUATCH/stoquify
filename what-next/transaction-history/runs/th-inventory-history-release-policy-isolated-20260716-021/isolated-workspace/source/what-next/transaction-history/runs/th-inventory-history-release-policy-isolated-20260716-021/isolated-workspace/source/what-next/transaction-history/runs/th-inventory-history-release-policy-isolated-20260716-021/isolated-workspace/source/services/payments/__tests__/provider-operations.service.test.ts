import { ReconciliationRunStatus } from "@prisma/client"

import type { PaymentProviderAdapter } from "../payment-ingestion.types"
import { importProviderStatement } from "../statement-import.service"
import { ingestAndSignProviderStatement } from "../provider-operations.service"
import { runPaymentReconciliation } from "@/services/reconciliation/payment-reconciliation-run.service"
import { signReconciliationRun } from "@/services/reconciliation/payment-reconciliation-certification.service"

jest.mock("../statement-import.service", () => ({
  importProviderStatement: jest.fn(),
}))

jest.mock("@/services/reconciliation/payment-reconciliation-run.service", () => ({
  runPaymentReconciliation: jest.fn(),
}))

jest.mock("@/services/reconciliation/payment-reconciliation-certification.service", () => ({
  signReconciliationRun: jest.fn(),
}))

const mockImportProviderStatement = importProviderStatement as jest.MockedFunction<typeof importProviderStatement>
const mockRunPaymentReconciliation = runPaymentReconciliation as jest.MockedFunction<typeof runPaymentReconciliation>
const mockSignReconciliationRun = signReconciliationRun as jest.MockedFunction<typeof signReconciliationRun>

const adapter = {
  providerCode: "MTN_MOMO",
  railType: "MOBILE_MONEY",
  maxPayloadBytes: 1024,
  timestampToleranceSeconds: 300,
  canonicalPayload: jest.fn(),
  verifySignature: jest.fn(),
  parseEvent: jest.fn(),
  parseStatement: jest.fn(),
  fingerprintStatementLine: jest.fn(),
} satisfies PaymentProviderAdapter

describe("provider operations statement-to-signoff flow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockImportProviderStatement.mockResolvedValue({
      status: "IMPORTED",
      statementFileId: "statement-file-1",
      importedLineCount: 2,
      duplicateLineCount: 0,
      fileHash: "statement-hash",
      inboxItemId: "inbox-1",
      correlationId: "corr-1",
    })
    mockRunPaymentReconciliation.mockResolvedValue({
      runId: "run-1",
      status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
      matchCount: 2,
      exceptionCount: 0,
      suspenseCount: 0,
      suspenseAmount: "0.00",
      correlationId: "corr-1",
    })
    mockSignReconciliationRun.mockResolvedValue({
      runId: "run-1",
      status: ReconciliationRunStatus.SIGNED,
      certificateHash: "a".repeat(64),
      signedAt: "2026-06-15T12:00:00.000Z",
      correlationId: "corr-1",
    })
  })

  it("imports a provider statement, runs reconciliation, and signs clean evidence", async () => {
    const control = {
      actorPermissions: ["payments.reconciliation.sign"],
      lastAuthAt: new Date("2026-06-15T11:59:00.000Z"),
      now: new Date("2026-06-15T12:00:00.000Z"),
    }

    const result = await ingestAndSignProviderStatement({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawContent: "[]",
      fileName: "momo-2026-06-15.json",
      businessDate: new Date("2026-06-15T08:00:00.000Z"),
      importedById: "operator-1",
      runById: "runner-1",
      signedById: "signer-1",
      control,
      correlationId: "corr-1",
    })

    expect(result).toMatchObject({
      status: "SIGNED",
      correlationId: "corr-1",
      statement: { statementFileId: "statement-file-1", importedLineCount: 2 },
      reconciliationRun: { runId: "run-1", status: ReconciliationRunStatus.READY_FOR_SIGNOFF },
      signoff: { runId: "run-1", status: ReconciliationRunStatus.SIGNED },
    })
    expect(mockImportProviderStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        providerAccountId: "provider-account-1",
        adapter,
        rawContent: "[]",
        fileName: "momo-2026-06-15.json",
        importedById: "operator-1",
        correlationId: "corr-1",
      }),
    )
    expect(mockRunPaymentReconciliation).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        providerAccountId: "provider-account-1",
        runById: "runner-1",
        correlationId: "corr-1",
      }),
    )
    expect(mockSignReconciliationRun).toHaveBeenCalledWith({
      organizationId: "org-1",
      runId: "run-1",
      signedById: "signer-1",
      control,
      correlationId: "corr-1",
    })
  })

  it("rejects self sign-off before importing provider evidence", async () => {
    await expect(
      ingestAndSignProviderStatement({
        organizationId: "org-1",
        providerAccountId: "provider-account-1",
        adapter,
        rawContent: "[]",
        businessDate: new Date("2026-06-15T08:00:00.000Z"),
        runById: "operator-1",
        signedById: "operator-1",
        control: { actorPermissions: ["payments.reconciliation.sign"] },
      }),
    ).rejects.toThrow(/independent signer/i)

    expect(mockImportProviderStatement).not.toHaveBeenCalled()
    expect(mockRunPaymentReconciliation).not.toHaveBeenCalled()
    expect(mockSignReconciliationRun).not.toHaveBeenCalled()
  })
})
