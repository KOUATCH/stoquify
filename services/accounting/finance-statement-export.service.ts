import "server-only"

import { z } from "zod"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  evaluateAndAuditSensitiveAction,
} from "@/services/controls/sensitive-action.service"
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  runBusinessEventOutboxWorker,
  type BusinessEventOutboxClient,
} from "@/services/events/business-event-outbox.service"
import {
  financeStatementExportJobReceiptSchema,
  financeStatementExportManifestSchema,
  financeStatementExportArtifactReferenceSchema,
  financePaymentsLedgerTableContract,
  financeStatementTableContracts,
  FINANCE_ASYNC_EXPORT_THRESHOLD,
  type FinanceStatementExportArtifactReference,
  type FinanceStatementExportJobReceipt,
  type FinanceStatementExportManifest,
} from "@/components/DataTableComponents/finance-accounting-contracts"

export const FINANCE_STATEMENT_EXPORT_JOB_EVENT = "finance.statement.export.requested"
const FINANCE_STATEMENT_EXPORT_REQUEST_EVENT = "FINANCE_STATEMENT_EXPORT_REQUESTED"
const financeExportContractRegistry = [financePaymentsLedgerTableContract, ...financeStatementTableContracts]

const enqueueFinanceStatementExportSchema = z.object({
  organizationId: z.string().min(1),
  actorId: z.string().min(1),
  actorPermissions: z.array(z.string()),
  lastAuthAt: z.union([z.date(), z.string(), z.number()]).nullable().optional(),
  manifest: financeStatementExportManifestSchema,
  now: z.union([z.date(), z.string(), z.number()]).optional(),
}).strict()

const jobMetadataSchema = z.object({
  schemaVersion: z.literal(1),
  state: z.enum(["accepted", "running", "completed", "failed"]),
  acceptedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  failureCode: z.string().optional(),
  artifact: financeStatementExportArtifactReferenceSchema.optional(),
}).passthrough()

const completeFinanceStatementExportJobSchema = z.object({
  organizationId: z.string().min(1),
  jobId: z.string().min(1),
  workerId: z.string().min(1),
  artifact: financeStatementExportArtifactReferenceSchema,
  completedAt: z.union([z.date(), z.string(), z.number()]).optional(),
}).strict()

type EnqueueFinanceStatementExportInput = z.input<typeof enqueueFinanceStatementExportSchema>

type JobRecord = {
  id: string
  organizationId: string
  channel: string
  eventName: string
  idempotencyKey: string
  payloadHash: string
  payload: unknown
  metadata: unknown
  status: string
  attempts: number
  maxAttempts: number
  availableAt: Date
  lockedAt: Date | null
  lockedBy: string | null
  processedAt: Date | null
}

type ExistingRequest = {
  actorId: string | null
  outboxMessages: JobRecord[]
} | null

function asDate(value: Date | string | number | undefined, fallback: Date) {
  const date = value === undefined ? new Date(fallback) : value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new BusinessRuleError("Finance statement export time is invalid.")
  return date
}

function registeredContract(manifest: FinanceStatementExportManifest) {
  const contract = financeExportContractRegistry.find((candidate) => candidate.id === manifest.tableId)
  if (!contract || contract.version !== manifest.contractVersion) {
    throw new BusinessRuleError("Finance statement export contract is not current.")
  }
  if (!contract.export.enabled || !contract.export.formats.includes(manifest.format)) {
    throw new BusinessRuleError("Requested finance statement export format is not enabled.")
  }
  if (
    contract.export.requiredPermission !== manifest.requiredPermission ||
    contract.export.requiredModule !== manifest.requiredModule ||
    contract.export.sourceReadModel !== manifest.sourceReadModel ||
    contract.access.redactionPolicy !== manifest.redactionPolicy
  ) {
    throw new BusinessRuleError("Finance statement export authorization context is invalid.")
  }
  return contract
}

