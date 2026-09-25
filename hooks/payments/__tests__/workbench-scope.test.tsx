import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { usePaymentReconciliationWorkbench } from "../usePaymentReconciliationWorkbench"
import { usePermissions } from "@/hooks/usePermissions"
import { getPaymentReconciliationWorkbenchAction } from "@/actions/payments/reconciliation-workbench.actions"
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/actions/payments/reconciliation-workbench.actions", () => ({ getPaymentReconciliationWorkbenchAction: jest.fn() }))
const read = getPaymentReconciliationWorkbenchAction as jest.Mock
function access(org = "org-a", actor = "actor-a", state = "ready", permitted = true) {
  jest.mocked(usePermissions).mockReturnValue({ organizationId: org, user: { id: actor }, permissionState: state, hasPermission: () => permitted } as ReturnType<typeof usePermissions>)
}
function data(org = "org-a", actor = "actor-a") { return { scope: { organizationId: org, actorId: actor }, organization: { id: org, name: "PRIVATE " + org }, payments: [] } }
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, ...renderHook(() => usePaymentReconciliationWorkbench({ period: "mtd" }), { wrapper }) }
}
beforeEach(() => { jest.resetAllMocks(); access(); read.mockResolvedValue({ success: true, data: data() }) })
it("does not fetch or show payment data before permission identity is ready", () => {
  access("org-a", "actor-a", "loading"); const page = setup()
  expect(read).not.toHaveBeenCalled(); expect(page.result.current.data).toBeUndefined()
  page.unmount(); page.client.clear()
})
it.each([["org-b", "actor-b"], ["org-a", "actor-b"]])("does not reuse cached data after scope changes to %s/%s", async (org, actor) => {
  const page = setup(); await waitFor(() => expect(page.result.current.isSuccess).toBe(true))
  access(org, actor); read.mockReturnValue(new Promise(() => {})); page.rerender()
  expect(page.result.current.data).toBeUndefined()
  page.unmount(); page.client.clear()
})
it.each(["organization", "actor"])("rejects a response with mismatched %s", async field => {
  read.mockResolvedValue({ success: true, data: data(field === "organization" ? "foreign" : "org-a", field === "actor" ? "foreign" : "actor-a") })
  const page = setup(); await waitFor(() => expect(page.result.current.isError).toBe(true))
  expect(page.result.current.data).toBeUndefined(); page.unmount(); page.client.clear()
})
it("withholds already cached payment data after read permission is revoked", async () => {
  const page = setup(); await waitFor(() => expect(page.result.current.isSuccess).toBe(true))
  access("org-a", "actor-a", "ready", false); page.rerender()
  expect(page.result.current.data).toBeUndefined()
  page.unmount(); page.client.clear()
})
it("keeps a previously authorized same-scope view visibly refreshing without fetching again", async () => {
  const page = setup(); await waitFor(() => expect(page.result.current.isSuccess).toBe(true))
  access("org-a", "actor-a", "loading"); page.rerender()
  expect(page.result.current.data?.organization.id).toBe("org-a"); expect(page.result.current.isFetching).toBe(true)
  expect(read).toHaveBeenCalledTimes(1)
  access("org-a", "actor-a", "ready", false); page.rerender(); expect(page.result.current.data).toBeUndefined()
  access("org-a", "actor-a", "loading"); page.rerender(); expect(page.result.current.data).toBeUndefined()
  page.unmount(); page.client.clear()
})
it("rejects forced refresh when authority is not ready", async () => {
  access("org-a", "actor-a", "loading"); const page = setup()
  await page.result.current.refetch()
  expect(read).not.toHaveBeenCalled(); page.unmount(); page.client.clear()
})
