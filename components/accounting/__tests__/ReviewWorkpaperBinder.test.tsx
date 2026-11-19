/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReviewWorkpaperBinder } from "../ReviewWorkpaperBinder"
import * as actions from "@/actions/accounting/review-workpaper.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
jest.mock("@/actions/accounting/review-workpaper.actions", () => ({
  getReviewWorkpaperBinderAction: jest.fn(), prepareReviewWorkpaperAction: jest.fn(), reviewWorkpaperAction: jest.fn(),
  rollForwardWorkpaperAction: jest.fn(), exportReviewWorkpapersAction: jest.fn(),
}))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const hash = "sha256:" + "a".repeat(64)
const binder = () => ({ version: 1, organizationId: "client-a", periodId: "period-a", periodStart: "2026-09-01", periodEnd: "2026-09-30", sourceHash: hash, reviewHash: hash,
  sourceRevision: "3", reviewState: "UNPREPARED", decisions: [], previousPeriods: [{ id: "august", name: "August" }], rolledForwardFrom: null, unclassifiedAccounts: [],
  schedules: ["CASH", "RECEIVABLES", "PAYABLES", "INVENTORY"].map(kind => ({ kind, availability: "UNAVAILABLE", accounts: [] })) })
beforeEach(() => {
  jest.resetAllMocks()
  Object.defineProperty(crypto, "randomUUID", { value: jest.fn(() => "synthetic-command"), configurable: true })
  Object.defineProperty(document, "hidden", { value: false, configurable: true })
  ;(actions.getReviewWorkpaperBinderAction as jest.Mock).mockResolvedValue({ success: true, data: binder() })
})
async function load(locale: "en" | "fr" = "en") {
  render(<ReviewWorkpaperBinder clientOrganizationId="client-a" periodId="period-a" locale={locale} />)
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Charger / actualiser le dossier" : "Load / refresh workpapers" }))
  await screen.findByText(locale === "fr" ? "Trésorerie / règlements" : "Cash / settlement")
}
it.each(["en", "fr"] as const)("renders four honest missing-source states and labelled controls in %s", async locale => {
  await load(locale)
  expect(screen.getAllByText(locale === "fr" ? /Indisponible — obtenir/ : /Unavailable — obtain/)).toHaveLength(4)
  expect(screen.getByRole("textbox")).toHaveAccessibleName(locale === "fr" ? "Conclusion de préparation ou de revue" : "Preparation or review conclusion")
  expect(screen.getByRole("button", { name: locale === "fr" ? "Consigner la revue indépendante" : "Record independent review" })).toBeDisabled()
  expect(screen.getByText(locale === "fr" ? "Non préparé" : "Not prepared", { exact: true })).toBeInTheDocument()
  expect(screen.queryByText("0.00")).not.toBeInTheDocument()
})
it("validates a conclusion and sends the displayed client, period and exact source hash", async () => {
  ;(actions.prepareReviewWorkpaperAction as jest.Mock).mockResolvedValue({ success: true, data: { id: "preparation" } })
  await load()
  fireEvent.click(screen.getByRole("button", { name: "Record preparation" }))
  expect(screen.getByRole("alert")).toHaveTextContent("10–2000")
  expect(actions.prepareReviewWorkpaperAction).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Documented review conclusion" } })
  fireEvent.click(screen.getByRole("button", { name: "Record preparation" }))
  await waitFor(() => expect(actions.prepareReviewWorkpaperAction).toHaveBeenCalledWith(expect.objectContaining({
    clientOrganizationId: "client-a", periodId: "period-a", expectedSourceHash: hash, decision: "PREPARED",
  })))
})
it("retains an uncertain submission key for an explicit retry", async () => {
  ;(actions.prepareReviewWorkpaperAction as jest.Mock).mockRejectedValueOnce(Error("lost response")).mockResolvedValue({ success: true, data: { id: "preparation" } })
  await load()
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Documented review conclusion" } })
  fireEvent.click(screen.getByRole("button", { name: "Record preparation" }))
  fireEvent.click(await screen.findByRole("button", { name: "Retry saved submission" }))
  await waitFor(() => expect(actions.prepareReviewWorkpaperAction).toHaveBeenCalledTimes(2))
  expect((actions.prepareReviewWorkpaperAction as jest.Mock).mock.calls[1]).toEqual((actions.prepareReviewWorkpaperAction as jest.Mock).mock.calls[0])
})
it("requires explicit export retry after successful password step-up", async () => {
  ;(actions.exportReviewWorkpapersAction as jest.Mock).mockResolvedValue({ success: false, code: "FRESH_AUTH_REQUIRED" })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  await load(); fireEvent.click(screen.getByRole("button", { name: "Export PDF" }))
  fireEvent.change(await screen.findByLabelText("Password"), { target: { value: "synthetic-password" } })
  fireEvent.click(screen.getByRole("button", { name: "Verify identity" }))
  await screen.findByText("Identity verified. Retry when ready.")
  expect(actions.exportReviewWorkpapersAction).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Retry saved submission" }))
  await waitFor(() => expect(actions.exportReviewWorkpapersAction).toHaveBeenCalledTimes(2))
})
it("clears denied or stale evidence instead of presenting retained balances as current", async () => {
  ;(actions.prepareReviewWorkpaperAction as jest.Mock).mockResolvedValue({ success: false, code: "CONFLICT" })
  await load(); fireEvent.change(screen.getByRole("textbox"), { target: { value: "Documented review conclusion" } })
  fireEvent.click(screen.getByRole("button", { name: "Record preparation" }))
  await screen.findByText("Sources or review decisions changed. Refresh and prepare again.")
  expect(screen.queryByText("Cash / settlement")).not.toBeInTheDocument()
})
it("clears client data and drafts on hide and ignores an earlier scope response", async () => {
  await load(); fireEvent.change(screen.getByRole("textbox"), { target: { value: "Private local draft" } })
  Object.defineProperty(document, "hidden", { value: true, configurable: true })
  act(() => document.dispatchEvent(new Event("visibilitychange")))
  expect(screen.queryByText("Cash / settlement")).not.toBeInTheDocument()
  expect(screen.queryByDisplayValue("Private local draft")).not.toBeInTheDocument()
})
it("discards late responses when the selected client changes", async () => {
  let resolve!: (value: unknown) => void
  ;(actions.getReviewWorkpaperBinderAction as jest.Mock).mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const view = render(<ReviewWorkpaperBinder clientOrganizationId="client-a" periodId="period-a" />)
  fireEvent.click(screen.getByRole("button", { name: "Load / refresh workpapers" }))
  view.rerender(<ReviewWorkpaperBinder clientOrganizationId="client-b" periodId="period-b" />)
  await act(async () => resolve({ success: true, data: binder() }))
  expect(screen.queryByText(/client-a ·/)).not.toBeInTheDocument()
})
