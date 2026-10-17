import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useLocale, useTranslations } from "next-intl"
import { PaymentSuspenseQueue } from "../PaymentSuspenseQueue"
import { useResolveSuspenseItem } from "@/hooks/payments/usePaymentReconciliationDashboard"
import { usePermissions } from "@/hooks/usePermissions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import { readSuspenseRecovery, suspenseRecoveryKey } from "@/hooks/payments/suspense-recovery"
import { getPaymentSuspenseRecordsAction } from "@/actions/payments/reconciliation.actions"

jest.mock("@/actions/payments/reconciliation.actions", () => ({ getPaymentSuspenseRecordsAction: jest.fn() }))
jest.mock("@/actions/payments/exception-link.actions", () => ({ readReconciliationExceptionLinkAction: jest.fn(), repairReconciliationExceptionLinkAction: jest.fn() }))

jest.mock("@/hooks/payments/usePaymentReconciliationDashboard", () => ({ useResolveSuspenseItem: jest.fn() }))
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/actions/payments/exception-closure.actions", () => ({}))

jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("next-intl", () => ({ useLocale: jest.fn(() => "en"), useTranslations: jest.fn(() => translator("en")) }))
jest.mock("lucide-react", () => {
  const React = require("react")
  return new Proxy({ __esModule: true }, { get(target, name: string) {
    if (name in target) return target[name as keyof typeof target]
    return (props: Record<string, unknown>) => React.createElement("svg", props)
  } })
})

type Item = React.ComponentProps<typeof PaymentSuspenseQueue>["items"][number]
const revision = `sha256:${"a".repeat(64)}`, newer = `sha256:${"b".repeat(64)}`
const item: Item = {
  id: "suspense-review-1", evidenceRevision: revision, postingDate: "2026-09-09T12:00:00Z",
  providerAccountId: null, status: "RESOLUTION_PROPOSED", severity: "MEDIUM", type: "UNKNOWN_CREDIT",
  amount: 100.25, currencyCode: "XAF", slaDeadline: null, correlationId: null, ownerId: null,
  exceptionId: null, suspenseLedgerAccountId: "account-471", ledgerPostingBatchId: null,
  resolutionNotes: "Saved source reason", proposedById: "maker-1", postedAt: null,
}
const assign = jest.fn(), propose = jest.fn(), approve = jest.fn(), refresh = jest.fn()
const scope = { organizationId: "org-1", actorId: "checker-1" }
function translator(locale: "en" | "fr") {
  const messages = (locale === "en" ? en : fr).paymentReconciliationWorkbench
  return ((key: string) => key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], messages)) as ReturnType<typeof useTranslations>
}
function PermissionBoundQueue(props: Omit<React.ComponentProps<typeof PaymentSuspenseQueue>, "authority">) {
  return <PaymentSuspenseQueue {...props} authority={usePermissions()} />
}
function view(items = [item], locale: "en" | "fr" = "en") {
  jest.mocked(useLocale).mockReturnValue(locale)
  return <PermissionBoundQueue scope={scope} items={items} money={value => String(value)} formatDateTime={value => String(value)} t={translator(locale)} typeOptions={["UNKNOWN_CREDIT", "OTHER"]} />
}
const labels = en.paymentReconciliationWorkbench.suspenseWorkflow
beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: jest.fn(() => `request-${Math.random().toString(36).slice(2)}-unique`) })
  jest.mocked(usePermissions).mockReturnValue({ hasPermission: () => true, organizationId: scope.organizationId, user: { id: scope.actorId }, permissionState: "ready" } as ReturnType<typeof usePermissions>)
  jest.mocked(useResolveSuspenseItem).mockReturnValue({ assign: { isPending: false, mutateAsync: assign }, propose: { isPending: false, mutateAsync: propose }, approve: { isPending: false, mutateAsync: approve }, refresh } as unknown as ReturnType<typeof useResolveSuspenseItem>)
  propose.mockResolvedValue({ replayed: false }); approve.mockResolvedValue({ replayed: false }); refresh.mockResolvedValue(undefined)
})

