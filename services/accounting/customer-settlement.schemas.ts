import { z } from "zod"

const idSchema = z.string().trim().min(1).max(191)
const hashSchema = z.string().trim().regex(/^[a-fA-F0-9]{64}$/)
const moneySchema = z.union([z.string().trim().min(1).max(32), z.number().finite()])

export const customerSettlementMethodSchema = z.enum([
  "CASH",
  "CARD",
  "MOBILE_MONEY",
  "BANK_TRANSFER",
  "CHEQUE",
])

export const customerSettlementAllocationInputSchema = z.object({
  salesOrderId: idSchema,
  amount: moneySchema,
})

export const collectCustomerSettlementInputSchema = z.object({
  customerId: idSchema,
  method: customerSettlementMethodSchema,
  amount: moneySchema,
  settlementDate: z.union([z.date(), z.string().trim().min(1)]),
  idempotencyKey: z.string().trim().min(8).max(160),
  correlationId: z.string().trim().min(8).max(160),
  externalReference: z.string().trim().min(1).max(160).optional(),
  documentHash: hashSchema,
  evidenceHash: hashSchema,
  notes: z.string().trim().min(1).max(1000).optional(),
  allocations: z.array(customerSettlementAllocationInputSchema).min(1).max(50),
})

export const reverseCustomerSettlementInputSchema = z.object({
  customerSettlementId: idSchema,
  reversalDate: z.union([z.date(), z.string().trim().min(1)]),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(8).max(160),
  correlationId: z.string().trim().min(8).max(160),
  documentHash: hashSchema,
  evidenceHash: hashSchema,
})

export type CollectCustomerSettlementInput = z.input<
  typeof collectCustomerSettlementInputSchema
>

export type ParsedCollectCustomerSettlementInput = z.output<
  typeof collectCustomerSettlementInputSchema
>

export type ReverseCustomerSettlementInput = z.input<
  typeof reverseCustomerSettlementInputSchema
>

export type ParsedReverseCustomerSettlementInput = z.output<
  typeof reverseCustomerSettlementInputSchema
>
