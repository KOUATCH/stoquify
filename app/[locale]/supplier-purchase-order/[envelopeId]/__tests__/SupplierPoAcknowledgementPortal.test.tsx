import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { webcrypto } from "node:crypto"
import { SupplierPoAcknowledgementPortal } from "../SupplierPoAcknowledgementPortal"
import { readSupplierResponse, supplierResponseStorageKey } from "@/hooks/supplier-po-response-request"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
let mockToken = "owned-synthetic-token", mockLocale = "en"
const mockTranslate = (key: string, values?: Record<string, string>) => {
  let value: unknown = (mockLocale === "fr" ? fr : en).supplierPoAcknowledgement
  for (const part of key.split(".")) value = (value as Record<string, unknown>)[part]
  return String(value).replace(/\{(\w+)\}/g, (_, name) => values?.[name] ?? name)
}
jest.mock("next-intl", () => ({ useTranslations: () => mockTranslate }))
jest.mock("next/navigation", () => ({ useSearchParams: () => ({ get: () => mockToken }) }))
const copy = en.supplierPoAcknowledgement
const envelope = (id = "envelope") => ({ envelopeId: id, contentHash: "a".repeat(64), capturedAt: "2026-09-01T12:00:00Z", expiresAt: "2026-10-01T12:00:00Z", permissions: ["view", "respond"], proposal: null,
  payload: { buyer: { displayName: "Owned buyer" }, supplier: { displayName: "Owned supplier" }, purchaseOrder: { orderNumber: id, orderDate: "2026-09-01T12:00:00Z", expectedDeliveryDate: null, currency: "XAF", subtotal: "25", taxAmount: "0", shippingCost: "0", total: "25", deliveryLocation: "Owned warehouse" }, lines: [{ purchaseOrderLineId: "line", itemName: "Cartons", orderedQuantity: "10", unitCost: "2.5", lineTotal: "25" }] } })
