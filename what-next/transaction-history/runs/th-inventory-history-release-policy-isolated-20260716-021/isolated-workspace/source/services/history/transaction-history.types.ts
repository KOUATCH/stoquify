export type HistoryCompletenessSource = {
  source: string
  state: "complete" | "partial"
  reason?: string
  lagSeconds?: number
}

export type HistoryCompleteness = {
  state: "complete" | "partial"
  sources: HistoryCompletenessSource[]
}

export type HistorySnapshot = {
  effectiveAsOf?: string
  recordedThrough: string
  generatedAt: string
  timezone: string
}

export type HistoryPageInfo = {
  nextCursor: string | null
  hasMore: boolean
}

export type TransactionHistoryResult<Row, Summary, Filters> = {
  rows: Row[]
  pageInfo: HistoryPageInfo
  appliedFilters: Filters
  summary: Summary
  snapshot: HistorySnapshot
  completeness: HistoryCompleteness
}

export type HistoryCursorPayload = {
  v: 1
  scope: "transaction-history"
  tenantId: string
  adapterId: string
  filterHash: string
  recordedThrough: string
  effectiveAt: string
  recordedAt: string
  id: string
}

export type HistoryCursorErrorCode =
  | "not_configured"
  | "malformed"
  | "bad_signature"
  | "invalid_payload"

export class HistoryCursorError extends Error {
  constructor(
    readonly code: HistoryCursorErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "HistoryCursorError"
  }
}

export type HistoryCursorCodec = {
  encode(payload: HistoryCursorPayload): string
  decode(token: string): HistoryCursorPayload
}
