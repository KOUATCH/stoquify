import {
  getOrgPurchaseOrders,
  getOrgPurchaseOrderById,
  approvePurchaseOrder,
  updatePurchaseOrder,
  getCurrentPurchaseOrderDraft,
  createPurchaseOrder,
  clonePurchaseOrder,
  bulkUpdatePurchaseOrderStatus,
  deletePurchaseOrder,
  receiveItems,
  resolveGoodsReceiptInspection,
} from "../purchaseOrderSystemAction"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { requireSession } from "@/lib/security/auth-session"
import { revalidatePath } from "next/cache"
import { ApplicationError, BusinessRuleError } from "@/services/_shared/action-errors"
import {
  listPurchaseOrders,
  getPurchaseOrderById,
  approvePurchaseOrder as approvePurchaseOrderService,
  updatePurchaseOrder as updatePurchaseOrderService,
  getPurchaseOrderDraftForActor,
  createPurchaseOrder as createPurchaseOrderService,
  clonePurchaseOrder as clonePurchaseOrderService,
  bulkUpdateStatus,
  executePurchaseOrderLifecycle as executeLifecycleService,
  receiveItems as receiveItemsService,
  resolveGoodsReceiptInspection as resolveGoodsReceiptInspectionService,
} from "@/services/purchase-order/purchase-order.service"

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/purchase-order/purchase-order-decision-history", () => ({ readPurchaseOrderDecisionHistory: jest.fn() }))

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
  executePurchaseOrderLifecycle: jest.fn(),
  getPurchaseOrderLifecyclePreview: jest.fn(),
  exportToCSV: jest.fn(),
  getAnalytics: jest.fn(),
  getGoodsReceipts: jest.fn(),
  getPurchaseOrderById: jest.fn(),
  getPurchaseOrderDraftForActor: jest.fn(),
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
const mockExecuteLifecycleService = executeLifecycleService as jest.Mock
const mockReceiveItemsService = receiveItemsService as jest.Mock
const mockResolveGoodsReceiptInspectionService = resolveGoodsReceiptInspectionService as jest.Mock

