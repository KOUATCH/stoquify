import { requireSession } from "@/lib/security/auth-session"
import { getSelfProfile, updateSelfProfile } from "@/services/users/self-profile.service"
import { getSelfProfileAction, updateSelfProfileAction } from "../self-profile.actions"
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/users/self-profile.service", () => ({ getSelfProfile: jest.fn(), updateSelfProfile: jest.fn() }))
jest.mock("@/actions/_shared/safe-action-responses", () => ({ safeSuccessActionErrorResult: (error: any) => ({ success: false, code: error.code ?? "INTERNAL_ERROR" }) }))
const command = { requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: "a".repeat(64), fields: { firstName: "Alex", lastName: "", jobTitle: "" } }
beforeEach(() => { jest.resetAllMocks(); (requireSession as jest.Mock).mockResolvedValue({ ctx: { userId: "own", orgId: "own-org" }, claims: { sessionId: "current", sessionToken: "server-token" } }) })
it("derives scope only from the verified server session", async () => {
  await getSelfProfileAction(); await updateSelfProfileAction(command)
  const scope = { actorId: "own", organizationId: "own-org", sessionId: "current", sessionToken: "server-token" }
  expect(getSelfProfile).toHaveBeenCalledWith(scope); expect(updateSelfProfile).toHaveBeenCalledWith(scope, command)
})
it("does not enter the service without a current verified session", async () => {
  ;(requireSession as jest.Mock).mockRejectedValue({ code: "UNAUTHENTICATED" })
  expect(await getSelfProfileAction()).toMatchObject({ success: false })
  expect(await updateSelfProfileAction(command)).toMatchObject({ success: false })
  expect(getSelfProfile).not.toHaveBeenCalled(); expect(updateSelfProfile).not.toHaveBeenCalled()
})
it("keeps service failure distinct from success", async () => {
  ;(updateSelfProfile as jest.Mock).mockRejectedValue({ code: "CONFLICT" })
  expect(await updateSelfProfileAction(command)).toMatchObject({ success: false, code: "CONFLICT" })
})
