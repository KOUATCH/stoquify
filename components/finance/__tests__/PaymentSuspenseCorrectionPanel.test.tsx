import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PaymentSuspenseCorrectionPanel } from "../PaymentSuspenseCorrectionPanel"
import { previewSuspenseCorrectionAction, proposeSuspenseCorrectionAction, readSuspenseCorrectionHistoryAction } from "@/actions/payments/reconciliation.actions"
import { loadSuspenseRecords } from "../PaymentSuspenseHistory"
import { exportSuspenseCorrectionAction } from "@/actions/payments/reconciliation.actions"
import { downloadCorrectionEvidence } from "@/hooks/payments/correction-export-download"
jest.mock("@/hooks/payments/correction-export-download", () => ({ downloadCorrectionEvidence: jest.fn() }))
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ permissionState: "ready", user: { id: "actor" }, organizationId: "org", hasPermission: () => true }) }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@/actions/payments/reconciliation.actions", () => ({ previewSuspenseCorrectionAction: jest.fn(), proposeSuspenseCorrectionAction: jest.fn(), reviewSuspenseCorrectionAction: jest.fn(), decideSuspenseCorrectionAction: jest.fn(), readSuspenseCorrectionHistoryAction: jest.fn(), exportSuspenseCorrectionAction: jest.fn() }))
jest.mock("../PaymentSuspenseHistory", () => ({ loadSuspenseRecords: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor" }
const item = { id: "item", status: "POSTED_TO_SUSPENSE", amount: 100.25, postingCycle: 1, currencyCode: "XAF" } as Parameters<typeof PaymentSuspenseCorrectionPanel>[0]["initialItem"]
const props = { scope, initialItem: item, authority: { canRead: true, canPropose: true, canDecide: true }, onClose: jest.fn(), onChanged: jest.fn(async () => {}), formatDateTime: (value: string | null | undefined) => value ?? "" }
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear()
  ;(loadSuspenseRecords as jest.Mock).mockResolvedValue({ scope, items: [item] })
  ;(readSuspenseCorrectionHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, records: [], nextCursor: null } })
  ;(previewSuspenseCorrectionAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, revision: "sha256:" + "a".repeat(64), originalJournalNumber: "SP-1", amount: "100.25", currencyCode: "XAF", reversalDate: "2026-09-09" } })
})
async function openPreview() {
  await screen.findByText("suspenseWorkflow.states.POSTED_TO_SUSPENSE")
  fireEvent.change(screen.getByLabelText("suspenseCorrection.reason"), { target: { value: "Evidence requires correction" } })
  fireEvent.change(screen.getByLabelText("suspenseCorrection.date"), { target: { value: "2026-09-09" } })
  fireEvent.click(screen.getByRole("button", { name: "suspenseCorrection.preview" }))
}
function exportHistory() {
  ;(readSuspenseCorrectionHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, records: [{ id: "record", revision: "sha256:" + "a".repeat(64), kind: "SUSPENSE_CORRECTION_APPROVED_V1", cycle: 1, recordedAt: "2026-09-09", reason: "Approved correction" }], nextCursor: null } })
}
it("retains an uncertain export across reload and downloads only the scoped successful retry", async () => {
  exportHistory()
  const file = { scope, receiptId: "issued", content: "{}", sha256: "hash", fileName: "file.json", mimeType: "application/json" }
  ;(exportSuspenseCorrectionAction as jest.Mock).mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true, data: file })
  const full = { ...props, authority: { ...props.authority, canExport: true } }
  const view = render(<PaymentSuspenseCorrectionPanel {...full} />)
  fireEvent.click(await screen.findByRole("button", { name: "suspenseCorrection.exportRecord" }))
  await screen.findByText("suspenseCorrection.failed")
  const command = (exportSuspenseCorrectionAction as jest.Mock).mock.calls[0][0]
  expect(downloadCorrectionEvidence).not.toHaveBeenCalled()
  view.unmount(); render(<PaymentSuspenseCorrectionPanel {...full} />)
  await screen.findByText("suspenseWorkflow.states.POSTED_TO_SUSPENSE")
  fireEvent.click(screen.getByRole("button", { name: "suspenseCorrection.retry" }))
  await screen.findByText("suspenseCorrection.downloadRequested")
  expect((exportSuspenseCorrectionAction as jest.Mock).mock.calls[1][0]).toEqual(command)
  expect(downloadCorrectionEvidence).toHaveBeenCalledWith(file, expect.any(Function))
})
it("does not offer export without permission or download a response for another workspace", async () => {
  exportHistory()
  const view = render(<PaymentSuspenseCorrectionPanel {...props} />)
  await screen.findByText("Approved correction")
  expect(screen.queryByRole("button", { name: "suspenseCorrection.exportRecord" })).not.toBeInTheDocument()
  view.unmount()
  ;(exportSuspenseCorrectionAction as jest.Mock).mockResolvedValue({ success: true, data: { scope: { ...scope, organizationId: "foreign" }, content: "private" } })
  render(<PaymentSuspenseCorrectionPanel {...props} authority={{ ...props.authority, canExport: true }} />)
  fireEvent.click(await screen.findByRole("button", { name: "suspenseCorrection.exportRecord" }))
  await screen.findByText("suspenseCorrection.failed")
  expect(downloadCorrectionEvidence).not.toHaveBeenCalled()
})
it("restores keyboard focus after a successful download handoff", async () => {
  exportHistory()
  ;(exportSuspenseCorrectionAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, receiptId: "issued", content: "{}", sha256: "hash" } })
  ;(downloadCorrectionEvidence as jest.Mock).mockImplementationOnce(async () => (document.activeElement as HTMLElement)?.blur())
  render(<PaymentSuspenseCorrectionPanel {...props} authority={{ ...props.authority, canExport: true }} />)
  const button = await screen.findByRole("button", { name: "suspenseCorrection.exportRecord" })
  button.focus(); fireEvent.click(button)
  await screen.findByText("suspenseCorrection.downloadRequested")
  await waitFor(() => expect(button).toHaveFocus())
})
it("retains the exact submitted proposal across an uncertain response and remount", async () => {
  ;(proposeSuspenseCorrectionAction as jest.Mock).mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true, data: { scope, proposalId: "proposal", replayed: true } })
  const view = render(<PaymentSuspenseCorrectionPanel {...props} />); await openPreview()
  fireEvent.click(await screen.findByRole("button", { name: "suspenseCorrection.propose" }))
  await screen.findByText("suspenseCorrection.failed")
  const command = (proposeSuspenseCorrectionAction as jest.Mock).mock.calls[0][0]
  expect(command).toMatchObject({ suspenseItemId: "item", reason: "Evidence requires correction", reversalDate: "2026-09-09" })
  view.unmount(); render(<PaymentSuspenseCorrectionPanel {...props} />)
  await screen.findByText("suspenseWorkflow.states.POSTED_TO_SUSPENSE")
  fireEvent.click(screen.getByRole("button", { name: "suspenseCorrection.retry" }))
  await screen.findByText("suspenseCorrection.proposalRecorded")
  expect((proposeSuspenseCorrectionAction as jest.Mock).mock.calls[1][0]).toEqual(command)
  expect(screen.queryByText("suspenseCorrection.pending")).not.toBeInTheDocument()
})
it("refuses a preview returned under another identity instead of exposing its financial data", async () => {
  ;(previewSuspenseCorrectionAction as jest.Mock).mockResolvedValue({ success: true, data: { scope: { ...scope, actorId: "other" }, originalJournalNumber: "PRIVATE-OTHER", amount: "12345.67" } })
  render(<PaymentSuspenseCorrectionPanel {...props} />); await openPreview()
  await screen.findByText("suspenseCorrection.failed")
  expect(screen.queryByText(/PRIVATE-OTHER/)).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "suspenseCorrection.propose" })).not.toBeInTheDocument()
})
it("restores an unsubmitted draft without changing the textarea accessible name", async () => {
  const view = render(<PaymentSuspenseCorrectionPanel {...props} />)
  await screen.findByText("suspenseWorkflow.states.POSTED_TO_SUSPENSE")
  fireEvent.change(screen.getByLabelText("suspenseCorrection.reason", { exact: true }), { target: { value: "Retained draft evidence" } })
  view.unmount(); render(<PaymentSuspenseCorrectionPanel {...props} />)
  await screen.findByText("suspenseWorkflow.states.POSTED_TO_SUSPENSE")
  expect(screen.getByRole("textbox", { name: "suspenseCorrection.reason", exact: true })).toHaveValue("Retained draft evidence")
  expect(screen.getByLabelText("suspenseCorrection.reason", { exact: true })).toHaveValue("Retained draft evidence")
})
it("does not submit when the pending recovery record cannot be saved", async () => {
  render(<PaymentSuspenseCorrectionPanel {...props} />); await openPreview()
  const button = await screen.findByRole("button", { name: "suspenseCorrection.propose" })
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage unavailable") })
  try { fireEvent.click(button); await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("suspenseCorrection.storage")); expect(proposeSuspenseCorrectionAction).not.toHaveBeenCalled() }
  finally { write.mockRestore() }
})
