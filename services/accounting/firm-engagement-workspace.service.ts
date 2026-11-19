import "server-only"
import { z } from "zod"
import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { lockFirmManagementAuthorityInTx } from "./close-evidence-acceptance-authority.service"
import { accountantScopeKeys, assertManagedAccountantAccess } from "./managed-accountant-access.service"
import type { FirmEngagementActor } from "./firm-engagement.service"

const querySchema = z.object({
  after: z.string().max(191).optional(),
  engagementId: z.string().min(1).max(191).optional(),
}).strict()

/** Firm-owned metadata only. Client work remains behind its existing delegated readers. */
export async function getFirmEngagementWorkspace(actor: FirmEngagementActor, raw: unknown) {
  const input = querySchema.parse(raw)
  return db.$transaction(async tx => {
    const authority = await lockFirmManagementAuthorityInTx(tx,
      { ...actor, organizationId: actor.homeOrganizationId, restrictOnly: true }, true)
    const now = new Date()
    const [rows, staff, managerGrants] = await Promise.all([
      tx.firmEngagement.findMany({ where: { firmOrganizationId: actor.homeOrganizationId, ...(input.after ? { id: { gt: input.after } } : {}) },
        orderBy: { id: "asc" }, take: 21, include: { client: { select: { name: true } } } }),
      tx.user.findMany({ where: { organizationId: actor.homeOrganizationId }, orderBy: { id: "asc" }, take: 101 }),
      tx.accountantAccessGrant.findMany({ where: { accountantUserId: actor.actorId, status: "ACTIVE", revokedAt: null, revokedById: null,
        effectiveFrom: { lte: now }, expiresAt: { gt: now } }, orderBy: { id: "asc" }, take: 101,
        include: { organization: { select: { name: true } } } }),
    ])
    const selected = input.engagementId ? await tx.firmEngagement.findFirst({
      where: { id: input.engagementId, firmOrganizationId: actor.homeOrganizationId },
      include: { client: { select: { name: true } }, assignments: { orderBy: { createdAt: "desc" } },
        grantLinks: true, transitions: { orderBy: { version: "asc" } } },
    }) : null
    if (input.engagementId && !selected) throw new ForbiddenError()
    const people = staff.slice(0, 100)
    const grants = selected ? await tx.accountantAccessGrant.findMany({ where: {
      organizationId: selected.clientOrganizationId, accountantUserId: { in: people.map(p => p.id) },
    }, orderBy: { createdAt: "desc" } }) : []
    const members = []
    for (const person of people) {
      const latestGrant = grants.find(g => g.accountantUserId === person.id)
      const assignment = selected?.assignments.find(a => a.accountantUserId === person.id && !a.endedAt)
      const grant = grants.find(g => g.accountantUserId === person.id && !g.revokedAt && !g.revokedById &&
        g.status === "ACTIVE" && g.effectiveFrom <= now && g.expiresAt > now &&
        accountantScopeKeys(g.organizationId, person.id).includes(g.activeScopeKey ?? ""))
      const link = grant && selected?.grantLinks.find(l => l.grantId === grant.id)
      let state = !isUsableAccount(person, now) ? "STAFF_UNAVAILABLE" : !grant ? "CLIENT_ACTION_REQUIRED" :
        !assignment ? "UNASSIGNED" : assignment.effectiveFrom > now || assignment.expiresAt <= now ? "ASSIGNMENT_OUTSIDE_WINDOW" :
        !link ? "ENROLLMENT_REQUIRED" : selected!.status !== "ACTIVE" ? selected!.status :
        selected!.effectiveFrom > now || selected!.expiresAt <= now ? "ENGAGEMENT_OUTSIDE_WINDOW" : "CURRENT_READ_ACCESS"
      if (state === "CURRENT_READ_ACCESS") {
        try {
          await assertManagedAccountantAccess({ homeOrganizationId: actor.homeOrganizationId,
            clientOrganizationId: selected!.clientOrganizationId, accountantUserId: person.id,
            grantId: grant!.id, activeScopeKey: grant!.activeScopeKey, capability: "READ" }, tx)
        } catch (error) {
          if (!(error instanceof ForbiddenError)) throw error
          state = "PERMISSION_OR_MODULE_REQUIRED"
        }
      }
      members.push({ id: person.id, name: person.name, email: person.email, usable: isUsableAccount(person, now), state,
        consentState: grant ? "ACTIVE" : !latestGrant ? "CLIENT_ACTION_REQUIRED" : latestGrant.revokedAt || latestGrant.revokedById || latestGrant.status === "REVOKED" ? "REVOKED" :
          latestGrant.expiresAt <= now ? "EXPIRED" : latestGrant.effectiveFrom > now ? "SCHEDULED" : "CLIENT_ACTION_REQUIRED",
        consentExpiresAt: (grant ?? latestGrant)?.expiresAt.toISOString() ?? null,
        assignment: assignment ? { id: assignment.id, version: assignment.version, scope: assignment.scope,
          effectiveFrom: assignment.effectiveFrom.toISOString(), expiresAt: assignment.expiresAt.toISOString() } : null,
        lastAssignmentVersion: Math.max(0, ...(selected?.assignments.filter(a => a.accountantUserId === person.id).map(a => a.version) ?? [])),
        grant: grant ? { id: grant.id, scope: grant.role, effectiveFrom: grant.effectiveFrom.toISOString(),
          expiresAt: grant.expiresAt.toISOString(), enrolled: !!link,
          linkedElsewhere: !!(await tx.firmEngagementGrantLink.findUnique({ where: { grantId: grant.id } })) && !link } : null })
    }
    const summary = (e: typeof rows[number]) => ({ id: e.id, clientId: e.clientOrganizationId, clientName: e.client.name,
      ownerId: e.ownerUserId, status: e.status, version: e.version, scope: e.scope,
      effectiveFrom: e.effectiveFrom.toISOString(), expiresAt: e.expiresAt.toISOString() })
    await authority.revalidate()
    return { asOf: new Date().toISOString(), actorId: actor.actorId,
      engagements: rows.slice(0, 20).map(summary), next: rows.length > 20 ? rows[19].id : null,
      partial: staff.length > 100 || managerGrants.length > 100,
      clients: managerGrants.slice(0, 100).filter(g => g.organizationId !== actor.homeOrganizationId &&
        accountantScopeKeys(g.organizationId, actor.actorId).includes(g.activeScopeKey ?? "")).map(g => ({
        id: g.organizationId, name: g.organization.name, effectiveFrom: g.effectiveFrom.toISOString(), expiresAt: g.expiresAt.toISOString() })),
      members, selected: selected ? { ...summary(selected),
        history: selected.transitions.map(t => ({ version: t.version, from: t.fromStatus, to: t.toStatus, actorId: t.actorId, reason: t.reason })),
        endedAssignments: selected.assignments.filter(a => a.endedAt).map(a => ({ id: a.id, userId: a.accountantUserId,
          endedById: a.endedById, endedAt: a.endedAt!.toISOString(), reason: a.endReason })),
      } : null }
  }, { isolationLevel: "ReadCommitted", timeout: 30000 })
}

