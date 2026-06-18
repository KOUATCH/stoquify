"use server"

import { revalidatePath, revalidateTag } from "next/cache"

import { requirePermission } from "@/lib/security/rbac"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import {
  BulkStatusUpdateSchema,
  ClonePurchaseOrderSchema,
  CreatePurchaseOrderSchema,
  POAnalyticsSchema,
  ReceiveItemsSchema,
  UpdatePurchaseOrderSchema,
  type PurchaseOrderStatus,
} from "@/services/purchase-order/purchase-order.schemas"
import {
  approvePurchaseOrder as approvePurchaseOrderService,
  bulkUpdateStatus,
  cancelPurchaseOrder as cancelPurchaseOrderService,
  clonePurchaseOrder as clonePurchaseOrderService,
  closePurchaseOrder as closePurchaseOrderService,
  createPurchaseOrder as createPurchaseOrderService,
  deletePurchaseOrder as deletePurchaseOrderService,
  exportToCSV,
  getAnalytics,
  getGoodsReceipts,
  getPurchaseOrderById,
  getRequiringAttention,
  getStatusHistory,
  getSummary,
  listPurchaseOrders,
  receiveItems as receiveItemsService,
  searchLocations as searchPurchaseOrderLocations,
  submitPurchaseOrder as submitPurchaseOrderService,
  updatePurchaseOrder as updatePurchaseOrderService,
} from "@/services/purchase-order/purchase-order.service"
import type {
  CreatePurchaseOrderPayload,
  GoodsReceiptPayload as ClientGoodsReceiptPayload,
  PurchaseOrderFilters,
  PurchaseOrderResponse,
  PurchaseOrderWithRelations,
  UpdatePurchaseOrderDTO,
} from "@/types/purchase-orders-system-types"

export type GoodsReceiptPayload = ClientGoodsReceiptPayload

function revalidatePurchaseOrderWorkflow(organizationId: string, id?: string) {
  revalidateTag("purchaseOrders")
  revalidateTag(`purchaseOrders-${organizationId}`)
  if (id) revalidateTag(`purchaseOrder-${id}`)

  revalidatePath("/[locale]/dashboard/purchase-orders", "page")
  revalidatePath("/[locale]/dashboard/purchases", "page")
  if (id) {
    revalidatePath("/[locale]/dashboard/purchase-orders/[id]", "page")
    revalidatePath("/[locale]/dashboard/purchase-orders/[id]/edit", "page")
    revalidatePath("/[locale]/dashboard/purchases/[id]", "page")
  }
}

async function scopedOrg(
  requestedOrganizationId: string | undefined,
  permission = "purchases.orders.read",
  options?: { resourceId?: string; auditAllowed?: boolean },
) {
  const ctx = await requirePermission(permission, {
    resource: "PurchaseOrder",
    resourceId: options?.resourceId,
    auditAllowed: options?.auditAllowed,
  })
  if (requestedOrganizationId && requestedOrganizationId !== ctx.orgId) {
    throw new BusinessRuleError("You do not have access to this organization")
  }
  return { orgId: ctx.orgId, userId: ctx.userId }
}

function permissionForBulkStatus(status: PurchaseOrderStatus) {
  if (status === "APPROVED") return "purchases.orders.approve"
  if (status === "CANCELLED") return "purchases.orders.cancel"
  return "purchases.orders.update"
}

function response<T>(data: T, message?: string): PurchaseOrderResponse<T> & { message?: string } {
  return { success: true, data, error: null, ...(message ? { message } : {}) }
}

function mapCreatePayload(payload: CreatePurchaseOrderPayload, orgId: string, userId: string) {
  return CreatePurchaseOrderSchema.parse({
    organizationId: orgId,
    createdById: userId,
    supplierId: payload.supplierId,
    locationId: payload.locationId,
    date: payload.date,
    expectedDeliveryDate: payload.expectedDeliveryDate,
    paymentTerms: payload.paymentTerms,
    notes: payload.notes,
    shippingCost: payload.shippingCost ?? 0,
    orderLines: payload.orderLines,
  })
}

function mapUpdatePayload(payload: UpdatePurchaseOrderDTO, orgId: string, userId: string) {
  return UpdatePurchaseOrderSchema.parse({
    ...payload,
    organizationId: orgId,
    updatedById: userId,
    shippingCost: payload.shippingCost ?? 0,
  })
}

