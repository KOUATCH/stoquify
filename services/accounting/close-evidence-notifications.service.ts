import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { assertCloseEvidenceActor, type CloseEvidenceActor } from "./close-evidence-workflow.service"
import { readCloseEvidenceRecipient } from "./close-evidence-recipient.service"
import { MISSING_CLOSE_EVIDENCE_VISIBILITY } from "./missing-close-evidence-request-queue-contracts"

export const closeEvidenceNotificationsInput = z.object({ periodId: z.string().trim().min(1).max(200),
  before: z.object({ publishedAt: z.string().datetime(), id: z.string().min(1).max(200) }).strict().optional() }).strict()
export async function getCloseEvidenceNotifications(actor: CloseEvidenceActor, input: z.input<typeof closeEvidenceNotificationsInput>) {
  const { periodId, before } = closeEvidenceNotificationsInput.parse(input)
  const authority = await assertCloseEvidenceActor(actor)
  const review = hasRbacPermission(authority.permissions, "accounting.close.accountant.review")
  const result = await db.$transaction(async tx => {
    if (!await tx.accountingPeriod.findFirst({ where: { id: periodId, organizationId: actor.organizationId }, select: { id: true } })) throw new NotFoundError("Accounting period not found")
    const rows = await tx.closeEvidenceNotification.findMany({ where: { organizationId: actor.organizationId, periodId,
      ...(before ? { OR: [{ publishedAt: { lt: new Date(before.publishedAt) } }, { publishedAt: new Date(before.publishedAt), id: { lt: before.id } }] } : {}) },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take: 51 })
    const items: Array<{ id: string; requestId: string; eventName: string; publishedAt: string }> = []
    let evidenceIssue = false
    for (const row of rows.slice(0, 50)) {
      const request = await tx.accountantComment.findFirst({ where: { id: row.requestId, organizationId: actor.organizationId, periodId, findingId: row.findingId, visibility: MISSING_CLOSE_EVIDENCE_VISIBILITY } })
      if (!request) { evidenceIssue = true; continue }
      // Historical assignment does not confer present access. In particular,
      // response notifications target current reviewers, not a departed author.
      if (!review) {
        if (row.eventName === "close.assurance.missing_evidence.response_submitted") continue
        const assignment = await readCloseEvidenceRecipient(tx, request)
        if (assignment.recipientId !== actor.actorId) continue
      }
      items.push({ id: row.id, requestId: row.requestId, eventName: row.eventName, publishedAt: row.publishedAt.toISOString() })
    }
    const last = rows[49]
    return { items, evidenceIssue, next: rows.length > 50 ? { publishedAt: last.publishedAt.toISOString(), id: last.id } : null }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  const latest = await assertCloseEvidenceActor(actor)
  if (review && !hasRbacPermission(latest.permissions, "accounting.close.accountant.review")) throw new ForbiddenError()
  return { ...result, organizationId: actor.organizationId, actorId: actor.actorId, periodId, generatedAt: new Date().toISOString() }
}
export type CloseEvidenceNotifications = Awaited<ReturnType<typeof getCloseEvidenceNotifications>>