export type FirmEngagementWorkspace = Awaited<ReturnType<typeof getFirmEngagementWorkspace>>

/** Redacted client-owned invitation delivery evidence. Never return envelopes or provider destinations. */
export async function getAccountantInvitationDelivery(actor: FirmEngagementActor) {
  return db.$transaction(async tx => {
    const authority = await lockFirmManagementAuthorityInTx(tx,
      { ...actor, organizationId: actor.homeOrganizationId, restrictOnly: true }, true)
    const invites = await tx.accountantClientInvite.findMany({ where: { organizationId: actor.homeOrganizationId },
      orderBy: { createdAt: "desc" }, take: 101,
      select: { id: true, redactedEmail: true, role: true, expiresAt: true, outboxId: true,
        states: { orderBy: { version: "desc" }, take: 1, select: { status: true } } } })
    const outboxes = await tx.businessEventOutbox.findMany({ where: { organizationId: actor.homeOrganizationId,
      id: { in: invites.map(i => i.outboxId) } }, select: { id: true, status: true, attempts: true, maxAttempts: true, availableAt: true } })
    await authority.revalidate()
    return { partial: invites.length > 100, rows: invites.slice(0, 100).map(i => {
      const delivery = outboxes.find(o => o.id === i.outboxId)
      return { id: i.id, email: i.redactedEmail, scope: i.role, acceptance: i.states[0]?.status ?? "UNKNOWN",
        expiresAt: i.expiresAt.toISOString(), delivery: delivery?.status ?? "UNKNOWN", attempts: delivery?.attempts ?? null,
        maxAttempts: delivery?.maxAttempts ?? null, retryAt: delivery?.status === "FAILED" ? delivery.availableAt.toISOString() : null }
    }) }
  })
}
