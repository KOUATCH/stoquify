import "server-only"

import { AccountantAccessStatus, Prisma } from "@prisma/client"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { resolveAccountantClientAccess } from "./accountant-access.service"
import { getAccountantMissingCloseEvidenceReviewQueue } from "./missing-close-evidence-accountant-review-queue.service"
import { MISSING_CLOSE_EVIDENCE_REQUEST_TYPE, MISSING_CLOSE_EVIDENCE_VISIBILITY, MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY } from "./missing-close-evidence-request-queue-contracts"
import {
  ACCOUNTANT_WORK_DESK_CLIENT_LIMIT,
  type AccountantWorkDesk,
  type AccountantWorkDetail,
  type AccountantWorkItem,
} from "./accountant-work-desk.contracts"

type WorkDeskActor = {
  homeOrganizationId: string
  actorId: string
  actorPermissions: readonly string[]
}

// Called only inside the desk's before/after client authorization boundary.
// Keep pending requests redacted and reject ambiguous or contradictory history.
async function pendingRequests(organizationId: string) {
  const findings = await db.closeAssuranceFinding.findMany({
    where: { organizationId, status: { in: ["OPEN", "ASSIGNED", "REOPENED"] }, comments: { some: { organizationId, visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY } } },
    select: {
      id: true, periodId: true, closeRunId: true, ownerId: true, domain: true, severity: true,
      period: { select: { name: true } },
      comments: {
        where: { organizationId, visibility: { in: [MISSING_CLOSE_EVIDENCE_VISIBILITY, MISSING_CLOSE_EVIDENCE_RESPONSE_VISIBILITY] } },
        select: { id: true, organizationId: true, periodId: true, closeRunId: true, findingId: true, authorId: true, visibility: true, body: true, correlationId: true, metadata: true },
        orderBy: { id: "asc" }, take: 3,
      },
    }, orderBy: { id: "asc" }, take: 101,
  })
  if (findings.length > 100) return { items: [], incomplete: true }
  let incomplete = false
  const items = findings.flatMap(finding => {
    const request = finding.comments[0]
    const meta = request?.metadata as Prisma.JsonObject | null
    const dueAt = typeof meta?.dueAt === "string" ? meta.dueAt : ""
    if (finding.comments.length !== 1 || !request || request.visibility !== MISSING_CLOSE_EVIDENCE_VISIBILITY ||
        request.organizationId !== organizationId || request.periodId !== finding.periodId || request.closeRunId !== finding.closeRunId ||
        meta?.requestType !== MISSING_CLOSE_EVIDENCE_REQUEST_TYPE || request.findingId !== finding.id ||
        !request.authorId || meta?.requestedById !== request.authorId || !finding.ownerId || meta?.requestedFromId !== finding.ownerId ||
        !request.correlationId || meta?.correlationId !== request.correlationId || !request.body.trim() || !Number.isFinite(Date.parse(dueAt))) {
      incomplete = true
      return []
    }
    return [{ findingId: finding.id, requestId: request.id, correlationId: request.correlationId, requestedById: request.authorId, dueAt, periodName: finding.period.name, domain: finding.domain, severity: finding.severity }]
  })
  return { items, incomplete }
}

function notificationKey(findingId: string, correlationId: string) {
  return `close-assurance-finding:${findingId}:missing-evidence-requested:${correlationId}:notification`
}

async function assertActor(actor: WorkDeskActor) {
  if (!hasRbacPermission(actor.actorPermissions, "accounting.audit.read") ||
      !hasRbacPermission(actor.actorPermissions, "accounting.close.accountant.review")) {
    throw new ForbiddenError("Accountant review access is required.")
  }
  const active = await db.user.findFirst({
    where: { id: actor.actorId, organizationId: actor.homeOrganizationId, isActive: true },
    select: { id: true },
  })
  if (!active) throw new ForbiddenError("Active accountant membership is required.")
}

export async function assertAccountantWorkClient(
  actor: WorkDeskActor,
  clientOrganizationId: string,
  intent: "read" | "write" = "read",
) {
  await assertActor(actor)
  const access = await resolveAccountantClientAccess({
    homeOrganizationId: actor.homeOrganizationId,
    clientOrganizationId,
    accountantUserId: actor.actorId,
    capability: "REVIEW",
  })
  const moduleAccess = await observeModuleAccess({
    organizationId: access.organizationId,
    userId: actor.actorId,
    actorPermissions: actor.actorPermissions,
    moduleSlug: "close_assurance",
    surfaceType: "action",
    surface: "accountant-work-desk",
    accessIntent: intent,
    mode: "enforce",
    audit: false,
  })
  if (!moduleAccess.allowed) throw new ForbiddenError("Client review access is unavailable.")
}