it.each(["en", "fr"] as const)("explains unavailable currency evidence in %s and keeps the reviewed request", async locale => {
  const copy = (locale === "en" ? en : fr).paymentReconciliationWorkbench.suspenseWorkflow
  approve.mockRejectedValue({ code: "SUSPENSE_CURRENCY_EVIDENCE_REQUIRED" })
  render(view([item], locale))
  fireEvent.click(screen.getByRole("button", { name: copy.review.open }))
  fireEvent.click(screen.getByRole("button", { name: copy.review.confirm }))
  await screen.findByText(copy.review.currencyEvidenceRequired)
  expect(screen.getByRole("region", { name: copy.review.title })).toBeInTheDocument()
  expect(readSuspenseRecovery(sessionStorage, scope).approval?.expectedEvidenceRevision).toBe(revision)
  expect(refresh).not.toHaveBeenCalled()
})

it("reviews saved facts and keeps the reviewed revision fixed when refreshed source changes", async () => {
  const page = render(view())
  fireEvent.change(screen.getByLabelText(labels.review.reason), { target: { value: "Unsaved different reason" } })
  fireEvent.click(screen.getByRole("button", { name: labels.review.open }))
  const review = screen.getByRole("region", { name: labels.review.title })
  expect(review).toHaveFocus()
  expect(within(review).getByText("Saved source reason")).toBeInTheDocument()
  expect(within(review).queryByText("Unsaved different reason")).not.toBeInTheDocument()
  page.rerender(view([{ ...item, evidenceRevision: newer, resolutionNotes: "New server reason" }]))
  fireEvent.click(within(review).getByRole("button", { name: labels.review.confirm }))
  await waitFor(() => expect(approve).toHaveBeenCalledWith({ suspenseItemId: item.id, expectedEvidenceRevision: revision }))
})

it("preserves a failed proposal draft and its request identity for exact retry", async () => {
  propose.mockRejectedValueOnce(new Error("Lost connection"))
  render(view())
  fireEvent.change(screen.getByLabelText(labels.review.reason), { target: { value: "Retain this reason" } })
  fireEvent.click(screen.getByRole("button", { name: labels.actions.propose }))
  await screen.findByRole("alert")
  const first = propose.mock.calls[0][0]
  expect(screen.getByLabelText(labels.review.reason)).toHaveValue("Retain this reason")
  fireEvent.click(screen.getByRole("button", { name: labels.actions.propose }))
  await waitFor(() => expect(propose).toHaveBeenCalledTimes(2))
  expect(propose.mock.calls[1][0]).toEqual(first)
  expect(first.expectedEvidenceRevision).toBe(revision)
  expect(first.idempotencyKey).toBeTruthy()
})

it("keeps draft text across refreshed evidence and rebases only after explicit action", async () => {
  const page = render(view())
  fireEvent.change(screen.getByLabelText(labels.review.reason), { target: { value: "Retained amended draft" } })
  page.rerender(view([{ ...item, evidenceRevision: newer }]))
  expect(screen.getByText(labels.review.draftStale)).toBeInTheDocument()
  expect(screen.getByLabelText(labels.review.reason)).toHaveValue("Retained amended draft")
  fireEvent.click(screen.getByRole("button", { name: labels.review.rebase }))
  fireEvent.click(screen.getByRole("button", { name: labels.actions.propose }))
  await waitFor(() => expect(propose).toHaveBeenCalledWith(expect.objectContaining({ reason: "Retained amended draft", expectedEvidenceRevision: newer })))
})

it("retains failed approval review and requires a separate confirmation after fresh authentication", async () => {
  approve.mockRejectedValueOnce(Object.assign(new Error("Expired"), { code: "FRESH_AUTH_REQUIRED" }))
  jest.mocked(stepUpWithPasswordAction).mockResolvedValue({ success: true } as Awaited<ReturnType<typeof stepUpWithPasswordAction>>)
  render(view())
  fireEvent.click(screen.getByRole("button", { name: labels.review.open }))
  fireEvent.click(screen.getByRole("button", { name: labels.review.confirm }))
  const password = await screen.findByLabelText(en.paymentReconciliationWorkbench.manualMatch.passwordLabel)
  expect(screen.getByRole("button", { name: labels.history.resume })).toBeDisabled()
  fireEvent.change(password, { target: { value: "test-only-password" } })
  fireEvent.click(screen.getByRole("button", { name: labels.review.authenticate }))
  await screen.findByText(labels.review.authenticated)
  expect(password).toHaveValue("")
  expect(approve).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: labels.history.resume }))
  await waitFor(() => expect(approve).toHaveBeenCalledTimes(2))
  expect(approve.mock.calls[1][0]).toEqual(approve.mock.calls[0][0])
})