const approvedPurchaseOrder = {
  id: "po-1",
  orderNumber: "PO-000001",
  status: "APPROVED",
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(observeModuleAccess as jest.Mock).mockReset().mockResolvedValue({ allowed: true })
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { userId: "actor-session", tenantId: "org-session", sessionId: "current-session", sessionToken: "server-session-token" } })
  mockRequirePermission.mockResolvedValue({
    orgId: "org-session",
    userId: "actor-session",
    permissions: ["purchases.orders.approve", "purchases.delete"],
  })
  mockApprovePurchaseOrderService.mockResolvedValue(approvedPurchaseOrder)
  mockBulkUpdateStatus.mockResolvedValue({ updated: ["po-1"], failed: [] })
  mockExecuteLifecycleService.mockResolvedValue({ id: "po-1", lifecycleReceipt: { archived: true } })
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
  it("denies list and detail reads before domain queries when purchasing is unavailable", async () => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
    expect(await getOrgPurchaseOrders("org-session")).toMatchObject({ success: false, data: [] })
    await expect(getOrgPurchaseOrderById("po-1", "org-session")).rejects.toThrow("Purchasing module")
    expect(listPurchaseOrders).not.toHaveBeenCalled()
    expect(getPurchaseOrderById).not.toHaveBeenCalled()
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", userId: "actor-session", moduleSlug: "purchasing", mode: "enforce", accessIntent: "read" }))
  })
  it("rejects foreign tenant scope before checking the purchasing grant", async () => {
    expect(await getOrgPurchaseOrders("foreign-org")).toMatchObject({ success: false })
    expect(observeModuleAccess).not.toHaveBeenCalled()
    expect(listPurchaseOrders).not.toHaveBeenCalled()
  })
  it("keeps internal grant-query failures out of list responses", async () => {
    ;(observeModuleAccess as jest.Mock).mockRejectedValue(new Error("private database details"))
    const result = await getOrgPurchaseOrders("org-session")
    expect(result.success).toBe(false)
    expect(result.error).not.toContain("private database details")
    expect(listPurchaseOrders).not.toHaveBeenCalled()
  })
  it("rejects a session that no longer matches the permission context", async () => {
    ;(requireSession as jest.Mock).mockResolvedValueOnce({ claims: { userId: "different-user", tenantId: "org-session", sessionId: "current-session", sessionToken: "server-token" } })
    const result = await updatePurchaseOrder({ id: "po-1", organizationId: "org-session", expectedRevision: "a".repeat(64), idempotencyKey: "draft-save-identity", notes: "Edit" })
    expect(result).toMatchObject({ success: false, code: "FORBIDDEN", data: null })
    expect(updatePurchaseOrderService).not.toHaveBeenCalled()
  })

  it("ignores client actor and session claims and binds a draft comparison to server identity", async () => {
    ;(updatePurchaseOrderService as jest.Mock).mockResolvedValueOnce(approvedPurchaseOrder)
    const payload = { id: "po-1", organizationId: "org-session", expectedRevision: "a".repeat(64), idempotencyKey: "draft-save-forged", notes: "Edit", updatedById: "forged-user", sessionId: "forged-session", sessionToken: "forged-token" }
    await updatePurchaseOrder(payload)
    expect(updatePurchaseOrderService).toHaveBeenCalledWith(expect.objectContaining({ updatedById: "actor-session", sessionId: "current-session", sessionToken: "server-session-token" }))
    ;(getPurchaseOrderDraftForActor as jest.Mock).mockResolvedValueOnce(approvedPurchaseOrder)
    expect(await getCurrentPurchaseOrderDraft("po-1", "org-session")).toMatchObject({ success: true })
    expect(getPurchaseOrderDraftForActor).toHaveBeenCalledWith("po-1", { organizationId: "org-session", updatedById: "actor-session", sessionId: "current-session", sessionToken: "server-session-token" })
  })

  it("returns the committed draft receipt if later cache invalidation fails", async () => {
    const saved = { ...approvedPurchaseOrder, editReceipt: { requestReference: "draft-cache-retry", orderId: "po-1", revision: "b".repeat(64), savedAt: "2026-09-07T10:00:00.000Z", replayed: false } }
    ;(updatePurchaseOrderService as jest.Mock).mockResolvedValueOnce(saved)
    ;(revalidatePath as jest.Mock).mockImplementationOnce(() => { throw new Error("Cache unavailable after commit") })
    const result = await updatePurchaseOrder({ id: "po-1", organizationId: "org-session", expectedRevision: "a".repeat(64), idempotencyKey: "draft-cache-retry", notes: "Edit" })
    expect(result).toMatchObject({ success: true, data: saved })
    expect(updatePurchaseOrderService).toHaveBeenCalledTimes(1)
  })

  it("returns actionable stale codes and redacts unexpected internal draft failures", async () => {
    const payload = { id: "po-1", organizationId: "org-session", expectedRevision: "a".repeat(64), idempotencyKey: "draft-safe-error", notes: "Edit" }
    ;(updatePurchaseOrderService as jest.Mock).mockRejectedValueOnce(new ApplicationError("CONFLICT", "Compare the current order", 409))
    expect(await updatePurchaseOrder(payload)).toMatchObject({ success: false, code: "CONFLICT", error: "Compare the current order" })
    ;(updatePurchaseOrderService as jest.Mock).mockRejectedValueOnce(new Error("private-database-marker"))
    const result = await updatePurchaseOrder(payload)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result)).not.toContain("private-database-marker")
  })

  it("returns only the allowlisted stopped-work reason for create and clone", async () => {
    const denied = new ApplicationError("FORBIDDEN", "New work is stopped", 403, true, { reason: "MODULE_NEW_WORK_STOPPED", privateEvidence: "private-marker" })
    ;(createPurchaseOrderService as jest.Mock).mockRejectedValueOnce(denied)
    ;(clonePurchaseOrderService as jest.Mock).mockRejectedValueOnce(denied)
    const created = await createPurchaseOrder({ organizationId: "org-session", supplierId: "supplier-1", locationId: "location-1", date: "2026-09-05", expectedDeliveryDate: "2026-09-06", paymentTerms: "Net 30", shippingCost: 0, orderLines: [{ itemId: "item-1", quantity: 1, unitPrice: 10 }] })
    const cloned = await clonePurchaseOrder({ id: "po-1", organizationId: "org-session" })
    for (const result of [created, cloned]) {
      expect(result).toMatchObject({ success: false, code: "FORBIDDEN", reason: "MODULE_NEW_WORK_STOPPED", error: "New work is stopped" })
      expect(JSON.stringify(result)).not.toContain("private-marker")
      expect(result).not.toHaveProperty("metadata")
    }
    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.create", expect.any(Object))
  })

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

  it("passes reviewed bulk commands with current server identity", async () => {
    const params = { organizationId: "org-session", purchaseOrderIds: ["po-1"], toStatus: "CANCELLED" as const, reason: "No longer required", reviewedRequests: [{ id: "po-1", request: { kind: "cancel" as const, reason: "No longer required", expectedRevision: "a".repeat(64), idempotencyKey: "batch-request" } }] }
    const result = await bulkUpdatePurchaseOrderStatus(params)
    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.cancel", expect.objectContaining({ resource: "PurchaseOrder" }))
    expect(mockBulkUpdateStatus).toHaveBeenCalledWith(params, { organizationId: "org-session", actorId: "actor-session", sessionId: "current-session", sessionToken: "server-session-token" })
    expect(result).toMatchObject({ success: true, data: { updated: ["po-1"], failed: [] } })
  })

  it("approves purchase orders with the current server actor and session", async () => {
    const request = { expectedRevision: "a".repeat(64), idempotencyKey: "approve-request-1" }
    const result = await approvePurchaseOrder("po-1", "org-session", request)

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.approve", {
      resource: "PurchaseOrder",
      resourceId: "po-1",
      auditAllowed: undefined,
    })
    expect(mockApprovePurchaseOrderService).toHaveBeenCalledWith("po-1", "org-session", "actor-session", { ...request, organizationId: "org-session", actorId: "actor-session", sessionId: "current-session", sessionToken: "server-session-token" })
    expect(result).toMatchObject({
      success: true,
      data: approvedPurchaseOrder,
    })
  })

  it("archives the reviewed version with server identity and keeps its receipt after cache failure", async () => {
    const request = { kind: "archive" as const, expectedRevision: "a".repeat(64), idempotencyKey: "archive-request" }
    ;(revalidatePath as jest.Mock).mockImplementationOnce(() => { throw Error("Cache failure") })
    const result = await deletePurchaseOrder("po-1", "org-session", request)
    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.delete", { resource: "PurchaseOrder", resourceId: "po-1", auditAllowed: undefined })
    expect(mockExecuteLifecycleService).toHaveBeenCalledWith("po-1", { organizationId: "org-session", actorId: "actor-session", sessionId: "current-session", sessionToken: "server-session-token" }, request)
    expect(result).toMatchObject({ success: true, data: { lifecycleReceipt: { archived: true } } })
  })
  it("refuses archive without a reviewed request", async () => {
    expect(await deletePurchaseOrder("po-1", "org-session")).toMatchObject({ success: false, code: "REVIEW_REQUIRED" })
    expect(mockExecuteLifecycleService).not.toHaveBeenCalled()
  })
  it("preserves an actionable retained-obligation explanation through safe action normalization", async () => {
    mockExecuteLifecycleService.mockRejectedValueOnce(new BusinessRuleError("Keep linked records available", "RETAINED_OBLIGATIONS"))
    expect(await deletePurchaseOrder("po-1", "org-session", { kind: "archive", expectedRevision: "a".repeat(64), idempotencyKey: "archive-blocked" })).toMatchObject({ success: false, code: "RETAINED_OBLIGATIONS" })
  })

  it("requires the reviewed receiving panel even for an authorized legacy client", async () => {
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
      auditAllowed: undefined,
    })
    expect(mockReceiveItemsService).not.toHaveBeenCalled()
    expect(result).toMatchObject({ success: false, code: "REVIEW_REQUIRED" })
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

    expect(result).toMatchObject({ success: false, code: "INTERNAL_ERROR" })
    expect(result.error).not.toContain("Permission denied")
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

  it("requires the reviewed inspection panel even for an authorized legacy client", async () => {
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
      auditAllowed: undefined,
    })
    expect(mockResolveGoodsReceiptInspectionService).not.toHaveBeenCalled()
    expect(result).toMatchObject({ success: false, code: "REVIEW_REQUIRED" })
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

    expect(result).toMatchObject({ success: false, code: "INTERNAL_ERROR" })
    expect(result.error).not.toContain("Permission denied")
    expect(mockResolveGoodsReceiptInspectionService).not.toHaveBeenCalled()
  })

  it("rejects mismatched tenant scope before calling the service", async () => {
    await expect(approvePurchaseOrder("po-1", "other-org", { expectedRevision: "a".repeat(64), idempotencyKey: "approval-request" })).resolves.toMatchObject({ success: false, error: "You do not have access to this organization" })

    expect(mockApprovePurchaseOrderService).not.toHaveBeenCalled()
  })
})

