import { NextResponse } from "next/server"

import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicSupplierPoEnvelope } from "@/services/purchase-order/supplier-po-acknowledgement.service"
import { privateSupplierPoResponse } from "@/services/purchase-order/supplier-po-http"

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
  return privateSupplierPoResponse(NextResponse.json(data, { status }))
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
    return privateSupplierPoResponse(jsonErrorEnvelopeResponse(
      error,
      { endpoint: ENDPOINT },
      { success: false },
    ))
  }
}
