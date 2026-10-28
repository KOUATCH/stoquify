"use server"

import { requirePermission } from "@/lib/security/rbac"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import {
  getGoodsReceipts,
  getSummary,
} from "@/services/purchase-order/purchase-order.service"

type GoodsReceiptRow = Awaited<ReturnType<typeof getGoodsReceipts>>[number]

export type GoodsReceiptWithRelations = Omit<GoodsReceiptRow, "lines" | "receivedBy"> & {
  lines: Array<
    Omit<GoodsReceiptRow["lines"][number], "item" | "receivedQuantity" | "unitCost" | "lineTotal"> & {
      receivedQuantity: number
      unitCost: number
      lineTotal: number
      item: GoodsReceiptRow["lines"][number]["item"] & { name: string }
    }
  >
  receivedBy: (NonNullable<GoodsReceiptRow["receivedBy"]> & { name: string }) | null
}

export type PurchaseOrderSummary = {
  totalOrders: number
  statusBreakdown: {
    draft: number
    submitted: number
    approved: number
    partiallyReceived: number
    received: number
    cancelled: number
    closed: number
  }
  totalValue: number
  overdueOrders: number
}

function userDisplayName(user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  if (!user) return ""
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || ""
}

function toNumber(value: unknown): number {
  if (value == null) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  if (typeof value === "object" && "toString" in value) return Number(value.toString()) || 0
  return 0
}

async function scopedOrg(organizationId: string) {
  const { orgId } = await requirePermission("purchases.orders.read", {
    resource: "PurchaseOrder",
    auditAllowed: false,
  })
  if (organizationId !== orgId) {
    throw new BusinessRuleError("You do not have access to this organization")
  }
  return orgId
}

export async function getGoodsReceiptsForPurchaseOrder(
  purchaseOrderId: string,
  organizationId: string,
): Promise<GoodsReceiptWithRelations[]> {
  if (!purchaseOrderId) throw new BusinessRuleError("Purchase order ID is required")
  const orgId = await scopedOrg(organizationId)
  const receipts = await getGoodsReceipts(purchaseOrderId, orgId)

  return receipts.map((receipt) => ({
    ...receipt,
    receivedBy: receipt.receivedBy
      ? {
          ...receipt.receivedBy,
          name: userDisplayName(receipt.receivedBy),
        }
      : null,
    lines: receipt.lines.map((line) => ({
      ...line,
      receivedQuantity: toNumber(line.receivedQuantity),
      unitCost: toNumber(line.unitCost),
      lineTotal: toNumber(line.lineTotal),
      item: {
        ...line.item,
        name: line.item.nameEn || line.item.nameFr || line.item.sku,
      },
    })),
  }))
}

export async function getPurchaseOrdersSummary(organizationId: string): Promise<PurchaseOrderSummary> {
  const orgId = await scopedOrg(organizationId)
  const summary = await getSummary(orgId)
  return {
    totalOrders: summary.totalOrders,
    statusBreakdown: {
      draft: summary.statusBreakdown.draft,
      submitted: summary.statusBreakdown.submitted,
      approved: summary.statusBreakdown.approved,
      partiallyReceived: summary.statusBreakdown.partiallyReceived,
      received: summary.statusBreakdown.received,
      cancelled: summary.statusBreakdown.cancelled,
      closed: summary.statusBreakdown.completed,
    },
    totalValue: Number(summary.totalValue),
    overdueOrders: summary.overdueOrders,
  }
}
