import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import * as actions from "@/actions/accounting/close-evidence-workflow.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { CloseEvidenceWorkflowPanel } from "../CloseEvidenceWorkflowPanel"
import { closeEvidenceFindingTitle, closeEvidenceWorkflowCopy as copy } from "../close-evidence-workflow-copy"
jest.mock("../CloseEvidenceNotifications", () => ({ CloseEvidenceNotifications: () => null }))
jest.mock("@/actions/accounting/close-evidence-workflow.actions", () => ({ getCloseEvidenceWorkflowAction: jest.fn(), getCloseEvidenceReviewAction: jest.fn(), requestCloseEvidenceAction: jest.fn(), respondCloseEvidenceAction: jest.fn(), acceptCloseEvidenceAction: jest.fn(), replaceCloseEvidenceRecipientAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const base = { organizationId: "org", actorId: "actor", periodId: "period", writable: true, canRequest: true, canRespond: true, canReview: true, partial: false, findings: [{ id: "finding", title: "Historical missing data", detail: "Old assessment" }], recipients: [{ id: "owner", name: "Assigned colleague" }], requests: [], reviews: [] }
const ok = (data: unknown) => ({ success: true, data, error: null })
const cursors = { findings: null, requests: null, recipients: null, reviews: null }

test.each(["en", "fr"] as const)("%s supervisors continue another author's request using its stored revision", async locale => {
  const row = { requestId: "other-request", closeRunId: "run", title: "Other author's retained work", state: "AWAITING_RESPONSE", requester: { name: "Former requester", available: false }, recipientName: "Former owner", recipientAvailable: false, assignment: { revision: "revision-other", recipientId: "old-owner" } }
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue(ok({ ...base, findings: [], canTrack: true, canReplace: true, canSupervise: true, tracking: [], supervision: [row], cursors }))
  ;(actions.replaceCloseEvidenceRecipientAction as jest.Mock).mockResolvedValue(ok({ revision: "next" }))
  render(<CloseEvidenceWorkflowPanel periodId="period" locale={locale} />)
  const section = await screen.findByRole("region", { name: copy[locale].supervisionTitle })
  expect(within(section).getByText(copy[locale].requesterUnavailable)).toBeInTheDocument()
  expect(within(screen.getByRole("region", { name: copy[locale].trackingTitle })).queryByRole("listitem")).not.toBeInTheDocument()
  fireEvent.click(within(section).getByRole("button", { name: copy[locale].replace }))
  fireEvent.change(screen.getByLabelText(copy[locale].recipient), { target: { value: "owner" } })
  fireEvent.change(screen.getByLabelText(copy[locale].replaceReason), { target: { value: "Continue the departed colleague's request" } })
  fireEvent.click(screen.getByRole("button", { name: copy[locale].confirmReplace }))
  await waitFor(() => expect(actions.replaceCloseEvidenceRecipientAction).toHaveBeenCalledWith({ requestId: "other-request", expectedRevision: "revision-other", requestedFromId: "owner", reason: "Continue the departed colleague's request", correlationId: "correlation-one" }))
})

test("supervision pagination removes retained colleague work after permission revocation", async () => {
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValueOnce(ok({ ...base, canSupervise: true, supervision: [{ requestId: "other", title: "Supervised work", state: "REVIEW_REQUIRED" }], cursors: { ...cursors, supervision: "next" } }))
    .mockResolvedValueOnce(ok({ ...base, canSupervise: false, supervision: [], cursors }))
  render(<CloseEvidenceWorkflowPanel periodId="period" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.en.more.supervision }))
  await screen.findByText(copy.en.stale)
  expect(screen.queryByText("Supervised work")).not.toBeInTheDocument()
  expect(actions.getCloseEvidenceWorkflowAction).toHaveBeenLastCalledWith({ periodId: "period", page: { kind: "supervision", cursor: "next" } })
})
test.each(["constructor", "toString", "__proto__", "Customer-authored explanation"])("keeps unknown source title %s verbatim", title => {
  expect(closeEvidenceFindingTitle(title, "fr")).toBe(title)
  expect(closeEvidenceFindingTitle(title, "en")).toBe(title)
})
beforeEach(() => {
  jest.resetAllMocks(); sessionStorage.clear(); Object.defineProperty(global.crypto, "randomUUID", { configurable: true, value: jest.fn(() => "correlation-one") })
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue(ok(base))
})

test.each(["en", "fr"] as const)("preserves the %s replacement reason and exact revision through an uncertain response", async locale => {
  const row = { requestId: "request", closeRunId: "run", title: "Missing proof", state: "AWAITING_RESPONSE", recipientName: "Former colleague", recipientAvailable: false, assignment: { revision: "revision-2", recipientId: "old-owner", changedAt: null, reason: null } }
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue(ok({ ...base, findings: [], canTrack: true, canReplace: true, tracking: [row], cursors }))
  ;(actions.replaceCloseEvidenceRecipientAction as jest.Mock).mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce(ok({ revision: "revision-3" }))
  const mounted = render(<CloseEvidenceWorkflowPanel periodId="period" locale={locale} />)
  fireEvent.click(await screen.findByRole("button", { name: copy[locale].replace }))
  expect(screen.getByText(copy[locale].replaceHelp)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(copy[locale].recipient), { target: { value: "owner" } })
  fireEvent.change(screen.getByLabelText(copy[locale].replaceReason), { target: { value: "Colleague left; transfer the retained request" } })
  mounted.unmount()
  render(<CloseEvidenceWorkflowPanel periodId="period" locale={locale} />)
  expect(await screen.findByLabelText(copy[locale].replaceReason)).toHaveValue("Colleague left; transfer the retained request")
  fireEvent.click(screen.getByRole("button", { name: copy[locale].confirmReplace }))
  fireEvent.click(await screen.findByRole("button", { name: copy[locale].retry }))
  await screen.findByText(copy[locale].replaceSaved)
  const calls = (actions.replaceCloseEvidenceRecipientAction as jest.Mock).mock.calls
  expect(calls).toHaveLength(2)
  expect(calls[1]).toEqual(calls[0])
  expect(calls[0][0]).toEqual({ requestId: "request", expectedRevision: "revision-2", requestedFromId: "owner", reason: "Colleague left; transfer the retained request", correlationId: "correlation-one" })
})

test.each(["AWAITING_REVIEW", "ACCEPTED", "REVIEW_REQUIRED"])("does not offer recipient replacement for %s history", async state => {
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue(ok({ ...base, findings: [], canTrack: true, canReplace: true, tracking: [{ requestId: "request", state, assignment: { revision: "request", recipientId: "owner" } }] }))
  render(<CloseEvidenceWorkflowPanel periodId="period" />)
  await screen.findByText(copy.en.trackingStates[state as keyof typeof copy.en.trackingStates])
  expect(screen.queryByRole("button", { name: copy.en.replace })).not.toBeInTheDocument()
})

test("distinguishes repeated historical findings in French and retains original source text", async () => {
  const sourceTitle = "Payment reconciliation evidence unavailable"
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue(ok({ ...base,
    findings: ["earlier", "later"].map(id => ({ id, closeRunId: id + "-run", title: sourceTitle, detail: "Original retained diagnostic" })),
    assessments: { "earlier-run": { asOf: "2026-09-01T12:00:00Z" }, "later-run": { asOf: "2026-09-02T12:00:00Z" } },
  }))
  render(<CloseEvidenceWorkflowPanel periodId="period" locale="fr" />)
  await screen.findAllByRole("button", { name: copy.fr.request })
  const cards = screen.getAllByRole("listitem")
  expect(cards).toHaveLength(2)
  expect(within(cards[0]).getByText("Référence de l’évaluation: earlier-run")).toBeInTheDocument()
  expect(cards[0].querySelector("time")).toHaveAttribute("datetime", "2026-09-01T12:00:00Z")
  expect(cards[1].querySelector("time")).toHaveAttribute("datetime", "2026-09-02T12:00:00Z")
  expect(within(cards[0]).getByText("Justificatifs du rapprochement des paiements indisponibles")).toBeInTheDocument()
  expect(within(cards[0]).getByText(sourceTitle).closest("details")).not.toHaveAttribute("open")
  fireEvent.click(within(cards[1]).getByRole("button", { name: copy.fr.request }))
  expect(screen.getAllByText("Référence du travail: later")).toHaveLength(2)
  expect(actions.requestCloseEvidenceAction).not.toHaveBeenCalled()
})

test("marks missing assessment context explicitly and preserves unknown source wording", async () => {
  render(<CloseEvidenceWorkflowPanel periodId="period" locale="fr" />)
  await screen.findByText(copy.fr.assessmentUnavailable)
  expect(within(screen.getByRole("listitem")).getByText("Historical missing data")).toBeInTheDocument()
  expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument()
})

test("loads eligible colleagues beyond an empty batch and preserves a draft across retry", async () => {
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValueOnce(ok({ ...base, recipients: [], cursors: { ...cursors, recipients: "next-owner" }, partial: true }))
    .mockRejectedValueOnce(new Error("temporary failure"))
    .mockResolvedValueOnce(ok({ ...base, findings: [], cursors, evidenceIssue: false }))
  render(<CloseEvidenceWorkflowPanel periodId="period" locale="fr" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.fr.request }))
  fireEvent.change(screen.getByLabelText(copy.fr.text), { target: { value: "Conserver le brouillon pendant le chargement" } })
  expect(screen.getByText(copy.fr.moreRecipientsHelp)).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: copy.fr.more.recipients }))
  await screen.findByText(copy.fr.pageError)
  expect(screen.getByLabelText(copy.fr.text)).toHaveValue("Conserver le brouillon pendant le chargement")
  fireEvent.click(screen.getByRole("button", { name: copy.fr.more.recipients }))
  await screen.findByText(copy.fr.pageLoaded)
  expect(screen.getByRole("option", { name: "Assigned colleague" })).toBeInTheDocument()
  expect(within(screen.getByRole("listitem")).getByText("Historical missing data")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: copy.fr.more.recipients })).not.toBeInTheDocument()
  expect(screen.getByLabelText(copy.fr.text)).toHaveValue("Conserver le brouillon pendant le chargement")
  expect(actions.getCloseEvidenceWorkflowAction).toHaveBeenLastCalledWith({ periodId: "period", page: { kind: "recipients", cursor: "next-owner" } })
  expect(actions.requestCloseEvidenceAction).not.toHaveBeenCalled()
})

