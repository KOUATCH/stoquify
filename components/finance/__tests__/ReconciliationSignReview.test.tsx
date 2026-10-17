import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
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
  ;(preview as jest.Mock).mockResolvedValue({ success: true, data: { ...command, scope, asOf: at, businessDate: at, provider: "Provider", currencyCode: "XAF", status: "READY_FOR_SIGNOFF", canSign: true, blocker: null, counts: { providerEventCount: 1 }, amountSummary: { version: 1, basis: "GROSS_SOURCE_AMOUNTS_BY_CURRENCY", currencies: [{ currencyCode: "XAF", amounts: { payments: "100.25", providerEvents: "100.25", statementLines: "100.25", matched: "100.25", unresolvedSuspense: "0.00" } }] } } })
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
  expect(screen.getByRole("button", { name: "retry" })).toHaveFocus()
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

it("presents source amounts separately and preserves unknown evidence without a combined total", async () => {
  ;(preview as jest.Mock).mockResolvedValueOnce({ success: true, data: { ...command, scope, asOf: at, businessDate: at, provider: "Provider", currencyCode: "XAF", status: "READY_FOR_SIGNOFF", canSign: true, blocker: null, counts: null, amountSummary: { version: 1, basis: "GROSS_SOURCE_AMOUNTS_BY_CURRENCY", currencies: [{ currencyCode: "EUR", amounts: { payments: "7.25", providerEvents: null, statementLines: "7.25", matched: "7.25", unresolvedSuspense: "0.00" } }, { currencyCode: "XAF", amounts: { payments: "100.25", providerEvents: "100.25", statementLines: "100.25", matched: "100.25", unresolvedSuspense: "0.00" } }] } } })
  render(<ReconciliationSignReview {...props} />); await screen.findByText("ready")
  expect(screen.getByText("amounts.explanation")).toBeVisible()
  expect(screen.getByText("amounts.unavailable")).toBeVisible()
  expect(screen.getByText("0.00 XAF")).toBeVisible()
  expect(screen.getByText("0.00 EUR")).toBeVisible()
  expect(screen.queryByText("200.50 XAF")).not.toBeInTheDocument()
  expect(screen.queryByText("totals.suspense")).not.toBeInTheDocument()
})


it("withdraws displayed evidence immediately and rereads after authority is restored", async () => {
  const host = render(<ReconciliationSignReview {...props} />); await screen.findByText("ready")
  host.rerender(<ReconciliationSignReview {...props} canSign={false} />)
  expect(screen.queryByText(/^Provider ·/)).not.toBeInTheDocument()
  expect(screen.queryByText("amounts.explanation")).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled()
  host.rerender(<ReconciliationSignReview {...props} />)
  await screen.findByText("ready"); expect(preview).toHaveBeenCalledTimes(2)
})

