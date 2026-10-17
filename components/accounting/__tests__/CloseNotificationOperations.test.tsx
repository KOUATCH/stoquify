import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CloseNotificationOperations } from "../CloseNotificationOperations"
import { getCloseNotificationOperationsAction, retryCloseNotificationAction } from "@/actions/accounting/close-notification-operations.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
jest.mock("@/actions/accounting/close-notification-operations.actions", () => ({ getCloseNotificationOperationsAction: jest.fn(), retryCloseNotificationAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const read = getCloseNotificationOperationsAction as jest.Mock, retry = retryCloseNotificationAction as jest.Mock
const data = { periodId: "period", writable: true, next: null, items: [{ id: "outbox", requestId: "request", status: "DEAD_LETTER", reason: "RETRY_AVAILABLE", revision: "a".repeat(64), attempts: 5, maxAttempts: 5, publishedAt: null, retryAvailable: true }] }
beforeEach(() => { jest.resetAllMocks(); read.mockResolvedValue({ success: true, data }); retry.mockResolvedValue({ success: true, data: { state: "RETRY_REQUESTED" } }) })
it.each(["en", "fr"])("exposes %s delivery state only on demand", async locale => {
  render(<CloseNotificationOperations periodId="period" locale={locale} />); expect(read).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button"))
  expect(await screen.findByText(locale === "en" ? "Retry limit reached" : "Limite de tentatives atteinte")).toBeVisible()
  expect(screen.getByRole("heading")).toHaveFocus()
})
async function choose() {
  render(<CloseNotificationOperations periodId="period" />); fireEvent.click(screen.getByRole("button")); fireEvent.click(await screen.findByRole("button", { name: "Review retry" }))
  fireEvent.change(screen.getByLabelText("Reason for retry"), { target: { value: "Storage outage was investigated and corrected." } })
  fireEvent.click(screen.getByRole("button", { name: "Request retry" }))
}
it("reports queued recovery without claiming publication", async () => {
  await choose(); expect(await screen.findByText(/Retry requested. Publication is not yet confirmed/)).toBeVisible()
  expect(retry).toHaveBeenCalledWith(expect.objectContaining({ periodId: "period", outboxId: "outbox", expectedRevision: "a".repeat(64), correlationId: expect.any(String) }))
})
it("preserves the exact command and reason after uncertain transport", async () => {
  retry.mockRejectedValueOnce(new Error("lost ack")); await choose(); await screen.findByText(/The result is uncertain/)
  expect(screen.getByLabelText("Reason for retry")).toBeDisabled(); const first = retry.mock.calls[0][0]
  fireEvent.click(screen.getByRole("button", { name: "Request retry" })); await screen.findByText(/Retry requested. Publication is not yet confirmed/)
  expect(retry.mock.calls[1][0]).toEqual(first)
})
it("requires password step-up and retains the same recovery command", async () => {
  retry.mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" }); (stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true, data: { verifiedAt: "2026-10-04T10:00:00Z", method: "password", assuranceLevel: 1 } })
  await choose(); const password = await screen.findByLabelText("Current password"); expect(password).toHaveFocus()
  fireEvent.change(password, { target: { value: "synthetic" } }); fireEvent.click(screen.getByRole("button", { name: "Confirm identity" }))
  await screen.findByText("Identity confirmed. Submit the same retry request."); expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Request retry" })); await waitFor(() => expect(retry).toHaveBeenCalledTimes(2)); expect(retry.mock.calls[0][0]).toEqual(retry.mock.calls[1][0])
})
it("clears private rows after mutation denial", async () => {
  retry.mockResolvedValueOnce({ success: false, code: "FORBIDDEN" }); await choose(); await screen.findByText(/Current permission is required/)
  expect(screen.queryByText("request")).not.toBeInTheDocument(); expect(screen.queryByLabelText("Reason for retry")).not.toBeInTheDocument()
})
it("clears delivery records if the session expires during identity confirmation", async () => {
  retry.mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" }); (stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: false, code: "AUTH_REQUIRED" })
  await choose(); fireEvent.change(await screen.findByLabelText("Current password"), { target: { value: "synthetic" } }); fireEvent.click(screen.getByRole("button", { name: "Confirm identity" }))
  await screen.findByText(/Current permission is required/); expect(screen.queryByText("request")).not.toBeInTheDocument(); expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument()
})
it("shows query failure without a successful empty state", async () => {
  read.mockRejectedValue(new Error("offline")); render(<CloseNotificationOperations periodId="period" />); fireEvent.click(screen.getByRole("button"))
  expect(await screen.findByText("Delivery status could not be loaded. Refresh to retry.")).toBeVisible(); expect(screen.queryByText("No notification deliveries on this page.")).not.toBeInTheDocument()
})
