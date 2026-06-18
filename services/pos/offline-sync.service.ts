import { createHash } from "crypto"

import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  Prisma,
  SalesOrderStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
  stableJsonStringify,
} from "@/services/events/business-event.service"

import {
  ingestOfflineSyncBatchSchema,
  offlineSyncDashboardInputSchema,
  registerOfflineDeviceSchema,
  replayOfflineSaleEnvelopeSchema,
  type IngestOfflineSyncBatchInput,
  type OfflineSyncDashboardInput,
  type OfflineSyncEventInput,
  type ParsedIngestOfflineSyncBatchInput,
  type RegisterOfflineDeviceInput,
  type ReplayOfflineSaleEnvelopeInput,
} from "./offline-sync.schemas"
import { commitSaleSchema, type CommitSaleInput } from "./pos.schemas"
import { commitPOSSale } from "./pos.service"
import { getSalesReceipt, type SalesReceiptPayload } from "./receipt.service"

type OrgScoped<T extends object = Record<string, unknown>> = T & {
  organizationId: string
}

type UserScoped<T extends object = Record<string, unknown>> = OrgScoped<T> & {
  userId: string
}

type OfflineTx = Prisma.TransactionClient

export type OfflineSyncDeviceDTO = {
  id: string
  organizationId: string
  locationId: string
  terminalId: string
  deviceLabel: string
  deviceFingerprintHash: string
  publicKeyFingerprint: string | null
  status: string
  lastSequence: number
  highWaterHash: string | null
  lastSeenAt: string | null
  enrolledAt: string
}

export type OfflineSyncConflictDTO = {
  id: string
  deviceId: string
  eventId: string | null
  conflictType: string
  severity: string
  status: string
  expectedSequence: number | null
  actualSequence: number | null
  message: string
  createdAt: string
}

export type OfflineSyncCertificateDTO = {
  id: string
  deviceId: string
  terminalId: string
  locationId: string
  status: string
  lastCertifiedSequence: number
  eventCount: number
  acceptedCount: number
  conflictCount: number
  pendingReplayCount: number
  closeBlocker: boolean
  blockerCode: string | null
  blockerMessage: string | null
  certificateHash: string | null
  updatedAt: string
}

export type OfflineSyncDashboardData = {
  asOf: string
  summary: {
    deviceCount: number
    pendingEventCount: number
    openConflictCount: number
    closeBlockerCount: number
  }
  devices: OfflineSyncDeviceDTO[]
  conflicts: OfflineSyncConflictDTO[]
  certificates: OfflineSyncCertificateDTO[]
  blockers: Array<{
    code: string
    severity: "warning" | "critical"
    message: string
    deviceId?: string
    terminalId?: string
  }>
}

export type OfflineSyncBatchResult = {
  batchId: string
  status: string
  acceptedCount: number
  duplicateCount: number
  conflictCount: number
  firstSequence: number | null
  lastSequence: number | null
  device: OfflineSyncDeviceDTO
  conflicts: OfflineSyncConflictDTO[]
  certificate: OfflineSyncCertificateDTO
  notifications: Array<{
    destination: "cashier" | "manager" | "accountant"
    type: "info" | "warning" | "critical"
    message: string
  }>
}

