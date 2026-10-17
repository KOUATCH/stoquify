import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"

import { getInventoryLossSummaryAction } from "@/actions/inventory/inventoryLossReadActions"

import {
  buildInventoryLossHref,
  defaultInventoryLossPeriod,
  filtersForInventoryLossAction,
  inventoryLossErrorState,
  inventoryLossPeriodError,
  parseInventoryLossSearchParams,
  useInventoryLossWorkbench,
} from "../useInventoryLossWorkbench"

const replace = jest.fn()
let search = new URLSearchParams()

jest.mock("next/navigation", () => ({
  usePathname: () => "/en/dashboard/inventory/loss-control",
  useRouter: () => ({ replace }),
  useSearchParams: () => search,
}))

jest.mock("@/actions/inventory/inventoryLossReadActions", () => ({
  getInventoryLossSummaryAction: jest.fn(),
}))

const mockGetInventoryLossSummaryAction =
  getInventoryLossSummaryAction as jest.Mock

function wrapper(queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })) {

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe("useInventoryLossWorkbench helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    search = new URLSearchParams()
  })

  it("uses a stable inclusive 30-day default period", () => {
    expect(
      defaultInventoryLossPeriod(
        new Date("2026-08-01T12:00:00.000Z"),
      ),
    ).toEqual({
      from: "2026-07-03",
      to: "2026-08-01",
    })
  })

  it("accepts valid URL dates and replaces impossible dates with defaults", () => {
    const now = new Date("2026-08-01T12:00:00.000Z")

    expect(
      parseInventoryLossSearchParams(
        new URLSearchParams("from=2026-07-01&to=2026-07-31"),
        now,
      ),
    ).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    })
    expect(
      parseInventoryLossSearchParams(
        new URLSearchParams("from=2026-02-31&to=nope"),
        now,
      ),
    ).toEqual({
      from: "2026-07-03",
      to: "2026-08-01",
    })
  })

  it("converts the inclusive UI end date to the service half-open boundary", () => {
    expect(
      filtersForInventoryLossAction({
        from: "2026-07-01",
        to: "2026-07-31",
      }),
    ).toEqual({
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-08-01T00:00:00.000Z",
      detailLimit: 100,
      groupLimit: 10,
    })
  })

  it("blocks inverted and overlong periods before querying", () => {
    expect(
      inventoryLossPeriodError({
        from: "2026-08-01",
        to: "2026-07-31",
      }),
    ).toMatch(/end date/i)
    expect(
      inventoryLossPeriodError({
        from: "2025-01-01",
        to: "2026-01-02",
      }),
    ).toMatch(/366 days/i)
  })

  it("builds URL-backed period filters without dropping unrelated state", () => {
    expect(
      buildInventoryLossHref(
        "/en/dashboard/inventory/loss-control",
        new URLSearchParams("view=products&from=2026-07-01"),
        { to: "2026-07-31" },
      ),
    ).toBe(
      "/en/dashboard/inventory/loss-control?view=products&from=2026-07-01&to=2026-07-31",
    )
  })

  it("classifies protected action failures into robust route states", () => {
    expect(
      inventoryLossErrorState(
        Object.assign(new Error("login"), {
          status: 401,
          code: "AUTH_REQUIRED",
        }),
      ),
    ).toBe("stale_session")
    expect(
      inventoryLossErrorState(
        Object.assign(new Error("denied"), {
          status: 403,
          code: "FORBIDDEN",
        }),
      ),
    ).toBe("permission_denied")
    expect(inventoryLossErrorState(new Error("down"))).toBe("error")
  })

  it("loads only through the protected inventory loss action", async () => {
    search = new URLSearchParams(
      "from=2026-07-01&to=2026-07-31",
    )
    mockGetInventoryLossSummaryAction.mockResolvedValue({
      success: true,
      status: 200,
      error: null,
      data: {
        scope: {
          kind: "LOCATIONS",
          authorizedLocationIds: ["location-1"],
        },
        data: {},
      },
    })

    renderHook(() => useInventoryLossWorkbench("org-1", "actor-1"), {
      wrapper: wrapper(),
    })

    await waitFor(() => {
      expect(mockGetInventoryLossSummaryAction).toHaveBeenCalledWith({
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-08-01T00:00:00.000Z",
        detailLimit: 100,
        groupLimit: 10,
      })
    })
  })

  it.each([401, 403])("withdraws cached records after %i and keeps them hidden through recovery", async status => {
    const response = { scope: { kind: "TENANT", authorizedLocationIds: null }, data: { records: [{ id: "private-record" }] } }
    mockGetInventoryLossSummaryAction.mockResolvedValue({ success: true, data: response })
    const { result } = renderHook(() => useInventoryLossWorkbench("org-1", "actor-1"), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.response).toEqual(response))
    mockGetInventoryLossSummaryAction.mockResolvedValue({ success: false, status, code: status === 401 ? "AUTH_REQUIRED" : "FORBIDDEN", error: "Access changed", retryable: false })
    await act(async () => { await result.current.refetch() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.response).toBeUndefined()
    expect(result.current.result).toBeUndefined()
    expect(result.current.scope).toBeUndefined()
    mockGetInventoryLossSummaryAction.mockResolvedValue({ success: false, status: 500, error: "Recovery unavailable", retryable: false })
    await act(async () => { await result.current.refetch() })
    expect(result.current.response).toBeUndefined()
    let resume!: (value: unknown) => void
    mockGetInventoryLossSummaryAction.mockImplementation(() => new Promise(resolve => { resume = resolve }))
    let pending!: ReturnType<typeof result.current.refetch>
    act(() => { pending = result.current.refetch() })
    await waitFor(() => expect(result.current.isFetching).toBe(true))
    expect(result.current.result).toBeUndefined()
    await act(async () => { resume({ success: true, data: response }); await pending })
    await waitFor(() => expect(result.current.response).toEqual(response))
  })

  it("retains prior records with an explicit error after a recoverable server failure", async () => {
    const response = { scope: { kind: "TENANT", authorizedLocationIds: null }, data: { records: [{ id: "retained-record" }] } }
    mockGetInventoryLossSummaryAction.mockResolvedValue({ success: true, data: response })
    const { result } = renderHook(() => useInventoryLossWorkbench("org-1", "actor-1"), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.response).toEqual(response))
    mockGetInventoryLossSummaryAction.mockResolvedValue({ success: false, status: 500, error: "Source unavailable", retryable: false })
    await act(async () => { await result.current.refetch() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.response).toEqual(response)
  })

  it("withdraws every cached period in the rejected identity scope", async () => {
    const client = new QueryClient()
    const records = { data: { records: [{ id: "previous-period-private-record" }] } }
    const previousPeriod = ["inventory-loss-workbench", "org-1", "actor-1", { from: "2026-01-01" }]
    const otherScope = ["inventory-loss-workbench", "org-2", "actor-2", { from: "2026-01-01" }]
    client.setQueryData(previousPeriod, records)
    client.setQueryData(otherScope, records)
    mockGetInventoryLossSummaryAction.mockResolvedValue({ success: false, status: 403, code: "FORBIDDEN", error: "Access changed" })
    const { result } = renderHook(() => useInventoryLossWorkbench("org-1", "actor-1"), { wrapper: wrapper(client) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData(previousPeriod)).toBeNull()
    expect(client.getQueryData(otherScope)).toEqual(records)
  })

  it.each(["organization", "actor"])("never uses another %s's cached response as placeholder data", async changed => {
    const original = { scope: { kind: "TENANT", authorizedLocationIds: null }, data: { records: [{ id: "old-private-record" }] } }
    mockGetInventoryLossSummaryAction.mockResolvedValue({ success: true, data: original })
    const { result, rerender } = renderHook(({ organizationId, actorId }) => useInventoryLossWorkbench(organizationId, actorId), {
      initialProps: { organizationId: "org-1", actorId: "actor-1" }, wrapper: wrapper(),
    })
    await waitFor(() => expect(result.current.response).toEqual(original))
    let complete!: (value: unknown) => void
    mockGetInventoryLossSummaryAction.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    rerender({ organizationId: changed === "organization" ? "org-2" : "org-1", actorId: changed === "actor" ? "actor-2" : "actor-1" })
    await waitFor(() => expect(result.current.isFetching).toBe(true))
    expect(result.current.response).toBeUndefined()
    const next = { ...original, data: { records: [{ id: "new-private-record" }] } }
    await act(async () => { complete({ success: true, data: next }) })
    await waitFor(() => expect(result.current.response).toEqual(next))
  })
})
