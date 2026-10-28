import { z } from "zod"

const NAME_MAX = 200
const DESC_MAX = 1000

export const ItemCreateSchema = z.object({
  nameEn: z
    .string()
    .min(1, "English name is required")
    .max(NAME_MAX, `English name must be at most ${NAME_MAX} characters`)
    .trim(),
  nameFr: z
    .string()
    .max(NAME_MAX, `French name must be at most ${NAME_MAX} characters`)
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  descriptionEn: z
    .string()
    .max(DESC_MAX)
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  descriptionFr: z
    .string()
    .max(DESC_MAX)
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  sku: z.string().max(100).trim().optional(),
  slug: z.string().max(220).optional(),
  costPrice: z.coerce.number().min(0, "Cost price cannot be negative").default(0),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative").default(0),
  imageUrls: z.union([z.string().url(), z.array(z.string().url())]).optional(),
  thumbnail: z.string().nullable().optional(),
  categoryId: z.string().nullish(),
  brandId: z.string().nullish(),
  unitId: z.string().nullish(),
  taxRateId: z.string().nullish(),
  locationId: z.string().optional(),
  initialQuantity: z.coerce.number().int().min(0).optional(),
  unitCost: z.coerce.number().min(0).optional(),
})

export const ItemUpdateSchema = z.object({
  nameEn: z.string().min(1).max(NAME_MAX).trim().optional(),
  nameFr: z
    .string()
    .max(NAME_MAX)
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  descriptionEn: z
    .string()
    .max(DESC_MAX)
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  descriptionFr: z
    .string()
    .max(DESC_MAX)
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  costPrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  sku: z.string().max(100).trim().optional(),
  thumbnail: z.string().nullable().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  isActive: z.boolean().optional(),
  isDiscontinued: z.boolean().optional(),
})

export const PaginatedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(200).trim().default(""),
})

export type ItemCreateInput = z.infer<typeof ItemCreateSchema>
export type ItemUpdateInput = z.infer<typeof ItemUpdateSchema>
export type PaginatedQueryInput = z.infer<typeof PaginatedQuerySchema>
