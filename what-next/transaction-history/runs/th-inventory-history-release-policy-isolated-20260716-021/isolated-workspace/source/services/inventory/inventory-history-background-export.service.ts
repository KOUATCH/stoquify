import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto"

import { Prisma, TransactionType } from "@prisma/client"
import { z } from "zod"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  evaluateAndAuditSensitiveAction,
  type SensitiveActionAuditClient,
} from "@/services/controls/sensitive-action.service"
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { hashNormalizedHistoryFilters } from "@/services/history/transaction-history-cursor"
import {
  createUploadThingInventoryHistoryExportArtifactStore,
  type InventoryHistoryExportArtifactReference,
  type InventoryHistoryExportArtifactStore,
} from "@/services/inventory/inventory-history-export-artifact-store"
import {
  readInventoryMovementHistory,
  type InventoryMovementHistoryAppliedFilters,
  type InventoryMovementHistoryResult,
  type InventoryMovementHistoryRow,
} from "@/services/inventory/inventory-read.service"

const JOB_EVENT_NAME = "inventory.history.background-export"
const REQUEST_EVENT_TYPE = "inventory.history.export.requested"
const CHUNK_EVENT_TYPE = "inventory.history.export.chunk.persisted"
const COMPLETED_EVENT_TYPE = "inventory.history.export.completed"
const EXPORT_SCOPE = "inventory-movement-v1"
const DOWNLOAD_SCOPE = "inventory-history-export-download-v1"
const WRAP_SCOPE = "inventory-history-export-key-wrap-v1"
const CHUNK_SCOPE = "inventory-history-export-chunk-v1"
const FILE_TYPE = "application/x-ndjson"
const MINIMUM_SECRET_LENGTH = 32
const DEFAULT_RETENTION_SECONDS = 24 * 60 * 60
const MAX_RETENTION_SECONDS = 7 * 24 * 60 * 60
export const INVENTORY_HISTORY_BACKGROUND_EXPORT_MAX_ROWS = 250_000
const DEFAULT_MAXIMUM_ROWS = INVENTORY_HISTORY_BACKGROUND_EXPORT_MAX_ROWS
const DEFAULT_LEASE_SECONDS = 5 * 60
const DEFAULT_DOWNLOAD_GRANT_SECONDS = 10 * 60
const CHUNK_MANIFEST_PAGE_SIZE = 25
const EMPTY_CHUNK_EVIDENCE_HASH = `sha256:${createHash("sha256").update("").digest("hex")}`

const dateLikeSchema = z.union([z.date(), z.string(), z.number()])
const queryFiltersSchema = z
  .object({
    itemId: z.string().min(1).optional(),
    locationId: z.string().min(1).optional(),
    type: z.nativeEnum(TransactionType).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    effectiveAsOf: z.string().datetime({ offset: true }).optional(),
  })
  .strict()

export const enqueueInventoryHistoryBackgroundExportSchema = z
  .object({
    organizationId: z.string().min(1),
    actorId: z.string().min(1),
    actorPermissions: z.array(z.string()),
    idempotencyKey: z.string().trim().min(8).max(128),
    filters: queryFiltersSchema.default({}),
    maximumRows: z.number().int().min(10_001).max(INVENTORY_HISTORY_BACKGROUND_EXPORT_MAX_ROWS).default(DEFAULT_MAXIMUM_ROWS),
    retentionSeconds: z.number().int().min(300).max(MAX_RETENTION_SECONDS).default(DEFAULT_RETENTION_SECONDS),
    maxAttempts: z.number().int().min(1).max(10).default(5),
    lastAuthAt: dateLikeSchema.nullable().optional(),
    now: dateLikeSchema.optional(),
  })
  .strict()

const snapshotSchema = z.object({
  effectiveAsOf: z.string().optional(),
  recordedThrough: z.string().datetime({ offset: true }),
  generatedAt: z.string().datetime({ offset: true }),
  timezone: z.string().min(1),
})

const completenessSchema = z.object({
  state: z.enum(["complete", "partial"]),
  sources: z.array(z.object({
    source: z.string(),
    state: z.enum(["complete", "partial"]),
    reason: z.string().optional(),
    lagSeconds: z.number().optional(),
  })),
})

const appliedFiltersSchema = z.object({
  itemId: z.string().nullable(),
  locationId: z.string().nullable(),
  type: z.nativeEnum(TransactionType).nullable(),
  dateFrom: z.string().nullable(),
  dateTo: z.string().nullable(),
  effectiveAsOf: z.string().nullable(),
  timezone: z.string(),
  pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]),
})

const encryptedValueSchema = z.object({
  algorithm: z.literal("A256GCM"),
  iv: z.string().min(1),
  tag: z.string().min(1),
  ciphertext: z.string(),
})

const jobPayloadSchema = z.object({
  version: z.literal(1),
  kind: z.literal(JOB_EVENT_NAME),
  exportId: z.string().min(1),
  organizationId: z.string().min(1),
  actorId: z.string().min(1),
  permissionScope: z.array(z.string()),
  contractVersion: z.literal(EXPORT_SCOPE),
  queryFilters: queryFiltersSchema,
  requestFiltersHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  appliedFiltersHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  snapshot: snapshotSchema,
  appliedFilters: appliedFiltersSchema,
  completeness: completenessSchema,
  maximumRows: z.number().int().positive(),
  requestedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  watermarkId: z.string().min(1),
  redactionScope: z.array(z.string()),
  encryption: z.object({
    chunkAlgorithm: z.literal("A256GCM"),
    keyWrap: z.literal("A256GCM-HKDF-SHA256"),
    keyVersion: z.literal(1),
  }),
})

const artifactReferenceSchema = z.object({
  provider: z.literal("uploadthing"),
  key: z.string().min(1),
  customId: z.string().min(1),
  byteLength: z.number().int().positive(),
  ciphertextHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  storageAcl: z.enum(["private", "public-pilot"]).optional(),
  publicReadUrl: z.string().url().optional(),
})

const encryptedChunkEnvelopeSchema = encryptedValueSchema.omit({ ciphertext: true })

const exportManifestSchema = z.object({
  schemaVersion: z.literal(2),
  exportId: z.string(),
  organizationId: z.string(),
  actorId: z.string(),
  generatedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  fileName: z.string(),
  fileType: z.literal(FILE_TYPE),
  headerLine: z.string(),
  headerHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  byteLength: z.number().int().nonnegative(),
  rowCount: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
  chunkEvidenceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  requestFiltersHash: z.string(),
  appliedFiltersHash: z.string(),
  snapshot: snapshotSchema,
  appliedFilters: appliedFiltersSchema,
  completeness: completenessSchema,
  watermarkId: z.string(),
  redactionScope: z.array(z.string()),
})

const jobMetadataSchema = z.object({
  schemaVersion: z.literal(2),
  stateVersion: z.number().int().nonnegative(),
  state: z.enum(["PENDING", "RUNNING", "COMPLETE", "FAILED", "DEAD_LETTER", "EXPIRED"]),
  pageState: z.enum(["NOT_STARTED", "STARTED", "EXHAUSTED"]),
  nextCursor: z.string().nullable(),
  rowCount: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
  lastChunkSequence: z.number().int().nonnegative().nullable(),
  chunkEvidenceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  wrappedDataKey: encryptedValueSchema.nullable(),
  manifest: exportManifestSchema.nullable(),
  lastErrorCode: z.string().nullable(),
  lastCheckpointAt: z.string().datetime({ offset: true }),
  cryptoShreddedAt: z.string().datetime({ offset: true }).nullable(),
  artifactDeletionState: z.enum(["NOT_REQUIRED", "PENDING", "COMPLETE"]),
  artifactDeletedAt: z.string().datetime({ offset: true }).nullable(),
})

