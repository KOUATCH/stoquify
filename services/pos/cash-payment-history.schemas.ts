import { CashDrawerTransactionType, PaymentMethod, PaymentStatus } from "@prisma/client"
import { z } from "zod"

export const CASH_PAYMENT_HISTORY_PAGE_SIZES = [25, 50, 100] as const

const pageSizeSchema = z
  .number()
  .int()
  .refine(
    (value): value is (typeof CASH_PAYMENT_HISTORY_PAGE_SIZES)[number] =>
      CASH_PAYMENT_HISTORY_PAGE_SIZES.includes(value as (typeof CASH_PAYMENT_HISTORY_PAGE_SIZES)[number]),
    "Unsupported page size.",
  )

export const cashPaymentHistoryFiltersSchema = z
  .object({
    lane: z.enum(["cash", "payment", "all"]).optional(),
    locationId: z.string().trim().min(1).optional(),
    cashierId: z.string().trim().min(1).optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    cashType: z.nativeEnum(CashDrawerTransactionType).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    effectiveAsOf: z.coerce.date().optional(),
    cursor: z.string().max(4096).optional(),
    pageSize: pageSizeSchema.default(50),
  })
  .strict()

export const cashPaymentHistoryInputSchema = z
  .object({
    organizationId: z.string().min(1),
    actorUserId: z.string().min(1),
    accessMode: z.enum(["own", "manager"]),
    actorPermissions: z.array(z.string()).default([]),
    filters: cashPaymentHistoryFiltersSchema.optional(),
  })
  .strict()

export type CashPaymentHistoryFilters = z.infer<typeof cashPaymentHistoryFiltersSchema>
export type CashPaymentHistoryInput = z.infer<typeof cashPaymentHistoryInputSchema>