export async function getOrgPurchaseOrders(
  organizationId?: string,
  _filters: Partial<PurchaseOrderFilters> = {},
): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations[]>> {
  try {
    const { orgId } = await scopedOrg(organizationId, "purchases.orders.read")
    const purchaseOrders = await listPurchaseOrders(orgId)
    return response(purchaseOrders as PurchaseOrderWithRelations[])
  } catch (error) {
    return { success: false, data: [], error: error instanceof Error ? error.message : "Failed to fetch purchase orders" }
  }
}

export async function getOrgPurchaseOrderBYLocationId(organizationId: string, locationId: string) {
  const { orgId } = await scopedOrg(organizationId, "purchases.orders.read")
  const rows = await listPurchaseOrders(orgId)
  return rows.filter((row) => row.location?.id === locationId || row.locationId === locationId)
}

export async function getOrgPurchaseOrderById(id: string, organizationId?: string) {
  const { orgId } = await scopedOrg(organizationId, "purchases.orders.read", { resourceId: id })
  return getPurchaseOrderById(id, orgId)
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload,
): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations>> {
  try {
    const { orgId, userId } = await scopedOrg(payload.organizationId, "purchases.orders.create", {
      auditAllowed: true,
    })
    const created = await createPurchaseOrderService(mapCreatePayload(payload, orgId, userId))
    revalidatePurchaseOrderWorkflow(orgId, created.id)
    return response(created as PurchaseOrderWithRelations, `Purchase order ${created.orderNumber} created successfully`)
  } catch (error) {
    return {
      success: false,
      data: null as unknown as PurchaseOrderWithRelations,
      error: error instanceof Error ? error.message : "Failed to create purchase order",
    }
  }
}

export async function updatePurchaseOrder(
  payload: UpdatePurchaseOrderDTO,
): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations>> {
  try {
    const { orgId, userId } = await scopedOrg(payload.organizationId, "purchases.orders.update", {
      resourceId: payload.id,
      auditAllowed: true,
    })
    const updated = await updatePurchaseOrderService(mapUpdatePayload(payload, orgId, userId))
    revalidatePurchaseOrderWorkflow(orgId, updated.id)
    return response(updated as PurchaseOrderWithRelations, `Purchase order ${updated.orderNumber} updated successfully`)
  } catch (error) {
    return {
      success: false,
      data: null as unknown as PurchaseOrderWithRelations,
      error: error instanceof Error ? error.message : "Failed to update purchase order",
    }
  }
}

export async function deletePurchaseOrder(id: string, organizationId?: string): Promise<PurchaseOrderResponse<null>> {
  try {
    const { orgId, userId } = await scopedOrg(organizationId, "purchases.delete", {
      resourceId: id,
      auditAllowed: true,
    })
    const orderNumber = await deletePurchaseOrderService(id, orgId, userId)
    revalidatePurchaseOrderWorkflow(orgId, id)
    return response(null, `Purchase order ${orderNumber} archived successfully`)
  } catch (error) {
    return { success: false, data: null, error: error instanceof Error ? error.message : "Failed to delete purchase order" }
  }
}

export async function submitPurchaseOrder(id: string, organizationId?: string) {
  const { orgId } = await scopedOrg(organizationId, "purchases.orders.update", {
    resourceId: id,
    auditAllowed: true,
  })
  const updated = await submitPurchaseOrderService(id, orgId)
  revalidatePurchaseOrderWorkflow(orgId, id)
  return response(updated as PurchaseOrderWithRelations, `Purchase order ${updated.orderNumber} submitted for approval`)
}

export async function approvePurchaseOrder(id: string, organizationId?: string, _approvedBy?: string | null) {
  const { orgId, userId } = await scopedOrg(organizationId, "purchases.orders.approve", {
    resourceId: id,
    auditAllowed: true,
  })
  const updated = await approvePurchaseOrderService(id, orgId, userId)
  revalidatePurchaseOrderWorkflow(orgId, id)
  return response(updated as PurchaseOrderWithRelations, `Purchase order ${updated.orderNumber} approved`)
}

export async function cancelPurchaseOrder(id: string, organizationId?: string, reason?: string) {
  const { orgId } = await scopedOrg(organizationId, "purchases.orders.cancel", {
    resourceId: id,
    auditAllowed: true,
  })
  const updated = await cancelPurchaseOrderService(id, orgId, reason)
  revalidatePurchaseOrderWorkflow(orgId, id)
  return response(updated as PurchaseOrderWithRelations, `Purchase order ${updated.orderNumber} cancelled`)
}

export async function closePurchaseOrder(id: string, organizationId?: string) {
  const { orgId } = await scopedOrg(organizationId, "purchases.orders.update", {
    resourceId: id,
    auditAllowed: true,
  })
  const updated = await closePurchaseOrderService(id, orgId)
  revalidatePurchaseOrderWorkflow(orgId, id)
  return response(updated as PurchaseOrderWithRelations, `Purchase order ${updated.orderNumber} completed`)
}

