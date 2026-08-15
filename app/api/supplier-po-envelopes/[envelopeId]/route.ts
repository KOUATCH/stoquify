import { NextResponse } from "next/server"

import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicSupplierPoEnvelope } from "@/services/purchase-order/supplier-po-acknowledgement.service"

const ENDPOINT = "GET /api/supplier-po-envelopes/[envelopeId]"

function requestIpAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  )
}

function securedJson(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status })
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  response.headers.set("Referrer-Policy", "no-referrer")
  response.headers.set("X-Content-Type-Options", "nosniff")
  return response
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ envelopeId: string }> },
) {
  try {
    const { envelopeId } = await params
    const token =
      new URL(request.url).searchParams.get("token")?.trim() || undefined
    if (!token) throw new NotFoundError("Supplier purchase order not found")

    const envelope = await getPublicSupplierPoEnvelope({
      envelopeId,
      token,
      ipAddress: requestIpAddress(request),
      userAgent: request.headers.get("user-agent")?.trim() || null,
    })
    return securedJson({ success: true, data: envelope })
  } catch (error) {
    return jsonErrorEnvelopeResponse(
      error,
      { endpoint: ENDPOINT },
      { success: false },
    )
  }
}
