import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { usePermissions } from "@/hooks/usePermissions"
import { runPaymentReconciliationAction } from "@/actions/payments/reconciliation.actions"
import { useRunPaymentReconciliation } from "../usePaymentReconciliationDashboard"

jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/actions/payments/reconciliation.actions", () => ({ runPaymentReconciliationAction: jest.fn() }))
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
const action = runPaymentReconciliationAction as jest.Mock
function access(org = "org-1", actor = "actor-1", ready = true, allowed = true) {
  jest.mocked(usePermissions).mockReturnValue({ organizationId: org, user: { id: actor }, permissionState: ready ? "ready" : "loading", hasPermission: () => allowed } as ReturnType<typeof usePermissions>)
}
function response(org = "org-1", actor = "actor-1") { return { success: true, data: { runId: "run-1", scope: { organizationId: org, actorId: actor } } } }
function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, gcTime: 0 } } })
  const invalidate = jest.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, invalidate, ...renderHook(() => useRunPaymentReconciliation(), { wrapper }) }
}
beforeEach(() => { jest.resetAllMocks(); access(); action.mockResolvedValue(response()) })
it("forwards the selected real period identity without inventing a daily date or bounds", async () => {
  const page = setup()
  await act(async () => { await page.result.current.mutateAsync({ providerAccountId: "account-1", accountingPeriodId: "period-1" }) })
  expect(action).toHaveBeenCalledWith({ providerAccountId: "account-1", accountingPeriodId: "period-1" })
  expect(page.invalidate).toHaveBeenCalled()
  page.unmount(); page.client.clear()
})
it.each([[false, true], [true, false]])("rejects unready or revoked run authority before the action (%s/%s)", async (ready, allowed) => {
  access("org-1", "actor-1", ready, allowed); const page = setup()
  await act(async () => { await expect(page.result.current.mutateAsync({ providerAccountId: "account-1", businessDate: "2026-09-01" })).rejects.toMatchObject({ code: "FORBIDDEN" }) })
  expect(action).not.toHaveBeenCalled(); expect(page.invalidate).not.toHaveBeenCalled()
  page.unmount(); page.client.clear()
})
it.each([response("foreign"), response("org-1", "foreign")])("rejects a response outside current server authority", async result => {
  action.mockResolvedValue(result); const page = setup()
  await act(async () => { await expect(page.result.current.mutateAsync({ providerAccountId: "account-1", accountingPeriodId: "period-1" })).rejects.toMatchObject({ code: "TENANT_SCOPE_VIOLATION" }) })
  expect(page.invalidate).not.toHaveBeenCalled(); page.unmount(); page.client.clear()
})
it.each(["actor", "organization", "permission", "unmount"])("suppresses late run invalidation after %s changes", async change => {
  let resolve!: (value: ReturnType<typeof response>) => void
  action.mockReturnValue(new Promise(done => { resolve = done }))
  const page = setup()
  const pending = page.result.current.mutateAsync({ providerAccountId: "account-1", accountingPeriodId: "period-1" }).catch(error => error)
  await waitFor(() => expect(action).toHaveBeenCalled())
  if (change === "unmount") page.unmount()
  else { access(change === "organization" ? "org-2" : "org-1", change === "actor" ? "actor-2" : "actor-1", true, change !== "permission"); page.rerender() }
  await act(async () => { resolve(response()); expect(await pending).toMatchObject({ code: "TENANT_SCOPE_VIOLATION" }) })
  expect(page.invalidate).not.toHaveBeenCalled()
  if (change !== "unmount") page.unmount()
  page.client.clear()
})
