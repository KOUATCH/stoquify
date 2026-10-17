import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { stepUpWithPasswordAction as authenticate } from "@/actions/security/step-up-auth.actions"
import { ReconciliationPreparationWorkbench } from "../ReconciliationPreparationWorkbench"
import { readReconciliationPreparationAction as read, previewReconciliationPreparationAction as preview, prepareReconciliationRunAction as prepare, previewAdditionalReconciliationSourcesAction as additionsPreview, incorporateAdditionalReconciliationSourcesAction as incorporate } from "@/actions/payments/reconciliation-preparation.actions"
jest.mock("@/actions/payments/reconciliation-preparation.actions", () => ({ readReconciliationPreparationAction: jest.fn(), previewReconciliationPreparationAction: jest.fn(), prepareReconciliationRunAction: jest.fn(), previewAdditionalReconciliationSourcesAction: jest.fn(), incorporateAdditionalReconciliationSourcesAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }))
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: (namespace: string) => (key: string, values?: unknown) => (namespace.endsWith("signReview") ? "sign." : "") + key + (values ? JSON.stringify(values) : "") }))
const scope = { organizationId: "org", actorId: "actor" }, at = "2026-09-13T10:00:00Z", key = "stoquify:run-preparation:v1:org:actor:run"
const run = { id: "run", status: "NEEDS_REVIEW", providerName: "Provider", currencyCode: "XAF", businessDate: at }
const props = { scope, canRead: true, canReadPreparation: true, canPrepare: true }
beforeEach(() => {
  jest.resetAllMocks(); sessionStorage.clear()
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => "01386bb6-b3bd-4985-9f43-c83206764fbb" })
  ;(read as jest.Mock).mockImplementation(async (query) => ({ success: true, data: query.kind === "runs" ? { kind: "runs", scope, asOf: at, total: 1, nextCursor: null, runs: [run] } : { kind: "history", scope, asOf: at, total: 0, nextCursor: null, run, records: [] } }))
  ;(preview as jest.Mock).mockResolvedValue({ success: true, data: { runId: "run", scope, asOf: at, status: run.status, canPrepare: true, revision: "sha256:" + "a".repeat(64), blocker: null, counts: { providerEventCount: 1 } } })
})
async function open() { fireEvent.click(screen.getByRole("button", { name: "open" })); fireEvent.click(await screen.findByRole("button", { name: "review" })); await waitFor(() => expect(screen.getByRole("button", { name: "preview" })).toBeEnabled()) }
async function requestAuthentication() {
  await open(); fireEvent.change(screen.getByLabelText("reason"), { target: { value: "Reviewed original evidence" } }); fireEvent.click(screen.getByRole("button", { name: "preview" })); await screen.findByText("ready")
  fireEvent.click(screen.getByRole("button", { name: "confirm" })); await waitFor(() => expect(screen.getByLabelText("manualMatch.passwordLabel")).toHaveFocus())
}
it.each(["success", "rejected", "unavailable"])("preserves the reviewed request and correct focus after %s authentication", async outcome => {
  ;(prepare as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" })
  if (outcome === "unavailable") (authenticate as jest.Mock).mockRejectedValueOnce(new Error("Transport unavailable"))
  else (authenticate as jest.Mock).mockResolvedValueOnce({ success: outcome === "success" })
  render(<ReconciliationPreparationWorkbench {...props} />); await requestAuthentication()
  const saved = sessionStorage.getItem(key), input = screen.getByLabelText("manualMatch.passwordLabel")
  fireEvent.change(input, { target: { value: "not-retained-password" } }); fireEvent.click(screen.getByRole("button", { name: "suspenseWorkflow.review.authenticate" }))
  if (outcome === "success") {
    await waitFor(() => expect(screen.getByRole("button", { name: "retry" })).toHaveFocus())
    expect(screen.queryByLabelText("manualMatch.passwordLabel")).not.toBeInTheDocument()
  } else {
    await screen.findByText("suspenseWorkflow.review.authFailed"); expect(input).toHaveValue(""); expect(input).toHaveFocus()
    expect(screen.queryByText("failed")).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "retry" })).toBeDisabled()
  }
  expect(sessionStorage.getItem(key)).toBe(saved); expect(saved).not.toContain("password"); expect(prepare).toHaveBeenCalledTimes(1)
})
it("returns authentication focus to the review when preparation permission was withdrawn", async () => {
  ;(prepare as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" })
  let finish!: (value: unknown) => void
  ;(authenticate as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const host = render(<ReconciliationPreparationWorkbench {...props} />); await requestAuthentication()
  fireEvent.change(screen.getByLabelText("manualMatch.passwordLabel"), { target: { value: "not-retained-password" } }); fireEvent.click(screen.getByRole("button", { name: "suspenseWorkflow.review.authenticate" }))
  host.rerender(<ReconciliationPreparationWorkbench {...props} canPrepare={false} />)
  await act(async () => { finish({ success: true }) })
  expect(screen.getByRole("region", { name: "reviewTitle", exact: true })).toHaveFocus(); expect(screen.getByRole("button", { name: "retry" })).toBeDisabled(); expect(prepare).toHaveBeenCalledTimes(1)
})
it("keeps unreadable drafts until an authoritative reset succeeds", async () => {
  sessionStorage.setItem(key, "{broken"); render(<ReconciliationPreparationWorkbench {...props} />); await open()
  expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled(); expect(screen.getByText("storage")).toBeVisible()
  ;(read as jest.Mock).mockRejectedValueOnce(new Error("offline")); fireEvent.click(screen.getByRole("button", { name: "reset" }))
  await screen.findByText("failed"); expect(sessionStorage.getItem(key)).toBe("{broken")
  fireEvent.click(screen.getByRole("button", { name: "reset" })); await waitFor(() => expect(screen.queryByText("storage")).not.toBeInTheDocument())
  expect(prepare).not.toHaveBeenCalled()
})
it("returns focus to run discovery after paging and failed search reads", async () => {
  const cursor = { id: "run-20", createdAt: at }
  ;(read as jest.Mock).mockImplementation(async query => ({ success: true, data: { kind: "runs", scope, asOf: at, total: 21, nextCursor: query.cursor ? null : cursor, runs: [run] } }))
  render(<ReconciliationPreparationWorkbench {...props} />); fireEvent.click(screen.getByRole("button", { name: "open" }))
  const next = await screen.findByRole("button", { name: "next" }); next.focus(); fireEvent.click(next)
  await waitFor(() => expect(next).toBeDisabled()); expect(screen.getByRole("region", { name: "title", exact: true })).toHaveFocus()
  ;(read as jest.Mock).mockRejectedValueOnce(new Error("Unavailable"))
  const previous = screen.getByRole("button", { name: "previous" }); previous.focus(); fireEvent.click(previous)
  await screen.findByText("failed"); expect(screen.getByRole("region", { name: "title", exact: true })).toHaveFocus()
  expect(screen.getByRole("button", { name: "review" })).toBeDisabled(); expect(prepare).not.toHaveBeenCalled()
})
it("retains and retries the exact uncertain request after reload", async () => {
  const host = render(<ReconciliationPreparationWorkbench {...props} />); await open()
  fireEvent.change(screen.getByLabelText("reason"), { target: { value: "Reviewed retained original evidence" } }); fireEvent.click(screen.getByRole("button", { name: "preview" }))
  await screen.findByText("ready"); (prepare as jest.Mock).mockRejectedValueOnce(new Error("lost reply")); fireEvent.click(screen.getByRole("button", { name: "confirm" }))
  await screen.findByText("failed"); const saved = JSON.parse(sessionStorage.getItem(key)!); expect(saved.pending.runId).toBe("run")
  host.unmount(); render(<ReconciliationPreparationWorkbench {...props} />)
  await waitFor(() => expect(screen.getByRole("button", { name: "retry" })).toBeEnabled())
  ;(prepare as jest.Mock).mockResolvedValueOnce({ success: true, data: { scope, runId: "run", receiptId: "retained", currentStatus: "SIGNED", replayed: true } })
  fireEvent.click(screen.getByRole("button", { name: "retry" })); await waitFor(() => expect(JSON.parse(sessionStorage.getItem(key)!).pending).toBeNull())
  expect((prepare as jest.Mock).mock.calls[0][0]).toEqual((prepare as jest.Mock).mock.calls[1][0]); expect(screen.getByText(/saved.*retained.*SIGNED/)).toBeVisible()
})
it("shows missing evidence without an enabled preparation action", async () => {
  ;(preview as jest.Mock).mockResolvedValue({ success: true, data: { scope, runId: "run", asOf: at, status: run.status, canPrepare: false, revision: null, blocker: "EXTERNAL_EVIDENCE_REQUIRED", counts: null } })
  render(<ReconciliationPreparationWorkbench {...props} />); await open(); fireEvent.click(screen.getByRole("button", { name: "preview" }))
  await screen.findByText("blockers.EXTERNAL_EVIDENCE_REQUIRED"); expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled(); expect(prepare).not.toHaveBeenCalled()
})
it("keeps an uncertain request but disables retry when the server reports read-only access", async () => {
  const pending = { runId: "run", reason: "Reviewed retained evidence", expectedRevision: "sha256:" + "a".repeat(64), idempotencyKey: "01386bb6-b3bd-4985-9f43-c83206764fbb" }
  sessionStorage.setItem(key, JSON.stringify({ operation: "prepare", reason: pending.reason, pending }))
  ;(preview as jest.Mock).mockResolvedValueOnce({ success: true, data: { scope, runId: "run", asOf: at, status: run.status, canPrepare: false, revision: null, counts: null, blocker: "MODULE_WRITE_REQUIRED" } })
  render(<ReconciliationPreparationWorkbench {...props} />); await open()
  fireEvent.click(screen.getByRole("button", { name: "preview" }))
  await screen.findByText("blockers.MODULE_WRITE_REQUIRED")
  expect(screen.getByRole("button", { name: "retry" })).toBeDisabled()
  expect(JSON.parse(sessionStorage.getItem(key)!).pending).toEqual(pending); expect(prepare).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "preview" }))
  await screen.findByText("ready"); expect(screen.getByRole("button", { name: "retry" })).toBeEnabled()
})
it("denies reads without authority and permits history without write access", async () => {
  const host = render(<ReconciliationPreparationWorkbench {...props} canRead={false} />); expect(screen.getByRole("button", { name: "open" })).toBeDisabled(); expect(read).not.toHaveBeenCalled()
  host.rerender(<ReconciliationPreparationWorkbench {...props} canPrepare={false} />); await open(); expect(screen.getByLabelText("reason")).toBeDisabled(); expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled()
})
it("keeps keyboard focus at history after last-page navigation and a failed page read", async () => {
  const cursor = { id: "receipt-20", createdAt: at }, row = { id: "receipt-1", kind: "PREPARATION", recordedAt: at, actorId: "actor", reason: "Reviewed sources", retainedCertificateHash: null }
  ;(read as jest.Mock).mockImplementation(async (query) => ({ success: true, data: query.kind === "runs" ? { kind: "runs", scope, asOf: at, total: 1, nextCursor: null, runs: [run] } : { kind: "history", scope, asOf: at, total: 21, nextCursor: query.cursor ? null : cursor, run, records: [{ ...row, id: query.cursor ? "receipt-21" : row.id }] } }))
  render(<ReconciliationPreparationWorkbench {...props} />); await open()
  const next = screen.getByRole("button", { name: "next" }); next.focus(); fireEvent.click(next)
  await waitFor(() => expect(screen.getByRole("region", { name: "history", exact: true })).toHaveFocus())
  expect(next).toBeDisabled(); expect(screen.getByText(/receipt.*receipt-21/)).toBeVisible()
  ;(read as jest.Mock).mockRejectedValueOnce(new Error("History unavailable"))
  const previous = screen.getByRole("button", { name: "previous" }); previous.focus(); fireEvent.click(previous)
  await screen.findByText("historyFailed")
  expect(screen.getByRole("region", { name: "history", exact: true })).toHaveFocus()
  expect(screen.getByText(/receipt.*receipt-21/)).toBeVisible()
  expect(prepare).not.toHaveBeenCalled()
})
it("lets a signer discover a run without reading private preparation history", async () => {
  const onSign = jest.fn()
  sessionStorage.setItem("stoquify:run-preparation-selection:v1:org:actor", "old-private-run")
  ;(read as jest.Mock).mockResolvedValue({ success: true, data: { kind: "runs", scope, asOf: at, total: 1, nextCursor: null, runs: [{ ...run, status: "READY_FOR_SIGNOFF" }] } })
  render(<ReconciliationPreparationWorkbench {...props} canReadPreparation={false} canPrepare={false} canSign onSign={onSign} />)
  expect(read).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "open" }))
  expect(await screen.findByRole("button", { name: "review" })).toBeDisabled()
  expect(screen.getByText("preparationReadDenied")).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "sign.open" }))
  expect(onSign).toHaveBeenCalledWith("run")
  expect((read as jest.Mock).mock.calls.map(([query]) => query.kind)).toEqual(["runs"])
  expect(preview).not.toHaveBeenCalled(); expect(prepare).not.toHaveBeenCalled()
})
it("withholds signing from a reader and after a failed refresh", async () => {
  const onSign = jest.fn()
  ;(read as jest.Mock).mockResolvedValue({ success: true, data: { kind: "runs", scope, asOf: at, total: 1, nextCursor: null, runs: [{ ...run, status: "READY_FOR_SIGNOFF" }] } })
  const host = render(<ReconciliationPreparationWorkbench {...props} canReadPreparation={false} canPrepare={false} canSign={false} onSign={onSign} />)
  fireEvent.click(screen.getByRole("button", { name: "open" }))
  expect(await screen.findByRole("button", { name: "sign.open" })).toBeDisabled()
  host.rerender(<ReconciliationPreparationWorkbench {...props} canReadPreparation={false} canPrepare={false} canSign onSign={onSign} />)
  ;(read as jest.Mock).mockRejectedValueOnce(new Error("offline"))
  fireEvent.click(screen.getByRole("button", { name: "search" }))
  await screen.findByText("failed")
  expect(screen.getByRole("button", { name: "sign.open" })).toBeDisabled()
  expect(onSign).not.toHaveBeenCalled()
})
