import { TaxType } from "@prisma/client"
import { z } from "zod"

const NAME_MAX = 100
const RATE_SCALE = 100

export const TaxRateCreateSchema = z.object({
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
  rate: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return Number.NaN
    return typeof value === "string" ? Number(value) : value
  }, z.number({ invalid_type_error: "Rate must be a number" })
    .finite("Rate must be a valid number")
    .min(0, "Rate cannot be negative")
    .max(RATE_SCALE, "Rate cannot exceed 100%")),
  type: z.nativeEnum(TaxType).default(TaxType.SALES),
  isActive: z.boolean().default(true),
})

export const TaxRateUpdateSchema = TaxRateCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const TaxRateManagementSchema = TaxRateCreateSchema

export type TaxRateCreateInput = z.infer<typeof TaxRateCreateSchema>
export type TaxRateUpdateInput = z.infer<typeof TaxRateUpdateSchema>
export type TaxRateManagementInput = z.infer<typeof TaxRateManagementSchema>
