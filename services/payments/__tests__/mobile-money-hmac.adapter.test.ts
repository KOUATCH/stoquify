import { MobileMoneyHmacAdapter } from "../adapters/mobile-money-hmac.adapter"
import { PaymentIngestionError } from "../payment-ingestion.types"

describe("MobileMoneyHmacAdapter", () => {
  const adapter = new MobileMoneyHmacAdapter("mtn-momo")

  it.each([undefined, null, "", "UNKNOWN", "unexpected"])("preserves missing or unsupported provider direction %s as unknown", direction => {
    expect(adapter.parseEvent(JSON.stringify({ eventId: "synthetic-direction", direction })).direction).toBeNull()
  })

  it.each([["INBOUND", "INBOUND"], ["CREDIT", "INBOUND"], ["OUTBOUND", "OUTBOUND"], ["DEBIT", "OUTBOUND"], ["INTERNAL", "INTERNAL"]])("maps the explicit provider direction %s", (direction, expected) => {
    expect(adapter.parseEvent(JSON.stringify({ eventId: "synthetic-direction", direction })).direction).toBe(expected)
  })

  it("classifies non-object JSON payloads without raw rethrow", () => {
    expect(() => adapter.parseEvent("[]")).toThrow(PaymentIngestionError)
    expect(() => adapter.parseEvent("[]")).toThrow("Provider payload must be a JSON object.")
  })

  it("classifies malformed JSON payloads as typed ingestion errors", () => {
    expect(() => adapter.parseEvent("{not-json")).toThrow(PaymentIngestionError)
    expect(() => adapter.parseEvent("{not-json")).toThrow("Provider payload could not be parsed.")
  })
})
