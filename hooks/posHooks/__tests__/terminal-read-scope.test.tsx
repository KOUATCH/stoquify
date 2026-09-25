import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import { getTerminalManagementData } from "@/actions/pos/terminal-management.actions"
import { useTerminalManagementData } from "../useTerminalManagement"
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/actions/pos/terminal-management.actions", () => ({ getTerminalManagementData: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: jest.fn() }))
const read = getTerminalManagementData as jest.Mock
const refreshPermissions = jest.fn()
function authority(actor = "a", allowed = true) { (usePermissions as jest.Mock).mockReturnValue({ user: { id: actor }, organizationId: "org", permissionState: "ready", hasPermission: () => allowed, refreshPermissions }) }
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(() => useTerminalManagementData("org"), { wrapper })
}
const response = { success: true, data: { terminals: [{ id: "private" }], locations: [] }, error: null, scope: { actorId: "a", organizationId: "org" } }
beforeEach(() => { jest.resetAllMocks(); authority(); read.mockResolvedValue(response) })
it("unwraps only current scoped read data and hides it on actor change", async () => {
  const { result, rerender } = setup(); await waitFor(() => expect(result.current.data).toEqual(response.data))
  read.mockImplementation(() => new Promise(() => {})); authority("b"); rerender(); expect(result.current.data).toBeUndefined()
})
it("withholds cached data after revocation and denies forced refetch", async () => {
  const { result, rerender } = setup(); await waitFor(() => expect(result.current.data).toBeDefined())
  authority("a", false); rerender(); expect(result.current.data).toBeUndefined()
  await act(async () => { await result.current.refetch() }); expect(read).toHaveBeenCalledTimes(1)
  expect(refreshPermissions).toHaveBeenCalledTimes(1)
})
it("does not use another tenant's response or a failed read as review data", async () => {
  read.mockResolvedValue({ ...response, scope: { actorId: "a", organizationId: "different" } })
  const { result } = setup(); await waitFor(() => expect(result.current.isError).toBe(true)); expect(result.current.data).toBeUndefined()
  read.mockResolvedValue({ success: false, data: null, error: "unavailable" })
  await act(async () => { await result.current.refetch() }); expect(result.current.isError).toBe(true); expect(result.current.data).toBeUndefined()
})
