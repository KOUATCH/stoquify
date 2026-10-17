import { act, render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AccountantNotificationHistory } from "../AccountantNotificationHistory"
import { getAccountantNotificationHistoryAction } from "@/actions/accounting/accountant-work-desk.actions"
jest.mock("@/actions/accounting/accountant-work-desk.actions", () => ({ getAccountantNotificationHistoryAction: jest.fn() }))
const read = getAccountantNotificationHistoryAction as jest.Mock
const data = { clientOrganizationId: "client", clientName: "Client", items: [{ id: "pub", requestId: "retained-request", periodId: "period", periodName: "October", eventName: "close.assurance.missing_evidence.response_accepted", publishedAt: "2026-10-04T08:00:00Z" }], nextCursor: null, incomplete: false, generatedAt: "2026-10-04T09:00:00Z" }
beforeEach(() => { jest.resetAllMocks(); read.mockResolvedValue({ success: true, data }) })
it.each(["en", "fr"] as const)("loads %s accepted history on demand and returns focus on close", async locale => {
  render(<AccountantNotificationHistory clientOrganizationId="client" clientName="Client" locale={locale} onDenied={jest.fn()} />)
  expect(read).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button"))
  expect(await screen.findByText(locale === "en" ? "Response accepted" : "Réponse acceptée")).toBeVisible()
  expect(screen.getByRole("heading")).toHaveFocus()
  const close = screen.getByRole("button", { name: locale === "en" ? "Close notification history: Client" : "Fermer l’historique des notifications: Client" })
  fireEvent.click(close)
  expect(screen.queryByText("retained-request")).not.toBeInTheDocument()
  expect(screen.getByRole("button")).toHaveFocus()
})
it("replaces earlier pages and sends the client-bound cursor", async () => {
  read.mockResolvedValueOnce({ success: true, data: { ...data, nextCursor: "position" } }).mockResolvedValueOnce({ success: true, data: { ...data, items: [] } })
  render(<AccountantNotificationHistory clientOrganizationId="client" clientName="Client" locale="en" onDenied={jest.fn()} />)
  fireEvent.click(screen.getByRole("button")); fireEvent.click(await screen.findByRole("button", { name: "Older publications" }))
  expect(await screen.findByText("No publications on this page.")).toBeVisible()
  expect(read).toHaveBeenLastCalledWith({ clientOrganizationId: "client", cursor: "position" })
  expect(screen.queryByText("retained-request")).not.toBeInTheDocument()
})
it("shows a retryable transport failure rather than an empty history", async () => {
  read.mockRejectedValueOnce(new Error("offline"))
  render(<AccountantNotificationHistory clientOrganizationId="client" clientName="Client" locale="en" onDenied={jest.fn()} />)
  fireEvent.click(screen.getByRole("button"))
  expect(await screen.findByText("History could not be loaded. Retry with latest publications.")).toBeVisible()
  expect(screen.queryByText("No publications on this page.")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Latest publications" }))
  expect(await screen.findByText("retained-request")).toBeVisible()
})
it("clears rows and notifies the containing desk on revoked authority", async () => {
  const denied = jest.fn()
  render(<AccountantNotificationHistory clientOrganizationId="client" clientName="Client" locale="en" onDenied={denied} />)
  fireEvent.click(screen.getByRole("button")); await screen.findByText("retained-request")
  read.mockResolvedValueOnce({ success: false, code: "FORBIDDEN" })
  fireEvent.click(screen.getByRole("button", { name: "Latest publications" }))
  await waitFor(() => expect(denied).toHaveBeenCalledTimes(1))
  expect(screen.queryByText("retained-request")).not.toBeInTheDocument()
})
it("ignores late replies after closing", async () => {
  let finish!: (result: unknown) => void
  read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  render(<AccountantNotificationHistory clientOrganizationId="client" clientName="Client" locale="en" onDenied={jest.fn()} />)
  fireEvent.click(screen.getByRole("button")); fireEvent.click(screen.getByRole("button", { name: "Close notification history: Client" }))
  await act(async () => finish({ success: true, data }))
  expect(screen.queryByText("retained-request")).not.toBeInTheDocument()
})
it("rejects another client's response", async () => {
  read.mockResolvedValueOnce({ success: true, data: { ...data, clientOrganizationId: "other" } })
  render(<AccountantNotificationHistory clientOrganizationId="client" clientName="Client" locale="en" onDenied={jest.fn()} />)
  fireEvent.click(screen.getByRole("button"))
  expect(await screen.findByText("History could not be loaded. Retry with latest publications.")).toBeVisible()
  expect(screen.queryByText("retained-request")).not.toBeInTheDocument()
})
