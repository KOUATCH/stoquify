import "server-only"
import { Prisma } from "@prisma/client"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"

export async function purchaseReturnSourceInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  purchaseOrderId: string,
  goodsReceiptId: string,
) {
  const receipt = await tx.goodsReceipt.findFirst({
    where: {
      id: goodsReceiptId, organizationId, purchaseOrderId, deletedAt: null,
      status: { in: ["RECEIVED", "COMPLETED"] }, inventoryPostedAt: { not: null },
      purchaseOrder: { organizationId, deletedAt: null },
      location: { organizationId, isActive: true, deletedAt: null },
    },
    select: {
      id: true, receiptNumber: true, inventoryPostedAt: true,
      location: { select: { id: true, name: true } },
      lines: {
        // The quantity-only command cannot select serials or lot/expiry identities.
        where: { item: { organizationId, trackInventory: true, isActive: true, deletedAt: null, trackSerialNumbers: false, trackBatches: false, trackExpiry: false } },
        select: { id: true, itemId: true, receivedQuantity: true, lineTotal: true, item: { select: { nameEn: true, nameFr: true } } },
        orderBy: { id: "asc" },
      },
    },
  })
  if (!receipt) throw new NotFoundError("The source receipt or its inventory location is unavailable.")

  const [returned, stock] = await Promise.all([
    tx.purchaseReturnLine.findMany({
      where: { organizationId, sourceGoodsReceiptLineId: { in: receipt.lines.map(line => line.id) } },
      select: { sourceGoodsReceiptLineId: true, quantity: true, purchaseReturn: { select: { direction: true } } },
    }),
    tx.inventoryLevel.findMany({
      where: { locationId: receipt.location.id, itemId: { in: receipt.lines.map(line => line.itemId) } },
      select: { itemId: true, quantityAvailable: true, version: true },
    }),
  ])
  const sources = receipt.lines.map(line => {
    const balance = stock.find(row => row.itemId === line.itemId)
    const totalReturned = returned.filter(row => row.sourceGoodsReceiptLineId === line.id).reduce((total, row) =>
      total.plus(row.purchaseReturn.direction === "CORRECTION" ? row.quantity : row.quantity.negated()), new Prisma.Decimal(0))
    if (totalReturned.lt(0) || totalReturned.gt(line.receivedQuantity)) throw new BusinessRuleError("Prior return quantities require review.", "RECEIPT_EVIDENCE_REQUIRED")
    const available = Prisma.Decimal.max(0, Prisma.Decimal.min(line.receivedQuantity.minus(totalReturned), balance?.quantityAvailable ?? 0))
    return {
      id: line.id, itemId: line.itemId, nameEn: line.item.nameEn, nameFr: line.item.nameFr ?? line.item.nameEn,
      received: line.receivedQuantity.toFixed(3), returned: totalReturned.toFixed(3), available: available.toFixed(3),
      value: line.lineTotal.toFixed(2), stockVersion: balance?.version ?? null,
    }
  })
  const revision = hashBusinessPayload({ organizationId, purchaseOrderId, goodsReceiptId, locationId: receipt.location.id, postedAt: receipt.inventoryPostedAt?.toISOString(), sources })
  return {
    purchaseOrderId, goodsReceiptId, receiptNumber: receipt.receiptNumber,
    location: receipt.location.name, revision,
    lines: sources.filter(line => new Prisma.Decimal(line.available).gt(0)).map(({ id, nameEn, nameFr, available }) => ({ id, nameEn, nameFr, available })),
  }
}
