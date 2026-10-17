import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as actions from "@/actions/accounting/close-evidence-workflow.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { CloseEvidenceResolutionForm, resolutionCopy, resolutionDecisionCopy, resolutionDraftCopy } from "../CloseEvidenceResolutionForm"
import { closeRecoveryDraftKey, saveCloseRecoveryDraft, readCloseRecoveryDraft } from "@/hooks/accounting/close-evidence-resolution-draft"
import type { CloseEvidenceInvestigation } from "@/services/accounting/close-evidence-investigation"
jest.mock("@/actions/accounting/close-evidence-workflow.actions", () => ({ proposeCloseEvidenceResolutionAction: jest.fn(), approveCloseEvidenceResolutionAction: jest.fn(), closeEvidenceResolutionProposalAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const snapshot = { requestId: "request", periodId: "period", revision: "a".repeat(64), truncated: false, issues: [], records: [{ id: "request", kind: "request" }, { id: "excluded", kind: "request" }], proposals: [] } as unknown as CloseEvidenceInvestigation
beforeEach(() => { jest.resetAllMocks(); sessionStorage.clear(); Object.defineProperty(global.crypto, "randomUUID", { configurable: true, value: jest.fn(() => "idempotency-key") }) })
test.each(["en", "fr"] as const)("%s proposal keeps the exact submission and reasons after an unknown outcome", async locale => {
  const copy = resolutionCopy[locale], onSaved = jest.fn()
  ;(actions.proposeCloseEvidenceResolutionAction as jest.Mock).mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce({ success: true, data: { proposalId: "proposal" } })
  render(<CloseEvidenceResolutionForm snapshot={snapshot} locale={locale} writable onSaved={onSaved} />)
  fireEvent.change(screen.getByLabelText(copy.request), { target: { value: "request" } })
  fireEvent.change(screen.getByLabelText(copy.reason), { target: { value: "Retain the original valid request" } })
  fireEvent.change(screen.getByLabelText(copy.exclusion + ": excluded"), { target: { value: "Malformed duplicate retained for audit" } })
  fireEvent.click(screen.getByRole("button", { name: copy.propose }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.error)
  expect(screen.getByLabelText(copy.reason)).toHaveValue("Retain the original valid request")
  fireEvent.click(screen.getByRole("button", { name: copy.retry }))
  await screen.findByRole("button", { name: copy.propose })
  const calls = (actions.proposeCloseEvidenceResolutionAction as jest.Mock).mock.calls
  expect(calls).toHaveLength(2); expect(calls[0]).toEqual(calls[1]); expect(calls[0][0]).toMatchObject({ expectedRevision: snapshot.revision, exclusions: [{ id: "excluded", reason: "Malformed duplicate retained for audit" }] })
})
test("password verification does not automatically authorize a proposal", async () => {
  const proposal = { id: "proposal", selectedRequestId: "request", exclusions: [], reason: "Retain source", canApprove: true, stale: false, approvalId: null }
  ;(actions.approveCloseEvidenceResolutionAction as jest.Mock).mockResolvedValue({ success: false, code: "FRESH_AUTH_REQUIRED" })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  render(<CloseEvidenceResolutionForm snapshot={{ ...snapshot, proposals: [proposal] } as CloseEvidenceInvestigation} locale="en" writable onSaved={jest.fn()} />)
  fireEvent.change(screen.getByLabelText(resolutionCopy.en.review), { target: { value: "Independent review of every exclusion" } }); fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: resolutionCopy.en.approve }))
  const password = await screen.findByLabelText(resolutionCopy.en.password); expect(password).toHaveFocus()
  fireEvent.change(password, { target: { value: "test password" } }); fireEvent.click(screen.getByRole("button", { name: resolutionCopy.en.verify }))
  await screen.findByText(resolutionCopy.en.verified)
  expect(actions.approveCloseEvidenceResolutionAction).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText(resolutionCopy.en.review)).toHaveValue("Independent review of every exclusion")
})
test("incomplete snapshots and read-only access cannot submit recovery decisions", () => {
  render(<CloseEvidenceResolutionForm snapshot={{ ...snapshot, truncated: true }} locale="en" writable={false} onSaved={jest.fn()} />)
  expect(screen.getByRole("alert")).toHaveTextContent(resolutionCopy.en.incomplete)
  expect(screen.queryByRole("button", { name: resolutionCopy.en.propose })).not.toBeInTheDocument()
  expect(actions.proposeCloseEvidenceResolutionAction).not.toHaveBeenCalled()
})