export type OfflineSaleReplayResult = {
  offlineEventId: string
  status: "REPLAYED" | "DUPLICATE_REPLAY" | "BLOCKED"
  saleId: string | null
  orderNumber: string | null
  postingBatchId: string | null
  fiscalDocumentId: string | null
  fiscalDocumentStatus: string | null
  legalDeliveryBlocked: boolean | null
  blockerCode: string | null
  blockerMessage: string | null
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function buildOfflineEventEntryHash(input: {
  deviceId: string
  deviceSeq: number
  eventType: string
  schemaVersion: number
  payloadHash: string
  prevHash?: string | null
}) {
  return sha256([
    input.deviceId,
    String(input.deviceSeq),
    input.eventType,
    String(input.schemaVersion),
    input.payloadHash,
    input.prevHash ?? "",
  ].join("|"))
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(stableJsonStringify(value)) as Prisma.InputJsonValue
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeMetadata(existing: Prisma.JsonValue | null | undefined, patch: Record<string, unknown>) {
  return safeJson({
    ...(isRecord(existing) ? existing : {}),
    ...patch,
  })
}

function receiptDocumentHash(receipt: SalesReceiptPayload) {
  return receipt.certification.certificationArtifactHash
    ?? sha256(stableJsonStringify({
      receipt: receipt.receipt,
      certification: receipt.certification,
    }))
}

function replayResultFromReceipt(input: {
  offlineEventId: string
  saleId: string
  orderNumber: string
  postingBatchId?: string | null
  receipt: SalesReceiptPayload
  duplicate?: boolean
}): OfflineSaleReplayResult {
  return {
    offlineEventId: input.offlineEventId,
    status: input.duplicate ? "DUPLICATE_REPLAY" : "REPLAYED",
    saleId: input.saleId,
    orderNumber: input.orderNumber,
    postingBatchId: input.postingBatchId ?? null,
    fiscalDocumentId: input.receipt.certification.fiscalDocumentId,
    fiscalDocumentStatus: input.receipt.certification.fiscalDocumentStatus,
    legalDeliveryBlocked: input.receipt.certification.legalDeliveryBlocked,
    blockerCode: null,
    blockerMessage: null,
  }
}

function blockedReplayResult(input: {
  offlineEventId: string
  blockerCode: string
  blockerMessage: string
}): OfflineSaleReplayResult {
  return {
    offlineEventId: input.offlineEventId,
    status: "BLOCKED",
    saleId: null,
    orderNumber: null,
    postingBatchId: null,
    fiscalDocumentId: null,
    fiscalDocumentStatus: null,
    legalDeliveryBlocked: null,
    blockerCode: input.blockerCode,
    blockerMessage: input.blockerMessage,
  }
}

function replayMetadata(input: {
  result: OfflineSaleReplayResult
  receipt: SalesReceiptPayload
  documentHash: string
}) {
  return {
    offlineReplay: {
      status: input.result.status,
      saleId: input.result.saleId,
      orderNumber: input.result.orderNumber,
      postingBatchId: input.result.postingBatchId,
      fiscalDocumentId: input.result.fiscalDocumentId,
      fiscalDocumentStatus: input.result.fiscalDocumentStatus,
      legalDeliveryBlocked: input.result.legalDeliveryBlocked,
      legalDeliveryStatus: input.receipt.certification.legalDeliveryStatus,
      documentHash: input.documentHash,
      replayedAt: new Date().toISOString(),
    },
  }
}

function replayBlockerCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()

  if (normalized.includes("stock")) return "OFFLINE_REPLAY_STOCK_BLOCKED"
  if (normalized.includes("payment") || normalized.includes("tender") || normalized.includes("provider")) {
    return "OFFLINE_REPLAY_PAYMENT_BLOCKED"
  }
  if (
    normalized.includes("fiscal") ||
    normalized.includes("certification") ||
    normalized.includes("posted ledger") ||
    normalized.includes("posting")
  ) {
    return "OFFLINE_REPLAY_COMPLIANCE_BLOCKED"
  }
  if (normalized.includes("session") || normalized.includes("shift") || normalized.includes("drawer")) {
    return "OFFLINE_REPLAY_DRAWER_BLOCKED"
  }

  return "OFFLINE_REPLAY_BLOCKED"
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  const leaksInternalDetails =
    normalized.includes("prisma") ||
    normalized.includes("sql") ||
    normalized.includes("database") ||
    normalized.includes("constraint") ||
    normalized.includes("foreign key") ||
    normalized.includes("stack") ||
    normalized.includes("secret") ||
    normalized.includes("token")

  if (leaksInternalDetails) {
    return "Offline sale replay could not complete. Review the operator conflict evidence for remediation."
  }

  return message.trim().slice(0, 500) || "Offline sale replay could not complete."
}

function extractCommitSalePayload(payload: unknown): CommitSaleInput {
  const candidate = isRecord(payload) && isRecord(payload.commitSale)
    ? payload.commitSale
    : payload

  return commitSaleSchema.parse(candidate)
}

function dateToString(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function toDeviceDTO(device: {
  id: string
  organizationId: string
  locationId: string
  terminalId: string
  deviceLabel: string
  deviceFingerprintHash: string
  publicKeyFingerprint: string | null
  status: string
  lastSequence: number
  highWaterHash: string | null
  lastSeenAt: Date | string | null
  enrolledAt: Date | string
}): OfflineSyncDeviceDTO {
  return {
    id: device.id,
    organizationId: device.organizationId,
    locationId: device.locationId,
    terminalId: device.terminalId,
    deviceLabel: device.deviceLabel,
    deviceFingerprintHash: device.deviceFingerprintHash,
    publicKeyFingerprint: device.publicKeyFingerprint,
    status: device.status,
    lastSequence: device.lastSequence,
    highWaterHash: device.highWaterHash,
    lastSeenAt: dateToString(device.lastSeenAt),
    enrolledAt: dateToString(device.enrolledAt) ?? new Date().toISOString(),
  }
}

function toConflictDTO(conflict: {
  id: string
  deviceId: string
  eventId: string | null
  conflictType: string
  severity: string
  status: string
  expectedSequence: number | null
  actualSequence: number | null
  message: string
  createdAt: Date | string
}): OfflineSyncConflictDTO {
  return {
    id: conflict.id,
    deviceId: conflict.deviceId,
    eventId: conflict.eventId,
    conflictType: conflict.conflictType,
    severity: conflict.severity,
    status: conflict.status,
    expectedSequence: conflict.expectedSequence,
    actualSequence: conflict.actualSequence,
    message: conflict.message,
    createdAt: dateToString(conflict.createdAt) ?? new Date().toISOString(),
  }
}

function toCertificateDTO(certificate: {
  id: string
  deviceId: string
  terminalId: string
  locationId: string
  status: string
  lastCertifiedSequence: number
  eventCount: number
  acceptedCount: number
  conflictCount: number
  pendingReplayCount: number
  closeBlocker: boolean
  blockerCode: string | null
  blockerMessage: string | null
  certificateHash: string | null
  updatedAt: Date | string
}): OfflineSyncCertificateDTO {
  return {
    id: certificate.id,
    deviceId: certificate.deviceId,
    terminalId: certificate.terminalId,
    locationId: certificate.locationId,
    status: certificate.status,
    lastCertifiedSequence: certificate.lastCertifiedSequence,
    eventCount: certificate.eventCount,
    acceptedCount: certificate.acceptedCount,
    conflictCount: certificate.conflictCount,
    pendingReplayCount: certificate.pendingReplayCount,
    closeBlocker: certificate.closeBlocker,
    blockerCode: certificate.blockerCode,
    blockerMessage: certificate.blockerMessage,
    certificateHash: certificate.certificateHash,
    updatedAt: dateToString(certificate.updatedAt) ?? new Date().toISOString(),
  }
}

async function assertTerminalScope(
  tx: Pick<OfflineTx, "pOSStation">,
  input: { organizationId: string; terminalId: string; locationId: string },
) {
  const terminal = await tx.pOSStation.findFirst({
    where: {
      id: input.terminalId,
      organizationId: input.organizationId,
      locationId: input.locationId,
      isActive: true,
    },
    select: { id: true },
  })

  if (!terminal) {
    throw new NotFoundError("POS terminal is not available for offline sync.")
  }
}

async function createConflict(
  tx: OfflineTx,
  input: {
    organizationId: string
    deviceId: string
    eventId?: string | null
    syncBatchId?: string | null
    conflictType: string
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    expectedSequence?: number | null
    actualSequence?: number | null
    expectedHash?: string | null
    actualHash?: string | null
    existingPayloadHash?: string | null
    incomingPayloadHash?: string | null
    message: string
    metadata?: unknown
  },
) {
  return tx.pOSOfflineSyncConflict.create({
    data: {
      organizationId: input.organizationId,
      deviceId: input.deviceId,
      eventId: input.eventId ?? null,
      syncBatchId: input.syncBatchId ?? null,
      conflictType: input.conflictType as never,
      severity: input.severity ?? "HIGH",
      expectedSequence: input.expectedSequence ?? null,
      actualSequence: input.actualSequence ?? null,
      expectedHash: input.expectedHash ?? null,
      actualHash: input.actualHash ?? null,
      existingPayloadHash: input.existingPayloadHash ?? null,
      incomingPayloadHash: input.incomingPayloadHash ?? null,
      message: input.message,
      metadata: input.metadata === undefined ? undefined : safeJson(input.metadata),
    },
  })
}

function conflictNotification(conflictCount: number) {
  if (conflictCount <= 0) return []

  return [
    {
      destination: "manager" as const,
      type: "critical" as const,
      message: `${conflictCount} offline POS sync conflict(s) require manager review.`,
    },
    {
      destination: "accountant" as const,
      type: "warning" as const,
      message: "Offline POS conflicts are blocking certification and close readiness.",
    },
  ]
}

function acceptedNotification(acceptedCount: number) {
  if (acceptedCount <= 0) return []

  return [
    {
      destination: "cashier" as const,
      type: "info" as const,
      message: `${acceptedCount} offline event(s) synced and are pending server replay.`,
    },
    {
      destination: "accountant" as const,
      type: "warning" as const,
      message: "Offline receipt evidence is provisional until server certification completes.",
    },
  ]
}

export async function registerOfflineDevice(input: UserScoped<RegisterOfflineDeviceInput>) {
  const parsed = registerOfflineDeviceSchema.parse(input)

  return db.$transaction(async (tx) => {
    await assertTerminalScope(tx, {
      organizationId: input.organizationId,
      terminalId: parsed.terminalId,
      locationId: parsed.locationId,
    })

    const existing = await tx.pOSOfflineDevice.findUnique({
      where: {
        organizationId_deviceFingerprintHash: {
          organizationId: input.organizationId,
          deviceFingerprintHash: parsed.deviceFingerprintHash,
        },
      },
    })

    if (existing?.status === "REVOKED") {
      throw new BusinessRuleError("DEVICE_REVOKED: this offline device has been revoked.")
    }

    const device = existing
      ? await tx.pOSOfflineDevice.update({
          where: { id: existing.id },
          data: {
            terminalId: parsed.terminalId,
            locationId: parsed.locationId,
            deviceLabel: parsed.deviceLabel,
            publicKeyFingerprint: parsed.publicKeyFingerprint,
            status: existing.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
            lastSeenAt: new Date(),
            metadata: parsed.metadata === undefined ? undefined : safeJson(parsed.metadata),
          },
        })
      : await tx.pOSOfflineDevice.create({
          data: {
            organizationId: input.organizationId,
            terminalId: parsed.terminalId,
            locationId: parsed.locationId,
            deviceLabel: parsed.deviceLabel,
            deviceFingerprintHash: parsed.deviceFingerprintHash,
            publicKeyFingerprint: parsed.publicKeyFingerprint,
            enrolledById: input.userId,
            lastSeenAt: new Date(),
            metadata: parsed.metadata === undefined ? undefined : safeJson(parsed.metadata),
          },
        })

    await tx.pOSOfflineSyncCertificate.upsert({
      where: {
        organizationId_deviceId_certificationScope: {
          organizationId: input.organizationId,
          deviceId: device.id,
          certificationScope: "DEVICE",
        },
      },
      create: {
        organizationId: input.organizationId,
        deviceId: device.id,
        terminalId: parsed.terminalId,
        locationId: parsed.locationId,
        status: "OPEN",
        closeBlocker: false,
        blockerCode: null,
        blockerMessage: null,
        certificateHash: sha256(`offline-device:${device.id}:0`),
      },
      update: {
        terminalId: parsed.terminalId,
        locationId: parsed.locationId,
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: input.organizationId,
      eventType: "pos.offline.device.enrolled",
      eventSource: "OFFLINE_POS",
      idempotencyKey: `offline-device:${device.deviceFingerprintHash}:enrolled`,
      actorId: input.userId,
      locationId: parsed.locationId,
      registerId: parsed.terminalId,
      deviceId: device.id,
      payload: safeJson({
        deviceId: device.id,
        deviceLabel: device.deviceLabel,
        terminalId: parsed.terminalId,
        locationId: parsed.locationId,
        status: device.status,
      }),
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "pos.offline.device.enrolled",
          destination: "manager",
          payload: {
            deviceId: device.id,
            terminalId: parsed.terminalId,
            locationId: parsed.locationId,
          },
        },
      ],
    })

    await tx.auditLog.create({
      data: {
        entityType: "POSOfflineDevice",
        entityId: device.id,
        action: existing ? "POS_OFFLINE_DEVICE_REFRESHED" : "POS_OFFLINE_DEVICE_ENROLLED",
        organizationId: input.organizationId,
        userId: input.userId,
        changes: safeJson({
          terminalId: parsed.terminalId,
          locationId: parsed.locationId,
          status: device.status,
        }),
      },
    })

    return toDeviceDTO(device)
  })
}

function orderedEvents(events: OfflineSyncEventInput[]) {
  return [...events].sort((left, right) => left.deviceSeq - right.deviceSeq)
}

function sequenceStatus(batch: { acceptedCount: number; conflictCount: number }) {
  if (batch.conflictCount > 0 && batch.acceptedCount > 0) return "PARTIAL_CONFLICT"
  if (batch.conflictCount > 0) return "REJECTED"
  return "ACCEPTED"
}

async function recordOfflineConflictBusinessEvent(
  tx: OfflineTx,
  input: {
    organizationId: string
    userId: string
    deviceId: string
    terminalId: string
    locationId: string
    syncBatchId: string
    conflictCount: number
  },
) {
  if (input.conflictCount <= 0) return null

  return recordBusinessEventInTx(tx, {
    organizationId: input.organizationId,
    eventType: "pos.offline.sync.conflict",
    eventSource: "OFFLINE_POS",
    idempotencyKey: `offline-sync-batch:${input.syncBatchId}:conflicts`,
    actorId: input.userId,
    locationId: input.locationId,
    registerId: input.terminalId,
    deviceId: input.deviceId,
    sourceId: input.syncBatchId,
    payload: safeJson({
      syncBatchId: input.syncBatchId,
      deviceId: input.deviceId,
      conflictCount: input.conflictCount,
    }),
    outboxMessages: [
      {
        channel: "NOTIFICATION",
        eventName: "pos.offline.sync.conflict",
        destination: "manager",
        payload: {
          syncBatchId: input.syncBatchId,
          deviceId: input.deviceId,
          conflictCount: input.conflictCount,
        },
      },
      {
        channel: "NOTIFICATION",
        eventName: "pos.offline.sync.certification_blocked",
        destination: "accountant",
        payload: {
          syncBatchId: input.syncBatchId,
          deviceId: input.deviceId,
          blockerCode: "OFFLINE_SYNC_CONFLICT",
        },
      },
    ],
  })
}

async function recordAcceptedOfflineEvent(
  tx: OfflineTx,
  input: {
    organizationId: string
    userId: string
    deviceId: string
    terminalId: string
    locationId: string
    offlineEventId: string
    event: OfflineSyncEventInput
    payloadHash: string
    entryHash: string
  },
) {
  const result = await recordBusinessEventInTx(tx, {
    organizationId: input.organizationId,
    eventType: "pos.offline.event.captured",
    eventSource: "OFFLINE_POS",
    idempotencyKey: `offline-event:${input.event.idempotencyKey}:captured`,
    actorId: input.userId,
    locationId: input.locationId,
    registerId: input.terminalId,
    deviceId: input.deviceId,
    sourceId: input.offlineEventId,
    payloadHash: input.payloadHash,
    payload: safeJson({
      offlineEventId: input.offlineEventId,
      eventType: input.event.eventType,
      deviceSeq: input.event.deviceSeq,
      provisionalReference: input.event.provisionalReference ?? null,
      payloadHash: input.payloadHash,
      entryHash: input.entryHash,
      status: "PENDING_REPLAY",
      blockerCode: "UNPOSTED_ACCEPTED_EVENT",
    }),
    outboxMessages: [
      {
        channel: "SYNC_ACK",
        eventName: "pos.offline.event.accepted",
        destination: input.deviceId,
        payload: {
          offlineEventId: input.offlineEventId,
          deviceSeq: input.event.deviceSeq,
          status: "PENDING_REPLAY",
        },
      },
      {
        channel: "NOTIFICATION",
        eventName: "pos.offline.receipt.provisional",
        destination: "accountant",
        payload: {
          offlineEventId: input.offlineEventId,
          provisionalReference: input.event.provisionalReference ?? null,
          blockerCode: "PROVISIONAL_RECEIPT_PENDING",
        },
      },
    ],
  })

  await tx.pOSOfflineEvent.update({
    where: { id: input.offlineEventId },
    data: {
      businessEventId: result.event.id,
      blockerCode: "UNPOSTED_ACCEPTED_EVENT",
      blockerMessage: "Accepted offline event is pending POS replay and server certification.",
    },
  })
}

async function loadOfflineSaleReplayEvent(input: {
  organizationId: string
  offlineEventId: string
}) {
  const event = await db.pOSOfflineEvent.findFirst({
    where: {
      id: input.offlineEventId,
      organizationId: input.organizationId,
    },
    include: {
      device: {
        select: {
          id: true,
          lastSequence: true,
        },
      },
    },
  })

  if (!event) {
    throw new NotFoundError("Offline POS event was not found.")
  }

  if (event.eventType !== "OFFLINE_SALE_CAPTURED") {
    throw new BusinessRuleError("Only accepted offline sale envelopes can be replayed through POS finalization.")
  }

  return event
}

function replayResultFromEventMetadata(event: Awaited<ReturnType<typeof loadOfflineSaleReplayEvent>>) {
  const metadata = isRecord(event.metadata) ? event.metadata : {}
  const replay = isRecord(metadata.offlineReplay) ? metadata.offlineReplay : {}

  return {
    offlineEventId: event.id,
    status: "DUPLICATE_REPLAY",
    saleId: typeof replay.saleId === "string" ? replay.saleId : null,
    orderNumber: typeof replay.orderNumber === "string" ? replay.orderNumber : null,
    postingBatchId: typeof replay.postingBatchId === "string" ? replay.postingBatchId : event.postingBatchId,
    fiscalDocumentId: typeof replay.fiscalDocumentId === "string" ? replay.fiscalDocumentId : null,
    fiscalDocumentStatus: typeof replay.fiscalDocumentStatus === "string" ? replay.fiscalDocumentStatus : null,
    legalDeliveryBlocked:
      typeof replay.legalDeliveryBlocked === "boolean" ? replay.legalDeliveryBlocked : null,
    blockerCode: event.blockerCode,
    blockerMessage: event.blockerMessage,
  } satisfies OfflineSaleReplayResult
}

function assertReplayScope(
  event: Awaited<ReturnType<typeof loadOfflineSaleReplayEvent>>,
  commitInput: CommitSaleInput,
) {
  if (commitInput.locationId !== event.locationId || commitInput.terminalId !== event.terminalId) {
    throw new BusinessRuleError("OFFLINE_REPLAY_SCOPE_MISMATCH: sale envelope terminal or location does not match the accepted device event.")
  }

  if (event.sessionId && commitInput.sessionId !== event.sessionId) {
    throw new BusinessRuleError("OFFLINE_REPLAY_SCOPE_MISMATCH: sale envelope session does not match the accepted device event.")
  }
}

async function findCompletedReplayOutcome(input: {
  organizationId: string
  event: Awaited<ReturnType<typeof loadOfflineSaleReplayEvent>>
  commitInput: CommitSaleInput
}) {
  const sale = await db.salesOrder.findFirst({
    where: {
      id: input.commitInput.salesOrderId,
      organizationId: input.organizationId,
      locationId: input.event.locationId,
      terminalId: input.event.terminalId,
      sessionId: input.commitInput.sessionId,
      status: SalesOrderStatus.COMPLETED,
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
    },
  })

  if (!sale) return null

  const [receipt, saleJournalEntry] = await Promise.all([
    getSalesReceipt({
      salesOrderId: sale.id,
      organizationId: input.organizationId,
    }),
    db.journalEntry.findFirst({
      where: {
        organizationId: input.organizationId,
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: sale.id,
        postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
        status: JournalEntryStatus.POSTED,
      },
      select: { postingBatchId: true },
      orderBy: { postedAt: "desc" },
    }),
  ])

  return {
    saleId: sale.id,
    orderNumber: sale.orderNumber,
    postingBatchId: saleJournalEntry?.postingBatchId ?? null,
    receipt,
  }
}

async function markOfflineSaleReplayed(input: {
  context: { organizationId: string; userId: string }
  event: Awaited<ReturnType<typeof loadOfflineSaleReplayEvent>>
  result: OfflineSaleReplayResult
  receipt: SalesReceiptPayload
}) {
  const documentHash = receiptDocumentHash(input.receipt)

  await db.$transaction(async (tx) => {
    await recordBusinessEventInTx(tx, {
      organizationId: input.context.organizationId,
      eventType: "pos.offline.event.replayed",
      eventSource: "OFFLINE_POS",
      idempotencyKey: `offline-event:${input.event.id}:replayed`,
      actorId: input.context.userId,
      locationId: input.event.locationId,
      registerId: input.event.terminalId,
      deviceId: input.event.deviceId,
      sourceType: "POS_SALE",
      sourceId: input.result.saleId ?? input.event.id,
      postingBatchId: input.result.postingBatchId ?? undefined,
      payloadHash: input.event.payloadHash,
      payload: safeJson({
        offlineEventId: input.event.id,
        salesOrderId: input.result.saleId,
        orderNumber: input.result.orderNumber,
        postingBatchId: input.result.postingBatchId,
        fiscalDocumentId: input.result.fiscalDocumentId,
        fiscalDocumentStatus: input.result.fiscalDocumentStatus,
        legalDeliveryBlocked: input.result.legalDeliveryBlocked,
        documentHash,
      }),
      outboxMessages: [
        {
          channel: "SYNC_ACK",
          eventName: "pos.offline.event.replayed",
          destination: input.event.deviceId,
          payload: {
            offlineEventId: input.event.id,
            status: "REPLAYED",
            salesOrderId: input.result.saleId,
            orderNumber: input.result.orderNumber,
          },
        },
      ],
    })

    await tx.pOSOfflineEvent.update({
      where: { id: input.event.id },
      data: {
        status: "REPLAYED",
        postingBatchId: input.result.postingBatchId,
        documentHash,
        blockerCode: null,
        blockerMessage: null,
        metadata: mergeMetadata(input.event.metadata, replayMetadata({
          result: input.result,
          receipt: input.receipt,
          documentHash,
        })),
      },
    })

    await tx.auditLog.create({
      data: {
        entityType: "POSOfflineEvent",
        entityId: input.event.id,
        action: "POS_OFFLINE_SALE_REPLAYED",
        organizationId: input.context.organizationId,
        userId: input.context.userId,
        changes: safeJson({
          status: "REPLAYED",
          salesOrderId: input.result.saleId,
          orderNumber: input.result.orderNumber,
          postingBatchId: input.result.postingBatchId,
          fiscalDocumentId: input.result.fiscalDocumentId,
          fiscalDocumentStatus: input.result.fiscalDocumentStatus,
        }),
      },
    })

    await refreshCertificate(tx, {
      organizationId: input.context.organizationId,
      deviceId: input.event.deviceId,
      terminalId: input.event.terminalId,
      locationId: input.event.locationId,
      lastSequence: input.event.device.lastSequence,
      acceptedCount: 0,
      conflictCount: 0,
    })
  })

  return input.result
}

async function blockOfflineSaleReplay(input: {
  context: { organizationId: string; userId: string }
  event: Awaited<ReturnType<typeof loadOfflineSaleReplayEvent>>
  blockerCode: string
  blockerMessage: string
  severity?: "HIGH" | "CRITICAL"
}) {
  const result = blockedReplayResult({
    offlineEventId: input.event.id,
    blockerCode: input.blockerCode,
    blockerMessage: input.blockerMessage,
  })

  await db.$transaction(async (tx) => {
    const conflict = await createConflict(tx, {
      organizationId: input.context.organizationId,
      deviceId: input.event.deviceId,
      eventId: input.event.id,
      syncBatchId: input.event.syncBatchId,
      conflictType: "UNPOSTED_ACCEPTED_EVENT",
      severity: input.severity ?? "HIGH",
      actualSequence: input.event.deviceSeq,
      incomingPayloadHash: input.event.payloadHash,
      message: input.blockerMessage,
      metadata: {
        blockerCode: input.blockerCode,
        offlineEventStatus: input.event.status,
      },
    })

    await tx.pOSOfflineEvent.update({
      where: { id: input.event.id },
      data: {
        status: "BLOCKED",
        blockerCode: input.blockerCode,
        blockerMessage: input.blockerMessage,
        metadata: mergeMetadata(input.event.metadata, {
          offlineReplay: {
            status: "BLOCKED",
            blockerCode: input.blockerCode,
            blockerMessage: input.blockerMessage,
            conflictId: conflict.id,
            blockedAt: new Date().toISOString(),
          },
        }),
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: input.context.organizationId,
      eventType: "pos.offline.replay.blocked",
      eventSource: "OFFLINE_POS",
      idempotencyKey: `offline-event:${input.event.id}:replay-blocked:${input.blockerCode}`,
      actorId: input.context.userId,
      locationId: input.event.locationId,
      registerId: input.event.terminalId,
      deviceId: input.event.deviceId,
      sourceId: input.event.id,
      payloadHash: input.event.payloadHash,
      payload: safeJson({
        offlineEventId: input.event.id,
        blockerCode: input.blockerCode,
        blockerMessage: input.blockerMessage,
        conflictId: conflict.id,
      }),
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "pos.offline.replay.blocked",
          destination: "manager",
          payload: {
            offlineEventId: input.event.id,
            blockerCode: input.blockerCode,
            conflictId: conflict.id,
          },
        },
        {
          channel: "NOTIFICATION",
          eventName: "pos.offline.sync.certification_blocked",
          destination: "accountant",
          payload: {
            offlineEventId: input.event.id,
            blockerCode: input.blockerCode,
          },
        },
      ],
    })

    await tx.auditLog.create({
      data: {
        entityType: "POSOfflineEvent",
        entityId: input.event.id,
        action: "POS_OFFLINE_SALE_REPLAY_BLOCKED",
        organizationId: input.context.organizationId,
        userId: input.context.userId,
        changes: safeJson({
          status: "BLOCKED",
          blockerCode: input.blockerCode,
          conflictId: conflict.id,
        }),
      },
    })

    await refreshCertificate(tx, {
      organizationId: input.context.organizationId,
      deviceId: input.event.deviceId,
      terminalId: input.event.terminalId,
      locationId: input.event.locationId,
      lastSequence: input.event.device.lastSequence,
      acceptedCount: 0,
      conflictCount: 1,
    })
  })

  return result
}

