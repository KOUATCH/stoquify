import "server-only";

import { CloseFindingStatus, Prisma } from "@prisma/client";

import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors";

import {
  CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE,
  MISSING_CLOSE_EVIDENCE_REQUEST_TYPE,
  MISSING_CLOSE_EVIDENCE_VISIBILITY,
  type ClientMissingCloseEvidenceRequest,
  type ClientMissingCloseEvidenceRequestQueue,
  type ClientMissingCloseEvidenceRequestQueueBlocker,
} from "./missing-close-evidence-request-queue-contracts";

const OPEN_FINDING_STATUSES = [
  CloseFindingStatus.OPEN,
  CloseFindingStatus.ASSIGNED,
  CloseFindingStatus.IN_REVIEW,
  CloseFindingStatus.REOPENED,
] as const;
const DUE_SOON_WINDOW_MS = 72 * 60 * 60 * 1000;

export type GetClientMissingCloseEvidenceRequestQueueInput = Readonly<{
  organizationId: string;
  actorId: string;
  actorPermissions: readonly string[];
}>;

function metadataRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Prisma.JsonObject;
}

function metadataString(
  metadata: Prisma.JsonValue | null,
  key: string,
): string | null {
  const value = metadataRecord(metadata)?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function invalidEvidenceBlocker(
  findingId: string,
  requestId: string,
): ClientMissingCloseEvidenceRequestQueueBlocker {
  return {
    id: `missing-close-evidence-request:${requestId}:invalid-evidence`,
    findingId,
    requestId,
    reason: "INVALID_REQUEST_EVIDENCE",
    detail: "Stored missing-proof request evidence is incomplete.",
  };
}

export async function getClientMissingCloseEvidenceRequestQueue(
  input: GetClientMissingCloseEvidenceRequestQueueInput,
): Promise<ClientMissingCloseEvidenceRequestQueue> {
  const organizationId = input.organizationId.trim();
  const actorId = input.actorId.trim();

  if (!organizationId || !actorId) {
    throw new BusinessRuleError("Organization and actor are required.");
  }
  if (
    !hasRbacPermission(
      input.actorPermissions,
      CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.readPermission,
    )
  ) {
    throw new ForbiddenError("Missing-proof requests are not available.");
  }

  const actor = await db.user.findFirst({
    where: { id: actorId, organizationId, isActive: true },
    select: { id: true },
  });
  if (!actor) {
    throw new ForbiddenError("Missing-proof requests are not available.");
  }

  const generatedAt = new Date();
  const matchingComment: Prisma.AccountantCommentWhereInput = {
    organizationId,
    visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY,
    AND: [
      {
        metadata: {
          path: ["requestType"],
          equals: MISSING_CLOSE_EVIDENCE_REQUEST_TYPE,
        },
      },
      {
        metadata: {
          path: ["requestedFromId"],
          equals: actorId,
        },
      },
    ],
  };
  const findings = await db.closeAssuranceFinding.findMany({
    where: {
      organizationId,
      ownerId: actorId,
      status: { in: [...OPEN_FINDING_STATUSES] },
      comments: { some: matchingComment },
    },
    select: {
      id: true,
      closeRunId: true,
      domain: true,
      severity: true,
      status: true,
      title: true,
      detail: true,
      dueAt: true,
      createdAt: true,
      period: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      },
      comments: {
        where: matchingComment,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          id: true,
          authorId: true,
          body: true,
          correlationId: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems + 1,
  });

  const requests: ClientMissingCloseEvidenceRequest[] = [];
  const blockers: ClientMissingCloseEvidenceRequestQueueBlocker[] = [];
  const visibleFindings = findings.slice(
    0,
    CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems,
  );

  for (const finding of visibleFindings) {
    const comment = finding.comments[0];
    const requestId = comment?.id ?? `finding-${finding.id}`;
    const requestType = comment
      ? metadataString(comment.metadata, "requestType")
      : null;
    const requestedById = comment
      ? metadataString(comment.metadata, "requestedById")
      : null;
    const requestedFromId = comment
      ? metadataString(comment.metadata, "requestedFromId")
      : null;
    const correlationId = comment
      ? metadataString(comment.metadata, "correlationId")
      : null;
    const dueAtValue = comment
      ? metadataString(comment.metadata, "dueAt")
      : null;
    const dueAt = dueAtValue ? new Date(dueAtValue) : null;

    if (
      !comment ||
      requestType !== MISSING_CLOSE_EVIDENCE_REQUEST_TYPE ||
      !comment.authorId ||
      requestedById !== comment.authorId ||
      requestedFromId !== actorId ||
      !comment.correlationId ||
      correlationId !== comment.correlationId ||
      !comment.body.trim() ||
      !dueAt ||
      !Number.isFinite(dueAt.getTime())
    ) {
      blockers.push(invalidEvidenceBlocker(finding.id, requestId));
      continue;
    }

    requests.push({
      requestId: comment.id,
      findingId: finding.id,
      closeRunId: finding.closeRunId,
      correlationId,
      requestedById,
      requestedFromId,
      requestText: comment.body,
      dueAt: dueAt.toISOString(),
      createdAt: comment.createdAt.toISOString(),
      finding: {
        domain: finding.domain,
        severity: finding.severity,
        status: finding.status,
        title: finding.title,
        detail: finding.detail,
      },
      period: {
        id: finding.period.id,
        name: finding.period.name,
        startDate: finding.period.startDate.toISOString(),
        endDate: finding.period.endDate.toISOString(),
      },
      actionPath:
        `${CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.actionPathPrefix}/` +
        `${encodeURIComponent(finding.period.id)}?findingId=${encodeURIComponent(finding.id)}`,
      requiredPermission:
        CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.readPermission,
    });
  }

  requests.sort(
    (left, right) =>
      Date.parse(left.dueAt) - Date.parse(right.dueAt) ||
      Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
      left.requestId.localeCompare(right.requestId),
  );

  const nowTime = generatedAt.getTime();
  const dueSoonTime = nowTime + DUE_SOON_WINDOW_MS;
  const overdue = requests.filter(
    (request) => Date.parse(request.dueAt) < nowTime,
  ).length;
  const dueWithin72Hours = requests.filter((request) => {
    const dueAt = Date.parse(request.dueAt);
    return dueAt >= nowTime && dueAt <= dueSoonTime;
  }).length;

  return {
    kind: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.kind,
    version: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.version,
    organizationId,
    actorId,
    generatedAt: generatedAt.toISOString(),
    source: {
      organizationScoped: true,
      recipientScoped: true,
      sourceTables: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.sourceTables,
      redaction: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.redaction,
    },
    controls: {
      actorIsRecipient: true,
      activeTenantActorRequired: true,
      readPermissionRequired:
        CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.readPermission,
      serviceClockOwned: true,
      rawMetadataExposed: false,
      maxItems: CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems,
    },
    summary: {
      total: requests.length,
      overdue,
      dueWithin72Hours,
      scheduled: requests.length - overdue - dueWithin72Hours,
      invalidEvidence: blockers.length,
      truncated:
        findings.length > CLIENT_MISSING_CLOSE_EVIDENCE_REQUEST_QUEUE.maxItems,
    },
    requests,
    blockers,
  };
}
