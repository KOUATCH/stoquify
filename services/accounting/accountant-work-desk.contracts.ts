import type { AccountantMissingCloseEvidenceReviewItem } from "./missing-close-evidence-accountant-review-queue-contracts"

import type { CloseEvidenceReplacementPreview } from "./close-evidence-replacement.service"

export const ACCOUNTANT_WORK_DESK_CLIENT_LIMIT = 10
export type AccountantWorkClientPage = { clientOrganizationId: string; kind: "requests" | "reviews"; cursor: string }
export type AccountantWorkContinuation = { clientOrganizationId: string; clientName: string; requests: string | null; reviews: string | null }
export type AccountantWorkItem = {
  clientOrganizationId: string
  clientName: string
  requestId: string
  periodName: string
  domain: string
  severity: string
  dueAt: string
  submittedAt: string | null
  owner: "ACCOUNTANT_REVIEW_TEAM" | "CLIENT_RECIPIENT"
  requestedByYou: boolean
  evidenceState: "RESPONSE_SUBMITTED" | "AWAITING_RESPONSE"
  delivery: "PENDING" | "LOCKED" | "DEFERRED" | "SENT" | "FAILED" | "DEAD_LETTER" | "CANCELLED" | "UNKNOWN"
  publication: { publishedAt: string } | null
  urgency: "OVERDUE" | "DUE_SOON" | "SCHEDULED"
  nextAction: "REVIEW_RESPONSE" | "AWAIT_RESPONSE"
}
export type AccountantWorkDesk = {
  generatedAt: string
  scope: "OPEN_EVIDENCE_IN_CLIENT_PAGE"
  clientsRead: number
  unavailableClients: number
  incompleteClients: number
  nextCursor: string | null
  items: AccountantWorkItem[]
  clientContinuations: AccountantWorkContinuation[]
}
export type AccountantWorkDetail = {
  clientOrganizationId: string
  generatedAt: string
  item: AccountantMissingCloseEvidenceReviewItem
  replacement: Omit<Extract<CloseEvidenceReplacementPreview, { status: "AVAILABLE" }>, "binding"> | Extract<CloseEvidenceReplacementPreview, { status: "UNAVAILABLE" }>
}
