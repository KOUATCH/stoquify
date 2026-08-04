import type {
  CloseFindingDomain,
  CloseFindingSeverity,
  CloseFindingStatus,
} from "@prisma/client";

export const MISSING_CLOSE_EVIDENCE_REQUEST_TYPE =
  "MISSING_CLOSE_EVIDENCE" as const;
export const MISSING_CLOSE_EVIDENCE_VISIBILITY =
  "CLIENT_ACTION_REQUIRED" as const;

export const CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE = {
  version: 1,
  kind: "CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE",
  readPermission: "accounting.close.read",
  maxItems: 100,
  actionPathPrefix: "/dashboard/accounting/close",
  sourceTables: [
    "accountant_comments",
    "close_assurance_findings",
    "accounting_periods",
  ],
  redaction: "CLIENT_RECIPIENT_ONLY_NO_RAW_METADATA",
} as const;

export type ClientMissingCloseEvidenceRequest = Readonly<{
  requestId: string;
  findingId: string;
  closeRunId: string;
  correlationId: string;
  requestedById: string;
  requestedFromId: string;
  requestText: string;
  dueAt: string;
  createdAt: string;
  finding: {
    domain: CloseFindingDomain;
    severity: CloseFindingSeverity;
    status: CloseFindingStatus;
    title: string;
    detail: string;
  };
  period: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  actionPath: string;
  requiredPermission: typeof CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.readPermission;
}>;

export type ClientMissingCloseEvidenceRequestQueueBlocker = Readonly<{
  id: string;
  findingId: string;
  requestId: string;
  reason: "INVALID_REQUEST_EVIDENCE";
  detail: "Stored missing-proof request evidence is incomplete.";
}>;

export type ClientMissingCloseEvidenceRequestQueue = Readonly<{
  kind: typeof CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.kind;
  version: typeof CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.version;
  organizationId: string;
  actorId: string;
  generatedAt: string;
  source: {
    organizationScoped: true;
    recipientScoped: true;
    sourceTables: typeof CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.sourceTables;
    redaction: typeof CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.redaction;
  };
  controls: {
    actorIsRecipient: true;
    activeTenantActorRequired: true;
    readPermissionRequired: typeof CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.readPermission;
    serviceClockOwned: true;
    rawMetadataExposed: false;
    maxItems: typeof CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems;
  };
  summary: {
    total: number;
    overdue: number;
    dueWithin72Hours: number;
    scheduled: number;
    invalidEvidence: number;
    truncated: boolean;
  };
  requests: ClientMissingCloseEvidenceRequest[];
  blockers: ClientMissingCloseEvidenceRequestQueueBlocker[];
}>;
