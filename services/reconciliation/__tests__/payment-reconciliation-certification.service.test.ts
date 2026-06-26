jest.mock("server-only", () => ({}))

import {
  AccountingPeriodStatus,
  ReconciliationRunStatus,
  Prisma,
} from "@prisma/client"
import { createHash } from "node:crypto"

import { db } from "@/prisma/db"

import {
  exportReconciliationCertificate,
  signReconciliationRun,
} from "../payment-reconciliation-certification.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    reconciliationRun: {
      findFirst: jest.fn(),
      update: jest.fn(),
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

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  reconciliationRun: { findFirst: jest.Mock; update: jest.Mock }
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
    },
    providerAccount: {
      id: "provider-account-1",
      displayName: "MTN settlement",
      providerCode: "MTN",
      currencyCode: "XAF",
    },
    ...overrides,
  }
}

describe("payment reconciliation certification service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
    mockedDb.reconciliationRun.findFirst.mockResolvedValue(readyRun())
    mockedDb.reconciliationRun.update.mockImplementation(async ({ data }) => ({
      id: "run-1",
      status: data.status,
      certificateHash: data.certificateHash,
      signedAt: data.signedAt,
    }))
    mockedDb.accountingPeriod.findFirst.mockResolvedValue(readyRun().accountingPeriod)
    mockedDb.providerEvent.count.mockResolvedValue(1)
    mockedDb.statementLine.count.mockResolvedValue(1)
    mockedDb.matchRecord.count.mockResolvedValue(1)
    mockedDb.paymentException.count.mockResolvedValue(0)
    mockedDb.suspenseItem.count.mockResolvedValue(0)
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
    const result = await signReconciliationRun({
      organizationId: "org-1",
      runId: "run-1",
      signedById: "signer-1",
      control: {
        actorPermissions: ["payments.reconciliation.sign"],
        lastAuthAt: new Date("2026-06-14T12:00:00Z"),
        now: new Date("2026-06-14T12:00:00Z"),
      },
      correlationId: "corr-sign",
    })

    expect(result).toMatchObject({
      runId: "run-1",
      status: ReconciliationRunStatus.SIGNED,
      correlationId: "corr-sign",
    })
    expect(result.certificateHash).toHaveLength(64)
    expect(mockedDb.reconciliationRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ReconciliationRunStatus.SIGNED,
          signedById: "signer-1",
          certificateHash: result.certificateHash,
        }),
      }),
    )
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

    expect(mockedDb.reconciliationRun.update).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PAYMENT_RECONCILIATION_SIGN_CONTROL_DENIED",
        }),
      }),
    )
  })

  it("exports signed certificates with watermark, audit trail, and inbox record", async () => {
    const certificatePayload = { version: 1, runId: "run-1" }
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
    const certificatePayload = { version: 1, runId: "run-1" }
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
})
