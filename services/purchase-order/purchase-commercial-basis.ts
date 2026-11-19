import { Prisma } from "@prisma/client"
import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { allocateReceiptCost } from "@/services/inventory/receipt-cost-allocation"

const zero = new Prisma.Decimal(0)
const moneyLimit = new Prisma.Decimal("999999999999.99")
export const purchaseMoney = (value: Prisma.Decimal.Value = 0) => new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
const quantity = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP)
const moneyText = z.string().regex(/^\d{1,12}\.\d{2}$/)
const rateText = z.string().regex(/^\d{1,3}\.\d{3}$/)

export const purchaseReceiptCommercialBasisSchema = z.object({
  version: z.literal(1),
  gross: moneyText,
  discount: moneyText,
  freight: moneyText,
  tax: moneyText,
  taxRate: rateText,
  net: moneyText,
}).strict().superRefine((basis, context) => {
  const gross = purchaseMoney(basis.gross), discount = purchaseMoney(basis.discount)
  if (discount.gt(gross) || quantity(basis.taxRate).gt(100) || !gross.minus(discount).plus(basis.freight).eq(basis.net)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "The receipt commercial amounts do not reconcile." })
  }
})

export type PurchaseReceiptCommercialBasis = z.infer<typeof purchaseReceiptCommercialBasisSchema>

export function pricePurchaseOrderLine(input: {
  quantity: Prisma.Decimal.Value
  unitCost: Prisma.Decimal.Value
  taxRate?: Prisma.Decimal.Value
  discount?: Prisma.Decimal.Value
}) {
  const unitCost = purchaseMoney(input.unitCost), orderedQuantity = quantity(input.quantity)
  const taxRate = quantity(input.taxRate ?? 0), discount = purchaseMoney(input.discount)
  const subtotal = purchaseMoney(orderedQuantity.mul(unitCost))
  if (discount.gt(subtotal)) throw new BusinessRuleError("A purchase line discount cannot exceed its gross merchandise amount.")
  // Preserve the approved PO convention: tax is on gross merchandise, excluding freight.
  const taxAmount = purchaseMoney(subtotal.mul(taxRate).div(100))
  const lineTotal = subtotal.minus(discount).plus(taxAmount)
  if (![orderedQuantity, unitCost, discount, taxRate, subtotal, taxAmount, lineTotal].every(value => value.isFinite() && value.gte(0) && value.lte(moneyLimit))
    || orderedQuantity.lte(0) || orderedQuantity.gt("999999999.999") || unitCost.gt("9999999999.99") || taxRate.gt(100)) {
    throw new BusinessRuleError("The purchase line amounts are outside the supported range.")
  }
  return { orderedQuantity, unitCost, taxRate, discount, subtotal, taxAmount, lineTotal }
}

export function purchaseOrderTotal(subtotal: Prisma.Decimal.Value, discount: Prisma.Decimal.Value, tax: Prisma.Decimal.Value, freight: Prisma.Decimal.Value) {
  const amounts = [subtotal, discount, tax, freight].map(purchaseMoney)
  const [gross, rebate, vat, carriage] = amounts
  const result = gross.minus(rebate).plus(vat).plus(carriage)
  if (![...amounts, result].every(value => value.isFinite() && value.gte(0) && value.lte(moneyLimit))) throw new BusinessRuleError("The purchase order total is outside the supported range.")
  return result
}

type CommercialOrderLine = {
  id: string
  orderedQuantity: Prisma.Decimal.Value
  unitCost: Prisma.Decimal.Value
  discount?: Prisma.Decimal.Value
  taxRate?: Prisma.Decimal.Value
  taxAmount?: Prisma.Decimal.Value
}

type CommercialOrder = {
  id: string
  organizationId: string
  shippingCost?: Prisma.Decimal.Value
  lines: readonly CommercialOrderLine[]
}

type PriorReceiptLine = {
  purchaseOrderLineId: string
  receivedQuantity: Prisma.Decimal.Value
  unitCost?: Prisma.Decimal.Value
  lineTotal: Prisma.Decimal.Value
  commercialBasis?: unknown
}

const commercialReview = () => new BusinessRuleError("Earlier receipt amounts do not reconcile with the approved purchase terms. Review the order before receiving more goods.", "RECEIPT_EVIDENCE_REQUIRED")

const hasPurchaseCharges = (order: CommercialOrder) => purchaseMoney(order.shippingCost).gt(0)
  || order.lines.some(line => purchaseMoney(line.discount).gt(0) || quantity(line.taxRate ?? 0).gt(0) || purchaseMoney(line.taxAmount).gt(0))

export function assertLegacyPurchaseReceiptPricing(order: CommercialOrder, lines: readonly PriorReceiptLine[]) {
  for (const prior of lines) {
    if (prior.commercialBasis != null) continue
    const approved = order.lines.find(line => line.id === prior.purchaseOrderLineId)
    if (!approved || purchaseMoney(order.shippingCost).gt(0) || purchaseMoney(approved.discount).gt(0)) throw commercialReview()
    const unitCost = purchaseMoney(approved.unitCost)
    if ((prior.unitCost !== undefined && !unitCost.eq(prior.unitCost)) || !purchaseMoney(quantity(prior.receivedQuantity).times(unitCost)).eq(prior.lineTotal)) {
      throw commercialReview()
    }
  }
}

function allocated(total: Prisma.Decimal, sourceQuantity: Prisma.Decimal, consumedQuantity: Prisma.Decimal, consumedValue: Prisma.Decimal, drawingQuantity: Prisma.Decimal) {
  try {
    return purchaseMoney(allocateReceiptCost({ sourceQuantity, sourceValue: total, consumedQuantity, consumedValue, quantity: drawingQuantity }).allocatedValue)
  } catch (error) {
    if (error instanceof BusinessRuleError) throw commercialReview()
    throw error
  }
}

