import { fireEvent, render, screen } from "@testing-library/react"
import { PaymentSuspenseResolutionPanel } from "../PaymentSuspenseResolutionPanel"
import * as actions from "@/actions/payments/suspense-resolution.actions"
import { downloadResolutionEvidence } from "@/hooks/payments/resolution-export-download"
jest.mock("@/hooks/payments/resolution-export-download", () => ({ downloadResolutionEvidence: jest.fn() }))
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "en" }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@/actions/payments/suspense-resolution.actions", () => ({ exportSuspenseResolutionAction: jest.fn(), readSuspenseResolutionWorkspaceAction: jest.fn(), searchSuspenseClearingJournalsAction: jest.fn(), previewSuspenseResolutionAction: jest.fn(), proposeSuspenseResolutionAction: jest.fn(), reviewSuspenseResolutionAction: jest.fn(), decideSuspenseResolutionAction: jest.fn(), previewSuspenseResolutionRecoveryAction: jest.fn(), proposeSuspenseResolutionRecoveryAction: jest.fn(), reviewSuspenseResolutionRecoveryAction: jest.fn(), decideSuspenseResolutionRecoveryAction: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor" }, props = { scope, itemId: "item", authority: { canRead: true, canPropose: true, canDecide: true, canRecover: true }, onClose: jest.fn(), onChanged: jest.fn(async () => {}), formatDateTime: (value: string | null | undefined) => value ?? "" }
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear()
  ;(actions.readSuspenseResolutionWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, item: { id: "item", status: "POSTED_TO_SUSPENSE", amount: "100.25", currencyCode: "XAF" }, history: [], nextCursor: null } })
  ;(actions.searchSuspenseClearingJournalsAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, journals: [{ id: "journal", number: "JE-1", reference: "Source" }], nextCursor: null } })
  ;(actions.previewSuspenseResolutionAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, revision: "sha256:" + "a".repeat(64), amount: "100.25", currencyCode: "XAF", clearingJournal: { number: "JE-1" }, destination: { code: "401", nameEn: "Destination" } } })
})
async function preview() {
  fireEvent.click(await screen.findByRole("button", { name: "suspenseResolution.find" }))
  fireEvent.change(await screen.findByLabelText("suspenseResolution.clearing"), { target: { value: "journal" } })
  fireEvent.change(screen.getByLabelText("suspenseResolution.reason"), { target: { value: "Reviewed complete clearing evidence" } })
  fireEvent.click(screen.getByRole("button", { name: "suspenseResolution.preview" }))
}
it("retains exact uncertain submission across remount and explicit retry", async () => {
  ;(actions.proposeSuspenseResolutionAction as jest.Mock).mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true, data: { scope, proposalId: "p", replayed: true } })
  const view = render(<PaymentSuspenseResolutionPanel {...props} />); await preview()
  fireEvent.click(await screen.findByRole("button", { name: "suspenseResolution.propose" })); await screen.findByText("suspenseResolution.failed")
  const command = (actions.proposeSuspenseResolutionAction as jest.Mock).mock.calls[0][0]
  view.unmount(); render(<PaymentSuspenseResolutionPanel {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "suspenseCorrection.retry" })); await screen.findByText("suspenseResolution.recorded")
  expect((actions.proposeSuspenseResolutionAction as jest.Mock).mock.calls[1][0]).toEqual(command)
})
it("does not display financial evidence returned for another actor", async () => {
  ;(actions.previewSuspenseResolutionAction as jest.Mock).mockResolvedValue({ success: true, data: { scope: { ...scope, actorId: "other" }, clearingJournal: { number: "PRIVATE" } } })
  render(<PaymentSuspenseResolutionPanel {...props} />); await preview(); await screen.findByText("suspenseResolution.failed")
  expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "suspenseResolution.propose" })).not.toBeInTheDocument()
})
it("does not load evidence after read authority is denied", async () => {
  render(<PaymentSuspenseResolutionPanel {...props} authority={{ ...props.authority, canRead: false }} />)
  expect(screen.getByRole("status")).toHaveTextContent("suspenseResolution.denied")
  expect(actions.readSuspenseResolutionWorkspaceAction).not.toHaveBeenCalled()
})
it("keeps an unreadable draft warning visible and resets only after reloading server history", async () => {
  const key = "stoquify:suspense-resolution:v1:org:actor:item", other = "stoquify:suspense-resolution:v1:org:actor:other"
  sessionStorage.setItem(key, "{unreadable"); sessionStorage.setItem(other, "preserve-other-record")
  render(<PaymentSuspenseResolutionPanel {...props} />)
  await screen.findByText(/suspenseWorkflow.states.POSTED_TO_SUSPENSE/)
  expect(screen.getByRole("alert")).toHaveTextContent("suspenseResolution.resetDraftHelp")
  expect(screen.getByRole("button", { name: "suspenseResolution.preview" })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "suspenseResolution.resetDraft" }))
  await screen.findByText("suspenseResolution.draftReset")
  expect(screen.getByRole("region", { name: "suspenseResolution.title" })).toHaveFocus()
  expect(actions.readSuspenseResolutionWorkspaceAction).toHaveBeenCalledTimes(2)
  expect(JSON.parse(sessionStorage.getItem(key)!)).toMatchObject({ pending: null, reason: "" })
  expect(sessionStorage.getItem(other)).toBe("preserve-other-record")
  expect(actions.proposeSuspenseResolutionAction).not.toHaveBeenCalled(); expect(actions.decideSuspenseResolutionAction).not.toHaveBeenCalled()
})
it("preserves unreadable local bytes if authoritative refresh fails", async () => {
  const key = "stoquify:suspense-resolution:v1:org:actor:item"
  sessionStorage.setItem(key, "{unreadable")
  render(<PaymentSuspenseResolutionPanel {...props} />)
  await screen.findByText(/suspenseWorkflow.states.POSTED_TO_SUSPENSE/)
  ;(actions.readSuspenseResolutionWorkspaceAction as jest.Mock).mockResolvedValue({ success: false })
  fireEvent.click(screen.getByRole("button", { name: "suspenseResolution.resetDraft" }))
  await screen.findByText("suspenseResolution.failed")
  expect(sessionStorage.getItem(key)).toBe("{unreadable")
  expect(screen.queryByText("suspenseResolution.draftReset")).not.toBeInTheDocument()
})
it("does not overwrite unreadable state through an independent review comment", async () => {
  const key = "stoquify:suspense-resolution:v1:org:actor:item"
  sessionStorage.setItem(key, "{unreadable")
  ;(actions.readSuspenseResolutionWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, item: { id: "item", status: "POSTED_TO_SUSPENSE", resolutionProposalId: "proposal" }, history: [], nextCursor: null } })
  ;(actions.reviewSuspenseResolutionAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, proposedById: "other", clearingCreatedById: "maker", clearingJournalNumber: "JE-1", draft: { outcome: "RESOLVED", reason: "Retained server proposal" }, destination: { code: "401", nameEn: "Destination" } } })
  render(<PaymentSuspenseResolutionPanel {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "suspenseResolution.review" }))
  const comment = await screen.findByLabelText("suspenseCorrection.decisionReason")
  expect(comment).toBeDisabled()
  fireEvent.change(comment, { target: { value: "Attempt to overwrite local state" } })
  expect(sessionStorage.getItem(key)).toBe("{unreadable")
  expect(screen.getByRole("alert")).toHaveTextContent("suspenseResolution.resetDraftHelp")
})
it("does not submit if the exact request cannot be retained", async () => {
  render(<PaymentSuspenseResolutionPanel {...props} />); await preview()
  const button = await screen.findByRole("button", { name: "suspenseResolution.propose" })
  const failure = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable") })
  try {
    fireEvent.click(button); await screen.findByText("suspenseResolution.storage")
    expect(actions.proposeSuspenseResolutionAction).not.toHaveBeenCalled()
  } finally { failure.mockRestore() }
})
function exportHistory() {
  ;(actions.readSuspenseResolutionWorkspaceAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, item: { id: "item", status: "POSTED_TO_SUSPENSE" }, history: [{ id: "record", revision: "sha256:" + "a".repeat(64), kind: "SUSPENSE_RESOLUTION_APPROVED_V1", reason: "Retained decision" }], nextCursor: null } })
}
it("retains the exact export request across a failed browser handoff and remount", async () => {
  exportHistory()
  ;(actions.exportSuspenseResolutionAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, receiptId: "receipt", sha256: "a".repeat(64), fileName: "stoquify-suspense-resolution-123.json", content: "{}", mimeType: "application/json" } })
  jest.mocked(downloadResolutionEvidence).mockRejectedValueOnce(new Error("Browser handoff failed")).mockResolvedValueOnce(undefined)
  const authority = { ...props.authority, canExport: true }, view = render(<PaymentSuspenseResolutionPanel {...props} authority={authority} />)
  fireEvent.click(await screen.findByRole("button", { name: "suspenseResolution.exportRecord" })); await screen.findByText("suspenseResolution.failed")
  const command = (actions.exportSuspenseResolutionAction as jest.Mock).mock.calls[0][0]
  expect(JSON.parse(sessionStorage.getItem("stoquify:suspense-resolution:v1:org:actor:item")!).pending.command).toEqual(command)
  view.unmount(); render(<PaymentSuspenseResolutionPanel {...props} authority={authority} />)
  fireEvent.click(await screen.findByRole("button", { name: "suspenseCorrection.retry" })); await screen.findByText("suspenseResolution.downloadRequested")
  expect((actions.exportSuspenseResolutionAction as jest.Mock).mock.calls[1][0]).toEqual(command)
  expect(props.onChanged).not.toHaveBeenCalled()
})
it("does not offer exports without current export permission", async () => {
  exportHistory(); render(<PaymentSuspenseResolutionPanel {...props} />)
  await screen.findByText("Retained decision")
  expect(screen.queryByRole("button", { name: "suspenseResolution.exportRecord" })).not.toBeInTheDocument()
  expect(actions.exportSuspenseResolutionAction).not.toHaveBeenCalled()
})
