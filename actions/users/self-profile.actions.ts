"use server"
import { requireSession } from "@/lib/security/auth-session"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { getSelfProfile, updateSelfProfile } from "@/services/users/self-profile.service"
import type { SelfProfileCommand } from "@/services/users/self-profile-input"

async function scope() {
  const verified = await requireSession()
  return { actorId: verified.ctx.userId, organizationId: verified.ctx.orgId, sessionId: verified.claims.sessionId, sessionToken: verified.claims.sessionToken }
}
export async function getSelfProfileAction() {
  try { return { success: true as const, data: await getSelfProfile(await scope()) } }
  catch (error) { return safeSuccessActionErrorResult(error, { action: "self-profile.read" }, "Your profile could not be loaded.") }
}
export async function updateSelfProfileAction(input: SelfProfileCommand) {
  try { return { success: true as const, data: await updateSelfProfile(await scope(), input) } }
  catch (error) { return safeSuccessActionErrorResult(error, { action: "self-profile.update" }, "Your profile update could not be confirmed.") }
}