test("appends older queue work without duplicating retained rows", async () => {
  const request = { requestId: "old", finding: { title: "Assigned evidence" }, requestText: "Provide source", dueAt: "2099-01-01T00:00:00Z", workflowState: "AWAITING_RECIPIENT_RESPONSE" }
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValueOnce(ok({ ...base, findings: [], requests: [request], cursors: { ...cursors, requests: "next" } }))
    .mockResolvedValueOnce(ok({ ...base, findings: [], requests: [request, { ...request, requestId: "next", finding: { title: "Next assigned evidence" } }], cursors }))
  render(<CloseEvidenceWorkflowPanel periodId="period" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.en.more.requests }))
  await screen.findByText(copy.en.pageLoaded)
  expect(screen.getAllByRole("button", { name: copy.en.respond })).toHaveLength(2)
})

test("clears privileged rows when a continuation reports revoked authority", async () => {
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValueOnce(ok({ ...base, cursors: { ...cursors, findings: "next" } }))
    .mockResolvedValueOnce(ok({ ...base, writable: false, canRequest: false, canRespond: false, findings: [], recipients: [], cursors }))
  render(<CloseEvidenceWorkflowPanel periodId="period" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.en.more.findings }))
  await screen.findByText(copy.en.stale)
  expect(screen.queryByText("Historical missing data")).not.toBeInTheDocument()
})
test("preserves request draft on reload and replays the exact pending command after uncertain failure", async () => {
  const mounted = render(<CloseEvidenceWorkflowPanel periodId="period" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.en.request }))
  fireEvent.change(screen.getByLabelText(copy.en.recipient), { target: { value: "owner" } })
  fireEvent.change(screen.getByLabelText(copy.en.due), { target: { value: "2099-10-10T10:00" } })
  fireEvent.change(screen.getByLabelText(copy.en.text), { target: { value: "Supply the corrected invoice evidence" } })
  mounted.unmount(); render(<CloseEvidenceWorkflowPanel periodId="period" />)
  expect(await screen.findByLabelText(copy.en.text)).toHaveValue("Supply the corrected invoice evidence")
  ;(actions.requestCloseEvidenceAction as jest.Mock).mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce(ok({ id: "saved" }))
  fireEvent.click(screen.getByRole("button", { name: copy.en.submit }))
  fireEvent.click(await screen.findByRole("button", { name: copy.en.retry }))
  await screen.findByText(copy.en.requestSaved)
  const calls = (actions.requestCloseEvidenceAction as jest.Mock).mock.calls
  expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0]); expect(calls[0][0]).not.toHaveProperty("organizationId")
})

