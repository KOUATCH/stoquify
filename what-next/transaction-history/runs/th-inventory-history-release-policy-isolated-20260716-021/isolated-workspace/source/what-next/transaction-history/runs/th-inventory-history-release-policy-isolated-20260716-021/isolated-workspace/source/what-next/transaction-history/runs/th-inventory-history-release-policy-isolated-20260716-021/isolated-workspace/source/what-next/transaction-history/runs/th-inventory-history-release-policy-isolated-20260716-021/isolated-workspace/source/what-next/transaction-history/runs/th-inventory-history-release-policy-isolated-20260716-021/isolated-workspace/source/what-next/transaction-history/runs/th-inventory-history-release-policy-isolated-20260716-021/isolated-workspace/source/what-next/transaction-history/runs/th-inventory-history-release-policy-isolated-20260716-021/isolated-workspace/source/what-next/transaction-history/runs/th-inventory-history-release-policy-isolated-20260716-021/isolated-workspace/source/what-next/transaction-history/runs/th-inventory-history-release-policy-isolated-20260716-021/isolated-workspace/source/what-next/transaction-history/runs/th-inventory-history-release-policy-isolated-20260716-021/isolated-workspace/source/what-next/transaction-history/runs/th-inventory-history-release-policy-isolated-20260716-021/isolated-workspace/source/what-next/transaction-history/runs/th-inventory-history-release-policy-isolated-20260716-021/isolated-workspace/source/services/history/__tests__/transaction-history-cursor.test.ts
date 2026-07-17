import {
  createHistoryCursorCodec,
  hashNormalizedHistoryFilters,
} from "@/services/history/transaction-history-cursor"
import { HistoryCursorError, type HistoryCursorPayload } from "@/services/history/transaction-history.types"

const secret = "history-cursor-test-secret-with-at-least-32-characters"
const payload: HistoryCursorPayload = {
  v: 1,
  scope: "transaction-history",
  tenantId: "org-1",
  adapterId: "inventory-movement-v1",
  filterHash: "a".repeat(64),
  recordedThrough: "2026-07-15T09:00:00.000Z",
  effectiveAt: "2026-07-14T10:00:00.000Z",
  recordedAt: "2026-07-14T10:01:00.000Z",
  id: "movement-1",
}

describe("transaction history cursor", () => {
  it("round-trips a signed cursor payload", () => {
    const codec = createHistoryCursorCodec(secret)
    expect(codec.decode(codec.encode(payload))).toEqual(payload)
  })

  it("rejects payload or signature tampering", () => {
    const codec = createHistoryCursorCodec(secret)
    const token = codec.encode(payload)
    const [encoded, signature] = token.split(".")
    const changedPayload = Buffer.from(
      JSON.stringify({ ...payload, tenantId: "other-org" }),
      "utf8",
    ).toString("base64url")

    expect(() => codec.decode(`${changedPayload}.${signature}`)).toThrow(HistoryCursorError)
    expect(() => codec.decode(`${encoded}.${signature.slice(0, -1)}x`)).toThrow(HistoryCursorError)
  })

  it("rejects cursors signed with another key", () => {
    const token = createHistoryCursorCodec(secret).encode(payload)
    const otherCodec = createHistoryCursorCodec("another-history-cursor-secret-with-32-characters")
    expect(() => otherCodec.decode(token)).toThrow("signature is invalid")
  })

  it("requires an adequately sized secret", () => {
    expect(() => createHistoryCursorCodec("too-short")).toThrow("at least 32 characters")
  })

  it("hashes equivalent normalized filters identically", () => {
    const first = hashNormalizedHistoryFilters({
      type: "SALE",
      itemId: "item-1",
      nested: { pageSize: 50, locationId: null },
    })
    const second = hashNormalizedHistoryFilters({
      nested: { locationId: null, pageSize: 50 },
      itemId: "item-1",
      type: "SALE",
    })

    expect(first).toHaveLength(64)
    expect(second).toBe(first)
  })
})
