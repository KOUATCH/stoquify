"use server"

import { inventoryAction, type ServerActionResult } from "@/lib/error-handling"
import { hasRbacPermission, requirePermission } from "@/lib/security/rbac"
import { ZodError } from "zod"
import { canonicalErrorToServerActionError, normalizeToCanonicalError } from "@/lib/error-handling/canonical"
import { ForbiddenError, isApplicationError } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { loadTransferDetail, transferWorkflowAvailability, transitionStockTransfer } from "@/services/inventory/inventory-transfer-lifecycle.service"
import { toLocationTransferDTO } from "@/services/inventory/inventory-read.service"
import { readTransferActivity } from "@/services/inventory/inventory-transfer-activity.service"
import type { TransferCommand, TransferDetail } from "@/types/transferLifecycle"
import { revalidatePath, revalidateTag } from "next/cache"

// Preserve safe business-rule explanations through the older inventory wrapper.
function withTransferErrors<I, O>(action: (input: I) => Promise<ServerActionResult<O>>) {
  return async (input: I): Promise<ServerActionResult<O>> => {
    try { return await action(input) } catch (error) {
      if (!isApplicationError(error) && !(error instanceof ZodError)) throw error
      return { success: false, error: canonicalErrorToServerActionError(normalizeToCanonicalError(error)) }
    }
  }
}

async function transferAccess(organizationId: string, transferId: string, write: boolean) {
  const ctx = await requirePermission(write ? "inventory.stock.transfer" : "inventory.levels.read", {
    resource: "StockTransfer", resourceId: transferId, auditAllowed: true,
  })
  if (organizationId !== ctx.orgId) throw new ForbiddenError("Organization mismatch")
  const decision = await observeModuleAccess({
    organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions,
    moduleSlug: "inventory", surfaceType: "action", surface: `inventory.transfer.${write ? "transition" : "detail"}`,
    accessIntent: write ? "write" : "read", mode: "enforce", audit: true,
  })
  if (!decision.allowed) throw new ForbiddenError("Inventory module is not available for this organization")
  return ctx
}

export const getTransferDetail = inventoryAction(withTransferErrors(async (input: {
  organizationId: string; transferId: string
}): Promise<ServerActionResult<TransferDetail>> => {
  const ctx = await transferAccess(input.organizationId, input.transferId, false)
  const transfer = await loadTransferDetail(ctx.orgId, input.transferId)
  const history = await readTransferActivity(ctx.orgId, input.transferId)
  const dto = toLocationTransferDTO(transfer)
  const dispatched = history.find(entry => entry.operation === "DISPATCH")
  if (dispatched) dto.shippedDate = new Date(dispatched.occurredAt)
  const availability = await transferWorkflowAvailability(transfer, ctx.userId)
  return { success: true, data: { transfer: dto, history, blockingIssue: availability.blockingIssue,
    allowedOperations: hasRbacPermission(ctx.permissions, "inventory.stock.transfer") ? availability.allowedOperations : [],
  } }
}), { actionName: "getTransferDetail", component: "InventoryTransfers" })

export const executeTransferCommand = inventoryAction(withTransferErrors(async (input: TransferCommand) => {
  const ctx = await transferAccess(input.organizationId, input.transferId, true)
  const result = await transitionStockTransfer({ ...input, organizationId: ctx.orgId, actorId: ctx.userId })
  for (const tag of ["transfers", `transfers-${ctx.orgId}`, `transfer-${input.transferId}`, "inventory", `inventory-${ctx.orgId}`]) revalidateTag(tag)
  revalidatePath("/[locale]/dashboard/inventory/transfers", "layout")
  revalidatePath("/[locale]/dashboard/inventory", "page")
  return { success: true, data: { transfer: toLocationTransferDTO(result.transfer), replayed: result.replayed } }
}), { actionName: "executeTransferCommand", component: "InventoryTransfers",
  businessContext: { domain: "inventory", operation: "update", resourceType: "stock_transfer", criticalOperation: true },
})
