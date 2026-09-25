import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import { getPOSLocationsAction } from "@/actions/pos/catalog.actions"
import { usePOSLocations } from "../usePosOperations"

jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/actions/pos/catalog.actions", () => ({ getPOSLocationsAction: jest.fn(), getPOSTerminalsAction: jest.fn(), getPOSCatalogAction: jest.fn(), getPOSCustomersAction: jest.fn() }))
jest.mock("@/actions/pos/cart.actions", () => ({}))
jest.mock("@/actions/pos/session.actions", () => ({}))
jest.mock("@/actions/pos/tender.actions", () => ({}))
jest.mock("@/actions/pos/commit-recovery.actions", () => ({}))
jest.mock("@/actions/pos/receipt-token.actions", () => ({}))

const read = getPOSLocationsAction as jest.Mock
function authority(actorId = "actor-a", organizationId = "org-a", permissionState = "ready", allowed = true) {
  ;(usePermissions as jest.Mock).mockReturnValue({ user: { id: actorId }, organizationId, permissionState, hasPermission: () => allowed })
}
const resultFor = (actorId = "actor-a", organizationId = "org-a") => ({ success: true, data: [{ id: "private-location" }], error: null, scope: { actorId, organizationId } })
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, ...renderHook(() => usePOSLocations(), { wrapper: Wrapper }) }
}
describe("POS current read scope", () => {
  beforeEach(() => { jest.resetAllMocks(); authority() })
  it("does not turn a failed read into successful empty-capable data", async () => {
    read.mockResolvedValue({ success: false, data: null, error: "Database unavailable" })
    const { result } = setup()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
  it("rejects a response for another actor or tenant", async () => {
    read.mockResolvedValue(resultFor("actor-b", "org-b"))
    const { result } = setup()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
  it("does not reuse private locations after actor/tenant switch", async () => {
    read.mockResolvedValueOnce(resultFor()).mockImplementation(() => new Promise(() => {}))
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.data).toBeDefined())
    authority("actor-b", "org-b"); rerender()
    expect(result.current.data).toBeUndefined()
  })
  it("withholds denied data and prevents an explicit unauthorized refetch", async () => {
    authority("actor-a", "org-a", "ready", false); read.mockResolvedValue(resultFor())
    const { result } = setup()
    await act(async () => { await result.current.refetch() })
    expect(read).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })
  it("hides an already loaded cache when permission is revoked and refreshes authority on recovery", async () => {
    read.mockResolvedValue(resultFor())
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.data).toBeDefined())
    const refreshPermissions = jest.fn().mockResolvedValue(undefined)
    ;(usePermissions as jest.Mock).mockReturnValue({ user: { id: "actor-a" }, organizationId: "org-a", permissionState: "ready", hasPermission: () => false, refreshPermissions })
    rerender()
    expect(result.current.readState).toBe("denied")
    expect(result.current.isError).toBe(true)
    expect(result.current.data).toBeUndefined()
    await act(async () => { await result.current.retryRead() })
    expect(refreshPermissions).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledTimes(1)
  })
})
