import { getSupplierPoAcknowledgementWorkbenchAction, issueSupplierPoInviteAction, reviewSupplierPoProposalAction, revokeSupplierPoInviteAction } from "../supplier-po-acknowledgement.actions"
import * as service from "@/services/purchase-order/supplier-po-acknowledgement.service"

const mockOptions: Array<Record<string, unknown>> = []
let mockContext: { orgId: string; userId: string; freshAuth?: { claims: { tenantId: string; userId: string; sessionId: string } } }
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ RbacError: class extends Error {} }))
jest.mock("@/services/_shared/protect", () => ({ protect: (options: Record<string, unknown>, handler: (input: unknown, context: unknown) => unknown) => {
  return async (input: unknown) => { mockOptions.push(options); return handler(input, mockContext) }
} }))
jest.mock("@/services/purchase-order/supplier-po-acknowledgement.service", () => ({ getSupplierPoAcknowledgementWorkbench: jest.fn(), issueSupplierPoInvite: jest.fn(), reviewSupplierPoProposal: jest.fn(), revokeSupplierPoInvite: jest.fn() }))
const key = { idempotencyKey: "request-123", correlationId: "correlation-123" }
const issue = { purchaseOrderId: "po", expectedOrderHash: "a".repeat(64), ...key }
const review = { ...issue, proposalId: "proposal", expectedStateHash: "b".repeat(64), decision: "ACCEPT", reason: "Reviewed the supplier terms" }
const revoke = { purchaseOrderId: "po", tokenId: "token", reason: "Invitation no longer needed", ...key }
beforeEach(() => {
  jest.clearAllMocks(); mockOptions.length = 0
  mockContext = { orgId: "current-org", userId: "current-buyer", freshAuth: { claims: { tenantId: "current-org", userId: "current-buyer", sessionId: "current-session" } } }
  ;(service.issueSupplierPoInvite as jest.Mock).mockResolvedValue({ tokenId: "token", envelopeId: "envelope", purchaseOrderId: "po", token: "synthetic", preferredLocale: "FR", expiresAt: "2026-10-01", requestReference: key.idempotencyKey, correlationReference: key.correlationId })
})
it("derives tenant, buyer and verified session for every write; preserves the request references", async () => {
  const result = await issueSupplierPoInviteAction(issue)
  expect(result).toMatchObject({ requestReference: key.idempotencyKey, correlationReference: key.correlationId })
  expect(service.issueSupplierPoInvite).toHaveBeenCalledWith({ ...issue, organizationId: "current-org", issuedById: "current-buyer", sessionId: "current-session" })
  await reviewSupplierPoProposalAction(review); expect(service.reviewSupplierPoProposal).toHaveBeenCalledWith({ ...review, organizationId: "current-org", reviewedById: "current-buyer", sessionId: "current-session" })
  await revokeSupplierPoInviteAction(revoke); expect(service.revokeSupplierPoInvite).toHaveBeenCalledWith({ ...revoke, organizationId: "current-org", revokedById: "current-buyer", sessionId: "current-session" })
  for (const options of mockOptions) expect(options).toMatchObject({ permission: "purchases.orders.update", freshAuth: { maxAgeSeconds: 300 }, module: { moduleSlug: "purchasing", accessIntent: "write", mode: "enforce" } })
})
it.each([undefined, { claims: { tenantId: "foreign", userId: "current-buyer", sessionId: "x" } }, { claims: { tenantId: "current-org", userId: "foreign", sessionId: "x" } }])("rejects missing or mismatched assurance before a service write", async freshAuth => {
  mockContext.freshAuth = freshAuth
  await expect(issueSupplierPoInviteAction(issue)).rejects.toThrow("Current buyer authentication")
  await expect(reviewSupplierPoProposalAction(review)).rejects.toThrow("Current buyer authentication")
  await expect(revokeSupplierPoInviteAction(revoke)).rejects.toThrow("Current buyer authentication")
  expect(service.issueSupplierPoInvite).not.toHaveBeenCalled(); expect(service.reviewSupplierPoProposal).not.toHaveBeenCalled(); expect(service.revokeSupplierPoInvite).not.toHaveBeenCalled()
})
it("rejects client authority injection and missing evidence revisions", async () => {
  await expect(issueSupplierPoInviteAction({ ...issue, organizationId: "foreign" })).rejects.toThrow()
  await expect(reviewSupplierPoProposalAction({ ...review, expectedStateHash: undefined })).rejects.toThrow()
  await expect(revokeSupplierPoInviteAction({ ...revoke, sessionId: "forged" })).rejects.toThrow()
  expect(service.issueSupplierPoInvite).not.toHaveBeenCalled(); expect(service.reviewSupplierPoProposal).not.toHaveBeenCalled(); expect(service.revokeSupplierPoInvite).not.toHaveBeenCalled()
})
it("scopes bounded history reads to the current authenticated buyer without write assurance", async () => {
  mockContext.freshAuth = undefined
  await getSupplierPoAcknowledgementWorkbenchAction({ purchaseOrderId: "po", envelopeId: "env", beforeTokenId: "cursor" })
  expect(service.getSupplierPoAcknowledgementWorkbench).toHaveBeenCalledWith({ purchaseOrderId: "po", envelopeId: "env", beforeTokenId: "cursor", organizationId: "current-org", actorId: "current-buyer" })
  expect(mockOptions[0]).toMatchObject({ permission: "purchases.orders.read", module: { accessIntent: "read", mode: "enforce" } })
  await expect(getSupplierPoAcknowledgementWorkbenchAction({ purchaseOrderId: "po", beforeTokenId: "cursor" })).rejects.toThrow()
})
