"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import { postHrisLeaveBalanceEntry } from "@/services/hris/leave-balance.service"

const postBalance = protect<
  unknown,
  Awaited<ReturnType<typeof postHrisLeaveBalanceEntry>>
>({
  permission: "hris.people.manage",
  auditResource: "HrisLeaveBalanceEntry",
  freshAuth: true,
  tenantGuard: "handler-derived",
}, async (input, context) => {
  const fields = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
  const result = await postHrisLeaveBalanceEntry({
    ...fields,
    organizationId: context.orgId,
    actorId: context.userId,
    actorPermissions: context.permissions,
  } as never)
  revalidatePath("/dashboard/people/me", "page")
  revalidatePath("/[locale]/dashboard/people/me", "page")
  return result
})

export const postHrisLeaveBalanceEntryAction = (input: unknown) =>
  postBalance(input)
