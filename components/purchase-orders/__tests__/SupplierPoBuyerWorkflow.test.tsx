import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { SupplierPoAcknowledgementWorkbench } from "../SupplierPoAcknowledgementWorkbench"
import { getSupplierPoAcknowledgementWorkbenchAction, issueSupplierPoInviteAction, reviewSupplierPoProposalAction, revokeSupplierPoInviteAction } from "@/actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { readSupplierBuyerRecovery, saveSupplierBuyerRecovery } from "@/hooks/supplier-po-buyer-request"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import type { ComponentProps } from "react"
let mockLocale = "en"
const mockTranslations = Object.fromEntries(["supplierPoAcknowledgement", "supplierPoAcknowledgement.buyerWorkbench"].map(namespace => [namespace, (key: string) => { let value: unknown = mockLocale === "fr" ? fr : en; for (const part of (namespace + "." + key).split(".")) value = (value as Record<string, unknown>)[part]; return String(value) }]))
jest.mock("next-intl", () => ({ useTranslations: (namespace: string) => mockTranslations[namespace] }))
jest.mock("next-intl/routing", () => ({ defineRouting: (value: unknown) => value }))
jest.mock("@/actions/purchaseOrderWorkflow/supplier-po-acknowledgement.actions", () => ({ getSupplierPoAcknowledgementWorkbenchAction: jest.fn(), issueSupplierPoInviteAction: jest.fn(), reviewSupplierPoProposalAction: jest.fn(), revokeSupplierPoInviteAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("../PurchaseOrderAmendmentDialog", () => ({ PurchaseOrderAmendmentDialog: ({ proposalId }: { proposalId: string | null }) => proposalId ? <p data-testid="active-amendment-review">{proposalId}</p> : null }))
const b = en.supplierPoAcknowledgement.buyerWorkbench
const scope = { organizationId: "org", actorId: "buyer", purchaseOrderId: "po" }
const data = { scope: { organizationId: "org", actorId: "buyer" }, checkedAt: "2026-09-01T12:00:00Z", canManage: true, canIssue: true,
  purchaseOrder: { id: "po", orderNumber: "PO-1", status: "APPROVED", expectedDeliveryDate: null, updatedAt: "2026-09-01T12:00:00Z", currentOrderHash: "a".repeat(64), contentHash: "a".repeat(64), supplier: { name: "Supplier", email: "supplier@example.invalid", preferredLocale: "EN" } }, nextEnvelopeId: null, envelopes: [],
  controls: { externalActionsAreProposals: true as const, purchaseOrderAuthoritative: true as const, stockAuthoritative: true as const, accountsPayableAuthoritative: true as const, accountingAuthoritative: true as const } }
const read = getSupplierPoAcknowledgementWorkbenchAction as jest.Mock, issue = issueSupplierPoInviteAction as jest.Mock, stepUp = stepUpWithPasswordAction as jest.Mock
const ok = (value: unknown) => ({ success: true, data: value })
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); mockLocale = "en"
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "a0000000-0000-4000-8000-000000000001" })
  read.mockResolvedValue(ok(data)); stepUp.mockResolvedValue(ok({}))
  issue.mockImplementation(async input => ok({ purchaseOrderId: "po", tokenId: "token", envelopeId: "envelope", inviteUrl: "/en/supplier-purchase-order/envelope?token=synthetic", requestReference: input.idempotencyKey, correlationReference: input.correlationId }))
})
async function begin() { const view = render(<SupplierPoAcknowledgementWorkbench initialData={data} locale="en" />); fireEvent.click(screen.getByTestId("issue-supplier-po-invite")); await screen.findByTestId("supplier-po-buyer-draft"); return view }
function submit() { fireEvent.change(screen.getByLabelText(b.password), { target: { value: "never-store-this-password" } }); fireEvent.click(screen.getByRole("checkbox")); fireEvent.submit(screen.getByTestId("supplier-po-buyer-draft")) }
it("requires explicit confirmation and preserves the supplier reference across reload", async () => {
  const view = await begin(); expect(screen.getByTestId("submit-supplier-buyer-command")).toBeDisabled(); fireEvent.change(screen.getByLabelText(b.recipientReference), { target: { value: "confirmed@example.invalid" } }); view.unmount()
  render(<SupplierPoAcknowledgementWorkbench initialData={data} locale="en" />)
  expect(await screen.findByLabelText(b.recipientReference)).toHaveValue("confirmed@example.invalid"); expect(issue).not.toHaveBeenCalled()
})
it("keeps an exact request after authentication failure without storing the password", async () => {
  await begin(); stepUp.mockResolvedValueOnce({ success: false }); submit(); await screen.findByText(b.authenticationFailed)
  const command = readSupplierBuyerRecovery(sessionStorage, scope).command; expect(command).not.toBeNull(); expect(issue).not.toHaveBeenCalled(); expect(JSON.stringify(sessionStorage)).not.toContain("never-store-this-password")
  fireEvent.change(screen.getByLabelText(b.password), { target: { value: "verified-password" } }); fireEvent.submit(screen.getByTestId("supplier-po-buyer-draft")); await screen.findByTestId("supplier-po-invite-ready")
  expect(issue.mock.calls[0][0]).toEqual(command?.input); expect(readSupplierBuyerRecovery(sessionStorage, scope).command).toBeNull()
})
it("retries the original request after a lost result", async () => {
  await begin(); issue.mockRejectedValueOnce(new Error("lost")); submit(); await screen.findByText(b.uncertainResult); const first = issue.mock.calls[0][0]
  fireEvent.change(screen.getByLabelText(b.password), { target: { value: "verified-password" } }); fireEvent.submit(screen.getByTestId("supplier-po-buyer-draft")); await screen.findByTestId("supplier-po-invite-ready"); expect(issue.mock.calls[1][0]).toEqual(first)
})
it("does not clear recovery on a mismatched success receipt", async () => {
  await begin(); issue.mockResolvedValueOnce(ok({ tokenId: "unrelated" })); submit(); await screen.findByText(b.receiptMismatch); expect(readSupplierBuyerRecovery(sessionStorage, scope).command).not.toBeNull()
})
it("requires a fresh read before editing a rejected stale draft", async () => {
  await begin(); issue.mockResolvedValueOnce({ success: false, code: "CONFLICT" }); submit(); await screen.findByText(b.rejectedRequest); expect(screen.queryByTestId("supplier-po-buyer-draft")).not.toBeInTheDocument()
  read.mockResolvedValueOnce(ok({ ...data, purchaseOrder: { ...data.purchaseOrder, currentOrderHash: "c".repeat(64) } })); fireEvent.click(screen.getByRole("button", { name: b.refresh })); await screen.findByRole("button", { name: b.reviewCurrent }); fireEvent.click(screen.getByRole("button", { name: b.reviewCurrent }))
  expect(readSupplierBuyerRecovery(sessionStorage, scope).command).toBeNull(); expect(readSupplierBuyerRecovery(sessionStorage, scope).draft?.input).toMatchObject({ expectedOrderHash: "c".repeat(64) }); expect(screen.getByRole("checkbox")).not.toBeChecked()
})
it("does not confuse failed reads with an empty invitation history", async () => {
  render(<SupplierPoAcknowledgementWorkbench initialData={data} locale="en" />); read.mockRejectedValueOnce(new Error("database")); fireEvent.click(screen.getByRole("button", { name: b.refresh })); await screen.findByText(b.readFailed); expect(screen.queryByText(b.noEnvelope)).not.toBeInTheDocument()
})
it("retains pending identity and hides data when current authority is denied", async () => {
  await begin(); issue.mockResolvedValueOnce({ success: false, code: "FORBIDDEN" }); submit(); await screen.findByText(b.readFailed); expect(screen.queryByTestId("supplier-po-buyer-draft")).not.toBeInTheDocument(); expect(readSupplierBuyerRecovery(sessionStorage, scope).command).not.toBeNull()
})
it("does not discard an action result when route revalidation refreshes the same scoped props", async () => {
  const view = await begin(); let complete!: (value: unknown) => void; issue.mockImplementationOnce(() => new Promise(resolve => { complete = resolve })); submit(); await waitFor(() => expect(issue).toHaveBeenCalledTimes(1)); const input = issue.mock.calls[0][0]
  view.rerender(<SupplierPoAcknowledgementWorkbench initialData={{ ...data, checkedAt: "2026-09-01T12:01:00Z" }} locale="en" />)
  await act(async () => complete(ok({ purchaseOrderId: "po", tokenId: "token", envelopeId: "envelope", inviteUrl: "/synthetic", requestReference: input.idempotencyKey, correlationReference: input.correlationId })))
  await screen.findByTestId("supplier-po-invite-ready")
})
it("provides French viewing-only access without mutation controls", () => {
  mockLocale = "fr"; render(<SupplierPoAcknowledgementWorkbench initialData={{ ...data, canManage: false, canIssue: false }} locale="fr" />)
  expect(screen.getByText(fr.supplierPoAcknowledgement.buyerWorkbench.readOnly)).toBeVisible(); expect(screen.getByTestId("issue-supplier-po-invite")).toBeDisabled(); expect(reviewSupplierPoProposalAction).not.toHaveBeenCalled(); expect(revokeSupplierPoInviteAction).not.toHaveBeenCalled()
})

