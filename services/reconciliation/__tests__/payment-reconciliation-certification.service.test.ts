jest.mock("server-only", () => ({}))

import {
  AccountingPeriodStatus,
  ProviderAccountStatus,
  ReconciliationRunStatus,
  Prisma,
} from "@prisma/client"
import { createHash } from "node:crypto"

import { db } from "@/prisma/db"
import { buildReconciliationEvidenceManifestInTx } from "../payment-reconciliation-evidence.service"
import { buildPaymentReconciliationSignOffSourceVersionHash } from "../payment-reconciliation-sign-off-source-version"
import { assertPaymentSuspenseLedgerTruthInTx } from "../payment-suspense-ledger.service"

import {
  exportReconciliationCertificate,
  signReconciliationRun,
  type SignReconciliationRunInput,
} from "../payment-reconciliation-certification.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    reconciliationRun: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    accountingPeriod: {
      findFirst: jest.fn(),
    },
    providerEvent: {
      count: jest.fn(),
    },
    statementLine: {
      count: jest.fn(),
    },
    matchRecord: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    paymentException: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    suspenseItem: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    ledgerAuditEvent: {
      create: jest.fn(),
    },
    businessEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentReconciliationInboxItem: {
      upsert: jest.fn(),
    },
    closeRun: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    closePackExport: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock("../payment-reconciliation-evidence.service", () => ({
  ...jest.requireActual("../payment-reconciliation-evidence.service"),
  buildReconciliationEvidenceManifestInTx: jest.fn(),
}))
jest.mock("../payment-suspense-ledger.service", () => ({
  assertPaymentSuspenseLedgerTruthInTx: jest.fn(),
}))

const mockBuildEvidenceManifest = buildReconciliationEvidenceManifestInTx as jest.Mock
const mockAssertSuspenseLedgerTruth = assertPaymentSuspenseLedgerTruthInTx as jest.Mock
const mockedDb = db as unknown as {
  $transaction: jest.Mock
  reconciliationRun: {
    findFirst: jest.Mock
    findUnique: jest.Mock
    updateMany: jest.Mock
  }
  accountingPeriod: { findFirst: jest.Mock }
  providerEvent: { count: jest.Mock }
  statementLine: { count: jest.Mock }
  matchRecord: { count: jest.Mock; findMany: jest.Mock }
  paymentException: { count: jest.Mock; findMany: jest.Mock }
  suspenseItem: { count: jest.Mock; findMany: jest.Mock }
  auditLog: { create: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  paymentReconciliationInboxItem: { upsert: jest.Mock }
  closeRun: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  closePackExport: { findFirst: jest.Mock; update: jest.Mock }
}

function stableTestStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableTestStringify).join(",")}]`

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableTestStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`
}

function stableTestCertificateHash(payload: unknown) {
  return createHash("sha256").update(stableTestStringify(payload)).digest("hex")
}

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

function readyRun(overrides: Record<string, unknown> = {}) {
  const businessDate = new Date("2026-06-14T00:00:00Z")
  return {
    id: "run-1",
    organizationId: "org-1",
    providerAccountId: "provider-account-1",
    paymentRailId: "rail-1",
    accountingPeriodId: "period-1",
    businessDate,
    periodStart: new Date("2026-06-14T00:00:00Z"),
    periodEnd: new Date("2026-06-15T00:00:00Z"),
    status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
    totalInternalAmount: amount(10000),
    totalExternalAmount: amount(10000),
    matchedAmount: amount(10000),
    suspenseAmount: amount(0),
    exceptionCount: 0,
    matchCount: 1,
    runById: "runner-1",
    signedById: null,
    signedAt: null,
    certificateHash: null,
    certificatePayload: null,
    metadata: null,
    updatedAt: new Date("2026-06-14T11:55:00Z"),
    accountingPeriod: {
      id: "period-1",
      status: AccountingPeriodStatus.OPEN,
      startDate: new Date("2026-06-01T00:00:00Z"),
      endDate: new Date("2026-06-30T23:59:59Z"),
    },
    paymentRail: {
      id: "rail-1",
      name: "Mobile money",
      type: "MOBILE_MONEY",
      isActive: true,
    },
    providerAccount: {
      id: "provider-account-1",
      displayName: "MTN settlement",
      providerCode: "MTN",
      currencyCode: "XAF",
      status: ProviderAccountStatus.ACTIVE,
      settlementLedgerAccountId: "account-512",
      suspenseLedgerAccountId: "account-471",
      settlementAccounts: [{ id: "settlement-1" }],
    },
    ...overrides,
  }
}