export function planPurchaseReceiptCommercialBasis(
  order: CommercialOrder,
  prior: readonly PriorReceiptLine[],
  items: ReadonlyArray<{ lineId: string; receivedQuantity: Prisma.Decimal.Value }>,
) {
  const approved = order.lines.map(line => {
    const priced = pricePurchaseOrderLine({ quantity: line.orderedQuantity, unitCost: line.unitCost, discount: line.discount, taxRate: line.taxRate })
    return { id: line.id, ...priced, taxAmount: line.taxAmount === undefined ? priced.taxAmount : purchaseMoney(line.taxAmount) }
  }).sort((a, b) => a.id.localeCompare(b.id))
  const charged = hasPurchaseCharges(order)
  assertLegacyPurchaseReceiptPricing(order, prior)
  const priorByLine = new Map<string, Array<{ quantity: Prisma.Decimal; gross: Prisma.Decimal; discount: Prisma.Decimal; freight: Prisma.Decimal; tax: Prisma.Decimal; legacy: boolean }>>()
  for (const row of prior) {
    const entries = priorByLine.get(row.purchaseOrderLineId) ?? []
    if (row.commercialBasis == null) {
      entries.push({ quantity: quantity(row.receivedQuantity), gross: purchaseMoney(row.lineTotal), discount: zero, freight: zero, tax: zero, legacy: true })
    } else {
      const basis = purchaseReceiptCommercialBasisSchema.safeParse(row.commercialBasis)
      if (!basis.success || !purchaseMoney(basis.data.net).eq(row.lineTotal)) throw commercialReview()
      entries.push({ quantity: quantity(row.receivedQuantity), gross: purchaseMoney(basis.data.gross), discount: purchaseMoney(basis.data.discount), freight: purchaseMoney(basis.data.freight), tax: purchaseMoney(basis.data.tax), legacy: false })
    }
    priorByLine.set(row.purchaseOrderLineId, entries)
  }

  const plan = new Map<string, PurchaseReceiptCommercialBasis>()
  const totalFreight = purchaseMoney(order.shippingCost)
  const merchandiseTotal = approved.reduce((sum, line) => sum.plus(line.subtotal.minus(line.discount)), zero)
  const weights = approved.map(line => merchandiseTotal.gt(0) ? line.subtotal.minus(line.discount) : line.orderedQuantity)
  const weightTotal = weights.reduce((sum, weight) => sum.plus(weight), zero)
  let drawnWeight = zero, drawnFreight = zero
  for (const [index, line] of approved.entries()) {
    const weight = weights[index]
    const lineFreight = totalFreight.isZero() || weight.isZero() ? zero : allocated(totalFreight, weightTotal, drawnWeight, drawnFreight, weight)
    drawnWeight = drawnWeight.plus(weight)
    drawnFreight = drawnFreight.plus(lineFreight)
    const previous = priorByLine.get(line.id) ?? []
    const sum = (key: "quantity" | "gross" | "discount" | "freight" | "tax") => previous.reduce((total, row) => total.plus(row[key]), zero)
    const consumed = sum("quantity")
    const legacyQuantity = previous.filter(row => row.legacy).reduce((total, row) => total.plus(row.quantity), zero)
    // Legacy receipts already posted full gross value when the PO had no
    // discount or freight. Only their share of approved tax reserves capacity.
    const legacyTax = legacyQuantity.gt(0) && line.taxAmount.gt(0) ? allocated(line.taxAmount, line.orderedQuantity, zero, zero, legacyQuantity) : zero
    const consumedTax = sum("tax").plus(legacyTax)
    if (charged && consumed.eq(line.orderedQuantity) && (!sum("gross").eq(line.subtotal) || !sum("discount").eq(line.discount)
      || !sum("freight").eq(lineFreight) || !consumedTax.eq(line.taxAmount))) throw commercialReview()
    const item = items.find(candidate => candidate.lineId === line.id)
    if (!item) continue
    const received = quantity(item.receivedQuantity)
    const gross = allocated(line.subtotal, line.orderedQuantity, consumed, sum("gross"), received)
    const discount = allocated(line.discount, line.orderedQuantity, consumed, sum("discount"), received)
    const freight = allocated(lineFreight, line.orderedQuantity, consumed, sum("freight"), received)
    const tax = allocated(line.taxAmount, line.orderedQuantity, consumed, consumedTax, received)
    const basis = purchaseReceiptCommercialBasisSchema.safeParse({
      version: 1, gross: gross.toFixed(2), discount: discount.toFixed(2), freight: freight.toFixed(2),
      tax: tax.toFixed(2), taxRate: line.taxRate.toFixed(3), net: gross.minus(discount).plus(freight).toFixed(2),
    })
    if (!basis.success) throw commercialReview()
    plan.set(line.id, basis.data)
  }
  return plan
}

export async function loadPurchaseReceiptCommercialBasis(
  tx: Prisma.TransactionClient,
  order: CommercialOrder,
  items: ReadonlyArray<{ lineId: string; receivedQuantity: Prisma.Decimal.Value }>,
) {
  const existing = await tx.goodsReceiptLine.findMany({
    where: { goodsReceipt: { organizationId: order.organizationId, purchaseOrderId: order.id, status: { in: ["RECEIVED", "COMPLETED", "HELD"] }, deletedAt: null } },
    select: { purchaseOrderLineId: true, receivedQuantity: true, unitCost: true, lineTotal: true, commercialBasis: true },
  })
  return planPurchaseReceiptCommercialBasis(order, existing, items)
}
