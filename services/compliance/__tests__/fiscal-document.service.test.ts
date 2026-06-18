import {
  AccountingSourceType,
  ComplianceAdapterEnvironment,
  ComplianceSubmissionOperation,
  ComplianceSubmissionStatus,
  FiscalDocumentStatus,
  FiscalDocumentType,
} from "@prisma/client"

import { NotFoundError } from "@/services/_shared/action-errors"

import { enqueueComplianceSubmission } from "../certification-outbox.service"
import { createFiscalDocumentFromPostedSource } from "../fiscal-document.service"

function createTx() {
  return {
    ledgerPostingBatch: {
      findFirst: jest.fn(),
    },
    fiscalDocument: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    fiscalSequence: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    complianceEvidence: {
      create: jest.fn(),
    },
    complianceSubmission: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    businessEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }
}

function createFiscalDocumentFixture() {
  return {
    id: "fiscal-doc-1",
    organizationId: "org-1",
    documentType: FiscalDocumentType.POS_RECEIPT,
    status: FiscalDocumentStatus.QUEUED,
    sourceType: AccountingSourceType.POS_SALE,
    sourceId: "sale-1",
    sourceNumber: "POS-0001",
    sourceDate: new Date("2026-06-14T09:30:00.000Z"),
    issueDate: new Date("2026-06-14T09:31:00.000Z"),
    postingBatchId: "batch-1",
    journalEntryId: "journal-1",
    accountingSourceLinkId: "source-link-1",
    countryCode: "CM",
    countryPackVersion: "CM-2026.1",
    countryPackSchemaVersion: "1",
    countryPackResolutionHash: "sha256:country-pack",
    countryPackLegalRef: "CM-DGI-EXPERT-REVIEW-REQUIRED",
    countryPackVerificationStatus: "REQUIRES_EXPERT_REVIEW",
    certificationPolicySnapshot: { issueMode: "QUEUE_ALLOWED" },
    requiredFieldsSnapshot: {},
    artifactExpectationsSnapshot: {},
    fiscalYear: "2026",
    fiscalPeriodKey: "ANNUAL",
    sequenceScopeKey: "GLOBAL",
    currency: "XAF",
    subtotal: "1000.00",
    taxAmount: "192.50",
    discountAmount: "0.00",
    totalAmount: "1192.50",
    taxBreakdown: { standard: "192.50" },
    canonicalPayload: {},
    canonicalPayloadHash: "sha256:fiscal-doc",
    sourcePayloadHash: null,
    idempotencyKey: "fd-sale-1",
    authorityChannel: "FAKE_SANDBOX",
    createdById: "user-1",
    metadata: {},
    lines: [],
    submissions: [],
    evidence: [],
  }
}

function createSubmissionFixture() {
  return {
    id: "submission-1",
    organizationId: "org-1",
    fiscalDocumentId: "fiscal-doc-1",
    adapterConfigId: null,
    operation: ComplianceSubmissionOperation.CERTIFY,
    status: ComplianceSubmissionStatus.PENDING,
    authorityChannel: "FAKE_SANDBOX",
    adapterKey: null,
    environment: ComplianceAdapterEnvironment.FAKE_SANDBOX,
    idempotencyKey: "submission-key",
    payloadHash: "sha256:fiscal-doc",
    requestHash: null,
    responseHash: null,
    correlationId: null,
    authorityReference: null,
    errorCode: null,
    errorMessage: null,
    rejectionReason: null,
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: new Date("2026-06-14T09:32:00.000Z"),
    requestSummary: {},
    metadata: {},
  }
}

function wireBusinessEventCreate(tx: ReturnType<typeof createTx>) {
  tx.businessEvent.findUnique.mockResolvedValue(null)
  tx.businessEvent.create.mockImplementation(async (args) => ({
    id: `business-event-${tx.businessEvent.create.mock.calls.length}`,
    ...args.data,
    outboxMessages: args.data.outboxMessages.create,
  }))
}

