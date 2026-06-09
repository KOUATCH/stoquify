import { z } from "zod"

const NAME_MAX = 100
const DESC_MAX = 500

export const BrandCreateSchema = z.object({
  nameEn: z
    .string()
    .trim()
    .min(2, "English brand name must be at least 2 characters")
    .max(NAME_MAX, `English brand name must be at most ${NAME_MAX} characters`),
  nameFr: z
    .string()
    .trim()
    .max(NAME_MAX, `French brand name must be at most ${NAME_MAX} characters`)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  descriptionEn: z
    .string()
    .trim()
    .max(DESC_MAX)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  descriptionFr: z
    .string()
    .trim()
    .max(DESC_MAX)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  logoUrl: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null))
    .pipe(z.string().url().nullable()),
})

export const BrandUpdateSchema = BrandCreateSchema.partial().extend({
  slug: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
})

export type BrandCreateInput = z.infer<typeof BrandCreateSchema>
export type BrandUpdateInput = z.infer<typeof BrandUpdateSchema>
