import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { useAccountSessions } from "../useAccountSessions"
import { getAccountSessionPreviewAction, revokeReviewedAccountSessionsAction } from "@/actions/security/account-session.actions"
jest.mock("@/actions/security/account-session.actions", () => ({ getAccountSessionPreviewAction: jest.fn(), revokeReviewedAccountSessionsAction: jest.fn() }))
const command = { requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: "a".repeat(64) }
beforeEach(() => jest.resetAllMocks())
function subject() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return renderHook(() => useAccountSessions("org", "actor", "current"), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
}
it.each([{ organizationId: "foreign", actorId: "actor", sessionId: "current" }, { organizationId: "org", actorId: "foreign", sessionId: "current" }, { organizationId: "org", actorId: "actor", sessionId: "different" }])("rejects mismatched preview scope %j", async data => {
  ;(getAccountSessionPreviewAction as jest.Mock).mockResolvedValue({ success: true, data })
  const hook = subject(); await waitFor(() => expect(hook.result.current.query.isError).toBe(true))
  expect(hook.result.current.query.data).toBeUndefined(); expect(hook.result.current.query.error).toMatchObject({ code: "FORBIDDEN" })
})
it("does not automatically repeat an uncertain destructive request", async () => {
  ;(getAccountSessionPreviewAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor", sessionId: "current" } })
  ;(revokeReviewedAccountSessionsAction as jest.Mock).mockResolvedValue({ success: false, code: "INTERNAL_ERROR" })
  const hook = subject(); await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
  await expect(hook.result.current.mutation.mutateAsync(command)).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
  expect(revokeReviewedAccountSessionsAction).toHaveBeenCalledTimes(1)
})
it("does not display a receipt belonging to another command", async () => {
  ;(getAccountSessionPreviewAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor", sessionId: "current" } })
  ;(revokeReviewedAccountSessionsAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor", requestId: "other" } })
  const hook = subject(); await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
  await expect(hook.result.current.mutation.mutateAsync(command)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
