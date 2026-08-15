import { NextResponse } from "next/server"

import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { submitSupplierPoProposalInputSchema } from "@/services/purchase-order/supplier-po-acknowledgement.schemas"
import { submitSupplierPoProposal } from "@/services/purchase-order/supplier-po-acknowledgement.service"

const ENDPOINT = "POST /api/supplier-po-envelopes/[envelopeId]/proposals"

function requestIpAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ envelopeId: string }> },
) {
  try {
    const { envelopeId } = await params
    const token =
      new URL(request.url).searchParams.get("token")?.trim() || undefined
    if (!token) throw new NotFoundError("Supplier purchase order not found")

    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new BusinessRuleError("Request body must be valid JSON")
    }
    const parsed = submitSupplierPoProposalInputSchema.parse({
      ...(body && typeof body === "object" ? body : {}),
      envelopeId,
      token,
      ipAddress: requestIpAddress(request),
      userAgent: request.headers.get("user-agent")?.trim() || null,
    })
    const result = await submitSupplierPoProposal(parsed)
    const response = NextResponse.json(
      { success: true, data: result },
      { status: result.replayed ? 200 : 201 },
    )
    response.headers.set("Cache-Control", "private, no-store, max-age=0")
    response.headers.set("Referrer-Policy", "no-referrer")
    response.headers.set("X-Content-Type-Options", "nosniff")
    return response
  } catch (error) {
    return jsonErrorEnvelopeResponse(
      error,
      { endpoint: ENDPOINT },
      { success: false },
    )
  }
}