const chunkPayloadSchema = z.object({
  version: z.literal(2),
  kind: z.literal(CHUNK_EVENT_TYPE),
  exportId: z.string(),
  jobId: z.string(),
  sequence: z.number().int().nonnegative(),
  rowCount: z.number().int().nonnegative(),
  byteLength: z.number().int().nonnegative(),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  encrypted: encryptedChunkEnvelopeSchema,
  artifact: artifactReferenceSchema,
})

const downloadTokenSchema = z.object({
  v: z.literal(1),
  scope: z.literal(DOWNLOAD_SCOPE),
  tenantId: z.string(),
  actorId: z.string(),
  jobId: z.string(),
  contentHash: z.string(),
  exp: z.number().int().positive(),
  jti: z.string(),
})

export type EnqueueInventoryHistoryBackgroundExportInput = z.input<
  typeof enqueueInventoryHistoryBackgroundExportSchema
>
export type InventoryHistoryBackgroundExportManifest = z.infer<typeof exportManifestSchema>

type JobPayload = z.infer<typeof jobPayloadSchema>
type JobMetadata = z.infer<typeof jobMetadataSchema>
type ChunkPayload = z.infer<typeof chunkPayloadSchema>

type JobRecord = {
  id: string
  organizationId: string
  businessEventId: string
  channel: string
  eventName: string
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

type ChunkEventRecord = {
  id: string
  organizationId: string
  idempotencyKey: string
  payloadHash: string
  payload: unknown
}

type ExistingRequestEvent = {
  id: string
  actorId: string | null
  outboxMessages: JobRecord[]
}

export type InventoryHistoryBackgroundExportStatus = {
  jobId: string
  exportId: string
  status: string
  rowCount: number
  chunkCount: number
  attempts: number
  maximumRows: number
  recordedThrough: string
  expiresAt: string
  contentHash: string | null
  ready: boolean
  retryable: boolean
  expired: boolean
  artifactDeletionState: JobMetadata["artifactDeletionState"]
}

export type InventoryHistoryBackgroundExportOptions = {
  client?: typeof db
  auditClient?: SensitiveActionAuditClient
  secret?: string
  exportIdFactory?: () => string
  dataKeyFactory?: () => Buffer
  artifactStore?: InventoryHistoryExportArtifactStore
  now?: () => Date
}

export class InventoryHistoryBackgroundExportLimitError extends Error {
  constructor(readonly maximumRows: number) {
    super(`Inventory history background export exceeds its ${maximumRows}-row limit.`)
    this.name = "InventoryHistoryBackgroundExportLimitError"
  }
}

function asDate(value: Date | string | number | undefined, fallback: Date): Date {
  const date = value === undefined ? new Date(fallback) : value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new BusinessRuleError("Inventory history export time is invalid.")
  return date
}

function sha256(value: string | Buffer) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`
}

function configuredSecret(explicit?: string) {
  const secret = explicit || process.env.AQSTOQFLOW_HISTORY_CURSOR_SECRET || process.env.HISTORY_CURSOR_SECRET
  if (!secret || secret.length < MINIMUM_SECRET_LENGTH) {
    throw new BusinessRuleError("Inventory history export encryption is not configured.")
  }
  return secret
}

function jsonValue(value: unknown) {
  return value as Prisma.InputJsonValue
}

function appliedFilterScope(filters: InventoryMovementHistoryAppliedFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([key]) => key !== "pageSize"))
}

function normalizeQueryFilters(filters: z.infer<typeof queryFiltersSchema>) {
  return { ...filters }
}

function requestFiltersDigest(
  organizationId: string,
  filters: z.infer<typeof queryFiltersSchema>,
) {
  return `sha256:${hashNormalizedHistoryFilters({ organizationId, filters })}`
}

function derivedKey(secret: string, payload: JobPayload) {
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      Buffer.from(payload.organizationId, "utf8"),
      Buffer.from(`${WRAP_SCOPE}:${payload.exportId}`, "utf8"),
      32,
    ),
  )
}

function encryptValue(value: Buffer, key: Buffer, aad: string, iv = randomBytes(12)) {
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  cipher.setAAD(Buffer.from(aad, "utf8"))
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final()])
  return {
    algorithm: "A256GCM" as const,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  }
}

function decryptValue(value: z.infer<typeof encryptedValueSchema>, key: Buffer, aad: string) {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64url"))
    decipher.setAAD(Buffer.from(aad, "utf8"))
    decipher.setAuthTag(Buffer.from(value.tag, "base64url"))
    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64url")),
      decipher.final(),
    ])
  } catch {
    throw new BusinessRuleError("Inventory history export encryption evidence is invalid.")
  }
}

function wrapDataKey(dataKey: Buffer, secret: string, payload: JobPayload) {
  return encryptValue(dataKey, derivedKey(secret, payload), `${WRAP_SCOPE}:${payload.organizationId}:${payload.exportId}`)
}

function unwrapDataKey(metadata: JobMetadata, secret: string, payload: JobPayload) {
  if (!metadata.wrappedDataKey) throw new BusinessRuleError("Inventory history export content has expired.")
  return decryptValue(
    metadata.wrappedDataKey,
    derivedKey(secret, payload),
    `${WRAP_SCOPE}:${payload.organizationId}:${payload.exportId}`,
  )
}

function chunkPlaintext(rows: InventoryMovementHistoryRow[]) {
  return rows.length ? `${rows.map((row) => JSON.stringify(row)).join("\n")}\n` : ""
}

type PreparedChunk = {
  chunk: Omit<ChunkPayload, "artifact">
  ciphertext: Buffer
}

function chunkIv(dataKey: Buffer, payload: JobPayload, sequence: number) {
  return createHmac("sha256", dataKey)
    .update([CHUNK_SCOPE, payload.organizationId, payload.exportId, sequence, "iv"].join(":"))
    .digest()
    .subarray(0, 12)
}

function prepareChunk(
  rows: InventoryMovementHistoryRow[],
  dataKey: Buffer,
  payload: JobPayload,
  jobId: string,
  sequence: number,
): PreparedChunk {
  const plaintext = chunkPlaintext(rows)
  const aad = [CHUNK_SCOPE, payload.organizationId, payload.exportId, sequence].join(":")
  const encrypted = encryptValue(
    Buffer.from(plaintext, "utf8"),
    dataKey,
    aad,
    chunkIv(dataKey, payload, sequence),
  )
  return {
    chunk: {
      version: 2,
      kind: CHUNK_EVENT_TYPE,
      exportId: payload.exportId,
      jobId,
      sequence,
      rowCount: rows.length,
      byteLength: Buffer.byteLength(plaintext, "utf8"),
      contentHash: sha256(plaintext),
      encrypted: {
        algorithm: encrypted.algorithm,
        iv: encrypted.iv,
        tag: encrypted.tag,
      },
    },
    ciphertext: Buffer.from(encrypted.ciphertext, "base64url"),
  }
}

async function decryptChunk(
  chunk: ChunkPayload,
  dataKey: Buffer,
  payload: JobPayload,
  artifactStore: InventoryHistoryExportArtifactStore,
) {
  const ciphertext = await artifactStore.readEncryptedChunk(
    chunk.artifact as InventoryHistoryExportArtifactReference,
  )
  const plaintext = decryptValue(
    { ...chunk.encrypted, ciphertext: ciphertext.toString("base64url") },
    dataKey,
    [CHUNK_SCOPE, payload.organizationId, payload.exportId, chunk.sequence].join(":"),
  ).toString("utf8")
  if (sha256(plaintext) !== chunk.contentHash || Buffer.byteLength(plaintext, "utf8") !== chunk.byteLength) {
    throw new BusinessRuleError("Inventory history export chunk evidence is invalid.")
  }
  return plaintext
}

function nextChunkEvidenceHash(currentHash: string, chunk: ChunkPayload) {
  return sha256(JSON.stringify({
    previous: currentHash,
    sequence: chunk.sequence,
    rowCount: chunk.rowCount,
    byteLength: chunk.byteLength,
    contentHash: chunk.contentHash,
    artifactHash: chunk.artifact.ciphertextHash,
  }))
}

function parseJob(record: JobRecord) {
  const payload = jobPayloadSchema.parse(record.payload)
  const metadata = jobMetadataSchema.parse(record.metadata)
  if (record.payloadHash !== hashBusinessPayload(record.payload)) {
    throw new BusinessRuleError("Inventory history export job payload integrity check failed.")
  }
  if (
    record.channel !== "REPORT_EXPORT" ||
    record.eventName !== JOB_EVENT_NAME ||
    record.organizationId !== payload.organizationId
  ) {
    throw new BusinessRuleError("Inventory history export job type or tenant is invalid.")
  }
  return { payload, metadata }
}

function parseChunk(record: ChunkEventRecord) {
  const chunk = chunkPayloadSchema.parse(record.payload)
  if (record.payloadHash !== hashBusinessPayload(record.payload)) {
    throw new BusinessRuleError("Inventory history export chunk payload integrity check failed.")
  }
  return chunk
}

function statusFromRecord(record: JobRecord, now = new Date()): InventoryHistoryBackgroundExportStatus {
  const { payload, metadata } = parseJob(record)
  const expired = new Date(payload.expiresAt).getTime() <= now.getTime() || metadata.state === "EXPIRED"
  return {
    jobId: record.id,
    exportId: payload.exportId,
    status: expired ? "EXPIRED" : record.status,
    rowCount: metadata.rowCount,
    chunkCount: metadata.chunkCount,
    attempts: record.attempts,
    maximumRows: payload.maximumRows,
    recordedThrough: payload.snapshot.recordedThrough,
    expiresAt: payload.expiresAt,
    contentHash: metadata.manifest?.contentHash ?? null,
    ready: record.status === "SENT" && !expired && Boolean(metadata.wrappedDataKey),
    retryable: ["PENDING", "FAILED", "LOCKED"].includes(record.status) && record.attempts < record.maxAttempts,
    expired,
    artifactDeletionState: metadata.artifactDeletionState,
  }
}

async function auditInventoryReadDenial(
  auditClient: SensitiveActionAuditClient,
  organizationId: string,
  actorId: string,
  resourceId: string,
) {
  await auditClient.auditLog.create({
    data: {
      entityType: "InventoryTransactionHistoryExport",
      entityId: resourceId,
      action: "INVENTORY_HISTORY_EXPORT_CONTROL_DENIED",
      organizationId,
      userId: actorId,
      changes: jsonValue({
        action: "inventory.history.export",
        allowed: false,
        permission: "inventory.levels.read",
        reasonCode: "MISSING_INVENTORY_HISTORY_READ_PERMISSION",
      }),
    },
  })
}

async function assertExportAuthority(
  input: {
    organizationId: string
    actorId: string
    actorPermissions: readonly string[]
    lastAuthAt?: Date | number | string | null
    now: Date
  },
  resourceId: string,
  auditClient: SensitiveActionAuditClient,
) {
  const decision = await evaluateAndAuditSensitiveAction(auditClient, {
    action: "inventory.history.export",
    actorId: input.actorId,
    organizationId: input.organizationId,
    actorPermissions: input.actorPermissions,
    resourceType: "InventoryTransactionHistoryBackgroundExport",
    resourceId,
    lastAuthAt: input.lastAuthAt,
    now: input.now,
    metadata: { execution: "background" },
  })
  assertSensitiveActionAllowed(decision)

  if (!hasRbacPermission(input.actorPermissions, "inventory.levels.read")) {
    await auditInventoryReadDenial(auditClient, input.organizationId, input.actorId, resourceId)
    throw new ForbiddenError("You are not allowed to read inventory history.")
  }
}

function relevantPermissionScope(permissions: readonly string[]) {
  return ["reports.export", "inventory.levels.read"].filter((permission) =>
    hasRbacPermission(permissions, permission),
  )
}

function asJobRecord(value: unknown) {
  return value as JobRecord
}

function asExistingRequest(value: unknown) {
  return value as ExistingRequestEvent | null
}

function asChunkRecords(value: unknown) {
  return value as ChunkEventRecord[]
}

function eventOutbox(result: Awaited<ReturnType<typeof recordBusinessEventInTx>>) {
  return (result.event.outboxMessages as JobRecord[] | undefined)?.[0]
}

async function findJob(client: typeof db | Prisma.TransactionClient, jobId: string, organizationId?: string) {
  const record = await client.businessEventOutbox.findFirst({
    where: {
      id: jobId,
      ...(organizationId ? { organizationId } : {}),
      channel: "REPORT_EXPORT",
      eventName: JOB_EVENT_NAME,
    },
  })
  return record ? asJobRecord(record) : null
}

function chunkEventKey(exportId: string, sequence: number) {
  return exportId + ":chunk:" + String(sequence).padStart(12, "0")
}

async function persistChunkInTx(
  tx: Prisma.TransactionClient,
  payload: JobPayload,
  jobId: string,
  chunk: ChunkPayload,
) {
  const eventResult = await recordBusinessEventInTx(
    tx as Parameters<typeof recordBusinessEventInTx>[0],
    {
      organizationId: payload.organizationId,
      eventType: CHUNK_EVENT_TYPE,
      eventSource: "WORKER",
      idempotencyKey: chunkEventKey(payload.exportId, chunk.sequence),
      actorId: payload.actorId,
      sourceId: jobId,
      documentHash: chunk.contentHash,
      payload: chunk,
    },
  )
  return parseChunk(eventResult.event as unknown as ChunkEventRecord)
}

export async function enqueueInventoryHistoryBackgroundExport(
  input: EnqueueInventoryHistoryBackgroundExportInput,
  options: InventoryHistoryBackgroundExportOptions = {},
): Promise<InventoryHistoryBackgroundExportStatus> {
  const parsed = enqueueInventoryHistoryBackgroundExportSchema.parse(input)
  const client = options.client ?? db
  const auditClient = options.auditClient ?? client
  const now = asDate(parsed.now, options.now?.() ?? new Date())
  const secret = configuredSecret(options.secret)

  await assertExportAuthority(
    {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      lastAuthAt: parsed.lastAuthAt,
      now,
    },
    parsed.idempotencyKey,
    auditClient,
  )

  return client.$transaction(async (tx) => {
    const requestKey = "inventory-history-background:" + parsed.idempotencyKey
    const existing = asExistingRequest(await tx.businessEvent.findUnique({
      where: {
        organizationId_eventSource_idempotencyKey: {
          organizationId: parsed.organizationId,
          eventSource: "SYSTEM",
          idempotencyKey: requestKey,
        },
      },
      include: { outboxMessages: true },
    }))

    if (existing) {
      if (existing.actorId !== parsed.actorId) {
        throw new ConflictError("Inventory history export idempotency key belongs to another actor.")
      }
      const existingJob = existing.outboxMessages.find(
        (message) => message.channel === "REPORT_EXPORT" && message.eventName === JOB_EVENT_NAME,
      )
      if (!existingJob) throw new BusinessRuleError("Existing inventory history export job is incomplete.")
      const { payload: existingPayload } = parseJob(existingJob)
      const existingRetentionSeconds = Math.round(
        (new Date(existingPayload.expiresAt).getTime() -
          new Date(existingPayload.requestedAt).getTime()) /
          1000,
      )
      if (
        existingPayload.requestFiltersHash !==
          requestFiltersDigest(parsed.organizationId, parsed.filters) ||
        existingPayload.maximumRows !== parsed.maximumRows ||
        existingRetentionSeconds !== parsed.retentionSeconds ||
        existingJob.maxAttempts !== parsed.maxAttempts
      ) {
        throw new ConflictError(
          "Inventory history export idempotency key was reused with a different request.",
        )
      }
      return statusFromRecord(existingJob, now)
    }

    const firstPage = await readInventoryMovementHistory(
      {
        organizationId: parsed.organizationId,
        filters: { ...parsed.filters, pageSize: 100 },
      },
      { client: tx, now: () => now },
    )
    if (firstPage.rows.length > parsed.maximumRows) {
      throw new InventoryHistoryBackgroundExportLimitError(parsed.maximumRows)
    }

    const exportId = (options.exportIdFactory ?? randomUUID)()
    const expiresAt = new Date(now.getTime() + parsed.retentionSeconds * 1000)
    const payload: JobPayload = {
      version: 1,
      kind: JOB_EVENT_NAME,
      exportId,
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      permissionScope: relevantPermissionScope(parsed.actorPermissions),
      contractVersion: EXPORT_SCOPE,
      queryFilters: normalizeQueryFilters(parsed.filters),
      requestFiltersHash: requestFiltersDigest(parsed.organizationId, parsed.filters),
      appliedFiltersHash: "sha256:" + hashNormalizedHistoryFilters(appliedFilterScope(firstPage.appliedFilters)),
      snapshot: firstPage.snapshot,
      appliedFilters: firstPage.appliedFilters,
      completeness: firstPage.completeness,
      maximumRows: parsed.maximumRows,
      requestedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      watermarkId: ["stoquify", "inventory-history-background", parsed.organizationId, exportId].join(":"),
      redactionScope: [
        "No user contact or authentication fields",
        "No organization secrets or integration credentials",
        "Operational actor display names retained for audit traceability",
      ],
      encryption: {
        chunkAlgorithm: "A256GCM",
        keyWrap: "A256GCM-HKDF-SHA256",
        keyVersion: 1,
      },
    }
    const dataKey = (options.dataKeyFactory ?? (() => randomBytes(32)))()
    if (dataKey.length !== 32) throw new BusinessRuleError("Inventory history export data key is invalid.")
    const metadata: JobMetadata = {
      schemaVersion: 2,
      stateVersion: 0,
      state: "PENDING",
      pageState: "NOT_STARTED",
      nextCursor: null,
      rowCount: 0,
      chunkCount: 0,
      lastChunkSequence: null,
      chunkEvidenceHash: EMPTY_CHUNK_EVIDENCE_HASH,
      wrappedDataKey: wrapDataKey(dataKey, secret, payload),
      manifest: null,
      lastErrorCode: null,
      lastCheckpointAt: now.toISOString(),
      cryptoShreddedAt: null,
      artifactDeletionState: "NOT_REQUIRED",
      artifactDeletedAt: null,
    }

    const requestEvent = await recordBusinessEventInTx(
      tx as Parameters<typeof recordBusinessEventInTx>[0],
      {
        organizationId: parsed.organizationId,
        eventType: REQUEST_EVENT_TYPE,
        eventSource: "SYSTEM",
        idempotencyKey: requestKey,
        actorId: parsed.actorId,
        sourceId: exportId,
        payload,
        outboxMessages: [{
          channel: "REPORT_EXPORT",
          eventName: JOB_EVENT_NAME,
          idempotencyKey: requestKey + ":job",
          maxAttempts: parsed.maxAttempts,
          payload,
          metadata,
        }],
      },
    )
    const job = eventOutbox(requestEvent)
    if (!job) throw new BusinessRuleError("Inventory history export job was not created.")

    await tx.auditLog.create({
      data: {
        entityType: "InventoryTransactionHistoryBackgroundExport",
        entityId: job.id,
        action: "INVENTORY_HISTORY_BACKGROUND_EXPORT_QUEUED",
        organizationId: parsed.organizationId,
        userId: parsed.actorId,
        changes: jsonValue({
          exportId,
          requestFiltersHash: payload.requestFiltersHash,
          appliedFiltersHash: payload.appliedFiltersHash,
          recordedThrough: payload.snapshot.recordedThrough,
          rowCount: 0,
          chunkCount: 0,
          expiresAt: payload.expiresAt,
          artifactProvider: "uploadthing",
        }),
      },
    })
    return statusFromRecord(job, now)
  })
}

async function* iterateChunkEvents(
  client: Prisma.TransactionClient | typeof db,
  payload: JobPayload,
  jobId: string,
  expectedChunkCount: number,
) {
  const prefix = payload.exportId + ":chunk:"
  let afterKey: string | undefined
  let expectedSequence = 0

  while (expectedSequence < expectedChunkCount) {
    const remaining = expectedChunkCount - expectedSequence
    const rows = asChunkRecords(await client.businessEvent.findMany({
      where: {
        organizationId: payload.organizationId,
        eventType: CHUNK_EVENT_TYPE,
        eventSource: "WORKER",
        sourceId: jobId,
        idempotencyKey: {
          startsWith: prefix,
          ...(afterKey ? { gt: afterKey } : {}),
        },
      },
      orderBy: { idempotencyKey: "asc" },
      take: Math.min(CHUNK_MANIFEST_PAGE_SIZE, remaining) + 1,
      select: {
        id: true,
        organizationId: true,
        idempotencyKey: true,
        payloadHash: true,
        payload: true,
      },
    }))
    if (!rows.length || rows.length > remaining) {
      throw new BusinessRuleError("Inventory history export chunk manifest is incomplete or oversized.")
    }

    for (const row of rows) {
      const chunk = parseChunk(row)
      if (
        row.idempotencyKey !== chunkEventKey(payload.exportId, expectedSequence) ||
        chunk.exportId !== payload.exportId ||
        chunk.jobId !== jobId ||
        chunk.sequence !== expectedSequence
      ) {
        throw new BusinessRuleError("Inventory history export chunk sequence is invalid.")
      }
      yield chunk
      afterKey = row.idempotencyKey
      expectedSequence += 1
    }
  }
}

function buildHeader(payload: JobPayload, metadata: JobMetadata, completedAt: Date) {
  return `${JSON.stringify({
    type: "stoquify.inventory-history-export",
    schemaVersion: 1,
    exportId: payload.exportId,
    organizationId: payload.organizationId,
    generatedAt: completedAt.toISOString(),
    expiresAt: payload.expiresAt,
    watermarkId: payload.watermarkId,
    snapshot: payload.snapshot,
    appliedFilters: payload.appliedFilters,
    completeness: payload.completeness,
    rowCount: metadata.rowCount,
    redactionScope: payload.redactionScope,
  })}\n`
}

function assertCheckpointUnchanged(
  expected: JobMetadata,
  current: JobMetadata,
) {
  if (
    current.stateVersion !== expected.stateVersion ||
    current.pageState !== expected.pageState ||
    current.nextCursor !== expected.nextCursor ||
    current.chunkCount !== expected.chunkCount ||
    current.chunkEvidenceHash !== expected.chunkEvidenceHash
  ) {
    throw new ConflictError("Inventory history export checkpoint changed during processing.")
  }
}

async function buildCompletedManifest(
  client: typeof db,
  record: JobRecord,
  payload: JobPayload,
  metadata: JobMetadata,
  secret: string,
  completedAt: Date,
  artifactStore: InventoryHistoryExportArtifactStore,
) {
  if (metadata.pageState !== "EXHAUSTED") {
    throw new BusinessRuleError("Inventory history export cannot finalize before traversal is exhausted.")
  }
  const dataKey = unwrapDataKey(metadata, secret, payload)
  const headerLine = buildHeader(payload, metadata, completedAt)
  const contentHasher = createHash("sha256")
  contentHasher.update(headerLine, "utf8")
  let byteLength = Buffer.byteLength(headerLine, "utf8")
  let evidenceHash = EMPTY_CHUNK_EVIDENCE_HASH
  let observedChunks = 0

  for await (const chunk of iterateChunkEvents(client, payload, record.id, metadata.chunkCount)) {
    const plaintext = await decryptChunk(chunk, dataKey, payload, artifactStore)
    contentHasher.update(plaintext, "utf8")
    byteLength += Buffer.byteLength(plaintext, "utf8")
    evidenceHash = nextChunkEvidenceHash(evidenceHash, chunk)
    observedChunks += 1
  }
  if (observedChunks !== metadata.chunkCount || evidenceHash !== metadata.chunkEvidenceHash) {
    throw new BusinessRuleError("Inventory history export rolling chunk evidence is invalid.")
  }

  return exportManifestSchema.parse({
    schemaVersion: 2,
    exportId: payload.exportId,
    organizationId: payload.organizationId,
    actorId: payload.actorId,
    generatedAt: completedAt.toISOString(),
    expiresAt: payload.expiresAt,
    fileName: ["inventory-history", completedAt.toISOString().slice(0, 10), payload.exportId].join("-") + ".ndjson",
    fileType: FILE_TYPE,
    headerLine,
    headerHash: sha256(headerLine),
    contentHash: "sha256:" + contentHasher.digest("hex"),
    byteLength,
    rowCount: metadata.rowCount,
    chunkCount: metadata.chunkCount,
    chunkEvidenceHash: metadata.chunkEvidenceHash,
    requestFiltersHash: payload.requestFiltersHash,
    appliedFiltersHash: payload.appliedFiltersHash,
    snapshot: payload.snapshot,
    appliedFilters: payload.appliedFilters,
    completeness: payload.completeness,
    watermarkId: payload.watermarkId,
    redactionScope: payload.redactionScope,
  })
}

async function finalizeJob(
  client: typeof db,
  jobId: string,
  organizationId: string,
  workerId: string,
  secret: string,
  completedAt: Date,
  artifactStore: InventoryHistoryExportArtifactStore,
) {
  const record = await findJob(client, jobId, organizationId)
  if (!record || record.status !== "LOCKED" || record.lockedBy !== workerId) {
    throw new ConflictError("Inventory history export worker lease was lost.")
  }
  const { payload, metadata } = parseJob(record)
  const manifest = await buildCompletedManifest(
    client,
    record,
    payload,
    metadata,
    secret,
    completedAt,
    artifactStore,
  )

  return client.$transaction(async (tx) => {
    const current = await findJob(tx, jobId, organizationId)
    if (!current || current.status !== "LOCKED" || current.lockedBy !== workerId) {
      throw new ConflictError("Inventory history export worker lease was lost.")
    }
    const { payload: currentPayload, metadata: currentMetadata } = parseJob(current)
    assertCheckpointUnchanged(metadata, currentMetadata)
    if (currentPayload.exportId !== payload.exportId) {
      throw new ConflictError("Inventory history export identity changed during finalization.")
    }
    const completedMetadata: JobMetadata = {
      ...currentMetadata,
      stateVersion: currentMetadata.stateVersion + 1,
      state: "COMPLETE",
      pageState: "EXHAUSTED",
      nextCursor: null,
      manifest,
      lastErrorCode: null,
      lastCheckpointAt: completedAt.toISOString(),
    }
    await recordBusinessEventInTx(
      tx as Parameters<typeof recordBusinessEventInTx>[0],
      {
        organizationId: payload.organizationId,
        eventType: COMPLETED_EVENT_TYPE,
        eventSource: "WORKER",
        idempotencyKey: [payload.exportId, "completed", manifest.contentHash].join(":"),
        actorId: payload.actorId,
        sourceId: current.id,
        documentHash: manifest.contentHash,
        payload: manifest,
      },
    )
    const updated = await tx.businessEventOutbox.update({
      where: { id: current.id },
      data: {
        status: "SENT",
        processedAt: completedAt,
        lockedAt: null,
        lockedBy: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        metadata: jsonValue(completedMetadata),
      },
    })
    await tx.auditLog.create({
      data: {
        entityType: "InventoryTransactionHistoryBackgroundExport",
        entityId: current.id,
        action: "INVENTORY_HISTORY_BACKGROUND_EXPORT_COMPLETED",
        organizationId: payload.organizationId,
        userId: payload.actorId,
        changes: jsonValue(manifest),
      },
    })
    return statusFromRecord(asJobRecord(updated), completedAt)
  })
}

async function advanceJob(
  client: typeof db,
  jobId: string,
  organizationId: string,
  workerId: string,
  now: Date,
  secret: string,
  artifactStore: InventoryHistoryExportArtifactStore,
) {
  const record = await findJob(client, jobId, organizationId)
  if (!record || record.status !== "LOCKED" || record.lockedBy !== workerId) {
    throw new ConflictError("Inventory history export worker lease was lost.")
  }
  const { payload, metadata } = parseJob(record)
  if (metadata.pageState === "EXHAUSTED") {
    return {
      status: await finalizeJob(
        client,
        jobId,
        organizationId,
        workerId,
        secret,
        now,
        artifactStore,
      ),
      complete: true,
    }
  }
  if (metadata.pageState === "STARTED" && !metadata.nextCursor) {
    throw new BusinessRuleError("Inventory history export cursor checkpoint is missing.")
  }

  const page = await readInventoryMovementHistory(
    {
      organizationId: payload.organizationId,
      filters: {
        ...payload.queryFilters,
        pageSize: 100,
        ...(metadata.pageState === "STARTED" ? { cursor: metadata.nextCursor! } : {}),
      },
    },
    {
      client,
      now: () => now,
      recordedThrough: new Date(payload.snapshot.recordedThrough),
    },
  )
  const pageFilterHash = "sha256:" + hashNormalizedHistoryFilters(
    appliedFilterScope(page.appliedFilters),
  )
  if (
    page.snapshot.recordedThrough !== payload.snapshot.recordedThrough ||
    pageFilterHash !== payload.appliedFiltersHash
  ) {
    throw new BusinessRuleError("Inventory history export snapshot continuity was lost.")
  }
  if (!page.rows.length && page.pageInfo.hasMore) {
    throw new BusinessRuleError("Inventory history export returned an empty non-terminal page.")
  }

  const nextRowCount = metadata.rowCount + page.rows.length
  if (
    nextRowCount > payload.maximumRows ||
    (nextRowCount === payload.maximumRows && page.pageInfo.hasMore)
  ) {
    throw new InventoryHistoryBackgroundExportLimitError(payload.maximumRows)
  }

  let prepared: PreparedChunk | null = null
  let chunk: ChunkPayload | null = null
  if (page.rows.length) {
    const dataKey = unwrapDataKey(metadata, secret, payload)
    prepared = prepareChunk(page.rows, dataKey, payload, record.id, metadata.chunkCount)
    const artifact = await artifactStore.putEncryptedChunk({
      organizationId: payload.organizationId,
      exportId: payload.exportId,
      sequence: metadata.chunkCount,
      ciphertext: prepared.ciphertext,
    })
    chunk = chunkPayloadSchema.parse({ ...prepared.chunk, artifact })
  }

  const checkpoint = await client.$transaction(async (tx) => {
    const current = await findJob(tx, jobId, organizationId)
    if (!current || current.status !== "LOCKED" || current.lockedBy !== workerId) {
      throw new ConflictError("Inventory history export worker lease was lost.")
    }
    const { metadata: currentMetadata } = parseJob(current)
    assertCheckpointUnchanged(metadata, currentMetadata)

    if (chunk) await persistChunkInTx(tx, payload, current.id, chunk)
    const nextMetadata: JobMetadata = {
      ...currentMetadata,
      stateVersion: currentMetadata.stateVersion + 1,
      state: "RUNNING",
      pageState: page.pageInfo.hasMore ? "STARTED" : "EXHAUSTED",
      nextCursor: page.pageInfo.nextCursor,
      rowCount: nextRowCount,
      chunkCount: currentMetadata.chunkCount + (chunk ? 1 : 0),
      lastChunkSequence: chunk ? chunk.sequence : currentMetadata.lastChunkSequence,
      chunkEvidenceHash: chunk
        ? nextChunkEvidenceHash(currentMetadata.chunkEvidenceHash, chunk)
        : currentMetadata.chunkEvidenceHash,
      artifactDeletionState: chunk ? "PENDING" : currentMetadata.artifactDeletionState,
      lastErrorCode: null,
      lastCheckpointAt: now.toISOString(),
    }
    const updated = await tx.businessEventOutbox.update({
      where: { id: current.id },
      data: { metadata: jsonValue(nextMetadata) },
    })
    return {
      metadata: nextMetadata,
      status: statusFromRecord(asJobRecord(updated), now),
    }
  })

  if (checkpoint.metadata.pageState === "EXHAUSTED") {
    return {
      status: await finalizeJob(
        client,
        jobId,
        organizationId,
        workerId,
        secret,
        now,
        artifactStore,
      ),
      complete: true,
    }
  }
  return { status: checkpoint.status, complete: false }
}

async function deleteJobArtifacts(
  client: typeof db,
  record: JobRecord,
  now: Date,
  workerId: string,
  artifactStore: InventoryHistoryExportArtifactStore,
) {
  const { payload, metadata } = parseJob(record)
  if (metadata.artifactDeletionState === "COMPLETE") {
    return statusFromRecord(record, now)
  }

  let batch: InventoryHistoryExportArtifactReference[] = []
  for await (const chunk of iterateChunkEvents(client, payload, record.id, metadata.chunkCount)) {
    batch.push(chunk.artifact as InventoryHistoryExportArtifactReference)
    if (batch.length === CHUNK_MANIFEST_PAGE_SIZE) {
      await artifactStore.deleteEncryptedChunks(batch)
      batch = []
    }
  }
  if (batch.length) await artifactStore.deleteEncryptedChunks(batch)

  const current = await findJob(client, record.id, payload.organizationId)
  if (!current) throw new NotFoundError("Inventory history export job not found during cleanup.")
  const { metadata: currentMetadata } = parseJob(current)
  const deletedMetadata: JobMetadata = {
    ...currentMetadata,
    stateVersion: currentMetadata.stateVersion + 1,
    artifactDeletionState: "COMPLETE",
    artifactDeletedAt: now.toISOString(),
    lastCheckpointAt: now.toISOString(),
  }
  const updated = await client.businessEventOutbox.update({
    where: { id: current.id },
    data: {
      status: "CANCELLED",
      processedAt: now,
      lockedAt: null,
      lockedBy: null,
      metadata: jsonValue(deletedMetadata),
    },
  })
  await client.auditLog.create({
    data: {
      entityType: "InventoryTransactionHistoryBackgroundExport",
      entityId: current.id,
      action: "INVENTORY_HISTORY_EXPORT_ARTIFACTS_DELETED",
      organizationId: payload.organizationId,
      userId: payload.actorId,
      changes: jsonValue({
        exportId: payload.exportId,
        workerId,
        deletedAt: now.toISOString(),
        chunkCount: metadata.chunkCount,
        chunkEvidenceHash: metadata.chunkEvidenceHash,
      }),
    },
  })
  return statusFromRecord(asJobRecord(updated), now)
}

async function expireJob(
  client: typeof db,
  originalRecord: JobRecord,
  now: Date,
  workerId: string,
  artifactStore: InventoryHistoryExportArtifactStore,
) {
  const { payload, metadata } = parseJob(originalRecord)
  let record = originalRecord

  if (metadata.state !== "EXPIRED" || metadata.wrappedDataKey) {
    const expiredMetadata: JobMetadata = {
      ...metadata,
      stateVersion: metadata.stateVersion + 1,
      state: "EXPIRED",
      pageState: "EXHAUSTED",
      nextCursor: null,
      wrappedDataKey: null,
      lastCheckpointAt: now.toISOString(),
      cryptoShreddedAt: now.toISOString(),
      artifactDeletionState: metadata.chunkCount ? "PENDING" : "COMPLETE",
      artifactDeletedAt: metadata.chunkCount ? null : now.toISOString(),
    }
    record = asJobRecord(await client.businessEventOutbox.update({
      where: { id: originalRecord.id },
      data: {
        status: metadata.chunkCount ? "FAILED" : "CANCELLED",
        processedAt: now,
        lockedAt: null,
        lockedBy: null,
        metadata: jsonValue(expiredMetadata),
      },
    }))
    await client.auditLog.create({
      data: {
        entityType: "InventoryTransactionHistoryBackgroundExport",
        entityId: record.id,
        action: "INVENTORY_HISTORY_BACKGROUND_EXPORT_EXPIRED",
        organizationId: payload.organizationId,
        userId: payload.actorId,
        changes: jsonValue({
          exportId: payload.exportId,
          workerId,
          expiredAt: now.toISOString(),
          cryptoShredded: true,
          chunkCount: metadata.chunkCount,
          chunkEvidenceHash: metadata.chunkEvidenceHash,
          artifactDeletionState: expiredMetadata.artifactDeletionState,
        }),
      },
    })
  }

  try {
    return await deleteJobArtifacts(client, record, now, workerId, artifactStore)
  } catch {
    await client.businessEventOutbox.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        availableAt: new Date(now.getTime() + 5 * 60 * 1000),
        lockedAt: null,
        lockedBy: null,
      },
    })
    await client.auditLog.create({
      data: {
        entityType: "InventoryTransactionHistoryBackgroundExport",
        entityId: record.id,
        action: "INVENTORY_HISTORY_EXPORT_ARTIFACT_DELETION_PENDING",
        organizationId: payload.organizationId,
        userId: null,
        changes: jsonValue({
          exportId: payload.exportId,
          workerId,
          chunkCount: metadata.chunkCount,
          chunkEvidenceHash: metadata.chunkEvidenceHash,
        }),
      },
    })
    const current = await findJob(client, record.id, payload.organizationId)
    return statusFromRecord(current ?? record, now)
  }
}

async function failJob(
  client: typeof db,
  jobId: string,
  organizationId: string,
  workerId: string,
  now: Date,
  error: unknown,
) {
  const record = await findJob(client, jobId, organizationId)
  if (!record) throw new NotFoundError("Inventory history export job not found.")
  const nextAttempts = record.attempts + 1
  const deadLetter = nextAttempts >= record.maxAttempts
  const errorCode = error instanceof InventoryHistoryBackgroundExportLimitError
    ? "ROW_LIMIT_EXCEEDED"
    : error instanceof ConflictError
      ? "WORKER_LEASE_LOST"
      : "PROCESSING_FAILED"
  const rawMetadata = record.metadata && typeof record.metadata === "object"
    ? record.metadata as Record<string, unknown>
    : {}
  const metadata = {
    ...rawMetadata,
    stateVersion: Number(rawMetadata.stateVersion ?? 0) + 1,
    state: deadLetter ? "DEAD_LETTER" : "FAILED",
    lastErrorCode: errorCode,
    lastCheckpointAt: now.toISOString(),
  }
  const delaySeconds = Math.min(15 * 60, 30 * 2 ** Math.max(nextAttempts - 1, 0))
  const updated = await client.businessEventOutbox.update({
    where: { id: record.id },
    data: {
      status: deadLetter ? "DEAD_LETTER" : "FAILED",
      attempts: nextAttempts,
      availableAt: new Date(now.getTime() + delaySeconds * 1000),
      lockedAt: null,
      lockedBy: null,
      failedAt: now,
      lastErrorCode: errorCode,
      lastErrorMessage: "Inventory history export processing failed.",
      metadata: jsonValue(metadata),
    },
  })
  await client.auditLog.create({
    data: {
      entityType: "InventoryTransactionHistoryBackgroundExport",
      entityId: record.id,
      action: deadLetter
        ? "INVENTORY_HISTORY_BACKGROUND_EXPORT_DEAD_LETTERED"
        : "INVENTORY_HISTORY_BACKGROUND_EXPORT_RETRY_SCHEDULED",
      organizationId: record.organizationId,
      userId: null,
      changes: jsonValue({ errorCode, attempts: nextAttempts, maxAttempts: record.maxAttempts, workerId }),
    },
  })
  return statusFromRecord(asJobRecord(updated), now)
}

export async function processInventoryHistoryBackgroundExportJob(
  input: {
    organizationId: string
    jobId: string
    workerId: string
    maxPagesPerLease?: number
    leaseSeconds?: number
    now?: Date | string | number
  },
  options: InventoryHistoryBackgroundExportOptions = {},
) {
  const client = options.client ?? db
  const now = asDate(input.now, options.now?.() ?? new Date())
  const organizationId = z.string().min(1).parse(input.organizationId)
  const maxPagesPerLease = z.number().int().min(1).max(100).parse(input.maxPagesPerLease ?? 10)
  const leaseSeconds = z.number().int().min(30).max(30 * 60).parse(input.leaseSeconds ?? DEFAULT_LEASE_SECONDS)
  const workerId = z.string().min(1).max(128).parse(input.workerId)
  const secret = configuredSecret(options.secret)
  const staleBefore = new Date(now.getTime() - leaseSeconds * 1000)

  const claimed = await client.businessEventOutbox.updateMany({
    where: {
      id: input.jobId,
      organizationId,
      channel: "REPORT_EXPORT",
      eventName: JOB_EVENT_NAME,
      OR: [
        { status: { in: ["PENDING", "FAILED"] }, availableAt: { lte: now } },
        { status: "LOCKED", lockedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: "LOCKED",
      lockedAt: now,
      lockedBy: workerId,
    },
  })
  if (claimed.count !== 1) {
    const record = await findJob(client, input.jobId, organizationId)
    if (!record) throw new NotFoundError("Inventory history export job not found.")
    return { claimed: false, status: statusFromRecord(record, now) }
  }

  const record = await findJob(client, input.jobId, organizationId)
  if (!record) throw new NotFoundError("Inventory history export job not found after claim.")
  const artifactStore = options.artifactStore ??
    createUploadThingInventoryHistoryExportArtifactStore()
  try {
    const { payload } = parseJob(record)
    if (new Date(payload.expiresAt).getTime() <= now.getTime()) {
      return {
        claimed: true,
        status: await expireJob(client, record, now, workerId, artifactStore),
      }
    }
    let latest = statusFromRecord(record, now)
    for (let page = 0; page < maxPagesPerLease; page += 1) {
      const advanced = await advanceJob(
        client,
        record.id,
        organizationId,
        workerId,
        now,
        secret,
        artifactStore,
      )
      latest = advanced.status
      if (advanced.complete) return { claimed: true, status: latest }
    }

    const current = await findJob(client, record.id, organizationId)
    if (!current) throw new NotFoundError("Inventory history export job disappeared during processing.")
    const { metadata } = parseJob(current)
    const releasedMetadata: JobMetadata = {
      ...metadata,
      stateVersion: metadata.stateVersion + 1,
      state: "PENDING",
      lastCheckpointAt: now.toISOString(),
    }
    const released = await client.businessEventOutbox.update({
      where: { id: current.id },
      data: {
        status: "PENDING",
        availableAt: now,
        lockedAt: null,
        lockedBy: null,
        metadata: jsonValue(releasedMetadata),
      },
    })
    return { claimed: true, status: statusFromRecord(asJobRecord(released), now) }
  } catch (error) {
    return {
      claimed: true,
      status: await failJob(client, record.id, organizationId, workerId, now, error),
    }
  }
}

export async function processNextInventoryHistoryBackgroundExportJob(
  input: {
    organizationId: string
    workerId: string
    maxPagesPerLease?: number
    now?: Date | string | number
  },
  options: InventoryHistoryBackgroundExportOptions = {},
) {
  const client = options.client ?? db
  const now = asDate(input.now, options.now?.() ?? new Date())
  const organizationId = z.string().min(1).parse(input.organizationId)
  const candidate = await client.businessEventOutbox.findFirst({
    where: {
      organizationId,
      channel: "REPORT_EXPORT",
      eventName: JOB_EVENT_NAME,
      OR: [
        { status: { in: ["PENDING", "FAILED"] }, availableAt: { lte: now } },
        { status: "LOCKED", lockedAt: { lt: new Date(now.getTime() - DEFAULT_LEASE_SECONDS * 1000) } },
      ],
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  })
  if (!candidate) return null
  return processInventoryHistoryBackgroundExportJob(
    {
      organizationId,
      jobId: candidate.id,
      workerId: input.workerId,
      maxPagesPerLease: input.maxPagesPerLease,
      now,
    },
    options,
  )
}

function assertCurrentExportPermissions(permissions: readonly string[]) {
  if (
    !hasRbacPermission(permissions, "reports.export") ||
    !hasRbacPermission(permissions, "inventory.levels.read")
  ) {
    throw new ForbiddenError("You are not allowed to download inventory history exports.")
  }
}

export async function getInventoryHistoryBackgroundExportStatus(
  input: {
    organizationId: string
    actorPermissions: readonly string[]
    jobId: string
    now?: Date | string | number
  },
  options: InventoryHistoryBackgroundExportOptions = {},
) {
  assertCurrentExportPermissions(input.actorPermissions)
  const now = asDate(input.now, options.now?.() ?? new Date())
  const record = await findJob(options.client ?? db, input.jobId, input.organizationId)
  if (!record) throw new NotFoundError("Inventory history export job not found.")
  return statusFromRecord(record, now)
}

function tokenSignature(secret: string, encodedPayload: string) {
  return createHmac("sha256", secret)
    .update(`${DOWNLOAD_SCOPE}.${encodedPayload}`, "utf8")
    .digest("base64url")
}

function encodeDownloadToken(payload: z.infer<typeof downloadTokenSchema>, secret: string) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  return `${encoded}.${tokenSignature(secret, encoded)}`
}

function decodeDownloadToken(token: string, secret: string) {
  const [encoded, signature, ...extra] = token.split(".")
  if (!encoded || !signature || extra.length) throw new ForbiddenError("Inventory history download token is invalid.")
  const expected = tokenSignature(secret, encoded)
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new ForbiddenError("Inventory history download token is invalid.")
  }
  try {
    return downloadTokenSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")))
  } catch {
    throw new ForbiddenError("Inventory history download token is invalid.")
  }
}

export async function createInventoryHistoryExportDownloadGrant(
  input: {
    organizationId: string
    actorId: string
    actorPermissions: readonly string[]
    jobId: string
    lastAuthAt?: Date | number | string | null
    now?: Date | string | number
    grantSeconds?: number
  },
  options: InventoryHistoryBackgroundExportOptions = {},
) {
  const client = options.client ?? db
  const auditClient = options.auditClient ?? client
  const now = asDate(input.now, options.now?.() ?? new Date())
  await assertExportAuthority({ ...input, now }, input.jobId, auditClient)
  const record = await findJob(client, input.jobId, input.organizationId)
  if (!record) throw new NotFoundError("Inventory history export job not found.")
  const { payload, metadata } = parseJob(record)
  const manifest = metadata.manifest
  if (record.status !== "SENT" || !manifest || !metadata.wrappedDataKey) {
    throw new BusinessRuleError("Inventory history export is not ready for download.")
  }
  const jobExpiry = new Date(payload.expiresAt)
  if (jobExpiry.getTime() <= now.getTime()) throw new BusinessRuleError("Inventory history export has expired.")
  const grantSeconds = z.number().int().min(60).max(30 * 60).parse(
    input.grantSeconds ?? DEFAULT_DOWNLOAD_GRANT_SECONDS,
  )
  const expiresAt = new Date(Math.min(jobExpiry.getTime(), now.getTime() + grantSeconds * 1000))
  const token = encodeDownloadToken({
    v: 1,
    scope: DOWNLOAD_SCOPE,
    tenantId: input.organizationId,
    actorId: input.actorId,
    jobId: input.jobId,
    contentHash: manifest.contentHash,
    exp: Math.floor(expiresAt.getTime() / 1000),
    jti: randomUUID(),
  }, configuredSecret(options.secret))
  await client.auditLog.create({
    data: {
      entityType: "InventoryTransactionHistoryBackgroundExport",
      entityId: record.id,
      action: "INVENTORY_HISTORY_EXPORT_DOWNLOAD_GRANTED",
      organizationId: input.organizationId,
      userId: input.actorId,
      changes: jsonValue({ contentHash: manifest.contentHash, expiresAt: expiresAt.toISOString() }),
    },
  })
  return {
    jobId: record.id,
    token,
    expiresAt: expiresAt.toISOString(),
    fileName: manifest.fileName,
    fileType: manifest.fileType,
    contentHash: manifest.contentHash,
    byteLength: manifest.byteLength,
  }
}

export async function streamInventoryHistoryExportDownload(
  input: {
    organizationId: string
    actorId: string
    actorPermissions: readonly string[]
    token: string
    now?: Date | string | number
  },
  options: InventoryHistoryBackgroundExportOptions = {},
) {
  assertCurrentExportPermissions(input.actorPermissions)
  const client = options.client ?? db
  const now = asDate(input.now, options.now?.() ?? new Date())
  const secret = configuredSecret(options.secret)
  const token = decodeDownloadToken(input.token, secret)
  if (
    token.tenantId !== input.organizationId ||
    token.actorId !== input.actorId ||
    token.exp <= Math.floor(now.getTime() / 1000)
  ) {
    throw new ForbiddenError("Inventory history download token is expired or out of scope.")
  }
  const record = await findJob(client, token.jobId, input.organizationId)
  if (!record) throw new NotFoundError("Inventory history export job not found.")
  const { payload, metadata } = parseJob(record)
  const manifest = metadata.manifest
  if (
    record.status !== "SENT" ||
    !manifest ||
    !metadata.wrappedDataKey ||
    manifest.contentHash !== token.contentHash ||
    new Date(payload.expiresAt).getTime() <= now.getTime()
  ) {
    throw new ForbiddenError("Inventory history export download is unavailable.")
  }
  const readyManifest = manifest
  const jobId = record.id
  const dataKey = unwrapDataKey(metadata, secret, payload)
  const artifactStore = options.artifactStore ??
    createUploadThingInventoryHistoryExportArtifactStore()
  await client.auditLog.create({
    data: {
      entityType: "InventoryTransactionHistoryBackgroundExport",
      entityId: record.id,
      action: "INVENTORY_HISTORY_EXPORT_DOWNLOAD_STARTED",
      organizationId: input.organizationId,
      userId: input.actorId,
      changes: jsonValue({ contentHash: readyManifest.contentHash, byteLength: readyManifest.byteLength }),
    },
  })

  async function* verifiedStream() {
    const hasher = createHash("sha256")
    let byteLength = 0
    hasher.update(readyManifest.headerLine, "utf8")
    byteLength += Buffer.byteLength(readyManifest.headerLine, "utf8")
    yield readyManifest.headerLine
    let evidenceHash = EMPTY_CHUNK_EVIDENCE_HASH
    let observedChunks = 0
    for await (const chunk of iterateChunkEvents(client, payload, jobId, metadata.chunkCount)) {
      const plaintext = await decryptChunk(chunk, dataKey, payload, artifactStore)
      hasher.update(plaintext, "utf8")
      byteLength += Buffer.byteLength(plaintext, "utf8")
      evidenceHash = nextChunkEvidenceHash(evidenceHash, chunk)
      observedChunks += 1
      yield plaintext
    }
    const contentHash = "sha256:" + hasher.digest("hex")
    if (
      contentHash !== readyManifest.contentHash ||
      byteLength !== readyManifest.byteLength ||
      observedChunks !== readyManifest.chunkCount ||
      evidenceHash !== readyManifest.chunkEvidenceHash
    ) {
      throw new BusinessRuleError("Inventory history export download integrity check failed.")
    }
  }

  return {
    fileName: readyManifest.fileName,
    fileType: readyManifest.fileType,
    contentHash: readyManifest.contentHash,
    byteLength: readyManifest.byteLength,
    stream: verifiedStream(),
  }
}

export async function expireInventoryHistoryBackgroundExports(
  input: {
    organizationId: string
    workerId: string
    now?: Date | string | number
    batchSize?: number
  },
  options: InventoryHistoryBackgroundExportOptions = {},
) {
  const client = options.client ?? db
  const now = asDate(input.now, options.now?.() ?? new Date())
  const organizationId = z.string().min(1).parse(input.organizationId)
  const batchSize = z.number().int().min(1).max(500).parse(input.batchSize ?? 100)
  const artifactStore = options.artifactStore ??
    createUploadThingInventoryHistoryExportArtifactStore()
  const records = (await client.businessEventOutbox.findMany({
    where: {
      organizationId,
      channel: "REPORT_EXPORT",
      eventName: JOB_EVENT_NAME,
      status: { in: ["PENDING", "LOCKED", "FAILED", "DEAD_LETTER", "SENT"] },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  })) as unknown as JobRecord[]
  let expiredCount = 0
  for (const record of records) {
    const { payload, metadata } = parseJob(record)
    const expiryReached = new Date(payload.expiresAt).getTime() <= now.getTime()
    const cleanupPending = metadata.state === "EXPIRED" &&
      metadata.artifactDeletionState === "PENDING"
    if ((expiryReached && metadata.state !== "EXPIRED") || cleanupPending) {
      await expireJob(client, record, now, input.workerId, artifactStore)
      expiredCount += 1
    }
  }
  return { scannedCount: records.length, expiredCount }
}
