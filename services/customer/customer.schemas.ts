import { z } from "zod"

const trimmedNonEmpty = z.string().trim().min(1)
const optionalNullableTrimmed = z
  .string()
  .trim()
  .min(1)
  .nullish()
  .transform((v) => (v === "" || v === undefined ? null : v))

export const CustomerCreateSchema = z.object({
  name: trimmedNonEmpty.max(200, "Name must be at most 200 characters"),
  code: z.string().trim().min(1).max(50).nullish(),
  email: z.string().trim().email("Invalid email").nullish().or(z.literal("").transform(() => null)),
  phone: optionalNullableTrimmed,
  address: z.string().trim().max(500).nullish(),
  taxId: optionalNullableTrimmed,
  creditLimit: z.coerce.number().min(0).nullish(),
  paymentTerms: z.coerce.number().int().min(0).max(365).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  isActive: z.boolean().default(true),
  preferredLocale: z.enum(["EN", "FR"]).default("EN"),
})

export const CustomerUpdateSchema = CustomerCreateSchema.partial()

export const CustomerListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().default(""),
  isActive: z.boolean().optional(),
})

export const CustomerExportScopeSchema = z.enum(["customers", "customer", "customer-orders"])

export const CustomerExportFiltersSchema = z.object({
  status: z.enum(["all", "active", "inactive"]).optional().default("all"),
  activity: z
    .enum(["all", "open-orders", "unpaid", "over-limit", "with-orders", "no-orders"])
    .optional()
    .default("all"),
  preferredLocale: z.enum(["all", "EN", "FR"]).optional().default("all"),
  search: z.string().trim().max(200).optional().default(""),
  orderStatus: z
    .enum(["all", "DRAFT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])
    .optional()
    .default("all"),
})

export const CustomerExportRequestSchema = z
  .object({
    scope: CustomerExportScopeSchema.optional().default("customers"),
    customerId: z.string().trim().min(1).optional(),
    customerIds: z.array(z.string().trim().min(1)).max(5000).optional(),
    purpose: z.string().trim().min(3).max(160).optional().default("CUSTOMER_DATA_EXPORT"),
    fileType: z.literal("csv").optional().default("csv"),
    filters: CustomerExportFiltersSchema.optional().default({}),
  })
  .superRefine((value, ctx) => {
    if (value.scope !== "customers" && !value.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerId"],
        message: "Customer is required for this export scope",
      })
    }
  })

const dateInputSchema = z.union([z.date(), z.string(), z.number()]).optional()

export const CustomerExportCommandSchema = CustomerExportRequestSchema.and(
  z.object({
    organizationId: z.string().trim().min(1),
    actorId: z.string().trim().min(1).optional().nullable(),
    actorPermissions: z.array(z.string().trim().min(1)).optional().default([]),
    lastAuthAt: dateInputSchema,
    now: dateInputSchema,
  }),
)

export type CustomerCreateInput = z.infer<typeof CustomerCreateSchema>
export type CustomerUpdateInput = z.infer<typeof CustomerUpdateSchema>
export type CustomerListParams = z.infer<typeof CustomerListParamsSchema>
export type CustomerExportRequest = z.input<typeof CustomerExportRequestSchema>
export type CustomerExportCommand = z.input<typeof CustomerExportCommandSchema>
export type CustomerExportFilters = z.output<typeof CustomerExportFiltersSchema>
