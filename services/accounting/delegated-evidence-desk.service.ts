import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { assertAccountantWorkClient, type WorkDeskActor } from "./accountant-work-desk.service"
import { resolveAccountantClientAccess } from "./accountant-access.service"
import { closeEvidenceAfter, closeEvidenceNextCursor, readCloseEvidenceCursor } from "./close-evidence-pagination"
import { readCloseEvidenceRequestTrackingInTx } from "./close-evidence-request-tracking"
import { MISSING_CLOSE_EVIDENCE_VISIBILITY } from "./missing-close-evidence-request-queue-contracts"

const id = z.string().trim().min(1).max(191)
export const delegatedEvidenceInput = z.object({
  clientOrganizationId: id, periodId: id.optional(), afterPeriodId: id.optional(),
  page: z.object({ kind: z.enum(["findings", "recipients", "tracking", "supervision"]), cursor: z.string().min(1).max(2000) }).strict().optional(),
}).strict().refine(v => !v.page || !!v.periodId, "Select a period before continuing.")

/** Existing typed payment collector; recovering a source never signs reconciliation. */
export function delegatedEvidenceCase(checklist: { key: string; domain: string; sourceService: string } | null) {
  return checklist?.key === "payment-reconciliation" && checklist.domain === "PAYMENT_RECONCILIATION" &&
    ["services/reconciliation/payment-close-evidence.service.ts", "services/reconciliation/payment-reconciliation-dashboard.service.ts"].includes(checklist.sourceService)
    ? "SETTLEMENT_PROOF" as const : "MISSING_CLOSE_EVIDENCE" as const
}

