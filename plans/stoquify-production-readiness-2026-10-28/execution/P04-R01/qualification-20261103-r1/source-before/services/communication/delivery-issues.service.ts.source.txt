import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import type { RbacContext } from "@/lib/security/rbac"
import { hasAllRbacPermissions } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { evaluateRoleGrantPolicy } from "@/services/security/role-grant-policy.service"
import { readCurrentInvitationIssuer } from "@/services/users/user-invitation-authority.service"
import { hasInvitationGrantEvidence, invitationDeliveryPayload, invitationDigest, USER_INVITATION_DELIVERY, USER_INVITATION_EVENT } from "@/services/users/user-invitation-delivery-contract"
import { deliveryIssuesInput, deliveryReason, deliveryStatus, matchesDeliveryState, type DeliveryIssue, type DeliveryIssuePage, type DeliveryIssuesQuery, type DeliveryIssuesResult, type DeliverySource } from "./delivery-issues-contracts"

type Actor = Pick<RbacContext, "orgId" | "userId" | "permissions">
const PAGE_SIZE = 20
const SCAN_SIZE = 100
async function withinSourceBudget<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Source unavailable")), 6000)
    })])
  } finally { clearTimeout(timer) }
}
const permissions = {
  statements: ["accounting.exports.create", "customers.read"],
  invitations: ["users.read", "users.invite", "users.roles.assign"],
} as const
const empty = (source: DeliverySource, availability: DeliveryIssuePage["availability"]): DeliveryIssuePage => ({ source, availability, rows: [], nextCursor: null, windowLimited: false })
const before = (anchor: { id: string; createdAt: Date } | null) => anchor ? {
  OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }],
} : {}
const dateRange = (query: DeliveryIssuesQuery) => ({
  ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
  ...(query.through ? { lt: new Date(new Date(`${query.through}T00:00:00.000Z`).getTime() + 86400000) } : {}),
})

// Evaluate state filters only after reading source truth and validating invitation
// evidence. Bound each scan; a sparse window must never imply no older matches.
export function deliveryWindow(source: DeliverySource, candidates: DeliveryIssue[], query: DeliveryIssuesQuery): DeliveryIssuePage {
  const rows: DeliveryIssue[] = []
  let consumed = 0
  for (const candidate of candidates.slice(0, SCAN_SIZE)) {
    consumed++
    if (matchesDeliveryState(candidate.state, query.state)) rows.push(candidate)
    if (rows.length === PAGE_SIZE) break
  }
  const more = candidates.length > consumed
  return { source, availability: "ready", rows, nextCursor: more ? candidates[consumed - 1].id : null, windowLimited: more && rows.length < PAGE_SIZE }
}

