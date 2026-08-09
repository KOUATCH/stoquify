import { NextResponse } from "next/server"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicCustomerStatement } from "@/services/accounting/customer-statement-access.service"

const ENDPOINT = "GET /api/customer-statements/[statementId]"

function requestIpAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ statementId: string }> },
) {
  try {
    const { statementId } = await params
    const token = new URL(request.url).searchParams.get("token")?.trim() || undefined

    if (!token) throw new NotFoundError("Statement not found")

    const statement = await getPublicCustomerStatement({
      statementSnapshotId: statementId,
      token,
      ipAddress: requestIpAddress(request),
      userAgent: request.headers.get("user-agent")?.trim() || null,
    })
    const response = NextResponse.json({ success: true, data: statement })
    response.headers.set("Cache-Control", "private, no-store, max-age=0")
    response.headers.set("Referrer-Policy", "no-referrer")
    response.headers.set("X-Content-Type-Options", "nosniff")
    return response
  } catch (error) {
    return jsonErrorEnvelopeResponse(error, { endpoint: ENDPOINT }, { success: false })
  }
}
