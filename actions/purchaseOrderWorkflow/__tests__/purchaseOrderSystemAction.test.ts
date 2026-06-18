import {
  approvePurchaseOrder,
  deletePurchaseOrder,
} from "../purchaseOrderSystemAction"
import { requirePermission } from "@/lib/security/rbac"
import {
  approvePurchaseOrder as approvePurchaseOrderService,
  deletePurchaseOrder as deletePurchaseOrderService,
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
  searchLocations: jest.fn(),
  submitPurchaseOrder: jest.fn(),
  updatePurchaseOrder: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockApprovePurchaseOrderService = approvePurchaseOrderService as jest.Mock
const mockDeletePurchaseOrderService = deletePurchaseOrderService as jest.Mock

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
  mockDeletePurchaseOrderService.mockResolvedValue("PO-000001")
})

describe("purchaseOrderSystemAction controls", () => {
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

  it("rejects mismatched tenant scope before calling the service", async () => {
    await expect(approvePurchaseOrder("po-1", "other-org", "client-approver")).rejects.toThrow(
      "You do not have access to this organization",
    )

    expect(mockApprovePurchaseOrderService).not.toHaveBeenCalled()
  })
})
