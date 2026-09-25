import { NextResponse } from "next/server"
import { jsonAuthzError, jsonErrorResponse } from "@/lib/error-handling/route-response"
import { requireApiSessionForCurrentOrg, requireApiModuleAccess, requireAnyAppPermission, hasAppPermission } from "@/lib/security/server-authz"
import { readItemPicture } from "@/services/media/picture.service"

const ENDPOINT = "GET /api/media/[id]"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requireApiSessionForCurrentOrg()
    if (authz.error || !authz.session?.user || !authz.organizationId) return jsonAuthzError("Unauthorized", 401, ENDPOINT)
    const user = authz.session.user
    requireAnyAppPermission(user, ["inventory.items.read", "inventory.items.create", "inventory.items.update", "pos.use"])
    const access = await requireApiModuleAccess({ organizationId: authz.organizationId, user, moduleSlug: hasAppPermission(user, "inventory.items.read") || hasAppPermission(user, "inventory.items.create") || hasAppPermission(user, "inventory.items.update") ? "inventory" : "pos", surface: ENDPOINT, accessIntent: "read" })
    if (!access.allowed) return jsonAuthzError("Forbidden", 403, ENDPOINT)
    const { id } = await params
    const picture = await readItemPicture(id, authz.organizationId)
    return new NextResponse(new Uint8Array(picture.bytes).buffer, { headers: {
      "Content-Type": picture.mimeType, "Content-Length": String(picture.bytes.length),
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } })
  } catch (error) {
    return jsonErrorResponse(error, { endpoint: ENDPOINT, userMessage: "Unable to load image." })
  }
}
