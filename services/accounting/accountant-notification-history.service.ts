import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { assertAccountantWorkClient } from "./accountant-work-desk.service"

const id = z.string().trim().min(1).max(200)
export const accountantNotificationHistoryInput = z.object({ clientOrganizationId: id, cursor: z.string().min(1).max(2000).optional() }).strict()
const cursorSchema = z.object({ version: z.literal(1), homeOrganizationId: id, clientOrganizationId: id, actorId: id, id, publishedAt: z.string().datetime() }).strict()
type Actor = Parameters<typeof assertAccountantWorkClient>[0]
const eventNames = ["close.assurance.missing_evidence.requested", "close.assurance.missing_evidence.response_submitted", "close.assurance.missing_evidence.response_accepted"] as const

/** Historical publication only. Closed/accepted work is deliberately included.
 * Current delegated REVIEW access is checked before and after every page. */
export async function getAccountantNotificationHistory(actor: Actor, input: z.input<typeof accountantNotificationHistoryInput>) {
  const { clientOrganizationId, cursor } = accountantNotificationHistoryInput.parse(input)
  await assertAccountantWorkClient(actor, clientOrganizationId)
  const scope = { version: 1 as const, homeOrganizationId: actor.homeOrganizationId, clientOrganizationId, actorId: actor.actorId }
  let position: z.infer<typeof cursorSchema> | null = null
  if (cursor) {
    try {
      position = cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")))
      if (Object.entries(scope).some(([key, value]) => position?.[key as keyof typeof scope] !== value)) throw new Error()
    } catch { throw new BusinessRuleError("This notification history page is no longer valid. Refresh the client history.") }
  }
  const result = await db.$transaction(async tx => {
    const client = await tx.organization.findFirst({ where: { id: clientOrganizationId, isActive: true, deletedAt: null }, select: { name: true } })
    if (!client) throw new ForbiddenError()
    const rows = await tx.closeEvidenceNotification.findMany({ where: { organizationId: clientOrganizationId,
      ...(position ? { OR: [{ publishedAt: { lt: new Date(position.publishedAt) } }, { publishedAt: new Date(position.publishedAt), id: { lt: position.id } }] } : {}) },
      include: { outbox: { select: { eventName: true, payloadHash: true } } }, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take: 51 })
    const page = rows.slice(0, 50)
    const requests = page.length ? await tx.accountantComment.findMany({ where: { organizationId: clientOrganizationId, id: { in: [...new Set(page.map(row => row.requestId))] }, visibility: "CLIENT_ACTION_REQUIRED" },
      select: { id: true, organizationId: true, periodId: true, findingId: true } }) : []
    const periods = page.length ? await tx.accountingPeriod.findMany({ where: { organizationId: clientOrganizationId, id: { in: [...new Set(page.map(row => row.periodId))] } }, select: { id: true, name: true } }) : []
    const requestById = new Map(requests.map(row => [row.id, row])), periodById = new Map(periods.map(row => [row.id, row.name]))
    let incomplete = false
    const items = page.flatMap(row => {
      const request = requestById.get(row.requestId), periodName = periodById.get(row.periodId)
      if (!request || !periodName || request.organizationId !== clientOrganizationId || request.periodId !== row.periodId || request.findingId !== row.findingId ||
        row.outbox.eventName !== row.eventName || row.outbox.payloadHash !== row.payloadHash || !eventNames.some(name => name === row.eventName)) { incomplete = true; return [] }
      return [{ id: row.id, requestId: row.requestId, periodId: row.periodId, periodName, eventName: row.eventName as typeof eventNames[number], publishedAt: row.publishedAt.toISOString() }]
    })
    const last = page.at(-1)
    return { clientName: client.name, items, incomplete, nextCursor: rows.length > 50 && last ? Buffer.from(JSON.stringify({ ...scope, id: last.id, publishedAt: last.publishedAt.toISOString() })).toString("base64url") : null }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  await assertAccountantWorkClient(actor, clientOrganizationId)
  return { ...result, clientOrganizationId, generatedAt: new Date().toISOString() }
}
export type AccountantNotificationHistory = Awaited<ReturnType<typeof getAccountantNotificationHistory>>
