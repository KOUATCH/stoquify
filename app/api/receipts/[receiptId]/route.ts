import { NextResponse } from "next/server"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicSalesReceipt } from "@/services/pos/receipt.service"

const ENDPOINT = "GET /api/receipts/[receiptId]"

function privateReceiptResponse<T extends { headers: Headers }>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  response.headers.set("Referrer-Policy", "no-referrer")
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return response
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  try {
    const { receiptId } = await params
    const receiptAccessToken = new URL(request.url).searchParams.get("token")?.trim() || undefined

    if (!receiptAccessToken) {
      throw new NotFoundError("Receipt not found")
    }

    const receipt = await getPublicSalesReceipt({ salesOrderId: receiptId, receiptAccessToken })

    return privateReceiptResponse(NextResponse.json({
      success: true,
      data: receipt,
    }))
  } catch (error) {
    return privateReceiptResponse(jsonErrorEnvelopeResponse(error, { endpoint: ENDPOINT }, { success: false }))
  }
}