function validateAsyncManifest(input: EnqueueFinanceStatementExportInput) {
  const manifest = financeStatementExportManifestSchema.parse(input.manifest)
  registeredContract(manifest)
  if (manifest.organizationId !== input.organizationId || manifest.financeContext.entityId !== input.organizationId) {
    throw new ConflictError("Finance statement export does not match the active organization.")
  }
  if (manifest.matchingRows < FINANCE_ASYNC_EXPORT_THRESHOLD || manifest.exportMode !== "async-job") {
    throw new BusinessRuleError("Only large finance statement exports may be queued asynchronously.")
  }
  return manifest
}

function eventOutbox(result: Awaited<ReturnType<typeof recordBusinessEventInTx>>) {
  return (result.event.outboxMessages as JobRecord[] | undefined)?.find(
    (message) => message.channel === "REPORT_EXPORT" && message.eventName === FINANCE_STATEMENT_EXPORT_JOB_EVENT,
  )
}

function existingRequest(value: unknown) {
  return value as ExistingRequest
}

function receiptFromJob(job: JobRecord, fallbackClientRequestId?: string): FinanceStatementExportJobReceipt {
  const metadata = jobMetadataSchema.safeParse(job.metadata)
  const acceptedAt = metadata.success ? metadata.data.acceptedAt : new Date(job.availableAt).toISOString()
  const status = metadata.success && metadata.data.state === "completed"
    ? "completed"
    : ["FAILED", "DEAD_LETTER", "CANCELLED"].includes(job.status)
      ? "failed"
      : ["LOCKED", "SENT"].includes(job.status) || (metadata.success && metadata.data.state === "running")
        ? "running"
        : "accepted"
  const payload = financeStatementExportManifestSchema.parse(job.payload)
  const receipt: Record<string, unknown> = {
    schemaVersion: 1,
    clientRequestId: fallbackClientRequestId ?? payload.clientRequestId,
    jobId: job.id,
    status,
    acceptedAt,
  }
  if (metadata.success && metadata.data.completedAt) receipt.completedAt = metadata.data.completedAt
  if (metadata.success && metadata.data.artifact) receipt.artifact = metadata.data.artifact

  return financeStatementExportJobReceiptSchema.parse(receipt)
}

