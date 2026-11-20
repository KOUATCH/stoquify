import {
  openCustomerStatementDeliveryEnvelope,
  sealCustomerStatementDeliveryEnvelope,
} from "../customer-statement-delivery-envelope"

const environment = {
  AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY: "11".repeat(32),
}

const payload = {
  destination: "customer@example.com",
  accessUrl: "https://stoquify.test/customer-statements/statement-1?token=signed",
  statementSnapshotId: "statement-1",
  tokenId: "token-1",
  referralCode: "referral_code_123",
  issuedAt: "2026-08-09T10:00:00.000Z",
}

describe("customer statement delivery envelope", () => {
  it("seals provider-only destination and access data with authenticated encryption", () => {
    const sealed = sealCustomerStatementDeliveryEnvelope(payload, environment)

    expect(sealed).toMatch(/^v1\./)
    expect(sealed).not.toContain(payload.destination)
    expect(sealed).not.toContain("signed")
    expect(openCustomerStatementDeliveryEnvelope(sealed!, environment)).toEqual(payload)
  })

  it("rejects tampering, malformed envelopes, and unsafe key configuration", () => {
    const sealed = sealCustomerStatementDeliveryEnvelope(payload, environment)!
    const [version, iv, tag, ciphertext] = sealed.split(".")
    const encrypted = Buffer.from(ciphertext, "base64url")
    encrypted.writeUInt8(encrypted.readUInt8(0) ^ 1, 0)
    const tampered = [version, iv, tag, encrypted.toString("base64url")].join(".")

    expect(openCustomerStatementDeliveryEnvelope(tampered, environment)).toBeNull()
    expect(openCustomerStatementDeliveryEnvelope("v1.invalid", environment)).toBeNull()
    expect(sealCustomerStatementDeliveryEnvelope(payload, {
      AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY: "short",
    })).toBeNull()
  })
})
