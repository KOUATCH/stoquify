import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import { getCashDrawerDashboardAction } from "@/actions/pos/drawer-dashboard.actions"
import { useCashDrawerDashboard } from "../useDrawerDashboard"

jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/actions/pos/drawer-dashboard.actions", () => ({ getCashDrawerDashboardAction: jest.fn() }))
const read = getCashDrawerDashboardAction as jest.Mock
function authority(actorId = "actor-a", organizationId = "org-a", allowed = true) {
  ;(usePermissions as jest.Mock).mockReturnValue({ user: { id: actorId }, organizationId, permissionState: "ready", hasPermission: (permission: string) => allowed && permission === "finance.read", refreshPermissions: jest.fn() })
}
const response = { success: true, data: { privateTotal: 500 }, scope: { actorId: "actor-a", organizationId: "org-a" } }
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(() => useCashDrawerDashboard({ period: "today" }), { wrapper: Wrapper })
}
describe("cash drawer report scope", () => {
  beforeEach(() => { jest.resetAllMocks(); authority(); read.mockResolvedValue(response) })
  it("loads for the existing finance.read alternative permission", async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.data).toEqual(response))
  })
  it("hides the previous cashier and organization's report immediately on scope change", async () => {
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.data).toBeDefined())
    read.mockImplementation(() => new Promise(() => {}))
    authority("actor-b", "org-b"); rerender()
    expect(result.current.data).toBeUndefined()
  })
  it("hides cached financial data after permission revocation and blocks explicit refetch", async () => {
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.data).toBeDefined())
    authority("actor-a", "org-a", false); rerender()
    expect(result.current.data).toBeUndefined()
    await act(async () => { await result.current.refetch() })
    expect(read).toHaveBeenCalledTimes(1)
  })
  it("rejects a server response scoped to another cashier", async () => {
    read.mockResolvedValue({ ...response, scope: { ...response.scope, actorId: "actor-b" } })
    const { result } = setup()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