export async function receiveItems(payload: GoodsReceiptPayload): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations>> {
  try {
    const { orgId, userId } = await scopedOrg(payload.organizationId, "purchases.orders.receive", {
      resourceId: payload.id,
      auditAllowed: true,
    })
    const parsed = ReceiveItemsSchema.parse({
      purchaseOrderId: payload.id,
      organizationId: orgId,
      receivedById: userId,
      locationId: payload.locationId,
      notes: payload.notes,
      items: payload.items,
    })
    const result = await receiveItemsService(parsed)
    revalidatePurchaseOrderWorkflow(orgId, payload.id)
    revalidateTag("inventory")
    revalidateTag(`inventory-${orgId}`)
    revalidatePath("/[locale]/dashboard/inventory", "page")
    return response(
      result.purchaseOrder as PurchaseOrderWithRelations,
      `Items received successfully. Goods receipt ${result.receiptNumber} created.`,
    )
  } catch (error) {
    return {
      success: false,
      data: null as unknown as PurchaseOrderWithRelations,
      error: error instanceof Error ? error.message : "Failed to receive items",
    }
  }
}

export async function getGoodsReceiptsForPurchaseOrder(purchaseOrderId: string, organizationId: string) {
  const { orgId } = await scopedOrg(organizationId, "purchases.orders.read", { resourceId: purchaseOrderId })
  return getGoodsReceipts(purchaseOrderId, orgId)
}

export async function getPurchaseOrdersSummary(organizationId: string) {
  const { orgId } = await scopedOrg(organizationId, "purchases.orders.read")
  return getSummary(orgId)
}

export async function bulkUpdatePurchaseOrderStatus(params: {
  organizationId: string
  purchaseOrderIds: string[]
  toStatus: PurchaseOrderStatus
  reason?: string
}): Promise<PurchaseOrderResponse<{ updated: string[]; failed: { id: string; error: string }[] }>> {
  const { orgId } = await scopedOrg(params.organizationId, permissionForBulkStatus(params.toStatus), {
    auditAllowed: true,
  })
  const parsed = BulkStatusUpdateSchema.parse({ ...params, organizationId: orgId })
  const result = await bulkUpdateStatus(parsed)
  revalidatePurchaseOrderWorkflow(orgId)
  return response(result, `Bulk update completed. Updated: ${result.updated.length}, failed: ${result.failed.length}`)
}

export async function clonePurchaseOrder(params: {
  id: string
  organizationId: string
  overrides?: Partial<{
    supplierId: string
    locationId: string
    date: string
    expectedDeliveryDate: string
    notes: string
    paymentTerms: string
    shippingCost: number
  }>
}): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations>> {
  const { orgId, userId } = await scopedOrg(params.organizationId, "purchases.orders.create", {
    resourceId: params.id,
    auditAllowed: true,
  })
  const parsed = ClonePurchaseOrderSchema.parse({ ...params, organizationId: orgId })
  const cloned = await clonePurchaseOrderService(parsed, userId)
  revalidatePurchaseOrderWorkflow(orgId, cloned.id)
  return response(cloned as PurchaseOrderWithRelations, `Purchase order ${cloned.orderNumber} cloned successfully`)
}

export async function getPurchaseOrdersRequiringAttention(params: { organizationId: string; limit?: number }) {
  const { orgId } = await scopedOrg(params.organizationId, "purchases.orders.read")
  return getRequiringAttention(orgId, params.limit)
}

export async function exportPurchaseOrders(organizationId: string) {
  const { orgId } = await scopedOrg(organizationId, "purchases.orders.read")
  return exportToCSV(orgId)
}

export async function getPurchaseOrderAnalytics(params: {
  organizationId: string
  from?: string
  to?: string
  topSuppliersLimit?: number
}) {
  const { orgId } = await scopedOrg(params.organizationId, "purchases.orders.read")
  const parsed = POAnalyticsSchema.parse({ ...params, organizationId: orgId })
  return getAnalytics(parsed)
}

export async function getPurchaseOrderStatusHistory(params: { id: string; organizationId: string }) {
  const { orgId } = await scopedOrg(params.organizationId, "purchases.orders.read", { resourceId: params.id })
  return getStatusHistory(params.id, orgId)
}

export async function searchLocations(params: { organizationId: string; q: string; limit?: number }) {
  const { orgId } = await scopedOrg(params.organizationId, "purchases.orders.read")
  return searchPurchaseOrderLocations(orgId, params.q, params.limit)
}