test.each(["en", "fr"] as const)("%s explicitly confirms withdrawal and preserves its exact retry", async locale => {
  const copy = resolutionDecisionCopy[locale], saved = jest.fn()
  const proposal = { id: "proposal", selectedRequestId: "request", exclusions: [], reason: "Retain source", canApprove: false, canWithdraw: true, canReject: false, stale: true, approvalId: null, outcome: null }
  ;(actions.closeEvidenceResolutionProposalAction as jest.Mock).mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce({ success: true })
  render(<CloseEvidenceResolutionForm snapshot={{ ...snapshot, proposals: [proposal] } as CloseEvidenceInvestigation} locale={locale} writable onSaved={saved} />)
  expect(screen.getByRole("button", { name: copy.withdraw })).toBeDisabled()
  fireEvent.change(screen.getByLabelText(copy.reason), { target: { value: "Replace the incorrect pending selection" } })
  fireEvent.click(screen.getByRole("checkbox", { name: copy.confirm })); fireEvent.click(screen.getByRole("button", { name: copy.withdraw }))
  expect(await screen.findByRole("alert")).toHaveTextContent(resolutionCopy[locale].error)
  expect(screen.getByLabelText(copy.reason)).toHaveValue("Replace the incorrect pending selection")
  fireEvent.click(screen.getByRole("button", { name: resolutionCopy[locale].retry }))
  await screen.findByRole("button", { name: copy.withdraw })
  const calls = (actions.closeEvidenceResolutionProposalAction as jest.Mock).mock.calls
  expect(calls).toHaveLength(2); expect(calls[0]).toEqual(calls[1]); expect(calls[0][0]).toMatchObject({ proposalId: "proposal", decision: "WITHDRAWN" }); expect(saved).toHaveBeenCalledWith(copy.withdrawn)
})

test("retained rejected outcome shows reason and reference without further decision controls", () => {
  const proposal = { id: "proposal", exclusions: [], reason: "Original proposal", canApprove: false, canWithdraw: false, canReject: false, approvalId: null, outcome: { id: "decision", state: "REJECTED", reason: "Evidence selection is incorrect", createdAt: "2026-10-04T00:00:00Z" } }
  render(<CloseEvidenceResolutionForm snapshot={{ ...snapshot, proposals: [proposal] } as unknown as CloseEvidenceInvestigation} locale="en" writable onSaved={jest.fn()} />)
  expect(screen.getByText(resolutionDecisionCopy.en.rejected)).toBeVisible(); expect(screen.getByText(/Decision reference: decision/)).toBeVisible()
  expect(screen.queryByRole("button", { name: resolutionDecisionCopy.en.reject })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: resolutionCopy.en.approve })).not.toBeInTheDocument()
})