describe("compliance fiscal document business events", () => {
  it("records fiscal document and authority submission events in the creation transaction", async () => {
    const tx = createTx()
    const fiscalDocument = createFiscalDocumentFixture()
    const submission = createSubmissionFixture()

    tx.ledgerPostingBatch.findFirst.mockResolvedValue({
      id: "batch-1",
      journalEntries: [{ id: "journal-1" }],
      sourceLinks: [{ id: "source-link-1" }],
    })
    tx.fiscalDocument.findFirst.mockImplementation(async (args) => {
      if (args.where?.id === fiscalDocument.id) return fiscalDocument
      return null
    })
    tx.fiscalDocument.create.mockResolvedValue(fiscalDocument)
    tx.fiscalDocument.findFirstOrThrow.mockResolvedValue({
      ...fiscalDocument,
      submissions: [submission],
      evidence: [],
    })
    tx.complianceEvidence.create.mockResolvedValue({ id: "evidence-1" })
    tx.complianceSubmission.findFirst.mockResolvedValue(null)
    tx.complianceSubmission.create.mockResolvedValue(submission)
    wireBusinessEventCreate(tx)

    const result = await createFiscalDocumentFromPostedSource(
      {
        organizationId: "org-1",
        createdById: "user-1",
        documentType: FiscalDocumentType.POS_RECEIPT,
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: "sale-1",
        sourceNumber: "POS-0001",
        sourceDate: new Date("2026-06-14T09:30:00.000Z"),
        issueDate: new Date("2026-06-14T09:31:00.000Z"),
        countryCode: "CM",
        currency: "XAF",
        idempotencyKey: "fd-sale-1",
        subtotal: "1000.00",
        taxAmount: "192.50",
        totalAmount: "1192.50",
        taxBreakdown: { standard: "192.50" },
        lines: [
          {
            lineNumber: 1,
            description: "Retail sale",
            quantity: "1",
            unitPrice: "1000.00",
            taxRateBps: 1925,
            taxCode: "TVA",
            taxAmount: "192.50",
            lineSubtotal: "1000.00",
            lineTotal: "1192.50",
          },
        ],
        enqueueCertification: true,
        authorityChannel: "FAKE_SANDBOX",
        adapterEnvironment: ComplianceAdapterEnvironment.FAKE_SANDBOX,
      },
      tx as never,
    )

    expect(result.submissions).toEqual([submission])
    expect(tx.businessEvent.create).toHaveBeenCalledTimes(2)
    expect(tx.businessEvent.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "compliance.fiscal_document.created",
          eventSource: "INTERNAL",
          idempotencyKey: "fiscal-document:fiscal-doc-1:created",
          sourceType: AccountingSourceType.POS_SALE,
          sourceId: "sale-1",
          postingBatchId: "batch-1",
          documentHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
          outboxMessages: {
            create: [
              expect.objectContaining({
                channel: "NOTIFICATION",
                eventName: "compliance.fiscal_document.created",
              }),
            ],
          },
        }),
        include: { outboxMessages: true },
      }),
    )
    expect(tx.businessEvent.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "compliance.submission.queued",
          eventSource: "INTERNAL",
          idempotencyKey: "compliance-submission:submission-1:queued",
          sourceType: AccountingSourceType.POS_SALE,
          sourceId: "sale-1",
          postingBatchId: "batch-1",
          documentHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
          outboxMessages: {
            create: expect.arrayContaining([
              expect.objectContaining({
                channel: "AUTHORITY_SUBMISSION",
                eventName: "compliance.submission.queued",
              }),
              expect.objectContaining({
                channel: "NOTIFICATION",
                eventName: "compliance.submission.queued",
              }),
            ]),
          },
        }),
        include: { outboxMessages: true },
      }),
    )
  })

  it("does not create fiscal or business-event evidence without posted ledger source", async () => {
    const tx = createTx()
    tx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
    wireBusinessEventCreate(tx)

    await expect(
      createFiscalDocumentFromPostedSource(
        {
          organizationId: "org-1",
          createdById: "user-1",
          documentType: FiscalDocumentType.POS_RECEIPT,
          sourceType: AccountingSourceType.POS_SALE,
          sourceId: "sale-1",
          countryCode: "CM",
          idempotencyKey: "fd-sale-1",
          lines: [
            {
              lineNumber: 1,
              description: "Retail sale",
              quantity: "1",
              unitPrice: "1000.00",
              lineTotal: "1000.00",
            },
          ],
        },
        tx as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(tx.fiscalDocument.create).not.toHaveBeenCalled()
    expect(tx.businessEvent.create).not.toHaveBeenCalled()
  })
})

describe("compliance submission outbox events", () => {
  it("wraps standalone enqueue in a transaction with audit and business event evidence", async () => {
    const tx = createTx()
    const fiscalDocument = createFiscalDocumentFixture()
    const submission = createSubmissionFixture()
    const dbLike = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    }

    tx.complianceSubmission.findFirst.mockResolvedValue(null)
    tx.fiscalDocument.findFirst.mockResolvedValue({
      ...fiscalDocument,
      status: FiscalDocumentStatus.DRAFT,
    })
    tx.fiscalDocument.update.mockResolvedValue({
      ...fiscalDocument,
      status: FiscalDocumentStatus.QUEUED,
    })
    tx.complianceSubmission.create.mockResolvedValue(submission)
    wireBusinessEventCreate(tx)

    await enqueueComplianceSubmission(
      {
        organizationId: "org-1",
        actorId: "user-1",
        fiscalDocumentId: "fiscal-doc-1",
        operation: ComplianceSubmissionOperation.CERTIFY,
        authorityChannel: "FAKE_SANDBOX",
        environment: ComplianceAdapterEnvironment.FAKE_SANDBOX,
        idempotencyKey: "submission-key",
        payloadHash: "sha256:fiscal-doc",
      },
      dbLike as never,
    )

    expect(dbLike.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "ComplianceSubmission",
          action: "ENQUEUE",
        }),
      }),
    )
    expect(tx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "compliance.submission.queued",
          idempotencyKey: "compliance-submission:submission-1:queued",
          outboxMessages: {
            create: expect.arrayContaining([
              expect.objectContaining({ channel: "AUTHORITY_SUBMISSION" }),
              expect.objectContaining({ channel: "NOTIFICATION" }),
            ]),
          },
        }),
        include: { outboxMessages: true },
      }),
    )
  })
})
