"use server"
import { requireRbacContext } from "@/lib/security/rbac"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { ApplicationError, ForbiddenError } from "@/services/_shared/action-errors"
import { submitAccessRequest, listAccessRequests, withdrawAccessRequest, previewAccessRequest, decideAccessRequest, applyAccessRequest, accessRequestReturnPath, readAccessRequestHistory, AccessRequestModuleUnavailable } from "@/services/access-requests/access-request.service"

// Never return exception text: it may originate from a DB, grant or module adapter.
function failure(error: unknown) {
  if (error instanceof AccessRequestModuleUnavailable) return { success: false as const, reason: "module" as const }
  const code = error && typeof error === "object" && "code" in error ? error.code : null
  if (code === "UNAUTHENTICATED" || code === "AUTH_REQUIRED") return { success: false as const, reason: "session" as const }
  if (code === "NO_ACTIVE_ORG") return { success: false as const, reason: "organization" as const }
  return { success: false as const, reason: error instanceof ApplicationError && error.code === "FRESH_AUTH_REQUIRED" ? "fresh-auth" as const
    : error instanceof ApplicationError && ["CONFLICT", "IDEMPOTENCY_CONFLICT"].includes(error.code) ? "stale" as const
    : error instanceof ForbiddenError ? "restricted" as const : "unavailable" as const }
}

export async function submitAccessRequestAction(input: unknown) {
  try { return { success: true as const, data: await submitAccessRequest(await requireRbacContext(), input) } } catch (error) { return failure(error) }
}
export async function listAccessRequestsAction(input: unknown) {
  try { return { success: true as const, data: await listAccessRequests(await requireRbacContext(), input) } } catch (error) { return failure(error) }
}
export async function readAccessRequestHistoryAction(input: unknown) {
  try { return { success: true as const, data: await readAccessRequestHistory(await requireRbacContext(), input) } } catch (error) { return failure(error) }
}
export async function withdrawAccessRequestAction(input: unknown) {
  try { return { success: true as const, data: await withdrawAccessRequest(await requireRbacContext(), input) } } catch (error) { return failure(error) }
}
export async function previewAccessRequestAction(input: unknown) {
  try { return { success: true as const, data: await previewAccessRequest(await requireRbacContext(), input) } } catch (error) { return failure(error) }
}
export async function decideAccessRequestAction(input: unknown) {
  try { return { success: true as const, data: await decideAccessRequest(await requireRbacContext(), input) } } catch (error) { return failure(error) }
}
export async function applyAccessRequestAction(input: unknown) {
  try {
    const verified = await requireFreshAuth(300), ctx = await requireRbacContext()
    if (verified.claims.userId !== ctx.userId || verified.claims.tenantId !== ctx.orgId) throw new ForbiddenError()
    const data = await applyAccessRequest(ctx, input, { id: verified.claims.sessionId, token: verified.claims.sessionToken })
    return { success: true as const, data }
  } catch (error) { return failure(error) }
}
export async function accessRequestReturnPathAction(id: string) {
  try { return { success: true as const, data: await accessRequestReturnPath(await requireRbacContext(), id) } } catch (error) { return failure(error) }
}