const scope = { organizationId: "org", actorId: "reviewer", periodId: "period", requestId: "request" }
test.each(["en", "fr"] as const)("%s read-only restoration keeps an uncertain submission but disables retry", async locale => {
  const pending = { kind: "approve" as const, input: { proposalId: "proposal", correlationId: "retained-key", notes: "Independent review of every exclusion" } }
  saveCloseRecoveryDraft(sessionStorage, scope, { revision: snapshot.revision, selected: { request: "", response: "", acceptance: "" }, reason: "", exclusions: {}, notes: {}, closeReasons: {}, pending })
  render(<CloseEvidenceResolutionForm snapshot={snapshot} locale={locale} writable={false} onSaved={jest.fn()} draftScope={scope} />)
  const retry = await screen.findByRole("button", { name: resolutionCopy[locale].retry })
  expect(retry).toBeDisabled(); fireEvent.click(retry)
  expect(actions.approveCloseEvidenceResolutionAction).not.toHaveBeenCalled()
  expect(readCloseRecoveryDraft(sessionStorage, scope)?.pending).toEqual(pending)
  expect(screen.getByText(resolutionCopy[locale].readonly)).toBeInTheDocument()
})
test.each(["en", "fr"] as const)("%s reload restores exact pending command without automatically submitting", async locale => {
  const copy = resolutionCopy[locale], saved = jest.fn()
  ;(actions.proposeCloseEvidenceResolutionAction as jest.Mock).mockRejectedValueOnce(new Error("interrupted")).mockResolvedValueOnce({ success: true })
  const first = render(<CloseEvidenceResolutionForm snapshot={snapshot} locale={locale} writable onSaved={saved} draftScope={scope} />)
  fireEvent.change(screen.getByLabelText(copy.request), { target: { value: "request" } }); fireEvent.change(screen.getByLabelText(copy.reason), { target: { value: "Retain valid source request" } }); fireEvent.change(screen.getByLabelText(copy.exclusion + ": excluded"), { target: { value: "Preserve duplicate without using it" } })
  fireEvent.click(screen.getByRole("button", { name: copy.propose })); await screen.findByText(copy.error)
  const original = (actions.proposeCloseEvidenceResolutionAction as jest.Mock).mock.calls[0][0]
  first.unmount(); render(<CloseEvidenceResolutionForm snapshot={snapshot} locale={locale} writable onSaved={saved} draftScope={scope} />)
  expect(await screen.findByText(resolutionDraftCopy[locale].restored)).toBeVisible(); expect(screen.getByLabelText(copy.reason)).toHaveValue("Retain valid source request")
  expect(actions.proposeCloseEvidenceResolutionAction).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: copy.retry })); await waitFor(() => expect(saved).toHaveBeenCalled())
  expect((actions.proposeCloseEvidenceResolutionAction as jest.Mock).mock.calls[1][0]).toEqual(original)
  expect(sessionStorage.getItem(closeRecoveryDraftKey(scope))).toBeNull()
})
test("changed snapshots retain draft text but require explicit current-source review", async () => {
  saveCloseRecoveryDraft(sessionStorage, scope, { revision: "b".repeat(64), selected: { request: "request", response: "", acceptance: "" }, reason: "Original draft reason retained", exclusions: { excluded: "Duplicate kept for audit purposes" }, notes: {}, closeReasons: {}, pending: null })
  ;(actions.proposeCloseEvidenceResolutionAction as jest.Mock).mockResolvedValue({ success: false, code: "CONFLICT" })
  render(<CloseEvidenceResolutionForm snapshot={snapshot} locale="en" writable onSaved={jest.fn()} draftScope={scope} />)
  expect(await screen.findByText(resolutionDraftCopy.en.stale)).toBeVisible(); expect(screen.getByLabelText(resolutionCopy.en.reason)).toHaveValue("Original draft reason retained")
  expect(screen.getByRole("button", { name: resolutionCopy.en.propose })).toBeDisabled()
  fireEvent.click(screen.getByRole("checkbox", { name: resolutionDraftCopy.en.checked })); fireEvent.click(screen.getByRole("button", { name: resolutionCopy.en.propose }))
  await waitFor(() => expect(actions.proposeCloseEvidenceResolutionAction).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: snapshot.revision })))
})
test("reload restores review notes but never restores confirmation or a password", async () => {
  const proposal = { id: "proposal", selectedRequestId: "request", exclusions: [], reason: "Retain source", canApprove: true, canWithdraw: false, canReject: false, stale: false, approvalId: null, outcome: null }
  saveCloseRecoveryDraft(sessionStorage, scope, { revision: snapshot.revision, selected: { request: "", response: "", acceptance: "" }, reason: "", exclusions: {}, notes: { proposal: "Independent notes before interruption" }, closeReasons: {}, pending: null })
  render(<CloseEvidenceResolutionForm snapshot={{ ...snapshot, proposals: [proposal] } as CloseEvidenceInvestigation} locale="en" writable onSaved={jest.fn()} draftScope={scope} />)
  expect(await screen.findByLabelText(resolutionCopy.en.review)).toHaveValue("Independent notes before interruption")
  expect(screen.getByRole("checkbox", { name: resolutionCopy.en.confirm })).not.toBeChecked(); expect(actions.approveCloseEvidenceResolutionAction).not.toHaveBeenCalled()
})

test.each(["propose", "approve"] as const)("successful %s preserves unrelated unsent work before the parent re-inspects", async kind => {
  const proposal = { id: "proposal", selectedRequestId: "request", exclusions: [], reason: "Retain source", canApprove: true, canWithdraw: false, canReject: false, stale: false, approvalId: null, outcome: null }
  saveCloseRecoveryDraft(sessionStorage, scope, { revision: snapshot.revision, selected: { request: "request", response: "", acceptance: "" }, reason: "Unsent new proposal reasoning", exclusions: { excluded: "Keep the duplicate without processing" }, notes: { proposal: "Independent review of this proposal", another: "Unsent notes for another proposal" }, closeReasons: { another: "Separate pending decision reasoning" }, pending: null })
  ;(actions.proposeCloseEvidenceResolutionAction as jest.Mock).mockResolvedValue({ success: true })
  ;(actions.approveCloseEvidenceResolutionAction as jest.Mock).mockResolvedValue({ success: true })
  const saved = jest.fn(() => readCloseRecoveryDraft(sessionStorage, scope))
  render(<CloseEvidenceResolutionForm snapshot={{ ...snapshot, proposals: [proposal] } as CloseEvidenceInvestigation} locale="en" writable onSaved={saved} draftScope={scope} />)
  if (kind === "approve") fireEvent.click(screen.getByRole("checkbox", { name: resolutionCopy.en.confirm }))
  fireEvent.click(screen.getByRole("button", { name: kind === "approve" ? resolutionCopy.en.approve : resolutionCopy.en.propose }))
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
  const retained = saved.mock.results[0].value
  expect(retained?.notes.another).toBe("Unsent notes for another proposal"); expect(retained?.closeReasons.another).toBe("Separate pending decision reasoning"); expect(retained?.pending).toBeNull(); expect(retained?.reason).toBe(kind === "approve" ? "Unsent new proposal reasoning" : "")
  expect(readCloseRecoveryDraft(sessionStorage, scope)?.notes.proposal).toBe(kind === "approve" ? undefined : "Independent review of this proposal")
})
