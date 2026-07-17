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

export type CustomerCreateInput = z.infer<typeof CustomerCreateSchema>
export type CustomerUpdateInput = z.infer<typeof CustomerUpdateSchema>
export type CustomerListParams = z.infer<typeof CustomerListParamsSchema>