it("announces stale approval without discarding the review or exposing server details", async () => {
  approve.mockRejectedValueOnce(Object.assign(new Error("Private database details"), { code: "CONFLICT" }))
  render(view())
  fireEvent.click(screen.getByRole("button", { name: labels.review.open }))
  fireEvent.click(screen.getByRole("button", { name: labels.review.confirm }))
  expect(await screen.findByRole("alert")).toHaveTextContent(labels.review.changed)
  expect(screen.getByRole("region", { name: labels.review.title })).toBeInTheDocument()
  expect(screen.queryByText("Private database details")).not.toBeInTheDocument()
})

it("returns keyboard focus to the review opener on Escape", () => {
  render(view())
  const opener = screen.getByRole("button", { name: labels.review.open })
  fireEvent.click(opener)
  fireEvent.keyDown(screen.getByRole("region", { name: labels.review.title }), { key: "Escape" })
  expect(opener).toHaveFocus()
  expect(screen.queryByRole("region", { name: labels.review.title })).not.toBeInTheDocument()
})

it.each(["en", "fr"] as const)("uses actual %s catalogue text for posted retained records", locale => {
  const copy = (locale === "en" ? en : fr).paymentReconciliationWorkbench.suspenseWorkflow
  render(view([{ ...item, status: "POSTED_TO_SUSPENSE" }], locale))
  expect(screen.getByText(copy.states.POSTED_TO_SUSPENSE)).toBeInTheDocument()
  expect(screen.getByText(copy.review.posted)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: copy.review.open })).toBeDisabled()
  expect(screen.queryByLabelText(copy.review.reason)).not.toBeInTheDocument()
})

it.each(["en", "fr"] as const)("shows exact recorded XAF precision in the %s approval review", locale => {
  const copy = (locale === "en" ? en : fr).paymentReconciliationWorkbench.suspenseWorkflow
  render(view([item], locale))
  fireEvent.click(screen.getByRole("button", { name: copy.review.open }))
  expect(within(screen.getByRole("region", { name: copy.review.title })).getByText(`${locale === "fr" ? "100,25" : "100.25"} · XAF`)).toBeInTheDocument()
})

it("explains unavailable approval and disables mutations for a denied user", () => {
  jest.mocked(usePermissions).mockReturnValue({ hasPermission: permission => permission === "payments.reconciliation.read", organizationId: scope.organizationId, user: { id: scope.actorId }, permissionState: "ready" } as ReturnType<typeof usePermissions>)
  render(view())
  expect(screen.getByRole("button", { name: labels.review.open })).toBeDisabled()
  expect(screen.getByRole("button", { name: labels.actions.assign })).toBeDisabled()
  expect(screen.getByRole("button", { name: labels.actions.propose })).toBeDisabled()
  expect(screen.getByText(labels.review.approvalRequires)).toBeInTheDocument()
})

it("restores draft and exact proposal identity after remount", async () => {
  propose.mockRejectedValueOnce(new Error("Response lost"))
  const page = render(view())
  fireEvent.change(screen.getByLabelText(labels.review.reason), { target: { value: "Survive reload" } })
  fireEvent.click(screen.getByRole("button", { name: labels.actions.propose }))
  await screen.findByRole("alert")
  const original = propose.mock.calls[0][0]
  page.unmount(); render(view())
  expect(screen.getByLabelText(labels.review.reason)).toHaveValue("Survive reload")
  fireEvent.click(screen.getByRole("button", { name: labels.actions.propose }))
  await waitFor(() => expect(propose).toHaveBeenCalledTimes(2))
  expect(propose.mock.calls[1][0]).toEqual(original)
})

it("restores a retained approval request using current server facts and the original revision", async () => {
  approve.mockRejectedValueOnce(new Error("Response lost"))
  const page = render(view())
  fireEvent.click(screen.getByRole("button", { name: labels.review.open }))
  fireEvent.click(screen.getByRole("button", { name: labels.review.confirm }))
  await screen.findByRole("alert")
  expect(readSuspenseRecovery(sessionStorage, scope).approval?.expectedEvidenceRevision).toBe(revision)
  page.unmount(); render(view([{ ...item, status: "POSTED_TO_SUSPENSE", evidenceRevision: newer, resolutionNotes: "Current retained facts" }]))
  const review = await screen.findByRole("region", { name: labels.review.title })
  expect(within(review).getByText("Current retained facts")).toBeInTheDocument()
  expect(approve).toHaveBeenCalledTimes(1)
  fireEvent.click(within(review).getByRole("button", { name: labels.history.resume }))
  await waitFor(() => expect(approve).toHaveBeenCalledTimes(2))
  expect(approve.mock.calls[1][0]).toEqual(approve.mock.calls[0][0])
  await waitFor(() => expect(readSuspenseRecovery(sessionStorage, scope).approval).toBeNull())
})

