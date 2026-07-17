import { NextResponse } from "next/server"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicSalesReceipt } from "@/services/pos/receipt.service"

const ENDPOINT = "GET /api/receipts/[receiptId]"

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

    return NextResponse.json({
      success: true,
      data: receipt,
    })
  } catch (error) {
    return jsonErrorEnvelopeResponse(error, { endpoint: ENDPOINT }, { success: false })
  }
}
