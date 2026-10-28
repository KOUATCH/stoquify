export const MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE =
  "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE"
export const MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_VISIBILITY =
  "ACCOUNTANT_RESPONSE_ACCEPTED"

export const ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE = {
  version: 1,
  kind: "ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE",
  permission: "accounting.close.accountant.review",
  decision: "ACCEPTED",
  findingStatus: "RESOLVED",
  freshAuthMaxAgeSeconds: 300,
  auditAction: "CLOSE_MISSING_EVIDENCE_RESPONSE_ACCEPTED",
  eventType: "close.assurance.missing_evidence.response_accepted",
  redaction: "NO_REQUEST_RESPONSE_OR_RESOLUTION_TEXT_IN_AUDIT_EVENT",
  rawMetadataExposed: false,
  closeCertificationAuthorized: false,
} as const

export type MissingCloseEvidenceResponseAcceptanceDto = {
  kind: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.kind
  version: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.version
  id: string
  organizationId: string
  periodId: string
  closeRunId: string
  findingId: string
  requestId: string
  responseId: string
  respondedById: string
  acceptedById: string
  decision: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.decision
  findingStatus: typeof ACCOUNTANT_MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE.findingStatus
  resolutionNotes: string
  resolvedAt: string
  correlationId: string
  createdAt: string
  controls: {
    serviceClockOwned: true
    freshAuthRequired: true
    delegatedReviewRequired: true
    segregationOfDutiesRequired: true
    compareAndSetResolution: true
    rawMetadataExposed: false
    closeCertificationAuthorized: false
  }
}
