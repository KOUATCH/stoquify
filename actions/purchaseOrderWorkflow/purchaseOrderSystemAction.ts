"use server"
import { readPurchaseOrderDecisionHistory } from "@/services/purchase-order/purchase-order-decision-history";

import { purchaseLifecyclePermission, purchaseLifecycleKindSchema, purchaseLifecycleRequestSchema, type PurchaseLifecycleRequest, type PurchaseLifecycleKind, type PurchaseLifecyclePreview, type PurchaseLifecycleReceipt } from "@/services/purchase-order/purchase-order-lifecycle-contracts";
import { executePurchaseOrderLifecycle as executeLifecycleService, getPurchaseOrderLifecyclePreview } from "@/services/purchase-order/purchase-order.service";

import { revalidatePath, revalidateTag } from "next/cache";

import { requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { requireSession } from "@/lib/security/auth-session";
import { purchaseApprovalRequestSchema, type PurchaseApprovalRequest, type PurchaseApprovalPreview, type PurchaseApprovalReceipt } from "@/services/purchase-order/purchase-order-approval-contracts";
import { ForbiddenError } from "@/services/_shared/action-errors";
import { BusinessRuleError, toSafeActionError } from "@/services/_shared/action-errors";
import { getModuleOperationErrorReason } from "@/lib/modules/module-operation-error";
import {
    BulkStatusUpdateSchema,
    ClonePurchaseOrderSchema,
    CreatePurchaseOrderSchema,
    POAnalyticsSchema,
    UpdatePurchaseOrderSchema,
    type PurchaseOrderStatus,
} from "@/services/purchase-order/purchase-order.schemas";
import {
    approvePurchaseOrder as approvePurchaseOrderService,
    bulkUpdateStatus,
    clonePurchaseOrder as clonePurchaseOrderService,
    createPurchaseOrder as createPurchaseOrderService,
    exportToCSV,
    getAnalytics,
    getGoodsReceipts,
    getPurchaseOrderById,
    getPurchaseOrderDraftForActor,
    getPurchaseOrderApprovalPreview,
    getPurchaseOrderCurrency,
    getRequiringAttention,
    getStatusHistory,
    getSummary,
    listPurchaseOrders,
    searchLocations as searchPurchaseOrderLocations,
    updatePurchaseOrder as updatePurchaseOrderService,
} from "@/services/purchase-order/purchase-order.service";
import { projectPurchaseOrderForActor } from "@/services/purchase-order/purchase-order-capabilities";
import type {
    GoodsReceiptPayload as ClientGoodsReceiptPayload,
    GoodsReceiptInspectionResolutionPayload,
    CreatePurchaseOrderPayload,
    PurchaseOrderFilters,
    PurchaseOrderResponse,
    PurchaseOrderWithRelations,
    UpdatePurchaseOrderDTO,
} from "@/types/purchase-orders-system-types";

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
  options?: { resource?: string; resourceId?: string; auditAllowed?: boolean },
) {
  const ctx = await requirePermission(permission, {
    resource: options?.resource ?? "PurchaseOrder",
    resourceId: options?.resourceId,
    auditAllowed: options?.auditAllowed,
  })
  if (requestedOrganizationId && requestedOrganizationId !== ctx.orgId) {
    throw new BusinessRuleError("You do not have access to this organization")
  }
  if (permission === "purchases.orders.read") {
    const access = await observeModuleAccess({ organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, moduleSlug: "purchasing", surfaceType: "action", surface: "purchaseOrderSystemAction.read", accessIntent: "read", mode: "enforce", audit: true })
    if (!access.allowed) throw new ForbiddenError("Purchasing module read access is unavailable")
  }
  return { orgId: ctx.orgId, userId: ctx.userId, permissions: ctx.permissions }
}

