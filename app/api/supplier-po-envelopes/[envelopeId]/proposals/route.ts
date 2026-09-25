import { NextResponse } from "next/server"

import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { submitSupplierPoProposalInputSchema } from "@/services/purchase-order/supplier-po-acknowledgement.schemas"
import { submitSupplierPoProposal } from "@/services/purchase-order/supplier-po-acknowledgement.service"
import { supplierProposalCommandSchema } from "@/services/purchase-order/supplier-po-response-contracts"
import { privateSupplierPoResponse } from "@/services/purchase-order/supplier-po-http"

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
      ...supplierProposalCommandSchema.parse(body),
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
    return privateSupplierPoResponse(response)
  } catch (error) {
    return privateSupplierPoResponse(jsonErrorEnvelopeResponse(
      error,
      { endpoint: ENDPOINT },
      { success: false },
    ))
  }
}
