import { NextResponse } from "next/server"
import { getPublicSalesReceipt } from "@/services/pos/receipt.service"

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
    const message = error instanceof Error ? error.message : "Failed to load receipt"
    const status = message === "Receipt not found" ? 404 : 500

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    )
  }
}
