import { Prisma } from "@prisma/client"
import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"

export const RECEIPT_COST_ALLOCATION_VERSION = "RECEIPT_REMAINING_POOL_V2" as const

type AllocationInput = {
  sourceQuantity: Prisma.Decimal.Value
  sourceValue: Prisma.Decimal.Value
  consumedQuantity: Prisma.Decimal.Value
  consumedValue: Prisma.Decimal.Value
  quantity: Prisma.Decimal.Value
}

function exact(value: Prisma.Decimal.Value, places: number) {
  const result = new Prisma.Decimal(value)
  if (!result.isFinite() || result.lt(0) || !result.eq(result.toDecimalPlaces(places))) {
    throw new BusinessRuleError("Receipt allocation requires exact nonnegative source quantities and values.")
  }
  return result
}

function calculate(input: AllocationInput) {
  const sourceQuantity = exact(input.sourceQuantity, 3), sourceValue = exact(input.sourceValue, 2)
  const consumedQuantity = exact(input.consumedQuantity, 3), consumedValue = exact(input.consumedValue, 2)
  const quantity = exact(input.quantity, 3)
  const remainingQuantity = sourceQuantity.minus(consumedQuantity), remainingValue = sourceValue.minus(consumedValue)
  if (sourceQuantity.lte(0) || quantity.lte(0) || quantity.gt(remainingQuantity) || remainingValue.lt(0)
    || consumedQuantity.eq(0) && consumedValue.gt(0)) {
    throw new BusinessRuleError("Receipt allocation exceeds its verified remaining quantity or value.")
  }
  // Consume the final residual exactly. Earlier immutable draws and their exact
  // reversals are supplied as consumed totals; never reprice historical rows.
  const allocatedValue = quantity.eq(remainingQuantity)
    ? remainingValue
    : remainingValue.times(quantity).div(remainingQuantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
  return {
    algorithm: RECEIPT_COST_ALLOCATION_VERSION,
    sourceQuantity: sourceQuantity.toFixed(3), sourceValue: sourceValue.toFixed(2),
    consumedQuantity: consumedQuantity.toFixed(3), consumedValue: consumedValue.toFixed(2),
    quantity: quantity.toFixed(3), allocatedValue: allocatedValue.toFixed(2),
  }
}

const quantityString = z.string().regex(/^\d+\.\d{3}$/)
const valueString = z.string().regex(/^\d+\.\d{2}$/)
export const receiptCostAllocationSchema = z.object({
  algorithm: z.literal(RECEIPT_COST_ALLOCATION_VERSION),
  sourceQuantity: quantityString, sourceValue: valueString,
  consumedQuantity: quantityString, consumedValue: valueString,
  quantity: quantityString, allocatedValue: valueString,
}).strict().superRefine((proof, context) => {
  try {
    if (calculate(proof).allocatedValue === proof.allocatedValue) return
  } catch { /* Invalid persisted proof must fail schema validation. */ }
  context.addIssue({ code: z.ZodIssueCode.custom, message: "Receipt allocation does not match its verified remaining pool." })
})
export type ReceiptCostAllocation = z.infer<typeof receiptCostAllocationSchema>

export function allocateReceiptCost(input: AllocationInput): ReceiptCostAllocation {
  return calculate(input)
}
