import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CloseEvidenceNotifications } from "../CloseEvidenceNotifications"
import { getCloseEvidenceNotificationsAction } from "@/actions/accounting/close-evidence-notifications.actions"
jest.mock("@/actions/accounting/close-evidence-notifications.actions", () => ({ getCloseEvidenceNotificationsAction: jest.fn() }))
const data = { organizationId: "org", actorId: "actor", periodId: "period", items: [{ id: "publication", requestId: "request", eventName: "close.assurance.missing_evidence.response_submitted", publishedAt: "2026-10-04T09:00:00Z" }], next: null, evidenceIssue: false }
beforeEach(() => { jest.clearAllMocks(); (getCloseEvidenceNotificationsAction as jest.Mock).mockResolvedValue({ success: true, data }) })
it.each(["en", "fr"] as const)("renders %s historical publication without a read receipt", async locale => {
  render(<CloseEvidenceNotifications periodId="period" locale={locale} />)
  expect(await screen.findByText(locale === "en" ? "Evidence response submitted for review" : "Réponse soumise pour examen")).toBeVisible()
  expect(screen.getByText(locale === "en" ? /Publication does not mean/ : /Une publication ne signifie/)).toBeVisible()
  expect(screen.getByText("request")).toBeVisible()
})
it("clears stale private rows when refresh is denied and allows retry", async () => {
  render(<CloseEvidenceNotifications periodId="period" />); await screen.findByText("request")
  ;(getCloseEvidenceNotificationsAction as jest.Mock).mockResolvedValueOnce({ success: false, code: "FORBIDDEN" })
  fireEvent.click(screen.getByRole("button", { name: "Refresh updates" }))
  expect(await screen.findByText("Updates are unavailable. Refresh to try again.")).toBeVisible()
  expect(screen.queryByText("request")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Refresh updates" })); expect(await screen.findByText("request")).toBeVisible()
})
it("pages without accumulating stale authorization results", async () => {
  ;(getCloseEvidenceNotificationsAction as jest.Mock).mockResolvedValueOnce({ success: true, data: { ...data, next: { id: "cursor", publishedAt: "2026-10-04T08:00:00Z" } } }).mockResolvedValueOnce({ success: true, data: { ...data, items: [] } })
  render(<CloseEvidenceNotifications periodId="period" />)
  fireEvent.click(await screen.findByRole("button", { name: "Older updates" }))
  await waitFor(() => expect(getCloseEvidenceNotificationsAction).toHaveBeenLastCalledWith({ periodId: "period", before: { id: "cursor", publishedAt: "2026-10-04T08:00:00Z" } }))
  expect(await screen.findByText("No published updates on this page for your current access.")).toBeVisible()
  expect(screen.queryByText("request")).not.toBeInTheDocument()
})