export async function replayPendingOfflineSaleEnvelope(input: UserScoped<ReplayOfflineSaleEnvelopeInput>) {
  const parsed = replayOfflineSaleEnvelopeSchema.parse(input)
  const event = await loadOfflineSaleReplayEvent({
    organizationId: input.organizationId,
    offlineEventId: parsed.offlineEventId,
  })

  if (event.status === "REPLAYED" || event.status === "DUPLICATE_REPLAY") {
    return replayResultFromEventMetadata(event)
  }

  if (event.status === "BLOCKED") {
    return blockedReplayResult({
      offlineEventId: event.id,
      blockerCode: event.blockerCode ?? "OFFLINE_REPLAY_BLOCKED",
      blockerMessage: event.blockerMessage ?? "Offline sale replay is blocked.",
    })
  }

  if (event.status !== "PENDING_REPLAY") {
    throw new BusinessRuleError("Only PENDING_REPLAY offline sale envelopes can be converted into POS finalization.")
  }

  const computedPayloadHash = hashBusinessPayload(event.payload)
  if (computedPayloadHash !== event.payloadHash) {
    return blockOfflineSaleReplay({
      context: { organizationId: input.organizationId, userId: input.userId },
      event,
      blockerCode: "OFFLINE_REPLAY_PAYLOAD_HASH_MISMATCH",
      blockerMessage: "Accepted offline sale payload no longer matches its stored hash evidence.",
      severity: "CRITICAL",
    })
  }

  let commitInput: CommitSaleInput
  try {
    commitInput = extractCommitSalePayload(event.payload)
    assertReplayScope(event, commitInput)
  } catch (error) {
    return blockOfflineSaleReplay({
      context: { organizationId: input.organizationId, userId: input.userId },
      event,
      blockerCode: error instanceof BusinessRuleError
        ? "OFFLINE_REPLAY_SCOPE_MISMATCH"
        : "OFFLINE_REPLAY_PAYLOAD_INVALID",
      blockerMessage: safeErrorMessage(error),
      severity: "HIGH",
    })
  }

  const completed = await findCompletedReplayOutcome({
    organizationId: input.organizationId,
    event,
    commitInput,
  })
  if (completed) {
    return markOfflineSaleReplayed({
      context: { organizationId: input.organizationId, userId: input.userId },
      event,
      receipt: completed.receipt,
      result: replayResultFromReceipt({
        offlineEventId: event.id,
        saleId: completed.saleId,
        orderNumber: completed.orderNumber,
        postingBatchId: completed.postingBatchId,
        receipt: completed.receipt,
        duplicate: true,
      }),
    })
  }

  try {
    const committed = await commitPOSSale({
      ...commitInput,
      organizationId: input.organizationId,
      userId: input.userId,
    })

    return markOfflineSaleReplayed({
      context: { organizationId: input.organizationId, userId: input.userId },
      event,
      receipt: committed.receipt,
      result: replayResultFromReceipt({
        offlineEventId: event.id,
        saleId: committed.saleId,
        orderNumber: committed.orderNumber,
        postingBatchId: committed.accountingMovements.saleJournalEntry.postingBatchId,
        receipt: committed.receipt,
      }),
    })
  } catch (error) {
    const completedAfterRetry = await findCompletedReplayOutcome({
      organizationId: input.organizationId,
      event,
      commitInput,
    })

    if (completedAfterRetry) {
      return markOfflineSaleReplayed({
        context: { organizationId: input.organizationId, userId: input.userId },
        event,
        receipt: completedAfterRetry.receipt,
        result: replayResultFromReceipt({
          offlineEventId: event.id,
          saleId: completedAfterRetry.saleId,
          orderNumber: completedAfterRetry.orderNumber,
          postingBatchId: completedAfterRetry.postingBatchId,
          receipt: completedAfterRetry.receipt,
          duplicate: true,
        }),
      })
    }

    return blockOfflineSaleReplay({
      context: { organizationId: input.organizationId, userId: input.userId },
      event,
      blockerCode: replayBlockerCode(error),
      blockerMessage: safeErrorMessage(error),
      severity: "HIGH",
    })
  }
}

