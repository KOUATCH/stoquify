"use server"

import { revalidateTag } from "next/cache"
import { err, ok } from "@/services/_shared/action-response"
import { requireOrg } from "@/services/_shared/require-org"
import { closePOSShift, getActivePOSSession, openPOSShift } from "@/services/pos/pos.service"
import { activePOSSessionSchema, closeShiftSchema, openShiftSchema } from "@/services/pos/pos.schemas"

export async function getActivePOSSessionAction(input: unknown) {
  try {
    const { orgId } = await requireOrg()
    const parsed = activePOSSessionSchema.parse(input)
    const session = await getActivePOSSession({ ...parsed, organizationId: orgId })
    return ok(session)
  } catch (error) {
    return err(error)
  }
}

export async function openPOSShiftAction(input: unknown) {
  try {
    const { orgId, userId } = await requireOrg()
    const parsed = openShiftSchema.parse(input)
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
    const { orgId, userId } = await requireOrg()
    const parsed = closeShiftSchema.parse(input)
    const result = await closePOSShift({ ...parsed, organizationId: orgId, userId })

    revalidateTag("pos-sessions")
    revalidateTag(`pos-terminal-${result.terminalId}`)

    return ok(result)
  } catch (error) {
    return err(error)
  }
}
