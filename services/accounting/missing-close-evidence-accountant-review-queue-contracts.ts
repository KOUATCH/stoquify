import type {
  CloseFindingDomain,
  CloseFindingSeverity,
} from "@prisma/client"

export const ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE = {
  version: 1,
  kind: "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE",
  readPermission: "accounting.close.accountant.review",
  maxItems: 100,
  candidateMultiplier: 2,
  sourceTables: [
    "accountant_comments",
    "close_assurance_findings",
    "accounting_periods",
    "accountant_access_grants",
  ],
  redaction: "ACCOUNTANT_REVIEW_NO_RAW_METADATA",
  responseTextExposure: "AUTHORIZED_ACCOUNTANT_REVIEW_ONLY",
} as const

export type AccountantMissingCloseEvidenceReviewItem = Readonly<{
  findingId: string
  closeRunId: string
  workflowState: "AWAITING_ACCOUNTANT_REVIEW"
  finding: {
    domain: CloseFindingDomain
    severity: CloseFindingSeverity
    status: "IN_REVIEW"
    title: string
    detail: string
  }
  period: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
  request: {
    requestId: string
    correlationId: string
    requestedById: string
    requestedFromId: string
    requestText: string
    dueAt: string
    createdAt: string
  }
  response: {
    responseId: string
    correlationId: string
    respondedById: string
    responseText: string
    submittedAt: string
    status: "SUBMITTED"
  }
}>

export type AccountantMissingCloseEvidenceReviewQueueBlocker = Readonly<{
  id: string
  findingId: string | null
  requestId: string | null
  responseId: string | null
  reason:
    | "INVALID_REQUEST_EVIDENCE"
    | "INVALID_RESPONSE_EVIDENCE"
    | "TRUNCATED_EVIDENCE"
  detail:
    | "Stored missing-proof request evidence is incomplete."
    | "Stored missing-proof response evidence is incomplete."
    | "Missing-proof review evidence exceeded the bounded read limit."
}>

export type AccountantMissingCloseEvidenceReviewQueue = Readonly<{
  kind: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.kind
  version: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.version
  homeOrganizationId: string
  organizationId: string
  actorId: string
  generatedAt: string
  source: {
    organizationScoped: true
    accessMode: "TENANT_MEMBER" | "DELEGATED_ACCOUNTANT"
    sourceTables: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.sourceTables
    redaction: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.redaction
  }
  controls: {
    activeHomeTenantActorRequired: true
    targetOrganizationServiceResolved: true
    delegatedReviewGrantRequired: true
    readPermissionRequired: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.readPermission
    serviceClockOwned: true
    rawMetadataExposed: false
    responseTextExposure: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.responseTextExposure
    failClosedOnTruncation: true
    maxItems: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems
  }
  summary: {
    total: number
    invalidEvidence: number
    invalidRequestEvidence: number
    invalidResponseEvidence: number
    truncatedEvidence: number
    truncated: boolean
  }
  items: AccountantMissingCloseEvidenceReviewItem[]
  blockers: AccountantMissingCloseEvidenceReviewQueueBlocker[]
}>
