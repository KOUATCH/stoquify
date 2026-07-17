import { createHash } from "crypto"

import {
  ComplianceAdapterEnvironment,
  ComplianceEvidenceSource,
  ComplianceEvidenceType,
  ComplianceSubmissionOperation,
  FiscalDocumentStatus,
  FiscalSequenceStatus,
  LedgerPostingBatchStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"

import {
  buildComplianceSubmissionIdempotencyKey,
  enqueueComplianceSubmission,
} from "./certification-outbox.service"
import {
  assertEInvoicingMetadataIsLedgerFirst,
  resolveEInvoicingMetadata,
} from "./country-pack-hooks"
import {
  createFiscalDocumentFromPostedSourceSchema,
  type CreateFiscalDocumentFromPostedSourceInput,
} from "./fiscal-document.schemas"
import {
  hashComplianceArtifact,
  recordComplianceEvidence,
} from "./evidence.service"

type DbClient = Prisma.TransactionClient | typeof db

const fiscalDocumentInclude = {
  lines: { orderBy: { lineNumber: "asc" as const } },
  submissions: { orderBy: { createdAt: "desc" as const } },
  evidence: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.FiscalDocumentInclude

function hasTransaction(client: DbClient): client is typeof db {
  return "$transaction" in client
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    )
  }
  return value
}

