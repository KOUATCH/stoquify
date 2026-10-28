import { CloseFindingStatus, Prisma } from "@prisma/client"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors"

import { resolveAccountantClientAccess } from "./accountant-access.service"
import {
  ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE,
  type AccountantMissingCloseEvidenceReviewItem,
  type AccountantMissingCloseEvidenceReviewQueue,
  type AccountantMissingCloseEvidenceReviewQueueBlocker,
} from "./missing-close-evidence-accountant-review-queue-contracts"
import {
  MISSING_CLOSE_EVIDENCE_REQUEST_TYPE,
  MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE,
  MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY,
  MISSING_CLOSE_EVIDENCE_VISIBILITY,
} from "./missing-close-evidence-request-queue-contracts"

const MAX_COMMENT_CANDIDATES =
  ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems *
  ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.candidateMultiplier

export type GetAccountantMissingCloseEvidenceReviewQueueInput = Readonly<{
  homeOrganizationId: string
  clientOrganizationId?: string | null
  actorId: string
  actorPermissions: readonly string[]
}>

type ReviewCommentRecord = {
  id: string
  organizationId: string
  periodId: string
  closeRunId: string
  findingId: string | null
  authorId: string | null
  body: string
  correlationId: string | null
  metadata: Prisma.JsonValue | null
  createdAt: Date
}

function metadataRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Prisma.JsonObject
}