export async function getAccountantWorkDesk(
  actor: WorkDeskActor,
  afterGrantId?: string,
): Promise<AccountantWorkDesk> {
  await assertActor(actor)
  const now = new Date()
  const grants = await db.accountantAccessGrant.findMany({
    where: {
      accountantUserId: actor.actorId,
      status: AccountantAccessStatus.ACTIVE,
      role: { in: ["REVIEWER", "PREPARER"] },
      effectiveFrom: { lte: now },
      expiresAt: { gt: now },
      activeScopeKey: { not: null },
      organization: { isActive: true, deletedAt: null },
      ...(afterGrantId ? { id: { gt: afterGrantId } } : {}),
    },
    select: { id: true, organizationId: true, organization: { select: { name: true } } },
    orderBy: { id: "asc" },
    take: ACCOUNTANT_WORK_DESK_CLIENT_LIMIT + 1,
  })
  const page = grants.slice(0, ACCOUNTANT_WORK_DESK_CLIENT_LIMIT)
  const result: AccountantWorkDesk = {
    generatedAt: now.toISOString(), scope: "OPEN_EVIDENCE_IN_CLIENT_PAGE",
    clientsRead: 0, unavailableClients: 0, incompleteClients: 0,
    nextCursor: grants.length > page.length ? page[page.length - 1]!.id : null,
    items: [],
  }
  // Sequential, bounded reads avoid a pool burst across many client transactions.
  for (const grant of page) {
    try {
      await assertAccountantWorkClient(actor, grant.organizationId)
      const queue = await getAccountantMissingCloseEvidenceReviewQueue({
        ...actor, clientOrganizationId: grant.organizationId,
      })
      const pending = await pendingRequests(grant.organizationId)
      const keys = [...queue.items.map(item => notificationKey(item.findingId, item.request.correlationId)),
        ...pending.items.map(item => notificationKey(item.findingId, item.correlationId))]
      const notifications = keys.length ? await db.businessEventOutbox.findMany({
        where: { organizationId: grant.organizationId, channel: "NOTIFICATION", eventName: "close.assurance.missing_evidence.requested", idempotencyKey: { in: keys } },
        select: { idempotencyKey: true, status: true }, take: 200,
      }) : []
      const delivery = new Map(notifications.map(item => [item.idempotencyKey, item.status]))
      // Recheck after the snapshot; a revoked/expired mandate must not leak the result.
      await assertAccountantWorkClient(actor, grant.organizationId)
      result.clientsRead += 1
      if (queue.summary.invalidEvidence > 0 || queue.summary.truncated || pending.incomplete) result.incompleteClients += 1
      result.items.push(...queue.items.map((item): AccountantWorkItem => ({
        clientOrganizationId: grant.organizationId,
        clientName: grant.organization.name,
        requestId: item.request.requestId,
        periodName: item.period.name,
        domain: item.finding.domain,
        severity: item.finding.severity,
        dueAt: item.request.dueAt,
        submittedAt: item.response.submittedAt,
        owner: "ACCOUNTANT_REVIEW_TEAM",
        requestedByYou: item.request.requestedById === actor.actorId,
        evidenceState: "RESPONSE_SUBMITTED",
        delivery: delivery.get(notificationKey(item.findingId, item.request.correlationId)) ?? "UNKNOWN",
        urgency: Date.parse(item.request.dueAt) <= now.getTime() ? "OVERDUE"
          : Date.parse(item.request.dueAt) <= now.getTime() + 72 * 60 * 60 * 1000 ? "DUE_SOON" : "SCHEDULED",
        nextAction: "REVIEW_RESPONSE",
      })))
      result.items.push(...pending.items.map((item): AccountantWorkItem => ({
        clientOrganizationId: grant.organizationId, clientName: grant.organization.name,
        requestId: item.requestId, periodName: item.periodName, domain: item.domain, severity: item.severity,
        dueAt: item.dueAt, submittedAt: null, owner: "CLIENT_RECIPIENT", requestedByYou: item.requestedById === actor.actorId,
        evidenceState: "AWAITING_RESPONSE", delivery: delivery.get(notificationKey(item.findingId, item.correlationId)) ?? "UNKNOWN",
        urgency: Date.parse(item.dueAt) <= now.getTime() ? "OVERDUE" : Date.parse(item.dueAt) <= now.getTime() + 72 * 60 * 60 * 1000 ? "DUE_SOON" : "SCHEDULED",
        nextAction: "AWAIT_RESPONSE",
      })))
    } catch (error) {
      if (!(error instanceof ForbiddenError)) throw error
      // Do not expose even the client's name when current authorization is lost.
      result.unavailableClients += 1
    }
  }
  const rank = { OVERDUE: 0, DUE_SOON: 1, SCHEDULED: 2 }
  result.items.sort((a, b) => rank[a.urgency] - rank[b.urgency] ||
    Date.parse(a.dueAt) - Date.parse(b.dueAt) ||
    a.clientOrganizationId.localeCompare(b.clientOrganizationId) || a.requestId.localeCompare(b.requestId))
  return result
}

export async function getAccountantWorkDetail(
  actor: WorkDeskActor,
  clientOrganizationId: string,
  requestId: string,
): Promise<AccountantWorkDetail> {
  await assertAccountantWorkClient(actor, clientOrganizationId)
  const queue = await getAccountantMissingCloseEvidenceReviewQueue({ ...actor, clientOrganizationId })
  await assertAccountantWorkClient(actor, clientOrganizationId)
  const item = queue.items.find((candidate) => candidate.request.requestId === requestId)
  if (!item) throw new NotFoundError("This response is no longer available for review. Refresh the work desk.")
  return { clientOrganizationId, generatedAt: queue.generatedAt, item }
}