it("blocks submission when its request cannot be retained and never stores the password", async () => {
  const store = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota") })
  render(view())
  fireEvent.click(screen.getByRole("button", { name: labels.review.open }))
  fireEvent.click(screen.getByRole("button", { name: labels.review.confirm }))
  expect(await screen.findByRole("alert")).toHaveTextContent(labels.recovery.storage)
  expect(approve).not.toHaveBeenCalled()
  expect(sessionStorage.getItem(suspenseRecoveryKey(scope))).toBeNull()
  store.mockRestore()
})

it("hides restored private work while the current actor or organization does not match", () => {
  const page = render(view())
  fireEvent.change(screen.getByLabelText(labels.review.reason), { target: { value: "Private retained text" } })
  jest.mocked(usePermissions).mockReturnValue({ hasPermission: () => true, organizationId: "other-org", user: { id: "other-user" }, permissionState: "ready" } as ReturnType<typeof usePermissions>)
  page.rerender(view())
  expect(screen.queryByDisplayValue("Private retained text")).not.toBeInTheDocument()
  expect(screen.getByRole("status")).toHaveTextContent(labels.recovery.scope)
})

it("looks up an off-queue retained approval and keeps its original revision", async () => {
  sessionStorage.setItem(suspenseRecoveryKey(scope), JSON.stringify({ version: 1, ...scope, drafts: {}, approval: { suspenseItemId: item.id, expectedEvidenceRevision: revision } }))
  jest.mocked(getPaymentSuspenseRecordsAction).mockResolvedValue({ success: true, data: { scope, items: [{ ...item, status: "POSTED_TO_SUSPENSE", evidenceRevision: newer }], nextCursor: null, asOf: "2026-09-09T00:00:00Z" }, error: null, status: 200 })
  render(view([]))
  fireEvent.click(screen.getByRole("button", { name: labels.recovery.resume }))
  const review = await screen.findByRole("region", { name: labels.review.title })
  expect(getPaymentSuspenseRecordsAction).toHaveBeenCalledWith({ itemId: item.id })
  expect(approve).not.toHaveBeenCalled()
  fireEvent.click(within(review).getByRole("button", { name: labels.history.resume }))
  await waitFor(() => expect(approve).toHaveBeenCalledWith({ suspenseItemId: item.id, expectedEvidenceRevision: revision }))
})

it("preserves a pending request when history lookup fails or returns another scope", async () => {
  sessionStorage.setItem(suspenseRecoveryKey(scope), JSON.stringify({ version: 1, ...scope, drafts: {}, approval: { suspenseItemId: item.id, expectedEvidenceRevision: revision } }))
  jest.mocked(getPaymentSuspenseRecordsAction).mockResolvedValue({ success: true, data: { scope: { ...scope, organizationId: "foreign" }, items: [item], nextCursor: null, asOf: "2026-09-09T00:00:00Z" }, error: null, status: 200 })
  render(view([])); fireEvent.click(screen.getByRole("button", { name: labels.recovery.resume }))
  expect(await screen.findByRole("alert")).toHaveTextContent(labels.history.failed)
  expect(screen.queryByRole("region", { name: labels.review.title })).not.toBeInTheDocument()
  expect(readSuspenseRecovery(sessionStorage, scope).approval?.expectedEvidenceRevision).toBe(revision)
})

