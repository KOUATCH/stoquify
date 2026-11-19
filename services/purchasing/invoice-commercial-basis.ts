import { Prisma } from "@prisma/client"
import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { purchaseReceiptCommercialBasisSchema, type PurchaseReceiptCommercialBasis } from "@/services/purchase-order/purchase-commercial-basis"

const amount = z.string().regex(/^\d{1,12}\.\d{2}$/)
const matchSchema = z.object({
  version: z.literal(1),
  receiptBasisHash: z.string().nullable(),
  expected: purchaseReceiptCommercialBasisSchema,
  discount: amount,
  freight: amount,
}).strict()
export type InvoiceCommercialMatch = z.infer<typeof matchSchema>

export const commercialMoney = (value: Prisma.Decimal.Value) =>
  new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)

export function readInvoiceCommercialMatch(metadata: unknown): InvoiceCommercialMatch | undefined {
  if (!metadata || typeof metadata !== "object" || !("purchaseCommercial" in metadata)) return
  const parsed = matchSchema.safeParse(metadata.purchaseCommercial)
  if (!parsed.success) throw new BusinessRuleError("The retained invoice commercial terms require review.", "INVOICE_EVIDENCE_REQUIRED")
  return parsed.data
}

export function readReceiptCommercialBasis(value: unknown): PurchaseReceiptCommercialBasis | undefined {
  if (value == null) return
  const parsed = purchaseReceiptCommercialBasisSchema.safeParse(value)
  if (!parsed.success) throw new BusinessRuleError("The receipt commercial terms require review.", "RECEIPT_EVIDENCE_REQUIRED")
  return parsed.data
}

function basisWithAmounts(basis: PurchaseReceiptCommercialBasis, gross: Prisma.Decimal, discount: Prisma.Decimal, freight: Prisma.Decimal, tax: Prisma.Decimal): PurchaseReceiptCommercialBasis {
  return {
    ...basis,
    gross: gross.toFixed(2), discount: discount.toFixed(2), freight: freight.toFixed(2), tax: tax.toFixed(2),
    net: gross.minus(discount).plus(freight).toFixed(2),
  }
}

export function allocateInvoiceBasis(basis: PurchaseReceiptCommercialBasis, available: Prisma.Decimal, quantity: Prisma.Decimal) {
  const share = (value: string) => commercialMoney(available.isZero() ? 0 : new Prisma.Decimal(value).times(quantity).div(available))
  return basisWithAmounts(basis, share(basis.gross), share(basis.discount), share(basis.freight), share(basis.tax))
}

export function remainingInvoiceBasis(basis: PurchaseReceiptCommercialBasis, used: InvoiceCommercialMatch[], received: Prisma.Decimal, invoiced: Prisma.Decimal, returned: Prisma.Decimal) {
  const left = subtractInvoiceBasis(basis, used, hashBusinessPayload(basis))
  const pool = received.minus(invoiced)
  if (returned.isZero() || pool.lte(0)) return left
  const returnBasis = allocateInvoiceBasis(left, pool, Prisma.Decimal.min(pool, returned))
  return basisWithAmounts(left, commercialMoney(left.gross).minus(returnBasis.gross), commercialMoney(left.discount).minus(returnBasis.discount), commercialMoney(left.freight).minus(returnBasis.freight), commercialMoney(left.tax).minus(returnBasis.tax))
}

export function subtractInvoiceBasis(basis: PurchaseReceiptCommercialBasis, used: InvoiceCommercialMatch[], sourceHash: string) {
  if (used.some(claim => claim.receiptBasisHash !== sourceHash)) throw new BusinessRuleError("Earlier invoices use a different receipt commercial basis.", "INVOICE_EVIDENCE_REQUIRED")
  const remaining = (key: "gross" | "discount" | "freight" | "tax") =>
    used.reduce((value, line) => value.minus(line.expected[key]), commercialMoney(basis[key]))
  const gross = remaining("gross"), discount = remaining("discount"), freight = remaining("freight"), tax = remaining("tax")
  if ([gross, discount, freight, tax].some(value => value.lt(0)) || discount.gt(gross)) {
    throw new BusinessRuleError("Earlier invoice allocations exceed the receipt commercial terms.", "INVOICE_EVIDENCE_REQUIRED")
  }
  return basisWithAmounts(basis, gross, discount, freight, tax)
}

export async function readAvailableInvoiceCommercialBasis(
  tx: Prisma.TransactionClient,
  row: { id: string; commercialBasis: Prisma.JsonValue; receivedQuantity: Prisma.Decimal },
  organizationId: string,
  used: Prisma.Decimal,
  returned: Prisma.Decimal,
  excludeSupplierInvoiceId?: string,
) {
  const basis = readReceiptCommercialBasis(row.commercialBasis)
  if (!basis) return
  const earlier = used.isZero() ? [] : await tx.supplierInvoiceLine.findMany({
    where: {
      organizationId, goodsReceiptLineId: row.id,
      ...(excludeSupplierInvoiceId ? { supplierInvoiceId: { not: excludeSupplierInvoiceId } } : {}),
      supplierInvoice: { organizationId, deletedAt: null, status: { not: "CANCELLED" } },
    },
    select: { metadata: true },
  })
  const claims = earlier.map(({ metadata }) => {
    const terms = readInvoiceCommercialMatch(metadata)
    if (!terms) throw new BusinessRuleError("An earlier invoice lacks receipt commercial allocation evidence.", "INVOICE_EVIDENCE_REQUIRED")
    return terms
  })
  return remainingInvoiceBasis(basis, claims, row.receivedQuantity, used, returned)
}

export function invoiceLineNet(line: { quantity: Prisma.Decimal.Value; unitCost: Prisma.Decimal.Value; metadata?: unknown }) {
  const gross = commercialMoney(new Prisma.Decimal(line.quantity).times(line.unitCost))
  const terms = readInvoiceCommercialMatch(line.metadata)
  if (!terms) return gross
  const net = gross.minus(terms.discount).plus(terms.freight)
  if (net.lt(0)) throw new BusinessRuleError("The retained invoice line net amount is invalid.", "INVOICE_EVIDENCE_REQUIRED")
  return net
}
