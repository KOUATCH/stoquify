import { NextResponse } from "next/server"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicCustomerStatement } from "@/services/accounting/customer-statement-access.service"
import { privateStatementResponse } from "@/services/accounting/customer-statement-http"

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
    return privateStatementResponse(response)
  } catch (error) {
    return privateStatementResponse(jsonErrorEnvelopeResponse(error, { endpoint: ENDPOINT }, { success: false }))
  }
}