const response = (data: unknown, status = 200) => ({ ok: status < 300, status, json: async () => status < 300 ? { success: true, data } : { success: false } })
const receipt = (command: Record<string, unknown>, id = "envelope") => ({ envelopeId: id, requestReference: command.idempotencyKey, correlationReference: command.correlationId, proposalType: command.proposalType, proposalId: "proposal", status: "SUBMITTED", stateHash: "b".repeat(64), authoritativeMutation: false, quantityChanges: [], history: [], requestedDeliveryDate: null, note: command.note })
let fetchMock: jest.Mock
beforeEach(() => {
  sessionStorage.clear(); mockToken = "owned-synthetic-token"; mockLocale = "en"
  Object.defineProperty(crypto, "subtle", { configurable: true, value: webcrypto.subtle })
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "00000000-0000-4000-8000-000000000001" })
  fetchMock = jest.fn(async (_url, options) => response(options?.method === "POST" ? receipt(JSON.parse(options.body)) : envelope()))
  global.fetch = fetchMock
})
async function begin() { const view = render(<SupplierPoAcknowledgementPortal envelopeId="envelope" locale="en" />); await screen.findByTestId("supplier-po-response-form"); return view }
async function retained(id = "envelope", token = mockToken) { return readSupplierResponse(sessionStorage, await supplierResponseStorageKey(id, token)) }
function submit() { fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByTestId("submit-supplier-po-proposal")) }
it("uses native radios, requires confirmation and focuses the matched saved receipt", async () => {
  await begin(); expect(screen.getAllByRole("radio")).toHaveLength(3); expect(screen.getByTestId("submit-supplier-po-proposal")).toBeDisabled()
  submit(); await screen.findByTestId("supplier-po-proposal-recorded")
  expect(screen.getByRole("heading", { name: copy.submittedProposal })).toHaveFocus(); expect((await retained()).command).toBeNull()
})
it("restores a change request draft after reload", async () => {
  const view = await begin(); fireEvent.click(screen.getByTestId("proposal-type-request_change")); fireEvent.change(screen.getByLabelText(copy.reasonRequired), { target: { value: "Please adjust the delivery" } }); fireEvent.change(screen.getByLabelText("Requested quantity for Cartons"), { target: { value: "8.5" } }); view.unmount()
  await begin(); expect(screen.getByTestId("proposal-type-request_change")).toBeChecked(); expect(screen.getByLabelText(copy.reasonRequired)).toHaveValue("Please adjust the delivery"); expect(screen.getByLabelText("Requested quantity for Cartons")).toHaveValue("8.5")
})
it("retries the exact saved command after a lost acknowledgement", async () => {
  await begin(); fetchMock.mockRejectedValueOnce(new Error("connection lost")); submit(); await screen.findByText(copy.uncertainResult)
  const saved = (await retained()).command; expect(saved).not.toBeNull(); expect(screen.getByTestId("proposal-type-accept")).toBeDisabled()
  fireEvent.click(screen.getByTestId("submit-supplier-po-proposal")); await screen.findByTestId("supplier-po-proposal-recorded")
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual(saved); expect(JSON.stringify(sessionStorage)).not.toContain(mockToken)
})
it("recovers an already committed response by matching a refreshed record", async () => {
  const view = await begin(); fetchMock.mockRejectedValueOnce(new Error("lost")); submit(); await screen.findByText(copy.uncertainResult); const saved = (await retained()).command!; view.unmount()
  fetchMock.mockResolvedValue(response({ ...envelope(), proposal: receipt(saved) })); await beginReceipt()
  expect((await retained()).command).toBeNull()
})
async function beginReceipt() { render(<SupplierPoAcknowledgementPortal envelopeId="envelope" locale="en" />); await screen.findByTestId("supplier-po-proposal-recorded") }
it("retains an unconfirmed request when a receipt belongs to another command", async () => {
  await begin(); fetchMock.mockResolvedValueOnce(response(receipt({ idempotencyKey: "other", proposalType: "ACCEPT" }))); submit(); await screen.findByText(copy.recoveryMismatch)
  expect((await retained()).command).not.toBeNull(); expect(screen.queryByTestId("supplier-po-proposal-recorded")).not.toBeInTheDocument()
})
it("preserves the draft for a definite validation rejection and resets confirmation", async () => {
  await begin(); fireEvent.change(screen.getByLabelText(copy.noteOptional), { target: { value: "Please check availability" } }); fetchMock.mockResolvedValueOnce(response(null, 422)); submit(); await screen.findByText(copy.validationFailed)
  expect((await retained()).command).toBeNull(); expect((await retained()).draft.note).toBe("Please check availability"); expect(screen.getByRole("checkbox")).not.toBeChecked()
})
it("distinguishes query failure, view-only access and missing numeric evidence", async () => {
  fetchMock.mockResolvedValueOnce(response(null, 500)); await beginFailure(); expect(screen.queryByTestId("supplier-po-response-form")).not.toBeInTheDocument()
  fetchMock.mockResolvedValueOnce(response({ ...envelope(), permissions: ["view"], payload: { ...envelope().payload, purchaseOrder: { ...envelope().payload.purchaseOrder, total: null } } })); fireEvent.click(screen.getByRole("button", { name: copy.refreshRecord })); await screen.findByText(copy.viewOnly); expect(screen.getByText(copy.valueUnavailable)).toBeVisible(); expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
})
async function beginFailure() { render(<SupplierPoAcknowledgementPortal envelopeId="envelope" locale="en" />); await screen.findByText(copy.loadFailedTitle) }
it("does not reveal an earlier envelope when its pending POST resolves after navigation", async () => {
  const view = await begin(); let complete!: (value: unknown) => void
  fetchMock.mockImplementationOnce(() => new Promise(resolve => { complete = resolve })); submit(); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2)); const saved = (await retained()).command!
  mockToken = "second-synthetic-token"; fetchMock.mockResolvedValueOnce(response(envelope("second"))); view.rerender(<SupplierPoAcknowledgementPortal envelopeId="second" locale="en" />); await screen.findByTestId("supplier-po-response-form")
  await act(async () => complete(response(receipt(saved))))
  expect(screen.getByTestId("supplier-po-order-number")).toHaveTextContent("second"); expect(screen.queryByTestId("supplier-po-proposal-recorded")).not.toBeInTheDocument(); expect((await retained("envelope", "owned-synthetic-token")).command).toEqual(saved)
})
it("renders French response and recovery controls", async () => {
  mockLocale = "fr"; render(<SupplierPoAcknowledgementPortal envelopeId="envelope" locale="fr" />); await screen.findByTestId("supplier-po-response-form")
  expect(screen.getByRole("checkbox", { name: fr.supplierPoAcknowledgement.confirmResponse })).toBeVisible(); expect(screen.getByRole("radio", { name: fr.supplierPoAcknowledgement.proposalType.REQUEST_CHANGE })).toBeVisible()
})
