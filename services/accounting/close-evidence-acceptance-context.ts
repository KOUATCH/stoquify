import "server-only"

import { FreshAuthRequiredError, requireSession, SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
import type { ProtectedActionContext } from "@/services/_shared/protect"
import { AuthRequiredError } from "@/services/_shared/action-errors"

/** Request/response need a live session, without imposing acceptance's password step-up. */
export async function closeEvidenceWorkControl(ctx: ProtectedActionContext) {
  const { claims } = await requireSession()
  if (claims.userId !== ctx.userId || claims.tenantId !== ctx.orgId || !claims.sessionId || !claims.sessionToken) throw new AuthRequiredError()
  return { actorId: ctx.userId, actorPermissions: ctx.permissions, session: { id: claims.sessionId, token: claims.sessionToken } }
}

/** Internal action adapter. Never derive session proof or surface controls from a form. */
export function closeEvidenceAcceptanceControl(ctx: ProtectedActionContext, requireWorkDeskAccess = false) {
  const fresh = ctx.freshAuth
  if (!fresh || fresh.claims.userId !== ctx.userId || fresh.claims.tenantId !== ctx.orgId ||
      fresh.claims.assuranceOrganizationId !== ctx.orgId || !Number.isFinite(fresh.claims.assuranceLevel) ||
      fresh.claims.assuranceLevel < SESSION_ASSURANCE_LEVEL.PASSWORD ||
      !Number.isFinite(fresh.lastAuthAt.getTime()) || fresh.claims.lastAuthAt !== fresh.lastAuthAt.getTime() ||
      !fresh.claims.sessionId?.trim() || !fresh.claims.sessionToken?.trim()) {
    throw new FreshAuthRequiredError()
  }
  return {
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
    session: { id: fresh.claims.sessionId, token: fresh.claims.sessionToken },
    requireWorkDeskAccess,
    freshAuth: { actorId: ctx.userId, organizationId: ctx.orgId, lastAuthAt: fresh.lastAuthAt },
  }
}
