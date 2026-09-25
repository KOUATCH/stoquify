import { emptySupplierBuyerRecovery, matchesSupplierBuyerReceipt, prepareSupplierBuyerCommand, readSupplierBuyerRecovery, saveSupplierBuyerRecovery, type SupplierBuyerDraft } from "../supplier-po-buyer-request"
import { issueSupplierPoInviteInputSchema, reviewSupplierPoProposalInputSchema, supplierPoWorkbenchInputSchema } from "@/services/purchase-order/supplier-po-buyer-contracts"
const scope = { organizationId: "org", actorId: "buyer", purchaseOrderId: "po" }
const draft: SupplierBuyerDraft = { kind: "review", input: { purchaseOrderId: "po", proposalId: "proposal", expectedOrderHash: "a".repeat(64), expectedStateHash: "b".repeat(64), decision: "ACCEPT", reason: "Verified source records" } }
beforeEach(() => { sessionStorage.clear(); Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "a0000000-0000-4000-8000-000000000001" }) })
it("restores the exact request and scopes recovery to actor, tenant and purchase order", () => {
  const command = prepareSupplierBuyerCommand(draft)
  saveSupplierBuyerRecovery(sessionStorage, scope, { draft, command, rejected: false })
  expect(readSupplierBuyerRecovery(sessionStorage, scope)).toEqual({ draft, command, rejected: false })
  for (const other of [{ ...scope, actorId: "other" }, { ...scope, organizationId: "other" }, { ...scope, purchaseOrderId: "other" }]) expect(readSupplierBuyerRecovery(sessionStorage, other)).toEqual(emptySupplierBuyerRecovery())
})
it("lets a pending command override conflicting editable draft values", () => {
  const command = prepareSupplierBuyerCommand(draft)
  saveSupplierBuyerRecovery(sessionStorage, scope, { draft: { ...draft, input: { ...draft.input, reason: "Edited after request" } }, command, rejected: false })
  expect(readSupplierBuyerRecovery(sessionStorage, scope).draft).toEqual(draft)
})
it("rejects missing revisions, injected authority, invalid cursors and truncated recovery", () => {
  const command = prepareSupplierBuyerCommand(draft).input
  expect(reviewSupplierPoProposalInputSchema.safeParse({ ...command, expectedStateHash: undefined }).success).toBe(false)
  expect(reviewSupplierPoProposalInputSchema.safeParse({ ...command, actorId: "injected" }).success).toBe(false)
  expect(issueSupplierPoInviteInputSchema.safeParse({ purchaseOrderId: "po", idempotencyKey: "request-key", correlationId: "correlation-key" }).success).toBe(false)
  expect(supplierPoWorkbenchInputSchema.safeParse({ purchaseOrderId: "po", beforeTokenId: "token" }).success).toBe(false)
  expect(() => readSupplierBuyerRecovery({ getItem: () => "{" }, scope)).toThrow()
})
it("fails explicitly if recovery storage cannot be written", () => {
  expect(() => saveSupplierBuyerRecovery({ setItem: () => { throw new Error("unavailable") }, removeItem: jest.fn() }, scope, { draft, command: null, rejected: false })).toThrow("unavailable")
})
it("matches review receipts to the exact command and intended outcome", () => {
  const command = prepareSupplierBuyerCommand(draft)
  const receipt = { proposalId: "proposal", reviewRequestReference: command.input.idempotencyKey, reviewCorrelationReference: command.input.correlationId, reviewedStateId: "state-2", status: "BUYER_ACCEPTED", authoritativeMutation: false }
  expect(matchesSupplierBuyerReceipt(command, receipt)).toBe(true)
  for (const change of [{ proposalId: "other" }, { reviewRequestReference: "other" }, { status: "BUYER_REJECTED" }, { authoritativeMutation: true }]) expect(matchesSupplierBuyerReceipt(command, { ...receipt, ...change })).toBe(false)
})