test("explains an existing request conflict in French without erasing the draft or offering an uncertain retry", async () => {
  ;(actions.requestCloseEvidenceAction as jest.Mock).mockResolvedValue({ success: false, code: "CONFLICT", error: "Already requested" })
  render(<CloseEvidenceWorkflowPanel periodId="period" locale="fr" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.fr.request }))
  fireEvent.change(screen.getByLabelText(copy.fr.recipient), { target: { value: "owner" } })
  fireEvent.change(screen.getByLabelText(copy.fr.due), { target: { value: "2099-10-10T10:00" } })
  fireEvent.change(screen.getByLabelText(copy.fr.text), { target: { value: "Conserver cette explication sans remplacer la demande" } })
  fireEvent.click(screen.getByRole("button", { name: copy.fr.submit }))
  await screen.findByText(copy.fr.requestConflict)
  expect(screen.getByLabelText(copy.fr.text)).toHaveValue("Conserver cette explication sans remplacer la demande")
  expect(screen.queryByRole("button", { name: copy.fr.retry })).not.toBeInTheDocument()
  expect(screen.queryByText(copy.fr.requestSaved)).not.toBeInTheDocument()
  expect(actions.requestCloseEvidenceAction).toHaveBeenCalledTimes(1)
})

test("continues sent-request history in French while retaining a separate request draft", async () => {
  const pending = { requestId: "sent-one", closeRunId: "old-run", title: "Previous obligation", state: "AWAITING_RESPONSE", recipientAvailable: false, recipientName: "Previous owner", createdAt: "2026-10-01T00:00:00Z", dueAt: null, respondedAt: null, acceptedAt: null }
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValueOnce(ok({ ...base, canTrack: true, tracking: [pending], cursors: { ...cursors, tracking: "sent-next" } }))
    .mockResolvedValueOnce(ok({ ...base, canTrack: true, tracking: [pending, { ...pending, requestId: "sent-two", state: "ACCEPTED", acceptedAt: "2026-10-03T12:00:00Z" }], cursors: { ...cursors, tracking: null } }))
  render(<CloseEvidenceWorkflowPanel periodId="period" locale="fr" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.fr.request }))
  fireEvent.change(screen.getByLabelText(copy.fr.text), { target: { value: "Conserver le nouveau brouillon pendant le suivi" } })
  expect(screen.getByText(copy.fr.recipientUnavailable)).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: copy.fr.more.tracking }))
  await screen.findByText(copy.fr.pageLoaded)
  expect(within(screen.getByRole("region", { name: copy.fr.trackingTitle })).getAllByRole("listitem")).toHaveLength(2)
  expect(screen.getByText(copy.fr.trackingStates.ACCEPTED)).toBeInTheDocument()
  expect(screen.getByLabelText(copy.fr.text)).toHaveValue("Conserver le nouveau brouillon pendant le suivi")
  expect(actions.getCloseEvidenceWorkflowAction).toHaveBeenLastCalledWith({ periodId: "period", page: { kind: "tracking", cursor: "sent-next" } })
})

