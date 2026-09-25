import { act, renderHook, waitFor } from "@testing-library/react"
import { usePOSCheckoutLifecycle } from "../usePOSCheckoutLifecycle"
import { acquirePOSCheckoutAction, changePOSCheckoutCartAction } from "@/actions/pos/checkout.actions"

jest.mock("@/actions/pos/checkout.actions", () => ({ acquirePOSCheckoutAction: jest.fn(), changePOSCheckoutCartAction: jest.fn() }))
const invalidateQueries = jest.fn().mockResolvedValue(undefined)
// Stable query-client identity matches the production provider.
const client = { invalidateQueries }
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => client }))
const acquire = acquirePOSCheckoutAction as jest.Mock
const change = changePOSCheckoutCartAction as jest.Mock
const scope = { organizationId: "org-a", actorId: "cashier-a", locationId: "location-a", terminalId: "terminal-a", sessionId: "session-a" }
const snapshot = { success: true, data: { pendingRequest: null, historicalRequests: [], parked: [], settled: false, recoveredSales: [] } }
function deferred() {
  let resolve!: (value: any) => void
  const promise = new Promise<any>(done => { resolve = done })
  return { promise, resolve }
}

describe("checkout ownership response ordering", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    acquire.mockResolvedValue(snapshot)
    change.mockResolvedValue({ success: true, data: { activeCartId: "cart-a" } })
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request: jest.fn((_key, _options, callback) => Promise.resolve().then(() => callback({ name: "checkout" }))) } })
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true })
    sessionStorage.clear()
  })

  it("does not restore ownership from a response started before going offline", async () => {
    const pending = deferred()
    acquire.mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => usePOSCheckoutLifecycle(scope))
    await waitFor(() => expect(acquire).toHaveBeenCalledTimes(1))
    act(() => window.dispatchEvent(new Event("offline")))
    await act(async () => { pending.resolve(snapshot) })
    expect(result.current.ready).toBe(false)
    expect(result.current.error).toBe("POS_CHECKOUT_CONNECTION_LOST")
  })

  it("does not accept an old register's resume result after switching scope", async () => {
    const pending = deferred()
    change.mockReturnValueOnce(pending.promise)
    const { result, rerender } = renderHook(props => usePOSCheckoutLifecycle(props), { initialProps: scope })
    await waitFor(() => expect(result.current.ready).toBe(true))
    let command!: Promise<unknown>
    act(() => { command = result.current.command("RESUME", "cart-a") })
    rerender({ ...scope, terminalId: "terminal-b", sessionId: "session-b" })
    await waitFor(() => expect(acquire).toHaveBeenCalledTimes(2))
    await act(async () => { pending.resolve({ success: true, data: { activeCartId: "cart-a" } }); await command })
    expect(result.current.acceptedCartId).toBeNull()
  })

  it("allows only one lifecycle command before React renders busy state", async () => {
    const pending = deferred()
    change.mockReturnValue(pending.promise)
    const { result } = renderHook(() => usePOSCheckoutLifecycle(scope))
    await waitFor(() => expect(result.current.ready).toBe(true))
    let commands!: Promise<unknown>[]
    act(() => { commands = [result.current.command("RESUME", "cart-a"), result.current.command("PARK", "cart-a")] })
    await act(async () => { pending.resolve({ success: true, data: { activeCartId: "cart-a" } }); await Promise.all(commands) })
    expect(change).toHaveBeenCalledTimes(1)
  })

  it("rejects a delayed lease response beyond its conservative lifetime", async () => {
    const pending = deferred()
    acquire.mockReturnValueOnce(pending.promise)
    const clock = jest.spyOn(Date, "now").mockReturnValue(1_000)
    try {
      const { result } = renderHook(() => usePOSCheckoutLifecycle(scope))
      await waitFor(() => expect(acquire).toHaveBeenCalledTimes(1))
      clock.mockReturnValue(57_000)
      await act(async () => { pending.resolve(snapshot) })
      expect(result.current.ready).toBe(false)
      expect(result.current.error).toBe("POS_CHECKOUT_OWNERSHIP_REQUIRED")
    } finally { clock.mockRestore() }
  })
})
