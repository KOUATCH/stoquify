export type OfflineLocalEventType =
  | "OFFLINE_SALE_CAPTURED"
  | "OFFLINE_TENDER_CLAIMED"
  | "OFFLINE_RECEIPT_PROVISIONED"
  | "OFFLINE_DRAWER_EVIDENCE"
  | "OFFLINE_SESSION_EVIDENCE"

export type OfflineLocalQueueStatus = "QUEUED" | "SYNCING" | "SYNCED" | "CONFLICT" | "FAILED" | "UNCERTAIN"

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
  syncAttemptId?: string
  syncLeaseExpiresAt?: string
  lastServerBatchId?: string
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
  indexedDB?: IDBFactory
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
const DATABASE_NAME = "aqstoqflow-pos-offline-queue"
const QUEUE_STORE = "queues"
export const OFFLINE_SYNC_LEASE_MS = 120_000
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

type StoredQueue = { revision: number; state: OfflineLocalQueueState; legacySnapshot: string | null }

export class OfflineQueueRecoveryError extends Error {
  constructor(message: string) { super(message); this.name = "OfflineQueueRecoveryError" }
}

function recoveryError() {
  return new OfflineQueueRecoveryError("Offline queue quarantined. Existing evidence was retained; manager recovery is required before further capture or sync.")
}

function assertState(value: unknown, config: OfflineLocalQueueConfig): asserts value is OfflineLocalQueueState {
  if (!value || typeof value !== "object") throw recoveryError()
  const state = value as OfflineLocalQueueState
  if (state.queueVersion !== 1 || !Array.isArray(state.entries) ||
      !Number.isSafeInteger(state.nextSequence) || state.nextSequence < 1 ||
      !(state.highWaterHash === null || /^[a-f0-9]{64}$/.test(state.highWaterHash)) ||
      state.organizationKey !== config.organizationKey || state.deviceId !== config.deviceId ||
      state.terminalId !== config.terminalId || state.locationId !== config.locationId) throw recoveryError()
  const ids = new Set<string>()
  const idempotencyKeys = new Set<string>()
  let previous: OfflineLocalQueueEntry | undefined
  for (const entry of state.entries) {
    if (!entry || !entry.event || typeof entry.queueId !== "string" || ids.has(entry.queueId) ||
        !["QUEUED", "SYNCING", "SYNCED", "CONFLICT", "FAILED", "UNCERTAIN"].includes(entry.status) ||
        !Number.isSafeInteger(entry.syncAttempts) || entry.syncAttempts < 0 ||
        !Number.isSafeInteger(entry.event.deviceSeq) || entry.event.deviceSeq < 1 ||
        entry.event.deviceSeq >= state.nextSequence ||
        typeof entry.event.idempotencyKey !== "string" || !entry.event.idempotencyKey ||
        idempotencyKeys.has(entry.event.idempotencyKey) ||
        (previous && (entry.event.deviceSeq <= previous.event.deviceSeq ||
          (entry.event.deviceSeq === previous.event.deviceSeq + 1 && entry.event.prevHash !== previous.event.entryHash)))) throw recoveryError()
    ids.add(entry.queueId)
    idempotencyKeys.add(entry.event.idempotencyKey)
    previous = entry
  }
  if ((state.nextSequence === 1 && (state.entries.length !== 0 || state.highWaterHash !== null)) ||
      (state.nextSequence > 1 && !state.highWaterHash) ||
      (previous && previous.event.deviceSeq === state.nextSequence - 1 && previous.event.entryHash !== state.highWaterHash)) throw recoveryError()
  if (config.sessionId && state.sessionId !== config.sessionId && state.entries.some(entry => entry.status !== "SYNCED")) {
    throw new OfflineQueueRecoveryError("Offline evidence belongs to another cashier session. Resolve that session before capturing or syncing this queue.")
  }
}

async function validateState(state: unknown, config: OfflineLocalQueueConfig): Promise<OfflineLocalQueueState> {
  assertState(state, config)
  for (const entry of state.entries) {
    if (entry.event.payloadHash !== await sha256Hex(stableOfflineJson(entry.event.payload)) ||
        entry.event.entryHash !== await buildOfflineLocalEventEntryHash({ ...entry.event, deviceId: state.deviceId })) throw recoveryError()
  }
  return state
}

