import { assertLegacyPurchaseReceiptPricing, planPurchaseReceiptCommercialBasis, pricePurchaseOrderLine, purchaseOrderTotal } from "../purchase-commercial-basis"

const line = { id: "line-a", orderedQuantity: "10.000", unitCost: "100.00", discount: "100.00", taxRate: "19.250", taxAmount: "192.50" }
const order = { id: "order", organizationId: "business", shippingCost: "50.00", lines: [line] }

it("preserves the approved gross tax convention and ties every split receipt to the PO", () => {
  const price = pricePurchaseOrderLine({ quantity: line.orderedQuantity, ...line })
  expect(purchaseOrderTotal(price.subtotal, price.discount, price.taxAmount, order.shippingCost).toFixed(2)).toBe("1142.50")

  const first = planPurchaseReceiptCommercialBasis(order, [], [{ lineId: line.id, receivedQuantity: "6.000" }]).get(line.id)!
  expect(first).toEqual({ version: 1, gross: "600.00", discount: "60.00", freight: "30.00", tax: "115.50", taxRate: "19.250", net: "570.00" })
  const second = planPurchaseReceiptCommercialBasis(order, [{ purchaseOrderLineId: line.id, receivedQuantity: "6.000", lineTotal: first.net, commercialBasis: first }], [{ lineId: line.id, receivedQuantity: "4.000" }]).get(line.id)!
  expect(second).toEqual({ version: 1, gross: "400.00", discount: "40.00", freight: "20.00", tax: "77.00", taxRate: "19.250", net: "380.00" })
})

it("puts the last cent on a final partial receipt and frees a rejected allocation", () => {
  const fractionalOrder = { ...order, shippingCost: "0.01", lines: [{ ...line, orderedQuantity: "3.000", unitCost: "0.01", discount: "0.00", taxRate: "0", taxAmount: "0" }] }
  const first = planPurchaseReceiptCommercialBasis(fractionalOrder, [], [{ lineId: line.id, receivedQuantity: "1.000" }]).get(line.id)!
  expect(first.freight).toBe("0.00")
  const firstAllocation = { purchaseOrderLineId: line.id, receivedQuantity: "1.000", lineTotal: first.net, commercialBasis: first }
  const held = planPurchaseReceiptCommercialBasis(fractionalOrder, [firstAllocation], [{ lineId: line.id, receivedQuantity: "1.000" }]).get(line.id)!
  expect(held.freight).toBe("0.01")
  const heldAllocation = { ...firstAllocation, lineTotal: held.net, commercialBasis: held }
  expect(planPurchaseReceiptCommercialBasis(fractionalOrder, [firstAllocation, heldAllocation], [{ lineId: line.id, receivedQuantity: "1.000" }]).get(line.id)?.freight).toBe("0.00")
  expect(planPurchaseReceiptCommercialBasis(fractionalOrder, [firstAllocation], [{ lineId: line.id, receivedQuantity: "2.000" }]).get(line.id)?.net).toBe("0.03")
})

it("requires review before extending a charged purchase that has unversioned receipt amounts", () => {
  expect(() => planPurchaseReceiptCommercialBasis(order, [{ purchaseOrderLineId: line.id, receivedQuantity: "1.000", lineTotal: "100.00", commercialBasis: null }], [{ lineId: line.id, receivedQuantity: "1.000" }])).toThrow(/Earlier receipt amounts/)
  expect(() => pricePurchaseOrderLine({ quantity: 1, unitCost: 100, discount: 101 })).toThrow(/discount cannot exceed/)
})

it("continues a partially received VAT-only order without rewriting the old gross valuation", () => {
  const vatOnly = { ...order, shippingCost: "0.00", lines: [{ ...line, discount: "0.00" }] }
  const legacy = { purchaseOrderLineId: line.id, receivedQuantity: "6.000", unitCost: "100.00", lineTotal: "600.00", commercialBasis: null }
  expect(() => assertLegacyPurchaseReceiptPricing(vatOnly, [legacy])).not.toThrow()
  const remaining = planPurchaseReceiptCommercialBasis(vatOnly, [legacy], [{ lineId: line.id, receivedQuantity: "4.000" }]).get(line.id)!
  expect(remaining).toEqual({ version: 1, gross: "400.00", discount: "0.00", freight: "0.00", tax: "77.00", taxRate: "19.250", net: "400.00" })
  expect(() => assertLegacyPurchaseReceiptPricing(vatOnly, [{ ...legacy, lineTotal: "599.99" }])).toThrow(/Earlier receipt amounts/)
})
