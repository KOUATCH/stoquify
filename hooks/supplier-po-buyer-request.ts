import { z } from "zod"
import { issueSupplierPoInviteInputSchema, reviewSupplierPoProposalInputSchema, revokeSupplierPoInviteInputSchema } from "@/services/purchase-order/supplier-po-buyer-contracts"

const draftReason = z.string().max(500)
const identityFields = { idempotencyKey: true, correlationId: true } as const
const issueDraft = issueSupplierPoInviteInputSchema.omit(identityFields)
const reviewDraft = reviewSupplierPoProposalInputSchema.omit(identityFields).extend({ reason: draftReason })
const revokeDraft = revokeSupplierPoInviteInputSchema.omit(identityFields).extend({ reason: draftReason })
const draftSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("issue"), input: issueDraft }).strict(),
  z.object({ kind: z.literal("review"), input: reviewDraft }).strict(),
  z.object({ kind: z.literal("revoke"), input: revokeDraft }).strict(),
])
const commandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("issue"), input: issueSupplierPoInviteInputSchema }).strict(),
  z.object({ kind: z.literal("review"), input: reviewSupplierPoProposalInputSchema }).strict(),
  z.object({ kind: z.literal("revoke"), input: revokeSupplierPoInviteInputSchema }).strict(),
])
const savedSchema = z.object({ draft: draftSchema.nullable(), command: commandSchema.nullable(), rejected: z.boolean() }).strict()
export type SupplierBuyerDraft = z.infer<typeof draftSchema>
export type SupplierBuyerCommand = z.infer<typeof commandSchema>
export type SupplierBuyerRecovery = z.infer<typeof savedSchema>
export type SupplierBuyerStorageScope = { organizationId: string; actorId: string; purchaseOrderId: string }
export const emptySupplierBuyerRecovery = (): SupplierBuyerRecovery => ({ draft: null, command: null, rejected: false })
const key = (scope: SupplierBuyerStorageScope) => "supplier-buyer:v1:" + [scope.organizationId, scope.actorId, scope.purchaseOrderId].map(encodeURIComponent).join(":")
export function readSupplierBuyerRecovery(storage: Pick<Storage, "getItem">, scope: SupplierBuyerStorageScope) {
  const raw = storage.getItem(key(scope))
  if (raw === null) return emptySupplierBuyerRecovery()
  if (raw.length > 100000) throw new Error("Supplier buyer recovery is invalid")
  const saved = savedSchema.parse(JSON.parse(raw))
  if (saved.command) saved.draft = draftSchema.parse({ ...saved.command, input: Object.fromEntries(Object.entries(saved.command.input).filter(([name]) => !["idempotencyKey", "correlationId"].includes(name))) })
  if (saved.draft?.input.purchaseOrderId !== undefined && saved.draft.input.purchaseOrderId !== scope.purchaseOrderId) throw new Error("Supplier buyer recovery scope does not match")
  return saved
}
export function saveSupplierBuyerRecovery(storage: Pick<Storage, "setItem" | "removeItem">, scope: SupplierBuyerStorageScope, saved: SupplierBuyerRecovery) {
  if (!saved.draft && !saved.command) storage.removeItem(key(scope))
  else storage.setItem(key(scope), JSON.stringify(savedSchema.parse(saved)))
}
export function prepareSupplierBuyerCommand(draft: SupplierBuyerDraft): SupplierBuyerCommand {
  return commandSchema.parse({ kind: draft.kind, input: { ...draft.input, idempotencyKey: "supplier-buyer:" + crypto.randomUUID(), correlationId: "supplier-correlation:" + crypto.randomUUID() } })
}
export function matchesSupplierBuyerReceipt(command: SupplierBuyerCommand, value: unknown) {
  if (!value || typeof value !== "object") return false
  const receipt = value as Record<string, unknown>
  if (command.kind === "review") return receipt.proposalId === command.input.proposalId && receipt.reviewRequestReference === command.input.idempotencyKey && receipt.reviewCorrelationReference === command.input.correlationId && receipt.status === (command.input.decision === "ACCEPT" ? "BUYER_ACCEPTED" : "BUYER_REJECTED") && typeof receipt.reviewedStateId === "string" && receipt.authoritativeMutation === false
  return receipt.purchaseOrderId === command.input.purchaseOrderId && receipt.requestReference === command.input.idempotencyKey && receipt.correlationReference === command.input.correlationId &&
    (command.kind === "issue" ? typeof receipt.tokenId === "string" && typeof receipt.envelopeId === "string" && typeof receipt.inviteUrl === "string" : receipt.tokenId === command.input.tokenId && receipt.status === "REVOKED")
}
