import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { PaymentReconciliationHandoffWorkbench, paymentReconciliationStorageKey } from "../PaymentReconciliationHandoffWorkbench"
import { paymentReconciliationCopy } from "../payment-reconciliation-copy"
import * as actions from "@/actions/purchasing/payment-reconciliation.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

let mockLocale = "en"
jest.mock("next-intl", () => ({ useLocale: () => mockLocale }))
jest.mock("@/actions/purchasing/payment-reconciliation.actions", () => ({ loadSupplierPaymentReconciliationSources: jest.fn(), loadSupplierPaymentReconciliation: jest.fn(), loadSupplierPaymentReconciliationChoices: jest.fn(), previewSupplierPaymentReconciliation: jest.fn(), reviewSupplierPaymentReconciliation: jest.fn(), proposeSupplierPaymentReconciliation: jest.fn(), decideSupplierPaymentReconciliation: jest.fn(), reopenSupplierPaymentReconciliation: jest.fn(), finalizeSupplierPaymentReconciliation: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor" }, key = paymentReconciliationStorageKey("org", "actor"), revision = "b".repeat(64)
const evidence = { kind: "CASH_VOUCHER" as const, voucherReference: "ACK-001", evidenceUri: "https://example.invalid/private/ack", evidenceSha256: "a".repeat(64), recipientName: "Recipient", acknowledgedAt: "2026-10-01T10:00:00Z", purpose: "Payment for supplied goods", acknowledgment: "RECIPIENT_ACKNOWLEDGED" as const }
const draft = { paymentRequestId: "payment", evidence }
const view = { ...scope, paymentRequestId: "payment", paymentNumber: "PAY-1", supplierName: "Supplier", total: "125.25", currency: "XAF", method: "CASH", destinationLabel: "CASH", executionReference: "EXEC-1", executedAt: "2026-10-01T09:00:00Z", status: "AWAITING_EVIDENCE", revision, proposalId: null, receiptId: null, evidence: null, fresh: false, checkedAt: "2026-10-01T11:00:00Z", canPropose: true, canDecide: false, canReopen: false, canFinalize: false, history: [] }
const savedDraft = { paymentRequestId: "payment", statementLineId: "", ...evidence, acknowledgment: true, reason: "Independent evidence review" }
const { kind: _kind, ...formDraft } = savedDraft
const command = { draft, expectedRevision: revision, idempotencyKey: "handoff-request-1" }
function mount(locale = "en") { mockLocale = locale; return render(<PaymentReconciliationHandoffWorkbench {...scope} initialPaymentId="payment" />) }
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); mockLocale = "en"
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "handoff-request-1" })
  for (const fn of Object.values(actions)) if (jest.isMockFunction(fn)) fn.mockReset()
  jest.mocked(actions.loadSupplierPaymentReconciliationSources).mockResolvedValue({ success: true, data: { ...scope, rows: [], next: null, checkedAt: view.checkedAt } } as never)
  jest.mocked(actions.loadSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: view } as never)
  jest.mocked(actions.reviewSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: view } as never)
  jest.mocked(actions.previewSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: { ...view, draft } } as never)
  jest.mocked(stepUpWithPasswordAction).mockResolvedValue({ success: true } as never)
  sessionStorage.setItem(key + ":draft", JSON.stringify(formDraft))
})
async function review(locale = "en") { const copy = paymentReconciliationCopy(locale); fireEvent.click(await screen.findByRole("button", { name: copy.preview })); return screen.findByRole("dialog") }
async function verify(dialog: HTMLElement, locale = "en") {
  const copy = paymentReconciliationCopy(locale)
  fireEvent.change(within(dialog).getByLabelText(copy.password), { target: { value: "private-password" } })
  fireEvent.click(within(dialog).getByRole("button", { name: copy.verify }))
  await waitFor(() => expect(within(dialog).queryByLabelText(copy.password)).not.toBeInTheDocument())
}
it.each(["en", "fr"])("requires a deliberate submission after password verification and retains evidence in %s", async locale => {
  const copy = paymentReconciliationCopy(locale)
  jest.mocked(actions.proposeSupplierPaymentReconciliation).mockImplementation(async input => ({ success: true, data: { ...view, status: "PROPOSED", canPropose: false, requestReference: (input as typeof command).idempotencyKey, reviewedRevision: revision } } as never))
  mount(locale); const dialog = await review(locale)
  expect(dialog).toHaveTextContent(copy.cashHelp); expect(dialog).toHaveTextContent("ACK-001")
  expect(within(dialog).getByRole("button", { name: copy.propose })).toBeDisabled()
  await verify(dialog, locale)
  expect(actions.proposeSupplierPaymentReconciliation).not.toHaveBeenCalled()
  expect(dialog).toHaveTextContent("Recipient"); expect(within(dialog).getByRole("button", { name: copy.propose })).toHaveFocus()
  fireEvent.click(within(dialog).getByRole("button", { name: copy.propose }))
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  expect(actions.proposeSupplierPaymentReconciliation).toHaveBeenCalledWith(command)
  expect(sessionStorage.getItem(key)).toBeNull()
  expect(screen.getByText(copy.saved)).toHaveFocus()
  expect(screen.getByText(copy.states.PROPOSED)).toBeVisible()
})
it("keeps the exact request after a lost response and retries it after remount", async () => {
  const copy = paymentReconciliationCopy("en"), pending = { operation: "propose", command }
  sessionStorage.setItem(key, JSON.stringify(pending))
  jest.mocked(actions.proposeSupplierPaymentReconciliation).mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce({ success: true, data: { ...view, status: "PROPOSED", canPropose: false, requestReference: command.idempotencyKey, reviewedRevision: revision } } as never)
  const first = mount(); let dialog = await screen.findByRole("dialog"); await verify(dialog)
  fireEvent.click(within(dialog).getByRole("button", { name: copy.retry }))
  await waitFor(() => expect(dialog).toHaveTextContent(copy.unknown))
  expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(pending)
  first.unmount(); mount(); dialog = await screen.findByRole("dialog"); await verify(dialog)
  expect(actions.proposeSupplierPaymentReconciliation).toHaveBeenCalledTimes(1)
  fireEvent.click(within(dialog).getByRole("button", { name: copy.retry }))
  await waitFor(() => expect(actions.proposeSupplierPaymentReconciliation).toHaveBeenCalledTimes(2))
  expect(actions.proposeSupplierPaymentReconciliation).toHaveBeenNthCalledWith(2, command)
})
it("preserves the pending request when the successful response has another request identity", async () => {
  sessionStorage.setItem(key, JSON.stringify({ operation: "propose", command }))
  jest.mocked(actions.proposeSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: { ...view, requestReference: "different", reviewedRevision: revision } } as never)
  mount(); const dialog = await screen.findByRole("dialog"); await verify(dialog)
  fireEvent.click(within(dialog).getByRole("button", { name: paymentReconciliationCopy("en").retry }))
  await waitFor(() => expect(dialog).toHaveTextContent(paymentReconciliationCopy("en").unknown))
  expect(JSON.parse(sessionStorage.getItem(key)!).command).toEqual(command)
})
it("clears private data on a foreign identity response", async () => {
  jest.mocked(actions.loadSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: { ...view, organizationId: "foreign" } } as never)
  mount(); await screen.findByText(paymentReconciliationCopy("en").denied)
  expect(screen.queryByText("Supplier")).not.toBeInTheDocument(); expect(sessionStorage.getItem(key + ":draft")).toBeNull()
})
it("does not present a failed queue query as an empty successful result", async () => {
  jest.mocked(actions.loadSupplierPaymentReconciliationSources).mockRejectedValue(new Error("database unavailable"))
  mount(); await screen.findByText(paymentReconciliationCopy("en").loadFailed)
  expect(screen.queryByText(paymentReconciliationCopy("en").empty)).not.toBeInTheDocument()
})
it("withholds independent approval actions when the service denies separation of duties", async () => {
  jest.mocked(actions.loadSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: { ...view, status: "PROPOSED", canPropose: false, evidence, proposalId: "proposal" } } as never)
  mount(); await screen.findByText(paymentReconciliationCopy("en").independent)
  expect(screen.queryByRole("button", { name: paymentReconciliationCopy("en").approve })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: paymentReconciliationCopy("en").reject })).not.toBeInTheDocument()
})
it("uses current server permissions after opening a review", async () => {
  jest.mocked(actions.loadSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: { ...view, status: "PROPOSED", canPropose: false, canDecide: true, fresh: true, evidence, proposalId: "proposal" } } as never)
  jest.mocked(actions.reviewSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: { ...view, status: "PROPOSED", canPropose: false, canDecide: false, fresh: true, evidence, proposalId: "proposal" } } as never)
  mount(); fireEvent.click(await screen.findByRole("button", { name: paymentReconciliationCopy("en").approve }))
  const dialog = await screen.findByRole("dialog")
  expect(dialog).toHaveTextContent(paymentReconciliationCopy("en").readOnly)
  expect(within(dialog).getByRole("button", { name: paymentReconciliationCopy("en").approve })).toBeDisabled()
})
it("keeps bank admission distinct from verified reconciliation", async () => {
  jest.mocked(actions.loadSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: { ...view, method: "BANK_TRANSFER", destinationLabel: "Bank · ****1001", status: "ADMITTED", canPropose: false, canFinalize: true, fresh: true } } as never)
  mount(); await screen.findByText(paymentReconciliationCopy("en").states.ADMITTED)
  expect(screen.getByRole("link", { name: paymentReconciliationCopy("en").reconcile })).toHaveAttribute("href", "/en/dashboard/finance/reconciliation")
  expect(screen.getByRole("button", { name: paymentReconciliationCopy("en").finalize })).toBeEnabled()
  expect(screen.queryByText(paymentReconciliationCopy("en").states.RECONCILED)).not.toBeInTheDocument()
})
it("shows a retained decision as requiring review when current evidence is invalid", async () => {
  jest.mocked(actions.loadSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: { ...view, status: "CASH_REVIEWED", canPropose: false, canReopen: true, evidenceCurrent: false, evidenceIssue: "REVIEW_REQUIRED", evidence } } as never)
  mount(); await screen.findByText(paymentReconciliationCopy("en").proofStale)
  expect(screen.getByRole("button", { name: paymentReconciliationCopy("en").reopen })).toBeEnabled()
  expect(screen.queryByRole("button", { name: paymentReconciliationCopy("en").finalize })).not.toBeInTheDocument()
})
it("preserves a fresh-auth-refused command and does not automatically resubmit it", async () => {
  const copy = paymentReconciliationCopy("en")
  jest.mocked(actions.previewSupplierPaymentReconciliation).mockResolvedValue({ success: true, data: { ...view, draft, fresh: true } } as never)
  jest.mocked(actions.proposeSupplierPaymentReconciliation).mockResolvedValue({ success: false, data: null, code: "FRESH_AUTH_REQUIRED", error: "Verify identity" })
  mount(); const dialog = await review()
  fireEvent.click(within(dialog).getByRole("button", { name: copy.propose }))
  await waitFor(() => expect(dialog).toHaveTextContent(copy.freshRequired))
  expect(JSON.parse(sessionStorage.getItem(key)!).command).toEqual(command)
  await verify(dialog)
  expect(actions.proposeSupplierPaymentReconciliation).toHaveBeenCalledTimes(1)
  expect(within(dialog).getByRole("button", { name: copy.retry })).toBeEnabled()
})