function readySourceVersionHash() {
  const run = readyRun()
  return buildPaymentReconciliationSignOffSourceVersionHash({
    version: 1,
    sourceType: "ReconciliationRun",
    organizationId: run.organizationId,
    runId: run.id,
    providerAccountId: run.providerAccountId,
    provider: {
      id: run.providerAccount.id,
      displayName: run.providerAccount.displayName,
      currencyCode: run.providerAccount.currencyCode,
    },
    businessDate: run.businessDate.toISOString(),
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    status: "READY_FOR_SIGNOFF",
    makerActorId: run.runById,
    totals: {
      internalAmount: run.totalInternalAmount.toFixed(2),
      externalAmount: run.totalExternalAmount.toFixed(2),
      matchedAmount: run.matchedAmount.toFixed(2),
      suspenseAmount: run.suspenseAmount.toFixed(2),
    },
    matchCount: run.matchCount,
    exceptionCount: run.exceptionCount,
    updatedAt: run.updatedAt.toISOString(),
  })
}

function signedRun(signedById = "signer-1") {
  const sourceVersionHash = readySourceVersionHash()
  const certificatePayload = {
    version: 2,
    sourceVersionHash,
    signedById,
  }
  return readyRun({
    status: ReconciliationRunStatus.SIGNED,
    signedById,
    signedAt: new Date("2026-06-14T12:00:00Z"),
    certificateHash: stableTestCertificateHash(certificatePayload),
    certificatePayload,
    metadata: {
      signedSourceVersionHash: sourceVersionHash,
      signedCorrelationId: "corr-original",
    },
  })
}

function signInput(
  overrides: Partial<SignReconciliationRunInput> = {},
): SignReconciliationRunInput {
  const base: SignReconciliationRunInput = {
    organizationId: "org-1",
    runId: "run-1",
    signedById: "signer-1",
    expectedSourceVersionHash: readySourceVersionHash(),
    control: {
      actorPermissions: ["payments.reconciliation.sign"],
      lastAuthAt: new Date("2026-06-14T12:00:00Z"),
      now: new Date("2026-06-14T12:00:00Z"),
    },
    correlationId: "corr-sign",
  }

  return {
    ...base,
    ...overrides,
    control: {
      ...base.control,
      ...(overrides.control ?? {}),
    },
  }
}


let committedSignedRun: Record<string, unknown> | null = null

