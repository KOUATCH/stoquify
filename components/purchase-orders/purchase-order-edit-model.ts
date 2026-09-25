import type { PurchaseOrderWithRelations, UpdatePurchaseOrderDTO } from "@/types/purchase-orders-system-types"

export type PurchaseOrderEditValues = {
  supplierId: string
  locationId: string
  expectedDeliveryDate: string
  paymentTerms: string
  notes: string
  shippingCost: number
  lines: Array<{
    itemId: string
    quantity: number
    unitPrice: number
    taxRate: number
    discount: number
    notes: string
  }>
}

export function purchaseOrderEditDefaults(order: PurchaseOrderWithRelations): PurchaseOrderEditValues {
  return {
    supplierId: order.supplier?.id ?? "",
    locationId: order.locationId ?? order.location?.id ?? "",
    expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().slice(0, 10) : "",
    paymentTerms: order.paymentTerms ?? "",
    notes: order.notes ?? "",
    shippingCost: order.shippingCost ?? 0,
    lines: order.lines.map((line) => ({
      itemId: line.itemId,
      quantity: line.orderedQuantity,
      unitPrice: line.unitCost,
      taxRate: line.taxRate,
      discount: line.discount ?? 0,
      notes: line.notes ?? "",
    })),
  }
}

// Display estimate mirrors the existing service contract: percentage of gross
// line value, then a monetary line discount, with shipping added once.
// The service still calculates and persists the authoritative totals.
export function purchaseOrderEditTotals(values: PurchaseOrderEditValues) {
  let subtotal = 0
  let taxAmount = 0
  let discount = 0
  for (const line of values.lines) {
    const gross = line.quantity * line.unitPrice
    subtotal += gross
    taxAmount += gross * line.taxRate / 100
    discount += line.discount
  }
  return { subtotal, taxAmount, discount, total: subtotal + taxAmount - discount + values.shippingCost }
}

export function purchaseOrderEditPayload(
  order: PurchaseOrderWithRelations,
  organizationId: string,
  values: PurchaseOrderEditValues,
  request: { expectedRevision: string; idempotencyKey: string },
): UpdatePurchaseOrderDTO {
  return {
    id: order.id,
    organizationId,
    expectedRevision: request.expectedRevision,
    idempotencyKey: request.idempotencyKey,
    supplierId: values.supplierId,
    locationId: values.locationId,
    expectedDeliveryDate: values.expectedDeliveryDate || undefined,
    paymentTerms: values.paymentTerms,
    notes: values.notes,
    shippingCost: values.shippingCost,
    orderLines: values.lines.map((line) => ({ ...line })),
  }
}
