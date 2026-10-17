import "server-only"

import { AccountantAccessStatus, Prisma } from "@prisma/client"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { db } from "@/prisma/db"
import { BusinessRuleError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { resolveAccountantClientAccess } from "./accountant-access.service"
import { getCloseEvidenceReplacementInTx } from "./close-evidence-replacement.service"
import { getAccountantMissingCloseEvidenceReviewQueue } from "./missing-close-evidence-accountant-review-queue.service"
import { MISSING_CLOSE_EVIDENCE_REQUEST_TYPE, MISSING_CLOSE_EVIDENCE_VISIBILITY } from "./missing-close-evidence-request-queue-contracts"
import { closeEvidenceAfter, closeEvidenceNextCursor, readCloseEvidenceCursor } from "./close-evidence-pagination"
import { readCloseEvidenceRecipient } from "./close-evidence-recipient.service"
import { closeHistoryVisibilities, readResolvedCloseEvidence } from "./close-evidence-resolution-records"
import {
  ACCOUNTANT_WORK_DESK_CLIENT_LIMIT,
  type AccountantWorkDesk,
  type AccountantWorkDetail,
  type AccountantWorkItem,
  type AccountantWorkClientPage,
} from "./accountant-work-desk.contracts"

type WorkDeskActor = {
  homeOrganizationId: string
  actorId: string
  actorPermissions: readonly string[]
}

// Called only inside the desk's before/after client authorization boundary.
// Keep pending requests redacted and reject ambiguous or contradictory history.
async function pendingRequests(organizationId: string, actorId: string, after?: string) {
  return db.$transaction(async tx => {
  const scope = { organizationId, actorId, periodId: "", kind: "requests" as const }
  const cursor = readCloseEvidenceCursor(scope, after)
  const findings = await tx.closeAssuranceFinding.findMany({
    where: { organizationId, ...closeEvidenceAfter(cursor), status: { in: ["OPEN", "ASSIGNED", "REOPENED"] }, comments: { some: { organizationId, visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY } } },
    select: {
      id: true, periodId: true, closeRunId: true, ownerId: true, domain: true, severity: true, createdAt: true,
      period: { select: { name: true } },
      comments: {
        where: { organizationId, visibility: { in: closeHistoryVisibilities } },
        select: { id: true, organizationId: true, periodId: true, closeRunId: true, findingId: true, authorId: true, visibility: true, body: true, correlationId: true, metadata: true, createdAt: true },
        orderBy: { id: "asc" }, take: 3,
      },
    }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 101,
  })
  const visible = findings.slice(0, 100)
  const nextCursor = closeEvidenceNextCursor(scope, findings.length > 100 ? visible.at(-1) : undefined)
  let incomplete = false
  const items = (await Promise.all(visible.map(async finding => {
    let comments
    try { comments = (await readResolvedCloseEvidence(tx, organizationId, finding.id))?.records ?? finding.comments }
    catch (error) { if (!(error instanceof BusinessRuleError)) throw error; incomplete = true; return [] }
    const request = comments[0]
    const meta = request?.metadata as Prisma.JsonObject | null
    const dueAt = typeof meta?.dueAt === "string" ? meta.dueAt : ""
    if (comments.length !== 1 || !request || request.visibility !== MISSING_CLOSE_EVIDENCE_VISIBILITY ||
        request.organizationId !== organizationId || request.periodId !== finding.periodId || request.closeRunId !== finding.closeRunId ||
        meta?.requestType !== MISSING_CLOSE_EVIDENCE_REQUEST_TYPE || request.findingId !== finding.id ||
        !request.authorId || meta?.requestedById !== request.authorId || !finding.ownerId ||
        !request.correlationId || meta?.correlationId !== request.correlationId || !request.body.trim() || !Number.isFinite(Date.parse(dueAt))) {
      incomplete = true
      return []
    }
    let assignment
    try { assignment = await readCloseEvidenceRecipient(tx, request) }
    catch (error) { if (!(error instanceof BusinessRuleError)) throw error; incomplete = true; return [] }
    if (assignment.recipientId !== finding.ownerId) { incomplete = true; return [] }
    const key = assignment.sequence > 0
      ? `close-evidence-recipient:${request.id}:${assignment.changeCorrelationId}:notification`
      : notificationKey(finding.id, request.correlationId)
    return [{ findingId: finding.id, periodId: finding.periodId, requestId: request.id, notificationKey: key, requestedById: request.authorId, dueAt, periodName: finding.period.name, domain: finding.domain, severity: finding.severity }]
  }))).flat()
  return { items, incomplete, nextCursor }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

function notificationKey(findingId: string, correlationId: string) {
  return `close-assurance-finding:${findingId}:missing-evidence-requested:${correlationId}:notification`
}

function responseNotificationKey(requestId: string, correlationId: string) {
  return `close-assurance-missing-evidence-request:${requestId}:response-submitted:${correlationId}:notification`
}

async function assertActor(actor: WorkDeskActor) {
  if (!hasRbacPermission(actor.actorPermissions, "accounting.audit.read") ||
      !hasRbacPermission(actor.actorPermissions, "accounting.close.accountant.review")) {
    throw new ForbiddenError("Accountant review access is required.")
  }
  const active = await db.user.findFirst({
    where: { id: actor.actorId, organizationId: actor.homeOrganizationId, isActive: true },
    include: { roles: true, organization: true },
  })
  if (!active || !isUsableAccount(active, new Date()) || !active.organization.isActive || active.organization.deletedAt) throw new ForbiddenError("Active accountant membership is required.")
  const permissions = expandPermissions(active.roles.filter(role => role.organizationId === actor.homeOrganizationId).flatMap(role => role.permissions))
  if (!["accounting.audit.read", "accounting.close.accountant.review"].every(permission => hasRbacPermission(permissions, permission))) throw new ForbiddenError("Current accountant review access is required.")
  const homeModule = await observeModuleAccess({ organizationId: actor.homeOrganizationId, userId: actor.actorId, actorPermissions: permissions,
    moduleSlug: "accounting", surfaceType: "action", surface: "accountant-work-desk", accessIntent: "read", mode: "enforce", audit: false })
  if (!homeModule.allowed) throw new ForbiddenError("Accountant workspace access is unavailable.")
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
    items: [], clientContinuations: [],
  }
  // Sequential, bounded reads avoid a pool burst across many client transactions.
  for (const grant of page) {
    try {
      const client = await readClientWork(actor, grant.organizationId, grant.organization.name)
      result.clientsRead += 1
      result.incompleteClients += client.incompleteClients
      result.items.push(...client.items)
      result.clientContinuations.push(...client.clientContinuations)
    } catch (error) {
      if (!(error instanceof ForbiddenError)) throw error
      // Do not expose even the client's name when current authorization is lost.
      result.unavailableClients += 1
    }
  }
  // A home-role/module revocation during the last client read also invalidates
  // metadata collected earlier in this aggregate response.
  await assertActor(actor)
  sortWorkItems(result.items)
  return result
}

async function readClientWork(actor: WorkDeskActor, clientOrganizationId: string, clientName: string, page?: AccountantWorkClientPage): Promise<AccountantWorkDesk> {
  await assertAccountantWorkClient(actor, clientOrganizationId)
  const now = new Date()
  const grant = { organizationId: clientOrganizationId, organization: { name: clientName } }
  const result: AccountantWorkDesk = { generatedAt: now.toISOString(), scope: "OPEN_EVIDENCE_IN_CLIENT_PAGE", clientsRead: 1, unavailableClients: 0, incompleteClients: 0, nextCursor: null, items: [], clientContinuations: [] }
  const queue = !page || page.kind === "reviews" ? await getAccountantMissingCloseEvidenceReviewQueue({
    ...actor, clientOrganizationId: grant.organizationId, page: { cursor: page?.cursor },
  }) : { items: [], nextCursor: null, summary: { invalidEvidence: 0, truncated: false } }
  const pending = !page || page.kind === "requests" ? await pendingRequests(grant.organizationId, actor.actorId, page?.cursor) : { items: [], incomplete: false, nextCursor: null }
  const requestKeys = pending.items.map(item => item.notificationKey)
  const responseKeys = queue.items.map(item => responseNotificationKey(item.request.requestId, item.response.correlationId))
  const keys = [...requestKeys, ...responseKeys]
  const notifications = keys.length ? await db.businessEventOutbox.findMany({
    where: { organizationId: grant.organizationId, channel: "NOTIFICATION", OR: [
      { eventName: "close.assurance.missing_evidence.requested", idempotencyKey: { in: requestKeys } },
      { eventName: "close.assurance.missing_evidence.response_submitted", idempotencyKey: { in: responseKeys } },
    ] },
    select: { eventName: true, idempotencyKey: true, status: true, payloadHash: true,
      closeEvidenceNotification: { select: { organizationId: true, periodId: true, findingId: true, requestId: true, responseId: true, eventName: true, payloadHash: true, publishedAt: true } } }, take: 200,
  }) : []
  const delivery = new Map(notifications.map(item => [`${item.eventName}:${item.idempotencyKey}`, item.status]))
  const byKey = new Map(notifications.map(item => [`${item.eventName}:${item.idempotencyKey}`, item]))
  let publicationIssue = false
  const publication = (eventName: string, key: string, periodId: string, findingId: string, requestId: string, responseId: string | null) => {
    const source = byKey.get(`${eventName}:${key}`), record = source?.closeEvidenceNotification
    if (!record) return null
    if (record.organizationId !== clientOrganizationId || record.periodId !== periodId || record.findingId !== findingId || record.requestId !== requestId ||
      record.responseId !== responseId || record.eventName !== eventName || record.payloadHash !== source.payloadHash) { publicationIssue = true; return null }
    return { publishedAt: record.publishedAt.toISOString() }
  }
  // Recheck after the snapshot; a revoked/expired mandate must not leak the result.
  await assertAccountantWorkClient(actor, grant.organizationId)
  if (queue.summary.invalidEvidence > 0 || queue.summary.truncated || pending.incomplete) result.incompleteClients += 1
  result.clientContinuations.push({ clientOrganizationId, clientName, requests: pending.nextCursor ?? null, reviews: queue.nextCursor ?? null })
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
    delivery: delivery.get(`close.assurance.missing_evidence.response_submitted:${responseNotificationKey(item.request.requestId, item.response.correlationId)}`) ?? "UNKNOWN",
    publication: publication("close.assurance.missing_evidence.response_submitted", responseNotificationKey(item.request.requestId, item.response.correlationId), item.period.id, item.findingId, item.request.requestId, item.response.responseId),
    urgency: Date.parse(item.request.dueAt) <= now.getTime() ? "OVERDUE"
      : Date.parse(item.request.dueAt) <= now.getTime() + 72 * 60 * 60 * 1000 ? "DUE_SOON" : "SCHEDULED",
    nextAction: "REVIEW_RESPONSE",
  })))
  result.items.push(...pending.items.map((item): AccountantWorkItem => ({
    clientOrganizationId: grant.organizationId, clientName: grant.organization.name,
    requestId: item.requestId, periodName: item.periodName, domain: item.domain, severity: item.severity,
    dueAt: item.dueAt, submittedAt: null, owner: "CLIENT_RECIPIENT", requestedByYou: item.requestedById === actor.actorId,
    evidenceState: "AWAITING_RESPONSE", delivery: delivery.get(`close.assurance.missing_evidence.requested:${item.notificationKey}`) ?? "UNKNOWN",
    publication: publication("close.assurance.missing_evidence.requested", item.notificationKey, item.periodId, item.findingId, item.requestId, null),
    urgency: Date.parse(item.dueAt) <= now.getTime() ? "OVERDUE" : Date.parse(item.dueAt) <= now.getTime() + 72 * 60 * 60 * 1000 ? "DUE_SOON" : "SCHEDULED",
    nextAction: "AWAIT_RESPONSE",
  })))
  if (publicationIssue && !result.incompleteClients) result.incompleteClients += 1
  sortWorkItems(result.items)
  return result
}

