import {
  ComplianceAdapterConfigStatus,
  ComplianceAdapterEnvironment,
  ComplianceEvidenceSource,
  ComplianceEvidenceType,
  ComplianceSubmissionStatus,
  FiscalDocumentStatus,
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
  enqueueComplianceSubmissionSchema,
  type EnqueueComplianceSubmissionInput,
} from "./fiscal-document.schemas"
import { getComplianceAdapter } from "./adapters/registry"
import type { AdapterConfigContext, CanonicalFiscalPayload } from "./adapter-contract"
import { recordComplianceEvidenceOnce } from "./evidence.service"
import { credentialReferenceSchema } from "./country-adapter-pilot.schemas"

type DbClient = Prisma.TransactionClient | typeof db

function hasTransaction(client: DbClient): client is typeof db {
  return "$transaction" in client
}

function normalizeToken(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_")
}

export function buildComplianceSubmissionIdempotencyKey(input: {
  organizationId: string
  fiscalDocumentId: string
  authorityChannel: string
  operation: string
  payloadHash: string
}) {
  return [
    input.organizationId,
    input.fiscalDocumentId,
    input.authorityChannel,
    input.operation,
    input.payloadHash,
  ]
    .map((part) => normalizeToken(String(part)))
    .join(":")
}

export async function enqueueComplianceSubmission(
  input: EnqueueComplianceSubmissionInput,
  client: DbClient = db,
) {
  const parsed = enqueueComplianceSubmissionSchema.parse(input)

  if (parsed.environment === ComplianceAdapterEnvironment.PRODUCTION) {
    throw new BusinessRuleError(
      "Production compliance submissions are blocked until an official adapter is reviewed and registered.",
    )
  }

  const run = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.complianceSubmission.findFirst({
      where: {
        organizationId: parsed.organizationId,
        authorityChannel: parsed.authorityChannel,
        operation: parsed.operation,
        idempotencyKey: parsed.idempotencyKey,
      },
    })

    if (existing) {
      if (existing.payloadHash !== parsed.payloadHash) {
        throw new ConflictError(
          "Compliance submission idempotency key was reused with a different payload hash.",
        )
      }

      return existing
    }

    const fiscalDocument = await tx.fiscalDocument.findFirst({
      where: {
        id: parsed.fiscalDocumentId,
        organizationId: parsed.organizationId,
      },
    })

    if (!fiscalDocument) {
      throw new NotFoundError("Fiscal document not found.")
    }

    if (
      fiscalDocument.status === FiscalDocumentStatus.CERTIFIED ||
      fiscalDocument.status === FiscalDocumentStatus.REVERSED
    ) {
      throw new BusinessRuleError(
        "Certified or reversed fiscal documents cannot be queued for a new certification submission.",
      )
    }

    const nextAttemptAt = parsed.nextAttemptAt ?? new Date()
    const submission = await tx.complianceSubmission.create({
      data: {
        organizationId: parsed.organizationId,
        fiscalDocumentId: parsed.fiscalDocumentId,
        adapterConfigId: parsed.adapterConfigId ?? null,
        operation: parsed.operation,
        authorityChannel: parsed.authorityChannel,
        adapterKey: parsed.adapterKey ?? null,
        environment: parsed.environment,
        idempotencyKey: parsed.idempotencyKey,
        payloadHash: parsed.payloadHash,
        nextAttemptAt,
        requestSummary: parsed.requestSummary as Prisma.InputJsonValue,
        metadata: parsed.metadata as Prisma.InputJsonValue,
      },
    })

    if (fiscalDocument.status === FiscalDocumentStatus.DRAFT) {
      await tx.fiscalDocument.update({
        where: { id: fiscalDocument.id },
        data: {
          status: FiscalDocumentStatus.QUEUED,
          authorityChannel: parsed.authorityChannel,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.actorId ?? null,
        entityType: "ComplianceSubmission",
        entityId: submission.id,
        action: "ENQUEUE",
        changes: {
          after: {
            fiscalDocumentId: parsed.fiscalDocumentId,
            authorityChannel: parsed.authorityChannel,
            operation: parsed.operation,
            payloadHash: parsed.payloadHash,
          },
        },
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "compliance.submission.queued",
      eventSource: "INTERNAL",
      idempotencyKey: `compliance-submission:${submission.id}:queued`,
      actorId: parsed.actorId ?? undefined,
      sourceType: fiscalDocument.sourceType,
      sourceId: fiscalDocument.sourceId,
      postingBatchId: fiscalDocument.postingBatchId,
      documentHash: parsed.payloadHash,
      payload: {
        submissionId: submission.id,
        fiscalDocumentId: parsed.fiscalDocumentId,
        operation: parsed.operation,
        status: submission.status,
        authorityChannel: parsed.authorityChannel,
        adapterKey: parsed.adapterKey ?? null,
        environment: parsed.environment,
        payloadHash: parsed.payloadHash,
        nextAttemptAt,
        fiscalDocument: {
          documentType: fiscalDocument.documentType,
          status: fiscalDocument.status,
          sourceType: fiscalDocument.sourceType,
          sourceId: fiscalDocument.sourceId,
          postingBatchId: fiscalDocument.postingBatchId,
          countryCode: fiscalDocument.countryCode,
          countryPackVersion: fiscalDocument.countryPackVersion,
        },
      },
      outboxMessages: [
        {
          channel: "AUTHORITY_SUBMISSION",
          eventName: "compliance.submission.queued",
          idempotencyKey: `${parsed.idempotencyKey}:authority-submission`,
          payload: {
            submissionId: submission.id,
            fiscalDocumentId: parsed.fiscalDocumentId,
            operation: parsed.operation,
            authorityChannel: parsed.authorityChannel,
            environment: parsed.environment,
          },
        },
        {
          channel: "NOTIFICATION",
          eventName: "compliance.submission.queued",
          idempotencyKey: `${parsed.idempotencyKey}:notification`,
          payload: {
            submissionId: submission.id,
            fiscalDocumentId: parsed.fiscalDocumentId,
            status: submission.status,
            authorityChannel: parsed.authorityChannel,
          },
        },
      ],
    })

    return submission
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function leaseComplianceSubmissions(
  input: {
    organizationId: string
    limit?: number
    leasedBy: string
    leaseSeconds?: number
    now?: Date
  },
  client: DbClient = db,
) {
  const now = input.now ?? new Date()
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)
  const leaseUntil = new Date(
    now.getTime() + Math.max(input.leaseSeconds ?? 60, 10) * 1000,
  )

  const claimableWhere = {
    organizationId: input.organizationId,
    OR: [
      {
        status: {
          in: [
            ComplianceSubmissionStatus.PENDING,
            ComplianceSubmissionStatus.RETRY_SCHEDULED,
          ],
        },
        nextAttemptAt: { lte: now },
      },
      {
        status: ComplianceSubmissionStatus.LEASED,
        leasedUntil: { lte: now },
      },
      {
        status: ComplianceSubmissionStatus.LEASED,
        leasedUntil: null,
      },
    ],
  } satisfies Prisma.ComplianceSubmissionWhereInput

  const due = await client.complianceSubmission.findMany({
    where: {
      ...claimableWhere,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  })

  const leased: typeof due = []
  for (const submission of due) {
    const claimed = await client.complianceSubmission.updateMany({
      where: {
        id: submission.id,
        ...claimableWhere,
      },
      data: {
        status: ComplianceSubmissionStatus.LEASED,
        leasedAt: now,
        leasedUntil: leaseUntil,
        leasedBy: input.leasedBy,
        attempts: { increment: 1 },
      },
    })

    if (claimed.count !== 1) continue

    const claimedSubmission = await client.complianceSubmission.findFirst({
      where: {
        id: submission.id,
        organizationId: input.organizationId,
        status: ComplianceSubmissionStatus.LEASED,
        leasedBy: input.leasedBy,
        leasedUntil: leaseUntil,
      },
    })

    if (claimedSubmission) leased.push(claimedSubmission)
  }

  return leased
}

type FiscalDocumentForAdapter = {
  id: string
  organizationId: string
  documentType: string
  sourceType: string
  sourceId: string
  sourceNumber?: string | null
  sourceDate?: Date | null
  issueDate: Date
  postingBatchId: string
  journalEntryId?: string | null
  countryCode: string
  countryPackVersion: string
  countryPackSchemaVersion: string
  countryPackResolutionHash: string
  currency: string
  subtotal: Prisma.Decimal.Value
  taxAmount: Prisma.Decimal.Value
  discountAmount: Prisma.Decimal.Value
  totalAmount: Prisma.Decimal.Value
  canonicalPayload?: Prisma.JsonValue | null
  metadata?: Prisma.JsonValue | null
  lines: Array<{
    lineNumber: number
    sourceLineId?: string | null
    itemId?: string | null
    description: string
    quantity: Prisma.Decimal.Value
    unitPrice: Prisma.Decimal.Value
    discountAmount: Prisma.Decimal.Value
    taxRateBps?: number | null
    taxCode?: string | null
    taxAmount: Prisma.Decimal.Value
    lineSubtotal: Prisma.Decimal.Value
    lineTotal: Prisma.Decimal.Value
    linePayload?: Prisma.JsonValue | null
  }>
}

type AdapterConfigForSubmission = {
  id: string
  status: ComplianceAdapterConfigStatus
  countryCode: string
  countryPackVersion: string
  countryPackResolutionHash: string
  capabilityStatus: string
  credentialReference?: string | null
  publicMetadata?: Prisma.JsonValue | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function decimalString(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toFixed(2)
}

function quantityString(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(3).toFixed(3)
}

function buildCanonicalPayloadFromDocument(
  fiscalDocument: FiscalDocumentForAdapter,
): CanonicalFiscalPayload {
  const storedPayload = jsonObject(fiscalDocument.canonicalPayload) ?? {}
  const storedSource = jsonObject(storedPayload.source) ?? {}
  const storedTotals = jsonObject(storedPayload.totals) ?? {}
  const storedPack = jsonObject(storedPayload.pack) ?? {}
  const storedLines = Array.isArray(storedPayload.lines)
    ? storedPayload.lines.filter(isRecord)
    : fiscalDocument.lines.map((line) => ({
        lineNumber: line.lineNumber,
        sourceLineId: line.sourceLineId ?? null,
        itemId: line.itemId ?? null,
        description: line.description,
        quantity: quantityString(line.quantity),
        unitPrice: decimalString(line.unitPrice),
        discountAmount: decimalString(line.discountAmount),
        taxRateBps: line.taxRateBps ?? null,
        taxCode: line.taxCode ?? null,
        taxAmount: decimalString(line.taxAmount),
        lineSubtotal: decimalString(line.lineSubtotal),
        lineTotal: decimalString(line.lineTotal),
        linePayload: line.linePayload ?? null,
      }))

  return {
    ...storedPayload,
    fiscalDocumentId: fiscalDocument.id,
    organizationId: fiscalDocument.organizationId,
    documentType: fiscalDocument.documentType,
    countryCode: fiscalDocument.countryCode,
    currency: fiscalDocument.currency,
    issueDate: fiscalDocument.issueDate.toISOString(),
    source: {
      ...storedSource,
      sourceType: fiscalDocument.sourceType,
      sourceId: fiscalDocument.sourceId,
      sourceNumber: fiscalDocument.sourceNumber ?? null,
      sourceDate: fiscalDocument.sourceDate?.toISOString() ?? null,
      postingBatchId: fiscalDocument.postingBatchId,
      journalEntryId: fiscalDocument.journalEntryId ?? null,
    },
    totals: {
      subtotal:
        typeof storedTotals.subtotal === "string"
          ? storedTotals.subtotal
          : decimalString(fiscalDocument.subtotal),
      taxAmount:
        typeof storedTotals.taxAmount === "string"
          ? storedTotals.taxAmount
          : decimalString(fiscalDocument.taxAmount),
      discountAmount:
        typeof storedTotals.discountAmount === "string"
          ? storedTotals.discountAmount
          : decimalString(fiscalDocument.discountAmount),
      totalAmount:
        typeof storedTotals.totalAmount === "string"
          ? storedTotals.totalAmount
          : decimalString(fiscalDocument.totalAmount),
    },
    lines: storedLines,
    pack: {
      ...storedPack,
      version: fiscalDocument.countryPackVersion,
      schemaVersion: fiscalDocument.countryPackSchemaVersion,
      resolutionHash: fiscalDocument.countryPackResolutionHash,
    },
    metadata: jsonObject(fiscalDocument.metadata) ?? undefined,
  }
}

function adapterConfigContext(
  adapterConfig: AdapterConfigForSubmission | null,
): AdapterConfigContext | null {
  if (!adapterConfig) return null

  return {
    id: adapterConfig.id,
    status: adapterConfig.status,
    countryCode: adapterConfig.countryCode,
    countryPackVersion: adapterConfig.countryPackVersion,
    countryPackResolutionHash: adapterConfig.countryPackResolutionHash,
    capabilityStatus: adapterConfig.capabilityStatus,
    credentialReference: adapterConfig.credentialReference ?? null,
    publicMetadata: jsonObject(adapterConfig.publicMetadata),
  }
}

function evidenceTypeForArtifact(type: string): ComplianceEvidenceType {
  if (type === "AUTHORITY_REFERENCE") return ComplianceEvidenceType.AUTHORITY_REFERENCE
  if (type === "QR_CODE_PAYLOAD") return ComplianceEvidenceType.QR_CODE_PAYLOAD
  if (type === "SUBMITTED_PAYLOAD_HASH") return ComplianceEvidenceType.SUBMITTED_PAYLOAD
  if (type === "MANUAL_PORTAL_PROOF") return ComplianceEvidenceType.MANUAL_PORTAL_PROOF
  return ComplianceEvidenceType.AUTHORITY_RESPONSE
}

function evidenceSourceForArtifact(source: string): ComplianceEvidenceSource {
  if (source === "AUTHORITY") return ComplianceEvidenceSource.AUTHORITY
  if (source === "MANUAL_PORTAL") return ComplianceEvidenceSource.MANUAL_PORTAL
  if (source === "ADAPTER") return ComplianceEvidenceSource.ADAPTER
  return ComplianceEvidenceSource.PLATFORM
}

function nextRetryAt(now: Date, retryAfterSeconds?: number | null) {
  return new Date(now.getTime() + Math.max(retryAfterSeconds ?? 300, 30) * 1000)
}

export async function processComplianceSubmission(
  input: {
    organizationId: string
    submissionId: string
    processedBy?: string | null
    now?: Date
  },
  client: DbClient = db,
) {
  const now = input.now ?? new Date()
  const workerId = input.processedBy?.trim()

  if (!workerId) {
    throw new BusinessRuleError(
      "Compliance submission processing requires an explicit worker identity.",
    )
  }

  if (!hasTransaction(client)) {
    throw new BusinessRuleError(
      "Compliance submissions must be processed outside an existing database transaction.",
    )
  }

  const prepared = await client.$transaction(async (tx) => {
    const submission = await tx.complianceSubmission.findFirst({
      where: {
        id: input.submissionId,
        organizationId: input.organizationId,
      },
      include: {
        fiscalDocument: {
          include: {
            lines: { orderBy: { lineNumber: "asc" } },
          },
        },
        adapterConfig: true,
      },
    })

    if (!submission) {
      throw new NotFoundError("Compliance submission not found.")
    }

    const processableStatuses: ComplianceSubmissionStatus[] = [
      ComplianceSubmissionStatus.PENDING,
      ComplianceSubmissionStatus.LEASED,
      ComplianceSubmissionStatus.RETRY_SCHEDULED,
    ]

    if (!processableStatuses.includes(submission.status)) {
      throw new BusinessRuleError(
        "Only pending, leased, or retry-scheduled compliance submissions can be processed.",
      )
    }

    const ownsActiveLease = Boolean(
      submission.status === ComplianceSubmissionStatus.LEASED &&
        submission.leasedBy === workerId &&
        submission.leasedUntil &&
        submission.leasedUntil > now,
    )

    if (!ownsActiveLease) {
      const claimed = await tx.complianceSubmission.updateMany({
        where: {
          id: submission.id,
          organizationId: input.organizationId,
          OR: [
            {
              status: ComplianceSubmissionStatus.PENDING,
              nextAttemptAt: { lte: now },
            },
            {
              status: ComplianceSubmissionStatus.RETRY_SCHEDULED,
              nextAttemptAt: { lte: now },
            },
            {
              status: ComplianceSubmissionStatus.LEASED,
              leasedUntil: { lte: now },
            },
            {
              status: ComplianceSubmissionStatus.LEASED,
              leasedUntil: null,
            },
          ],
        },
        data: {
          status: ComplianceSubmissionStatus.LEASED,
          leasedAt: now,
          leasedUntil: new Date(now.getTime() + 60_000),
          leasedBy: workerId,
          attempts: { increment: 1 },
        },
      })

      if (claimed.count !== 1) {
        throw new ConflictError(
          "Compliance submission is not due or is leased by another worker.",
        )
      }
    }

    const fiscalDocument = submission.fiscalDocument
    let adapterConfig = submission.adapterConfig

    if (
      !adapterConfig &&
      submission.environment !== ComplianceAdapterEnvironment.FAKE_SANDBOX
    ) {
      adapterConfig = await tx.complianceAdapterConfig.findFirst({
        where: {
          organizationId: submission.organizationId,
          countryCode: fiscalDocument.countryCode,
          authorityChannel: submission.authorityChannel,
          environment: submission.environment,
        },
      })
    }

    return {
      submission,
      fiscalDocument,
      adapterConfig,
      attemptNumber: ownsActiveLease
        ? submission.attempts
        : submission.attempts + 1,
    }
  })

  const { submission, fiscalDocument } = prepared
  const adapterConfig = prepared.adapterConfig

  const failSubmission = async (options: {
    status: ComplianceSubmissionStatus
    errorCode: string
    message: string
    responsePayload?: Record<string, unknown> | null
    responseHash?: string | null
    rejectionReason?: string | null
    retryAfterSeconds?: number | null
    updateDocumentStatus?: FiscalDocumentStatus
  }) =>
    client.$transaction(async (tx) => {
      const ownedSubmission = await tx.complianceSubmission.findFirst({
        where: {
          id: submission.id,
          organizationId: submission.organizationId,
          leasedBy: workerId,
          status: {
            in: [
              ComplianceSubmissionStatus.LEASED,
              ComplianceSubmissionStatus.SUBMITTED,
            ],
          },
        },
      })

      if (!ownedSubmission) {
        throw new ConflictError(
          "Compliance submission lease ownership was lost before failure evidence could be finalized.",
        )
      }

      const retryRequested =
        options.status === ComplianceSubmissionStatus.RETRY_SCHEDULED
      const retryable =
        retryRequested && prepared.attemptNumber < submission.maxAttempts
      const persistedStatus = retryable
        ? ComplianceSubmissionStatus.RETRY_SCHEDULED
        : retryRequested
          ? ComplianceSubmissionStatus.FAILED
          : options.status
      const nextAttemptAt = retryable
        ? nextRetryAt(now, options.retryAfterSeconds)
        : submission.nextAttemptAt

      const updatedSubmission = await tx.complianceSubmission.update({
        where: { id: submission.id },
        data: {
          status: persistedStatus,
          errorCode: options.errorCode,
          errorMessage: options.message,
          rejectionReason: options.rejectionReason ?? null,
          responseHash: options.responseHash ?? undefined,
          responseSummary: options.responsePayload as Prisma.InputJsonValue,
          nextAttemptAt,
          completedAt: retryable ? null : now,
          leasedAt: null,
          leasedUntil: null,
          leasedBy: null,
        },
      })

      if (options.updateDocumentStatus) {
        await tx.fiscalDocument.update({
          where: { id: fiscalDocument.id },
          data: {
            status: options.updateDocumentStatus,
            rejectedAt:
              options.updateDocumentStatus === FiscalDocumentStatus.REJECTED
                ? now
                : undefined,
            rejectionReason: options.rejectionReason ?? options.message,
          },
        })
      }

      await recordComplianceEvidenceOnce(
        {
          organizationId: submission.organizationId,
          fiscalDocumentId: fiscalDocument.id,
          submissionId: submission.id,
          evidenceType: ComplianceEvidenceType.ERROR_REPORT,
          source: ComplianceEvidenceSource.ADAPTER,
          redactedPayload:
            (options.responsePayload ?? {
              errorCode: options.errorCode,
              message: options.message,
              retryable,
            }) as Prisma.InputJsonValue,
          artifactHash: options.responseHash ?? null,
          authorityReference: submission.authorityReference,
          metadata: {
            errorCode: options.errorCode,
            retryable,
            attemptNumber: prepared.attemptNumber,
            maxAttempts: submission.maxAttempts,
            sandboxGrade: true,
          },
        },
        tx,
      )

      await recordBusinessEventInTx(tx, {
        organizationId: submission.organizationId,
        eventType:
          persistedStatus === ComplianceSubmissionStatus.REJECTED
            ? "AUTHORITY_SUBMISSION_REJECTED"
            : retryable
              ? "compliance.submission.retry_scheduled"
              : "compliance.submission.failed",
        eventSource: "INTERNAL",
        idempotencyKey: `compliance-submission:${submission.id}:${options.errorCode}:${now.toISOString()}`,
        actorId: workerId,
        sourceType: fiscalDocument.sourceType,
        sourceId: fiscalDocument.sourceId,
        postingBatchId: fiscalDocument.postingBatchId,
        documentHash: submission.payloadHash,
        payload: {
          submissionId: submission.id,
          fiscalDocumentId: fiscalDocument.id,
          status: persistedStatus,
          authorityChannel: submission.authorityChannel,
          adapterKey: submission.adapterKey ?? adapterConfig?.adapterKey ?? null,
          errorCode: options.errorCode,
          retryable,
          responseHash: options.responseHash ?? null,
        },
        outboxMessages: [
          {
            channel: "NOTIFICATION",
            eventName: retryable
              ? "compliance.submission.retry_scheduled"
              : "compliance.submission.failed",
            payload: {
              submissionId: submission.id,
              fiscalDocumentId: fiscalDocument.id,
              status: persistedStatus,
              errorCode: options.errorCode,
            },
          },
        ],
      })

      return updatedSubmission
    })

  if (submission.environment === ComplianceAdapterEnvironment.PRODUCTION) {
    return failSubmission({
      status: ComplianceSubmissionStatus.FAILED,
      errorCode: "PRODUCTION_ADAPTER_BLOCKED",
      message:
        "Production compliance submissions are blocked until official certification is registered.",
    })
  }

  if (
    submission.environment !== ComplianceAdapterEnvironment.FAKE_SANDBOX &&
    !adapterConfig
  ) {
    return failSubmission({
      status: ComplianceSubmissionStatus.FAILED,
      errorCode: "CREDENTIAL_CONFIGURATION_ERROR",
      message:
        "No tenant adapter configuration is registered for this country, channel, and environment.",
    })
  }

  if (
    adapterConfig &&
    adapterConfig.status !== ComplianceAdapterConfigStatus.ACTIVE
  ) {
    return failSubmission({
      status: ComplianceSubmissionStatus.FAILED,
      errorCode: "CREDENTIAL_CONFIGURATION_ERROR",
      message:
        "Tenant compliance adapter configuration is not active or is disabled.",
    })
  }

  if (
    adapterConfig &&
    submission.environment !== ComplianceAdapterEnvironment.FAKE_SANDBOX &&
    !credentialReferenceSchema.safeParse(adapterConfig.credentialReference).success
  ) {
    return failSubmission({
      status: ComplianceSubmissionStatus.FAILED,
      errorCode: "CREDENTIAL_CONFIGURATION_ERROR",
      message:
        "Tenant compliance adapter credential reference is missing or is not an approved secret-manager URI; secrets must remain outside country packs and logs.",
    })
  }

  if (
    adapterConfig?.credentialExpiresAt &&
    adapterConfig.credentialExpiresAt <= now
  ) {
    return failSubmission({
      status: ComplianceSubmissionStatus.FAILED,
      errorCode: "CREDENTIAL_CONFIGURATION_ERROR",
      message:
        "Tenant compliance adapter credentials have expired and must be rotated before submission.",
    })
  }

  if (
    adapterConfig &&
    adapterConfig.countryPackVersion !== fiscalDocument.countryPackVersion
  ) {
    return failSubmission({
      status: ComplianceSubmissionStatus.FAILED,
      errorCode: "CONFIGURATION_ERROR",
      message:
        "Tenant adapter configuration country-pack version does not match the fiscal document provenance.",
    })
  }

  const adapterKey = submission.adapterKey ?? adapterConfig?.adapterKey ?? null
  const adapter = getComplianceAdapter(adapterKey)
  const canonicalPayload = buildCanonicalPayloadFromDocument(fiscalDocument)

  try {
    const validation = await adapter.validatePayload(canonicalPayload)

    if (!validation.ok) {
      return failSubmission({
        status: ComplianceSubmissionStatus.FAILED,
        errorCode: validation.code,
        message: validation.message,
        updateDocumentStatus: FiscalDocumentStatus.REJECTED,
      })
    }
  } catch {
    return failSubmission({
      status: ComplianceSubmissionStatus.FAILED,
      errorCode: "PAYLOAD_VALIDATION_ERROR",
      message:
        "Compliance payload validation failed before a trusted authority request could be built.",
    })
  }

  let authorityPayload: Awaited<
    ReturnType<typeof adapter.buildAuthorityPayload>
  >
  try {
    authorityPayload = await adapter.buildAuthorityPayload(canonicalPayload)
  } catch {
    return failSubmission({
      status: ComplianceSubmissionStatus.FAILED,
      errorCode: "PAYLOAD_VALIDATION_ERROR",
      message:
        "Compliance authority payload construction failed before dispatch.",
    })
  }

  await client.$transaction(async (tx) => {
    const ownedSubmission = await tx.complianceSubmission.findFirst({
      where: {
        id: submission.id,
        organizationId: submission.organizationId,
        status: ComplianceSubmissionStatus.LEASED,
        leasedBy: workerId,
      },
    })

    if (!ownedSubmission) {
      throw new ConflictError(
        "Compliance submission lease ownership was lost before authority dispatch.",
      )
    }

    await recordComplianceEvidenceOnce(
      {
        organizationId: submission.organizationId,
        fiscalDocumentId: fiscalDocument.id,
        submissionId: submission.id,
        evidenceType: ComplianceEvidenceType.SUBMITTED_PAYLOAD,
        source: ComplianceEvidenceSource.PLATFORM,
        artifactHash: authorityPayload.payloadHash,
        payload: authorityPayload.payload as Prisma.InputJsonValue,
        metadata: {
          adapterCode: authorityPayload.adapterCode,
          canonicalPayloadHash: submission.payloadHash,
          sandboxGrade: true,
        },
      },
      tx,
    )

    await tx.complianceSubmission.update({
      where: { id: submission.id },
      data: {
        status: ComplianceSubmissionStatus.SUBMITTED,
        adapterConfigId: adapterConfig?.id ?? submission.adapterConfigId,
        adapterKey: adapter.code,
        requestHash: authorityPayload.payloadHash,
        submittedAt: now,
        correlationId:
          submission.correlationId ??
          `${adapter.code}:${submission.id}:${authorityPayload.payloadHash.slice(-12)}`,
        errorCode: null,
        errorMessage: null,
        rejectionReason: null,
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: submission.organizationId,
      eventType: "AUTHORITY_SUBMISSION_SENT",
      eventSource: "INTERNAL",
      idempotencyKey: `compliance-submission:${submission.id}:sent:${authorityPayload.payloadHash}`,
      actorId: workerId,
      sourceType: fiscalDocument.sourceType,
      sourceId: fiscalDocument.sourceId,
      postingBatchId: fiscalDocument.postingBatchId,
      documentHash: authorityPayload.payloadHash,
      payload: {
        submissionId: submission.id,
        fiscalDocumentId: fiscalDocument.id,
        authorityChannel: submission.authorityChannel,
        adapterKey: adapter.code,
        requestHash: authorityPayload.payloadHash,
        sandboxGrade: true,
        productionCertification: false,
      },
      outboxMessages: [],
    })
  })

  let result: Awaited<ReturnType<typeof adapter.submit>>
  try {
    result = await adapter.submit(authorityPayload, {
      organizationId: submission.organizationId,
      authorityChannel: submission.authorityChannel,
      environment: submission.environment,
      correlationId:
        submission.correlationId ??
        `${adapter.code}:${submission.id}:${authorityPayload.payloadHash.slice(-12)}`,
      adapterConfig: adapterConfigContext(adapterConfig),
    })
  } catch {
    return failSubmission({
      status: ComplianceSubmissionStatus.RETRY_SCHEDULED,
      errorCode: "UNKNOWN_UNSAFE_ERROR",
      message:
        "The authority adapter did not return a trusted response; the submission was scheduled for controlled retry.",
    })
  }

  if (!result.ok) {
    if (
      result.status === "RETRYABLE_AUTHORITY_OUTAGE" ||
      result.status === "RATE_LIMITED"
    ) {
      return failSubmission({
        status: ComplianceSubmissionStatus.RETRY_SCHEDULED,
        errorCode: result.status,
        message: result.message,
        responsePayload: result.responsePayload,
        responseHash: result.responseHash,
        retryAfterSeconds: result.retryAfterSeconds,
      })
    }

    return failSubmission({
      status:
        result.status === "TERMINAL_REJECTION"
          ? ComplianceSubmissionStatus.REJECTED
          : ComplianceSubmissionStatus.FAILED,
      errorCode: result.status,
      message: result.message,
      responsePayload: result.responsePayload,
      responseHash: result.responseHash,
      rejectionReason: result.rejectionReason ?? null,
      updateDocumentStatus:
        result.status === "TERMINAL_REJECTION"
          ? FiscalDocumentStatus.REJECTED
          : undefined,
    })
  }

  return client.$transaction(async (tx) => {
    const ownedSubmission = await tx.complianceSubmission.findFirst({
      where: {
        id: submission.id,
        organizationId: submission.organizationId,
        status: ComplianceSubmissionStatus.SUBMITTED,
        leasedBy: workerId,
        requestHash: authorityPayload.payloadHash,
      },
    })

    if (!ownedSubmission) {
      throw new ConflictError(
        "Compliance submission lease ownership was lost before authority evidence could be finalized.",
      )
    }

    const responseHash =
      result.responseHash ??
      (result.responsePayload
        ? undefined
        : `sha256:${authorityPayload.payloadHash.slice("sha256:".length)}`)

    await recordComplianceEvidenceOnce(
      {
        organizationId: submission.organizationId,
        fiscalDocumentId: fiscalDocument.id,
        submissionId: submission.id,
        evidenceType: ComplianceEvidenceType.AUTHORITY_RESPONSE,
        source: ComplianceEvidenceSource.AUTHORITY,
        artifactHash: responseHash ?? null,
        payload: result.responsePayload as Prisma.InputJsonValue,
        authorityReference: result.authorityReference ?? null,
        metadata: {
          adapterCode: adapter.code,
          sandboxGrade: true,
          productionCertification: false,
        },
      },
      tx,
    )

    for (const artifact of result.artifacts ?? []) {
      await recordComplianceEvidenceOnce(
        {
          organizationId: submission.organizationId,
          fiscalDocumentId: fiscalDocument.id,
          submissionId: submission.id,
          evidenceType: evidenceTypeForArtifact(artifact.type),
          source: evidenceSourceForArtifact(artifact.source),
          artifactHash: artifact.artifactHash,
          payload: artifact.payload as Prisma.InputJsonValue,
          authorityReference: result.authorityReference ?? null,
          metadata: {
            adapterCode: adapter.code,
            artifactType: artifact.type,
            sandboxGrade: true,
          },
        },
        tx,
      )
    }

    const finalSubmissionStatus =
      result.status === "CERTIFIED"
        ? ComplianceSubmissionStatus.CERTIFIED
        : ComplianceSubmissionStatus.SUBMITTED
    const finalDocumentStatus =
      result.status === "CERTIFIED"
        ? FiscalDocumentStatus.CERTIFIED
        : FiscalDocumentStatus.SUBMITTED

    const updatedSubmission = await tx.complianceSubmission.update({
      where: { id: submission.id },
      data: {
        status: finalSubmissionStatus,
        responseHash: result.responseHash ?? null,
        responseSummary: result.responsePayload as Prisma.InputJsonValue,
        authorityReference: result.authorityReference ?? null,
        completedAt:
          finalSubmissionStatus === ComplianceSubmissionStatus.CERTIFIED
            ? now
            : null,
        leasedAt: null,
        leasedUntil: null,
        leasedBy: null,
      },
    })

    await tx.fiscalDocument.update({
      where: { id: fiscalDocument.id },
      data: {
        status: finalDocumentStatus,
        authorityChannel: submission.authorityChannel,
        authorityReference: result.authorityReference ?? null,
        certificationArtifactHash:
          finalDocumentStatus === FiscalDocumentStatus.CERTIFIED
            ? result.responseHash ?? null
            : null,
        certifiedAt:
          finalDocumentStatus === FiscalDocumentStatus.CERTIFIED ? now : null,
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: submission.organizationId,
      eventType: "AUTHORITY_SUBMISSION_ACCEPTED",
      eventSource: "INTERNAL",
      idempotencyKey: `compliance-submission:${submission.id}:accepted:${result.responseHash ?? authorityPayload.payloadHash}`,
      actorId: workerId,
      sourceType: fiscalDocument.sourceType,
      sourceId: fiscalDocument.sourceId,
      postingBatchId: fiscalDocument.postingBatchId,
      documentHash: authorityPayload.payloadHash,
      payload: {
        submissionId: submission.id,
        fiscalDocumentId: fiscalDocument.id,
        status: finalSubmissionStatus,
        fiscalDocumentStatus: finalDocumentStatus,
        authorityChannel: submission.authorityChannel,
        adapterKey: adapter.code,
        authorityReference: result.authorityReference ?? null,
        responseHash: result.responseHash ?? null,
        sandboxGrade: true,
        productionCertification: false,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "compliance.submission.accepted",
          payload: {
            submissionId: submission.id,
            fiscalDocumentId: fiscalDocument.id,
            status: finalSubmissionStatus,
            authorityReference: result.authorityReference ?? null,
          },
        },
      ],
    })

    return updatedSubmission
  })
}