const populated: ComponentProps<typeof SupplierPoAcknowledgementWorkbench>["initialData"] = { ...data, envelopes: [{
  id: "envelope", contentHash: "a".repeat(64), sourceStateHash: "a".repeat(64), preferredLocale: "EN", createdAt: "2026-09-01T12:00:00Z", matchesCurrentOrder: true, nextTokenId: "token-cursor", nextProposalId: null,
  tokens: [{ id: "token", status: "ACTIVE", requestReference: "issued-request", tokenHashPrefix: "abc", recipientHashPrefix: null, issuedAt: "2026-09-01T12:00:00Z", expiresAt: "2026-09-30T12:00:00Z", revokedAt: null, revocationReason: null, accessCount: 1 }],
  proposals: [{ proposalId: "proposal", envelopeId: "envelope", requestReference: "supplier-request", correlationReference: "supplier-correlation", proposalType: "REQUEST_CHANGE", status: "SUBMITTED", requestedDeliveryDate: null, note: "Supplier terms", quantityChanges: [{ purchaseOrderLineId: "line", itemName: "Cartons", originalOrderedQuantity: "10", requestedQuantity: "8.125" }], payloadHash: "b".repeat(64), stateHash: "c".repeat(64), submittedAt: "2026-09-01T12:00:00Z", history: [{ version: 1, status: "SUBMITTED", actorType: "SUPPLIER", effectiveAt: "2026-09-01T12:00:00Z", reason: null, stateHash: "c".repeat(64) }], replayed: false, authoritativeMutation: false, canAccept: true }],
}] }
it("requires the displayed order and proposal revisions and matches the recorded review identity", async () => {
  read.mockResolvedValue(ok(populated)); (reviewSupplierPoProposalAction as jest.Mock).mockImplementation(async input => ok({ proposalId: input.proposalId, reviewRequestReference: input.idempotencyKey, reviewCorrelationReference: input.correlationId, reviewedStateId: "review-state", status: "BUYER_ACCEPTED", authoritativeMutation: false }))
  render(<SupplierPoAcknowledgementWorkbench initialData={populated} locale="en" />); expect(screen.getByText("Cartons: 10 → 8.125")).toBeVisible(); fireEvent.click(screen.getByTestId("buyer-accept-supplier-proposal")); fireEvent.change(screen.getByLabelText(b.reviewReason), { target: { value: "Reviewed supplier terms" } }); submit()
  await screen.findByText(b.reviewed); expect(reviewSupplierPoProposalAction).toHaveBeenCalledWith(expect.objectContaining({ proposalId: "proposal", expectedOrderHash: "a".repeat(64), expectedStateHash: "c".repeat(64), decision: "ACCEPT", reason: "Reviewed supplier terms" })); expect(readSupplierBuyerRecovery(sessionStorage, scope).command).toBeNull()
})
it("opens an accepted amendment when there is no unrelated success message", async () => {
  const envelope=populated.envelopes[0]
  render(<SupplierPoAcknowledgementWorkbench initialData={{...populated,envelopes:[{...envelope,proposals:[{...envelope.proposals[0],status:"BUYER_ACCEPTED"}]}]}} locale="en" />)
  fireEvent.click(screen.getByTestId("review-order-amendment"))
  expect(await screen.findByTestId("active-amendment-review")).toHaveTextContent("proposal")
})
it("requires a reason and retains an exact revocation request after a missing receipt", async () => {
  const revoke = revokeSupplierPoInviteAction as jest.Mock; revoke.mockRejectedValueOnce(new Error("lost")); revoke.mockImplementationOnce(async input => ok({ purchaseOrderId: "po", tokenId: "token", status: "REVOKED", requestReference: input.idempotencyKey, correlationReference: input.correlationId }))
  render(<SupplierPoAcknowledgementWorkbench initialData={populated} locale="en" />); fireEvent.click(screen.getByTestId("revoke-supplier-po-token-token")); submit(); await screen.findByText(b.validationFailed); expect(revoke).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(b.revokeReason), { target: { value: "Disable the reviewed link" } }); submit(); await screen.findByText(b.uncertainResult); const input = revoke.mock.calls[0][0]
  fireEvent.change(screen.getByLabelText(b.password), { target: { value: "verified-password" } }); fireEvent.submit(screen.getByTestId("supplier-po-buyer-draft")); await screen.findByText(b.accessRevoked); expect(revoke.mock.calls[1][0]).toEqual(input)
})
it("loads invitation history through the scoped server cursor", async () => {
  render(<SupplierPoAcknowledgementWorkbench initialData={populated} locale="en" />); fireEvent.click(screen.getByRole("button", { name: b.olderInvitations })); await waitFor(() => expect(read).toHaveBeenCalledWith({ purchaseOrderId: "po", envelopeId: "envelope", beforeTokenId: "token-cursor" }))
})
it("ignores a late result after the tenant changes and preserves recovery in the originating scope", async () => {
  const view = await begin(); let complete!: (value: unknown) => void; issue.mockImplementationOnce(() => new Promise(resolve => { complete = resolve })); submit(); await waitFor(() => expect(issue).toHaveBeenCalled()); const input = issue.mock.calls[0][0]
  view.rerender(<SupplierPoAcknowledgementWorkbench initialData={{ ...data, scope: { ...data.scope, organizationId: "other-org" } }} locale="en" />)
  await act(async () => complete(ok({ purchaseOrderId: "po", tokenId: "token", envelopeId: "envelope", inviteUrl: "/synthetic", requestReference: input.idempotencyKey, correlationReference: input.correlationId })))
  expect(screen.queryByTestId("supplier-po-invite-ready")).not.toBeInTheDocument(); expect(readSupplierBuyerRecovery(sessionStorage, scope).command).not.toBeNull()
})
it("blocks mutation if recovery cannot be persisted", async () => {
  const storage = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota") })
  try { render(<SupplierPoAcknowledgementWorkbench initialData={data} locale="en" />); fireEvent.click(screen.getByTestId("issue-supplier-po-invite")); await screen.findByText(b.storageUnavailable); expect(issue).not.toHaveBeenCalled(); expect(screen.queryByTestId("supplier-po-buyer-draft")).not.toBeInTheDocument() } finally { storage.mockRestore() }
})
it("clears the password when another scoped draft is restored", async () => {
  const view = await begin(); fireEvent.change(screen.getByLabelText(b.password), { target: { value: "private-current-password" } })
  saveSupplierBuyerRecovery(sessionStorage, { ...scope, organizationId: "other-org" }, { draft: { kind: "issue", input: { purchaseOrderId: "po", expectedOrderHash: "a".repeat(64) } }, command: null, rejected: false })
  view.rerender(<SupplierPoAcknowledgementWorkbench initialData={{ ...data, scope: { ...data.scope, organizationId: "other-org" } }} locale="en" />)
  await waitFor(() => expect(screen.getByLabelText(b.password)).toHaveValue("")); expect(screen.getByRole("checkbox")).not.toBeChecked()
})
it("localizes quantity decimals without rounding large values", () => {
  mockLocale = "fr"; const envelope = populated.envelopes[0], proposal = envelope.proposals[0]
  render(<SupplierPoAcknowledgementWorkbench initialData={{ ...populated, envelopes: [{ ...envelope, proposals: [{ ...proposal, quantityChanges: [{ ...proposal.quantityChanges[0], originalOrderedQuantity: "999999999999999.123", requestedQuantity: "8.125" }] }] }] }} locale="fr" />)
  expect(screen.getByText("Cartons: 999999999999999,123 → 8,125")).toBeVisible()
})
it("prevents a new invitation from a restored draft when current setup is unavailable", async () => {
  const view = await begin(); view.rerender(<SupplierPoAcknowledgementWorkbench initialData={{ ...data, canIssue: false }} locale="en" />); submit(); expect(issue).not.toHaveBeenCalled(); expect(stepUp).not.toHaveBeenCalled(); expect(screen.getByTestId("submit-supplier-buyer-command")).toBeDisabled()
})
it("keeps the selected historical page when route revalidation supplies the default page", async () => {
  const latest = { ...populated, nextEnvelopeId: "envelope-cursor" }
  const older = { ...populated, envelopes: [{ ...populated.envelopes[0], id: "older-envelope", tokens: [], proposals: [{ ...populated.envelopes[0].proposals[0], proposalId: "historical-proposal", envelopeId: "older-envelope" }] }] }
  read.mockResolvedValueOnce(ok(older))
  const view = render(<SupplierPoAcknowledgementWorkbench initialData={latest} locale="en" />)
  fireEvent.click(screen.getByRole("button", { name: b.olderEnvelopes }))
  await screen.findByTestId("supplier-po-proposal-historical-proposal")
  view.rerender(<SupplierPoAcknowledgementWorkbench initialData={{ ...latest, checkedAt: "2026-09-01T12:02:00Z" }} locale="en" />)
  expect(screen.getByTestId("supplier-po-proposal-historical-proposal")).toBeVisible()
  expect(screen.queryByTestId("supplier-po-proposal-proposal")).not.toBeInTheDocument()
})
it.each(["authority", "order"])("requires a fresh historical read when the route's %s changes", async change => {
  const latest = { ...populated, nextEnvelopeId: "envelope-cursor" }
  read.mockResolvedValueOnce(ok(populated))
  const view = render(<SupplierPoAcknowledgementWorkbench initialData={latest} locale="en" />)
  fireEvent.click(screen.getByRole("button", { name: b.olderEnvelopes }))
  await screen.findByTestId("supplier-po-proposal-proposal")
  const changed = change === "authority" ? { ...latest, canManage: false } : { ...latest, purchaseOrder: { ...latest.purchaseOrder, currentOrderHash: "d".repeat(64) } }
  view.rerender(<SupplierPoAcknowledgementWorkbench initialData={changed} locale="en" />)
  expect(screen.queryByTestId("supplier-po-proposal-proposal")).not.toBeInTheDocument()
  expect(screen.getByText(b.refreshRequired)).toBeVisible()
})
it("does not restore default records from route props while an explicit read fails", async () => {
  let reject!: (reason: unknown) => void
  read.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
  const view = render(<SupplierPoAcknowledgementWorkbench initialData={populated} locale="en" />)
  fireEvent.click(screen.getByRole("button", { name: b.refresh }))
  view.rerender(<SupplierPoAcknowledgementWorkbench initialData={{ ...populated, checkedAt: "2026-09-01T12:03:00Z" }} locale="en" />)
  await act(async () => reject(new Error("read unavailable")))
  expect(screen.getByText(b.readFailed)).toBeVisible()
  expect(screen.queryByTestId("supplier-po-proposal-proposal")).not.toBeInTheDocument()
})
