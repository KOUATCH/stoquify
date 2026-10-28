import {
  buildTrustedOrigins,
  normalizeTrustedOrigin,
} from "@/lib/security/trusted-origins"

describe("trusted origin configuration", () => {
  it("normalizes configured HTTP origins and removes duplicates", () => {
    expect(
      buildTrustedOrigins([
        "https://app.example.com/",
        "https://APP.example.com/path?ignored=true",
        "http://localhost:3000",
      ])
    ).toEqual(["https://app.example.com", "http://localhost:3000"])
  })

  it("rejects invalid and non-HTTP origin configuration", () => {
    expect(normalizeTrustedOrigin("javascript:alert(1)")).toBeNull()
    expect(normalizeTrustedOrigin("not a URL")).toBeNull()
    expect(normalizeTrustedOrigin(undefined)).toBeNull()
  })

  it("does not derive trust from spoofed request host headers", () => {
    const configuredOrigins = buildTrustedOrigins([
      "https://app.example.com",
      "http://localhost:3000",
    ])
    const spoofedHeaders = {
      host: "attacker.example",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "https",
    }

    expect(spoofedHeaders["x-forwarded-host"]).toBe("attacker.example")
    expect(configuredOrigins).toEqual([
      "https://app.example.com",
      "http://localhost:3000",
    ])
    expect(configuredOrigins).not.toContain("https://attacker.example")
  })
})
