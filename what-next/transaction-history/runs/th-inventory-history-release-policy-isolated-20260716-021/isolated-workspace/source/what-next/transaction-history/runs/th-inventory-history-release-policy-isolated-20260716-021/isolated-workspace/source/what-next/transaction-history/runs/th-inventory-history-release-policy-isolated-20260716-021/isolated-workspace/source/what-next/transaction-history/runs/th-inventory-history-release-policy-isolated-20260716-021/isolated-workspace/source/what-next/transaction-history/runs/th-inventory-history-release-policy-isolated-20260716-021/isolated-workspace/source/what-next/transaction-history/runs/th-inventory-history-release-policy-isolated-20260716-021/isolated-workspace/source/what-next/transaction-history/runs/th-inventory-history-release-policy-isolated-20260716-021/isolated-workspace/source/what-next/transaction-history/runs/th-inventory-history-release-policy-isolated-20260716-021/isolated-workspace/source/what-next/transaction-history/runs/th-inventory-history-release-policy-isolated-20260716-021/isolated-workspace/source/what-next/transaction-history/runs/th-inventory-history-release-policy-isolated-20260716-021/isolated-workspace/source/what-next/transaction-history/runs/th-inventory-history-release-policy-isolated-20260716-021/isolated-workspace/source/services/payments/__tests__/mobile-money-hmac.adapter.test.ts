import { MobileMoneyHmacAdapter } from "../adapters/mobile-money-hmac.adapter"
import { PaymentIngestionError } from "../payment-ingestion.types"

describe("MobileMoneyHmacAdapter", () => {
  const adapter = new MobileMoneyHmacAdapter("mtn-momo")

  it("classifies non-object JSON payloads without raw rethrow", () => {
    expect(() => adapter.parseEvent("[]")).toThrow(PaymentIngestionError)
    expect(() => adapter.parseEvent("[]")).toThrow("Provider payload must be a JSON object.")
  })

  it("classifies malformed JSON payloads as typed ingestion errors", () => {
    expect(() => adapter.parseEvent("{not-json")).toThrow(PaymentIngestionError)
    expect(() => adapter.parseEvent("{not-json")).toThrow("Provider payload could not be parsed.")
  })
})
