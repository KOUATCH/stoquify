import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { useSelfProfile } from "../useSelfProfile"
import { getSelfProfileAction, updateSelfProfileAction } from "@/actions/users/self-profile.actions"
jest.mock("@/actions/users/self-profile.actions", () => ({ getSelfProfileAction: jest.fn(), updateSelfProfileAction: jest.fn() }))
const command = { requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: "a".repeat(64), fields: { firstName: "Alex", lastName: "", jobTitle: "" } }
beforeEach(() => jest.resetAllMocks())
function subject() { const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); return renderHook(() => useSelfProfile("org", "actor"), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }) }
it.each([{ organizationId: "foreign", actorId: "actor" }, { organizationId: "org", actorId: "foreign" }])("rejects mismatched read scope", async data => {
  ;(getSelfProfileAction as jest.Mock).mockResolvedValue({ success: true, data }); const hook = subject(); await waitFor(() => expect(hook.result.current.query.isError).toBe(true))
  expect(hook.result.current.query.data).toBeUndefined(); expect(hook.result.current.query.error).toMatchObject({ code: "FORBIDDEN" })
})
it("does not automatically repeat an uncertain save", async () => {
  ;(getSelfProfileAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor" } }); (updateSelfProfileAction as jest.Mock).mockResolvedValue({ success: false, code: "INTERNAL_ERROR" })
  const hook = subject(); await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
  await expect(hook.result.current.mutation.mutateAsync(command)).rejects.toMatchObject({ code: "INTERNAL_ERROR" }); expect(updateSelfProfileAction).toHaveBeenCalledTimes(1)
})
it("rejects a receipt for another request", async () => {
  ;(getSelfProfileAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor" } }); (updateSelfProfileAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor", requestId: "other" } })
  const hook = subject(); await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
  await expect(hook.result.current.mutation.mutateAsync(command)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