it("paginates retained records and inspects a posted journal without an approval control", async () => {
  const cursor = { id: "older", createdAt: "2026-09-01T00:00:00Z" }
  const first = { ...item, id: "first", status: "RESOLVED" }, second = { ...item, id: "second", status: "POSTED_TO_SUSPENSE", postedAt: "2026-09-01T00:00:00Z", postingDate: "2026-08-31T00:00:00Z", suspenseAccount: { id: "a", code: "471", nameEn: "Suspense", nameFr: "Attente" }, journal: { id: "j", number: "SP-001", status: "POSTED" } }
  jest.mocked(getPaymentSuspenseRecordsAction).mockResolvedValueOnce({ success: true, data: { scope, items: [first], nextCursor: cursor, asOf: cursor.createdAt }, error: null, status: 200 }).mockResolvedValueOnce({ success: true, data: { scope, items: [second], nextCursor: null, asOf: cursor.createdAt }, error: null, status: 200 })
  render(view([])); fireEvent.click(screen.getByRole("button", { name: labels.history.open }))
  await screen.findByText("first"); fireEvent.click(screen.getByRole("button", { name: labels.history.next }))
  await screen.findByText("second"); expect(getPaymentSuspenseRecordsAction).toHaveBeenLastCalledWith({ cursor })
  expect(screen.getByRole("button", { name: labels.history.next })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: labels.history.inspect }))
  const review = screen.getByRole("region", { name: labels.review.title })
  expect(within(review).getByText("SP-001 · j")).toBeInTheDocument()
  expect(within(review).getByText("471 · Suspense")).toBeInTheDocument()
  expect(within(review).queryByRole("button", { name: labels.review.confirm })).not.toBeInTheDocument()
  expect(approve).not.toHaveBeenCalled()
})

it("opens old work from history and refreshes its authoritative revision after assignment and proposal", async () => {
  const old = { ...item, status: "OPEN", id: "old-off-queue" }, assigned = { ...old, status: "ASSIGNED", evidenceRevision: newer }, proposed = { ...assigned, status: "RESOLUTION_PROPOSED", resolutionNotes: "Older work completed" }
  const response = (record: Item) => ({ success: true as const, data: { scope, items: [record], nextCursor: null, asOf: "2026-09-09T00:00:00Z" }, error: null, status: 200 as const })
  jest.mocked(getPaymentSuspenseRecordsAction).mockResolvedValueOnce(response(old)).mockResolvedValueOnce(response(assigned)).mockResolvedValueOnce(response(proposed))
  render(view([])); fireEvent.click(screen.getByRole("button", { name: labels.history.open }))
  fireEvent.click(await screen.findByRole("button", { name: labels.history.inspect }))
  fireEvent.click(screen.getByRole("button", { name: en.paymentReconciliationWorkbench.overviewScope.work }))
  expect(screen.getByRole("region", { name: en.paymentReconciliationWorkbench.overviewScope.working })).toHaveFocus()
  fireEvent.click(screen.getByRole("button", { name: labels.actions.assign }))
  await screen.findByText(labels.notifications.assignedMessage)
  expect(assign).toHaveBeenCalledWith({ suspenseItemId: old.id })
  fireEvent.change(screen.getByLabelText(labels.review.reason), { target: { value: "Older work completed" } })
  fireEvent.click(screen.getByRole("button", { name: labels.actions.propose }))
  await screen.findByText(labels.notifications.proposedMessage)
  expect(propose).toHaveBeenCalledWith(expect.objectContaining({ suspenseItemId: old.id, expectedEvidenceRevision: newer, reason: "Older work completed" }))
  expect(screen.getByRole("button", { name: labels.review.open })).toBeEnabled()
})

it.each([true, false])("does not permit more old-work changes after read failure; saved change: %s", async afterWrite => {
  const old = { ...item, status: "OPEN", id: "old-off-queue" }
  jest.mocked(getPaymentSuspenseRecordsAction).mockResolvedValueOnce({ success: true, data: { scope, items: [old], nextCursor: null, asOf: "2026-09-09T00:00:00Z" }, error: null, status: 200 }).mockRejectedValueOnce(new Error("read failed"))
  render(view([])); fireEvent.click(screen.getByRole("button", { name: labels.history.open }))
  fireEvent.click(await screen.findByRole("button", { name: labels.history.inspect })); fireEvent.click(screen.getByRole("button", { name: en.paymentReconciliationWorkbench.overviewScope.work }))
  fireEvent.click(screen.getByRole("button", { name: afterWrite ? labels.actions.assign : labels.review.refresh }))
  expect(await screen.findByRole("alert")).toHaveTextContent(afterWrite ? en.paymentReconciliationWorkbench.overviewScope.unavailable : labels.history.failed)
  expect(assign).toHaveBeenCalledTimes(afterWrite ? 1 : 0)
  expect(screen.getByRole("button", { name: labels.actions.assign })).toBeDisabled()
  expect(screen.queryByRole("button", { name: labels.actions.propose })).not.toBeInTheDocument()
})
jest.mock("../PaymentSuspenseResolutionPanel", () => ({ PaymentSuspenseResolutionPanel: () => null }))
