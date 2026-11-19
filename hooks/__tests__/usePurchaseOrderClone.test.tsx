import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { usePurchaseOrderClone } from "../usePurchaseOrderClone"
import { clonePurchaseOrder } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { notify } from "@/lib/notifications/notify"
const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, refresh: mockRefresh }) }))
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("@/i18n/routing", () => ({ localizePath: (path: string, locale: string) => `/${locale}${path}` }))
jest.mock("@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction", () => ({ clonePurchaseOrder: jest.fn() }))
jest.mock("@/lib/notifications/notify", () => ({ notify: { success: jest.fn() } }))
const action = clonePurchaseOrder as jest.Mock
const input = { id: "source-1", organizationId: "org-1", actorId: "actor-1", locale: "fr" as const, allowed: true }
function show(overrides = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidation = jest.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => usePurchaseOrderClone({ ...input, ...overrides }), { wrapper }), invalidation }
}
beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear() })
describe("real purchase order clone controller", () => {
  it("does not call the action for a denied current capability", async () => {
    const { result } = show({ allowed: false })
    await act(async () => { await result.current.clone() })
    expect(action).not.toHaveBeenCalled()
    expect(result.current.failure).toBe("denied")
  })
  it.each([true, false])("opens the actual returned draft with edit authority %s", async (canEdit) => {
    action.mockResolvedValue({ success: true, data: { id: "new-draft", status: "DRAFT" }, canEdit })
    const { result, invalidation } = show()
    await act(async () => { await result.current.clone() })
    expect(action).toHaveBeenCalledWith({ id: "source-1", organizationId: "org-1", requestId: expect.any(String) })
    expect(mockPush).toHaveBeenCalledWith(`/fr/dashboard/purchase-orders/new-draft${canEdit ? "/edit" : ""}`)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(notify.success).toHaveBeenCalledTimes(1)
    expect(invalidation).toHaveBeenCalledWith({ queryKey: ["purchase-orders", "summary", "org-1"] })
  })
  it("shares one pending request and ignores concurrent triggers", async () => {
    let resolve!: (value: unknown) => void
    action.mockImplementation(() => new Promise(done => { resolve = done }))
    const { result } = show()
    let first!: Promise<void>
    await act(async () => { first = result.current.clone(); await result.current.clone() })
    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.pending).toBe(true)
    await act(async () => { resolve({ success: true, data: { id: "new-draft", status: "DRAFT" }, canEdit: true }); await first })
  })
  it.each(["denied", "unavailable"] as const)("keeps the source and cache on %s without false success", async failure => {
    action.mockResolvedValue({ success: false, failure })
    const { result, invalidation } = show()
    await act(async () => { await result.current.clone() })
    expect(result.current.failure).toBe(failure)
    expect(result.current.pending).toBe(false)
    expect(invalidation).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
    expect(notify.success).not.toHaveBeenCalled()
  })
  it("recognizes the allowlisted stop separately from generic denial", async () => {
    action.mockResolvedValue({ success: false, code: "FORBIDDEN", reason: "MODULE_NEW_WORK_STOPPED", failure: "denied" })
    const { result } = show()
    await act(async () => { await result.current.clone() })
    expect(result.current.failure).toBe("stopped")
    expect(mockPush).not.toHaveBeenCalled()
  })
  it.each(["structured", "transport", "malformed"])("never resends an uncertain %s outcome", async type => {
    if (type === "transport") action.mockRejectedValue(new Error("transport"))
    else action.mockResolvedValue(type === "structured" ? { success: false, failure: "unknown" } : { success: true, data: { status: "DRAFT" } })
    const { result, invalidation } = show()
    await act(async () => { await result.current.clone() })
    await act(async () => { await result.current.clone() })
    expect(action).toHaveBeenCalledTimes(2)
    expect(action.mock.calls[1][0]).toMatchObject({ requestId: action.mock.calls[0][0].requestId, recoverOnly: true })
    expect(result.current.failure).toBe("unknown")
    expect(result.current.retryBlocked).toBe(false)
    expect(result.current.pending).toBe(false)
    expect(invalidation).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })
  it("recovers the retained receipt after remount without resending a clone", async () => {
    action.mockRejectedValue(new Error("lost reply"))
    const first = show()
    await act(async () => { await first.result.current.clone() })
    first.unmount()
    action.mockResolvedValue({ success: true, data: { id: "retained-order", status: "APPROVED" }, canEdit: true })
    const second = show()
    await act(async () => { await second.result.current.clone() })
    expect(action).toHaveBeenCalledTimes(2)
    expect(action.mock.calls[1][0]).toMatchObject({ requestId: action.mock.calls[0][0].requestId, recoverOnly: true })
    expect(mockPush).toHaveBeenCalledWith("/fr/dashboard/purchase-orders/retained-order")
  })
  it("does not reuse another signed-in actor's retained identity", async () => {
    sessionStorage.setItem("purchase-clone:org-1:previous-actor:source-1", "previous-request")
    action.mockResolvedValue({ success: true, data: { id: "new-draft", status: "DRAFT" }, canEdit: true })
    const { result } = show()
    await act(async () => { await result.current.clone() })
    expect(action.mock.calls[0][0].requestId).not.toBe("previous-request")
    expect(action.mock.calls[0][0].recoverOnly).toBeUndefined()
  })
})