async function ingestBatchInTx(
  tx: OfflineTx,
  parsed: ParsedIngestOfflineSyncBatchInput,
  context: { organizationId: string; userId: string },
): Promise<OfflineSyncBatchResult> {
  await assertTerminalScope(tx, {
    organizationId: context.organizationId,
    terminalId: parsed.terminalId,
    locationId: parsed.locationId,
  })

  const device = await tx.pOSOfflineDevice.findFirst({
    where: {
      id: parsed.deviceId,
      organizationId: context.organizationId,
      terminalId: parsed.terminalId,
      locationId: parsed.locationId,
    },
  })

  if (!device) {
    throw new NotFoundError("Offline POS device is not enrolled for this terminal.")
  }

  const events = orderedEvents(parsed.events)
  const batchPayloadHash = parsed.payloadHash ?? hashBusinessPayload(events)
  const firstSequence = events[0]?.deviceSeq ?? null
  const lastSequence = events[events.length - 1]?.deviceSeq ?? null

  const batch = await tx.pOSOfflineSyncBatch.create({
    data: {
      organizationId: context.organizationId,
      deviceId: device.id,
      terminalId: parsed.terminalId,
      locationId: parsed.locationId,
      actorId: context.userId,
      status: "PROCESSING",
      firstSequence,
      lastSequence,
      eventCount: events.length,
      payloadHash: batchPayloadHash,
      metadata: parsed.metadata === undefined ? undefined : safeJson(parsed.metadata),
    },
  })

  let expectedSequence = device.lastSequence + 1
  let highWaterHash = device.highWaterHash ?? null
  let acceptedCount = 0
  let duplicateCount = 0
  let conflictCount = 0
  const conflicts: OfflineSyncConflictDTO[] = []

  if (device.status !== "ACTIVE") {
    const conflict = await createConflict(tx, {
      organizationId: context.organizationId,
      deviceId: device.id,
      syncBatchId: batch.id,
      conflictType: "DEVICE_REVOKED",
      severity: "CRITICAL",
      expectedSequence,
      actualSequence: firstSequence,
      message: "Offline POS device is not active and cannot sync.",
      metadata: { deviceStatus: device.status },
    })
    conflicts.push(toConflictDTO(conflict))
    conflictCount += 1

    const certificate = await refreshCertificate(tx, {
      organizationId: context.organizationId,
      deviceId: device.id,
      terminalId: parsed.terminalId,
      locationId: parsed.locationId,
      lastSequence: device.lastSequence,
      acceptedCount,
      conflictCount,
    })

    await tx.pOSOfflineSyncBatch.update({
      where: { id: batch.id },
      data: { status: "REJECTED", conflictCount, processedAt: new Date() },
    })

    await recordOfflineConflictBusinessEvent(tx, {
      organizationId: context.organizationId,
      userId: context.userId,
      deviceId: device.id,
      terminalId: parsed.terminalId,
      locationId: parsed.locationId,
      syncBatchId: batch.id,
      conflictCount,
    })

    return {
      batchId: batch.id,
      status: "REJECTED",
      acceptedCount,
      duplicateCount,
      conflictCount,
      firstSequence,
      lastSequence,
      device: toDeviceDTO(device),
      conflicts,
      certificate: toCertificateDTO(certificate),
      notifications: conflictNotification(conflictCount),
    }
  }

  for (const event of events) {
    const computedPayloadHash = hashBusinessPayload(event.payload)

    if (event.payloadHash && event.payloadHash !== computedPayloadHash) {
      const conflict = await createConflict(tx, {
        organizationId: context.organizationId,
        deviceId: device.id,
        syncBatchId: batch.id,
        conflictType: "SIGNATURE_INVALID",
        severity: "CRITICAL",
        expectedSequence,
        actualSequence: event.deviceSeq,
        incomingPayloadHash: event.payloadHash,
        actualHash: computedPayloadHash,
        message: "Offline event payload hash does not match the submitted payload.",
      })
      conflicts.push(toConflictDTO(conflict))
      conflictCount += 1
      continue
    }

    const expectedEntryHash = buildOfflineEventEntryHash({
      deviceId: device.id,
      deviceSeq: event.deviceSeq,
      eventType: event.eventType,
      schemaVersion: event.schemaVersion,
      payloadHash: computedPayloadHash,
      prevHash: event.prevHash,
    })

    const existingByIdempotency = await tx.pOSOfflineEvent.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: context.organizationId,
          idempotencyKey: event.idempotencyKey,
        },
      },
    })

    if (existingByIdempotency) {
      if (
        existingByIdempotency.payloadHash === computedPayloadHash &&
        existingByIdempotency.entryHash === event.entryHash
      ) {
        duplicateCount += 1
        continue
      }

      const conflict = await createConflict(tx, {
        organizationId: context.organizationId,
        deviceId: device.id,
        eventId: existingByIdempotency.id,
        syncBatchId: batch.id,
        conflictType: "IDEMPOTENCY_PAYLOAD_MISMATCH",
        severity: "CRITICAL",
        expectedSequence: existingByIdempotency.deviceSeq,
        actualSequence: event.deviceSeq,
        existingPayloadHash: existingByIdempotency.payloadHash,
        incomingPayloadHash: computedPayloadHash,
        message: "Offline idempotency key was reused with a different payload.",
      })
      conflicts.push(toConflictDTO(conflict))
      conflictCount += 1
      continue
    }

    const existingBySequence = await tx.pOSOfflineEvent.findUnique({
      where: {
        organizationId_deviceId_deviceSeq: {
          organizationId: context.organizationId,
          deviceId: device.id,
          deviceSeq: event.deviceSeq,
        },
      },
    })

    if (existingBySequence) {
      if (
        existingBySequence.payloadHash === computedPayloadHash &&
        existingBySequence.entryHash === event.entryHash
      ) {
        duplicateCount += 1
        continue
      }

      const conflict = await createConflict(tx, {
        organizationId: context.organizationId,
        deviceId: device.id,
        eventId: existingBySequence.id,
        syncBatchId: batch.id,
        conflictType: "SEQUENCE_DUPLICATE_MISMATCH",
        severity: "CRITICAL",
        expectedSequence: existingBySequence.deviceSeq,
        actualSequence: event.deviceSeq,
        expectedHash: existingBySequence.entryHash,
        actualHash: event.entryHash,
        existingPayloadHash: existingBySequence.payloadHash,
        incomingPayloadHash: computedPayloadHash,
        message: "Offline device sequence was reused with different event evidence.",
      })
      conflicts.push(toConflictDTO(conflict))
      conflictCount += 1
      continue
    }

    let conflictType: string | null = null
    let conflictMessage: string | null = null

    if (event.deviceSeq !== expectedSequence) {
      conflictType = "SEQUENCE_GAP"
      conflictMessage = `Expected device sequence ${expectedSequence}, received ${event.deviceSeq}.`
    } else if ((event.prevHash ?? null) !== highWaterHash) {
      conflictType = "HASH_CHAIN_FORK"
      conflictMessage = "Offline event previous hash does not match the server high-water mark."
    } else if (event.entryHash !== expectedEntryHash) {
      conflictType = "HASH_CHAIN_FORK"
      conflictMessage = "Offline event entry hash does not match the canonical event envelope."
    }

    const offlineEvent = await tx.pOSOfflineEvent.create({
      data: {
        organizationId: context.organizationId,
        deviceId: device.id,
        terminalId: parsed.terminalId,
        locationId: parsed.locationId,
        sessionId: parsed.sessionId ?? null,
        syncBatchId: batch.id,
        eventType: event.eventType,
        schemaVersion: event.schemaVersion,
        deviceSeq: event.deviceSeq,
        idempotencyKey: event.idempotencyKey,
        provisionalReference: event.provisionalReference,
        payloadHash: computedPayloadHash,
        prevHash: event.prevHash ?? null,
        entryHash: event.entryHash,
        signature: event.signature,
        capturedAtDevice: event.capturedAtDevice,
        status: conflictType ? "QUARANTINED" : "PENDING_REPLAY",
        payload: safeJson(event.payload),
        policySnapshotHash: event.policySnapshotHash,
        sourceSnapshotHash: event.sourceSnapshotHash,
        blockerCode: conflictType ?? "UNPOSTED_ACCEPTED_EVENT",
        blockerMessage: conflictMessage ?? "Accepted offline event is pending POS replay and server certification.",
        metadata: event.metadata === undefined ? undefined : safeJson(event.metadata),
      },
    })

    if (conflictType) {
      const conflict = await createConflict(tx, {
        organizationId: context.organizationId,
        deviceId: device.id,
        eventId: offlineEvent.id,
        syncBatchId: batch.id,
        conflictType,
        severity: "CRITICAL",
        expectedSequence,
        actualSequence: event.deviceSeq,
        expectedHash: conflictType === "HASH_CHAIN_FORK" ? highWaterHash : expectedEntryHash,
        actualHash: conflictType === "HASH_CHAIN_FORK" ? event.prevHash ?? event.entryHash : event.entryHash,
        incomingPayloadHash: computedPayloadHash,
        message: conflictMessage ?? "Offline sync conflict detected.",
      })
      conflicts.push(toConflictDTO(conflict))
      conflictCount += 1
      continue
    }

    await recordAcceptedOfflineEvent(tx, {
      organizationId: context.organizationId,
      userId: context.userId,
      deviceId: device.id,
      terminalId: parsed.terminalId,
      locationId: parsed.locationId,
      offlineEventId: offlineEvent.id,
      event,
      payloadHash: computedPayloadHash,
      entryHash: event.entryHash,
    })

    acceptedCount += 1
    expectedSequence += 1
    highWaterHash = event.entryHash
  }

  const updatedDevice = await tx.pOSOfflineDevice.update({
    where: { id: device.id },
    data: {
      lastSequence: expectedSequence - 1,
      highWaterHash,
      lastSeenAt: new Date(),
    },
  })

  const pendingReplayCount = await tx.pOSOfflineEvent.count({
    where: {
      organizationId: context.organizationId,
      deviceId: device.id,
      status: "PENDING_REPLAY",
    },
  })

  const certificate = await refreshCertificate(tx, {
    organizationId: context.organizationId,
    deviceId: device.id,
    terminalId: parsed.terminalId,
    locationId: parsed.locationId,
    lastSequence: updatedDevice.lastSequence,
    acceptedCount,
    conflictCount,
    pendingReplayCount,
  })

  const status = sequenceStatus({ acceptedCount, conflictCount })

  await tx.pOSOfflineSyncBatch.update({
    where: { id: batch.id },
    data: {
      status,
      acceptedCount,
      duplicateCount,
      conflictCount,
      processedAt: new Date(),
    },
  })

  await recordOfflineConflictBusinessEvent(tx, {
    organizationId: context.organizationId,
    userId: context.userId,
    deviceId: device.id,
    terminalId: parsed.terminalId,
    locationId: parsed.locationId,
    syncBatchId: batch.id,
    conflictCount,
  })

  await tx.auditLog.create({
    data: {
      entityType: "POSOfflineSyncBatch",
      entityId: batch.id,
      action: "POS_OFFLINE_SYNC_BATCH_INGESTED",
      organizationId: context.organizationId,
      userId: context.userId,
      changes: safeJson({
        deviceId: device.id,
        status,
        acceptedCount,
        duplicateCount,
        conflictCount,
        firstSequence,
        lastSequence,
      }),
    },
  })

  return {
    batchId: batch.id,
    status,
    acceptedCount,
    duplicateCount,
    conflictCount,
    firstSequence,
    lastSequence,
    device: toDeviceDTO(updatedDevice),
    conflicts,
    certificate: toCertificateDTO(certificate),
    notifications: [
      ...acceptedNotification(acceptedCount),
      ...conflictNotification(conflictCount),
    ],
  }
}

