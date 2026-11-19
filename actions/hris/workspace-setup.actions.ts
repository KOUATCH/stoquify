"use server"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { revalidatePath } from "next/cache"
import { protect } from "@/services/_shared/protect"
import { executeWorkspaceSetup, getWorkspaceSetup } from "@/services/hris/workspace-setup.service"

const read = protect<unknown, Awaited<ReturnType<typeof getWorkspaceSetup>>>({permission: "hris.people.read", tenantGuard: "handler-derived", module: {moduleSlug: "payroll", surface: "hris.workspace-setup.read", accessIntent: "read", mode: "enforce"}}, async (_input, ctx) => getWorkspaceSetup({organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions}))
const write = protect<unknown, unknown>({permission: "hris.people.read", freshAuth: true, tenantGuard: "handler-derived", auditResource: "HrisWorkspaceSetup", module: {moduleSlug: "payroll", surface: "hris.workspace-setup.write", accessIntent: "write", mode: "enforce"}}, async (input, ctx) => {
  if (!ctx.freshAuth || ctx.freshAuth.claims.userId !== ctx.userId || ctx.freshAuth.claims.tenantId !== ctx.orgId) throw new ForbiddenError("Your organization session changed. Reload before saving.")
  const result = await executeWorkspaceSetup({organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions}, input)
  revalidatePath("/[locale]/dashboard/people/setup", "page")
  return result
})
export async function getWorkspaceSetupAction() { return read(undefined) }
export async function executeWorkspaceSetupAction(input: unknown) { return write(input) }