function hashPayload(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`
}

function toDecimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function toDecimal3(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(3)
}

function fiscalYearFromIssueDate(issueDate: Date) {
  return String(issueDate.getUTCFullYear())
}

function buildDefaultCanonicalPayload(input: {
  parsed: CreateFiscalDocumentFromPostedSourceInput
  issueDate: Date
  postingBatchId: string
  journalEntryId?: string | null
  countryPackVersion: string
  countryPackSchemaVersion: string
  countryPackResolutionHash: string
}) {
  return {
    documentType: input.parsed.documentType,
    source: {
      sourceType: input.parsed.sourceType,
      sourceId: input.parsed.sourceId,
      sourceNumber: input.parsed.sourceNumber ?? null,
      sourceDate: input.parsed.sourceDate?.toISOString() ?? null,
      postingBatchId: input.postingBatchId,
      journalEntryId: input.journalEntryId ?? null,
    },
    issueDate: input.issueDate.toISOString(),
    countryCode: input.parsed.countryCode,
    currency: input.parsed.currency,
    totals: {
      subtotal: input.parsed.subtotal,
      taxAmount: input.parsed.taxAmount,
      discountAmount: input.parsed.discountAmount,
      totalAmount: input.parsed.totalAmount,
    },
    taxBreakdown: input.parsed.taxBreakdown ?? null,
    lines: input.parsed.lines.map((line) => ({
      lineNumber: line.lineNumber,
      sourceLineId: line.sourceLineId ?? null,
      itemId: line.itemId ?? null,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      taxRateBps: line.taxRateBps ?? null,
      taxCode: line.taxCode ?? null,
      taxAmount: line.taxAmount,
      lineSubtotal: line.lineSubtotal,
      lineTotal: line.lineTotal,
    })),
    pack: {
      version: input.countryPackVersion,
      schemaVersion: input.countryPackSchemaVersion,
      resolutionHash: input.countryPackResolutionHash,
    },
  }
}

export async function allocateFiscalSequenceNumber(
  input: {
    organizationId: string
    countryCode: string
    documentType: CreateFiscalDocumentFromPostedSourceInput["documentType"]
    fiscalYear: string
    fiscalPeriodKey?: string | null
    scopeKey?: string | null
    prefix?: string | null
    actorId?: string | null
  },
  client: DbClient = db,
) {
  const run = async (tx: Prisma.TransactionClient) => {
    const fiscalPeriodKey = input.fiscalPeriodKey || "ANNUAL"
    const scopeKey = input.scopeKey || "GLOBAL"
    const sequence =
      (await tx.fiscalSequence.findFirst({
        where: {
          organizationId: input.organizationId,
          countryCode: input.countryCode,
          documentType: input.documentType,
          fiscalYear: input.fiscalYear,
          fiscalPeriodKey,
          scopeKey,
        },
      })) ||
      (await tx.fiscalSequence.create({
        data: {
          organizationId: input.organizationId,
          countryCode: input.countryCode,
          documentType: input.documentType,
          fiscalYear: input.fiscalYear,
          fiscalPeriodKey,
          scopeKey,
          prefix: input.prefix ?? null,
        },
      }))

    if (sequence.status !== FiscalSequenceStatus.ACTIVE) {
      throw new BusinessRuleError("Fiscal sequence is not active.")
    }

    const issuedNumber = sequence.nextNumber
    const updated = await tx.fiscalSequence.update({
      where: { id: sequence.id },
      data: {
        nextNumber: { increment: 1 },
        lastIssuedNumber: issuedNumber,
        lastIssuedAt: new Date(),
      },
    })
    const legalNumber = `${sequence.prefix || ""}${String(issuedNumber).padStart(8, "0")}`

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorId ?? null,
        entityType: "FiscalSequence",
        entityId: sequence.id,
        action: "ALLOCATE",
        changes: {
          after: {
            countryCode: input.countryCode,
            documentType: input.documentType,
            fiscalYear: input.fiscalYear,
            fiscalPeriodKey,
            scopeKey,
            issuedNumber,
            legalNumber,
          },
        },
      },
    })

    return { sequence: updated, issuedNumber, legalNumber }
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function createFiscalDocumentFromPostedSource(
  input: CreateFiscalDocumentFromPostedSourceInput,
  client: DbClient = db,
) {
  const parsed = createFiscalDocumentFromPostedSourceSchema.parse(input)
  const issueDate = parsed.issueDate ?? new Date()
  const fiscalYear = parsed.fiscalYear ?? fiscalYearFromIssueDate(issueDate)
  const packMetadata = resolveEInvoicingMetadata({
    countryCode: parsed.countryCode,
    date: issueDate,
  })
  assertEInvoicingMetadataIsLedgerFirst(packMetadata)

  if (
    parsed.enqueueCertification &&
    parsed.adapterEnvironment === ComplianceAdapterEnvironment.PRODUCTION
  ) {
    throw new BusinessRuleError(
      "Production tax-authority certification is blocked until an official adapter is reviewed and registered.",
    )
  }

  const run = async (tx: Prisma.TransactionClient) => {
    const postingBatch = await tx.ledgerPostingBatch.findFirst({
      where: {
        organizationId: parsed.organizationId,
        sourceType: parsed.sourceType,
        sourceId: parsed.sourceId,
        status: LedgerPostingBatchStatus.POSTED,
      },
      include: {
        journalEntries: {
          where: { status: "POSTED" },
          orderBy: { postedAt: "desc" },
          take: 1,
        },
        sourceLinks: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!postingBatch) {
      throw new NotFoundError(
        "Posted ledger source was not found for this fiscal document.",
      )
    }

    const journalEntry = postingBatch.journalEntries[0] ?? null
    const sourceLink = postingBatch.sourceLinks[0] ?? null
    const canonicalPayload =
      parsed.canonicalPayload ??
      buildDefaultCanonicalPayload({
        parsed,
        issueDate,
        postingBatchId: postingBatch.id,
        journalEntryId: journalEntry?.id,
        countryPackVersion: packMetadata.packVersion,
        countryPackSchemaVersion: packMetadata.schemaVersion,
        countryPackResolutionHash: packMetadata.combinedResolutionHash,
      })
    const canonicalPayloadHash = hashPayload(canonicalPayload)

    const existing = await tx.fiscalDocument.findFirst({
      where: {
        organizationId: parsed.organizationId,
        OR: [
          { idempotencyKey: parsed.idempotencyKey },
          {
            sourceType: parsed.sourceType,
            sourceId: parsed.sourceId,
            documentType: parsed.documentType,
          },
        ],
      },
      include: fiscalDocumentInclude,
    })

    if (existing) {
      if (existing.canonicalPayloadHash !== canonicalPayloadHash) {
        throw new ConflictError(
          "Fiscal document idempotency/source key was reused with a different canonical payload.",
        )
      }

      return existing
    }

    const fiscalDocument = await tx.fiscalDocument.create({
      data: {
        organizationId: parsed.organizationId,
        documentType: parsed.documentType,
        status: parsed.enqueueCertification
          ? FiscalDocumentStatus.QUEUED
          : FiscalDocumentStatus.DRAFT,
        sourceType: parsed.sourceType,
        sourceId: parsed.sourceId,
        sourceNumber: parsed.sourceNumber ?? null,
        sourceDate: parsed.sourceDate ?? null,
        issueDate,
        postingBatchId: postingBatch.id,
        journalEntryId: journalEntry?.id ?? null,
        accountingSourceLinkId: sourceLink?.id ?? null,
        countryCode: packMetadata.countryCode,
        countryPackVersion: packMetadata.packVersion,
        countryPackSchemaVersion: packMetadata.schemaVersion,
        countryPackResolutionHash: packMetadata.combinedResolutionHash,
        countryPackLegalRef: packMetadata.capability.legalRef,
        countryPackVerificationStatus: packMetadata.capability.verificationStatus,
        certificationPolicySnapshot:
          packMetadata.certificationPolicy.value as Prisma.InputJsonValue,
        requiredFieldsSnapshot:
          packMetadata.requiredFields.value as Prisma.InputJsonValue,
        artifactExpectationsSnapshot:
          packMetadata.artifactExpectations.value as Prisma.InputJsonValue,
        fiscalYear,
        fiscalPeriodKey: parsed.fiscalPeriodKey,
        sequenceScopeKey: parsed.sequenceScopeKey,
        currency: parsed.currency,
        subtotal: toDecimal(parsed.subtotal),
        taxAmount: toDecimal(parsed.taxAmount),
        discountAmount: toDecimal(parsed.discountAmount),
        totalAmount: toDecimal(parsed.totalAmount),
        taxBreakdown: parsed.taxBreakdown as Prisma.InputJsonValue,
        canonicalPayload: canonicalPayload as Prisma.InputJsonValue,
        canonicalPayloadHash,
        sourcePayloadHash: parsed.sourcePayloadHash ?? null,
        idempotencyKey: parsed.idempotencyKey,
        authorityChannel: parsed.authorityChannel ?? null,
        createdById: parsed.createdById ?? null,
        metadata: parsed.metadata as Prisma.InputJsonValue,
        lines: {
          create: parsed.lines.map((line) => ({
            organizationId: parsed.organizationId,
            lineNumber: line.lineNumber,
            sourceLineId: line.sourceLineId ?? null,
            itemId: line.itemId ?? null,
            description: line.description,
            quantity: toDecimal3(line.quantity),
            unitPrice: toDecimal(line.unitPrice),
            discountAmount: toDecimal(line.discountAmount),
            taxRateBps: line.taxRateBps ?? null,
            taxCode: line.taxCode ?? null,
            taxAmount: toDecimal(line.taxAmount),
            lineSubtotal: toDecimal(line.lineSubtotal),
            lineTotal: toDecimal(line.lineTotal),
            linePayload: line.linePayload as Prisma.InputJsonValue,
            lineHash: hashComplianceArtifact({
              fiscalDocumentId: parsed.idempotencyKey,
              lineNumber: line.lineNumber,
              linePayload: line.linePayload,
              amounts: {
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                taxAmount: line.taxAmount,
                lineTotal: line.lineTotal,
              },
            }),
            metadata: line.metadata as Prisma.InputJsonValue,
          })),
        },
      },
      include: fiscalDocumentInclude,
    })

    await recordComplianceEvidence(
      {
        organizationId: parsed.organizationId,
        fiscalDocumentId: fiscalDocument.id,
        evidenceType: ComplianceEvidenceType.CANONICAL_PAYLOAD,
        source: ComplianceEvidenceSource.PLATFORM,
        artifactHash: canonicalPayloadHash,
        payload: canonicalPayload as Prisma.InputJsonValue,
        legalRef: packMetadata.capability.legalRef,
        capturedById: parsed.createdById ?? null,
        metadata: {
          countryPackVersion: packMetadata.packVersion,
          countryPackResolutionHash: packMetadata.combinedResolutionHash,
        },
      },
      tx,
    )

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.createdById ?? null,
        entityType: "FiscalDocument",
        entityId: fiscalDocument.id,
        action: "CREATE",
        changes: {
          after: {
            documentType: fiscalDocument.documentType,
            sourceType: fiscalDocument.sourceType,
            sourceId: fiscalDocument.sourceId,
            postingBatchId: fiscalDocument.postingBatchId,
            countryPackVersion: fiscalDocument.countryPackVersion,
            canonicalPayloadHash,
          },
        },
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "compliance.fiscal_document.created",
      eventSource: "INTERNAL",
      idempotencyKey: `fiscal-document:${fiscalDocument.id}:created`,
      actorId: parsed.createdById ?? undefined,
      sourceType: fiscalDocument.sourceType,
      sourceId: fiscalDocument.sourceId,
      postingBatchId: fiscalDocument.postingBatchId,
      documentHash: canonicalPayloadHash,
      payload: {
        fiscalDocumentId: fiscalDocument.id,
        documentType: fiscalDocument.documentType,
        status: fiscalDocument.status,
        sourceType: fiscalDocument.sourceType,
        sourceId: fiscalDocument.sourceId,
        sourceNumber: fiscalDocument.sourceNumber,
        issueDate: fiscalDocument.issueDate,
        postingBatchId: fiscalDocument.postingBatchId,
        journalEntryId: fiscalDocument.journalEntryId,
        accountingSourceLinkId: fiscalDocument.accountingSourceLinkId,
        countryCode: fiscalDocument.countryCode,
        countryPackVersion: fiscalDocument.countryPackVersion,
        countryPackResolutionHash: fiscalDocument.countryPackResolutionHash,
        certificationPolicy: fiscalDocument.certificationPolicySnapshot,
        authorityChannel: fiscalDocument.authorityChannel,
        currency: fiscalDocument.currency,
        totals: {
          subtotal: String(fiscalDocument.subtotal),
          taxAmount: String(fiscalDocument.taxAmount),
          discountAmount: String(fiscalDocument.discountAmount),
          totalAmount: String(fiscalDocument.totalAmount),
        },
        canonicalPayloadHash,
        enqueueCertification: parsed.enqueueCertification,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "compliance.fiscal_document.created",
          payload: {
            fiscalDocumentId: fiscalDocument.id,
            documentType: fiscalDocument.documentType,
            status: fiscalDocument.status,
            sourceType: fiscalDocument.sourceType,
            sourceId: fiscalDocument.sourceId,
            countryCode: fiscalDocument.countryCode,
            countryPackVersion: fiscalDocument.countryPackVersion,
          },
        },
      ],
    })

    if (parsed.enqueueCertification) {
      if (!parsed.authorityChannel) {
        throw new BusinessRuleError(
          "authorityChannel is required when enqueueCertification is true.",
        )
      }

      await enqueueComplianceSubmission(
        {
          organizationId: parsed.organizationId,
          actorId: parsed.createdById ?? null,
          fiscalDocumentId: fiscalDocument.id,
          operation: ComplianceSubmissionOperation.CERTIFY,
          authorityChannel: parsed.authorityChannel,
          adapterKey: parsed.adapterKey ?? null,
          environment: parsed.adapterEnvironment,
          idempotencyKey: buildComplianceSubmissionIdempotencyKey({
            organizationId: parsed.organizationId,
            fiscalDocumentId: fiscalDocument.id,
            authorityChannel: parsed.authorityChannel,
            operation: ComplianceSubmissionOperation.CERTIFY,
            payloadHash: canonicalPayloadHash,
          }),
          payloadHash: canonicalPayloadHash,
          requestSummary: {
            documentType: parsed.documentType,
            sourceType: parsed.sourceType,
            sourceId: parsed.sourceId,
            adapterEnvironment: parsed.adapterEnvironment,
          },
        },
        tx,
      )
    }

    return tx.fiscalDocument.findFirstOrThrow({
      where: { id: fiscalDocument.id, organizationId: parsed.organizationId },
      include: fiscalDocumentInclude,
    })
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function getFiscalDocumentTrace(
  organizationId: string,
  fiscalDocumentId: string,
) {
  const fiscalDocument = await db.fiscalDocument.findFirst({
    where: { id: fiscalDocumentId, organizationId },
    include: {
      ...fiscalDocumentInclude,
      postingBatch: true,
      journalEntry: true,
      accountingSourceLink: true,
      sequence: true,
    },
  })

  if (!fiscalDocument) throw new NotFoundError("Fiscal document not found.")
  return fiscalDocument
}
