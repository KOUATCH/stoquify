import {
  approvePurchaseOrder,
  bulkUpdatePurchaseOrderStatus,
  deletePurchaseOrder,
  receiveItems,
  resolveGoodsReceiptInspection,
} from "../purchaseOrderSystemAction"
import { requirePermission } from "@/lib/security/rbac"
import {
  approvePurchaseOrder as approvePurchaseOrderService,
  bulkUpdateStatus,
  deletePurchaseOrder as deletePurchaseOrderService,
  receiveItems as receiveItemsService,
  resolveGoodsReceiptInspection as resolveGoodsReceiptInspectionService,
} from "@/services/purchase-order/purchase-order.service"

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock("@/services/purchase-order/purchase-order.service", () => ({
  approvePurchaseOrder: jest.fn(),
  bulkUpdateStatus: jest.fn(),
  cancelPurchaseOrder: jest.fn(),
  clonePurchaseOrder: jest.fn(),
  closePurchaseOrder: jest.fn(),
  createPurchaseOrder: jest.fn(),
  deletePurchaseOrder: jest.fn(),
  exportToCSV: jest.fn(),
  getAnalytics: jest.fn(),
  getGoodsReceipts: jest.fn(),
  getPurchaseOrderById: jest.fn(),
  getRequiringAttention: jest.fn(),
  getStatusHistory: jest.fn(),
  getSummary: jest.fn(),
  listPurchaseOrders: jest.fn(),
  receiveItems: jest.fn(),
  resolveGoodsReceiptInspection: jest.fn(),
  searchLocations: jest.fn(),
  submitPurchaseOrder: jest.fn(),
  updatePurchaseOrder: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockApprovePurchaseOrderService = approvePurchaseOrderService as jest.Mock
const mockBulkUpdateStatus = bulkUpdateStatus as jest.Mock
const mockDeletePurchaseOrderService = deletePurchaseOrderService as jest.Mock
const mockReceiveItemsService = receiveItemsService as jest.Mock
const mockResolveGoodsReceiptInspectionService = resolveGoodsReceiptInspectionService as jest.Mock

const approvedPurchaseOrder = {
  id: "po-1",
  orderNumber: "PO-000001",
  status: "APPROVED",
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequirePermission.mockResolvedValue({
    orgId: "org-session",
    userId: "actor-session",
    permissions: ["purchases.orders.approve", "purchases.delete"],
  })
  mockApprovePurchaseOrderService.mockResolvedValue(approvedPurchaseOrder)
  mockBulkUpdateStatus.mockResolvedValue({ updated: ["po-1"], failed: [] })
  mockDeletePurchaseOrderService.mockResolvedValue("PO-000001")
  mockReceiveItemsService.mockResolvedValue({
    purchaseOrder: { ...approvedPurchaseOrder, status: "RECEIVED" },
    receiptNumber: "GR-000001",
    receiptStatus: "RECEIVED",
    inspectionOutcome: "PASSED",
    replayed: false,
  })
  mockResolveGoodsReceiptInspectionService.mockResolvedValue({
    goodsReceiptId: "receipt-1",
    receiptNumber: "GR-000001",
    purchaseOrderId: "po-1",
    receiptStatus: "RECEIVED",
    decision: "ACCEPT",
    replayed: false,
  })
})

describe("purchaseOrderSystemAction controls", () => {
  it("rejects bulk approval before permission lookup or service execution", async () => {
    await expect(
      bulkUpdatePurchaseOrderStatus({
        organizationId: "org-session",
        purchaseOrderIds: ["po-1"],
        toStatus: "APPROVED",
      }),
    ).rejects.toThrow(
      "Purchase orders cannot be approved in bulk. Use the canonical approval workflow for each order.",
    )

    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockBulkUpdateStatus).not.toHaveBeenCalled()
  })

  it("keeps safe non-approval bulk transitions available", async () => {
    const result = await bulkUpdatePurchaseOrderStatus({
      organizationId: "org-session",
      purchaseOrderIds: ["po-1"],
      toStatus: "CANCELLED",
      reason: "No longer required",
    })

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.cancel", {
      resource: "PurchaseOrder",
      resourceId: undefined,
      auditAllowed: true,
    })
    expect(mockBulkUpdateStatus).toHaveBeenCalledWith({
      organizationId: "org-session",
      purchaseOrderIds: ["po-1"],
      toStatus: "CANCELLED",
      reason: "No longer required",
    })
    expect(result).toMatchObject({
      success: true,
      data: { updated: ["po-1"], failed: [] },
    })
  })

  it("approves purchase orders with the RBAC actor instead of caller-supplied approvedBy", async () => {
    const result = await approvePurchaseOrder("po-1", "org-session", "client-approver")

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.approve", {
      resource: "PurchaseOrder",
      resourceId: "po-1",
      auditAllowed: true,
    })
    expect(mockApprovePurchaseOrderService).toHaveBeenCalledWith("po-1", "org-session", "actor-session")
    expect(result).toMatchObject({
      success: true,
      data: approvedPurchaseOrder,
    })
  })

  it("archives purchase orders with the RBAC actor instead of caller-supplied identity", async () => {
    const result = await deletePurchaseOrder("po-1", "org-session")

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.delete", {
      resource: "PurchaseOrder",
      resourceId: "po-1",
      auditAllowed: true,
    })
    expect(mockDeletePurchaseOrderService).toHaveBeenCalledWith("po-1", "org-session", "actor-session")
    expect(result).toMatchObject({
      success: true,
      data: null,
      message: "Purchase order PO-000001 archived successfully",
    })
  })

  it("receives purchase orders with only the canonical receive permission", async () => {
    const result = await receiveItems({
      id: "po-1",
      organizationId: "org-session",
      receivedBy: "client-user",
      idempotencyKey: "receipt:command-1",
      inspectionOutcome: "PASSED",
      items: [{ lineId: "line-1", receivedQuantity: 2 }],
    })

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.receive", {
      resource: "PurchaseOrder",
      resourceId: "po-1",
      auditAllowed: true,
    })
    expect(mockReceiveItemsService).toHaveBeenCalledWith({
      purchaseOrderId: "po-1",
      organizationId: "org-session",
      receivedById: "actor-session",
      idempotencyKey: "receipt:command-1",
      locationId: undefined,
      notes: undefined,
      inspectionOutcome: "PASSED",
      inspectionReason: undefined,
      inspectionEvidenceNotes: undefined,
      items: [{ lineId: "line-1", receivedQuantity: 2 }],
    })
    expect(result.success).toBe(true)
  })

  it("does not record a receiving inspection when receive permission is denied", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Permission denied"))

    const result = await receiveItems({
      id: "po-1",
      organizationId: "org-session",
      idempotencyKey: "receipt:command-denied",
      inspectionOutcome: "PASSED",
      items: [{ lineId: "line-1", receivedQuantity: 2 }],
    })

    expect(result).toMatchObject({ success: false, error: "Permission denied" })
    expect(mockReceiveItemsService).not.toHaveBeenCalled()
  })

  it("requires the authorized receiver to record an inspection outcome", async () => {
    const result = await receiveItems({
      id: "po-1",
      organizationId: "org-session",
      receivedBy: "client-user",
      idempotencyKey: "receipt:missing-inspection-1",
      items: [{ lineId: "line-1", receivedQuantity: 2 }],
    } as Parameters<typeof receiveItems>[0])

    expect(result.success).toBe(false)
    expect(mockReceiveItemsService).not.toHaveBeenCalled()
  })

  it("resolves a held receipt with the canonical receive permission and RBAC actor", async () => {
    const result = await resolveGoodsReceiptInspection({
      goodsReceiptId: "receipt-1",
      organizationId: "org-session",
      decision: "ACCEPT",
      reason: "Condition verified by warehouse lead",
      idempotencyKey: "inspection-resolution:1",
    })

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.receive", {
      resource: "GoodsReceipt",
      resourceId: "receipt-1",
      auditAllowed: true,
    })
    expect(mockResolveGoodsReceiptInspectionService).toHaveBeenCalledWith({
      goodsReceiptId: "receipt-1",
      organizationId: "org-session",
      resolvedById: "actor-session",
      decision: "ACCEPT",
      reason: "Condition verified by warehouse lead",
      idempotencyKey: "inspection-resolution:1",
    })
    expect(result).toMatchObject({ success: true, data: { receiptStatus: "RECEIVED" } })
  })

  it("rejects cross-tenant inspection resolution before calling the service", async () => {
    const result = await resolveGoodsReceiptInspection({
      goodsReceiptId: "receipt-1",
      organizationId: "other-org",
      decision: "REJECT",
      reason: "Damaged on arrival",
      idempotencyKey: "inspection-resolution:2",
    })

    expect(result).toMatchObject({ success: false, error: "You do not have access to this organization" })
    expect(mockResolveGoodsReceiptInspectionService).not.toHaveBeenCalled()
  })

  it("does not call inspection resolution when permission is denied", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("Permission denied"))

    const result = await resolveGoodsReceiptInspection({
      goodsReceiptId: "receipt-1",
      organizationId: "org-session",
      decision: "ACCEPT",
      reason: "Condition verified",
      idempotencyKey: "inspection-resolution:3",
    })

    expect(result).toMatchObject({ success: false, error: "Permission denied" })
    expect(mockResolveGoodsReceiptInspectionService).not.toHaveBeenCalled()
  })

  it("rejects mismatched tenant scope before calling the service", async () => {
    await expect(approvePurchaseOrder("po-1", "other-org", "client-approver")).rejects.toThrow(
      "You do not have access to this organization",
    )

    expect(mockApprovePurchaseOrderService).not.toHaveBeenCalled()
  })
})
