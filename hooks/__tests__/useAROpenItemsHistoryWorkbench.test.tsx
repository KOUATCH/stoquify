/** @jest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAROpenItemsHistoryWorkbench } from "../useAROpenItemsHistoryWorkbench"
import { getAROpenItemsHistoryAction } from "@/actions/finance/ar-history.actions"

jest.mock("@/actions/finance/ar-history.actions", () => ({
  getAROpenItemsHistoryAction: jest.fn(),
  prepareAROpenItemsHistoryExportAction: jest.fn(),
}))
const mockReplace = jest.fn()
let mockParams = new URLSearchParams()
let mockAuth = { user: { id: "actor" }, organizationId: "org", isLoading: false }
let mockPermissions = { organizationId: "org", permissionState: "ready", permissions: ["finance.receivables.read"] }
jest.mock("next/navigation", () => ({
  usePathname: () => "/en/dashboard/finance/receivables/history",
  useSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace }),
}))
jest.mock("@/hooks/useClientAuth", () => ({ useClientAuth: () => mockAuth }))
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: () => mockPermissions }))

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
const response = (organizationId = "org") => ({ success: true, data: {
  scope: { organizationId, actorUserId: "actor" },
  items: [{ referenceId: "invoice-4", openAmount: "55226", evidenceGrade: "posted" }],
} })
beforeEach(() => {
  jest.clearAllMocks()
  mockAuth = { user: { id: "actor" }, organizationId: "org", isLoading: false }
  mockPermissions = { organizationId: "org", permissionState: "ready", permissions: ["finance.receivables.read"] }
  window.history.replaceState(null, "", "/en/dashboard/finance/receivables/history?customerId=customer-1&dateTo=2026-10-17&pageSize=25#evidence")
  mockParams = new URLSearchParams(window.location.search)
  ;(getAROpenItemsHistoryAction as jest.Mock).mockResolvedValue(response())
})

it("opens and closes retained details without a server navigation, refetch, or loading state", async () => {
  const client = new QueryClient()
  const view = renderHook(() => useAROpenItemsHistoryWorkbench(), { wrapper: wrapper(client) })
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1))
  const rows = view.result.current.result
  act(() => view.result.current.selectRow("invoice-4"))
  expect(mockReplace).not.toHaveBeenCalled()
  const url = new URL(window.location.href)
  expect(url.searchParams.get("selected")).toBe("invoice-4")
  expect(url.searchParams.get("customerId")).toBe("customer-1")
  expect(url.searchParams.get("dateTo")).toBe("2026-10-17")
  expect(url.searchParams.get("pageSize")).toBe("25")
  expect(url.hash).toBe("#evidence")
  // Simulate Next's native-history synchronization of useSearchParams.
  mockParams = new URLSearchParams(window.location.search)
  view.rerender()
  expect(view.result.current.selectedRowId).toBe("invoice-4")
  expect(view.result.current.result).toBe(rows)
  expect(view.result.current.isLoading).toBe(false)
  act(() => view.result.current.selectRow(null))
  mockParams = new URLSearchParams(window.location.search)
  view.rerender()
  expect(view.result.current.selectedRowId).toBeNull()
  expect(view.result.current.isLoading).toBe(false)
  expect(getAROpenItemsHistoryAction).toHaveBeenCalledTimes(1)
  view.unmount(); client.clear()
})

it("retains server navigation for date changes and clears the selected invoice", () => {
  const client = new QueryClient()
  mockParams.set("selected", "invoice-4")
  const view = renderHook(() => useAROpenItemsHistoryWorkbench(), { wrapper: wrapper(client) })
  act(() => view.result.current.updateFilters({ dateTo: "2026-10-16" }))
  const url = new URL(mockReplace.mock.calls[0][0], "http://localhost")
  expect(url.searchParams.get("dateTo")).toBe("2026-10-16")
  expect(url.searchParams.has("selected")).toBe(false)
  expect(mockReplace.mock.calls[0][1]).toEqual({ scroll: false })
  view.unmount(); client.clear()
})

it("hides retained details when permissions are revoked", async () => {
  const client = new QueryClient()
  const view = renderHook(() => useAROpenItemsHistoryWorkbench(), { wrapper: wrapper(client) })
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1))
  act(() => view.result.current.selectRow("invoice-4"))
  mockPermissions = { ...mockPermissions, permissions: [] }
  view.rerender()
  expect(view.result.current.rows).toEqual([])
  expect(view.result.current.result).toBeUndefined()
  expect(view.result.current.isError).toBe(true)
  view.unmount(); client.clear()
})

it("rejects data returned for another organization", async () => {
  ;(getAROpenItemsHistoryAction as jest.Mock).mockResolvedValue(response("other-org"))
  const client = new QueryClient()
  const view = renderHook(() => useAROpenItemsHistoryWorkbench(), { wrapper: wrapper(client) })
  await waitFor(() => expect(view.result.current.isError).toBe(true))
  expect(view.result.current.rows).toEqual([])
  expect(view.result.current.result).toBeUndefined()
  view.unmount(); client.clear()
})