function permissionForBulkStatus(status: PurchaseOrderStatus) {
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

function mapUpdatePayload(payload: UpdatePurchaseOrderDTO, orgId: string, userId: string, session: { sessionId: string; sessionToken: string }) {
  return UpdatePurchaseOrderSchema.parse({
    ...payload,
    organizationId: orgId,
    updatedById: userId,
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
  })
}

export async function getOrgPurchaseOrders(
  organizationId?: string,
  _filters: Partial<PurchaseOrderFilters> = {},
): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations[]>> {
  try {
    const actor = await scopedOrg(organizationId, "purchases.orders.read")
    const [purchaseOrders, currency] = await Promise.all([
      listPurchaseOrders(actor.orgId),
      getPurchaseOrderCurrency(actor.orgId),
    ])
    return response(
      purchaseOrders.map((order) => projectPurchaseOrderForActor(order, actor, currency)) as PurchaseOrderWithRelations[],
    )
  } catch (error) {
    return { success: false, data: [], error: toSafeActionError(error).error }
  }
}

export async function getOrgPurchaseOrderBYLocationId(organizationId: string, locationId: string) {
  const { orgId } = await scopedOrg(organizationId, "purchases.orders.read")
  const rows = await listPurchaseOrders(orgId)
  return rows.filter((row) => row.location?.id === locationId || row.locationId === locationId)
}

export async function getOrgPurchaseOrderById(id: string, organizationId?: string) {
  const actor = await scopedOrg(organizationId, "purchases.orders.read", { resourceId: id })
  const [order, currency] = await Promise.all([
    getPurchaseOrderById(id, actor.orgId),
    getPurchaseOrderCurrency(actor.orgId),
  ])
  return projectPurchaseOrderForActor(order, actor, currency)
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
      ...(getModuleOperationErrorReason(error) ? { code: "FORBIDDEN" as const, reason: getModuleOperationErrorReason(error) } : {}),
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
    const { claims } = await requireSession()
    if (claims.userId !== userId || claims.tenantId !== orgId) throw new ForbiddenError("Current purchase-order identity is required.")
    const updated = await updatePurchaseOrderService(mapUpdatePayload(payload, orgId, userId, claims))
    // The durable receipt remains valid if cache invalidation fails after commit.
    try { revalidatePurchaseOrderWorkflow(orgId, updated.id) } catch { /* A later navigation can fetch the committed record. */ }
    return response(updated as PurchaseOrderWithRelations, `Purchase order ${updated.orderNumber} updated successfully`)
  } catch (error) {
    const safe = toSafeActionError(error)
    return {
      success: false,
      data: null as unknown as PurchaseOrderWithRelations,
      error: safe.error,
      code: safe.code,
    }
  }
}

export async function getCurrentPurchaseOrderDraft(id: string, organizationId: string): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations>> {
  try {
    const { orgId, userId } = await scopedOrg(organizationId, "purchases.orders.update", { resourceId: id })
    const { claims } = await requireSession()
    if (claims.userId !== userId || claims.tenantId !== orgId) throw new ForbiddenError("Current purchase-order identity is required.")
    const current = await getPurchaseOrderDraftForActor(id, { organizationId: orgId, updatedById: userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken })
    return response(current)
  } catch (error) { const safe = toSafeActionError(error); return { success: false, data: null as unknown as PurchaseOrderWithRelations, error: safe.error, code: safe.code } }
}

