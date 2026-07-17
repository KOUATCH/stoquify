import { z } from "zod"

export const paymentReconciliationWorkbenchPeriodSchema = z.enum([
  "today",
  "yesterday",
  "7d",
  "30d",
  "mtd",
  "qtd",
  "ytd",
  "custom",
])

export const paymentReconciliationWorkbenchInputSchema = z.object({
  locationId: z.string().min(1).optional(),
  period: paymentReconciliationWorkbenchPeriodSchema.default("mtd"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export const paymentReconciliationWorkbenchServiceSchema =
  paymentReconciliationWorkbenchInputSchema.extend({
    organizationId: z.string().min(1, "Organization is required"),
  })

export type PaymentReconciliationWorkbenchPeriod = z.infer<
  typeof paymentReconciliationWorkbenchPeriodSchema
>
export type PaymentReconciliationWorkbenchInput = z.infer<
  typeof paymentReconciliationWorkbenchInputSchema
>
export type PaymentReconciliationWorkbenchServiceInput = z.infer<
  typeof paymentReconciliationWorkbenchServiceSchema
>
