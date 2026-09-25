import { NextResponse } from "next/server"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { submitCustomerStatementRecipientAction } from "@/services/accounting/customer-statement-recipient-action.service"
import { privateStatementResponse } from "@/services/accounting/customer-statement-http"
import { statementRecipientCommandSchema } from "@/services/accounting/customer-statement.schemas"

const ENDPOINT = "POST /api/customer-statements/[statementId]/actions"

function requestIpAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ statementId: string }> },
) {
  try {
    const { statementId } = await params
    const token = new URL(request.url).searchParams.get("token")?.trim() || undefined
    if (!token) throw new NotFoundError("Statement not found")

    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new BusinessRuleError("Request body must be valid JSON")
    }

    const parsed = statementRecipientCommandSchema.safeParse(body)
    if (!parsed.success) throw new BusinessRuleError("Check the response type, amount, document, date and note")

    const result = await submitCustomerStatementRecipientAction({
      statementSnapshotId: statementId,
      token,
      ...parsed.data,
      ipAddress: requestIpAddress(request),
      userAgent: request.headers.get("user-agent")?.trim() || null,
    })
    const response = NextResponse.json(
      { success: true, data: result },
      { status: result.replayed ? 200 : 201 },
    )
    return privateStatementResponse(response)
  } catch (error) {
    return privateStatementResponse(jsonErrorEnvelopeResponse(error, { endpoint: ENDPOINT }, { success: false }))
  }
}