export async function readDeliveryIssues(ctx: Actor, input: unknown): Promise<DeliveryIssuesResult> {
  if (!ctx.orgId || !ctx.userId) throw new ForbiddenError("An active organization is required.")
  const query = deliveryIssuesInput.parse(input)
  const sources: DeliverySource[] = query.source === "all" ? ["statements", "invitations"] : [query.source]
  const pages = await Promise.all(sources.map(async source => {
    if (!hasAllRbacPermissions(ctx.permissions, permissions[source])) return empty(source, "restricted")
    try {
      return await withinSourceBudget((async () => {
        const access = await observeModuleAccess({ organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions,
          moduleSlug: source === "statements" ? "accounting" : "settings", surfaceType: "action", surface: "delivery-issues",
          accessIntent: "read", mode: source === "statements" ? "enforce" : "observe", audit: false })
        if (!access.allowed) return empty(source, "restricted")
        return db.$transaction(async tx => {
          await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`
          return source === "statements" ? statements(tx, ctx, query) : invitations(tx, ctx, query)
        }, { isolationLevel: "RepeatableRead", maxWait: 500, timeout: 5000 })
      })())
    } catch {
      return empty(source, "unavailable")
    }
  }))
  return { checkedAt: new Date().toISOString(), pages }
}

async function statements(tx: Prisma.TransactionClient, ctx: Actor, query: DeliveryIssuesQuery) {
  const scope: Prisma.CustomerStatementDeliveryWhereInput = {
    organizationId: ctx.orgId,
    statementSnapshot: { organizationId: ctx.orgId, customer: { organizationId: ctx.orgId } },
    ...(query.channel !== "all" ? { channel: query.channel } : {}), createdAt: dateRange(query),
  }
  const anchor = query.statementCursor ? await tx.customerStatementDelivery.findFirst({
    where: { ...scope, id: query.statementCursor }, select: { id: true, createdAt: true },
  }) : null
  if (query.statementCursor && !anchor) throw new Error("Unavailable cursor")
  const rows = await tx.customerStatementDelivery.findMany({
    where: { ...scope, ...before(anchor) }, take: SCAN_SIZE + 1, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true, channel: true, redactedDestination: true, createdAt: true, outboxId: true,
      statementSnapshot: { select: { customerId: true, statementNumber: true } },
      states: { where: { organizationId: ctx.orgId }, orderBy: { version: "desc" }, take: 1, select: { status: true, errorCode: true, occurredAt: true } },
    },
  })
  const queues = rows.length ? await tx.businessEventOutbox.findMany({ where: { organizationId: ctx.orgId, id: { in: rows.map(row => row.outboxId) } }, select: { id: true, attempts: true } }) : []
  return deliveryWindow("statements", rows.map(row => {
    const latest = row.states[0]
    const state = deliveryStatus(latest?.status, latest?.errorCode)
    return { id: row.id, reference: row.statementSnapshot.statementNumber, recipient: row.redactedDestination,
      channel: row.channel, recordedAt: row.createdAt.toISOString(), checkedAt: (latest?.occurredAt ?? row.createdAt).toISOString(),
      state, attempts: queues.find(queue => queue.id === row.outboxId)?.attempts ?? null, reason: deliveryReason(state, latest?.errorCode),
      // The dedicated statement route has the same read/export authority as
      // this adapter; the analytics profile has a different permission set.
      sourceHref: `/dashboard/customers/${encodeURIComponent(row.statementSnapshot.customerId)}/statement` }
  }), query)
}

type InvitationCandidate = { id: string; recordedAt: Date; inviteId: string; email: string }
async function invitations(tx: Prisma.TransactionClient, ctx: Actor, query: DeliveryIssuesQuery): Promise<DeliveryIssuePage> {
  // The source history rechecks stored grants and the target role. Perform the
  // same checks before selecting events, resolving cursors or exposing counts.
  const reviewer = await readCurrentInvitationIssuer(tx, { organizationId: ctx.orgId, actorId: ctx.userId, role: { organizationId: ctx.orgId, permissions: [] } })
  if (!reviewer || !hasAllRbacPermissions(reviewer.permissions, permissions.invitations)) return empty("invitations", "restricted")
  const roles = await tx.role.findMany({ where: { organizationId: ctx.orgId }, select: { id: true, organizationId: true, permissions: true }, take: 1001, orderBy: { id: "asc" } })
  // Do not return a silently incomplete authorization universe.
  if (roles.length > 1000) throw new Error("Role inventory exceeds bounded review")
  const allowed = roles.filter(role => [ctx.permissions, reviewer.permissions].every(actorPermissions => evaluateRoleGrantPolicy({
    actorOrganizationId: ctx.orgId, actorPermissions, targetRole: role,
  }).allowed)).map(role => role.id)
  if (!allowed.length || query.channel === "WHATSAPP") return empty("invitations", "ready")
  const scope = Prisma.sql`e."organizationId" = ${ctx.orgId} AND i."organizationId" = ${ctx.orgId}
    AND i."roleId" IN (${Prisma.join(allowed)}) AND e."eventType" = ${USER_INVITATION_EVENT}
    ${query.from ? Prisma.sql`AND e."recordedAt" >= ${`${query.from}T00:00:00.000Z`}::timestamp` : Prisma.empty}
    ${query.through ? Prisma.sql`AND e."recordedAt" < ${new Date(new Date(`${query.through}T00:00:00.000Z`).getTime() + 86400000).toISOString()}::timestamp` : Prisma.empty}`
  const anchors = query.invitationCursor ? await tx.$queryRaw<InvitationCandidate[]>(Prisma.sql`
    SELECT e.id, e."recordedAt" FROM business_events e JOIN invites i ON i.id = e."sourceId"
    WHERE ${scope} AND e.id = ${query.invitationCursor} LIMIT 1`) : []
  const anchor = anchors[0]
  if (query.invitationCursor && !anchor) throw new Error("Unavailable cursor")
  const candidates = await tx.$queryRaw<InvitationCandidate[]>(Prisma.sql`
    SELECT e.id, e."recordedAt", i.id AS "inviteId", i.email FROM business_events e JOIN invites i ON i.id = e."sourceId"
    WHERE ${scope} ${anchor ? Prisma.sql`AND (e."recordedAt", e.id) < (SELECT prior."recordedAt", prior.id FROM business_events prior WHERE prior."organizationId" = ${ctx.orgId} AND prior.id = ${anchor.id})` : Prisma.empty}
    ORDER BY e."recordedAt" DESC, e.id DESC LIMIT ${SCAN_SIZE + 1}`)
  const events = candidates.length ? await tx.businessEvent.findMany({ where: { organizationId: ctx.orgId, id: { in: candidates.map(row => row.id) } },
    select: { id: true, eventSource: true, schemaVersion: true, actorId: true, status: true, payload: true, payloadHash: true, idempotencyKey: true,
      outboxMessages: { where: { organizationId: ctx.orgId, channel: "EMAIL", eventName: USER_INVITATION_DELIVERY }, take: 2,
        select: { status: true, attempts: true, updatedAt: true, lastErrorCode: true, payload: true, payloadHash: true, idempotencyKey: true } } },
  }) : []
  return deliveryWindow("invitations", candidates.map(row => {
    const event = events.find(event => event.id === row.id)
    const payload = invitationDeliveryPayload.safeParse(event?.payload)
    const valid = event && payload.success && payload.data.organizationId === ctx.orgId && payload.data.inviteId === row.inviteId
      && payload.data.actorId === event.actorId && event.eventSource === "API" && event.schemaVersion === 1 && event.status === "APPLIED"
      && hashBusinessPayload(event.payload) === event.payloadHash && hasInvitationGrantEvidence(payload.data)
    const queued = event?.outboxMessages.length === 1 ? event.outboxMessages[0] : null
    const delivery = valid && queued && queued.idempotencyKey === event.idempotencyKey && queued.payloadHash === event.payloadHash && hashBusinessPayload(queued.payload) === event.payloadHash ? queued : null
    const state = delivery ? deliveryStatus(delivery.status, delivery.lastErrorCode) : "unknown"
    return { id: row.id, reference: row.inviteId, recipient: valid && payload.data.recipientHash === invitationDigest(row.email) ? maskRecipient(row.email) : "•••", channel: "EMAIL",
      recordedAt: row.recordedAt.toISOString(), checkedAt: (delivery?.updatedAt ?? row.recordedAt).toISOString(), state,
      attempts: delivery?.attempts ?? null, reason: !delivery ? "invalidEvidence" : deliveryReason(state, delivery.lastErrorCode),
      sourceHref: "/dashboard/settings/users" }
  }), query)
}

function maskRecipient(email: string) {
  // Reveal no domain, token, payload or arbitrary provider error.
  return email.includes("@") ? `${email.slice(0, 1)}•••@•••` : "•••"
}