async function refreshCertificate(
  tx: OfflineTx,
  input: {
    organizationId: string
    deviceId: string
    terminalId: string
    locationId: string
    lastSequence: number
    acceptedCount: number
    conflictCount: number
    pendingReplayCount?: number
  },
) {
  const pendingReplayCount = input.pendingReplayCount ?? (await tx.pOSOfflineEvent.count({
    where: {
      organizationId: input.organizationId,
      deviceId: input.deviceId,
      status: "PENDING_REPLAY",
    },
  }))
  const persistedOpenConflictCount = await tx.pOSOfflineSyncConflict.count({
    where: {
      organizationId: input.organizationId,
      deviceId: input.deviceId,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    },
  })
  const openConflictCount = Math.max(input.conflictCount, persistedOpenConflictCount)
  const closeBlocker = openConflictCount > 0 || pendingReplayCount > 0
  const blockerCode = openConflictCount > 0
    ? "OFFLINE_SYNC_CONFLICT"
    : pendingReplayCount > 0
      ? "UNPOSTED_ACCEPTED_EVENT"
      : null
  const blockerMessage = openConflictCount > 0
    ? "Offline sync conflicts must be resolved before close/certification."
    : pendingReplayCount > 0
      ? "Accepted offline events are pending POS replay and certification."
      : null
  const certificateHash = sha256(stableJsonStringify({
    deviceId: input.deviceId,
    lastSequence: input.lastSequence,
    acceptedCount: input.acceptedCount,
    openConflictCount,
    pendingReplayCount,
    closeBlocker,
  }))

  return tx.pOSOfflineSyncCertificate.upsert({
    where: {
      organizationId_deviceId_certificationScope: {
        organizationId: input.organizationId,
        deviceId: input.deviceId,
        certificationScope: "DEVICE",
      },
    },
    create: {
      organizationId: input.organizationId,
      deviceId: input.deviceId,
      terminalId: input.terminalId,
      locationId: input.locationId,
      status: closeBlocker ? "BLOCKED" : "OPEN",
      lastCertifiedSequence: closeBlocker ? 0 : input.lastSequence,
      eventCount: input.acceptedCount + input.conflictCount,
      acceptedCount: input.acceptedCount,
      conflictCount: input.conflictCount,
      pendingReplayCount,
      closeBlocker,
      blockerCode,
      blockerMessage,
      certificateHash,
    },
    update: {
      terminalId: input.terminalId,
      locationId: input.locationId,
      status: closeBlocker ? "BLOCKED" : "OPEN",
      lastCertifiedSequence: closeBlocker ? 0 : input.lastSequence,
      eventCount: { increment: input.acceptedCount + input.conflictCount },
      acceptedCount: { increment: input.acceptedCount },
      conflictCount: { increment: input.conflictCount },
      pendingReplayCount,
      closeBlocker,
      blockerCode,
      blockerMessage,
      certificateHash,
    },
  })
}

