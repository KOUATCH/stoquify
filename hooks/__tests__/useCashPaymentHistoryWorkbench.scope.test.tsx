import type { ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { getCashPaymentHistoryAction, prepareCashPaymentHistoryExportAction } from "@/actions/pos/cash-payment-history.actions"
import { useCashPaymentHistoryWorkbench } from "../useCashPaymentHistoryWorkbench"

jest.mock("@/actions/pos/cash-payment-history.actions", () => ({
  getCashPaymentHistoryAction: jest.fn(),
  prepareCashPaymentHistoryExportAction: jest.fn(),
}))
let mockParams = new URLSearchParams()
const mockReplace = jest.fn()
let mockAccess = { user: { id: "actor-a" }, organizationId: "org-a", permissionState: "ready", permissions: ["finance.read", "reports.export"] }
jest.mock("next/navigation", () => ({
  usePathname: () => "/en/dashboard/finance/cash-payment-history",
  useSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace }),
}))
jest.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    ...mockAccess,
    hasAnyPermission: (permissions: string[]) => permissions.some(permission => mockAccess.permissions.includes(permission)),
  }),
}))
const response = (organizationId = "org-a", actorUserId = "actor-a") => ({
  success: true,
  data: { scope: { organizationId, actorUserId }, rows: [{ id: `${organizationId}:${actorUserId}` }], summary: { transactionCount: 1 }, pageInfo: { hasMore: false, nextCursor: null } },
})
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => useCashPaymentHistoryWorkbench(), { wrapper }), client }
}
beforeEach(() => {
  jest.resetAllMocks()
  mockParams = new URLSearchParams()
  mockAccess = { user: { id: "actor-a" }, organizationId: "org-a", permissionState: "ready", permissions: ["finance.read", "reports.export"] }
  ;(getCashPaymentHistoryAction as jest.Mock).mockResolvedValue(response())
})

it.each(["organization", "actor"])("does not display cached rows after the %s changes", async change => {
  const view = mount()
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1))
  ;(getCashPaymentHistoryAction as jest.Mock).mockReturnValue(new Promise(() => {}))
  if (change === "organization") mockAccess.organizationId = "org-b"
  else mockAccess.user = { id: "actor-b" }
  view.rerender()
  expect(view.result.current.rows).toEqual([])
  expect(view.result.current.result).toBeUndefined()
  view.unmount(); view.client.clear()
})

it("hides rows during permission refresh and after read authority is revoked", async () => {
  const view = mount()
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1))
  mockAccess.permissionState = "loading"
  view.rerender()
  expect(view.result.current.rows).toEqual([])
  mockAccess.permissionState = "ready"
  mockAccess.permissions = []
  view.rerender()
  expect(view.result.current.rows).toEqual([])
  expect(getCashPaymentHistoryAction).toHaveBeenCalledTimes(1)
  view.unmount(); view.client.clear()
})

it("does not reuse manager results after authority changes to cashier-only", async () => {
  const view = mount()
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1))
  mockAccess.permissions = ["pos.read"]
  ;(getCashPaymentHistoryAction as jest.Mock).mockReturnValue(new Promise(() => {}))
  view.rerender()
  expect(view.result.current.rows).toEqual([])
  view.unmount(); view.client.clear()
})

it("rejects server data for another organization without retries", async () => {
  ;(getCashPaymentHistoryAction as jest.Mock).mockResolvedValue(response("org-b"))
  const view = mount()
  await waitFor(() => expect(view.result.current.isError).toBe(true))
  expect(view.result.current.rows).toEqual([])
  expect(getCashPaymentHistoryAction).toHaveBeenCalledTimes(1)
  view.unmount(); view.client.clear()
})

it("does not show the previous filter's rows while the next filter is loading", async () => {
  const view = mount()
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1))
  ;(getCashPaymentHistoryAction as jest.Mock).mockReturnValue(new Promise(() => {}))
  mockParams = new URLSearchParams("lane=payment")
  view.rerender()
  expect(view.result.current.rows).toEqual([])
  view.unmount(); view.client.clear()
})

it("does not show a late export result in a different organization", async () => {
  let complete!: (value: unknown) => void
  ;(prepareCashPaymentHistoryExportAction as jest.Mock).mockImplementation(() => new Promise(resolve => { complete = resolve }))
  const view = mount()
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1))
  act(() => view.result.current.exportHistory())
  await waitFor(() => expect(prepareCashPaymentHistoryExportAction).toHaveBeenCalledTimes(1))
  mockAccess.organizationId = "org-b"
  ;(getCashPaymentHistoryAction as jest.Mock).mockReturnValue(new Promise(() => {}))
  view.rerender()
  await act(async () => complete({ success: true, data: { decision: { allowed: true } } }))
  expect(view.result.current.exportStatus).toBeNull()
  view.unmount(); view.client.clear()
})

it("keeps row selection out of the query and blocks export without its permission", async () => {
  mockAccess.permissions = ["finance.read"]
  const view = mount()
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1))
  act(() => view.result.current.selectRow("cash:1"))
  expect(mockReplace).toHaveBeenCalledWith("/en/dashboard/finance/cash-payment-history?selected=cash%3A1", { scroll: false })
  mockParams = new URLSearchParams("selected=cash%3A1")
  view.rerender()
  expect(getCashPaymentHistoryAction).toHaveBeenCalledTimes(1)
  act(() => view.result.current.exportHistory())
  expect(prepareCashPaymentHistoryExportAction).not.toHaveBeenCalled()
  view.unmount(); view.client.clear()
})
