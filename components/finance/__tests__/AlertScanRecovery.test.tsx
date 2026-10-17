jest.mock("@/actions/payments/alert-scan-recovery.actions", () => ({ readAlertScanRecoveryAction: jest.fn(), recoverAlertScanPageAction: jest.fn() }))
const invalidate = jest.fn().mockResolvedValue(undefined)
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: invalidate }) }))
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { readAlertScanRecoveryAction, recoverAlertScanPageAction } from "@/actions/payments/alert-scan-recovery.actions"
import { AlertScanRecovery } from "../AlertScanRecovery"
import type { AlertRecoveryView } from "@/services/reconciliation/alert-scan-recovery.contracts"
const scanId = "550e8400-e29b-41d4-a716-446655440000", commandId = "650e8400-e29b-41d4-a716-446655440000"
const initial = (): AlertRecoveryView => ({ scanId, revision: "a".repeat(64), eligible: true, reason: "READY", receipt: null, progress: { state: "FAILED", phase: "SUSPENSE", version: 4, examined: 100, created: 10, updatedAt: "2026-10-04T12:00:00Z" } })
const completed = (): AlertRecoveryView => ({ ...initial(), revision: "b".repeat(64), eligible: false, reason: "COMPLETE", progress: { ...initial().progress!, state: "COMPLETE", phase: "COMPLETE", version: 5 }, receipt: { commandId, scanId, fromVersion: 4, toVersion: 5, state: "COMPLETE", phase: "COMPLETE", examined: 100, created: 10, recordedAt: "2026-10-04T12:00:00Z" } })
beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => commandId })
  ;(readAlertScanRecoveryAction as jest.Mock).mockResolvedValue({ ok: true, data: initial() })
  ;(recoverAlertScanPageAction as jest.Mock).mockResolvedValue({ ok: true, data: completed() })
})
async function ready() { render(<AlertScanRecovery scanId={scanId} locale="en" />); await screen.findByRole("checkbox") }
async function submit() { fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Advance one scan page" })); await waitFor(() => expect(recoverAlertScanPageAction).toHaveBeenCalledTimes(1)) }
it("requires checkpoint review and refreshes the authoritative inbox after a receipt", async () => {
  await ready(); expect(screen.getByRole("button", { name: "Advance one scan page" })).toBeDisabled()
  await submit()
  expect(await screen.findByRole("heading", { name: "Page recovery recorded" })).toHaveFocus()
  expect(recoverAlertScanPageAction).toHaveBeenCalledWith({ scanId, commandId, expectedRevision: "a".repeat(64) })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["payment-reconciliation"] })
})
it("resolves an unknown committed result without another mutation", async () => {
  ;(recoverAlertScanPageAction as jest.Mock).mockRejectedValueOnce(new Error("lost response"))
  await ready(); await submit()
  expect(await screen.findByText(/The result is unknown/)).toBeInTheDocument()
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  ;(readAlertScanRecoveryAction as jest.Mock).mockResolvedValue({ ok: true, data: completed() })
  fireEvent.click(screen.getByRole("button", { name: "Check recovery status" }))
  expect(await screen.findByRole("heading", { name: "Page recovery recorded" })).toBeInTheDocument()
  expect(recoverAlertScanPageAction).toHaveBeenCalledTimes(1)
})
it("looks up the original request before a same-key retry", async () => {
  ;(recoverAlertScanPageAction as jest.Mock).mockRejectedValueOnce(new Error("lost response"))
  await ready(); await submit(); await screen.findByText(/The result is unknown/)
  fireEvent.click(screen.getByRole("button", { name: "Check recovery status" }))
  await screen.findByRole("checkbox"); fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.click(screen.getByRole("button", { name: "Retry the same request" }))
  await screen.findByRole("heading", { name: "Page recovery recorded" })
  const calls = (recoverAlertScanPageAction as jest.Mock).mock.calls
  expect(calls[1][0]).toEqual(calls[0][0]); expect(readAlertScanRecoveryAction).toHaveBeenCalledTimes(3)
})
it("requires explicit current-checkpoint review when another worker advanced", async () => {
  ;(recoverAlertScanPageAction as jest.Mock).mockResolvedValueOnce({ ok: false, code: "STALE" })
  await ready(); await submit(); await screen.findByText(/The result is unknown/)
  ;(readAlertScanRecoveryAction as jest.Mock).mockResolvedValue({ ok: true, data: { ...initial(), revision: "c".repeat(64) } })
  fireEvent.click(screen.getByRole("button", { name: "Check recovery status" }))
  fireEvent.click(await screen.findByRole("button", { name: "Review the current checkpoint" }))
  expect(await screen.findByRole("checkbox")).not.toBeChecked()
  expect(recoverAlertScanPageAction).toHaveBeenCalledTimes(1)
})
it("does not continue a retry when the view unmounts during status lookup", async () => {
  ;(recoverAlertScanPageAction as jest.Mock).mockRejectedValueOnce(new Error("lost"))
  const mounted = render(<AlertScanRecovery scanId={scanId} locale="en" />)
  await screen.findByRole("checkbox"); await submit(); await screen.findByText(/The result is unknown/)
  fireEvent.click(screen.getByRole("button", { name: "Check recovery status" })); await screen.findByRole("checkbox")
  fireEvent.click(screen.getByRole("checkbox"))
  let resolve!: (value: unknown) => void
  ;(readAlertScanRecoveryAction as jest.Mock).mockImplementationOnce(() => new Promise(done => { resolve = done }))
  fireEvent.click(screen.getByRole("button", { name: "Retry the same request" })); mounted.unmount()
  await act(async () => { resolve({ ok: true, data: initial() }) })
  expect(recoverAlertScanPageAction).toHaveBeenCalledTimes(1)
})
it.each(["DISABLED", "ESCALATE", "COMPLETE"] as const)("has no mutation button for %s and keeps French guidance explicit", async reason => {
  ;(readAlertScanRecoveryAction as jest.Mock).mockResolvedValue({ ok: true, data: { ...initial(), reason, eligible: false } })
  render(<AlertScanRecovery scanId={scanId} locale="fr" />)
  await waitFor(() => expect(screen.getByRole("button", { name: "Vérifier la reprise" })).toBeEnabled())
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Avancer d’une page" })).not.toBeInTheDocument()
})
