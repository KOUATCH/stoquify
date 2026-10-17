import "server-only"

import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { evaluateModuleEntitlement, getManagedModuleState } from "@/services/modules/module-entitlement.service"
import { getClientMissingCloseEvidenceRequestQueue } from "./missing-close-evidence-request-queue.service"
import { getAccountantMissingCloseEvidenceReviewQueue } from "./missing-close-evidence-accountant-review-queue.service"
import { MISSING_CLOSE_EVIDENCE_VISIBILITY } from "./missing-close-evidence-request-queue-contracts"
import { getCloseEvidenceReplacementInTx } from "./close-evidence-replacement.service"
import { closeEvidenceAfter, closeEvidenceNextCursor, readCloseEvidenceCursor, type CloseEvidencePage } from "./close-evidence-pagination"
import { readCloseEvidenceRequestTrackingInTx } from "./close-evidence-request-tracking"
import { readCloseEvidenceInvestigationInTx } from "./close-evidence-investigation"

export type CloseEvidenceActor = { organizationId: string; actorId: string }

async function readAssessments(actor: CloseEvidenceActor, periodId: string, ids: string[]) {
  const runs = ids.length ? await db.closeRun.findMany({
    where: { organizationId: actor.organizationId, periodId, id: { in: [...new Set(ids)] } },
    select: { id: true, asOf: true, createdAt: true },
  }) : []
  return Object.fromEntries(runs.map(run => [run.id, { asOf: run.asOf.toISOString(), recordedAt: run.createdAt.toISOString() }]))
}

/** Same-organization workbench. Identity comes only from the protected action. */
export async function assertCloseEvidenceActor(actor: CloseEvidenceActor, permission = "accounting.close.read", intent: "read" | "write" = "read") {
  const user = await db.user.findFirst({ where: { id: actor.actorId, organizationId: actor.organizationId }, include: { roles: true, organization: true } })
  const now = new Date()
  if (!user || !isUsableAccount(user, now) || !user.organization?.isActive || user.organization.deletedAt) throw new ForbiddenError()
  const permissions = expandPermissions(user.roles.filter(role => role.organizationId === actor.organizationId).flatMap(role => role.permissions))
  if (!hasRbacPermission(permissions, "accounting.close.read") || !hasRbacPermission(permissions, permission)) throw new ForbiddenError()
  const managed = await getManagedModuleState(actor.organizationId, db)
  const entitlement = evaluateModuleEntitlement({ organizationId: actor.organizationId, userId: actor.actorId, actorPermissions: permissions,
    moduleSlug: "close_assurance", accessIntent: intent, surface: "close-evidence-workflow", surfaceType: "action", mode: "enforce",
    requestedModules: user.organization.requestedModules, explicitEntitlements: managed.explicitEntitlements, now })
  if (!entitlement.allowed) throw new ForbiddenError()
  const writable = intent === "write" || evaluateModuleEntitlement({ organizationId: actor.organizationId, userId: actor.actorId, actorPermissions: permissions,
    moduleSlug: "close_assurance", accessIntent: "write", surface: "close-evidence-workflow", surfaceType: "action", mode: "enforce",
    requestedModules: user.organization.requestedModules, explicitEntitlements: managed.explicitEntitlements, now }).allowed
  return { permissions, writable }
}

