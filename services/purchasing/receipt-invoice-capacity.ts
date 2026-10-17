import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"

type ReceiptLine = { id: string; goodsReceiptId: string; purchaseOrderLineId: string; itemId: string }
const selectReturns = { lines: true, reversalOfPurchaseReturn: { include: { lines: true } } } satisfies Prisma.PurchaseReturnInclude
type Return = Prisma.PurchaseReturnGetPayload<{ include: typeof selectReturns }>
const invalid = () => new BusinessRuleError("Receipt return quantities require review before invoice preparation.", "INVOICE_EVIDENCE_REQUIRED")

function validLines(value: Pick<Return, "id" | "organizationId" | "lines">) {
  if (!value.lines.length || new Set(value.lines.map(line => line.sourceGoodsReceiptLineId)).size !== value.lines.length) throw invalid()
  for (const line of value.lines) {
    if (line.organizationId !== value.organizationId || line.purchaseReturnId !== value.id || line.quantity.lte(0) ||
      line.invoicedQuantity.lt(0) || line.uninvoicedQuantity.lt(0) || !line.quantity.eq(line.invoicedQuantity.plus(line.uninvoicedQuantity))) throw invalid()
  }
}

/** Returned invoiced goods are already counted in invoice reservations. Only
 * uninvoiced returns reduce remaining capacity; an exact whole-return reversal
 * restores it. Accounting success is separate from this immutable stock fact. */
export async function netUninvoicedReceiptReturns(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; supplierId: string; lines: ReceiptLine[] },
) {
  const refs = new Map(input.lines.map(line => [line.id, line]))
  const result = new Map<string, Prisma.Decimal>()
  if (!refs.size) return result
  const receiptIds = [...new Set(input.lines.map(line => line.goodsReceiptId))].sort()
  // New returns lock their receipt FOR UPDATE. Hold this lock through invoice
  // validation and persistence so a return cannot invalidate capacity mid-write.
  await tx.$queryRaw(Prisma.sql`SELECT id FROM goods_receipts WHERE "organizationId" = ${input.organizationId} AND id IN (${Prisma.join(receiptIds)}) ORDER BY id FOR SHARE`)
  const returns = await tx.purchaseReturn.findMany({
    where: { organizationId: input.organizationId, lines: { some: { sourceGoodsReceiptLineId: { in: [...refs.keys()] } } } },
    include: selectReturns,
    orderBy: { id: "asc" },
  })
  const reversed = new Set<string>()
  for (const value of returns) {
    validLines(value)
    if (value.organizationId !== input.organizationId || value.supplierId !== input.supplierId) throw invalid()
    if (value.direction === "REVERSAL") {
      const original = value.reversalOfPurchaseReturn
      if (!original || value.reversalOfPurchaseReturnId !== original.id || original.direction !== "CORRECTION" ||
        original.reversalOfPurchaseReturnId || reversed.has(original.id) || original.organizationId !== value.organizationId ||
        original.supplierId !== value.supplierId || original.goodsReceiptId !== value.goodsReceiptId ||
        original.purchaseOrderId !== value.purchaseOrderId || original.lines.length !== value.lines.length) throw invalid()
      validLines(original)
      reversed.add(original.id)
      for (const line of value.lines) {
        const source = original.lines.find(row => row.sourceGoodsReceiptLineId === line.sourceGoodsReceiptLineId)
        if (!source || source.sourcePurchaseOrderLineId !== line.sourcePurchaseOrderLineId || source.itemId !== line.itemId ||
          !source.quantity.eq(line.quantity) || !source.invoicedQuantity.eq(line.invoicedQuantity) || !source.uninvoicedQuantity.eq(line.uninvoicedQuantity) ||
          !source.unitCost.eq(line.unitCost) || !source.inventoryAmount.eq(line.inventoryAmount) ||
          !source.supplierClaimAmount.eq(line.supplierClaimAmount) || !source.grniAmount.eq(line.grniAmount)) throw invalid()
      }
    } else if (value.direction !== "CORRECTION" || value.reversalOfPurchaseReturnId) throw invalid()
    for (const line of value.lines) {
      const ref = refs.get(line.sourceGoodsReceiptLineId)
      if (!ref) continue
      if (value.goodsReceiptId !== ref.goodsReceiptId || line.sourcePurchaseOrderLineId !== ref.purchaseOrderLineId || line.itemId !== ref.itemId) throw invalid()
      const signed = value.direction === "CORRECTION" ? line.uninvoicedQuantity : line.uninvoicedQuantity.negated()
      result.set(ref.id, (result.get(ref.id) ?? new Prisma.Decimal(0)).plus(signed))
    }
  }
  for (const value of result.values()) if (value.lt(0)) throw invalid()
  return result
}
