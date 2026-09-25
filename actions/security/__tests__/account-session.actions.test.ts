import { requireSession } from "@/lib/security/auth-session"
import { getAccountSessionPreview, revokeReviewedAccountSessions } from "@/services/security/account-session.service"
import { getAccountSessionPreviewAction, revokeReviewedAccountSessionsAction } from "../account-session.actions"
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/security/account-session.service", () => ({ getAccountSessionPreview: jest.fn(), revokeReviewedAccountSessions: jest.fn() }))
jest.mock("@/actions/_shared/safe-action-responses", () => ({ safeSuccessActionErrorResult: (error: any) => ({ success: false, code: error.code ?? "INTERNAL_ERROR" }) }))
beforeEach(() => { jest.resetAllMocks(); (requireSession as jest.Mock).mockResolvedValue({ ctx: { userId: "own", orgId: "own-org" }, claims: { sessionId: "current", sessionToken: "server-token" } }) })
it("uses only server-derived scope for preview and mutation", async () => {
  const command = { requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: "a".repeat(64) }
  await getAccountSessionPreviewAction(); await revokeReviewedAccountSessionsAction(command)
  const scope = { actorId: "own", organizationId: "own-org", sessionId: "current", sessionToken: "server-token" }
  expect(getAccountSessionPreview).toHaveBeenCalledWith(scope); expect(revokeReviewedAccountSessions).toHaveBeenCalledWith(scope, command)
})
it("does not enter the service without a verified current session", async () => {
  ;(requireSession as jest.Mock).mockRejectedValue({ code: "UNAUTHENTICATED" })
  expect(await getAccountSessionPreviewAction()).toMatchObject({ success: false })
  expect(getAccountSessionPreview).not.toHaveBeenCalled()
})
it("returns a failed result when authoritative revocation fails", async () => {
  ;(revokeReviewedAccountSessions as jest.Mock).mockRejectedValue({ code: "CONFLICT" })
  expect(await revokeReviewedAccountSessionsAction({ requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: "a".repeat(64) })).toMatchObject({ success: false, code: "CONFLICT" })
})
