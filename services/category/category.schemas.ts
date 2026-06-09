import { z } from "zod"

const TITLE_MAX = 120
const DESC_MAX = 500

export const CategoryCreateSchema = z.object({
  titleEn: z
    .string()
    .trim()
    .min(2, "English title must be at least 2 characters")
    .max(TITLE_MAX, `English title must be at most ${TITLE_MAX} characters`),
  titleFr: z
    .string()
    .trim()
    .max(TITLE_MAX, `French title must be at most ${TITLE_MAX} characters`)
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
  imageUrl: z
    .string()
    .trim()
    .max(2048, "Image URL must be at most 2048 characters")
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  parentId: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  isActive: z.boolean().optional(),
})

export const CategoryUpdateSchema = CategoryCreateSchema.partial().extend({
  slug: z.string().min(1).max(150).optional(),
  isActive: z.boolean().optional(),
})

export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>
