import { NextResponse } from "next/server"

import { jsonErrorEnvelopeResponse } from "@/lib/error-handling/route-response"
import { recordReferralClick } from "@/services/referrals/referral-attribution.service"

const ENDPOINT = "GET /api/referrals/[referralCode]"

function requestIpAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ referralCode: string }> },
) {
  try {
    const { referralCode } = await params
    const requestUrl = new URL(request.url)
    const referral = await recordReferralClick({
      referralCode,
      inviteToken: requestUrl.searchParams.get("invite"),
      ipAddress: requestIpAddress(request),
      userAgent: request.headers.get("user-agent")?.trim() || null,
    })
    const response = NextResponse.redirect(
      new URL(referral.registrationPath, request.url),
      307,
    )
    response.headers.set("Cache-Control", "private, no-store, max-age=0")
    response.headers.set("Referrer-Policy", "no-referrer")
    return response
  } catch (error) {
    return jsonErrorEnvelopeResponse(error, { endpoint: ENDPOINT }, { success: false })
  }
}