function openQueueDatabase(config: OfflineLocalQueueConfig): Promise<IDBDatabase> {
  const factory = config.indexedDB ?? globalThis.indexedDB
  if (!factory) throw new Error("IndexedDB is required for durable offline POS capture on this device.")
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, 1)
    let blocked = false
    request.onupgradeneeded = () => request.result.createObjectStore(QUEUE_STORE)
    request.onerror = () => reject(request.error ?? new Error("Offline queue storage is unavailable."))
    request.onblocked = () => { blocked = true; reject(new Error("Offline queue upgrade is blocked. Close older POS tabs and retry.")) }
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return }
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
  })
}

// Hash outside transactions (IDB auto-commits on yield); acknowledge only after commit.
async function queueTransaction<T>(
  config: OfflineLocalQueueConfig,
  mode: IDBTransactionMode,
  operation: (record: StoredQueue | undefined, store: IDBObjectStore) => T,
): Promise<T> {
  const database = await openQueueDatabase(config)
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = mode === "readwrite"
        ? database.transaction(QUEUE_STORE, mode, { durability: "strict" })
        : database.transaction(QUEUE_STORE, mode)
      if (mode === "readwrite" && transaction.durability !== "strict") {
        transaction.abort()
        reject(new Error("This browser does not support strict offline storage transactions. Capture is unavailable."))
        return
      }
      let value: T
      let failure: unknown
      transaction.oncomplete = () => resolve(value)
      transaction.onerror = () => { /* onabort handles rejection, including quota failures. */ }
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error("Offline queue write did not commit."))
      const store = transaction.objectStore(QUEUE_STORE)
      const request = store.get(offlineQueueStorageKey(config))
      request.onsuccess = () => {
        try { value = operation(request.result as StoredQueue | undefined, store) }
        catch (error) { failure = error; transaction.abort() }
      }
    })
  } finally { database.close() }
}

async function loadRecord(config: OfflineLocalQueueConfig): Promise<StoredQueue> {
  const storage = resolveStorage(config.storage)
  const key = offlineQueueStorageKey(config)
  const markerKey = `${key}:indexeddb-migrated`
  const legacySnapshot = storage.getItem(key)
  let record = await queueTransaction(config, "readonly", value => value)
  if (!record) {
    let state: unknown = newQueueState(config)
    if (legacySnapshot !== null) {
      try { state = JSON.parse(legacySnapshot) as unknown }
      catch { throw recoveryError() }
    }
    const validated = await validateState(state, config)
    record = await queueTransaction(config, "readwrite", (existing, store) => {
      if (existing) return existing
      // Check after rereading inside the transaction: another tab may have just initialized it.
      if (storage.getItem(markerKey)) throw recoveryError()
      if (storage.getItem(key) !== legacySnapshot) throw recoveryError()
      const initial: StoredQueue = { revision: 0, state: validated, legacySnapshot }
      store.add(initial, key)
      return initial
    })
  }
  if (!Number.isSafeInteger(record.revision) || record.revision < 0 || record.legacySnapshot !== storage.getItem(key)) throw recoveryError()
  await validateState(record.state, config)
  // Failed marker writes fail capture; committed evidence is retained.
  storage.setItem(markerKey, "1")
  return record
}

export async function loadOfflineLocalQueue(config: OfflineLocalQueueConfig): Promise<OfflineLocalQueueState> {
  return (await loadRecord(config)).state
}

export type OfflineLocalQueueSummary = {
  config: OfflineLocalQueueConfig
  pendingCount: number
  acknowledgedCount: number
  conflictCount: number
  uncertainCount: number
}

