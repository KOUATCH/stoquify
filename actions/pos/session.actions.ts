"use server"

import { revalidateTag } from "next/cache"
import { logger } from "@/lib/logger"
import { err, ok } from "@/services/_shared/action-response"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { closePOSShift, getActivePOSSession, openPOSShift } from "@/services/pos/pos.service"
import { activePOSSessionSchema, closeShiftSchema, openShiftSchema } from "@/services/pos/pos.schemas"

function revalidatePOSSessionTags(tags: string[]) {
  for (const tag of tags) {
    try {
      revalidateTag(tag)
    } catch (error) {
      logger.warn("POS session cache revalidation failed after a committed operation", {
        tag,
        error: error instanceof Error ? error.message : "unknown",
      })
    }
  }
}

export async function getActivePOSSessionAction(input: unknown) {
  try {
    const parsed = activePOSSessionSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.read", {
      resource: "POSSession",
      resourceId: parsed.terminalId,
    })
    const session = await getActivePOSSession({ ...parsed, organizationId: orgId, userId })
    return ok(session)
  } catch (error) {
    return err(error)
  }
}

export async function openPOSShiftAction(input: unknown) {
  try {
    const parsed = openShiftSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.session.start", {
      resource: "POSSession",
      resourceId: parsed.terminalId,
      auditAllowed: true,
    })
    const session = await openPOSShift({ ...parsed, organizationId: orgId, userId })

    revalidatePOSSessionTags(["pos-sessions", `pos-terminal-${parsed.terminalId}`])

    return ok(session)
  } catch (error) {
    return err(error)
  }
}

export async function closePOSShiftAction(input: unknown) {
  try {
    const parsed = closeShiftSchema.parse(input)
    const ctx = await requirePermission("pos.session.end", {
      resource: "POSSession",
      resourceId: parsed.sessionId,
      auditAllowed: true,
    })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "pos",
      surfaceType: "action",
      surface: "actions/pos/session.actions.ts:closePOSShiftAction",
      accessIntent: "write",
      mode: "observe",
      audit: true,
    })
    const result = await closePOSShift({ ...parsed, organizationId: ctx.orgId, userId: ctx.userId })

    revalidatePOSSessionTags(["pos-sessions", `pos-terminal-${result.terminalId}`])

    return ok(result)
  } catch (error) {
    return err(error)
  }
}
