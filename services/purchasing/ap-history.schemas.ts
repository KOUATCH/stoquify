import { PaymentMethod, SupplierInvoiceStatus, SupplierPaymentStatus } from "@prisma/client"
import { z } from "zod"

export const AP_HISTORY_PAGE_SIZES = [25, 50, 100] as const

const pageSizeSchema = z
  .number()
  .int()
  .refine(
    (value): value is (typeof AP_HISTORY_PAGE_SIZES)[number] =>
      AP_HISTORY_PAGE_SIZES.includes(value as (typeof AP_HISTORY_PAGE_SIZES)[number]),
    "Unsupported page size.",
  )

export const apHistoryFiltersSchema = z
  .object({
    lane: z.enum(["invoice", "payment", "all"]).optional(),
    supplierId: z.string().trim().min(1).optional(),
    invoiceStatus: z.nativeEnum(SupplierInvoiceStatus).optional(),
    paymentStatus: z.nativeEnum(SupplierPaymentStatus).optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    effectiveAsOf: z.coerce.date().optional(),
    cursor: z.string().max(4096).optional(),
    pageSize: pageSizeSchema.default(50),
  })
  .strict()

export const apHistoryInputSchema = z
  .object({
    organizationId: z.string().min(1),
    actorUserId: z.string().min(1),
    actorPermissions: z.array(z.string()).default([]),
    filters: apHistoryFiltersSchema.optional(),
  })
  .strict()

export type APHistoryFilters = z.infer<typeof apHistoryFiltersSchema>
export type APHistoryInput = z.infer<typeof apHistoryInputSchema>
