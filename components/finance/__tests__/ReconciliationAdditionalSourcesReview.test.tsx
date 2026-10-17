import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReconciliationPreparationWorkbench } from "../ReconciliationPreparationWorkbench"
import { readReconciliationPreparationAction as read, prepareReconciliationRunAction as prepare, previewAdditionalReconciliationSourcesAction as preview, incorporateAdditionalReconciliationSourcesAction as incorporate } from "@/actions/payments/reconciliation-preparation.actions"
jest.mock("@/actions/payments/reconciliation-preparation.actions", () => ({ readReconciliationPreparationAction: jest.fn(), previewReconciliationPreparationAction: jest.fn(), prepareReconciliationRunAction: jest.fn(), previewAdditionalReconciliationSourcesAction: jest.fn(), incorporateAdditionalReconciliationSourcesAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }))
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string, values?: unknown) => key + (values ? JSON.stringify(values) : "") }))
const scope = { organizationId: "org", actorId: "actor" }, at = "2026-09-27T10:00:00Z", key = "stoquify:run-preparation:v1:org:actor:run"
const run = { id: "run", status: "NEEDS_REVIEW", providerName: "Provider", currencyCode: "XAF", businessDate: at }
const props = { scope, canRead: true, canReadPreparation: true, canPrepare: true }
beforeEach(() => {
  jest.resetAllMocks(); sessionStorage.clear()
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => "01386bb6-b3bd-4985-9f43-c83206764fbb" })
  ;(read as jest.Mock).mockImplementation(async query => ({ success: true, data: query.kind === "runs" ? { kind: "runs", scope, asOf: at, total: 1, nextCursor: null, runs: [run] } : { kind: "history", scope, asOf: at, total: 1, nextCursor: null, run, records: [{ id: "source-receipt", kind: "ADDITIONAL_SOURCES", recordedAt: at, actorId: "retained-operator", reason: "Reviewed additional sources" }] } }))
  ;(preview as jest.Mock).mockResolvedValue({ success: true, data: { scope, runId: "run", asOf: at, canIncorporate: true, revision: "sha256:" + "a".repeat(64), counts: { payments: 1, providerEvents: 1, statementLines: 0 } } })
})
async function open() {
  fireEvent.click(screen.getByRole("button", { name: "open" })); fireEvent.click(await screen.findByRole("button", { name: "review" }))
  await waitFor(() => expect(screen.getByRole("button", { name: "additional.preview" })).toBeEnabled())
}
it("retains the recovery operation and exact command after response loss and reload", async () => {
  const host = render(<ReconciliationPreparationWorkbench {...props} />); await open()
  expect(screen.getByText(/additional.receipt.*source-receipt/)).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "additional.preview" })); await screen.findByText("additional.ready")
  fireEvent.change(screen.getByLabelText("reason"), { target: { value: "Reviewed the additional sources" } })
  ;(incorporate as jest.Mock).mockRejectedValueOnce(new Error("lost response"))
  fireEvent.click(screen.getByRole("button", { name: "additional.confirm" })); await screen.findByText("failed")
  const saved = JSON.parse(sessionStorage.getItem(key)!)
  expect(saved.operation).toBe("additional"); expect(saved.pending.expectedRevision).toBe("sha256:" + "a".repeat(64))
  expect(screen.getByRole("button", { name: "preview" })).toBeDisabled()
  host.unmount(); render(<ReconciliationPreparationWorkbench {...props} />)
  await waitFor(() => expect(screen.getByRole("button", { name: "additional.retry" })).toBeEnabled())
  ;(incorporate as jest.Mock).mockResolvedValueOnce({ success: true, data: { scope, runId: "run", receiptId: "recovered", currentStatus: "NEEDS_REVIEW", replayed: true } })
  fireEvent.click(screen.getByRole("button", { name: "additional.retry" }))
  await waitFor(() => expect(JSON.parse(sessionStorage.getItem(key)!).pending).toBeNull())
  expect((incorporate as jest.Mock).mock.calls[0][0]).toEqual((incorporate as jest.Mock).mock.calls[1][0])
  expect(prepare).not.toHaveBeenCalled(); expect(screen.getByText(/additional.saved.*recovered/)).toBeVisible()
})
it("keeps read failures distinct from empty additions and refuses a foreign preview", async () => {
  ;(preview as jest.Mock).mockRejectedValueOnce(new Error("query failed"))
  render(<ReconciliationPreparationWorkbench {...props} />); await open()
  fireEvent.click(screen.getByRole("button", { name: "additional.preview" })); await screen.findByText("failed")
  expect(screen.queryByText("additional.empty")).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "additional.confirm" })).toBeDisabled()
  ;(preview as jest.Mock).mockResolvedValueOnce({ success: true, data: { scope: { ...scope, organizationId: "foreign" }, runId: "run", canIncorporate: true } })
  fireEvent.click(screen.getByRole("button", { name: "additional.preview" })); await screen.findByText("failed")
  expect(incorporate).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: "additional.confirm" })).toBeDisabled()
})
it("does not offer recovery with revoked write authority", async () => {
  const host = render(<ReconciliationPreparationWorkbench {...props} />); await open()
  fireEvent.click(screen.getByRole("button", { name: "additional.preview" })); await screen.findByText("additional.ready")
  host.rerender(<ReconciliationPreparationWorkbench {...props} canPrepare={false} />)
  expect(screen.getByRole("button", { name: "additional.preview" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "additional.confirm" })).toBeDisabled()
  expect(incorporate).not.toHaveBeenCalled()
})

it("explains reopening a signed run and exposes its retained certificate in preview and history", async () => {
  const hash = "c".repeat(64)
  ;(preview as jest.Mock).mockResolvedValue({ success: true, data: { scope, runId: "run", asOf: at, canIncorporate: true, revision: "sha256:" + "a".repeat(64), counts: { payments: 1, providerEvents: 1, statementLines: 0 }, signedCertificate: { hash, signedById: "independent-signer", signedAt: at } } })
  ;(read as jest.Mock).mockImplementation(async query => ({ success: true, data: query.kind === "runs" ? { kind: "runs", scope, asOf: at, total: 1, nextCursor: null, runs: [{ ...run, status: "SIGNED" }] } : { kind: "history", scope, asOf: at, total: 1, nextCursor: null, run, records: [{ id: "retained-receipt", kind: "ADDITIONAL_SOURCES", recordedAt: at, actorId: "operator", reason: "Later sources", retainedCertificateHash: hash }] } }))
  render(<ReconciliationPreparationWorkbench {...props} />); await open()
  expect(screen.getByText('additional.retainedCertificate' + JSON.stringify({ hash }))).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "additional.preview" })); await screen.findByText("additional.signedConsequences")
  expect(screen.getAllByText('additional.retainedCertificate' + JSON.stringify({ hash }))).toHaveLength(2)
  expect(incorporate).not.toHaveBeenCalled()
})
