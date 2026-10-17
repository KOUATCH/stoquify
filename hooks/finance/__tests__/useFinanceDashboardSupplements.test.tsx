/** @jest-environment jsdom */
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useReceivablesCollections, usePayablesWorkflow } from "../useFinanceDashboardSupplements"
import { usePermissions } from "@/hooks/usePermissions"
import { useClientAuth } from "@/hooks/useClientAuth"
import { getReceivablesCollectionsAction, getPayablesWorkflowDashboardAction } from "@/actions/finance/open-items-dashboard.actions"
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn() }))
jest.mock("@/hooks/useClientAuth", () => ({ useClientAuth: jest.fn() }))
jest.mock("@/actions/finance/open-items-dashboard.actions", () => ({ getReceivablesCollectionsAction: jest.fn(), getPayablesWorkflowDashboardAction: jest.fn() }))
const access = { permissionState: "ready", permissions: ["finance.read"], organizationId: "org1" }
const identity = { userId: "actor", organizationId: "org1", permissionKey: "finance.read", enabled: true }
beforeEach(() => {
  jest.clearAllMocks()
  ;(useClientAuth as jest.Mock).mockReturnValue({ user: { id: "actor" }, organizationId: "org1", isLoading: false })
  ;(usePermissions as jest.Mock).mockReturnValue(access)
})
function wrapper({ children }: { children: React.ReactNode }) { const [client] = require("react").useState(() => new QueryClient()); return <QueryClientProvider client={client}>{children}</QueryClientProvider> }
it("does not reveal a late receipt result after permission refresh fails", async () => {
  let finish!: (data: unknown) => void
  ;(getReceivablesCollectionsAction as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve }))
  const hook = renderHook(({ enabled }) => useReceivablesCollections("org1", { start: "2026-10-01", end: "2026-10-12" }, { ...identity, enabled }), { wrapper, initialProps: { enabled: true } })
  hook.rerender({ enabled: false })
  await act(async () => finish({ success: true, data: { organizationId: "org1", state: "ready", report: { net: "100" } } }))
  expect(hook.result.current.data).toBeUndefined()
})
it("rejects a workflow response belonging to another organization", async () => {
  ;(getPayablesWorkflowDashboardAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "foreign", state: "ready" } })
  const hook = renderHook(() => usePayablesWorkflow("org1", identity), { wrapper })
  await waitFor(() => expect(hook.result.current.isError).toBe(true))
  expect(hook.result.current.data).toBeUndefined()
})
it("shares the parent identity without starting another permission/session subscription", async () => {
  ;(getPayablesWorkflowDashboardAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org1", state: "restricted" } })
  const hook = renderHook(() => usePayablesWorkflow("org1", identity), { wrapper })
  await waitFor(() => expect(hook.result.current.data).toBeDefined())
  expect(usePermissions).not.toHaveBeenCalled()
  expect(useClientAuth).not.toHaveBeenCalled()
})

it("hides previously successful workflow counts when a refresh fails", async () => {
  ;(getPayablesWorkflowDashboardAction as jest.Mock).mockResolvedValueOnce({ success: true, data: { organizationId: "org1", state: "ready", report: { awaitingApproval: 9 } } }).mockResolvedValueOnce({ success: false, error: "Read unavailable" })
  const hook = renderHook(() => usePayablesWorkflow("org1", identity), { wrapper })
  await waitFor(() => expect(hook.result.current.data).toBeDefined())
  await act(async () => { await hook.result.current.refetch() })
  await waitFor(() => expect(hook.result.current.isError).toBe(true))
  expect(hook.result.current.data).toBeUndefined()
})

it.each([
  { ...identity, userId: "another-actor" },
  { ...identity, organizationId: "another-workspace" },
  { ...identity, permissionKey: "reduced-permissions" },
])("does not reuse prior counts after identity changes to %j", async nextIdentity => {
  ;(getPayablesWorkflowDashboardAction as jest.Mock).mockResolvedValueOnce({ success: true, data: { organizationId: "org1", state: "ready", report: { awaitingApproval: 9 } } }).mockImplementation(() => new Promise(() => {}))
  const hook = renderHook(({ actor }) => usePayablesWorkflow(actor.organizationId, actor), { wrapper, initialProps: { actor: identity } })
  await waitFor(() => expect(hook.result.current.data).toBeDefined())
  hook.rerender({ actor: nextIdentity })
  expect(hook.result.current.data).toBeUndefined()
})

it("keeps the successful receipt request available when the separate workflow request fails", async () => {
  ;(getReceivablesCollectionsAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org1", state: "ready", report: { net: "100" } } })
  ;(getPayablesWorkflowDashboardAction as jest.Mock).mockResolvedValue({ success: false, error: "Workflow unavailable" })
  const hook = renderHook(() => ({ receipts: useReceivablesCollections("org1", { start: "2026-10-01", end: "2026-10-12" }, identity), workflow: usePayablesWorkflow("org1", identity) }), { wrapper })
  await waitFor(() => expect(hook.result.current.workflow.isError).toBe(true))
  expect(hook.result.current.receipts.data).toMatchObject({ state: "ready", report: { net: "100" } })
})