async function lifecycleScope(id: string, organizationId: string, kind: PurchaseLifecycleKind) {
  const { orgId, userId } = await scopedOrg(organizationId, purchaseLifecyclePermission(kind), { resourceId: id })
  const { claims } = await requireSession()
  if (claims.userId !== userId || claims.tenantId !== orgId) throw new ForbiddenError("Current purchase-order identity is required.")
  return { organizationId: orgId, actorId: userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}

function lifecycleActionError(error: unknown) {
  const safe = toSafeActionError(error)
  // Preserve these bounded domain explanations without changing global error normalization.
  const code = error instanceof BusinessRuleError && ["REVIEW_REQUIRED", "ARCHIVE_STATUS", "RETAINED_OBLIGATIONS", "OPEN_RECEIPT", "REFERENCE_UNAVAILABLE", "RECEIPT_EVIDENCE_REQUIRED"].includes(error.code) ? error.code : safe.code
  return { ...safe, code, reason: getModuleOperationErrorReason(error) }
}

export async function getPurchaseOrderDecisionHistory(lookup: string, organizationId: string) {
  try {
    const { orgId, userId } = await scopedOrg(organizationId, "purchases.orders.read")
    const { claims } = await requireSession()
    if (claims.userId !== userId || claims.tenantId !== orgId) throw new ForbiddenError("Current purchase-order identity is required.")
    return response(await readPurchaseOrderDecisionHistory(lookup, { organizationId: orgId, actorId: userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }))
  } catch (error) { const safe = toSafeActionError(error); return { success: false as const, data: null, error: safe.error, code: safe.code } }
}

export async function previewPurchaseOrderLifecycle(id: string, organizationId: string, kindInput: PurchaseLifecycleKind): Promise<PurchaseOrderResponse<PurchaseLifecyclePreview | null>> {
  try { const kind = purchaseLifecycleKindSchema.parse(kindInput); return response(await getPurchaseOrderLifecyclePreview(id, await lifecycleScope(id, organizationId, kind), kind)) }
  catch (error) { const safe = lifecycleActionError(error); return { success: false, data: null, error: safe.error, code: safe.code, reason: safe.reason } }
}

export async function executePurchaseOrderLifecycle(id: string, organizationId: string, requestInput: PurchaseLifecycleRequest): Promise<PurchaseOrderResponse<{ id: string; lifecycleReceipt: PurchaseLifecycleReceipt } | null>> {
  try {
    const request = purchaseLifecycleRequestSchema.parse(requestInput), scope = await lifecycleScope(id, organizationId, request.kind)
    const result = await executeLifecycleService(id, scope, request)
    try { revalidatePurchaseOrderWorkflow(scope.organizationId, id) } catch { /* A committed receipt remains recoverable when cache invalidation fails. */ }
    return response(result)
  } catch (error) { const safe = lifecycleActionError(error); return { success: false, data: null, error: safe.error, code: safe.code, reason: safe.reason } }
}

export async function deletePurchaseOrder(id: string, organizationId?: string, request?: PurchaseLifecycleRequest) {
  if (!organizationId || request?.kind !== "archive") return { success: false as const, data: null, error: "Review this archive request before confirming.", code: "REVIEW_REQUIRED" }
  return executePurchaseOrderLifecycle(id, organizationId, request)
}
export async function submitPurchaseOrder(id: string, organizationId?: string, request?: PurchaseLifecycleRequest) {
  if (!organizationId || request?.kind !== "submit") return { success: false as const, data: null, error: "Review this submission before confirming.", code: "REVIEW_REQUIRED" }
  return executePurchaseOrderLifecycle(id, organizationId, request)
}

async function approvalScope(id: string, organizationId: string) {
  const { orgId, userId } = await scopedOrg(organizationId, "purchases.orders.approve", { resourceId: id })
  const { claims } = await requireSession()
  if (claims.userId !== userId || claims.tenantId !== orgId) throw new ForbiddenError("Current purchase-order identity is required.")
  return { organizationId: orgId, actorId: userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}

export async function previewPurchaseOrderApproval(id: string, organizationId: string): Promise<PurchaseOrderResponse<PurchaseApprovalPreview | null>> {
  try { return response(await getPurchaseOrderApprovalPreview(id, await approvalScope(id, organizationId))) }
  catch (error) { const safe = toSafeActionError(error); return { success: false, data: null, error: safe.error, code: safe.code } }
}

export async function approvePurchaseOrder(id: string, organizationId: string, request: PurchaseApprovalRequest): Promise<PurchaseOrderResponse<{ id: string; approvalReceipt: PurchaseApprovalReceipt } | null>> {
  try {
    const scope = await approvalScope(id, organizationId)
    const command = purchaseApprovalRequestSchema.parse(request)
    const result = await approvePurchaseOrderService(id, scope.organizationId, scope.actorId, { ...command, ...scope })
    try { revalidatePurchaseOrderWorkflow(scope.organizationId, id) } catch { /* The committed receipt survives cache failure. */ }
    return response(result)
  } catch (error) { const safe = toSafeActionError(error); return { success: false, data: null, error: safe.error, code: safe.code } }
}

export async function cancelPurchaseOrder(id: string, organizationId?: string, reason?: string, request?: PurchaseLifecycleRequest) {
  if (!organizationId || request?.kind !== "cancel" || reason !== request.reason) return { success: false as const, data: null, error: "Review this cancellation before confirming.", code: "REVIEW_REQUIRED" }
  return executePurchaseOrderLifecycle(id, organizationId, request)
}
export async function closePurchaseOrder(id: string, organizationId?: string, request?: PurchaseLifecycleRequest) {
  if (!organizationId || request?.kind !== "complete") return { success: false as const, data: null, error: "Review this completion before confirming.", code: "REVIEW_REQUIRED" }
  return executePurchaseOrderLifecycle(id, organizationId, request)
}

// Older clients must reopen receiving to review current quantities and consequences.
// No unreviewed transport may bypass the receiving decision contract.
export async function receiveItems(payload: GoodsReceiptPayload): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations>> {
  try {
    await scopedOrg(payload.organizationId, "purchases.orders.receive", { resourceId: payload.id })
    return { success: false, data: null as unknown as PurchaseOrderWithRelations, error: "Open the order's receiving panel and review this receipt before confirming.", code: "REVIEW_REQUIRED" }
  } catch (error) { const safe = toSafeActionError(error); return { success: false, data: null as unknown as PurchaseOrderWithRelations, error: safe.error, code: safe.code } }
}
export async function resolveGoodsReceiptInspection(payload: GoodsReceiptInspectionResolutionPayload) {
  try {
    await scopedOrg(payload.organizationId, "purchases.orders.receive", { resource: "GoodsReceipt", resourceId: payload.goodsReceiptId })
    return { success: false as const, data: null, error: "Open the order's receipt history and review this inspection decision before confirming.", code: "REVIEW_REQUIRED" }
  } catch (error) { const safe = toSafeActionError(error); return { success: false as const, data: null, error: safe.error, code: safe.code } }
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
  reviewedRequests?: Array<{ id: string; request: PurchaseLifecycleRequest }>
  reason?: string
}): Promise<PurchaseOrderResponse<{ updated: string[]; failed: { id: string; error: string }[] }>> {
  if (params.toStatus === "APPROVED") {
    throw new BusinessRuleError(
      "Purchase orders cannot be approved in bulk. Use the canonical approval workflow for each order.",
    )
  }

  const { orgId } = await scopedOrg(params.organizationId, permissionForBulkStatus(params.toStatus), {
    auditAllowed: true,
  })
  const parsed = BulkStatusUpdateSchema.parse({ ...params, organizationId: orgId })
  const { claims } = await requireSession()
  const scope = await lifecycleScope("bulk", orgId, params.toStatus === "CANCELLED" ? "cancel" : params.toStatus === "COMPLETED" ? "complete" : "submit")
  if (claims.userId !== scope.actorId || claims.tenantId !== scope.organizationId) throw new ForbiddenError("Current purchase-order identity is required.")
  const result = await bulkUpdateStatus(parsed, scope)
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
}): Promise<PurchaseOrderResponse<PurchaseOrderWithRelations> & {
  failure?: "denied" | "unavailable" | "unknown"
  canEdit?: boolean
}> {
  try {
    const actor = await scopedOrg(params.organizationId, "purchases.orders.create", {
      resourceId: params.id,
      auditAllowed: true,
    })
    const parsed = ClonePurchaseOrderSchema.parse({ ...params, organizationId: actor.orgId })
    const cloned = await clonePurchaseOrderService(parsed, actor.userId)
    revalidatePurchaseOrderWorkflow(actor.orgId, cloned.id)
    return {
      ...response(cloned as PurchaseOrderWithRelations),
      canEdit: actor.permissions.includes("purchases.orders.update"),
    }
  } catch (error) {
    const reason = getModuleOperationErrorReason(error)
    if (reason) return { success: false, data: null as unknown as PurchaseOrderWithRelations, code: "FORBIDDEN", reason, error: "New work is stopped", failure: "denied" }
    const safe = toSafeActionError(error)
    const failure = safe.status === 401 || safe.status === 403
      ? "denied"
      : ["NOT_FOUND", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "CONFLICT"].includes(safe.code)
        ? "unavailable"
        : "unknown"
    // Only a narrow presentation reason crosses this boundary. Internal
    // exception text and metadata remain on the server.
    return { success: false, data: null as unknown as PurchaseOrderWithRelations, ...(safe.code === "FORBIDDEN" ? { code: "FORBIDDEN" as const } : {}), failure }
  }
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