test("removes sent-request history if continuation returns revoked tracking permission", async () => {
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValueOnce(ok({ ...base, canTrack: true, tracking: [{ requestId: "sent", closeRunId: "run", title: "Private authored obligation", state: "REVIEW_REQUIRED" }], cursors: { ...cursors, tracking: "next" } }))
    .mockResolvedValueOnce(ok({ ...base, canTrack: false, tracking: [], cursors }))
  render(<CloseEvidenceWorkflowPanel periodId="period" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.en.more.tracking }))
  await screen.findByText(copy.en.stale)
  expect(screen.queryByText("Private authored obligation")).not.toBeInTheDocument()
})

test.each(["FORBIDDEN", "AUTH_REQUIRED"])("clears privileged history after a %s continuation response", async code => {
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValueOnce(ok({ ...base, canTrack: true, tracking: [{ requestId: "sent", closeRunId: "run", title: "Private authored obligation", state: "REVIEW_REQUIRED" }], cursors: { ...cursors, tracking: "next" } }))
    .mockResolvedValueOnce({ success: false, code, error: "Denied" })
  render(<CloseEvidenceWorkflowPanel periodId="period" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.en.more.tracking }))
  await screen.findByText(copy.en.denied)
  expect(screen.queryByText("Private authored obligation")).not.toBeInTheDocument()
  expect(screen.queryByText("Historical missing data")).not.toBeInTheDocument()
})
test("a read failure is an error and never an empty successful queue", async () => {
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue({ success: false, error: "failure", data: null })
  render(<CloseEvidenceWorkflowPanel periodId="period" />)
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.en.error)
  expect(screen.queryByText(copy.en.empty)).not.toBeInTheDocument()
})
test("restored pending commands remain visible but cannot write after module access becomes read-only", async () => {
  sessionStorage.setItem("close-evidence:org:actor:period", JSON.stringify({ draft: { mode: "respond", findingId: "", recipientId: "", requestId: "request", due: "", text: "Retained response", notes: "" }, pending: { mode: "respond", input: { requestId: "request", responseText: "Retained response", correlationId: "old-key" } } }))
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue(ok({ ...base, writable: false, canRequest: false, canRespond: false, findings: [] }))
  render(<CloseEvidenceWorkflowPanel periodId="period" />)
  expect(await screen.findByRole("button", { name: copy.en.retry })).toBeDisabled()
  expect(screen.getByLabelText(copy.en.text)).toHaveValue("Retained response")
  expect(actions.respondCloseEvidenceAction).not.toHaveBeenCalled()
})
test("French recipient response uses the stored request identity", async () => {
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue(ok({ ...base, findings: [], requests: [{ requestId: "request", finding: { title: "Preuve manquante" }, requestText: "Corriger la source", dueAt: "2099-01-01T00:00:00Z", workflowState: "AWAITING_RECIPIENT_RESPONSE" }] }))
  ;(actions.respondCloseEvidenceAction as jest.Mock).mockResolvedValue(ok({ id: "response" }))
  render(<CloseEvidenceWorkflowPanel periodId="period" locale="fr" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.fr.respond }))
  fireEvent.change(screen.getByLabelText(copy.fr.text), { target: { value: "Source corrigée, nouvelle évaluation disponible." } })
  fireEvent.click(screen.getByRole("button", { name: copy.fr.submitResponse }))
  await screen.findByText(copy.fr.responseSaved)
  expect(actions.respondCloseEvidenceAction).toHaveBeenCalledWith(expect.objectContaining({ requestId: "request" }))
})
test.each(["en", "fr"] as const)("shows %s investigation guidance and preserves the response draft after conflicting history", async locale => {
  const request = { requestId: "request", finding: { title: "Missing proof" }, requestText: "Provide the retained source", dueAt: "2099-01-01T00:00:00Z", workflowState: "AWAITING_RECIPIENT_RESPONSE" }
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue(ok({ ...base, findings: [], requests: [request] }))
  ;(actions.respondCloseEvidenceAction as jest.Mock).mockResolvedValue({ success: false, code: "REVIEW_REQUIRED" })
  render(<CloseEvidenceWorkflowPanel periodId="period" locale={locale} />)
  fireEvent.click(await screen.findByRole("button", { name: copy[locale].respond }))
  fireEvent.change(screen.getByLabelText(copy[locale].text), { target: { value: "Preserve this explanation for the investigator" } })
  fireEvent.click(screen.getByRole("button", { name: copy[locale].submitResponse }))
  expect(await screen.findByText(copy[locale].trackingReviewHelp)).toHaveFocus()
  expect(screen.getByLabelText(copy[locale].text)).toHaveValue("Preserve this explanation for the investigator")
  expect(screen.queryByRole("button", { name: copy[locale].retry })).not.toBeInTheDocument()
  expect(actions.respondCloseEvidenceAction).toHaveBeenCalledTimes(1)
})

