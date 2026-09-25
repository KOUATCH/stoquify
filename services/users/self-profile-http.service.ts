import "server-only"
import { requireSession } from "@/lib/security/auth-session"
import { buildTrustedOrigins } from "@/lib/security/trusted-origins"
import { ApplicationError, toSafeActionError } from "@/services/_shared/action-errors"
import { selfProfileCommand } from "./self-profile-input"
import { getSelfProfile, updateSelfProfile } from "./self-profile.service"

const headers = { "Cache-Control": "private, no-store" }
async function scope() {
  const verified = await requireSession()
  return { actorId: verified.ctx.userId, organizationId: verified.ctx.orgId, sessionId: verified.claims.sessionId, sessionToken: verified.claims.sessionToken }
}
function failed(error: unknown) {
  const safe = toSafeActionError(error, { action: "self-profile.http" })
  return Response.json({ error: safe.code, correlationId: safe.correlationId }, { status: safe.status, headers })
}
export async function readSelfProfileHttp() {
  try { return Response.json(await getSelfProfile(await scope()), { headers }) }
  catch (error) { return failed(error) }
}
export async function updateSelfProfileHttp(request: Request) {
  try {
    const trusted = buildTrustedOrigins([process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000", process.env.NEXT_PUBLIC_BASE_URL, "http://localhost:3000", "http://127.0.0.1:3000"])
    if (!trusted.includes(request.headers.get("origin") ?? "") || request.headers.get("sec-fetch-site") === "cross-site") throw new ApplicationError("FORBIDDEN", "A trusted same-site request is required.", 403)
    if (request.headers.get("content-type")?.toLowerCase().split(";")[0].trim() !== "application/json") throw new ApplicationError("VALIDATION_ERROR", "Send a JSON profile command.", 400)
    const actor = await scope()
    const reader = request.body?.getReader(), chunks: Uint8Array[] = []
    let size = 0
    if (!reader) throw new ApplicationError("VALIDATION_ERROR", "A reviewed profile command is required.", 400)
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 8192) { await reader.cancel(); throw new ApplicationError("VALIDATION_ERROR", "Profile input is too large.", 400) } chunks.push(value) } }
    finally { reader.releaseLock() }
    let body: unknown
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")) } catch { throw new ApplicationError("VALIDATION_ERROR", "Send a valid JSON profile command.", 400) }
    const parsed = selfProfileCommand.safeParse(body)
    if (!parsed.success) return Response.json({ error: "PROFILE_REVIEW_REQUIRED", message: "Read /api/me/profile and submit requestId, expectedHash and the supported profile fields.", profile: "/api/me/profile" }, { status: 409, headers })
    return Response.json({ status: true, receipt: await updateSelfProfile(actor, parsed.data) }, { headers })
  } catch (error) { return failed(error) }
}
