import { isIP } from "node:net"
import { headers } from "next/headers"

export type PublicIdentityRequestContext = {
  ipAddress: string | null
}

export function normalizePublicClientIp(values: Array<string | null | undefined>) {
  for (const value of values) {
    let candidate = value?.split(",")[0]?.trim()
    if (!candidate || candidate.length > 128) continue

    if (candidate.startsWith("[")) {
      const closingBracket = candidate.indexOf("]")
      candidate = closingBracket > 0 ? candidate.slice(1, closingBracket) : candidate
    } else {
      const lastColon = candidate.lastIndexOf(":")
      const possibleIpv4 = lastColon > 0 ? candidate.slice(0, lastColon) : ""
      if (possibleIpv4 && isIP(possibleIpv4) === 4) candidate = possibleIpv4
    }

    if (isIP(candidate)) return candidate
  }

  return null
}

export async function getPublicIdentityRequestContext(): Promise<PublicIdentityRequestContext> {
  const requestHeaders = await headers()
  return {
    ipAddress: normalizePublicClientIp([
      requestHeaders.get("cf-connecting-ip"),
      requestHeaders.get("x-forwarded-for"),
      requestHeaders.get("x-real-ip"),
    ]),
  }
}
