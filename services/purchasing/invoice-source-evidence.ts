import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"

type Source = Prisma.SupplierInvoiceGetPayload<{ include: { lines: true; threeWayMatches: true } }>

// Bind the maker's source, not mutable approval/posting metadata or query order.
export function invoicePreparationSourceHash(invoice: Source) {
  return hashBusinessPayload({
    version: 1,
    id: invoice.id, organizationId: invoice.organizationId, supplierId: invoice.supplierId,
    purchaseOrderId: invoice.purchaseOrderId, makerId: invoice.createdById,
    invoiceNumber: invoice.invoiceNumber, invoiceDate: invoice.invoiceDate, dueDate: invoice.dueDate,
    subtotal: invoice.subtotal, taxAmount: invoice.taxAmount, discount: invoice.discount,
    total: invoice.total, currency: invoice.currency, documentHash: invoice.documentHash,
    evidenceHash: invoice.evidenceHash, notes: invoice.notes,
    lines: [...invoice.lines].sort((a, b) => a.id.localeCompare(b.id)).map(line => ({
      id: line.id, organizationId: line.organizationId, supplierInvoiceId: line.supplierInvoiceId,
      goodsReceiptLineId: line.goodsReceiptLineId, purchaseOrderLineId: line.purchaseOrderLineId,
      itemId: line.itemId, description: line.description, quantity: line.quantity,
      unitCost: line.unitCost, taxRate: line.taxRate, taxAmount: line.taxAmount,
      lineTotal: line.lineTotal, notes: line.notes,
    })),
    matches: [...invoice.threeWayMatches].sort((a, b) => a.id.localeCompare(b.id)).map(match => ({
      id: match.id, organizationId: match.organizationId, supplierInvoiceId: match.supplierInvoiceId,
      purchaseOrderId: match.purchaseOrderId, goodsReceiptId: match.goodsReceiptId,
      matchedAt: match.matchedAt, matchedById: match.matchedById, toleranceAmount: match.toleranceAmount,
      varianceAmount: match.varianceAmount, quantityVariance: match.quantityVariance,
      priceVariance: match.priceVariance, evidenceHash: match.evidenceHash,
    })),
  })
}