export async function getDelegatedEvidenceDesk(actor: WorkDeskActor, raw: unknown) {
  const input = delegatedEvidenceInput.parse(raw), clientId = input.clientOrganizationId
  if (!actor.session) throw new ForbiddenError()
  const authorize = async () => {
    await assertAccountantWorkClient(actor, clientId)
    await resolveAccountantClientAccess({ homeOrganizationId: actor.homeOrganizationId, clientOrganizationId: clientId,
      accountantUserId: actor.actorId, capability: "REVIEW", permission: "accounting.close.evidence.request" })
  }
  await authorize()
  const member = await db.user.findFirstOrThrow({ where: { id: actor.actorId, organizationId: actor.homeOrganizationId }, include: { roles: true } })
  const permissions = expandPermissions(member.roles.filter(r => r.organizationId === actor.homeOrganizationId).flatMap(r => r.permissions))
  const canSupervise = hasRbacPermission(permissions, "accounting.close.finding.assign")
  if (input.page?.kind === "supervision" && !canSupervise) throw new ForbiddenError()
  const periods = await db.accountingPeriod.findMany({ where: { organizationId: clientId, ...(input.afterPeriodId ? { id: { gt: input.afterPeriodId } } : {}) },
    select: { id: true, name: true }, orderBy: { id: "asc" }, take: 21 })
  const period = input.periodId ? await db.accountingPeriod.findFirst({ where: { id: input.periodId, organizationId: clientId }, select: { id: true, name: true } }) : null
  if (input.periodId && !period) throw new NotFoundError("Accounting period unavailable.")
  const scope = (kind: "findings" | "recipients" | "tracking" | "supervision") => ({ organizationId: clientId, actorId: actor.actorId, periodId: period?.id ?? "", kind })
  const cursor = input.page ? readCloseEvidenceCursor(scope(input.page.kind), input.page.cursor) : null
  const wants = (kind: string) => !!period && (!input.page || input.page.kind === kind)
  // Same eligibility and history rules as the client evidence workbench; no new case writer.
  const findings = wants("findings") ? await db.closeAssuranceFinding.findMany({ where: {
    organizationId: clientId, periodId: period!.id, status: { in: ["OPEN", "ASSIGNED", "REOPENED"] },
    AND: [closeEvidenceAfter(cursor), { OR: [{ evidenceItems: { some: { available: false as const } } }, { checklistItem: { status: "UNAVAILABLE" as const } }, { checklistItem: { evidenceCount: 0 } }] },
      { comments: { none: { visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY } } }],
  }, select: { id: true, title: true, closeRunId: true, createdAt: true, checklistItem: { select: { key: true, domain: true, sourceService: true } } },
  orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 101 }) : []
  const users = wants("recipients") ? await db.user.findMany({ where: { organizationId: clientId, isActive: true,
    ...(cursor ? { id: { gt: cursor.id } } : {}) }, include: { roles: true }, orderBy: { id: "asc" }, take: 101 }) : []
  const recipients = users.slice(0, 100).filter(u => isUsableAccount(u, new Date()) &&
    ["accounting.close.read", "accounting.close.finding.comment"].every(p => hasRbacPermission(
      expandPermissions(u.roles.filter(r => r.organizationId === clientId).flatMap(r => r.permissions)), p)))
    .map(u => ({ id: u.id, name: u.name || u.id }))
  const tracking = wants("tracking") ? await db.$transaction(tx => readCloseEvidenceRequestTrackingInTx(tx, scope("tracking"), period!.id, input.page?.cursor),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }) : null
  const supervision = canSupervise && wants("supervision") ? await db.$transaction(tx => readCloseEvidenceRequestTrackingInTx(tx, scope("supervision"), period!.id, input.page?.cursor, true),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }) : null
  const grant = await db.accountantAccessGrant.findFirst({ where: { organizationId: clientId, accountantUserId: actor.actorId,
    status: "ACTIVE", revokedAt: null, activeScopeKey: { not: null } }, select: { id: true } })
  const link = grant ? await db.firmEngagementGrantLink.findUnique({ where: { grantId: grant.id },
    select: { engagement: { select: { id: true, status: true, scope: true, expiresAt: true } } } }) : null
  const writeScope = { userId: actor.actorId, actorPermissions: permissions, surfaceType: "action" as const,
    surface: "accountant-work-desk", accessIntent: "write" as const, mode: "enforce" as const, audit: false }
  const homeWrite = await observeModuleAccess({ ...writeScope, organizationId: actor.homeOrganizationId, moduleSlug: "accounting" })
  const clientWrite = await observeModuleAccess({ ...writeScope, organizationId: clientId, moduleSlug: "close_assurance" })
  await authorize()
  if (canSupervise) {
    const latest = await db.user.findFirstOrThrow({ where: { id: actor.actorId, organizationId: actor.homeOrganizationId }, include: { roles: true } })
    if (!hasRbacPermission(expandPermissions(latest.roles.filter(r => r.organizationId === actor.homeOrganizationId).flatMap(r => r.permissions)), "accounting.close.finding.assign")) throw new ForbiddenError()
  }
  const cursors = { findings: closeEvidenceNextCursor(scope("findings"), findings.length > 100 ? findings[99] : undefined),
    recipients: closeEvidenceNextCursor(scope("recipients"), users.length > 100 ? users[99] : undefined),
    tracking: tracking?.nextCursor ?? null, supervision: supervision?.nextCursor ?? null }
  return { actorId: actor.actorId, clientOrganizationId: clientId, period, periods: periods.slice(0, 20),
    nextPeriod: periods.length > 20 ? periods[19].id : null, generatedAt: new Date().toISOString(), canSupervise,
    writable: homeWrite.allowed && clientWrite.allowed,
    engagement: link ? { ...link.engagement, expiresAt: link.engagement.expiresAt.toISOString() } : null,
    findings: findings.slice(0, 100).map(f => ({ id: f.id, title: f.title, closeRunId: f.closeRunId, caseKind: delegatedEvidenceCase(f.checklistItem) })),
    recipients, tracking: tracking?.items ?? [], supervision: supervision?.items ?? [], cursors,
    partial: Object.values(cursors).some(Boolean) || !!tracking?.evidenceIssue || !!supervision?.evidenceIssue }
}
export type DelegatedEvidenceDesk = Awaited<ReturnType<typeof getDelegatedEvidenceDesk>>