export async function ingestOfflineSyncBatch(input: UserScoped<IngestOfflineSyncBatchInput>) {
  const parsed = ingestOfflineSyncBatchSchema.parse(input)

  const seenKeys = new Set<string>()
  for (const event of parsed.events) {
    if (seenKeys.has(event.idempotencyKey)) {
      throw new ConflictError("IDEMPOTENCY_CONFLICT: duplicate idempotency key in the same sync batch.")
    }
    seenKeys.add(event.idempotencyKey)
  }

  return db.$transaction((tx) =>
    ingestBatchInTx(tx, parsed, {
      organizationId: input.organizationId,
      userId: input.userId,
    }),
  )
}

export async function getOfflineSyncDashboard(input: OrgScoped<OfflineSyncDashboardInput>) {
  const parsed = offlineSyncDashboardInputSchema.parse(input)
  const where = {
    organizationId: input.organizationId,
    ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
    ...(parsed.terminalId ? { terminalId: parsed.terminalId } : {}),
  }

  const [
    devices,
    pendingEventCount,
    openConflictCount,
    closeBlockerCount,
    conflicts,
    certificates,
  ] = await Promise.all([
    db.pOSOfflineDevice.findMany({
      where,
      orderBy: [{ lastSeenAt: "desc" }, { enrolledAt: "desc" }],
      take: parsed.limit,
    }),
    db.pOSOfflineEvent.count({
      where: {
        ...where,
        status: { in: ["PENDING_REPLAY", "RECORDED", "BLOCKED"] },
      },
    }),
    db.pOSOfflineSyncConflict.count({
      where: {
        organizationId: input.organizationId,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
        ...(parsed.locationId || parsed.terminalId
          ? {
              device: {
                ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
                ...(parsed.terminalId ? { terminalId: parsed.terminalId } : {}),
              },
            }
          : {}),
      },
    }),
    db.pOSOfflineSyncCertificate.count({
      where: {
        organizationId: input.organizationId,
        closeBlocker: true,
        ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
        ...(parsed.terminalId ? { terminalId: parsed.terminalId } : {}),
      },
    }),
    db.pOSOfflineSyncConflict.findMany({
      where: {
        organizationId: input.organizationId,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
        ...(parsed.locationId || parsed.terminalId
          ? {
              device: {
                ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
                ...(parsed.terminalId ? { terminalId: parsed.terminalId } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: parsed.limit,
    }),
    db.pOSOfflineSyncCertificate.findMany({
      where: {
        organizationId: input.organizationId,
        ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
        ...(parsed.terminalId ? { terminalId: parsed.terminalId } : {}),
      },
      orderBy: [{ closeBlocker: "desc" }, { updatedAt: "desc" }],
      take: parsed.limit,
    }),
  ])

  const certificateDTOs = certificates.map(toCertificateDTO)
  const blockers = certificateDTOs
    .filter((certificate) => certificate.closeBlocker)
    .map((certificate) => ({
      code: certificate.blockerCode ?? "OFFLINE_SYNC_BLOCKED",
      severity: certificate.conflictCount > 0 ? "critical" as const : "warning" as const,
      message: certificate.blockerMessage ?? "Offline POS sync requires certification review.",
      deviceId: certificate.deviceId,
      terminalId: certificate.terminalId,
    }))

  return {
    asOf: new Date().toISOString(),
    summary: {
      deviceCount: devices.length,
      pendingEventCount,
      openConflictCount,
      closeBlockerCount,
    },
    devices: devices.map(toDeviceDTO),
    conflicts: conflicts.map(toConflictDTO),
    certificates: certificateDTOs,
    blockers,
  } satisfies OfflineSyncDashboardData
}
