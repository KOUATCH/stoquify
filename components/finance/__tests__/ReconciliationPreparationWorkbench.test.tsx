import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReconciliationPreparationWorkbench } from "../ReconciliationPreparationWorkbench"
import { readReconciliationPreparationAction as read, previewReconciliationPreparationAction as preview, prepareReconciliationRunAction as prepare } from "@/actions/payments/reconciliation-preparation.actions"
jest.mock("@/actions/payments/reconciliation-preparation.actions", () => ({ readReconciliationPreparationAction: jest.fn(), previewReconciliationPreparationAction: jest.fn(), prepareReconciliationRunAction: jest.fn() }))
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
it("keeps unreadable drafts until an authoritative reset succeeds", async () => {
  sessionStorage.setItem(key, "{broken"); render(<ReconciliationPreparationWorkbench {...props} />); await open()
  expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled(); expect(screen.getByText("storage")).toBeVisible()
  ;(read as jest.Mock).mockRejectedValueOnce(new Error("offline")); fireEvent.click(screen.getByRole("button", { name: "reset" }))
  await screen.findByText("failed"); expect(sessionStorage.getItem(key)).toBe("{broken")
  fireEvent.click(screen.getByRole("button", { name: "reset" })); await waitFor(() => expect(screen.queryByText("storage")).not.toBeInTheDocument())
  expect(prepare).not.toHaveBeenCalled()
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
it("denies reads without authority and permits history without write access", async () => {
  const host = render(<ReconciliationPreparationWorkbench {...props} canRead={false} />); expect(screen.getByRole("button", { name: "open" })).toBeDisabled(); expect(read).not.toHaveBeenCalled()
  host.rerender(<ReconciliationPreparationWorkbench {...props} canPrepare={false} />); await open(); expect(screen.getByLabelText("reason")).toBeDisabled(); expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled()
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
