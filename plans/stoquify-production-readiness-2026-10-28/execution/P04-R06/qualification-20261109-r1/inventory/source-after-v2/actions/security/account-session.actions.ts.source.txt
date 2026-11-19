"use server"
import { requireSession } from "@/lib/security/auth-session"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { getAccountSessionPreview, revokeReviewedAccountSessions } from "@/services/security/account-session.service"
import type { AccountSessionCommand } from "@/services/security/account-session-input"

async function currentScope() {
  const verified = await requireSession()
  return { actorId: verified.ctx.userId, organizationId: verified.ctx.orgId, sessionId: verified.claims.sessionId, sessionToken: verified.claims.sessionToken }
}
export async function getAccountSessionPreviewAction() {
  try { return { success: true as const, data: await getAccountSessionPreview(await currentScope()) } }
  catch (error) { return safeSuccessActionErrorResult(error, { action: "account.sessions.read" }, "Your sessions could not be loaded.") }
}
export async function revokeReviewedAccountSessionsAction(input: AccountSessionCommand) {
  try { return { success: true as const, data: await revokeReviewedAccountSessions(await currentScope(), input) } }
  catch (error) { return safeSuccessActionErrorResult(error, { action: "account.sessions.revoke" }, "The sign-out result could not be confirmed.") }
}
