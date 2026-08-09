import { NextResponse } from "next/server"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { submitCustomerStatementRecipientAction } from "@/services/accounting/customer-statement-recipient-action.service"

const ENDPOINT = "POST /api/customer-statements/[statementId]/actions"

type RecipientActionBody = {
  actionType?: unknown
  customerReceivableDocumentId?: unknown
  requestedAmount?: unknown
  promisedFor?: unknown
  note?: unknown
  idempotencyKey?: unknown
  correlationId?: unknown
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function requiredText(value: unknown, label: string) {
  const normalized = optionalText(value)
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

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

    let body: RecipientActionBody
    try {
      body = await request.json() as RecipientActionBody
    } catch {
      throw new BusinessRuleError("Request body must be valid JSON")
    }

    const actionType = requiredText(body.actionType, "Action type")
    if (actionType !== "DISPUTE" && actionType !== "PROMISE_TO_PAY") {
      throw new BusinessRuleError("Action type must be DISPUTE or PROMISE_TO_PAY")
    }

    const result = await submitCustomerStatementRecipientAction({
      statementSnapshotId: statementId,
      token,
      actionType,
      customerReceivableDocumentId: optionalText(body.customerReceivableDocumentId),
      requestedAmount: requiredText(body.requestedAmount, "Requested amount"),
      promisedFor: optionalText(body.promisedFor),
      note: requiredText(body.note, "Note"),
      idempotencyKey: requiredText(body.idempotencyKey, "Idempotency key"),
      correlationId: requiredText(body.correlationId, "Correlation ID"),
      ipAddress: requestIpAddress(request),
      userAgent: request.headers.get("user-agent")?.trim() || null,
    })
    const response = NextResponse.json(
      { success: true, data: result },
      { status: result.replayed ? 200 : 201 },
    )
    response.headers.set("Cache-Control", "private, no-store, max-age=0")
    response.headers.set("Referrer-Policy", "no-referrer")
    response.headers.set("X-Content-Type-Options", "nosniff")
    return response
  } catch (error) {
    return jsonErrorEnvelopeResponse(error, { endpoint: ENDPOINT }, { success: false })
  }
}
