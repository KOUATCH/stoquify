import { z } from "zod"
import { supplierProposalCommandSchema, supplierProposalTypeSchema, supplierRequestedQuantitySchema, type SupplierProposalCommand } from "@/services/purchase-order/supplier-po-response-contracts"

const draftSchema = z.object({ proposalType: supplierProposalTypeSchema, requestedDate: z.string().max(40), quantities: z.record(z.string().max(191), z.string().max(32)), note: z.string().max(500) }).strict()
const retainedSchema = z.object({ version: z.literal(1), envelopeHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(), draft: draftSchema, command: supplierProposalCommandSchema.nullable() }).strict()
export type SupplierResponseDraft = z.infer<typeof draftSchema>
export type RetainedSupplierResponse = z.infer<typeof retainedSchema>
export const emptySupplierResponse = (): RetainedSupplierResponse => ({ version: 1, envelopeHash: null, draft: { proposalType: "ACCEPT", requestedDate: "", quantities: {}, note: "" }, command: null })
export async function supplierResponseStorageKey(envelopeId: string, token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  const fingerprint = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("")
  return `stoquify:supplier-response:v1:${encodeURIComponent(envelopeId)}:${fingerprint}`
}
export function readSupplierResponse(storage: Pick<Storage, "getItem">, key: string) {
  const raw = storage.getItem(key)
  if (raw === null) return emptySupplierResponse()
  if (raw.length > 100_000) throw new Error("Retained supplier response is invalid")
  const value = retainedSchema.parse(JSON.parse(raw))
  if (Object.keys(value.draft.quantities).length > 250) throw new Error("Retained supplier response is invalid")
  if (value.command) value.draft = { proposalType: value.command.proposalType, requestedDate: value.command.requestedDeliveryDate?.slice(0, 10) ?? "", note: value.command.note ?? "", quantities: Object.fromEntries(value.command.quantityChanges.map(line => [line.purchaseOrderLineId, String(line.requestedQuantity)])) }
  return value
}
export function writeSupplierResponse(storage: Pick<Storage, "setItem">, key: string, value: RetainedSupplierResponse) {
  storage.setItem(key, JSON.stringify(retainedSchema.parse(value)))
}
export function prepareSupplierResponse(draft: SupplierResponseDraft, lines: Array<{ purchaseOrderLineId: string; orderedQuantity: string }>): SupplierProposalCommand {
  const quantityChanges = draft.proposalType === "REQUEST_CHANGE" ? lines.flatMap(line => {
    const entered = draft.quantities[line.purchaseOrderLineId]
    if (entered === undefined) return []
    const requestedQuantity = supplierRequestedQuantitySchema.parse(entered.trim().replace(",", "."))
    if (requestedQuantity === Number(line.orderedQuantity)) return []
    return [{ purchaseOrderLineId: line.purchaseOrderLineId, requestedQuantity }]
  }) : []
  const command = supplierProposalCommandSchema.parse({ proposalType: draft.proposalType, requestedDeliveryDate: draft.proposalType === "REQUEST_CHANGE" && draft.requestedDate ? draft.requestedDate : null, quantityChanges, note: draft.note.trim() || null, idempotencyKey: `supplier-response:${crypto.randomUUID()}`, correlationId: `supplier-correlation:${crypto.randomUUID()}` })
  if (command.proposalType !== "ACCEPT" && !command.note) throw new Error("A reason is required")
  if (command.proposalType === "REQUEST_CHANGE" && !command.requestedDeliveryDate && !command.quantityChanges.length) throw new Error("A change is required")
  return command
}
