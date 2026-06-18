import { NextResponse } from "next/server"
import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { getPublicSalesReceipt } from "@/services/pos/receipt.service"

const ENDPOINT = "GET /api/receipts/[receiptId]"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  try {
    const { receiptId } = await params
    const receipt = await getPublicSalesReceipt({ salesOrderId: receiptId })

    return NextResponse.json({
      success: true,
      data: receipt,
    })
  } catch (error) {
    return jsonErrorEnvelopeResponse(error, { endpoint: ENDPOINT }, { success: false })
  }
}
