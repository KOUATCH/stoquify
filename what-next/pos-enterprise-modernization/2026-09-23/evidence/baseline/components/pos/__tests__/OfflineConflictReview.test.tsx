import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { OfflineConflictReview } from "../offline/OfflineConflictReview"
import { getOfflineConflictReviewAction, acknowledgeOfflineConflictAction, previewOfflineConflictResolutionAction, resolveOfflineRecordedReplayAction } from "@/actions/pos/offline-review.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("../offline/OfflineConflictHistory", () => ({ OfflineConflictHistory: () => null, OfflineConflictTimeline: () => null }))
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn().mockResolvedValue(undefined) }) }))
jest.mock("@/actions/pos/offline-review.actions", () => ({ getOfflineConflictReviewAction: jest.fn(), acknowledgeOfflineConflictAction: jest.fn(), previewOfflineConflictResolutionAction: jest.fn(), resolveOfflineRecordedReplayAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))

const read = getOfflineConflictReviewAction as jest.Mock, save = acknowledgeOfflineConflictAction as jest.Mock, authenticate = stepUpWithPasswordAction as jest.Mock
const detail = { id: "conflict", revision: "a".repeat(64), status: "OPEN", conflictType: "UNPOSTED_ACCEPTED_EVENT", severity: "HIGH", device: "Terminal", eventId: null, payloadHash: null, eventStatus: null, blockerCode: null, reviewedBy: null, reviewedAt: null, note: null }
const access = { organizationId: "org", userId: "reviewer", canRead: true, canReview: true }
const draft = "Verify the original source record."
async function open(canReview = true) {
  render(<OfflineConflictReview access={{ ...access, canReview }} count={1} conflicts={[{ id: detail.id }] as never} />)
  fireEvent.click(screen.getByRole("button", { name: /open/ }))
  await screen.findByLabelText("note")
}

describe("offline conflict review recovery", () => {
  beforeEach(() => { jest.clearAllMocks(); window.sessionStorage.clear(); read.mockResolvedValue({ success: true, data: detail }) })
  it("retains a note across stale evidence refresh and submits the new revision explicitly", async () => {
    await open(); fireEvent.change(screen.getByLabelText("note"), { target: { value: draft } })
    save.mockResolvedValue({ success: false, code: "CONFLICT" })
    fireEvent.click(screen.getByRole("button", { name: "save" })); await screen.findByText("stale")
    read.mockResolvedValue({ success: true, data: { ...detail, revision: "b".repeat(64), note: "Other review" } })
    fireEvent.click(screen.getByRole("button", { name: "refresh" })); await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
    expect(screen.getByLabelText("note")).toHaveValue(draft); expect(save).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "save" })); await waitFor(() => expect(save).toHaveBeenLastCalledWith({ conflictId: detail.id, expectedRevision: "b".repeat(64), note: draft }))
    await screen.findByText("stale")
  })
  it("clears password input and retains notes when confirmation fails, without auto-saving after confirmation", async () => {
    await open(); fireEvent.change(screen.getByLabelText("note"), { target: { value: draft } })
    save.mockResolvedValue({ success: false, code: "FRESH_AUTH_REQUIRED" })
    fireEvent.click(screen.getByRole("button", { name: "save" })); await screen.findByLabelText("password")
    authenticate.mockResolvedValueOnce({ success: false, code: "INVALID_CREDENTIALS" }).mockResolvedValueOnce({ success: true })
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "synthetic-password" } }); fireEvent.click(screen.getByRole("button", { name: "authenticate" }))
    await screen.findByText("authFailed"); expect(screen.getByLabelText("password")).toHaveValue(""); expect(screen.getByLabelText("note")).toHaveValue(draft)
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "synthetic-password" } }); fireEvent.click(screen.getByRole("button", { name: "authenticate" }))
    await screen.findByText("authenticated"); expect(screen.queryByLabelText("password")).not.toBeInTheDocument(); expect(save).toHaveBeenCalledTimes(1); expect(screen.getByLabelText("note")).toHaveValue(draft)
  })
  it("allows an authorized reader to inspect but not record a review", async () => {
    await open(false); expect(screen.getByLabelText("note")).toBeDisabled(); expect(screen.getByRole("button", { name: "save" })).toBeDisabled(); expect(screen.getByText("denied")).toBeInTheDocument(); expect(save).not.toHaveBeenCalled()
  })
  it("reports unavailable evidence without manufacturing a review detail", async () => {
    read.mockResolvedValue({ success: false, code: "INTERNAL_ERROR" })
    render(<OfflineConflictReview access={access} count={1} conflicts={[{ id: detail.id }] as never} />)
    fireEvent.click(screen.getByRole("button", { name: /open/ })); await screen.findByText("failed"); expect(screen.queryByLabelText("note")).not.toBeInTheDocument(); expect(save).not.toHaveBeenCalled()
  })
  it("binds explicit resolution to the preview and preserves the note across stale failures", async () => {
    await open(); fireEvent.change(screen.getByLabelText("note"), { target: { value: draft } })
    ;(previewOfflineConflictResolutionAction as jest.Mock).mockResolvedValue({ success: true, data: { conflictId: detail.id, revision: "c".repeat(64), eligible: true, reason: "VERIFIED", remainingConflicts: 1, remainingEvents: 2 } })
    fireEvent.click(screen.getByRole("button", { name: "checkOutcome" })); await screen.findByRole("button", { name: "resolveRecorded" })
    expect(resolveOfflineRecordedReplayAction).not.toHaveBeenCalled()
    ;(resolveOfflineRecordedReplayAction as jest.Mock).mockResolvedValue({ success: false, code: "CONFLICT" })
    fireEvent.click(screen.getByRole("button", { name: "resolveRecorded" })); await screen.findByText("staleResolution")
    expect(resolveOfflineRecordedReplayAction).toHaveBeenCalledWith({ conflictId: detail.id, expectedRevision: "c".repeat(64), note: draft })
    expect(screen.getByLabelText("note")).toHaveValue(draft); expect(screen.queryByRole("button", { name: "resolveRecorded" })).not.toBeInTheDocument()
  })
  it("exposes ineligible evidence without a resolution control", async () => {
    await open(); (previewOfflineConflictResolutionAction as jest.Mock).mockResolvedValue({ success: true, data: { eligible: false, reason: "EVIDENCE_MISMATCH" } })
    fireEvent.click(screen.getByRole("button", { name: "checkOutcome" })); await screen.findByText("resolutionReason.EVIDENCE_MISMATCH")
    expect(screen.queryByRole("button", { name: "resolveRecorded" })).not.toBeInTheDocument(); expect(resolveOfflineRecordedReplayAction).not.toHaveBeenCalled()
  })
  it("keeps the typed note and explains when browser draft storage fails", async () => {
    await open()
    const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable") })
    try {
      fireEvent.change(screen.getByLabelText("note"), { target: { value: draft } })
      expect(screen.getByLabelText("note")).toHaveValue(draft); expect(screen.getByText("draftUnavailable")).toBeInTheDocument()
      expect(save).not.toHaveBeenCalled()
    } finally { write.mockRestore() }
  })
})
