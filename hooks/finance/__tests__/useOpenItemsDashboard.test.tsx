/** @jest-environment jsdom */
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useOpenItemsDashboard } from "../useOpenItemsDashboard"
import { usePermissions } from "@/hooks/usePermissions"
import { useClientAuth } from "@/hooks/useClientAuth"
import { getOpenItemsDashboardAction } from "@/actions/finance/open-items-dashboard.actions"
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/hooks/useClientAuth", () => ({ useClientAuth: jest.fn() }))
jest.mock("@/actions/finance/open-items-dashboard.actions", () => ({ getOpenItemsDashboardAction: jest.fn() }))
const auth = { user: { id: "user1" }, organizationId: "org1", isLoading: false }
const access = { permissionState: "ready", permissions: ["finance.receivables.read"], organizationId: "org1" }
beforeEach(() => {
  jest.clearAllMocks()
  ;(useClientAuth as jest.Mock).mockReturnValue(auth)
  ;(usePermissions as jest.Mock).mockReturnValue(access)
})
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(() => useOpenItemsDashboard({ view: "receivables" }), { wrapper })
}
it("hides cached evidence immediately when permissions cannot be refreshed", async () => {
  ;(getOpenItemsDashboardAction as jest.Mock).mockResolvedValue({ success: true, data: { organization: { id: "org1" } } })
  const hook = setup()
  await waitFor(() => expect(hook.result.current.data).toBeDefined())
  ;(usePermissions as jest.Mock).mockReturnValue({ ...access, permissionState: "error" })
  hook.rerender()
  expect(hook.result.current.data).toBeUndefined()
  expect(hook.result.current.accessState).toBe("error")
})
it("never shows the previous organization's late response", async () => {
  let finish!: (value: unknown) => void
  ;(getOpenItemsDashboardAction as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve }))
  const hook = setup()
  ;(useClientAuth as jest.Mock).mockReturnValue({ ...auth, organizationId: "org2" })
  hook.rerender()
  await act(async () => finish({ success: true, data: { organization: { id: "org1" } } }))
  expect(hook.result.current.data).toBeUndefined()
  expect(hook.result.current.accessState).toBe("stale_session")
})
it("removes previously successful evidence after a failed refresh", async () => {
  ;(getOpenItemsDashboardAction as jest.Mock).mockResolvedValueOnce({ success: true, data: { organization: { id: "org1" } } }).mockResolvedValue({ success: false, error: "revoked" })
  const hook = setup()
  await waitFor(() => expect(hook.result.current.data).toBeDefined())
  await act(async () => { await hook.result.current.refetch() })
  await waitFor(() => expect(hook.result.current.isError).toBe(true))
  expect(hook.result.current.data).toBeUndefined()
})
it("distinguishes a purchasing module lock from a failed data read", async () => {
  ;(getOpenItemsDashboardAction as jest.Mock).mockResolvedValue({ success: false, reason: "locked_module", error: "Purchasing module is not available." })
  const hook = setup()
  await waitFor(() => expect(hook.result.current.accessState).toBe("locked_module"))
  expect(hook.result.current.data).toBeUndefined()
})
