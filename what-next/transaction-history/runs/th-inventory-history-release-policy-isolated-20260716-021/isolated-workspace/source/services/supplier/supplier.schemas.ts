import { z } from "zod"

const optionalString = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => (v === "" || v === undefined ? null : v))

export const SupplierCreateSchema = z.object({
  name: z.string().trim().min(2, "Supplier name must be at least 2 characters").max(200),
  code: z.string().trim().min(1).max(50).nullish(),
  contactPerson: optionalString,
  email: z.string().trim().email("Invalid email").nullish().or(z.literal("").transform(() => null)),
  phone: optionalString,
  address: optionalString,
  city: optionalString,
  state: optionalString,
  zipCode: optionalString,
  country: optionalString,
  taxId: optionalString,
  paymentTerms: z.coerce.number().int().min(0).max(365).nullish().default(30),
  creditLimit: z.coerce.number().min(0).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  isActive: z.boolean().default(true),
  preferredLocale: z.enum(["EN", "FR"]).default("EN"),
})

export const SupplierUpdateSchema = SupplierCreateSchema.partial()

export const SupplierListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().trim().default(""),
  isActive: z.boolean().optional(),
  sortBy: z.enum(["name", "code", "createdAt", "updatedAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})

export const SupplierSearchSchema = z.object({
  q: z.string().trim().default(""),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export type SupplierCreateInput = z.infer<typeof SupplierCreateSchema>
export type SupplierUpdateInput = z.infer<typeof SupplierUpdateSchema>
export type SupplierListParams = z.infer<typeof SupplierListParamsSchema>
export type SupplierSearchParams = z.infer<typeof SupplierSearchSchema>
