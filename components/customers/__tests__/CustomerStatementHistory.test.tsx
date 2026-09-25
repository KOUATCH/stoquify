import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CustomerStatementHistory } from "../CustomerStatementHistory"
import { getCustomerStatementRecordAction, listCustomerStatementHistoryAction } from "@/actions/accounting/customer-statement-history.actions"
jest.mock("@/actions/accounting/customer-statement-history.actions", () => ({ getCustomerStatementRecordAction: jest.fn(), listCustomerStatementHistoryAction: jest.fn() }))
const list = listCustomerStatementHistoryAction as jest.Mock, read = getCustomerStatementRecordAction as jest.Mock
const statement = { statementId: "s1", statementNumber: "STM-1", version: 1, contentHash: "hash", businessEventId: "event", periodStart: "2026-08-01T00:00:00Z", periodEnd: "2026-08-31T00:00:00Z", asOf: "2026-08-31T00:00:00Z", recordedThrough: "2026-09-01T00:00:00Z", currency: "XAF", openingBalance: "10.00", periodDebits: "20.00", periodCredits: "5.00", closingBalance: "25.00", overdueBalance: "0.00", itemCount: 1, movementCount: 1, truncated: false }
const record = { customerId: "customer", checkedAt: "2026-09-06T00:00:00Z", statement, nextCursor: null, deliveries: [{ deliveryId: "d1", redactedDestination: "r***@example.invalid", channel: "EMAIL", consentCapturedAt: "2026-09-01T00:00:00Z", status: "QUEUED", queue: { status: "FAILED", attempts: 1 }, token: { id: "token", status: "ACTIVE", expiresAt: "2026-10-01T00:00:00Z" } }] }
beforeEach(() => { jest.clearAllMocks(); list.mockResolvedValue({ success: true, data: { customerId: "customer", checkedAt: record.checkedAt, statements: [statement], nextCursor: "s1" } }); read.mockResolvedValue({ success: true, data: record }) })
const open = jest.fn(), revoke = jest.fn()
function view(props = {}) { return render(<CustomerStatementHistory customerId="customer" locale="en" busy={false} canOpen canRevoke onOpen={open} onRevoke={revoke} {...props} />) }
async function review() { fireEvent.click(screen.getByRole("button", { name: "Latest statements" })); fireEvent.click(await screen.findByRole("button", { name: "Review STM-1 version 1" })); await screen.findByText("Delivery record : Queued") }
it("requires explicit confirmation and sends the reviewed revision for a processing retry", async () => {
  const retry = jest.fn().mockResolvedValue(undefined)
  read.mockResolvedValue({ success: true, data: { ...record, deliveries: [{ ...record.deliveries[0], recovery: { revision: "a".repeat(64) } }] } })
  view({ canRetry: true, onRetry: retry }); await review()
  fireEvent.click(screen.getByRole("button", { name: "Review processing retry" }))
  expect(screen.getByLabelText("Reason for retry")).toHaveFocus()
  fireEvent.change(screen.getByLabelText("Reason for retry"), { target: { value: "Setup reviewed" } }); fireEvent.change(screen.getByLabelText("Confirm your current password"), { target: { value: "test-password" } })
  const form = screen.getByRole("form", { name: "Resume statement processing" }); fireEvent.submit(form); expect(retry).not.toHaveBeenCalled()
  fireEvent.click(screen.getByLabelText("I reviewed this request and want to resume its processing with the same details.")); fireEvent.submit(form)
  await waitFor(() => expect(retry).toHaveBeenCalledWith({ statementId: "s1", deliveryId: "d1", expectedRevision: "a".repeat(64), reason: "Setup reviewed" }, "test-password"))
  expect(await screen.findByText(/The processing retry was recorded/)).toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Statement history" })).toHaveFocus()
})
it("keeps retained retry details immutable and offers no discard during an unknown outcome", () => {
  view({ locale: "fr", canRetry: false, onRetry: jest.fn(), pendingRetry: { customerId: "customer", statementId: "s1", deliveryId: "d1", expectedRevision: "a".repeat(64), reason: "Configuration vérifiée", idempotencyKey: "a0000000-0000-4000-8000-000000000001" } })
  expect(screen.getByLabelText("Motif de reprise")).toHaveAttribute("readonly")
  expect(screen.getByRole("button", { name: "Vérifier la reprise conservée" })).toBeDisabled()
  expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument()
})
it("reads history only on request and requires an explicit new-delivery decision", async () => {
  view(); expect(list).not.toHaveBeenCalled(); await review(); expect(open).not.toHaveBeenCalled()
  expect(screen.getByText("Processing queue : Failed (1)")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Use this statement for a new delivery" })); expect(open).toHaveBeenCalledWith(statement)
})
it("retains stale records after a failed refresh but prevents creating from them", async () => {
  view(); await review(); read.mockRejectedValueOnce(new Error("offline")); fireEvent.click(screen.getByRole("button", { name: "Refresh this record" }))
  await screen.findByRole("alert"); expect(screen.getByText("Delivery record : Queued")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Use this statement for a new delivery" })).toBeDisabled()
})
it("removes previously displayed records when current authority is denied", async () => {
  view(); await review(); read.mockResolvedValueOnce({ success: false, code: "FORBIDDEN" }); fireEvent.click(screen.getByRole("button", { name: "Refresh this record" }))
  await screen.findByRole("alert"); expect(screen.queryByText("Delivery record : Queued")).not.toBeInTheDocument(); expect(open).not.toHaveBeenCalled()
})
it("does not replace an unresolved delivery with another historical statement", async () => {
  view({ pendingStatementId: "other" }); await review(); expect(screen.getByRole("button", { name: "Use this statement for a new delivery" })).toBeDisabled()
})
it("requires reason, password and confirmation for revocation, then reloads authoritative state", async () => {
  view(); await review(); fireEvent.click(screen.getByRole("button", { name: "Revoke link access" }))
  fireEvent.change(screen.getByLabelText("Reason for revocation"), { target: { value: "Recipient requested withdrawal" } }); fireEvent.change(screen.getByLabelText("Confirm your current password"), { target: { value: "test-only" } });
  const form = screen.getByRole("button", { name: "Confirm revocation" }).closest("form")!; fireEvent.submit(form); expect(revoke).not.toHaveBeenCalled()
  fireEvent.click(screen.getByLabelText("I confirm that this link should no longer provide access.")); revoke.mockResolvedValueOnce(undefined)
  read.mockResolvedValueOnce({ success: true, data: { ...record, deliveries: [{ ...record.deliveries[0], token: { ...record.deliveries[0].token, status: "REVOKED" } }] } })
  fireEvent.submit(form); await waitFor(() => expect(read).toHaveBeenCalledTimes(2)); expect(revoke).toHaveBeenCalledWith("token", "Recipient requested withdrawal", "test-only")
  expect(await screen.findByText(/Link access : Revoked/)).toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Statement history" })).toHaveFocus()
})
it("offers localized read-only inspection without a revoke or new-delivery action", async () => {
  view({ locale: "fr", canOpen: false, canRevoke: false }); fireEvent.click(screen.getByRole("button", { name: "Derniers relevés" })); fireEvent.click(await screen.findByRole("button", { name: "Consulter STM-1 version 1" })); await screen.findByText("Envoi enregistré : En file d’attente")
  expect(screen.getByRole("button", { name: "Utiliser ce relevé pour un nouvel envoi" })).toBeDisabled(); expect(screen.queryByRole("button", { name: "Révoquer l’accès par le lien" })).not.toBeInTheDocument()
})

it.each(["en", "fr"] as const)("explains an unknown provider outcome in %s without claiming delivery", async locale => {
  read.mockResolvedValueOnce({ success: true, data: { ...record, deliveries: [{ ...record.deliveries[0], status: "DEFERRED", errorCode: "PROVIDER_OUTCOME_UNKNOWN", queue: { status: "DEFERRED", attempts: 1, errorCode: "PROVIDER_OUTCOME_UNKNOWN" } }] } })
  view({ locale }); fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Latest statements" : "Derniers relevés" })); fireEvent.click(await screen.findByRole("button", { name: (locale === "en" ? "Review" : "Consulter") + " STM-1 version 1" }))
  expect(await screen.findByText(locale === "en" ? /The provider outcome is unconfirmed/ : /Le résultat chez le fournisseur n’est pas confirmé/)).toBeInTheDocument()
  expect(screen.queryByText(/Sent through provider|Envoyé via le fournisseur/)).not.toBeInTheDocument()
})
