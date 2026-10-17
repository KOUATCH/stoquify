import { z } from "zod"
import { CreatePurchaseOrderSchema } from "./purchase-order.schemas"

// Preserve incomplete numeric/date text without manufacturing zeroes. Display
// labels and PO numbers are deliberately absent; they come from current sources.
const textNumber = z.string().max(32)
export const purchaseAuthoringContent = z.object({
  supplierId: z.string().max(191), locationId: z.string().max(191), date: z.string().max(40), expectedDeliveryDate: z.string().max(40),
  paymentTerms: z.string().max(100), notes: z.string().max(2000), shippingCost: textNumber,
  orderLines: z.array(z.object({ itemId: z.string().max(191), quantity: textNumber, unitPrice: textNumber, taxRate: textNumber, discount: textNumber, notes: z.string().max(2000) }).strict()).max(200),
}).strict()
export type PurchaseAuthoringContent = z.infer<typeof purchaseAuthoringContent>
export const savePurchaseAuthoringInput = z.object({ id: z.string().uuid(), expectedRevision: z.number().int().min(0), title: z.string().trim().max(100), content: purchaseAuthoringContent }).strict()
export const purchaseAuthoringCommand = z.object({ id: z.string().uuid(), expectedRevision: z.number().int().positive() }).strict()
export const purchaseAuthoringLookup = z.object({ id: z.string().uuid() }).strict()
export const purchaseAuthoringList = z.object({ beforeId: z.string().uuid().optional() }).strict()

const decimalText = (scale: number, maximum: number) => z.string().trim().regex(new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`)).transform(Number).pipe(z.number().finite().min(0).max(maximum))
const cost = decimalText(2, 9_999_999_999.99), amount = decimalText(2, 999_999_999_999.99), quantity = decimalText(3, 999_999_999.999), percent = decimalText(3, 100)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)
export function normalizePurchaseAuthoring(content: PurchaseAuthoringContent, organizationId: string, actorId: string) {
  const value = purchaseAuthoringContent.parse(content)
  const date = day.parse(value.date), expectedDeliveryDate = day.parse(value.expectedDeliveryDate)
  z.string().refine(value => value >= date, "Expected delivery must not precede the order date.").parse(expectedDeliveryDate)
  z.array(z.string()).refine(ids => new Set(ids).size === ids.length, "Each item may appear only once.").parse(value.orderLines.map(line => line.itemId))
  return CreatePurchaseOrderSchema.parse({ organizationId, createdById: actorId, supplierId: value.supplierId, locationId: value.locationId, date, expectedDeliveryDate,
    paymentTerms: value.paymentTerms.trim() || "Net 30 days", notes: value.notes, shippingCost: amount.parse(value.shippingCost.trim() || "0"),
    orderLines: value.orderLines.map(line => ({ itemId: line.itemId, quantity: quantity.parse(line.quantity), unitPrice: cost.parse(line.unitPrice),
      taxRate: percent.parse(line.taxRate.trim() || "0"), discount: amount.parse(line.discount.trim() || "0"), notes: line.notes })),
  })
}

export const purchaseAuthoringReceipt = z.object({ requestReference: z.string().uuid(), orderId: z.string().min(1), orderNumber: z.string().min(1), createdAt: z.string().datetime() }).strict()
export type PurchaseAuthoringReceipt = z.infer<typeof purchaseAuthoringReceipt>
export type PurchaseAuthoringView = { id: string; revision: number; title: string; status: "ACTIVE" | "PREPARED" | "CREATED" | "DISCARDED";
  content: PurchaseAuthoringContent; savedAt: string; preparedAt: string | null; receipt: PurchaseAuthoringReceipt | null }
export const emptyPurchaseAuthoring = (): PurchaseAuthoringContent => ({ supplierId: "", locationId: "", date: "", expectedDeliveryDate: "", paymentTerms: "Net 30 days", notes: "", shippingCost: "", orderLines: [] })
