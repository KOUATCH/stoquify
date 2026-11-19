import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { allocateReceiptCost } from "@/services/inventory/receipt-cost-allocation"
import { assertPurchaseReturnClaimFunding, readPurchaseReturnAccountingEvidence } from "./receipt-return-recognition"
import { readSupplierCreditAllocationProof } from "./supplier-credit-allocation"

const candidateLimit = 20
const lineLimit = 100

export async function loadSupplierCreditWorkbench(organizationId: string, search = "") {
  return db.$transaction(async tx => {
    const now = new Date()
    const returns = await tx.purchaseReturn.findMany({
      where: {
        organizationId,
        direction: "CORRECTION",
        occurredAt: { lte: now },
        returnNumber: { contains: search.trim().slice(0, 80), mode: "insensitive" },
        reversedByPurchaseReturn: null,
        supplierCreditNotes: { none: { direction: "CORRECTION" } },
        supplier: { organizationId, isActive: true, deletedAt: null },
        lines: { some: { invoicedQuantity: { gt: 0 } } },
      },
      include: {
        supplier: { select: { name: true } },
        purchaseOrder: { select: { orderNumber: true } },
        goodsReceipt: { select: { receiptNumber: true } },
        lines: { orderBy: { id: "asc" }, take: lineLimit + 1 },
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: candidateLimit + 1,
    })

    const candidates = []
    for (const returned of returns.slice(0, candidateLimit)) {
      if (returned.lines.length > lineLimit) continue
      try {
        const effective = await readPurchaseReturnAccountingEvidence(tx, returned)
        const invoiceProofs = effective.recognition?.invoiceProofs
        if (!effective.accountingComplete || effective.recognition?.status !== "VERIFIED" || invoiceProofs?.length !== 1) continue

        const invoice = await tx.supplierInvoice.findFirst({
          where: {
            id: invoiceProofs[0].invoiceId,
            organizationId,
            supplierId: returned.supplierId,
            currency: effective.recognition.currency,
            deletedAt: null,
            postedAt: { not: null },
            postedBusinessEventId: { not: null },
            status: { in: ["POSTED", "PAYMENT_PENDING", "PAID"] },
            OR: [{ purchaseOrderId: returned.purchaseOrderId }, { purchaseOrderId: null }],
          },
          include: { lines: { take: lineLimit + 1 } },
        })
        if (!invoice?.ledgerPostingBatchId || invoice.lines.length > lineLimit) continue
        const posting = await tx.ledgerPostingBatch.findFirst({
          where: { id: invoice.ledgerPostingBatchId, organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, postingPurpose: "SUPPLIER_INVOICE", status: "POSTED", reversedAt: null },
          select: { id: true },
        })
        if (!posting) continue

        const invoiceMappings = returned.lines.filter(line => line.invoicedQuantity.gt(0)).map(line => ({
          line,
          matches: invoice.lines.filter(value => value.organizationId === organizationId
            && value.goodsReceiptLineId === line.sourceGoodsReceiptLineId
            && value.purchaseOrderLineId === line.sourcePurchaseOrderLineId
            && value.itemId === line.itemId),
        }))
        if (!invoiceMappings.length || invoiceMappings.some(({ line, matches }) => matches.length !== 1
          || matches[0].quantity.lt(line.invoicedQuantity) || !matches[0].unitCost.eq(line.unitCost))) continue
        const invoiceLineIds = invoiceMappings.map(value => value.matches[0].id)
        if (new Set(invoiceLineIds).size !== invoiceLineIds.length) continue

        const priorLines = await tx.supplierCreditNoteLine.findMany({
          where: { organizationId, sourceSupplierInvoiceLineId: { in: invoiceLineIds } },
          include: { supplierCreditNote: { include: { lines: true } } },
          take: lineLimit + 1,
        })
        if (priorLines.length > lineLimit) continue
        const priorNotes = [...new Map(priorLines.map(line => [line.supplierCreditNote.id, line.supplierCreditNote])).values()]
        if (priorNotes.some(note => note.organizationId !== organizationId || note.supplierInvoiceId !== invoice.id || note.currency !== invoice.currency)) continue
        for (const note of priorNotes) await readSupplierCreditAllocationProof(tx, note)
        await assertPurchaseReturnClaimFunding(tx, returned, {
          currency: invoice.currency,
          sourceDate: now,
          claims: invoiceMappings.map(({ line }) => ({ returnLineId: line.id, quantity: line.invoicedQuantity, amount: line.supplierClaimAmount })),
        })

        let total = new Prisma.Decimal(0)
        const mapped = invoiceMappings.map(({ line, matches: [invoiceLine] }) => {
          let consumedQuantity = new Prisma.Decimal(0)
          let consumedNet = new Prisma.Decimal(0)
          let consumedTax = new Prisma.Decimal(0)
          for (const prior of priorLines.filter(value => value.sourceSupplierInvoiceLineId === invoiceLine.id)) {
            const sign = prior.supplierCreditNote.direction === "REVERSAL" ? -1 : 1
            consumedQuantity = consumedQuantity.plus(prior.quantity.times(sign))
            consumedNet = consumedNet.plus(prior.lineTotal.minus(prior.taxAmount).times(sign))
            consumedTax = consumedTax.plus(prior.taxAmount.times(sign))
          }
          const allocation = { sourceQuantity: invoiceLine.quantity, consumedQuantity, quantity: line.invoicedQuantity }
          const net = allocateReceiptCost({ ...allocation, sourceValue: invoiceLine.lineTotal.minus(invoiceLine.taxAmount), consumedValue: consumedNet })
          const tax = allocateReceiptCost({ ...allocation, sourceValue: invoiceLine.taxAmount, consumedValue: consumedTax })
          total = total.plus(net.allocatedValue).plus(tax.allocatedValue)
          return { sourcePurchaseReturnLineId: line.id, sourceSupplierInvoiceLineId: invoiceLine.id, description: invoiceLine.description, quantity: line.invoicedQuantity.toString() }
        })
        candidates.push({
          purchaseReturnId: returned.id,
          supplierInvoiceId: invoice.id,
          returnNumber: returned.returnNumber,
          occurredAt: returned.occurredAt.toISOString(),
          supplierName: returned.supplier.name,
          receiptNumber: returned.goodsReceipt.receiptNumber,
          orderNumber: returned.purchaseOrder.orderNumber,
          invoiceNumber: invoice.invoiceNumber,
          currency: invoice.currency,
          total: total.toFixed(2),
          lines: mapped,
        })
      } catch (error) {
        if (!(error instanceof BusinessRuleError)) throw error
        // Incomplete or inconsistent financial evidence cannot become an option.
      }
    }
    return { candidates, truncated: returns.length > candidateLimit }
  }, { timeout: 15000 })
}

export type SupplierCreditWorkbenchData = Awaited<ReturnType<typeof loadSupplierCreditWorkbench>>
