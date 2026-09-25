import { z } from "zod"
import { UpdatePurchaseOrderSchema } from "@/services/purchase-order/purchase-order.schemas"
import type { PurchaseOrderEditValues } from "./purchase-order-edit-model"
import type { UpdatePurchaseOrderDTO } from "@/types/purchase-orders-system-types"

export const editFields = ["supplierId", "locationId", "expectedDeliveryDate", "paymentTerms", "notes", "shippingCost", "lines"] as const
export type EditField = typeof editFields[number]
const number = z.number().finite().nullable().transform(value => value ?? Number.NaN)
const valuesSchema = z.object({ supplierId: z.string(), locationId: z.string(), expectedDeliveryDate: z.string(), paymentTerms: z.string(), notes: z.string(), shippingCost: number,
  lines: z.array(z.object({ itemId: z.string(), quantity: number, unitPrice: number, taxRate: number, discount: number, notes: z.string() }).strict()),
}).strict()
const requestSchema = UpdatePurchaseOrderSchema.omit({ updatedById: true, sessionId: true, sessionToken: true }).strict()
const storedSchema = z.object({ version: z.literal(1), organizationId: z.string(), actorId: z.string(), orderId: z.string(), baselineRevision: z.string().regex(/^[a-f0-9]{64}$/), baselineValues: valuesSchema, values: valuesSchema, pending: requestSchema.nullable() }).strict()
export type StoredPurchaseOrderDraft = {
  version: 1; organizationId: string; actorId: string; orderId: string;
  baselineRevision: string; baselineValues: PurchaseOrderEditValues; values: PurchaseOrderEditValues; pending: UpdatePurchaseOrderDTO | null;
}
export const purchaseOrderDraftKey = (organizationId: string, actorId: string, orderId: string) => "stoquify:purchase-order-draft:" + JSON.stringify([organizationId, actorId, orderId])
export function readPurchaseOrderDraft(value: string | null, scope: { organizationId: string; actorId: string; orderId: string }): StoredPurchaseOrderDraft | null {
  if (!value || value.length > 500000) return null
  try {
    const result = storedSchema.safeParse(JSON.parse(value))
    if (!result.success) return null
    const stored = result.data
    if (stored.organizationId !== scope.organizationId || stored.actorId !== scope.actorId || stored.orderId !== scope.orderId || (stored.pending && (stored.pending.id !== scope.orderId || stored.pending.organizationId !== scope.organizationId || stored.pending.expectedRevision !== stored.baselineRevision))) return null
    return stored
  } catch { return null }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export function comparePurchaseOrderDraft(base: PurchaseOrderEditValues, draft: PurchaseOrderEditValues, current: PurchaseOrderEditValues) {
  const conflicts = editFields.filter(field => !same(draft[field], base[field]) && !same(current[field], base[field]) && !same(draft[field], current[field]))
  const merged = Object.fromEntries(editFields.map(field => [field, same(draft[field], base[field]) ? current[field] : draft[field]])) as PurchaseOrderEditValues
  return { conflicts, merged }
}
export function resolvePurchaseOrderDraft(base: PurchaseOrderEditValues, draft: PurchaseOrderEditValues, current: PurchaseOrderEditValues, choices: Partial<Record<EditField, "draft" | "current">>) {
  const { conflicts, merged } = comparePurchaseOrderDraft(base, draft, current)
  if (conflicts.some(field => !choices[field])) return null
  return Object.fromEntries(editFields.map(field => [field, conflicts.includes(field) && choices[field] === "current" ? current[field] : merged[field]])) as PurchaseOrderEditValues
}
