export type OfflineLocalEventType =
  | "OFFLINE_SALE_CAPTURED"
  | "OFFLINE_TENDER_CLAIMED"
  | "OFFLINE_RECEIPT_PROVISIONED"
  | "OFFLINE_DRAWER_EVIDENCE"
  | "OFFLINE_SESSION_EVIDENCE"

export type OfflineLocalQueueStatus = "QUEUED" | "SYNCING" | "SYNCED" | "CONFLICT" | "FAILED"

export type OfflineLocalQueueEvent = {
  eventType: OfflineLocalEventType
  schemaVersion: number
  deviceSeq: number
  idempotencyKey: string
  provisionalReference?: string
  payloadHash: string
  prevHash?: string | null
  entryHash: string
  signature?: string
  capturedAtDevice: string
  payload: unknown
  policySnapshotHash?: string
  sourceSnapshotHash?: string
  metadata?: unknown
}

export type OfflineLocalQueueEntry = {
  queueId: string
  event: OfflineLocalQueueEvent
  status: OfflineLocalQueueStatus
  queuedAt: string
  updatedAt: string
  syncAttempts: number
  lastSyncError?: string
}

export type OfflineLocalQueueState = {
  queueVersion: 1
  organizationKey: string
  deviceId: string
  terminalId: string
  locationId: string
  sessionId?: string
  nextSequence: number
  highWaterHash: string | null
  createdAt: string
  updatedAt: string
  entries: OfflineLocalQueueEntry[]
}

export type OfflineLocalQueueConfig = {
  organizationKey: string
  deviceId: string
  terminalId: string
  locationId: string
  sessionId?: string
  storage?: Storage
  now?: () => Date
}

export type EnqueueOfflineLocalEventInput = {
  eventType: OfflineLocalEventType
  payload: unknown
  idempotencyKey?: string
  provisionalReference?: string
  policySnapshotHash?: string
  sourceSnapshotHash?: string
  signature?: string
  metadata?: unknown
  allowFinalFiscalNumbering?: boolean
}

export type OfflineSyncBatchEnvelope = {
  deviceId: string
  terminalId: string
  locationId: string
  sessionId?: string
  events: OfflineLocalQueueEvent[]
  metadata: {
    source: "browser_offline_queue"
    queueVersion: 1
    queuedEventCount: number
    firstQueueId: string | null
    lastQueueId: string | null
  }
}

const QUEUE_PREFIX = "aqstoqflow:pos-offline-queue:v1"
const FINAL_FISCAL_KEYS = new Set([
  "authorityReference",
  "certifiedAt",
  "finalFiscalNumber",
  "fiscalNumber",
  "legalNumber",
])

function normalizeJson(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeJson)
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeJson((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}

export function stableOfflineJson(value: unknown) {
  return JSON.stringify(normalizeJson(value))
}

function byteToHex(byte: number) {
  return byte.toString(16).padStart(2, "0")
}

export async function sha256Hex(value: string) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error("Web Crypto is required to hash offline POS queue evidence.")
  }

  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(byteToHex).join("")
}

export function offlineQueueStorageKey(config: Pick<OfflineLocalQueueConfig, "organizationKey" | "deviceId">) {
  return `${QUEUE_PREFIX}:${config.organizationKey}:${config.deviceId}`
}

function resolveStorage(storage?: Storage) {
  const resolved = storage ?? globalThis.localStorage
  if (!resolved) {
    throw new Error("Local storage is required to queue offline POS events.")
  }
  return resolved
}

function nowIso(config: Pick<OfflineLocalQueueConfig, "now">) {
  return (config.now?.() ?? new Date()).toISOString()
}

function newQueueState(config: OfflineLocalQueueConfig): OfflineLocalQueueState {
  const now = nowIso(config)
  return {
    queueVersion: 1,
    organizationKey: config.organizationKey,
    deviceId: config.deviceId,
    terminalId: config.terminalId,
    locationId: config.locationId,
    sessionId: config.sessionId,
    nextSequence: 1,
    highWaterHash: null,
    createdAt: now,
    updatedAt: now,
    entries: [],
  }
}

function isState(value: unknown): value is OfflineLocalQueueState {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as OfflineLocalQueueState).queueVersion === 1 &&
      Array.isArray((value as OfflineLocalQueueState).entries),
  )
}

export function loadOfflineLocalQueue(config: OfflineLocalQueueConfig): OfflineLocalQueueState {
  const storage = resolveStorage(config.storage)
  const stored = storage.getItem(offlineQueueStorageKey(config))
  if (!stored) return newQueueState(config)

  try {
    const parsed = JSON.parse(stored) as unknown
    if (!isState(parsed)) return newQueueState(config)
    return {
      ...parsed,
      organizationKey: config.organizationKey,
      deviceId: config.deviceId,
      terminalId: config.terminalId,
      locationId: config.locationId,
      sessionId: config.sessionId ?? parsed.sessionId,
    }
  } catch {
    return newQueueState(config)
  }
}

export function saveOfflineLocalQueue(config: OfflineLocalQueueConfig, state: OfflineLocalQueueState) {
  resolveStorage(config.storage).setItem(offlineQueueStorageKey(config), stableOfflineJson(state))
  return state
}

