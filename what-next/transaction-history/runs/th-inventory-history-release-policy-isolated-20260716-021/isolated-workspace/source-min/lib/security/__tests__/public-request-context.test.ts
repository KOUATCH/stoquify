import { headers } from "next/headers"

import {
  getPublicIdentityRequestContext,
  normalizePublicClientIp,
} from "../public-request-context"

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}))

const mockHeaders = headers as jest.Mock

describe("public identity request context", () => {
  it("normalizes the first trusted proxy address", async () => {
    mockHeaders.mockResolvedValue({
      get: jest.fn((name: string) => {
        if (name === "x-forwarded-for") return "203.0.113.10, 10.0.0.1"
        return null
      }),
    })

    await expect(getPublicIdentityRequestContext()).resolves.toEqual({
      ipAddress: "203.0.113.10",
    })
  })

  it("supports bracketed IPv6 and IPv4 ports without retaining the port", () => {
    expect(normalizePublicClientIp(["[2001:db8::10]:443"])).toBe("2001:db8::10")
    expect(normalizePublicClientIp(["198.51.100.20:8443"])).toBe("198.51.100.20")
  })

  it("rejects malformed or oversized public address values", () => {
    expect(normalizePublicClientIp(["not-an-ip"])).toBeNull()
    expect(normalizePublicClientIp(["1".repeat(129)])).toBeNull()
  })
})