// Discover this browser's evidence without relying on a server device list:
// revoked, unenrolled and never-uploaded queues must remain visible. Only counts
// and scope leave this reader; customer payloads stay in the existing store.
export async function inspectOfflineLocalQueues(scope: {
  organizationKey: string
  locationId?: string | null
  terminalId?: string | null
}): Promise<OfflineLocalQueueSummary[]> {
  if (!scope.organizationKey) throw recoveryError()
  const prefix = `${QUEUE_PREFIX}:${scope.organizationKey}:`
  const storage = resolveStorage()
  const database = await openQueueDatabase({ organizationKey: scope.organizationKey, deviceId: "", terminalId: "", locationId: "" })
  let records: Map<string, StoredQueue>
  try {
    records = await new Promise((resolve, reject) => {
      const tx = database.transaction(QUEUE_STORE, "readonly")
      const found = new Map<string, StoredQueue>()
      const request = tx.objectStore(QUEUE_STORE).openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        if (typeof cursor.key === "string" && cursor.key.startsWith(prefix)) found.set(cursor.key, cursor.value)
        cursor.continue()
      }
      tx.oncomplete = () => resolve(found)
      tx.onabort = () => reject(tx.error ?? recoveryError())
      tx.onerror = () => { /* onabort owns rejection */ }
    })
  } finally { database.close() }
  const keys = new Set(records.keys())
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (key?.startsWith(prefix)) keys.add(key.endsWith(":indexeddb-migrated") ? key.slice(0, -":indexeddb-migrated".length) : key)
  }
  const summaries: OfflineLocalQueueSummary[] = []
  for (const key of keys) {
    const record = records.get(key)
    // An existing but damaged durable record is not an absent record. Falling
    // back to an older legacy snapshot could hide unacknowledged evidence.
    if (records.has(key) && (!record || !record.state)) throw recoveryError()
    let state: OfflineLocalQueueState | undefined = record?.state
    if (!state) {
      // A marker without its database is evidence loss, never an empty queue.
      if (storage.getItem(`${key}:indexeddb-migrated`)) throw recoveryError()
      try { state = JSON.parse(storage.getItem(key) ?? "null") } catch { throw recoveryError() }
    }
    if (!state || state.organizationKey !== scope.organizationKey || key !== offlineQueueStorageKey(state) || !state.deviceId || !state.locationId || !state.terminalId) throw recoveryError()
    const config = { organizationKey: state.organizationKey, deviceId: state.deviceId, locationId: state.locationId, terminalId: state.terminalId, sessionId: state.sessionId }
    // Check the complete organization inventory before applying station filters.
    // Corrupt evidence whose scope cannot be trusted fails closed.
    if (record && (!Number.isSafeInteger(record.revision) || record.revision < 0 || record.legacySnapshot !== storage.getItem(key))) throw recoveryError()
    await validateState(state, config)
    if ((scope.locationId && scope.locationId !== state.locationId) || (scope.terminalId && scope.terminalId !== state.terminalId)) continue
    summaries.push({ config,
      pendingCount: state.entries.filter(e => e.status !== "SYNCED").length,
      acknowledgedCount: state.entries.filter(e => e.status === "SYNCED").length,
      conflictCount: state.entries.filter(e => e.status === "CONFLICT").length,
      uncertainCount: state.entries.filter(e => e.status === "UNCERTAIN" || e.status === "SYNCING").length,
    })
  }
  return summaries
}

export async function assertNoLocalOfflineWork(scope: Parameters<typeof inspectOfflineLocalQueues>[0]) {
  const queues = await inspectOfflineLocalQueues(scope)
  if (queues.some(queue => queue.pendingCount > 0)) throw new OfflineQueueRecoveryError("POS_CHECKOUT_OFFLINE_PENDING")
}

async function updateQueue<T>(
  config: OfflineLocalQueueConfig,
  mutate: (state: OfflineLocalQueueState) => Promise<{ state: OfflineLocalQueueState; value: T }> | { state: OfflineLocalQueueState; value: T },
): Promise<T> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const record = await loadRecord(config)
    const changed = await mutate(record.state)
    const committed = await queueTransaction(config, "readwrite", (current, store) => {
      if (!current || current.revision !== record.revision) return false
      if (resolveStorage(config.storage).getItem(offlineQueueStorageKey(config)) !== current.legacySnapshot) throw recoveryError()
      store.put({ ...current, revision: current.revision + 1, state: changed.state }, offlineQueueStorageKey(config))
      return true
    })
    if (committed) return changed.value
  }
  throw new Error("Offline queue is busy. Capture was not acknowledged; retry when other tabs finish.")
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
  // Snapshot caller-owned values before hashing; later mutations cannot change evidence.
  input = JSON.parse(stableOfflineJson(input)) as EnqueueOfflineLocalEventInput
  assertProvisionalOnly(input)
  return updateQueue(config, async (state) => {
    if (input.idempotencyKey && state.entries.some(entry => entry.event.idempotencyKey === input.idempotencyKey)) {
      throw new Error("Offline capture identity already exists. Recover the existing event instead of creating a replacement.")
    }
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
          finalFiscalNumberingPermitted: false,
          receiptStatus: "PROVISIONAL_ONLY",
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
      sessionId: config.sessionId ?? state.sessionId,
      nextSequence: deviceSeq + 1,
      highWaterHash: entryHash,
      updatedAt: queuedAt,
      entries: [...state.entries, entry],
    }

    return { state: nextState, value: entry }
  })
}

export function offlineLocalQueuePendingEntries(state: OfflineLocalQueueState, now = new Date()) {
  return state.entries.filter((entry) => {
    if (["QUEUED", "FAILED", "UNCERTAIN"].includes(entry.status)) return true
    const leaseRemaining = Date.parse(entry.syncLeaseExpiresAt ?? "") - now.getTime()
    // Missing/invalid legacy leases and clock rollback cannot strand evidence forever.
    return entry.status === "SYNCING" && !(leaseRemaining > 0 && leaseRemaining <= OFFLINE_SYNC_LEASE_MS)
  })
}

