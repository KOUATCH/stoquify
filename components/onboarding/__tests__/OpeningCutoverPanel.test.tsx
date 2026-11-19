/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { OpeningCutoverPanel } from "../OpeningCutoverPanel"
import * as actions from "@/actions/onboarding/opening-cutover.actions"
import { getOpeningPositionWorkspaceAction } from "@/actions/onboarding/opening-position.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
jest.mock("@/actions/onboarding/opening-cutover.actions", () => ({
  getOpeningCutoverWorkspaceAction: jest.fn(), approveOpeningCutoverAction: jest.fn(), applyOpeningCutoverAction: jest.fn(), cancelOpeningCutoverAction: jest.fn(),
}))
jest.mock("@/actions/onboarding/opening-position.actions", () => ({ getOpeningPositionWorkspaceAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const execution = { id: "execution-a", revisionId: "revision-a", status: "APPROVED", expiresAt: "2099-01-01", periodId: "period-a", periodVersion: 0, operations: [] }
const workspace = (executions: unknown[] = [], clientOperator = true) => ({ organizationId: "client-a", clientOperator, executions })
beforeEach(() => {
  jest.resetAllMocks()
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "synthetic-command-key" })
  ;(actions.getOpeningCutoverWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: workspace() })
  ;(getOpeningPositionWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: { current: {
    id: "revision-a", revision: 1, reviewState: "REVIEWED", preview: { digest: "source-digest" },
    controls: { ar: "100.00", ap: "50.00", stock: "25.00", debit: "150.00", credit: "150.00" },
  } } })
})
async function load(locale: "en" | "fr" = "en") {
  render(<OpeningCutoverPanel locale={locale} clientOrganizationId="client-a" />)
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Load / recover cutover" : "Charger / récupérer la reprise" }))
  await screen.findByText(locale === "en" ? "Reviewed source #1" : "Source revue #1")
}
it.each(["en", "fr"] as const)("shows labelled financial approval and separately reviewed totals in %s", async locale => {
  await load(locale)
  expect(screen.getByLabelText(locale === "en" ? "Financial approval conclusion" : "Conclusion de l’approbation financière")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: locale === "en" ? "Approve financial cutover" : "Approuver la reprise financière" })).toBeDisabled()
})
it("requires confirmation before financial apply and preserves the same command after a lost response", async () => {
  ;(actions.getOpeningCutoverWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: workspace([execution]) })
  ;(actions.applyOpeningCutoverAction as jest.Mock).mockRejectedValueOnce(Error("lost")).mockResolvedValue({ success: true })
  await load()
  const apply = screen.getByRole("button", { name: "Apply approved opening" })
  expect(apply).toBeDisabled()
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(apply)
  const retry = await screen.findByRole("button", { name: "Retry the same financial command" })
  await waitFor(() => expect(retry).toBeEnabled())
  fireEvent.click(retry)
  await waitFor(() => expect(actions.applyOpeningCutoverAction).toHaveBeenCalledTimes(2))
  expect((actions.applyOpeningCutoverAction as jest.Mock).mock.calls[1]).toEqual((actions.applyOpeningCutoverAction as jest.Mock).mock.calls[0])
  expect(actions.applyOpeningCutoverAction).toHaveBeenCalledWith({ clientOrganizationId: "client-a", executionId: "execution-a", confirmFinancialApply: true, idempotencyKey: "synthetic-command-key" })
})
it("requires explicit retry after fresh authentication; does not auto-post", async () => {
  ;(actions.getOpeningCutoverWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: workspace([execution]) })
  ;(actions.applyOpeningCutoverAction as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" }).mockResolvedValue({ success: true })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  await load(); fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Apply approved opening" }))
  fireEvent.change(await screen.findByLabelText("Password for financial confirmation"), { target: { value: "synthetic-password" } })
  fireEvent.click(screen.getByRole("button", { name: "Verify financial identity" }))
  await screen.findByText("Identity verified. Retry when ready.")
  expect(actions.applyOpeningCutoverAction).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Retry the same financial command" }))
  await waitFor(() => expect(actions.applyOpeningCutoverAction).toHaveBeenCalledTimes(2))
})
it("hides financial actions from a firm reader and permits recovery inspection", async () => {
  ;(actions.getOpeningCutoverWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: workspace([execution], false) })
  await load()
  expect(screen.getByText("Approved — financial apply pending")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Apply approved opening" })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Cancel unapplied approval" })).not.toBeInTheDocument()
})
it("disables an expired approval and offers reasoned cancellation", async () => {
  ;(actions.getOpeningCutoverWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: workspace([{ ...execution, expiresAt: "2020-01-01" }]) })
  await load(); fireEvent.click(screen.getByRole("checkbox"))
  expect(screen.getByRole("button", { name: "Apply approved opening" })).toBeDisabled()
  fireEvent.change(screen.getByLabelText("Cancellation reason"), { target: { value: "Approval expired; recheck source." } })
  expect(screen.getByRole("button", { name: "Cancel unapplied approval" })).toBeEnabled()
})
it("clears source and receipts after current access is denied", async () => {
  await load()
  ;(actions.getOpeningCutoverWorkspaceAction as jest.Mock).mockResolvedValue({ success: false, code: "FORBIDDEN" })
  fireEvent.click(screen.getByRole("button", { name: "Load / recover cutover" }))
  await screen.findByText("Access or source conditions changed. Refresh and review the current source, approval and period.")
  expect(screen.queryByText("Reviewed source #1")).not.toBeInTheDocument()
})
it("ignores late client-A replies after switching to client B", async () => {
  let resolve!: (value: unknown) => void
  ;(actions.getOpeningCutoverWorkspaceAction as jest.Mock).mockReturnValue(new Promise(done => { resolve = done }))
  const view = render(<OpeningCutoverPanel locale="en" clientOrganizationId="client-a" />)
  fireEvent.click(screen.getByRole("button", { name: "Load / recover cutover" }))
  view.rerender(<OpeningCutoverPanel locale="en" clientOrganizationId="client-b" />)
  await act(async () => resolve({ success: true, data: workspace([execution]) }))
  expect(screen.queryByText("Approved — financial apply pending")).not.toBeInTheDocument()
  expect(getOpeningPositionWorkspaceAction).not.toHaveBeenCalled()
})