describe("payment reconciliation certification service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    committedSignedRun = null
    mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(readyRun())
    mockedDb.reconciliationRun.updateMany.mockImplementation(async ({ data }) => {
      committedSignedRun = readyRun({
        ...data,
        updatedAt: new Date("2026-06-14T12:00:00Z"),
      })
      return { count: 1 }
    })
    mockedDb.reconciliationRun.findUnique.mockImplementation(
      async () => committedSignedRun,
    )
    mockedDb.accountingPeriod.findFirst.mockResolvedValue(readyRun().accountingPeriod)
    mockedDb.providerEvent.count.mockResolvedValue(1)
    mockedDb.statementLine.count.mockResolvedValue(1)
    mockBuildEvidenceManifest.mockResolvedValue({
      version: 1,
      sourceHash: "source-evidence-hash-1",
      counts: {
        paymentTransactionCount: 1,
        providerEventCount: 1,
        statementFileCount: 1,
        statementLineCount: 1,
        matchRecordCount: 1,
        exceptionCount: 0,
        suspenseCount: 0,
      },
    })
    mockedDb.matchRecord.count.mockResolvedValue(1)
    mockedDb.paymentException.count.mockResolvedValue(0)
    mockedDb.suspenseItem.count.mockResolvedValue(0)
    mockAssertSuspenseLedgerTruth.mockResolvedValue({ itemCount: 0, totals: [] })
    mockedDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
    mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" })
    mockedDb.businessEvent.findUnique.mockResolvedValue(null)
    mockedDb.businessEvent.create.mockImplementation(async (args) => ({
      id: "business-event-1",
      ...args.data,
      outboxMessages: args.data.outboxMessages.create,
    }))
    mockedDb.paymentReconciliationInboxItem.upsert.mockResolvedValue({ id: "inbox-1" })
    mockedDb.closeRun.findMany.mockResolvedValue([])
    mockedDb.closeRun.findFirst.mockResolvedValue(null)
    mockedDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
    mockedDb.closePackExport.findFirst.mockResolvedValue({ id: "close-pack-export-1", metadata: { mode: "CERTIFIED" } })
    mockedDb.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
  })

  it("signs a ready run with maker-checker, fresh-auth, evidence, and period controls", async () => {
    const result = await signReconciliationRun(signInput())

    expect(result).toMatchObject({
      runId: "run-1",
      status: ReconciliationRunStatus.SIGNED,
      outcome: "SIGNED",
      replayed: false,
      completedByAnotherActor: false,
      sourceVersionHash: readySourceVersionHash(),
      correlationId: "corr-sign",
    })
    expect(result.certificateHash).toHaveLength(64)
    expect(mockAssertSuspenseLedgerTruth).toHaveBeenCalledWith(
      mockedDb,
      { organizationId: "org-1", reconciliationRunId: "run-1" },
    )
    expect(mockedDb.reconciliationRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "run-1",
          organizationId: "org-1",
          status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
          updatedAt: new Date("2026-06-14T11:55:00Z"),
          signedById: null,
          signedAt: null,
          certificateHash: null,
        }),
        data: expect.objectContaining({
          status: ReconciliationRunStatus.SIGNED,
          signedById: "signer-1",
          certificateHash: result.certificateHash,
          certificatePayload: expect.objectContaining({
            version: 2,
            sourceVersionHash: readySourceVersionHash(),
            controls: expect.objectContaining({
              sourceVersionGuardEnforced: true,
              conditionalTerminalTransition: true,
            }),
          }),
        }),
      }),
    )
    expect(mockedDb.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: "Serializable",
    })
    expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYMENT_RECONCILIATION_SIGN_CONTROL",
        }),
      }),
    )
    expect(mockedDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYMENT_RECONCILIATION_RUN_SIGN",
          resourceId: "run-1",
        }),
      }),
    )
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "payment.reconciliation.signed",
          eventSource: "SYSTEM",
          idempotencyKey: "reconciliation-run:run-1:signed",
          actorId: "signer-1",
          sourceType: "PAYMENT_RECONCILIATION",
          sourceId: "run-1",
          documentHash: result.certificateHash,
        }),
        include: { outboxMessages: true },
      }),
    )
  })

  it("returns committed evidence on a same-checker replay without duplicating side effects", async () => {
    const first = await signReconciliationRun(signInput())
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(committedSignedRun)

    const replay = await signReconciliationRun(
      signInput({ correlationId: "corr-replay" }),
    )

    expect(replay).toEqual({
      ...first,
      replayed: true,
      correlationId: "corr-replay",
    })
    expect(mockedDb.reconciliationRun.updateMany).toHaveBeenCalledTimes(1)
    expect(mockedDb.auditLog.create).toHaveBeenCalledTimes(1)
    expect(mockedDb.ledgerAuditEvent.create).toHaveBeenCalledTimes(1)
    expect(mockedDb.businessEvent.create).toHaveBeenCalledTimes(1)
    expect(mockedDb.closeRun.update).not.toHaveBeenCalled()
    expect(mockedDb.closePackExport.update).not.toHaveBeenCalled()
  })

  it("reports another checker's durable completion without mutating or emitting side effects", async () => {
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(signedRun("signer-2"))

    const result = await signReconciliationRun(signInput())

    expect(result).toMatchObject({
      outcome: "ALREADY_SIGNED",
      replayed: false,
      completedByAnotherActor: true,
      sourceVersionHash: readySourceVersionHash(),
    })
    expect(mockedDb.reconciliationRun.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).not.toHaveBeenCalled()
    expect(mockedDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("rejects stale source evidence before certification side effects", async () => {
    await expect(
      signReconciliationRun(
        signInput({ expectedSourceVersionHash: `sha256:${"b".repeat(64)}` }),
      ),
    ).rejects.toThrow(/source evidence changed/i)

    expect(mockedDb.reconciliationRun.updateMany).not.toHaveBeenCalled()
    expect(mockBuildEvidenceManifest).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).not.toHaveBeenCalled()
    expect(mockedDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("recovers the winning same-checker evidence after losing the conditional transition", async () => {
    mockedDb.reconciliationRun.updateMany.mockResolvedValue({ count: 0 })
    mockedDb.reconciliationRun.findFirst
      .mockResolvedValueOnce(readyRun())
      .mockResolvedValueOnce(signedRun())

    const result = await signReconciliationRun(signInput())

    expect(result).toMatchObject({
      outcome: "SIGNED",
      replayed: true,
      completedByAnotherActor: false,
      sourceVersionHash: readySourceVersionHash(),
    })
    expect(mockedDb.reconciliationRun.updateMany).toHaveBeenCalledTimes(1)
    expect(mockedDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.closeRun.update).not.toHaveBeenCalled()
  })

  it("reports the winning other checker after losing the conditional transition", async () => {
    mockedDb.reconciliationRun.updateMany.mockResolvedValue({ count: 0 })
    mockedDb.reconciliationRun.findFirst
      .mockResolvedValueOnce(readyRun())
      .mockResolvedValueOnce(signedRun("signer-2"))

    const result = await signReconciliationRun(signInput())

    expect(result).toMatchObject({
      outcome: "ALREADY_SIGNED",
      replayed: false,
      completedByAnotherActor: true,
    })
    expect(mockedDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("rejects malformed committed evidence instead of treating it as a replay", async () => {
    mockedDb.reconciliationRun.findFirst.mockResolvedValue({
      ...signedRun(),
      certificateHash: "0".repeat(64),
    })

    await expect(signReconciliationRun(signInput())).rejects.toThrow(
      /signed evidence is inconsistent/i,
    )

    expect(mockedDb.reconciliationRun.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.ledgerAuditEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("rejects malformed expected source hashes before opening a transaction", async () => {
    await expect(
      signReconciliationRun(signInput({ expectedSourceVersionHash: "invalid" })),
    ).rejects.toThrow(/valid SHA-256 hash/i)

    expect(mockedDb.$transaction).not.toHaveBeenCalled()
  })


  it("blocks self sign-off before mutating the run", async () => {
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(readyRun({ runById: "signer-1" }))

    await expect(
      signReconciliationRun({
        organizationId: "org-1",
        runId: "run-1",
        signedById: "signer-1",
        control: {
          actorPermissions: ["payments.reconciliation.sign"],
          lastAuthAt: Date.now(),
        },
      }),
    ).rejects.toThrow(/independent approval/i)

    expect(mockedDb.reconciliationRun.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYMENT_RECONCILIATION_SIGN_CONTROL_DENIED",
        }),
      }),
    )
  })

  it("exports signed certificates with watermark, audit trail, and inbox record", async () => {
    const certificatePayload = { version: 1, runId: "run-1", evidence: { sourceHash: "source-evidence-hash-1" } }
    const certificateHash = stableTestCertificateHash(certificatePayload)
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(
      readyRun({
        status: ReconciliationRunStatus.SIGNED,
        signedById: "signer-1",
        signedAt: new Date("2026-06-14T12:00:00Z"),
        certificateHash,
        certificatePayload,
      }),
    )
    mockedDb.matchRecord.count.mockResolvedValue(2)
    mockedDb.paymentException.count.mockResolvedValue(1)
    mockedDb.suspenseItem.count.mockResolvedValue(0)
    mockAssertSuspenseLedgerTruth.mockResolvedValue({ itemCount: 0, totals: [] })

    const result = await exportReconciliationCertificate({
      organizationId: "org-1",
      runId: "run-1",
      exportedById: "exporter-1",
      control: {
        actorPermissions: ["payments.reconciliation.certificate.export"],
        lastAuthAt: new Date("2026-06-14T13:00:00Z"),
        now: new Date("2026-06-14T13:00:00Z"),
      },
      correlationId: "corr-export",
    })

    expect(result).toMatchObject({
      runId: "run-1",
      mimeType: "application/json",
      certificateHash,
      rowCount: 3,
      inboxItemId: "inbox-1",
      correlationId: "corr-export",
    })
    expect(result.watermarkId).toContain("recon-cert-run-1")
    expect(JSON.parse(result.content)).toMatchObject({
      certificate: { version: 1, runId: "run-1" },
      export: {
        exportedById: "exporter-1",
        watermarkId: result.watermarkId,
      },
    })
    expect(mockedDb.paymentReconciliationInboxItem.upsert).toHaveBeenCalled()
    expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYMENT_RECONCILIATION_CERTIFICATE_EXPORT_CONTROL",
        }),
      }),
    )
  })

  it("blocks certificate export and invalidates close evidence when the certificate hash drifts", async () => {
    const certificatePayload = { version: 1, runId: "run-1", evidence: { sourceHash: "source-evidence-hash-1" } }
    const currentHash = stableTestCertificateHash(certificatePayload)
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(
      readyRun({
        status: ReconciliationRunStatus.SIGNED,
        signedById: "signer-1",
        signedAt: new Date("2026-06-14T12:00:00Z"),
        certificateHash: "stale-certificate-hash",
        certificatePayload,
      }),
    )
    mockedDb.closeRun.findMany.mockResolvedValue([
      { id: "close-run-1", packExports: [{ id: "close-pack-export-1" }] },
    ])
    mockedDb.closeRun.findFirst.mockResolvedValue({
      id: "close-run-1",
      organizationId: "org-1",
      periodId: "period-1",
      status: "CERTIFIED",
      metadata: { certifiedExportId: "close-pack-export-1" },
    })

    await expect(
      exportReconciliationCertificate({
        organizationId: "org-1",
        runId: "run-1",
        exportedById: "exporter-1",
        control: {
          actorPermissions: ["payments.reconciliation.certificate.export"],
          lastAuthAt: new Date("2026-06-14T13:00:00Z"),
          now: new Date("2026-06-14T13:00:00Z"),
        },
        correlationId: "corr-export-drift",
      }),
    ).rejects.toThrow(/hash drift/i)

    expect(mockedDb.paymentReconciliationInboxItem.upsert).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "close.certification.invalidated",
          documentHash: currentHash,
          metadata: expect.objectContaining({
            sourceCode: "PAYMENT_RECONCILIATION_CERTIFICATE_HASH_DRIFT",
            sourceRing: "FIRST_RING",
          }),
        }),
      }),
    )
    expect(mockedDb.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "BLOCKED",
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              sourceCode: "PAYMENT_RECONCILIATION_CERTIFICATE_HASH_DRIFT",
              previousEvidenceHash: "stale-certificate-hash",
              newEvidenceHash: currentHash,
            }),
          }),
        }),
      }),
    )
  })
  it("blocks sign-off when the provider account is no longer ready", async () => {
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(readyRun({
      providerAccount: {
        ...readyRun().providerAccount,
        status: ProviderAccountStatus.SUSPENDED,
      },
    }))

    await expect(signReconciliationRun({
      organizationId: "org-1",
      runId: "run-1",
      signedById: "signer-1",
      control: {
        actorPermissions: ["payments.reconciliation.sign"],
        lastAuthAt: new Date("2026-06-14T12:00:00Z"),
        now: new Date("2026-06-14T12:00:00Z"),
      },
    })).rejects.toThrow(/active provider account/i)

    expect(mockBuildEvidenceManifest).not.toHaveBeenCalled()
    expect(mockedDb.reconciliationRun.updateMany).not.toHaveBeenCalled()
  })

  it("commits close invalidation before reporting live source-evidence drift", async () => {
    const certificatePayload = {
      version: 1,
      runId: "run-1",
      evidence: { sourceHash: "signed-source-hash" },
    }
    const certificateHash = stableTestCertificateHash(certificatePayload)
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(readyRun({
      status: ReconciliationRunStatus.SIGNED,
      signedById: "signer-1",
      signedAt: new Date("2026-06-14T12:00:00Z"),
      certificateHash,
      certificatePayload,
    }))
    mockBuildEvidenceManifest.mockResolvedValue({
      version: 1,
      sourceHash: "current-source-hash",
      counts: {},
    })
    mockedDb.closeRun.findMany.mockResolvedValue([
      { id: "close-run-1", packExports: [{ id: "close-pack-export-1" }] },
    ])
    mockedDb.closeRun.findFirst.mockResolvedValue({
      id: "close-run-1",
      organizationId: "org-1",
      periodId: "period-1",
      status: "CERTIFIED",
      metadata: { certifiedExportId: "close-pack-export-1" },
    })
    let transactionCompleted = false
    mockedDb.$transaction.mockImplementationOnce(async (callback) => {
      const result = await callback(mockedDb)
      transactionCompleted = true
      return result
    })

    await expect(exportReconciliationCertificate({
      organizationId: "org-1",
      runId: "run-1",
      exportedById: "exporter-1",
      control: {
        actorPermissions: ["payments.reconciliation.certificate.export"],
        lastAuthAt: new Date("2026-06-14T13:00:00Z"),
        now: new Date("2026-06-14T13:00:00Z"),
      },
    })).rejects.toThrow(/source evidence drift/i)

    expect(transactionCompleted).toBe(true)
    expect(mockedDb.closeRun.update).toHaveBeenCalled()
    expect(mockedDb.paymentReconciliationInboxItem.upsert).not.toHaveBeenCalled()
  })
})
