import type { OfflineSyncConflictDTO } from "./offline-sync.service"

export type POSAttentionRow = {
  id: string
  kind: "cash" | "whatsapp"
  occurredAt: string
  reference: string
  location: string
  terminal: string | null
  locationId: string
  terminalId: string | null
  sessionId: string | null
  variance: string | null
  status: "CASH_VARIANCE" | "FAILED" | "UNCERTAIN"
}

export type POSAttentionOffline = {
  state: "choose_register" | "unavailable"
} | {
  state: "ready"
  asOf: string
  locationId: string
  terminalId: string
  conflictCount: number
  closeBlockerCount: number
  conflicts: OfflineSyncConflictDTO[]
  access: { organizationId: string; userId: string; canRead: true; canReview: boolean }
}

export type POSActivityAttentionData = {
  rows: POSAttentionRow[]
  nextCursor: string | null
  offline: POSAttentionOffline | null
}
