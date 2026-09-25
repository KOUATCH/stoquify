import { purchaseOrderEditDefaults, purchaseOrderEditPayload, purchaseOrderEditTotals } from "../purchase-order-edit-model"
import type { PurchaseOrderWithRelations } from "@/types/purchase-orders-system-types"
const request = { expectedRevision: "a".repeat(64), idempotencyKey: "request-001" }

const order = {
  id: "po-1", status: "DRAFT", orderDate: "2026-09-01", expectedDeliveryDate: null,
  supplier: { id: "s-1" }, locationId: "l-1", paymentTerms: "", notes: "", shippingCost: 0,
  lines: [{ itemId: "i-1", orderedQuantity: 2, unitCost: 100, taxRate: 19.25, discount: 10, notes: "Original note" }],
} as PurchaseOrderWithRelations

it("preserves actual percent tax, monetary discount, notes and explicit zero shipping", () => {
  const values = purchaseOrderEditDefaults(order)
  expect(purchaseOrderEditTotals(values)).toEqual({ subtotal: 200, taxAmount: 38.5, discount: 10, total: 228.5 })
  expect(purchaseOrderEditPayload(order, "org", values, request)).toEqual({
    ...request,
    id: "po-1", organizationId: "org", supplierId: "s-1", locationId: "l-1", expectedDeliveryDate: undefined,
    paymentTerms: "", notes: "", shippingCost: 0,
    orderLines: [{ itemId: "i-1", quantity: 2, unitPrice: 100, taxRate: 19.25, discount: 10, notes: "Original note" }],
  })
})
it("does not reconstruct tax from rounded tax amount or apply the aggregate discount a second time", () => {
  const values = purchaseOrderEditDefaults({ ...order, discount: 10, lines: [{ ...order.lines[0], taxAmount: 38, taxRate: 19.25 }] })
  values.shippingCost = 15
  expect(purchaseOrderEditTotals(values).total).toBe(243.5)
  expect(purchaseOrderEditPayload(order, "org", values, request).orderLines?.[0].taxRate).toBe(19.25)
})
