/** @jest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react"
import { usePOSCheckoutLifecycle } from "../usePOSCheckoutLifecycle"
import { acquirePOSCheckoutAction, changePOSCheckoutCartAction, renewPOSCheckoutAction } from "@/actions/pos/checkout.actions"

jest.mock("@/actions/pos/checkout.actions", () => ({ acquirePOSCheckoutAction: jest.fn(), changePOSCheckoutCartAction: jest.fn(), renewPOSCheckoutAction: jest.fn() }))
const invalidateQueries = jest.fn().mockResolvedValue(undefined)
// Stable query-client identity matches the production provider.
const client = { invalidateQueries }
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => client }))
const acquire = acquirePOSCheckoutAction as jest.Mock
const change = changePOSCheckoutCartAction as jest.Mock
const renew = renewPOSCheckoutAction as jest.Mock
const scope = { organizationId: "org-a", actorId: "cashier-a", locationId: "location-a", terminalId: "terminal-a", sessionId: "session-a" }
const snapshot = { success: true, data: { pendingRequest: null, historicalRequests: [], parked: [], settled: false, recoveredSales: [] } }
function deferred() {
  let resolve!: (value: any) => void
  const promise = new Promise<any>(done => { resolve = done })
  return { promise, resolve }
}

describe("checkout ownership response ordering", () => {
  it("uses bounded renewals between full recovery sweeps and preserves explicit refresh", async () => {
    jest.useFakeTimers()
    try {
      acquire.mockResolvedValueOnce({ ...snapshot, data: { ...snapshot.data, recoveryAfter: "old-19" } })
      const { result } = renderHook(() => usePOSCheckoutLifecycle(scope))
      await act(async () => {})
      expect(result.current.ready).toBe(true)
      const original = result.current.snapshot
      for (let i = 0; i < 14; i++) await act(async () => { jest.advanceTimersByTime(20_000) })
      expect(renew).toHaveBeenCalledTimes(14)
      expect(acquire).toHaveBeenCalledTimes(1)
      expect(result.current.snapshot).toBe(original)
      await act(async () => { jest.advanceTimersByTime(20_000) })
      expect(acquire).toHaveBeenCalledTimes(2)
      expect(acquire).toHaveBeenLastCalledWith(expect.objectContaining({ recoveryAfter: "old-19" }))
      expect(renew.mock.calls[0][0]).not.toHaveProperty("recoveryAfter")
      await act(async () => { await result.current.refresh() })
      expect(acquire).toHaveBeenCalledTimes(3)
    } finally { jest.useRealTimers() }
  })

  it("discards a renewal reply after going offline and recovers fully on reconnect", async () => {
    jest.useFakeTimers()
    try {
      const pending = deferred()
      renew.mockReturnValueOnce(pending.promise)
      const { result } = renderHook(() => usePOSCheckoutLifecycle(scope))
      await act(async () => {})
      await act(async () => { jest.advanceTimersByTime(20_000) })
      act(() => window.dispatchEvent(new Event("offline")))
      await act(async () => { pending.resolve({ success: true, data: null }) })
      expect(result.current.ready).toBe(false)
      await act(async () => { window.dispatchEvent(new Event("online")) })
      expect(acquire).toHaveBeenCalledTimes(2)
      expect(result.current.ready).toBe(true)
    } finally { jest.useRealTimers() }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    acquire.mockResolvedValue(snapshot)
    renew.mockResolvedValue({ success: true, data: null })
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

  it("keeps a failed cart command visible across successful lease refreshes until retried", async () => {
    change.mockResolvedValueOnce({ success: false, error: "POS_CHECKOUT_OFFLINE_PENDING" })
    const { result } = renderHook(() => usePOSCheckoutLifecycle(scope))
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => { await result.current.command("RESUME", "cart-a") })
    expect(result.current.error).toBe("POS_CHECKOUT_OFFLINE_PENDING")
    await act(async () => { await result.current.refresh() })
    expect(result.current.ready).toBe(true)
    expect(result.current.error).toBe("POS_CHECKOUT_OFFLINE_PENDING")
    expect(result.current.acceptedCartId).toBeNull()
    await act(async () => { await result.current.command("RESUME", "cart-a") })
    expect(result.current.error).toBeNull()
    expect(result.current.acceptedCartId).toBe("cart-a")
  })

  it("clears an ownership failure when the server confirms a renewed lease", async () => {
    change.mockResolvedValueOnce({ success: false, error: "POS_CHECKOUT_OWNERSHIP_REQUIRED" })
    const { result } = renderHook(() => usePOSCheckoutLifecycle(scope))
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => { await result.current.command("RESUME", "cart-a") })
    expect(result.current.ready).toBe(false)
    await act(async () => { await result.current.refresh() })
    expect(result.current.ready).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.acceptedCartId).toBeNull()
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
