import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"

import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  getOrgPurchaseOrderById,
  receiveItems,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"

import {
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
  usePurchaseOrderById,
  useReceiveItems,
  useSubmitPurchaseOrder,
  useUpdatePurchaseOrder,
} from "../useRecentPurchaseOrderQueries"

jest.mock("@/lib/notifications/notify", () => ({
  notify: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

jest.mock("@/actions/purchaseOrderWorkflow/GoodsReceiptAndSummary", () => ({
  getGoodsReceiptsForPurchaseOrder: jest.fn(),
}))

jest.mock("@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction", () => ({
  approvePurchaseOrder: jest.fn(),
  bulkDeletePurchaseOrders: jest.fn(),
  bulkUpdatePurchaseOrderStatus: jest.fn(),
  cancelPurchaseOrder: jest.fn(),
  closePurchaseOrder: jest.fn(),
  createPurchaseOrder: jest.fn(),
  deletePurchaseOrder: jest.fn(),
  getOrgPurchaseOrderById: jest.fn(),
  getOrgPurchaseOrders: jest.fn(),
  getPurchaseOrdersSummary: jest.fn(),
  receiveItems: jest.fn(),
  submitPurchaseOrder: jest.fn(),
  updatePurchaseOrder: jest.fn(),
}))

const mockApprovePurchaseOrder = approvePurchaseOrder as jest.Mock
const mockCancelPurchaseOrder = cancelPurchaseOrder as jest.Mock
const mockClosePurchaseOrder = closePurchaseOrder as jest.Mock
const mockGetOrgPurchaseOrderById = getOrgPurchaseOrderById as jest.Mock
const mockReceiveItems = receiveItems as jest.Mock
const mockSubmitPurchaseOrder = submitPurchaseOrder as jest.Mock
const mockUpdatePurchaseOrder = updatePurchaseOrder as jest.Mock

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

describe("purchase-order hook action boundaries", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("fetches detail through the protected action with the resolved organization id", async () => {
    mockGetOrgPurchaseOrderById.mockResolvedValue({
      id: "po-1",
      orderNumber: "PO-001",
      organizationId: "org-1",
    })

    const { result } = renderHook(() => usePurchaseOrderById("po-1", "org-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetOrgPurchaseOrderById).toHaveBeenCalledTimes(1)
    expect(mockGetOrgPurchaseOrderById).toHaveBeenCalledWith("po-1", "org-1")
  })

  it("does not fetch purchase-order detail without organization scope", () => {
    renderHook(() => usePurchaseOrderById("po-1", undefined), {
      wrapper: createWrapper(),
    })

    expect(mockGetOrgPurchaseOrderById).not.toHaveBeenCalled()
  })

  it("updates through the protected action with the submitted organization scope", async () => {
    mockUpdatePurchaseOrder.mockResolvedValue({
      success: true,
      data: { id: "po-1", orderNumber: "PO-001", organizationId: "org-1" },
      error: null,
    })

    const payload = {
      id: "po-1",
      organizationId: "org-1",
      supplierId: "supplier-1",
      locationId: "location-1",
      date: "2026-07-04T00:00:00.000Z",
      expectedDeliveryDate: "2026-07-11T00:00:00.000Z",
      paymentTerms: "Net 30",
      notes: "Boundary test",
      shippingCost: 0,
      orderLines: [],
    }

    const { result } = renderHook(() => useUpdatePurchaseOrder(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    expect(mockUpdatePurchaseOrder).toHaveBeenCalledTimes(1)
    expect(mockUpdatePurchaseOrder).toHaveBeenCalledWith(payload)
  })

  it("routes detail lifecycle mutations through protected actions with organization scope", async () => {
    mockSubmitPurchaseOrder.mockResolvedValue({ success: true, data: { id: "po-1" }, error: null })
    mockApprovePurchaseOrder.mockResolvedValue({ success: true, data: { id: "po-1" }, error: null })
    mockCancelPurchaseOrder.mockResolvedValue({ success: true, data: { id: "po-1" }, error: null })
    mockClosePurchaseOrder.mockResolvedValue({ success: true, data: { id: "po-1" }, error: null })
    mockReceiveItems.mockResolvedValue({ success: true, data: { id: "po-1" }, error: null })

    const wrapper = createWrapper()
    const submit = renderHook(() => useSubmitPurchaseOrder(), { wrapper })
    const approve = renderHook(() => useApprovePurchaseOrder(), { wrapper })
    const cancel = renderHook(() => useCancelPurchaseOrder(), { wrapper })
    const close = renderHook(() => useClosePurchaseOrder(), { wrapper })
    const receive = renderHook(() => useReceiveItems(), { wrapper })

    await act(async () => {
      await submit.result.current.mutateAsync({ id: "po-1", organizationId: "org-1" })
      await approve.result.current.mutateAsync({ id: "po-1", organizationId: "org-1" })
      await cancel.result.current.mutateAsync({ id: "po-1", organizationId: "org-1", reason: "Duplicate" })
      await close.result.current.mutateAsync({ id: "po-1", organizationId: "org-1" })
      await receive.result.current.mutateAsync({
        id: "po-1",
        organizationId: "org-1",
        locationId: "location-1",
        notes: "Boundary test",
        items: [{ lineId: "line-1", receivedQuantity: 1 }],
      })
    })

    expect(mockSubmitPurchaseOrder).toHaveBeenCalledWith("po-1", "org-1")
    expect(mockApprovePurchaseOrder).toHaveBeenCalledWith("po-1", "org-1", undefined)
    expect(mockCancelPurchaseOrder).toHaveBeenCalledWith("po-1", "org-1", "Duplicate")
    expect(mockClosePurchaseOrder).toHaveBeenCalledWith("po-1", "org-1")
    expect(mockReceiveItems).toHaveBeenCalledWith({
      id: "po-1",
      organizationId: "org-1",
      locationId: "location-1",
      notes: "Boundary test",
      items: [{ lineId: "line-1", receivedQuantity: 1 }],
    })
  })
})
