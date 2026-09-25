import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReconciliationCertificateExportPanel } from "../ReconciliationCertificateExportPanel"
import { downloadVerifiedEvidence } from "@/hooks/payments/verified-evidence-download"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("@/hooks/payments/verified-evidence-download", () => ({ downloadVerifiedEvidence: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor" }
const run = { id: "run-1", status: "SIGNED", certificateHash: "a".repeat(64), signedAt: "2026-09-09T12:00:00Z" } as NonNullable<Parameters<typeof ReconciliationCertificateExportPanel>[0]["run"]>
const result = { scope, runId: run.id, certificateHash: run.certificateHash, fileName: "recon-cert-run-1.json", mimeType: "application/json", content: "{}", sha256: "b".repeat(64), inboxItemId: "receipt-1" }
const onExport = jest.fn(), onClose = jest.fn()
const props = { scope, run, canRead: true, canExport: true, onExport, onClose }
beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); onExport.mockResolvedValue(result); (downloadVerifiedEvidence as jest.Mock).mockResolvedValue(undefined) })

it("retains an uncertain request across remount and retries the exact command", async () => {
  onExport.mockRejectedValueOnce(new Error("Lost response"))
  const view = render(<ReconciliationCertificateExportPanel {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "download" }))
  await screen.findByText("failed")
  const command = onExport.mock.calls[0][0]
  expect(command).toMatchObject({ runId: run.id, expectedCertificateHash: run.certificateHash })
  view.unmount(); render(<ReconciliationCertificateExportPanel {...props} run={null} />)
  fireEvent.click(await screen.findByRole("button", { name: "retry" }))
  await screen.findByText("downloadRequested")
  expect(onExport.mock.calls[1][0]).toEqual(command)
  expect(downloadVerifiedEvidence).toHaveBeenCalledTimes(1)
  expect(sessionStorage.length).toBe(0)
  await waitFor(() => expect(screen.getByRole("region", { name: "title" })).toHaveFocus())
  fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" })
  expect(onClose).toHaveBeenCalledTimes(1)
})
it.each(["scope", "hash"])("refuses a mismatched %s response without downloading", async kind => {
  onExport.mockResolvedValue({ ...result, ...(kind === "scope" ? { scope: { ...scope, organizationId: "foreign" } } : { certificateHash: "c".repeat(64) }) })
  render(<ReconciliationCertificateExportPanel {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "download" }))
  await screen.findByText("failed")
  expect(downloadVerifiedEvidence).not.toHaveBeenCalled()
  expect(screen.getByRole("button", { name: "retry" })).toBeEnabled()
})
it("verifies identity without automatically repeating a consequential request", async () => {
  onExport.mockRejectedValueOnce({ code: "FRESH_AUTH_REQUIRED" })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  render(<ReconciliationCertificateExportPanel {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "download" }))
  const password = await screen.findByLabelText("password")
  fireEvent.change(password, { target: { value: "owned-test-password" } })
  fireEvent.submit(password.closest("form")!)
  await screen.findByText("authenticated")
  expect(onExport).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "retry" })).toBeEnabled()
})
it("denies export without current permission", async () => {
  render(<ReconciliationCertificateExportPanel {...props} canExport={false} />)
  expect(await screen.findByRole("button", { name: "download" })).toBeDisabled()
  expect(screen.getByText("denied")).toBeInTheDocument()
  expect(onExport).not.toHaveBeenCalled()
})
it("enters the review after its current read permission finishes refreshing", async () => {
  const view = render(<ReconciliationCertificateExportPanel {...props} canRead={false} />)
  expect(screen.queryByRole("region")).not.toBeInTheDocument()
  view.rerender(<ReconciliationCertificateExportPanel {...props} />)
  await waitFor(() => expect(screen.getByRole("region", { name: "title" })).toHaveFocus())
})
it("does not download a response after unmount", async () => {
  let resolve!: (value: unknown) => void
  onExport.mockReturnValue(new Promise(value => { resolve = value }))
  const view = render(<ReconciliationCertificateExportPanel {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "download" }))
  view.unmount(); resolve(result)
  await waitFor(() => expect(onExport).toHaveBeenCalledTimes(1))
  expect(downloadVerifiedEvidence).not.toHaveBeenCalled()
  expect(sessionStorage.length).toBe(1)
})
it("adopts a historical recovery request without issuing it automatically", async () => {
  const command = { runId: run.id, expectedCertificateHash: run.certificateHash!, idempotencyKey: "abcde123-1234-4123-8123-abcdef123456" }
  render(<ReconciliationCertificateExportPanel {...props} recoveryRequest={command} />)
  const retry = await screen.findByRole("button", { name: "retry" })
  expect(onExport).not.toHaveBeenCalled()
  fireEvent.click(retry); await screen.findByText("downloadRequested")
  expect(onExport).toHaveBeenCalledWith(command)
})
it("preserves a different pending request until explicit discard and historical reselection", async () => {
  const previous = { runId: run.id, expectedCertificateHash: run.certificateHash!, idempotencyKey: "abcde123-1234-4123-8123-abcdef123456" }, command = { ...previous, idempotencyKey: "bcdef123-1234-4123-8123-abcdef123456" }
  sessionStorage.setItem("stoquify:certificate-export:v1:org:actor", JSON.stringify(previous))
  const view = render(<ReconciliationCertificateExportPanel {...props} recoveryRequest={command} />)
  await screen.findByText("pendingExists")
  expect(JSON.parse(sessionStorage.getItem("stoquify:certificate-export:v1:org:actor")!)).toEqual(previous)
  fireEvent.click(screen.getByRole("button", { name: "discard" }))
  view.rerender(<ReconciliationCertificateExportPanel {...props} recoveryRequest={{ ...command }} />)
  await screen.findByRole("button", { name: "retry" })
  expect(JSON.parse(sessionStorage.getItem("stoquify:certificate-export:v1:org:actor")!)).toEqual(command)
  expect(onExport).not.toHaveBeenCalled()
})