test("fresh-auth verification never implicitly accepts evidence; explicit retry retains binding", async () => {
  const item = { finding: { title: "Missing" }, findingId: "finding", request: { requestId: "request", requestText: "Original request" }, response: { responseId: "response", responseText: "Corrected source", respondedById: "owner" } }
  ;(actions.getCloseEvidenceWorkflowAction as jest.Mock).mockResolvedValue(ok({ ...base, findings: [], reviews: [item] }))
  ;(actions.getCloseEvidenceReviewAction as jest.Mock).mockResolvedValue(ok({ item, canAccept: true, replacement: { status: "AVAILABLE", selection: { checklistItemId: "new-checklist", bindingHash: "source-hash" }, observedAt: "2026-10-03T10:00:00Z", controlStatus: "PASSED" } }))
  ;(actions.acceptCloseEvidenceAction as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" }).mockResolvedValueOnce(ok({ id: "accepted" }))
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue(ok({ status: "verified" }))
  render(<CloseEvidenceWorkflowPanel periodId="period" />)
  fireEvent.click(await screen.findByRole("button", { name: copy.en.review }))
  fireEvent.click(await screen.findByLabelText(copy.en.checked))
  fireEvent.change(screen.getByLabelText(copy.en.notes), { target: { value: "Independent source review completed" } })
  fireEvent.click(screen.getByRole("button", { name: copy.en.accept }))
  const password = await screen.findByLabelText(copy.en.password)
  await waitFor(() => expect(password).toHaveFocus())
  fireEvent.change(password, { target: { value: "private-test-password" } })
  fireEvent.click(screen.getByRole("button", { name: copy.en.verify }))
  await screen.findByText(copy.en.verified)
  expect(actions.acceptCloseEvidenceAction).toHaveBeenCalledTimes(1)
  expect(sessionStorage.getItem("close-evidence:org:actor:period")).not.toContain("private-test-password")
  fireEvent.click(screen.getByRole("button", { name: copy.en.retry }))
  await screen.findByText(copy.en.accepted)
  const calls = (actions.acceptCloseEvidenceAction as jest.Mock).mock.calls
  expect(calls[1]).toEqual(calls[0]); expect(calls[0][0].replacement).toEqual({ checklistItemId: "new-checklist", bindingHash: "source-hash" })
})
jest.mock("@/actions/accounting/close-notification-operations.actions", () => ({ getCloseNotificationOperationsAction: jest.fn(), retryCloseNotificationAction: jest.fn() }))
