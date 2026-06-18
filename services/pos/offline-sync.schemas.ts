import { z } from "zod"

export const offlineDeviceStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "REVOKED", "ROTATING"])

export const offlineEventTypeSchema = z.enum([
  "OFFLINE_SALE_CAPTURED",
  "OFFLINE_TENDER_CLAIMED",
  "OFFLINE_RECEIPT_PROVISIONED",
  "OFFLINE_DRAWER_EVIDENCE",
  "OFFLINE_SESSION_EVIDENCE",
])

export const offlineEventStatusSchema = z.enum([
  "PENDING_REPLAY",
  "RECORDED",
  "DUPLICATE_REPLAY",
  "CONFLICT",
  "QUARANTINED",
  "REPLAYED",
  "BLOCKED",
  "REJECTED",
])

export const offlineConflictTypeSchema = z.enum([
  "IDEMPOTENCY_PAYLOAD_MISMATCH",
  "SEQUENCE_GAP",
  "SEQUENCE_DUPLICATE_MISMATCH",
  "HASH_CHAIN_FORK",
  "DEVICE_REVOKED",
  "SIGNATURE_INVALID",
  "STALE_REFERENCE_SNAPSHOT",
  "PROVISIONAL_RECEIPT_PENDING",
  "UNPOSTED_ACCEPTED_EVENT",
  "UNRECONCILED_TENDER_CLAIM",
])

export const registerOfflineDeviceSchema = z.object({
  terminalId: z.string().trim().min(1),
  locationId: z.string().trim().min(1),
  deviceLabel: z.string().trim().min(1).max(120),
  deviceFingerprintHash: z.string().trim().min(24).max(256),
  publicKeyFingerprint: z.string().trim().min(12).max(256).optional(),
  metadata: z.unknown().optional(),
})

export const offlineSyncEventInputSchema = z.object({
  eventType: offlineEventTypeSchema,
  schemaVersion: z.number().int().positive().default(1),
  deviceSeq: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(1).max(240),
  provisionalReference: z.string().trim().min(1).max(160).optional(),
  payloadHash: z.string().trim().min(32).max(256).optional(),
  prevHash: z.string().trim().min(32).max(256).nullable().optional(),
  entryHash: z.string().trim().min(32).max(256),
  signature: z.string().trim().min(16).max(2048).optional(),
  capturedAtDevice: z.coerce.date(),
  payload: z.unknown(),
  policySnapshotHash: z.string().trim().min(16).max(256).optional(),
  sourceSnapshotHash: z.string().trim().min(16).max(256).optional(),
  metadata: z.unknown().optional(),
})

export const ingestOfflineSyncBatchSchema = z.object({
  deviceId: z.string().trim().min(1),
  terminalId: z.string().trim().min(1),
  locationId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1).optional(),
  batchIdempotencyKey: z.string().trim().min(1).max(240).optional(),
  events: z.array(offlineSyncEventInputSchema).min(1).max(250),
  payloadHash: z.string().trim().min(32).max(256).optional(),
  metadata: z.unknown().optional(),
})

export const offlineSyncDashboardInputSchema = z.object({
  locationId: z.string().trim().min(1).optional(),
  terminalId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(100).default(25),
})

export const replayOfflineSaleEnvelopeSchema = z.object({
  offlineEventId: z.string().trim().min(1),
})

export type RegisterOfflineDeviceInput = z.input<typeof registerOfflineDeviceSchema>
export type ParsedRegisterOfflineDeviceInput = z.output<typeof registerOfflineDeviceSchema>
export type IngestOfflineSyncBatchInput = z.input<typeof ingestOfflineSyncBatchSchema>
export type ParsedIngestOfflineSyncBatchInput = z.output<typeof ingestOfflineSyncBatchSchema>
export type OfflineSyncEventInput = z.output<typeof offlineSyncEventInputSchema>
export type OfflineSyncDashboardInput = z.input<typeof offlineSyncDashboardInputSchema>
export type ReplayOfflineSaleEnvelopeInput = z.input<typeof replayOfflineSaleEnvelopeSchema>