describe("purchase order edit partial payload", () => {
  it.each([undefined, 0, 15])("preserves shippingCost %s and derives editor identity from session", async (shippingCost) => {
    ;(updatePurchaseOrderService as jest.Mock).mockResolvedValue({ id: "po-1", orderNumber: "PO-1" })
    const result = await updatePurchaseOrder({ id: "po-1", organizationId: "org-session", expectedRevision: "a".repeat(64), idempotencyKey: "request-001", notes: "Changed notes", ...(shippingCost === undefined ? {} : { shippingCost }) })
    expect(result.success).toBe(true)
    expect(updatePurchaseOrderService).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", updatedById: "actor-session", sessionId: "current-session", sessionToken: "server-session-token", notes: "Changed notes" }))
    expect((updatePurchaseOrderService as jest.Mock).mock.calls[0][0].shippingCost).toBe(shippingCost)
  })
})

describe("purchase-order clone boundary", () => {
  it.each([true, false])("uses current server identity and edit permission %s", async canEdit => {
    mockRequirePermission.mockResolvedValueOnce({ orgId: "org-session", userId: "current-buyer", permissions: ["purchases.orders.create", ...(canEdit ? ["purchases.orders.update"] : [])] })
    ;(clonePurchaseOrderService as jest.Mock).mockResolvedValueOnce({ id: "new-draft", status: "DRAFT", orderNumber: "PO-NEW" })
    const result = await clonePurchaseOrder({ id: "source-order", organizationId: "org-session" })
    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.create", expect.objectContaining({ resourceId: "source-order" }))
    expect(clonePurchaseOrderService).toHaveBeenCalledWith({ id: "source-order", organizationId: "org-session" }, "current-buyer")
    expect(result).toMatchObject({ success: true, data: { id: "new-draft", status: "DRAFT" }, canEdit })
  })
  it("does not create after current authorization is denied", async () => {
    mockRequirePermission.mockRejectedValueOnce(new ApplicationError("FORBIDDEN", "Private authority detail", 403, true, { private: "secret-marker" }))
    const result = await clonePurchaseOrder({ id: "source-order", organizationId: "org-session" })
    expect(result).toMatchObject({ success: false, failure: "denied", code: "FORBIDDEN" })
    expect(clonePurchaseOrderService).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toMatch(/secret-marker|Private authority detail/)
  })
  it("rejects a forged tenant before the clone service", async () => {
    const result = await clonePurchaseOrder({ id: "source-order", organizationId: "foreign-org" })
    expect(result.success).toBe(false)
    expect(clonePurchaseOrderService).not.toHaveBeenCalled()
  })
  it.each([["NOT_FOUND", 404, "unavailable"], ["INTERNAL_ERROR", 500, "unknown"]] as const)("returns only a safe %s presentation outcome", async (code, status, failure) => {
    ;(clonePurchaseOrderService as jest.Mock).mockRejectedValueOnce(new ApplicationError(code, "Private service data", status, true, { private: "secret-marker" }))
    const result = await clonePurchaseOrder({ id: "source-order", organizationId: "org-session" })
    expect(result).toMatchObject({ success: false, failure })
    expect(JSON.stringify(result)).not.toMatch(/secret-marker|Private service data/)
  })
})