it("ignores a late preview from withdrawn authority even after authority returns", async () => {
  const current = await (preview as jest.Mock)()
  jest.clearAllMocks()
  let finish!: (value: unknown) => void
  ;(preview as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const host = render(<ReconciliationSignReview {...props} />)
  host.rerender(<ReconciliationSignReview {...props} canSign={false} />)
  ;(preview as jest.Mock).mockResolvedValueOnce({ ...current, data: { ...current.data, provider: "Current provider" } })
  host.rerender(<ReconciliationSignReview {...props} />)
  await screen.findByText(/Current provider/)
  await act(async () => { finish({ ...current, data: { ...current.data, provider: "Withdrawn provider" } }) })
  expect(screen.queryByText(/Withdrawn provider/)).not.toBeInTheDocument()
  expect(screen.getByText(/Current provider/)).toBeVisible()
})

it("retains an uncertain signing request without displaying a late certificate after withdrawal", async () => {
  let finish!: (value: unknown) => void
  ;(sign as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const host = render(<ReconciliationSignReview {...props} />); await screen.findByText("ready")
  fireEvent.click(screen.getByRole("button", { name: "confirm" }))
  host.rerender(<ReconciliationSignReview {...props} canSign={false} />)
  await act(async () => { finish({ success: true, data: { runId: "run", status: "SIGNED", signedAt: at, certificateHash: "c".repeat(64) } }) })
  expect(screen.queryByRole("button", { name: "export" })).not.toBeInTheDocument()
  expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(command)
  expect(props.onExport).not.toHaveBeenCalled()
  host.rerender(<ReconciliationSignReview {...props} />)
  await waitFor(() => expect(screen.getByRole("button", { name: "retry" })).toBeEnabled())
  expect(sign).toHaveBeenCalledTimes(1)
})

it("removes the password form on withdrawal and ignores a late authentication failure", async () => {
  ;(sign as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" })
  let finish!: (value: unknown) => void
  ;(authenticate as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const host = render(<ReconciliationSignReview {...props} />); await screen.findByText("ready")
  fireEvent.click(screen.getByRole("button", { name: "confirm" }))
  await screen.findByLabelText("manualMatch.passwordLabel")
  fireEvent.change(screen.getByLabelText("manualMatch.passwordLabel"), { target: { value: "not-retained-password" } })
  fireEvent.click(screen.getByRole("button", { name: "suspenseWorkflow.review.authenticate" }))
  host.rerender(<ReconciliationSignReview {...props} canSign={false} />)
  expect(screen.queryByLabelText("manualMatch.passwordLabel")).not.toBeInTheDocument()
  await act(async () => { finish({ success: false }) })
  expect(screen.queryByText("failed")).not.toBeInTheDocument()
  expect(sessionStorage.getItem(key)).not.toContain("password")
  expect(sign).toHaveBeenCalledTimes(1)
})


it("explains a read-only module and disables confirmation", async () => {
  ;(preview as jest.Mock).mockResolvedValueOnce({ success: true, data: { ...command, scope, asOf: at, businessDate: at, provider: "Provider", currencyCode: "XAF", canSign: false, blocker: "MODULE_WRITE_REQUIRED", counts: null, amountSummary: null } })
  render(<ReconciliationSignReview {...props} />)
  await screen.findByText("moduleUnavailable")
  expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled()
  expect(sign).not.toHaveBeenCalled()
})


it("retains but disables an uncertain command while module writes are unavailable", async () => {
  sessionStorage.setItem(key, JSON.stringify(command))
  ;(preview as jest.Mock).mockResolvedValueOnce({ success: true, data: { ...command, scope, asOf: at, businessDate: at, provider: "Provider", currencyCode: "XAF", canSign: false, blocker: "MODULE_WRITE_REQUIRED", counts: null, amountSummary: null } })
  render(<ReconciliationSignReview {...props} />); await screen.findByText("moduleUnavailable")
  expect(screen.getByRole("button", { name: "retry" })).toBeDisabled()
  expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(command)
  expect(sign).not.toHaveBeenCalled()
})


it.each(["rejected", "unavailable"])("explains %s authentication without calling it an uncertain signature", async failure => {
  ;(sign as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" })
  if (failure === "rejected") (authenticate as jest.Mock).mockResolvedValueOnce({ success: false })
  else (authenticate as jest.Mock).mockRejectedValueOnce(new Error("transport unavailable"))
  render(<ReconciliationSignReview {...props} />); await screen.findByText("ready"); fireEvent.click(screen.getByRole("button", { name: "confirm" }))
  const input = await screen.findByLabelText("manualMatch.passwordLabel")
  fireEvent.change(input, { target: { value: "not-retained-password" } }); fireEvent.click(screen.getByRole("button", { name: "suspenseWorkflow.review.authenticate" }))
  await screen.findByText("suspenseWorkflow.review.authFailed"); expect(screen.queryByText("failed")).not.toBeInTheDocument()
  expect(input).toHaveValue(""); expect(input).toHaveFocus(); expect(sign).toHaveBeenCalledTimes(1)
  expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(command); expect(screen.getByRole("button", { name: "retry" })).toBeDisabled()
})