export async function getCloseEvidenceWorkflow(actor: CloseEvidenceActor, periodId: string, page?: CloseEvidencePage) {
  const { permissions, writable } = await assertCloseEvidenceActor(actor)
  const period = await db.accountingPeriod.findFirst({ where: { id: periodId, organizationId: actor.organizationId }, select: { id: true } })
  if (!period) throw new NotFoundError("Accounting period not found")
  const canRequest = writable && hasRbacPermission(permissions, "accounting.close.evidence.request")
  const canRespond = writable && hasRbacPermission(permissions, "accounting.close.finding.comment")
  const canReview = hasRbacPermission(permissions, "accounting.close.accountant.review")
  const canTrack = hasRbacPermission(permissions, "accounting.close.evidence.request")
  const canReplace = canRequest && hasRbacPermission(permissions, "accounting.close.finding.assign")
  const canSupervise = canTrack && hasRbacPermission(permissions, "accounting.close.finding.assign")
  if (page?.kind === "supervision" && !canSupervise) throw new ForbiddenError()
  const wants = (kind: CloseEvidencePage["kind"]) => !page || page.kind === kind
  const scope = (kind: CloseEvidencePage["kind"]) => ({ ...actor, periodId, kind })
  const cursor = page ? readCloseEvidenceCursor(scope(page.kind), page.cursor) : null
  // Include historical assessments: a newer successful run does not erase their obligations.
  const findings = canRequest && wants("findings") ? await db.closeAssuranceFinding.findMany({ where: {
    organizationId: actor.organizationId, periodId, status: { in: ["OPEN", "ASSIGNED", "REOPENED"] },
    AND: [closeEvidenceAfter(cursor), { OR: [{ evidenceItems: { some: { available: false as const } } }, { checklistItem: { status: "UNAVAILABLE" as const } }, { checklistItem: { evidenceCount: 0 } }] },
      { comments: { none: { visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY } } }],
  }, select: { id: true, title: true, detail: true, closeRunId: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 101 }) : []
  const candidates = canRequest && wants("recipients") ? await db.user.findMany({ where: { organizationId: actor.organizationId, isActive: true,
    ...(cursor ? { id: { gt: cursor.id } } : {}) },
    include: { roles: true }, orderBy: { id: "asc" }, take: 101 }) : []
  const recipients = candidates.slice(0, 100).filter(user => isUsableAccount(user, new Date()) &&
    ["accounting.close.read", "accounting.close.finding.comment"].every(permission => hasRbacPermission(
      expandPermissions(user.roles.filter(role => role.organizationId === actor.organizationId).flatMap(role => role.permissions)), permission,
    ))).map(user => ({ id: user.id, name: user.name || user.id }))
  const assigned = wants("requests") ? await getClientMissingCloseEvidenceRequestQueue({ ...actor, actorPermissions: permissions, page: { periodId, cursor: page?.cursor } }) : null
  const review = canReview && wants("reviews") ? await getAccountantMissingCloseEvidenceReviewQueue({ homeOrganizationId: actor.organizationId, actorId: actor.actorId, actorPermissions: permissions, page: { periodId, cursor: page?.cursor } }) : null
  const tracking = canTrack && wants("tracking") ? await db.$transaction(tx => readCloseEvidenceRequestTrackingInTx(tx, actor, periodId, page?.cursor), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }) : null
  const supervision = canSupervise && wants("supervision") ? await db.$transaction(tx => readCloseEvidenceRequestTrackingInTx(tx, actor, periodId, page?.cursor, true), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }) : null
  const assessments = await readAssessments(actor, periodId, [...findings.slice(0, 100).map(row => row.closeRunId),
    ...(assigned?.requests ?? []).map(row => row.closeRunId), ...(review?.items ?? []).map(row => row.closeRunId), ...(tracking?.items ?? []).map(row => row.closeRunId), ...(supervision?.items ?? []).map(row => row.closeRunId)])
  const latest = await assertCloseEvidenceActor(actor)
  if ((writable && !latest.writable) ||
      (canRequest && !hasRbacPermission(latest.permissions, "accounting.close.evidence.request")) ||
      (canRespond && !hasRbacPermission(latest.permissions, "accounting.close.finding.comment")) ||
      (canReview && !hasRbacPermission(latest.permissions, "accounting.close.accountant.review"))) throw new ForbiddenError()
  if (canTrack && !hasRbacPermission(latest.permissions, "accounting.close.evidence.request")) throw new ForbiddenError()
  if (canSupervise && !hasRbacPermission(latest.permissions, "accounting.close.finding.assign")) throw new ForbiddenError()
  return { organizationId: actor.organizationId, actorId: actor.actorId, periodId, generatedAt: new Date().toISOString(), writable, canRequest, canRespond, canReview, canTrack, canReplace, canSupervise, assessments, tracking: tracking?.items ?? [], supervision: supervision?.items ?? [],
    findings: findings.slice(0, 100), recipients, requests: assigned?.requests.filter(item => item.period.id === periodId) ?? [],
    reviews: review?.items.filter(item => item.period.id === periodId) ?? [],
    cursors: { findings: closeEvidenceNextCursor(scope("findings"), findings.length > 100 ? findings[99] : undefined),
      recipients: closeEvidenceNextCursor(scope("recipients"), candidates.length > 100 ? candidates[99] : undefined),
      requests: assigned?.nextCursor ?? null, reviews: review?.nextCursor ?? null, tracking: tracking?.nextCursor ?? null, supervision: supervision?.nextCursor ?? null },
    evidenceIssue: !!assigned?.blockers.length || !!review?.blockers.length || !!tracking?.evidenceIssue || !!supervision?.evidenceIssue,
    partial: findings.length > 100 || candidates.length > 100 || !!assigned?.nextCursor || !!review?.nextCursor || !!tracking?.nextCursor || !!tracking?.evidenceIssue || !!supervision?.nextCursor || !!supervision?.evidenceIssue || !!assigned?.summary.truncated || !!assigned?.blockers.length || !!review?.summary.truncated || !!review?.blockers.length }
}

export async function getCloseEvidenceReview(actor: CloseEvidenceActor, requestId: string) {
  const { permissions, writable } = await assertCloseEvidenceActor(actor, "accounting.close.accountant.review")
  const queue = await getAccountantMissingCloseEvidenceReviewQueue({ homeOrganizationId: actor.organizationId, actorId: actor.actorId, actorPermissions: permissions, requestId })
  const item = queue.items.find(row => row.request.requestId === requestId)
  if (!item) throw new NotFoundError("Response unavailable; refresh the evidence workbench")
  const preview = await db.$transaction(tx => getCloseEvidenceReplacementInTx(tx, actor.organizationId, item.findingId), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  const replacement = preview.status === "AVAILABLE" ? { status: preview.status, selection: preview.selection, observedAt: preview.observedAt,
    checklistKey: preview.checklistKey, controlStatus: preview.controlStatus, recoveredEvidenceCount: preview.recoveredEvidenceCount } : preview
  const assessments = await readAssessments(actor, item.period.id, [item.closeRunId])
  await assertCloseEvidenceActor(actor, "accounting.close.accountant.review")
  return { item, replacement, assessments, canAccept: writable && item.response.respondedById !== actor.actorId }
}

export type CloseEvidenceWorkflow = Awaited<ReturnType<typeof getCloseEvidenceWorkflow>>
export type CloseEvidenceReview = Awaited<ReturnType<typeof getCloseEvidenceReview>>

export async function getCloseEvidenceInvestigation(actor: CloseEvidenceActor, periodId: string, requestId: string) {
  await assertCloseEvidenceActor(actor, "accounting.close.accountant.review")
  const result = await db.$transaction(tx => readCloseEvidenceInvestigationInTx(tx, actor.organizationId, periodId, requestId, actor.actorId), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  await assertCloseEvidenceActor(actor, "accounting.close.accountant.review")
  return result
}
