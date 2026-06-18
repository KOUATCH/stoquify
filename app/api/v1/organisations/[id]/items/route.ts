import { requireApiSessionForOrg } from "@/lib/security/server-authz"
import { listItemApiDTOs } from "@/services/item/item.service"
import { jsonAuthzError, jsonErrorResponse, jsonMethodNotAllowed } from "@/lib/error-handling/route-response"
import { type NextRequest, NextResponse } from "next/server"

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const orgId = (await params).id
    const authz = await requireApiSessionForOrg(orgId)
    if (authz.error) {
      return jsonAuthzError(authz.error, authz.status, "GET /api/v1/organisations/[id]/items")
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 100)
    const response = await listItemApiDTOs(orgId, { page, limit })

    return NextResponse.json(response)
  } catch (error) {
    return jsonErrorResponse(error, { endpoint: "GET /api/v1/organisations/[id]/items" })
  }
}

export async function POST() {
  return jsonMethodNotAllowed("POST")
}
