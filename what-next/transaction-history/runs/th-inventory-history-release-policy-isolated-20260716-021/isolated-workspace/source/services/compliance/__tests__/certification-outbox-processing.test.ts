import {
  AccountingSourceType,
  ComplianceAdapterConfigStatus,
  ComplianceAdapterEnvironment,
  ComplianceEvidenceType,
  ComplianceSubmissionOperation,
  ComplianceSubmissionStatus,
  FiscalDocumentStatus,
  FiscalDocumentType,
  Prisma,
} from "@prisma/client"

import { resolveEInvoicingMetadata } from "../country-pack-hooks"
import { processComplianceSubmission } from "../certification-outbox.service"

function decimal(value: string | number) {
  return new Prisma.Decimal(value)
}

function createTx() {
  return {
    complianceSubmission: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    complianceAdapterConfig: {
      findFirst: jest.fn(),
    },
    complianceEvidence: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    fiscalDocument: {
      update: jest.fn(),
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
  const metadata = resolveEInvoicingMetadata({
    countryCode: "CM",
    date: "2026-06-14",
    pinnedPackVersion: "CM-2026.1",
  })

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
    countryCode: "CM",
    countryPackVersion: metadata.packVersion,
    countryPackSchemaVersion: metadata.schemaVersion,
    countryPackResolutionHash: metadata.combinedResolutionHash,
    currency: "XAF",
    subtotal: decimal("1000.00"),
    taxAmount: decimal("192.50"),
    discountAmount: decimal("0.00"),
    totalAmount: decimal("1192.50"),
    canonicalPayload: {
      documentType: FiscalDocumentType.POS_RECEIPT,
      countryCode: "CM",
      currency: "XAF",
      issueDate: "2026-06-14T09:31:00.000Z",
      source: {
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: "sale-1",
        postingBatchId: "batch-1",
        journalEntryId: "journal-1",
      },
      totals: {
        subtotal: "1000.00",
        taxAmount: "192.50",
        discountAmount: "0.00",
        totalAmount: "1192.50",
      },
      lines: [
        {
          lineNumber: 1,
          description: "Retail sale",
          quantity: "1.000",
          unitPrice: "1000.00",
          taxRateBps: 1925,
          taxAmount: "192.50",
          lineTotal: "1192.50",
        },
      ],
      pack: {
        version: metadata.packVersion,
        schemaVersion: metadata.schemaVersion,
        resolutionHash: metadata.combinedResolutionHash,
      },
    },
    metadata: {},
    lines: [
      {
        lineNumber: 1,
        sourceLineId: "line-1",
        itemId: "item-1",
        description: "Retail sale",
        quantity: decimal("1"),
        unitPrice: decimal("1000"),
        discountAmount: decimal("0"),
        taxRateBps: 1925,
        taxCode: "TVA",
        taxAmount: decimal("192.50"),
        lineSubtotal: decimal("1000"),
        lineTotal: decimal("1192.50"),
        linePayload: null,
      },
    ],
  }
}

function createAdapterConfigFixture(overrides: Record<string, unknown> = {}) {
  const document = createFiscalDocumentFixture()

  return {
    id: "adapter-config-1",
    status: ComplianceAdapterConfigStatus.ACTIVE,
    countryCode: "CM",
    authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
    adapterKey: "CM_DGI_SANDBOX",
    environment: ComplianceAdapterEnvironment.SANDBOX,
    countryPackVersion: document.countryPackVersion,
    countryPackResolutionHash: document.countryPackResolutionHash,
    capabilityStatus: "REQUIRES_EXPERT_REVIEW",
    credentialReference: "vault://org-1/cm-dgi-sandbox",
    publicMetadata: { sandboxMode: "ACCEPT" },
    ...overrides,
  }
}

function createSubmissionFixture(overrides: Record<string, unknown> = {}) {
  const fiscalDocument = createFiscalDocumentFixture()
  const adapterConfig = createAdapterConfigFixture()

  return {
    id: "submission-1",
    organizationId: "org-1",
    fiscalDocumentId: fiscalDocument.id,
    fiscalDocument,
    adapterConfigId: adapterConfig.id,
    adapterConfig,
    operation: ComplianceSubmissionOperation.CERTIFY,
    status: ComplianceSubmissionStatus.PENDING,
    authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
    adapterKey: "CM_DGI_SANDBOX",
    environment: ComplianceAdapterEnvironment.SANDBOX,
    idempotencyKey: "submission-key",
    payloadHash: "sha256:canonical",
    requestHash: null,
    responseHash: null,
    correlationId: null,
    authorityReference: null,
    errorCode: null,
    errorMessage: null,
    rejectionReason: null,
    attempts: 1,
    maxAttempts: 5,
    nextAttemptAt: new Date("2026-06-14T09:32:00.000Z"),
    ...overrides,
  }
}

function wireTx(tx: ReturnType<typeof createTx>, submission: ReturnType<typeof createSubmissionFixture>) {
  tx.complianceSubmission.findFirst.mockResolvedValue(submission)
  tx.complianceSubmission.update.mockImplementation(async (args) => ({
    ...submission,
    ...args.data,
  }))
  tx.complianceEvidence.findFirst.mockResolvedValue(null)
  tx.complianceEvidence.create.mockImplementation(async (args) => ({
    id: `evidence-${tx.complianceEvidence.create.mock.calls.length}`,
    ...args.data,
  }))
  tx.businessEvent.findUnique.mockResolvedValue(null)
  tx.businessEvent.create.mockImplementation(async (args) => ({
    id: `business-event-${tx.businessEvent.create.mock.calls.length}`,
    ...args.data,
    outboxMessages: args.data.outboxMessages.create,
  }))
}

describe("compliance submission processing", () => {
  it("submits Cameroon sandbox payloads and persists request, response, and artifact evidence", async () => {
    const tx = createTx()
    const submission = createSubmissionFixture()
    const dbLike = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    }
    wireTx(tx, submission)

    await processComplianceSubmission(
      {
        organizationId: "org-1",
        submissionId: "submission-1",
        processedBy: "worker-1",
        now: new Date("2026-06-14T09:35:00.000Z"),
      },
      dbLike as never,
    )

    const evidenceTypes = tx.complianceEvidence.create.mock.calls.map(
      (call) => call[0].data.evidenceType,
    )
    expect(evidenceTypes).toEqual(
      expect.arrayContaining([
        ComplianceEvidenceType.SUBMITTED_PAYLOAD,
        ComplianceEvidenceType.AUTHORITY_RESPONSE,
        ComplianceEvidenceType.AUTHORITY_REFERENCE,
      ]),
    )

    const firstSubmissionUpdate = tx.complianceSubmission.update.mock.calls[0][0]
    expect(firstSubmissionUpdate.data).toMatchObject({
      status: ComplianceSubmissionStatus.SUBMITTED,
      adapterKey: "CM_DGI_SANDBOX",
      requestHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    })

    const finalSubmissionUpdate =
      tx.complianceSubmission.update.mock.calls[tx.complianceSubmission.update.mock.calls.length - 1][0]
    expect(finalSubmissionUpdate.data).toMatchObject({
      status: ComplianceSubmissionStatus.SUBMITTED,
      responseHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      authorityReference: expect.stringMatching(/^CM-SBX-/),
      completedAt: null,
    })

    expect(tx.fiscalDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: FiscalDocumentStatus.SUBMITTED,
          authorityReference: expect.stringMatching(/^CM-SBX-/),
          certificationArtifactHash: null,
          certifiedAt: null,
        }),
      }),
    )
    expect(tx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "compliance.submission.accepted",
          payload: expect.objectContaining({
            adapterKey: "CM_DGI_SANDBOX",
            productionCertification: false,
            sandboxGrade: true,
          }),
        }),
      }),
    )
  })

  it("fails missing credential configuration without recording a submitted authority payload", async () => {
    const tx = createTx()
    const submission = createSubmissionFixture({
      adapterConfig: createAdapterConfigFixture({ credentialReference: null }),
    })
    const dbLike = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    }
    wireTx(tx, submission)

    await processComplianceSubmission(
      {
        organizationId: "org-1",
        submissionId: "submission-1",
        now: new Date("2026-06-14T09:35:00.000Z"),
      },
      dbLike as never,
    )

    expect(tx.complianceSubmission.update).toHaveBeenCalledTimes(1)
    expect(tx.complianceSubmission.update.mock.calls[0][0].data).toMatchObject({
      status: ComplianceSubmissionStatus.FAILED,
      errorCode: "CREDENTIAL_CONFIGURATION_ERROR",
    })
    expect(tx.fiscalDocument.update).not.toHaveBeenCalled()
    expect(tx.complianceEvidence.create.mock.calls.map((call) => call[0].data.evidenceType)).toEqual([
      ComplianceEvidenceType.ERROR_REPORT,
    ])
  })

  it("schedules retryable Cameroon sandbox outages without rejecting the fiscal document", async () => {
    const tx = createTx()
    const submission = createSubmissionFixture({
      adapterConfig: createAdapterConfigFixture({
        publicMetadata: { sandboxMode: "OUTAGE" },
      }),
    })
    const dbLike = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    }
    wireTx(tx, submission)

    await processComplianceSubmission(
      {
        organizationId: "org-1",
        submissionId: "submission-1",
        now: new Date("2026-06-14T09:35:00.000Z"),
      },
      dbLike as never,
    )

    const finalSubmissionUpdate =
      tx.complianceSubmission.update.mock.calls[tx.complianceSubmission.update.mock.calls.length - 1][0]
    expect(finalSubmissionUpdate.data).toMatchObject({
      status: ComplianceSubmissionStatus.RETRY_SCHEDULED,
      errorCode: "RETRYABLE_AUTHORITY_OUTAGE",
      responseHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    })
    expect(finalSubmissionUpdate.data.nextAttemptAt).toEqual(
      new Date("2026-06-14T09:40:00.000Z"),
    )
    expect(tx.fiscalDocument.update).not.toHaveBeenCalled()
  })

  it("records terminal sandbox rejections as rejected submissions and fiscal documents", async () => {
    const tx = createTx()
    const submission = createSubmissionFixture({
      adapterConfig: createAdapterConfigFixture({
        publicMetadata: { sandboxMode: "REJECT" },
      }),
    })
    const dbLike = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    }
    wireTx(tx, submission)

    await processComplianceSubmission(
      {
        organizationId: "org-1",
        submissionId: "submission-1",
        now: new Date("2026-06-14T09:35:00.000Z"),
      },
      dbLike as never,
    )

    const finalSubmissionUpdate =
      tx.complianceSubmission.update.mock.calls[tx.complianceSubmission.update.mock.calls.length - 1][0]
    expect(finalSubmissionUpdate.data).toMatchObject({
      status: ComplianceSubmissionStatus.REJECTED,
      errorCode: "TERMINAL_REJECTION",
      rejectionReason: "SANDBOX_FIXTURE_REJECTION",
      responseHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    })
    expect(tx.fiscalDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: FiscalDocumentStatus.REJECTED,
          rejectionReason: "SANDBOX_FIXTURE_REJECTION",
        }),
      }),
    )
  })
})
