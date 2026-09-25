import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReconciliationSignReview } from "../ReconciliationSignReview"
import { previewReconciliationSignOffAction as preview, signReviewedReconciliationAction as sign } from "@/actions/payments/reconciliation-sign-review.actions"
import { stepUpWithPasswordAction as authenticate } from "@/actions/security/step-up-auth.actions"
jest.mock("@/actions/payments/reconciliation-sign-review.actions", () => ({ previewReconciliationSignOffAction: jest.fn(), signReviewedReconciliationAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }))
jest.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string, values?: unknown) => key + (values ? JSON.stringify(values) : "") }))
const scope = { organizationId: "org", actorId: "actor" }, at = "2026-09-13T10:00:00Z", key = "stoquify:sign-review:v1:org:actor:run"
const command = { runId: "run", expectedSourceVersionHash: "sha256:" + "a".repeat(64), expectedEvidenceRevision: "sha256:" + "b".repeat(64), correlationId: "01386bb6-b3bd-4985-9f43-c83206764fbb" }
const props = { scope, runId: "run", canSign: true, onClose: jest.fn(), onExport: jest.fn() }
beforeEach(() => {
  jest.resetAllMocks(); sessionStorage.clear()
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => command.correlationId })
  ;(preview as jest.Mock).mockResolvedValue({ success: true, data: { ...command, scope, asOf: at, businessDate: at, provider: "Provider", currencyCode: "XAF", status: "READY_FOR_SIGNOFF", canSign: true, blocker: null, counts: { providerEventCount: 1 }, totals: { matched: "100.25" } } })
})
it("preserves the exact request across uncertain response and reload, then hands the real certificate to export", async () => {
  ;(sign as jest.Mock).mockRejectedValueOnce(new Error("lost response"))
  const host = render(<ReconciliationSignReview {...props} />); await screen.findByText("ready"); fireEvent.click(screen.getByRole("button", { name: "confirm" }))
  await screen.findByText("failed"); expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(command); host.unmount()
  render(<ReconciliationSignReview {...props} />); await waitFor(() => expect(screen.getByRole("button", { name: "retry" })).toBeEnabled())
  ;(sign as jest.Mock).mockResolvedValueOnce({ success: true, data: { runId: "run", status: "SIGNED", signedAt: at, certificateHash: "c".repeat(64), replayed: true } })
  fireEvent.click(screen.getByRole("button", { name: "retry" })); await waitFor(() => expect(sessionStorage.getItem(key)).toBeNull())
  expect((sign as jest.Mock).mock.calls).toEqual([[command], [command]])
  fireEvent.click(screen.getByRole("button", { name: "export" })); expect(props.onExport).toHaveBeenCalledWith({ id: "run", status: "SIGNED", signedAt: at, certificateHash: "c".repeat(64) })
})
it("confirms password without automatically signing and retains the reviewed request", async () => {
  ;(sign as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED", error: "confirm identity" })
  ;(authenticate as jest.Mock).mockResolvedValue({ success: true })
  render(<ReconciliationSignReview {...props} />); await screen.findByText("ready"); fireEvent.click(screen.getByRole("button", { name: "confirm" }))
  await waitFor(() => expect(screen.getByLabelText("manualMatch.passwordLabel")).toHaveFocus())
  fireEvent.change(screen.getByLabelText("manualMatch.passwordLabel"), { target: { value: "not-retained-password" } }); fireEvent.click(screen.getByRole("button", { name: "suspenseWorkflow.review.authenticate" }))
  await waitFor(() => expect(screen.getByRole("button", { name: "retry" })).toBeEnabled()); expect(sign).toHaveBeenCalledTimes(1); expect(sessionStorage.getItem(key)).not.toContain("password")
})
it("blocks signing with corrupt recovery and keeps it when authoritative reread fails", async () => {
  sessionStorage.setItem(key, "broken"); render(<ReconciliationSignReview {...props} />); await screen.findByText("ready")
  expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled()
  ;(preview as jest.Mock).mockRejectedValueOnce(new Error("offline")); fireEvent.click(screen.getByRole("button", { name: "reviewAgain" })); await screen.findByText("failed")
  expect(sessionStorage.getItem(key)).toBe("broken"); expect(sign).not.toHaveBeenCalled()
})
it("does not read or sign without authority", () => {
  render(<ReconciliationSignReview {...props} canSign={false} />); expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled(); expect(preview).not.toHaveBeenCalled(); expect(sign).not.toHaveBeenCalled()
})
