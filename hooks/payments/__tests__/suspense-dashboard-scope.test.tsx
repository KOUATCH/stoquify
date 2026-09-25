import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { usePaymentReconciliationDashboard, paymentReconciliationDashboardKeys } from "../usePaymentReconciliationDashboard"
import { usePermissions } from "@/hooks/usePermissions"
import { getPaymentReconciliationDashboardAction } from "@/actions/payments/reconciliation.actions"

jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/actions/payments/reconciliation.actions", () => ({ getPaymentReconciliationDashboardAction: jest.fn() }))
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
const scope = { organizationId: "org-1", actorId: "actor-1" }
function access(organizationId = scope.organizationId) {
  jest.mocked(usePermissions).mockReturnValue({ organizationId, user: { id: scope.actorId }, permissionState: "ready" } as ReturnType<typeof usePermissions>)
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, ...renderHook(() => usePaymentReconciliationDashboard(), { wrapper }) }
}
beforeEach(() => { jest.clearAllMocks(); access() })
it("keys private dashboard data by both current organization and actor", async () => {
  jest.mocked(getPaymentReconciliationDashboardAction).mockResolvedValue({ success: true, data: { scope, suspenseQueue: [] } } as Awaited<ReturnType<typeof getPaymentReconciliationDashboardAction>>)
  const page = setup()
  await waitFor(() => expect(page.result.current.isSuccess).toBe(true))
  expect(page.client.getQueryData([...paymentReconciliationDashboardKeys.dashboard(), scope.organizationId, scope.actorId])).toEqual({ scope, suspenseQueue: [] })
  access("org-2"); page.rerender()
  expect(page.result.current.data).toBeUndefined()
  await waitFor(() => expect(page.result.current.isError).toBe(true))
  expect(page.result.current.data).toBeUndefined()
  page.unmount(); page.client.clear()
})
it.each([{ organizationId: "foreign", actorId: scope.actorId }, { organizationId: scope.organizationId, actorId: "foreign" }])("rejects server data with mismatched scope %p", received => {
  jest.mocked(getPaymentReconciliationDashboardAction).mockResolvedValue({ success: true, data: { scope: received } } as Awaited<ReturnType<typeof getPaymentReconciliationDashboardAction>>)
  const page = setup()
  return waitFor(() => expect(page.result.current.isError).toBe(true)).then(() => { expect(page.result.current.data).toBeUndefined(); page.unmount(); page.client.clear() })
})
it("does not fetch private recovery data before current permission identity is available", () => {
  jest.mocked(usePermissions).mockReturnValue({ permissionState: "loading" } as ReturnType<typeof usePermissions>)
  const page = setup()
  expect(getPaymentReconciliationDashboardAction).not.toHaveBeenCalled()
  expect(page.result.current.data).toBeUndefined()
  page.unmount(); page.client.clear()
})
