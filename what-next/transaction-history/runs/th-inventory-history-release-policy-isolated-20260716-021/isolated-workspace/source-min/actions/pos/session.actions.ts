"use server"

import { revalidateTag } from "next/cache"
import { err, ok } from "@/services/_shared/action-response"
import { requirePermission } from "@/lib/security/rbac"
import { closePOSShift, getActivePOSSession, openPOSShift } from "@/services/pos/pos.service"
import { activePOSSessionSchema, closeShiftSchema, openShiftSchema } from "@/services/pos/pos.schemas"

export async function getActivePOSSessionAction(input: unknown) {
  try {
    const parsed = activePOSSessionSchema.parse(input)
    const { orgId } = await requirePermission("pos.read", {
      resource: "POSSession",
      resourceId: parsed.terminalId,
    })
    const session = await getActivePOSSession({ ...parsed, organizationId: orgId })
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

    revalidateTag("pos-sessions")
    revalidateTag(`pos-terminal-${parsed.terminalId}`)

    return ok(session)
  } catch (error) {
    return err(error)
  }
}

export async function closePOSShiftAction(input: unknown) {
  try {
    const parsed = closeShiftSchema.parse(input)
    const { orgId, userId } = await requirePermission("pos.session.end", {
      resource: "POSSession",
      resourceId: parsed.sessionId,
      auditAllowed: true,
    })
    const result = await closePOSShift({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-sessions")
    revalidateTag(`pos-terminal-${result.terminalId}`)

    return ok(result)
  } catch (error) {
    return err(error)
  }
}
