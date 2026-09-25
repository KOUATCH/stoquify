import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReconciliationCertificateHistory } from "../ReconciliationCertificateHistory"
import { readReconciliationCertificateHistoryAction } from "@/actions/payments/reconciliation.actions"
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }))
jest.mock("@/actions/payments/reconciliation.actions", () => ({ readReconciliationCertificateHistoryAction: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor" }, run = { id: "old-run", providerName: "Older provider", currencyCode: "XAF", status: "SIGNED", certificateHash: "a".repeat(64), businessDate: "2026-08-01T00:00:00Z", signedAt: "2026-08-02T00:00:00Z" }
const page = { kind: "runs", scope, asOf: "2026-09-09T00:00:00Z", runs: [run], nextCursor: null }
const props = { scope, canRead: true, canExport: true, onReview: jest.fn() }
beforeEach(() => { jest.clearAllMocks(); (readReconciliationCertificateHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: page }) })
it("browses an older run and selects a retained request without issuing a download", async () => {
  render(<ReconciliationCertificateHistory {...props} />)
  fireEvent.click(screen.getByRole("button", { name: "open" }))
  await screen.findByText("Older provider · XAF")
  const command = { runId: run.id, expectedCertificateHash: run.certificateHash, idempotencyKey: "abcde123-1234-4123-8123-abcdef123456" }
  ;(readReconciliationCertificateHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: { ...page, kind: "exports", run, receipts: [{ id: "receipt", state: "verified", createdAt: page.asOf, recoveryRequest: command }] } })
  fireEvent.click(screen.getByRole("button", { name: "inspect" }))
  fireEvent.click(await screen.findByRole("button", { name: "recover" }))
  expect(props.onReview).toHaveBeenCalledWith(run, command)
  expect(readReconciliationCertificateHistoryAction).toHaveBeenLastCalledWith({ kind: "exports", runId: run.id })
})
it("retains previous rows after query failure and retries the exact filters", async () => {
  render(<ReconciliationCertificateHistory {...props} />)
  fireEvent.click(screen.getByRole("button", { name: "open" })); await screen.findByText("Older provider · XAF")
  ;(readReconciliationCertificateHistoryAction as jest.Mock).mockRejectedValueOnce(new Error("Unavailable"))
  fireEvent.change(screen.getByLabelText("searchLabel"), { target: { value: "new query" } })
  fireEvent.click(screen.getByRole("button", { name: "search" })); await screen.findByText("failed")
  expect(screen.getByText("Older provider · XAF")).toBeInTheDocument(); expect(screen.getByText("previousResults")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "retry" }))
  await waitFor(() => expect(screen.queryByText("failed")).not.toBeInTheDocument())
  expect(readReconciliationCertificateHistoryAction).toHaveBeenLastCalledWith({ kind: "runs", search: "new query" })
})
it("does not display a response from another workspace", async () => {
  ;(readReconciliationCertificateHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: { ...page, scope: { ...scope, organizationId: "foreign" } } })
  render(<ReconciliationCertificateHistory {...props} />); fireEvent.click(screen.getByRole("button", { name: "open" }))
  await screen.findByText("failed"); expect(screen.queryByText("Older provider · XAF")).not.toBeInTheDocument()
})
it("returns focus after closing history and disables discovery without read permission", async () => {
  const view = render(<ReconciliationCertificateHistory {...props} />), opener = screen.getByRole("button", { name: "open" })
  fireEvent.click(opener); await screen.findByText("Older provider · XAF")
  expect(screen.getByRole("region")).toHaveFocus()
  fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" })
  await waitFor(() => expect(opener).toHaveFocus())
  view.rerender(<ReconciliationCertificateHistory {...props} canRead={false} />)
  expect(opener).toBeDisabled()
})
