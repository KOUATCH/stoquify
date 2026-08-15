import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"

import {
  getPublicReceiptAccessTokensAction,
  getPublicReceiptTokenManagementCapabilityAction,
  revokePublicReceiptAccessTokenAction,
  searchPublicReceiptSalesAction,
} from "@/actions/pos/receipt-token.actions"
import { getPOSCustomersAction } from "@/actions/pos/catalog.actions"

import {
  posOperationsKeys,
  usePOSCustomers,
  usePublicReceiptAccessTokens,
  usePublicReceiptSalesSearch,
  usePublicReceiptTokenManagementCapability,
  useRevokePublicReceiptAccessToken,
} from "../usePosOperations"

jest.mock("@/actions/pos/catalog.actions", () => ({
  getPOSCatalogAction: jest.fn(),
  getPOSCustomersAction: jest.fn(),
  getPOSLocationsAction: jest.fn(),
  getPOSTerminalsAction: jest.fn(),
}))

jest.mock("@/actions/pos/cart.actions", () => ({
  addPOSCartLineAction: jest.fn(),
  getActivePOSCartAction: jest.fn(),
  removePOSCartLineAction: jest.fn(),
  updatePOSCartLineAction: jest.fn(),
}))

jest.mock("@/actions/pos/receipt-token.actions", () => ({
  getPublicReceiptAccessTokensAction: jest.fn(),
  getPublicReceiptTokenManagementCapabilityAction: jest.fn(),
  revokePublicReceiptAccessTokenAction: jest.fn(),
  searchPublicReceiptSalesAction: jest.fn(),
}))

jest.mock("@/actions/pos/session.actions", () => ({
  closePOSShiftAction: jest.fn(),
  getActivePOSSessionAction: jest.fn(),
  openPOSShiftAction: jest.fn(),
}))

jest.mock("@/actions/pos/tender.actions", () => ({
  commitPOSSaleAction: jest.fn(),
  refundPOSSaleAction: jest.fn(),
  voidPOSSaleAction: jest.fn(),
}))

const mockGetPublicReceiptAccessTokensAction = getPublicReceiptAccessTokensAction as jest.Mock
const mockGetPOSCustomersAction = getPOSCustomersAction as jest.Mock
const mockGetPublicReceiptTokenManagementCapabilityAction = getPublicReceiptTokenManagementCapabilityAction as jest.Mock
const mockRevokePublicReceiptAccessTokenAction = revokePublicReceiptAccessTokenAction as jest.Mock
const mockSearchPublicReceiptSalesAction = searchPublicReceiptSalesAction as jest.Mock

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient = createQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("POS receipt token hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("queries receipt-token management capability once for POS visibility", async () => {
    mockGetPublicReceiptTokenManagementCapabilityAction.mockResolvedValue({
      success: true,
      data: {
        canManageReceiptTokens: true,
        moduleSlug: "pos",
        permission: "pos.receipts.revoke",
      },
      error: null,
      status: 200,
    })

    const { result } = renderHook(() => usePublicReceiptTokenManagementCapability(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetPublicReceiptTokenManagementCapabilityAction).toHaveBeenCalledWith({})
    expect(result.current.data).toEqual(expect.objectContaining({ success: true }))
  })

  it("queries receipt token metadata only when a sale id is available", async () => {
    mockGetPublicReceiptAccessTokensAction.mockResolvedValue({
      success: true,
      data: [{ id: "token-row-1", tokenIdSuffix: "row-1", isActive: true }],
      error: null,
      status: 200,
    })

    const { result } = renderHook(() => usePublicReceiptAccessTokens("sale-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetPublicReceiptAccessTokensAction).toHaveBeenCalledWith({ salesOrderId: "sale-1" })
    expect(result.current.data).toEqual(expect.objectContaining({ success: true }))
  })

  it("does not query receipt token metadata without a sale id", () => {
    renderHook(() => usePublicReceiptAccessTokens(undefined), {
      wrapper: createWrapper(),
    })

    expect(mockGetPublicReceiptAccessTokensAction).not.toHaveBeenCalled()
  })

  it("searches receipt sale candidates only after a query is activated", async () => {
    mockSearchPublicReceiptSalesAction.mockResolvedValue({
      success: true,
      data: [{ salesOrderId: "sale-1", orderNumber: "POS-20260703-0001" }],
      error: null,
      status: 200,
    })

    const { result, rerender } = renderHook(({ query }) => usePublicReceiptSalesSearch(query), {
      initialProps: { query: null as string | null },
      wrapper: createWrapper(),
    })

    expect(mockSearchPublicReceiptSalesAction).not.toHaveBeenCalled()

    rerender({ query: " POS-20260703 " })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockSearchPublicReceiptSalesAction).toHaveBeenCalledWith({ query: "POS-20260703" })
    expect(result.current.data).toEqual(expect.objectContaining({ success: true }))
  })
  it("revokes one receipt token and invalidates that sale token query", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries")
    mockRevokePublicReceiptAccessTokenAction.mockResolvedValue({
      success: true,
      data: {
        tokenId: "token-row-1",
        salesOrderId: "sale-1",
        status: "REVOKED",
        revokedAt: "2026-07-03T12:05:00.000Z",
      },
      error: null,
      status: 200,
    })

    const { result } = renderHook(() => useRevokePublicReceiptAccessToken(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({ tokenId: "token-row-1", salesOrderId: "sale-1" })
    })

    expect(mockRevokePublicReceiptAccessTokenAction).toHaveBeenCalledWith({
      tokenId: "token-row-1",
      salesOrderId: "sale-1",
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: posOperationsKeys.receiptTokens("sale-1") })
  })

  it("partitions POS customer searches by location and search text", async () => {
    mockGetPOSCustomersAction.mockResolvedValue({
      success: true,
      data: { customers: [], total: 0 },
      error: null,
    })
    const queryClient = createQueryClient()

    const { result } = renderHook(
      () => usePOSCustomers({ locationId: "location-a", search: "alice" }),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0)
    expect(mockGetPOSCustomersAction).toHaveBeenCalledWith({
      locationId: "location-a",
      search: "alice",
    })
    expect(posOperationsKeys.customers("location-a", "alice"))
      .not.toEqual(posOperationsKeys.customers("location-b", "alice"))
  })
})