function metadataString(
  metadata: Prisma.JsonValue | null,
  key: string,
): string | null {
  const value = metadataRecord(metadata)?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function invalidRequestBlocker(
  findingId: string,
  requestId: string | null,
): AccountantMissingCloseEvidenceReviewQueueBlocker {
  return {
    id: `accountant-missing-proof-review:${findingId}:invalid-request`,
    findingId,
    requestId,
    responseId: null,
    reason: "INVALID_REQUEST_EVIDENCE",
    detail: "Stored missing-proof request evidence is incomplete.",
  }
}

function invalidResponseBlocker(
  findingId: string,
  requestId: string | null,
  responseId: string | null,
): AccountantMissingCloseEvidenceReviewQueueBlocker {
  return {
    id: `accountant-missing-proof-review:${findingId}:invalid-response`,
    findingId,
    requestId,
    responseId,
    reason: "INVALID_RESPONSE_EVIDENCE",
    detail: "Stored missing-proof response evidence is incomplete.",
  }
}

function truncatedEvidenceBlocker(): AccountantMissingCloseEvidenceReviewQueueBlocker {
  return {
    id: "accountant-missing-proof-review:truncated-evidence",
    findingId: null,
    requestId: null,
    responseId: null,
    reason: "TRUNCATED_EVIDENCE",
    detail: "Missing-proof review evidence exceeded the bounded read limit.",
  }
}

function queueResult(input: {
  homeOrganizationId: string
  organizationId: string
  actorId: string
  generatedAt: Date
  accessMode: "TENANT_MEMBER" | "DELEGATED_ACCOUNTANT"
  items: AccountantMissingCloseEvidenceReviewItem[]
  blockers: AccountantMissingCloseEvidenceReviewQueueBlocker[]
  truncated: boolean
}): AccountantMissingCloseEvidenceReviewQueue {
  const invalidRequestEvidence = input.blockers.filter(
    (blocker) => blocker.reason === "INVALID_REQUEST_EVIDENCE",
  ).length
  const invalidResponseEvidence = input.blockers.filter(
    (blocker) => blocker.reason === "INVALID_RESPONSE_EVIDENCE",
  ).length
  const truncatedEvidence = input.blockers.filter(
    (blocker) => blocker.reason === "TRUNCATED_EVIDENCE",
  ).length

  return {
    kind: ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.kind,
    version: ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.version,
    homeOrganizationId: input.homeOrganizationId,
    organizationId: input.organizationId,
    actorId: input.actorId,
    generatedAt: input.generatedAt.toISOString(),
    source: {
      organizationScoped: true,
      accessMode: input.accessMode,
      sourceTables:
        ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.sourceTables,
      redaction: ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.redaction,
    },
    controls: {
      activeHomeTenantActorRequired: true,
      targetOrganizationServiceResolved: true,
      delegatedReviewGrantRequired: true,
      readPermissionRequired:
        ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.readPermission,
      serviceClockOwned: true,
      rawMetadataExposed: false,
      responseTextExposure:
        ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.responseTextExposure,
      failClosedOnTruncation: true,
      maxItems: ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems,
    },
    summary: {
      total: input.items.length,
      invalidEvidence: input.blockers.length,
      invalidRequestEvidence,
      invalidResponseEvidence,
      truncatedEvidence,
      truncated: input.truncated,
    },
    items: input.items,
    blockers: input.blockers,
  }
}

function groupCommentsByFinding(comments: ReviewCommentRecord[]) {
  const grouped = new Map<string, ReviewCommentRecord[]>()
  for (const comment of comments) {
    if (!comment.findingId) continue
    const findingComments = grouped.get(comment.findingId) ?? []
    findingComments.push(comment)
    grouped.set(comment.findingId, findingComments)
  }
  return grouped
}

export async function getAccountantMissingCloseEvidenceReviewQueue(
  input: GetAccountantMissingCloseEvidenceReviewQueueInput,
): Promise<AccountantMissingCloseEvidenceReviewQueue> {
  const homeOrganizationId = input.homeOrganizationId.trim()
  const actorId = input.actorId.trim()
  const clientOrganizationId = input.clientOrganizationId?.trim() || null

  if (!homeOrganizationId || !actorId) {
    throw new BusinessRuleError("Home organization and actor are required.")
  }
  if (input.clientOrganizationId != null && !clientOrganizationId) {
    throw new BusinessRuleError("Client organization must not be blank.")
  }
  if (
    !hasRbacPermission(
      input.actorPermissions,
      ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.readPermission,
    )
  ) {
    throw new ForbiddenError(
      "Missing-proof accountant review is not available.",
    )
  }

  const generatedAt = new Date()
  return db.$transaction(
    async (tx) => {
      const actor = await tx.user.findFirst({
        where: {
          id: actorId,
          organizationId: homeOrganizationId,
          isActive: true,
        },
        select: { id: true },
      })
      if (!actor) {
        throw new ForbiddenError(
          "Missing-proof accountant review is not available.",
        )
      }

      const access = await resolveAccountantClientAccess({
        homeOrganizationId,
        clientOrganizationId,
        accountantUserId: actorId,
        capability: "REVIEW",
        now: generatedAt,
        client: tx,
      })
      const organizationId = access.organizationId
      const requestMatcher: Prisma.AccountantCommentWhereInput = {
        organizationId,
        visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY,
        metadata: {
          path: ["requestType"],
          equals: MISSING_CLOSE_EVIDENCE_REQUEST_TYPE,
        },
      }
      const responseMatcher: Prisma.AccountantCommentWhereInput = {
        organizationId,
        visibility: MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY,
        metadata: {
          path: ["responseType"],
          equals: MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE,
        },
      }
      const findings = await tx.closeAssuranceFinding.findMany({
        where: {
          organizationId,
          status: CloseFindingStatus.IN_REVIEW,
          comments: { some: requestMatcher },
        },
        select: {
          id: true,
          closeRunId: true,
          ownerId: true,
          domain: true,
          severity: true,
          status: true,
          title: true,
          detail: true,
          createdAt: true,
          period: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems + 1,
      })
      const findingsTruncated =
        findings.length >
        ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems
      const visibleFindings = findings.slice(
        0,
        ACCOUNTANT_MISSING_CLOSE_EVIDENCE_REVIEW_QUEUE.maxItems,
      )
      if (findingsTruncated) {
        return queueResult({
          homeOrganizationId,
          organizationId,
          actorId,
          generatedAt,
          accessMode: access.mode,
          items: [],
          blockers: [truncatedEvidenceBlocker()],
          truncated: true,
        })
      }

      const findingIds = visibleFindings.map((finding) => finding.id)
      const requestCandidates: ReviewCommentRecord[] =
        findingIds.length === 0
          ? []
          : await tx.accountantComment.findMany({
              where: {
                ...requestMatcher,
                findingId: { in: findingIds },
              },
              select: {
                id: true,
                organizationId: true,
                periodId: true,
                closeRunId: true,
                findingId: true,
                authorId: true,
                body: true,
                correlationId: true,
                metadata: true,
                createdAt: true,
              },
              orderBy: [
                { findingId: "asc" },
                { createdAt: "desc" },
                { id: "desc" },
              ],
              take: MAX_COMMENT_CANDIDATES + 1,
            })
      const responseCandidates: ReviewCommentRecord[] =
        findingIds.length === 0
          ? []
          : await tx.accountantComment.findMany({
              where: {
                ...responseMatcher,
                findingId: { in: findingIds },
              },
              select: {
                id: true,
                organizationId: true,
                periodId: true,
                closeRunId: true,
                findingId: true,
                authorId: true,
                body: true,
                correlationId: true,
                metadata: true,
                createdAt: true,
              },
              orderBy: [
                { findingId: "asc" },
                { createdAt: "desc" },
                { id: "desc" },
              ],
              take: MAX_COMMENT_CANDIDATES + 1,
            })
      const commentsTruncated =
        requestCandidates.length > MAX_COMMENT_CANDIDATES ||
        responseCandidates.length > MAX_COMMENT_CANDIDATES
      if (commentsTruncated) {
        return queueResult({
          homeOrganizationId,
          organizationId,
          actorId,
          generatedAt,
          accessMode: access.mode,
          items: [],
          blockers: [truncatedEvidenceBlocker()],
          truncated: true,
        })
      }

      const requestsByFinding = groupCommentsByFinding(requestCandidates)
      const responsesByFinding = groupCommentsByFinding(responseCandidates)
      const items: AccountantMissingCloseEvidenceReviewItem[] = []
      const blockers: AccountantMissingCloseEvidenceReviewQueueBlocker[] = []

      for (const finding of visibleFindings) {
        const requests = requestsByFinding.get(finding.id) ?? []
        const request = requests[0] ?? null
        if (requests.length !== 1 || !request) {
          blockers.push(invalidRequestBlocker(finding.id, request?.id ?? null))
          continue
        }

        const requestType = metadataString(request.metadata, "requestType")
        const requestedById = metadataString(
          request.metadata,
          "requestedById",
        )
        const requestedFromId = metadataString(
          request.metadata,
          "requestedFromId",
        )
        const requestCorrelationId = metadataString(
          request.metadata,
          "correlationId",
        )
        const dueAtValue = metadataString(request.metadata, "dueAt")
        const dueAt = dueAtValue ? new Date(dueAtValue) : null
        if (
          request.organizationId !== organizationId ||
          request.periodId !== finding.period.id ||
          request.closeRunId !== finding.closeRunId ||
          request.findingId !== finding.id ||
          requestType !== MISSING_CLOSE_EVIDENCE_REQUEST_TYPE ||
          !request.authorId ||
          requestedById !== request.authorId ||
          !requestedFromId ||
          finding.ownerId !== requestedFromId ||
          !request.correlationId ||
          requestCorrelationId !== request.correlationId ||
          !request.body.trim() ||
          !dueAt ||
          !Number.isFinite(dueAt.getTime())
        ) {
          blockers.push(invalidRequestBlocker(finding.id, request.id))
          continue
        }

        const responses = responsesByFinding.get(finding.id) ?? []
        const response = responses[0] ?? null
        if (responses.length !== 1 || !response) {
          blockers.push(
            invalidResponseBlocker(
              finding.id,
              request.id,
              response?.id ?? null,
            ),
          )
          continue
        }

        const responseType = metadataString(response.metadata, "responseType")
        const responseRequestId = metadataString(
          response.metadata,
          "requestId",
        )
        const responseRequestCorrelationId = metadataString(
          response.metadata,
          "requestCorrelationId",
        )
        const responseRequestedById = metadataString(
          response.metadata,
          "requestedById",
        )
        const responseRequestedFromId = metadataString(
          response.metadata,
          "requestedFromId",
        )
        const respondedById = metadataString(
          response.metadata,
          "respondedById",
        )
        const responseCorrelationId = metadataString(
          response.metadata,
          "correlationId",
        )
        if (
          response.organizationId !== organizationId ||
          response.periodId !== finding.period.id ||
          response.closeRunId !== finding.closeRunId ||
          response.findingId !== finding.id ||
          responseType !== MISSING_CLOSE_EVIDENCE_RESPONSE_TYPE ||
          responseRequestId !== request.id ||
          responseRequestCorrelationId !== request.correlationId ||
          responseRequestedById !== requestedById ||
          responseRequestedFromId !== requestedFromId ||
          response.authorId !== requestedFromId ||
          respondedById !== response.authorId ||
          !response.correlationId ||
          responseCorrelationId !== response.correlationId ||
          !response.body.trim()
        ) {
          blockers.push(
            invalidResponseBlocker(finding.id, request.id, response.id),
          )
          continue
        }

        items.push({
          findingId: finding.id,
          closeRunId: finding.closeRunId,
          workflowState: "AWAITING_ACCOUNTANT_REVIEW",
          finding: {
            domain: finding.domain,
            severity: finding.severity,
            status: "IN_REVIEW",
            title: finding.title,
            detail: finding.detail,
          },
          period: {
            id: finding.period.id,
            name: finding.period.name,
            startDate: finding.period.startDate.toISOString(),
            endDate: finding.period.endDate.toISOString(),
          },
          request: {
            requestId: request.id,
            correlationId: request.correlationId,
            requestedById,
            requestedFromId,
            requestText: request.body,
            dueAt: dueAt.toISOString(),
            createdAt: request.createdAt.toISOString(),
          },
          response: {
            responseId: response.id,
            correlationId: response.correlationId,
            respondedById,
            responseText: response.body,
            submittedAt: response.createdAt.toISOString(),
            status: "SUBMITTED",
          },
        })
      }

      items.sort(
        (left, right) =>
          Date.parse(left.response.submittedAt) -
            Date.parse(right.response.submittedAt) ||
          left.request.requestId.localeCompare(right.request.requestId),
      )
      blockers.sort((left, right) => left.id.localeCompare(right.id))

      return queueResult({
        homeOrganizationId,
        organizationId,
        actorId,
        generatedAt,
        accessMode: access.mode,
        items,
        blockers,
        truncated: false,
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  )
}