const expectedContentTypeByFormat = {
  json: "application/json",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const

export async function enqueueFinanceStatementExport(
  rawInput: EnqueueFinanceStatementExportInput,
  options: { client?: typeof db } = {},
): Promise<FinanceStatementExportJobReceipt> {
  const input = enqueueFinanceStatementExportSchema.parse(rawInput)
  const manifest = validateAsyncManifest(input)
  const now = asDate(input.now, new Date())
  const client = options.client ?? db
  const requestKey = `finance-statement-export:${manifest.clientRequestId}`
  const watermarkId = `stoquify:${input.organizationId}:${requestKey}`

  return client.$transaction(async (tx) => {
    const decision = await evaluateAndAuditSensitiveAction(tx, {
      action: "accounting.export",
      actorId: input.actorId,
      organizationId: input.organizationId,
      actorPermissions: input.actorPermissions,
      lastAuthAt: input.lastAuthAt ?? null,
      now,
      resourceType: "FinanceStatementExportJob",
      resourceId: manifest.clientRequestId,
      currency: manifest.financeContext.currency,
      exportContext: {
        scope: manifest.tableId,
        filtersHash: manifest.queryFingerprint,
        rowCount: manifest.matchingRows,
        fileType: manifest.format,
        sensitivity: "statutory",
        watermarkId,
      },
      metadata: {
        contractVersion: manifest.contractVersion,
        redactionPolicy: manifest.redactionPolicy,
        selectionScope: manifest.selection.kind,
      },
    })
    assertSensitiveActionAllowed(decision)

    const existing = existingRequest(await tx.businessEvent.findUnique({
      where: {
        organizationId_eventSource_idempotencyKey: {
          organizationId: input.organizationId,
          eventSource: "SYSTEM",
          idempotencyKey: requestKey,
        },
      },
      include: { outboxMessages: true },
    }))
    if (existing) {
      if (existing.actorId !== input.actorId) throw new ConflictError("Finance statement export idempotency key belongs to another actor.")
      const job = existing.outboxMessages.find(
        (message) => message.channel === "REPORT_EXPORT" && message.eventName === FINANCE_STATEMENT_EXPORT_JOB_EVENT,
      )
      if (!job) throw new BusinessRuleError("Existing finance statement export job is incomplete.")
      if (job.payloadHash !== hashBusinessPayload(manifest)) {
        throw new ConflictError("Finance statement export idempotency key was reused with a different request.")
      }
      return receiptFromJob(job, manifest.clientRequestId)
    }

    const acceptedAt = now.toISOString()
    const metadata = {
      schemaVersion: 1 as const,
      state: "accepted" as const,
      acceptedAt,
      tableId: manifest.tableId,
      matchingRows: manifest.matchingRows,
      watermarkId,
    }
    const requestEvent = await recordBusinessEventInTx(
      tx as Parameters<typeof recordBusinessEventInTx>[0],
      {
        organizationId: input.organizationId,
        eventType: FINANCE_STATEMENT_EXPORT_REQUEST_EVENT,
        eventSource: "SYSTEM",
        idempotencyKey: requestKey,
        actorId: input.actorId,
        sourceEntityType: "FinanceStatementExport",
        sourceId: manifest.clientRequestId,
        documentHash: manifest.queryFingerprint,
        payload: manifest,
        metadata,
        outboxMessages: [{
          channel: "REPORT_EXPORT",
          eventName: FINANCE_STATEMENT_EXPORT_JOB_EVENT,
          idempotencyKey: requestKey + ":job",
          payload: manifest,
          metadata,
        }],
      },
    )
    const job = eventOutbox(requestEvent)
    if (!job) throw new BusinessRuleError("Finance statement export job was not created.")

    await tx.auditLog.create({
      data: {
        entityType: "FinanceStatementExportJob",
        entityId: job.id,
        action: "FINANCE_STATEMENT_EXPORT_QUEUED",
        organizationId: input.organizationId,
        userId: input.actorId,
        changes: {
          tableId: manifest.tableId,
          contractVersion: manifest.contractVersion,
          clientRequestId: manifest.clientRequestId,
          matchingRows: manifest.matchingRows,
          exportMode: manifest.exportMode,
          queryFingerprint: manifest.queryFingerprint,
          redactionPolicy: manifest.redactionPolicy,
          watermarkId,
          acceptedAt,
        },
      },
    })

    return receiptFromJob(job, manifest.clientRequestId)
  })
}

export async function getFinanceStatementExportJobStatus(input: {
  organizationId: string
  jobId: string
}, options: { client?: typeof db } = {}) {
  const client = options.client ?? db
  const job = await client.businessEventOutbox.findFirst({
    where: {
      id: input.jobId,
      organizationId: input.organizationId,
      channel: "REPORT_EXPORT",
      eventName: FINANCE_STATEMENT_EXPORT_JOB_EVENT,
    },
  })
  if (!job) throw new NotFoundError("Finance statement export job was not found.")
  return receiptFromJob(job as unknown as JobRecord)
}

export async function completeFinanceStatementExportJob(
  rawInput: z.input<typeof completeFinanceStatementExportJobSchema>,
  options: { client?: typeof db } = {},
): Promise<FinanceStatementExportJobReceipt> {
  const input = completeFinanceStatementExportJobSchema.parse(rawInput)
  const completedAt = asDate(input.completedAt, new Date())
  const client = options.client ?? db

  return client.$transaction(async (tx) => {
    const job = await tx.businessEventOutbox.findFirst({
      where: {
        id: input.jobId,
        organizationId: input.organizationId,
        channel: "REPORT_EXPORT",
        eventName: FINANCE_STATEMENT_EXPORT_JOB_EVENT,
      },
    }) as unknown as JobRecord | null
    if (!job) throw new NotFoundError("Finance statement export job was not found.")

    const manifest = financeStatementExportManifestSchema.parse(job.payload)
    if (manifest.organizationId !== input.organizationId || manifest.financeContext.entityId !== input.organizationId) {
      throw new ConflictError("Finance statement export does not match the active organization.")
    }
    if (input.artifact.contentType !== expectedContentTypeByFormat[manifest.format]) {
      throw new BusinessRuleError("Finance statement export artifact content type does not match the requested format.")
    }

    const metadata = jobMetadataSchema.parse(job.metadata)
    if (metadata.state === "completed") {
      if (
        !metadata.artifact ||
        JSON.stringify(metadata.artifact) !== JSON.stringify(input.artifact)
      ) {
        throw new ConflictError("Finance statement export job was already completed with another artifact.")
      }
      return receiptFromJob(job)
    }
    if (job.status !== "LOCKED" || job.lockedBy !== input.workerId) {
      throw new ConflictError("Finance statement export job is not owned by this worker lease.")
    }
    if (completedAt.getTime() < new Date(metadata.acceptedAt).getTime()) {
      throw new BusinessRuleError("Finance statement export completion cannot precede acceptance.")
    }

    const completedMetadata = {
      ...metadata,
      state: "completed" as const,
      completedAt: completedAt.toISOString(),
      artifact: input.artifact,
    }
    const updated = await tx.businessEventOutbox.updateMany({
      where: {
        id: input.jobId,
        organizationId: input.organizationId,
        channel: "REPORT_EXPORT",
        eventName: FINANCE_STATEMENT_EXPORT_JOB_EVENT,
        status: "LOCKED",
        lockedBy: input.workerId,
      },
      data: { metadata: completedMetadata },
    })
    if (updated.count !== 1) {
      throw new ConflictError("Finance statement export worker lease was lost before completion.")
    }

    await tx.auditLog.create({
      data: {
        entityType: "FinanceStatementExportJob",
        entityId: input.jobId,
        action: "FINANCE_STATEMENT_EXPORT_COMPLETED",
        organizationId: input.organizationId,
        userId: null,
        changes: {
          tableId: manifest.tableId,
          contractVersion: manifest.contractVersion,
          clientRequestId: manifest.clientRequestId,
          matchingRows: manifest.matchingRows,
          exportMode: manifest.exportMode,
          artifactProvider: input.artifact.provider,
          artifactKey: input.artifact.key,
          artifactByteLength: input.artifact.byteLength,
          artifactContentHash: input.artifact.contentHash,
          completedAt: completedAt.toISOString(),
        },
      },
    })

    return receiptFromJob({ ...job, metadata: completedMetadata })
  })
}

export type FinanceStatementExportArtifactBuilder = (input: {
  organizationId: string
  jobId: string
  manifest: FinanceStatementExportManifest
}) => Promise<FinanceStatementExportArtifactReference>

export async function runFinanceStatementExportWorker(
  input: {
    organizationId: string
    workerId: string
    limit?: number
    now?: Date
    buildArtifact: FinanceStatementExportArtifactBuilder
  },
  options: { client?: typeof db } = {},
) {
  const client = options.client ?? db

  return runBusinessEventOutboxWorker(
    {
      organizationId: input.organizationId,
      workerId: input.workerId,
      channels: ["REPORT_EXPORT"],
      eventNames: [FINANCE_STATEMENT_EXPORT_JOB_EVENT],
      limit: input.limit,
      now: input.now,
    },
    async (message) => {
      const manifest = financeStatementExportManifestSchema.parse(message.payload)
      if (message.organizationId !== input.organizationId || manifest.organizationId !== input.organizationId) {
        throw new ConflictError("Finance statement export worker received a cross-tenant message.")
      }
      const artifact = await input.buildArtifact({
        organizationId: message.organizationId,
        jobId: message.id,
        manifest,
      })
      await completeFinanceStatementExportJob(
        {
          organizationId: message.organizationId,
          jobId: message.id,
          workerId: input.workerId,
          artifact,
          completedAt: input.now,
        },
        { client },
      )
    },
    client as unknown as BusinessEventOutboxClient,
  )
}
