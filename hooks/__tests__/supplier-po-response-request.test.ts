import { webcrypto } from "node:crypto"
import { emptySupplierResponse, prepareSupplierResponse, readSupplierResponse, supplierResponseStorageKey, writeSupplierResponse } from "../supplier-po-response-request"
import { supplierProposalCommandSchema, supplierRequestedQuantitySchema, matchesSupplierProposal } from "@/services/purchase-order/supplier-po-response-contracts"
const lines = [{ purchaseOrderLineId: "line", orderedQuantity: "10.000" }]
beforeEach(() => { sessionStorage.clear(); Object.defineProperty(crypto, "subtle", { value: webcrypto.subtle, configurable: true }); Object.defineProperty(crypto, "randomUUID", { value: () => "a0000000-0000-4000-8000-000000000001", configurable: true }) })
it.each(["8.1234", "0", "NaN", "Infinity", "1e3", "-1", "", "1000000000"])("rejects invalid or excess precision quantity %s", quantity => { expect(() => supplierRequestedQuantitySchema.parse(quantity)).toThrow() })
it.each(["8.123", "0.001", ".5", "008.5", 8.125])("keeps valid quantity %s without rounding", quantity => { expect(supplierRequestedQuantitySchema.parse(quantity)).toBe(Number(quantity)) })
it("normalizes a French decimal comma and retains only actual requested changes", () => {
  const value = emptySupplierResponse(); value.draft = { ...value.draft, proposalType: "REQUEST_CHANGE", note: "Quantité à revoir", quantities: { line: "8,125" } }
  expect(prepareSupplierResponse(value.draft, lines)).toMatchObject({ quantityChanges: [{ purchaseOrderLineId: "line", requestedQuantity: 8.125 }], note: "Quantité à revoir" })
})
it("rejects a blank edited quantity and an unchanged change request", () => {
  for (const quantity of ["", "10.000", "10.0000"]) expect(() => prepareSupplierResponse({ ...emptySupplierResponse().draft, proposalType: "REQUEST_CHANGE", note: "Review quantity", quantities: { line: quantity } }, lines)).toThrow()
})
it("rejects invalid calendar dates and injected client authority", () => {
  const command = prepareSupplierResponse(emptySupplierResponse().draft, lines)
  expect(() => supplierProposalCommandSchema.parse({ ...command, requestedDeliveryDate: "2027-02-30" })).toThrow()
  expect(() => supplierProposalCommandSchema.parse({ ...command, organizationId: "other" })).toThrow()
})
it("keeps draft and pending identity across reload without retaining the bearer token", async () => {
  const key = await supplierResponseStorageKey("envelope", "private-bearer"), value = emptySupplierResponse()
  value.envelopeHash = "a".repeat(64); value.draft.note = "Original note"; value.command = prepareSupplierResponse(value.draft, lines)
  writeSupplierResponse(sessionStorage, key, value)
  expect(readSupplierResponse(sessionStorage, key)).toMatchObject({ draft: { note: "Original note" }, command: value.command })
  expect(JSON.stringify(sessionStorage)).not.toContain("private-bearer")
  expect(await supplierResponseStorageKey("envelope", "other-bearer")).not.toBe(key)
  expect(await supplierResponseStorageKey("other-envelope", "private-bearer")).not.toBe(key)
})
it("restores command details rather than a differently edited local draft", () => {
  const value = emptySupplierResponse(); value.command = prepareSupplierResponse({ ...value.draft, note: "Recorded note" }, lines); value.draft.note = "Changed note"
  writeSupplierResponse(sessionStorage, "key", value)
  expect(readSupplierResponse(sessionStorage, "key").draft.note).toBe("Recorded note")
})
it("fails closed for corrupt or unavailable recovery storage", () => {
  expect(() => readSupplierResponse({ getItem: () => "invalid" }, "key")).toThrow()
  expect(() => writeSupplierResponse({ setItem: () => { throw new Error("quota") } }, "key", emptySupplierResponse())).toThrow("quota")
})
it("matches only a real receipt for this envelope and exact request", () => {
  const command = prepareSupplierResponse(emptySupplierResponse().draft, lines), receipt = { envelopeId: "envelope", proposalId: "proposal", requestReference: command.idempotencyKey, correlationReference: command.correlationId, proposalType: "ACCEPT", stateHash: "b".repeat(64), status: "SUBMITTED", authoritativeMutation: false }
  expect(matchesSupplierProposal(receipt, command, "envelope")).toBe(true)
  for (const patch of [{ envelopeId: "other" }, { requestReference: "other" }, { proposalType: "REJECT" }, { authoritativeMutation: true }, { stateHash: "invalid" }]) expect(matchesSupplierProposal({ ...receipt, ...patch }, command, "envelope")).toBe(false)
})
