import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CustomerStatementResponses } from "../CustomerStatementResponses"
import { listCustomerStatementResponsesAction, getCustomerStatementResponseHistoryAction, reviewCustomerStatementResponseAction } from "@/actions/accounting/customer-statement-response.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { readStatementReview, saveStatementReview } from "@/hooks/customer-statement-review-request"
jest.mock("@/actions/accounting/customer-statement-response.actions", () => ({ listCustomerStatementResponsesAction: jest.fn(), getCustomerStatementResponseHistoryAction: jest.fn(), reviewCustomerStatementResponseAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor", customerId: "customer" }
const row = { actionId: "response", statementId: "statement", statementNumber: "STM-1", statementVersion: 1, currency: "XAF", actionType: "DISPUTE", amount: "25.00", documentNumber: "INV-1", promisedFor: null, note: "Quantity disputed", requestReference: "recipient-request", submittedAt: "2026-08-20T12:00:00Z", current: { id: "s1", version: 1, status: "OPEN", stateHash: "a".repeat(64), recordedAt: "2026-08-20T12:00:00Z", actorId: null, reason: null } }
const list = listCustomerStatementResponsesAction as jest.Mock, review = reviewCustomerStatementResponseAction as jest.Mock, stepUp = stepUpWithPasswordAction as jest.Mock
const ok = (data: unknown) => ({ success: true, data })
const listData = (changes = {}) => ({ customerId: scope.customerId, checkedAt: "2026-08-20T12:00:00Z", canReview: true, canReviewPermission: true, responses: [row], nextCursor: null, ...changes })
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear()
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "a0000000-0000-4000-8000-000000000001" })
  list.mockResolvedValue(ok(listData())); stepUp.mockResolvedValue(ok({}))
  review.mockImplementation(async command => ok({ requestId: command.requestId, actionId: row.actionId, stateId: "s2", status: command.outcome, stateHash: "b".repeat(64), version: 2, eventId: "event", reviewedAt: "2026-08-20T12:01:00Z", replayed: false }))
})
async function begin() {
  render(<CustomerStatementResponses {...scope} locale="en" />)
  fireEvent.click(await screen.findByRole("button", { name: "Latest responses" }))
  fireEvent.click(await screen.findByRole("button", { name: "Review response" }))
  fireEvent.change(screen.getByLabelText("Review reason"), { target: { value: "Check the source quantity" } })
}
function confirm() {
  fireEvent.change(screen.getByLabelText("Confirm your current password"), { target: { value: "never-retain-this-password" } })
  fireEvent.click(screen.getByRole("checkbox"))
}
it("shows actual response evidence without implying a payment", async () => {
  await begin()
  expect(screen.getByText("Quantity disputed")).toBeVisible()
  expect(screen.getByLabelText("Review reason")).toHaveFocus()
  expect(screen.getByText(/Review decisions do not make payments/)).toBeVisible()
  expect(screen.getByRole("button", { name: "Record review decision" })).toBeDisabled()
})
it("persists a draft across remount and allows cancelling an unsent draft without a read", async () => {
  await begin()
  expect(readStatementReview(sessionStorage, scope).draft?.reason).toBe("Check the source quantity")
  // The second mount represents a reload; clearing the rendered tree leaves session storage intact.
  const { cleanup } = await import("@testing-library/react/pure"); cleanup()
  render(<CustomerStatementResponses {...scope} locale="en" />)
  expect(await screen.findByText(/A review draft is retained/)).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Cancel draft" }))
  expect(readStatementReview(sessionStorage, scope)).toEqual({ draft: null, command: null })
})
it("retains the exact command after a lost acknowledgement and never stores the password", async () => {
  await begin(); confirm(); review.mockRejectedValueOnce(new Error("connection lost"))
  fireEvent.click(screen.getByRole("button", { name: "Record review decision" }))
  await screen.findByText(/The review result is unconfirmed/)
  const command = readStatementReview(sessionStorage, scope).command
  expect(command).toMatchObject({ reason: "Check the source quantity", outcome: "ACKNOWLEDGED" })
  expect(JSON.stringify(sessionStorage)).not.toContain("never-retain-this-password")
  expect(screen.getByLabelText("Confirm your current password")).toHaveValue("")
  expect(screen.getByLabelText("Review reason")).toBeDisabled()
  fireEvent.change(screen.getByLabelText("Confirm your current password"), { target: { value: "never-retain-this-password" } })
  fireEvent.click(screen.getByRole("button", { name: "Check retained review" }))
  await screen.findByText(/Review decision recorded/)
  expect(review.mock.calls[1][0]).toEqual(command)
  expect(readStatementReview(sessionStorage, scope)).toEqual({ draft: null, command: null })
  expect(screen.getByRole("heading", { name: "Customer responses" })).toHaveFocus()
})
it("does not accept an unrelated success receipt", async () => {
  review.mockResolvedValue(ok({ requestId: "unrelated", actionId: row.actionId, status: "ACKNOWLEDGED", stateId: "s2", eventId: "event", stateHash: "b".repeat(64) }))
  await begin(); confirm(); fireEvent.click(screen.getByRole("button", { name: "Record review decision" }))
  await screen.findByText(/receipt could not be matched/)
  expect(readStatementReview(sessionStorage, scope).command).not.toBeNull()
  expect(screen.queryByText(/Review decision recorded/)).not.toBeInTheDocument()
})
it("keeps the draft and requires a refresh after a definite stale-state rejection", async () => {
  review.mockResolvedValue({ success: false, code: "CONFLICT" })
  await begin(); confirm(); fireEvent.click(screen.getByRole("button", { name: "Record review decision" }))
  await screen.findByText(/The review was not applied/)
  expect(readStatementReview(sessionStorage, scope).draft).not.toBeNull()
  expect(readStatementReview(sessionStorage, scope).command).toBeNull()
  expect(screen.getByRole("button", { name: "Record review decision" })).toBeDisabled()
})
it("hides stale sensitive records after access is denied and retains pending identity", async () => {
  await begin(); confirm(); review.mockResolvedValue({ success: false, code: "FORBIDDEN" })
  fireEvent.click(screen.getByRole("button", { name: "Record review decision" }))
  await screen.findByText(/Current access is unavailable/)
  expect(screen.queryByText("Quantity disputed")).not.toBeInTheDocument()
  expect(readStatementReview(sessionStorage, scope).command).not.toBeNull()
})
it("does not turn a query failure into an empty response list", async () => {
  list.mockRejectedValue(new Error("database unavailable"))
  render(<CustomerStatementResponses {...scope} locale="en" />)
  fireEvent.click(await screen.findByRole("button", { name: "Latest responses" }))
  await screen.findByText(/Responses could not be refreshed/)
  expect(screen.queryByText("No responses match this view.")).not.toBeInTheDocument()
})
it("supports French read-only inspection and history", async () => {
  list.mockResolvedValue(ok(listData({ canReview: false })))
  ;(getCustomerStatementResponseHistoryAction as jest.Mock).mockResolvedValue(ok({ response: row, states: [row.current], nextBeforeVersion: null }))
  render(<CustomerStatementResponses {...scope} locale="fr" />)
  fireEvent.click(await screen.findByRole("button", { name: "Dernières réponses" }))
  expect(await screen.findByRole("button", { name: "Examiner la réponse" })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Historique de l’examen" }))
  await screen.findByRole("button", { name: "Fermer l’historique" })
  expect(review).not.toHaveBeenCalled()
})
it("shows the retained outcome after the server has already advanced", async () => {
  const draft = { actionId: row.actionId, expectedStateHash: row.current.stateHash, reason: "Check source", outcome: "ACKNOWLEDGED" as const }
  saveStatementReview(sessionStorage, scope, { draft, command: { ...draft, customerId: scope.customerId, requestId: crypto.randomUUID() } })
  list.mockResolvedValue(ok(listData({ responses: [{ ...row, current: { ...row.current, version: 2, status: "ACKNOWLEDGED", stateHash: "b".repeat(64) } }] })))
  render(<CustomerStatementResponses {...scope} locale="en" />)
  fireEvent.click(await screen.findByRole("button", { name: "Refresh retained response" }))
  await waitFor(() => expect(screen.getByLabelText("Review outcome")).toHaveValue("ACKNOWLEDGED"))
  expect(screen.getByRole("button", { name: "Check retained review" })).toBeDisabled()
})
