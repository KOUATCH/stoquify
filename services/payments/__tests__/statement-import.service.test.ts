import {
  ExceptionSeverity,
  PaymentExceptionType,
  PaymentReconciliationInboxStatus,
  ProviderAccountStatus,
  StatementFileStatus,
  StatementLineStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"

import { MobileMoneyHmacAdapter, sha256 } from "../adapters/mobile-money-hmac.adapter"
import { importProviderStatement } from "../statement-import.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    providerAccount: { findFirst: jest.fn() },
    statementFile: { findFirst: jest.fn(), create: jest.fn() },
    statementLine: { findMany: jest.fn(), createMany: jest.fn() },
    paymentReconciliationInboxItem: { upsert: jest.fn() },
    paymentException: { create: jest.fn() },
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  providerAccount: { findFirst: jest.Mock }
  statementFile: { findFirst: jest.Mock; create: jest.Mock }
  statementLine: { findMany: jest.Mock; createMany: jest.Mock }
  paymentReconciliationInboxItem: { upsert: jest.Mock }
  paymentException: { create: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  auditLog: { create: jest.Mock }
}

const adapter = new MobileMoneyHmacAdapter("mtn-momo")

function statementContent(overrides: Array<Record<string, unknown>> = []) {
  return JSON.stringify(
    overrides.length > 0
      ? overrides
      : [
          {
            providerTransactionId: "txn-1",
            providerReference: "ref-1",
            direction: "CREDIT",
            amount: "10000",
            feeAmount: "100",
            currencyCode: "XAF",
            occurredAt: "2026-06-14T10:00:00Z",
            description: "Mobile money settlement",
          },
        ],
  )
}

describe("statement import ingestion", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
    mockedDb.providerAccount.findFirst.mockResolvedValue({
      id: "provider-account-1",
      status: ProviderAccountStatus.ACTIVE,
    })
    mockedDb.statementFile.findFirst.mockResolvedValue(null)
    mockedDb.statementLine.findMany.mockResolvedValue([])
    mockedDb.statementFile.create.mockResolvedValue({ id: "statement-file-1" })
    mockedDb.statementLine.createMany.mockResolvedValue({ count: 1 })
    mockedDb.paymentReconciliationInboxItem.upsert.mockResolvedValue({ id: "inbox-1" })
    mockedDb.paymentException.create.mockResolvedValue({ id: "exception-1" })
    mockedDb.businessEvent.findUnique.mockResolvedValue(null)
    mockedDb.businessEvent.create.mockImplementation(async (args) => ({
      id: "business-event-1",
      ...args.data,
      outboxMessages: args.data.outboxMessages.create,
    }))
  })

  it("imports a provider statement file and fingerprints each line", async () => {
    const rawContent = statementContent()

    const result = await importProviderStatement({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawContent,
      fileName: "momo-2026-06-14.json",
      importedById: "user-1",
      correlationId: "corr-1",
    })

    expect(result).toMatchObject({
      status: "IMPORTED",
      statementFileId: "statement-file-1",
      importedLineCount: 1,
      duplicateLineCount: 0,
      fileHash: sha256(rawContent),
      inboxItemId: "inbox-1",
      correlationId: "corr-1",
    })
    expect(mockedDb.statementFile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StatementFileStatus.IMPORTED,
          importedById: "user-1",
          correlationId: "corr-1",
        }),
      }),
    )
    expect(mockedDb.statementLine.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            fingerprint: expect.any(String),
            status: StatementLineStatus.UNMATCHED,
            providerTransactionId: "txn-1",
          }),
        ]),
      }),
    )
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "payment.statement.imported",
          eventSource: "IMPORT",
          idempotencyKey: "statement-file:statement-file-1:imported",
          actorId: "user-1",
          sourceType: "PAYMENT_RECONCILIATION",
          sourceId: "statement-file-1",
          documentHash: sha256(rawContent),
          outboxMessages: {
            create: [
              expect.objectContaining({
                channel: "NOTIFICATION",
                eventName: "payment.statement.imported",
              }),
            ],
          },
        }),
        include: { outboxMessages: true },
      }),
    )
  })

  it("treats a repeated statement file hash as an idempotent duplicate", async () => {
    const rawContent = statementContent()
    mockedDb.statementFile.findFirst.mockResolvedValue({ id: "statement-file-1" })

    const result = await importProviderStatement({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawContent,
      fileName: "momo-2026-06-14.json",
    })

    expect(result.status).toBe("DUPLICATE_FILE")
    expect(mockedDb.statementLine.createMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentReconciliationInboxItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: PaymentReconciliationInboxStatus.IGNORED,
        }),
      }),
    )
  })

  it("creates an exception when duplicate statement line fingerprints appear in one file", async () => {
    const line = {
      providerTransactionId: "txn-1",
      providerReference: "ref-1",
      direction: "CREDIT",
      amount: "10000",
      currencyCode: "XAF",
      occurredAt: "2026-06-14T10:00:00Z",
    }
    const rawContent = statementContent([line, line])

    const result = await importProviderStatement({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawContent,
      fileName: "momo-dup.json",
    })

    expect(result.status).toBe("DUPLICATE_LINE")
    expect(mockedDb.statementFile.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.DUPLICATE_PROVIDER_REFERENCE,
          severity: ExceptionSeverity.HIGH,
        }),
      }),
    )
  })

  it("creates an exception when a line fingerprint already exists from another import", async () => {
    const rawContent = statementContent()
    const fingerprint = adapter.fingerprintStatementLine(adapter.parseStatement({ rawContent }).lines[0])
    mockedDb.statementLine.findMany.mockResolvedValue([{ fingerprint }])

    const result = await importProviderStatement({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawContent,
      fileName: "momo-existing-line.json",
    })

    expect(result.status).toBe("DUPLICATE_LINE")
    expect(result.duplicateLineCount).toBe(1)
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "StatementLine",
          evidence: expect.objectContaining({
            duplicateFingerprints: [fingerprint],
          }),
        }),
      }),
    )
  })

  it("rejects oversized statement files before persistence", async () => {
    await expect(
      importProviderStatement({
        organizationId: "org-1",
        providerAccountId: "provider-account-1",
        adapter,
        rawContent: statementContent(),
        maxFileBytes: 5,
      }),
    ).rejects.toMatchObject({
      reason: "PAYLOAD_TOO_LARGE",
    })
    expect(mockedDb.statementFile.create).not.toHaveBeenCalled()
  })
})
