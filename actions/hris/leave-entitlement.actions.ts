"use server"
import { revalidatePath } from "next/cache"
import { protect } from "@/services/_shared/protect"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { requestLeaveCancellation, decideLeaveCancellation, executeHrisLeaveEntitlements, getManagedLeaveWorkspace } from "@/services/hris/leave-entitlement.service"
import { postHrisLeaveBalanceEntry } from "@/services/hris/leave-balance.service"

function boundary<T>(permission: string, surface: string, operation: (input: any) => Promise<T>, accessIntent: "read" | "write" = "write") {
  return protect<unknown, T>({ permission, freshAuth: true, tenantGuard: "handler-derived",
    module: { moduleSlug: "payroll", surface, accessIntent, mode: "enforce" } }, async (input, ctx) => {
    if (ctx.freshAuth?.claims.userId !== ctx.userId || ctx.freshAuth?.claims.tenantId !== ctx.orgId) throw new ForbiddenError("Refresh your session before continuing.")
    const fields = input && typeof input === "object" && !Array.isArray(input) ? input : {}
    const result = await operation({ ...fields, organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions })
    if (accessIntent === "write") {
      revalidatePath("/[locale]/dashboard/people/me", "page")
      revalidatePath("/[locale]/dashboard/people/leave", "page")
    }
    return result
  })
}
const cancel = boundary("hris.self_service.request", "hris.leave.cancel.request", requestLeaveCancellation)
const decide = boundary("hris.people.manage", "hris.leave.cancel.decide", decideLeaveCancellation)
const execute = boundary("hris.people.manage", "hris.leave.entitlements.execute", executeHrisLeaveEntitlements)
const read = boundary("hris.people.manage", "hris.leave.workspace", getManagedLeaveWorkspace, "read")
const adjust = boundary("hris.people.manage", "hris.leave.adjust", async input => {
  if (typeof input.reason !== "string" || input.reason.trim().length < 8) throw new ForbiddenError("A meaningful adjustment reason is required.")
  return postHrisLeaveBalanceEntry({ ...input, entryType: "MANUAL_ADJUSTMENT", sourceType: "HRIS_REVIEWED_ADJUSTMENT", sourceId: input.idempotencyKey })
})
export async function requestLeaveCancellationAction(input: unknown) { return cancel(input) }
export async function decideLeaveCancellationAction(input: unknown) { return decide(input) }
export async function executeHrisLeaveEntitlementsAction(input: unknown) { return execute(input) }
export async function getManagedLeaveWorkspaceAction(input: unknown) { return read(input) }
export async function adjustHrisLeaveBalanceAction(input: unknown) { return adjust(input) }
