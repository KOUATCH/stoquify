import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"

import {
  approvePurchaseOrder,
  createPurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  getOrgPurchaseOrderById,
  receiveItems,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"

import {
  useApprovePurchaseOrder,
  useCreatePurchaseOrder,
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
  usePurchaseOrderById,
  useReceiveItems,
  useSubmitPurchaseOrder,
  useUpdatePurchaseOrder,
  purchaseOrderKeys,
} from "../useRecentPurchaseOrderQueries"
import fr from "@/messages/fr.json"
import { QueryProvider } from "@/lib/providers/query-provider"
import { CRUD_MUTATION_NOTIFICATION_EVENT } from "@/lib/error-handling/crud-notifications"
jest.mock("next-intl", () => ({ useTranslations: () => (key: "deniedMessage") => fr.moduleComposition.stop[key] }))

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
  it.each([false, true])("lets the editor own failure feedback without a global toast (transport failure: %s)", async (transportFailure) => {
    const notification = jest.fn()
    window.addEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, notification)
    try {
      if (transportFailure) mockUpdatePurchaseOrder.mockRejectedValue(new Error("Raw technical failure"))
      else mockUpdatePurchaseOrder.mockResolvedValue({ success: false, data: null, error: "Cannot edit status CANCELLED" })
      const { result } = renderHook(() => useUpdatePurchaseOrder({ handlesFeedbackLocally: true }), { wrapper: QueryProvider })
      await act(async () => { await result.current.mutateAsync({ id: "po-1", organizationId: "org-1" }).catch(() => undefined) })
      expect(mockUpdatePurchaseOrder).toHaveBeenCalledTimes(1)
      expect(notification).not.toHaveBeenCalled()
    } finally { window.removeEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, notification) }
  })

  it("keeps existing global failure feedback for other update-hook callers", async () => {
    const notification = jest.fn()
    window.addEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, notification)
    try {
      mockUpdatePurchaseOrder.mockResolvedValue({ success: false, data: null, error: "An existing caller failure" })
      const { result } = renderHook(() => useUpdatePurchaseOrder(), { wrapper: QueryProvider })
      await act(async () => { await result.current.mutateAsync({ id: "po-1", organizationId: "org-1" }) })
      expect(notification).toHaveBeenCalledTimes(1)
    } finally { window.removeEventListener(CRUD_MUTATION_NOTIFICATION_EVENT, notification) }
  })

  it("localizes a stopped purchase creation while keeping the failure result", async () => {
    ;(createPurchaseOrder as jest.Mock).mockResolvedValue({ success: false, data: null, code: "FORBIDDEN", reason: "MODULE_NEW_WORK_STOPPED", error: "English fallback" })
    const { result } = renderHook(() => useCreatePurchaseOrder(), { wrapper: createWrapper() })
    let response: unknown
    await act(async () => { response = await result.current.mutateAsync({ organizationId: "org-1", supplierId: "supplier-1", locationId: "location-1", date: "2026-09-05", expectedDeliveryDate: "2026-09-06", paymentTerms: "Net 30", orderLines: [{ itemId: "item-1", quantity: 1, unitPrice: 10 }] }) })
    expect(response).toMatchObject({ success: false, reason: "MODULE_NEW_WORK_STOPPED", error: fr.moduleComposition.stop.deniedMessage })
  })

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

    const request = (kind: "submit" | "cancel" | "complete") => ({ kind, expectedRevision: "b".repeat(64), idempotencyKey: "lifecycle-" + kind, ...(kind === "cancel" ? { reason: "Duplicate" } : {}) });
    const wrapper = createWrapper()
    const submit = renderHook(() => useSubmitPurchaseOrder(), { wrapper })
    const approve = renderHook(() => useApprovePurchaseOrder(), { wrapper })
    const cancel = renderHook(() => useCancelPurchaseOrder(), { wrapper })
    const close = renderHook(() => useClosePurchaseOrder(), { wrapper })
    const receive = renderHook(() => useReceiveItems(), { wrapper })

    await act(async () => {
      await submit.result.current.mutateAsync({ id: "po-1", organizationId: "org-1", request: request("submit") })
      await approve.result.current.mutateAsync({ id: "po-1", organizationId: "org-1", request: { expectedRevision: "a".repeat(64), idempotencyKey: "approve-request" } })
      await cancel.result.current.mutateAsync({ id: "po-1", organizationId: "org-1", request: request("cancel"), reason: "Duplicate" })
      await close.result.current.mutateAsync({ id: "po-1", organizationId: "org-1", request: request("complete") })
      await receive.result.current.mutateAsync({
        id: "po-1",
        organizationId: "org-1",
        locationId: "location-1",
        notes: "Boundary test",
        items: [{ lineId: "line-1", receivedQuantity: 1 }],
      })
    })

    expect(mockSubmitPurchaseOrder).toHaveBeenCalledWith("po-1", "org-1", request("submit"))
    expect(mockApprovePurchaseOrder).toHaveBeenCalledWith("po-1", "org-1", { expectedRevision: "a".repeat(64), idempotencyKey: "approve-request" })
    expect(mockCancelPurchaseOrder).toHaveBeenCalledWith("po-1", "org-1", "Duplicate", request("cancel"))
    expect(mockClosePurchaseOrder).toHaveBeenCalledWith("po-1", "org-1", request("complete"))
    expect(mockReceiveItems).toHaveBeenCalledWith({
      id: "po-1",
      organizationId: "org-1",
      locationId: "location-1",
      notes: "Boundary test",
      items: [{ lineId: "line-1", receivedQuantity: 1 }],
    })
  })
})

describe("purchase order edit confirmed-result cache behavior", () => {
  it("keeps an authoritative cached order unchanged after an explicit rejected result", async () => {
    const client = createQueryClient()
    const cached = { id: "po-1", notes: "Saved notes", total: 243.5, capabilities: { canEdit: false } }
    client.setQueryData(purchaseOrderKeys.detail("po-1"), cached)
    const invalidate = jest.spyOn(client, "invalidateQueries")
    mockUpdatePurchaseOrder.mockResolvedValue({ success: false, data: null, error: "No access" })
    const { result } = renderHook(() => useUpdatePurchaseOrder(), { wrapper: createWrapper(client) })
    await act(async () => { await result.current.mutateAsync({ id: "po-1", organizationId: "org-1", notes: "Unsaved" }) })
    expect(client.getQueryData(purchaseOrderKeys.detail("po-1"))).toEqual(cached)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("refreshes detail, lists and tenant summary only after a confirmed save", async () => {
    const client = createQueryClient()
    const invalidate = jest.spyOn(client, "invalidateQueries")
    mockUpdatePurchaseOrder.mockResolvedValue({ success: true, data: { id: "po-1" } })
    const { result } = renderHook(() => useUpdatePurchaseOrder(), { wrapper: createWrapper(client) })
    await act(async () => { await result.current.mutateAsync({ id: "po-1", organizationId: "org-1", notes: "Saved" }) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: purchaseOrderKeys.detail("po-1") })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: purchaseOrderKeys.lists() })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: purchaseOrderKeys.summary("org-1") })
  })
})