export function buildOfflineSyncBatchEnvelope(
  config: OfflineLocalQueueConfig,
  state: OfflineLocalQueueState,
): OfflineSyncBatchEnvelope | null {
  const pending = offlineLocalQueuePendingEntries(state, config.now?.()).slice(0, 250)
  if (pending.length === 0) return null

  return {
    deviceId: config.deviceId,
    terminalId: config.terminalId,
    locationId: config.locationId,
    sessionId: state.sessionId,
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

export type OfflineQueueClaim =
  | { skipped: true; reason: "EMPTY_QUEUE" | "LEASE_ACTIVE" | "CONFLICT_REVIEW"; pendingCount: number }
  | { skipped: false; attemptId: string; queueIds: string[]; envelope: OfflineSyncBatchEnvelope }

export async function claimOfflineLocalQueueBatch(config: OfflineLocalQueueConfig): Promise<OfflineQueueClaim> {
  return updateQueue<OfflineQueueClaim>(config, (state) => {
    const now = config.now?.() ?? new Date()
    const remaining = state.entries.filter(entry => entry.status !== "SYNCED")
    if (!remaining.length) return { state, value: { skipped: true, reason: "EMPTY_QUEUE", pendingCount: 0 } }
    // Never send newer events ahead of an in-flight or quarantined predecessor.
    const pending = offlineLocalQueuePendingEntries(state, now)
    if (remaining[0].status === "CONFLICT") {
      return { state, value: { skipped: true, reason: "CONFLICT_REVIEW", pendingCount: remaining.length } }
    }
    if (!pending.includes(remaining[0])) {
      return { state, value: { skipped: true, reason: "LEASE_ACTIVE", pendingCount: remaining.length } }
    }
    const entries: OfflineLocalQueueEntry[] = []
    for (const entry of remaining) {
      if (!pending.includes(entry) || entries.length === 250) break
      entries.push(entry)
    }
    const attemptId = crypto.randomUUID()
    const queueIds = entries.map(entry => entry.queueId)
    const updatedAt = now.toISOString()
    const envelope = buildOfflineSyncBatchEnvelope(config, { ...state, entries })!
    const nextState = {
      ...state,
      updatedAt,
      entries: state.entries.map(entry => !queueIds.includes(entry.queueId) ? entry : {
        ...entry,
        status: "SYNCING" as const,
        syncAttemptId: attemptId,
        syncLeaseExpiresAt: new Date(now.getTime() + OFFLINE_SYNC_LEASE_MS).toISOString(),
        updatedAt,
        syncAttempts: entry.syncAttempts + 1,
      }),
    }
    return { state: nextState, value: { skipped: false, attemptId, queueIds, envelope } }
  })
}

export async function settleOfflineLocalQueueBatch(
  config: OfflineLocalQueueConfig,
  claim: Extract<OfflineQueueClaim, { skipped: false }>,
  outcome: { status: "SYNCED" | "CONFLICT" | "UNCERTAIN"; serverBatchId?: string },
) {
  if (outcome.status === "SYNCED" && !outcome.serverBatchId) throw new Error("Server acknowledgement is required to resolve offline evidence.")
  return updateQueue(config, (state) => {
    const updatedAt = nowIso(config)
    const nextState = {
      ...state,
      updatedAt,
      entries: state.entries.map(entry => {
        // A delayed response cannot resolve a newer attempt or delete its evidence.
        if (!claim.queueIds.includes(entry.queueId) || entry.syncAttemptId !== claim.attemptId || entry.status !== "SYNCING") return entry
        return {
          ...entry, status: outcome.status, updatedAt,
          syncLeaseExpiresAt: undefined,
          lastServerBatchId: outcome.serverBatchId,
          lastSyncError: outcome.status === "UNCERTAIN" ? "SERVER_OUTCOME_UNCONFIRMED" : outcome.status === "CONFLICT" ? "SERVER_REVIEW_REQUIRED" : undefined,
        }
      }),
    }
    return { state: nextState, value: nextState }
  })
}

export async function pruneSyncedOfflineLocalQueue(config: OfflineLocalQueueConfig) {
  return updateQueue(config, (state) => {
    const nextState = {
      ...state, updatedAt: nowIso(config),
      entries: state.entries.filter(entry => entry.status !== "SYNCED" || !entry.lastServerBatchId),
    }
    return { state: nextState, value: nextState }
  })
}
