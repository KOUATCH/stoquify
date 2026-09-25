import { comparePurchaseOrderDraft, purchaseOrderDraftKey, readPurchaseOrderDraft, resolvePurchaseOrderDraft } from "../purchase-order-edit-draft"
import type { PurchaseOrderEditValues } from "../purchase-order-edit-model"
const base: PurchaseOrderEditValues = { supplierId: "s", locationId: "l", expectedDeliveryDate: "2026-09-20", paymentTerms: "Net 30", notes: "Original", shippingCost: 50, lines: [{ itemId: "i", quantity: 2, unitPrice: 100, taxRate: 0, discount: 0, notes: "" }] }
it("keeps another editor's terms while applying the user's independent note", () => {
  const current = { ...base, paymentTerms: "Net 15" }, draft = { ...base, notes: "My note" }
  expect(comparePurchaseOrderDraft(base, draft, current).conflicts).toEqual([])
  expect(resolvePurchaseOrderDraft(base, draft, current, {})).toEqual({ ...base, notes: "My note", paymentTerms: "Net 15" })
})
it("requires explicit choices for overlapping fields and reviews changed lines together", () => {
  const current = { ...base, notes: "Current", lines: [{ ...base.lines[0], unitPrice: 120 }] }, draft = { ...base, notes: "Mine", lines: [{ ...base.lines[0], quantity: 3 }] }
  expect(comparePurchaseOrderDraft(base, draft, current).conflicts).toEqual(["notes", "lines"])
  expect(resolvePurchaseOrderDraft(base, draft, current, { notes: "draft" })).toBeNull()
  expect(resolvePurchaseOrderDraft(base, draft, current, { notes: "draft", lines: "current" })).toEqual({ ...current, notes: "Mine" })
})
it("does not invent a conflict when both editors reach the same value", () => {
  expect(comparePurchaseOrderDraft(base, { ...base, notes: "Agreed" }, { ...base, notes: "Agreed" }).conflicts).toEqual([])
})
const scope = { organizationId: "org", actorId: "actor", orderId: "po" }
const stored = { version: 1, ...scope, baselineRevision: "a".repeat(64), baselineValues: base, values: { ...base, notes: "Keep on reload" }, pending: { id: "po", organizationId: "org", expectedRevision: "a".repeat(64), idempotencyKey: "save-001", notes: "Keep on reload" } }
it("restores one exact request only within its actor, tenant, order and reviewed baseline", () => {
  expect(readPurchaseOrderDraft(JSON.stringify(stored), scope)?.pending).toEqual(stored.pending)
  for (const key of ["organizationId", "actorId", "orderId"] as const) expect(readPurchaseOrderDraft(JSON.stringify(stored), { ...scope, [key]: "foreign" })).toBeNull()
  expect(readPurchaseOrderDraft(JSON.stringify({ ...stored, pending: { ...stored.pending, expectedRevision: "b".repeat(64) } }), scope)).toBeNull()
  expect(readPurchaseOrderDraft(JSON.stringify({ ...stored, pending: { ...stored.pending, sessionToken: "must-not-be-stored" } }), scope)).toBeNull()
  expect(purchaseOrderDraftKey("org", "actor", "po")).not.toBe(purchaseOrderDraftKey("org", "other", "po"))
})
it("retains unfinished numeric entries while rejecting malformed stored data", () => {
  const restored = readPurchaseOrderDraft(JSON.stringify({ ...stored, pending: null, values: { ...base, shippingCost: Number.NaN } }), scope)
  expect(Number.isNaN(restored?.values.shippingCost)).toBe(true)
  expect(readPurchaseOrderDraft('{broken', scope)).toBeNull()
})
