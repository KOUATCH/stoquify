import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"

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

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

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

    renderHook(() => useInventoryLossWorkbench(), {
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
})
