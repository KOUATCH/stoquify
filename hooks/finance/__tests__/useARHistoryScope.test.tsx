/** @jest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAROpenItemsHistoryWorkbench } from "@/hooks/useAROpenItemsHistoryWorkbench"
import { useClientAuth } from "@/hooks/useClientAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { getAROpenItemsHistoryAction, prepareAROpenItemsHistoryExportAction } from "@/actions/finance/ar-history.actions"
jest.mock("@/hooks/useClientAuth", () => ({ useClientAuth: jest.fn() }))
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/actions/finance/ar-history.actions", () => ({ getAROpenItemsHistoryAction: jest.fn(), prepareAROpenItemsHistoryExportAction: jest.fn() }))
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn() }), usePathname: () => "/en/dashboard/finance/receivables/history", useSearchParams: () => new URLSearchParams("customerId=c&selected=invoice") }))
const permissions = { organizationId: "org", permissions: ["finance.receivables.read", "reports.export"], permissionState: "ready" }
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(() => useAROpenItemsHistoryWorkbench(), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
}
beforeEach(() => {
  jest.resetAllMocks()
  ;(useClientAuth as jest.Mock).mockReturnValue({ user: { id: "actor" }, organizationId: "org", isLoading: false })
  ;(usePermissions as jest.Mock).mockReturnValue(permissions)
  ;(getAROpenItemsHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: { items: [{ referenceId: "invoice" }], scope: { organizationId: "org", actorUserId: "actor" } } })
  URL.createObjectURL = jest.fn()
})
it("passes customer scope and removes cached financial results after permission loss", async () => {
  const { result, rerender } = setup()
  await waitFor(() => expect(result.current.rows).toHaveLength(1))
  expect(getAROpenItemsHistoryAction).toHaveBeenCalledWith({ filters: { customerId: "c" } })
  ;(usePermissions as jest.Mock).mockReturnValue({ ...permissions, permissions: [] })
  rerender()
  expect(result.current.rows).toEqual([])
  expect(result.current.result).toBeUndefined()
  expect(result.current.canExport).toBe(false)
})
it("rejects an identity-mismatched read response", async () => {
  ;(getAROpenItemsHistoryAction as jest.Mock).mockResolvedValue({ success: true, data: { items: [{}], scope: { organizationId: "other", actorUserId: "actor" } } })
  const { result } = setup()
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.rows).toEqual([])
})
it.each(["workspace", "unmount"])("does not download a late export after %s changes", async change => {
  let finish!: (value: unknown) => void
  ;(prepareAROpenItemsHistoryExportAction as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const { result, rerender, unmount } = setup()
  await waitFor(() => expect(result.current.rows).toHaveLength(1))
  act(() => result.current.exportHistory())
  await waitFor(() => expect(prepareAROpenItemsHistoryExportAction).toHaveBeenCalledTimes(1))
  if (change === "unmount") unmount()
  else { (usePermissions as jest.Mock).mockReturnValue({ ...permissions, organizationId: "other" }); rerender() }
  await act(async () => finish({ success: true, data: { content: "private", fileName: "ar.csv", mimeType: "text/csv", scope: { organizationId: "org", actorUserId: "actor" } } }))
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})