function containsFinalFiscalClaim(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  if (Array.isArray(value)) return value.some(containsFinalFiscalClaim)

  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (FINAL_FISCAL_KEYS.has(key) && nested !== null && nested !== undefined && nested !== "") {
      return true
    }
    return containsFinalFiscalClaim(nested)
  })
}

function assertProvisionalOnly(input: EnqueueOfflineLocalEventInput) {
  if (input.allowFinalFiscalNumbering) return
  if (!containsFinalFiscalClaim(input.payload)) return

  throw new Error("Offline POS queue only permits provisional receipt evidence until country policy allows final fiscal numbering.")
}

export async function buildOfflineLocalEventEntryHash(input: {
  deviceId: string
  deviceSeq: number
  eventType: string
  schemaVersion: number
  payloadHash: string
  prevHash?: string | null
}) {
  return sha256Hex([
    input.deviceId,
    String(input.deviceSeq),
    input.eventType,
    String(input.schemaVersion),
    input.payloadHash,
    input.prevHash ?? "",
  ].join("|"))
}

export async function enqueueOfflineLocalEvent(
  config: OfflineLocalQueueConfig,
  input: EnqueueOfflineLocalEventInput,
) {
  assertProvisionalOnly(input)

  const state = loadOfflineLocalQueue(config)
  const queuedAt = nowIso(config)
  const deviceSeq = state.nextSequence
  const payloadHash = await sha256Hex(stableOfflineJson(input.payload))
  const entryHash = await buildOfflineLocalEventEntryHash({
    deviceId: config.deviceId,
    deviceSeq,
    eventType: input.eventType,
    schemaVersion: 1,
    payloadHash,
    prevHash: state.highWaterHash,
  })
  const queueId = `${config.deviceId}:${deviceSeq}:${entryHash.slice(0, 16)}`
  const event: OfflineLocalQueueEvent = {
    eventType: input.eventType,
    schemaVersion: 1,
    deviceSeq,
    idempotencyKey: input.idempotencyKey ?? queueId,
    provisionalReference: input.provisionalReference,
    payloadHash,
    prevHash: state.highWaterHash,
    entryHash,
    signature: input.signature,
    capturedAtDevice: queuedAt,
    payload: input.payload,
    policySnapshotHash: input.policySnapshotHash,
    sourceSnapshotHash: input.sourceSnapshotHash,
    metadata: {
      ...(input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
        ? input.metadata as Record<string, unknown>
        : {}),
      offlineReceiptPolicy: {
        finalFiscalNumberingPermitted: Boolean(input.allowFinalFiscalNumbering),
        receiptStatus: input.allowFinalFiscalNumbering ? "COUNTRY_POLICY_PERMITTED" : "PROVISIONAL_ONLY",
      },
    },
  }
  const entry: OfflineLocalQueueEntry = {
    queueId,
    event,
    status: "QUEUED",
    queuedAt,
    updatedAt: queuedAt,
    syncAttempts: 0,
  }
  const nextState: OfflineLocalQueueState = {
    ...state,
    nextSequence: deviceSeq + 1,
    highWaterHash: entryHash,
    updatedAt: queuedAt,
    entries: [...state.entries, entry],
  }

  saveOfflineLocalQueue(config, nextState)
  return entry
}

export function offlineLocalQueuePendingEntries(state: OfflineLocalQueueState) {
  return state.entries.filter((entry) => entry.status === "QUEUED" || entry.status === "FAILED")
}

export function buildOfflineSyncBatchEnvelope(
  config: OfflineLocalQueueConfig,
  state = loadOfflineLocalQueue(config),
): OfflineSyncBatchEnvelope | null {
  const pending = offlineLocalQueuePendingEntries(state)
  if (pending.length === 0) return null

  return {
    deviceId: config.deviceId,
    terminalId: config.terminalId,
    locationId: config.locationId,
    sessionId: config.sessionId,
    events: pending.map((entry) => entry.event),
    metadata: {
      source: "browser_offline_queue",
      queueVersion: state.queueVersion,
      queuedEventCount: pending.length,
      firstQueueId: pending[0]?.queueId ?? null,
      lastQueueId: pending[pending.length - 1]?.queueId ?? null,
    },
  }
}

export function markOfflineLocalQueueEntries(
  config: OfflineLocalQueueConfig,
  queueIds: readonly string[],
  status: Extract<OfflineLocalQueueStatus, "SYNCING" | "SYNCED" | "CONFLICT" | "FAILED">,
  error?: string,
) {
  const queueIdSet = new Set(queueIds)
  const state = loadOfflineLocalQueue(config)
  const updatedAt = nowIso(config)
  const nextState: OfflineLocalQueueState = {
    ...state,
    updatedAt,
    entries: state.entries.map((entry) => {
      if (!queueIdSet.has(entry.queueId)) return entry
      return {
        ...entry,
        status,
        updatedAt,
        syncAttempts: status === "SYNCING" ? entry.syncAttempts + 1 : entry.syncAttempts,
        lastSyncError: error,
      }
    }),
  }

  return saveOfflineLocalQueue(config, nextState)
}

export function pruneSyncedOfflineLocalQueue(config: OfflineLocalQueueConfig) {
  const state = loadOfflineLocalQueue(config)
  const nextState: OfflineLocalQueueState = {
    ...state,
    updatedAt: nowIso(config),
    entries: state.entries.filter((entry) => entry.status !== "SYNCED"),
  }

  return saveOfflineLocalQueue(config, nextState)
}