function sortWorkItems(items: AccountantWorkItem[]) {
  const rank = { OVERDUE: 0, DUE_SOON: 1, SCHEDULED: 2 }
  items.sort((a, b) => rank[a.urgency] - rank[b.urgency] ||
    Date.parse(a.dueAt) - Date.parse(b.dueAt) ||
    a.clientOrganizationId.localeCompare(b.clientOrganizationId) || a.requestId.localeCompare(b.requestId))
}

export async function getAccountantWorkClientPage(actor: WorkDeskActor, page: AccountantWorkClientPage): Promise<AccountantWorkDesk> {
  await assertAccountantWorkClient(actor, page.clientOrganizationId)
  const client = await db.organization.findFirst({ where: { id: page.clientOrganizationId, isActive: true, deletedAt: null }, select: { name: true } })
  if (!client) throw new ForbiddenError("Client review access is unavailable.")
  return readClientWork(actor, page.clientOrganizationId, client.name, page)
}

export async function getAccountantWorkDetail(
  actor: WorkDeskActor,
  clientOrganizationId: string,
  requestId: string,
): Promise<AccountantWorkDetail> {
  await assertAccountantWorkClient(actor, clientOrganizationId)
  const queue = await getAccountantMissingCloseEvidenceReviewQueue({ ...actor, clientOrganizationId, requestId })
  const item = queue.items.find((candidate) => candidate.request.requestId === requestId)
  if (!item) throw new NotFoundError("This response is no longer available for review. Refresh the work desk.")
  const preview = await db.$transaction(tx => getCloseEvidenceReplacementInTx(tx, clientOrganizationId, item.findingId),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  await assertAccountantWorkClient(actor, clientOrganizationId)
  const replacement = preview.status === "AVAILABLE"
    ? { status: preview.status, reason: preview.reason, selection: preview.selection, checklistKey: preview.checklistKey,
      domain: preview.domain, controlStatus: preview.controlStatus, observedAt: preview.observedAt, recoveredEvidenceCount: preview.recoveredEvidenceCount }
    : preview
  return { clientOrganizationId, generatedAt: queue.generatedAt, item, replacement }
}
