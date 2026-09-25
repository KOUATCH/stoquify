import { purchaseReceivingCommandSchema, purchaseReceivingDraftSchema } from "../purchase-receiving-contracts"

const draft = { kind: "receive", orderId: "po-1", inspectionOutcome: "PASSED", items: [{ lineId: "line-1", receivedQuantity: 0.125 }] }
describe("receiving input boundaries", () => {
  it("accepts the shared three-decimal quantity without rounding", () => {
    expect(purchaseReceivingDraftSchema.parse(draft)).toEqual(draft)
  })
  it.each([
    { ...draft, actorId: "client-actor" },
    { ...draft, organizationId: "client-org" },
    { ...draft, items: [{ lineId: "line-1", receivedQuantity: 0.0001 }] },
    { ...draft, items: [...draft.items, ...draft.items] },
    { ...draft, items: [{ ...draft.items[0], expiryDate: "2026-02-30" }] },
    { ...draft, inspectionOutcome: "FAILED" },
    { ...draft, inspectionOutcome: "INCOMPLETE", inspectionReason: " " },
    { ...draft, items: Array.from({ length: 201 }, (_, i) => ({ lineId: String(i), receivedQuantity: 1 })) },
  ])("rejects untrusted identity, invalid precision, duplicate lines or missing inspection evidence", value => {
    expect(purchaseReceivingDraftSchema.safeParse(value).success).toBe(false)
  })
  it("requires a review revision and bounded recovery reference", () => {
    expect(purchaseReceivingCommandSchema.safeParse({ draft, idempotencyKey: "request-1" }).success).toBe(false)
    expect(purchaseReceivingCommandSchema.safeParse({ draft, expectedRevision: "a".repeat(64), idempotencyKey: "request-1" }).success).toBe(true)
  })
})
