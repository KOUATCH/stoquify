import { UnitType } from "@prisma/client"
import { z } from "zod"

const BILINGUAL_NAME_MAX = 60
const SYMBOL_MAX = 10
const BASE_UNIT_MAX = 60

const OptionalDecimalSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "string") return Number(value)
  return value
}, z.number({ invalid_type_error: "Conversion rate must be a number" }).positive("Conversion rate must be greater than zero").nullable())

export const UnitCreateSchema = z.object({
  nameEn: z
    .string()
    .min(1, "English name is required")
    .max(BILINGUAL_NAME_MAX, `English name must be at most ${BILINGUAL_NAME_MAX} characters`)
    .trim(),
  nameFr: z
    .string()
    .max(BILINGUAL_NAME_MAX, `French name must be at most ${BILINGUAL_NAME_MAX} characters`)
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(SYMBOL_MAX, `Symbol must be at most ${SYMBOL_MAX} characters`)
    .trim(),
  type: z.nativeEnum(UnitType).default(UnitType.QUANTITY),
  baseUnit: z
    .string()
    .max(BASE_UNIT_MAX)
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  conversionRate: OptionalDecimalSchema.default(null),
  isActive: z.boolean().default(true),
})

export const UnitUpdateSchema = UnitCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const UnitManagementSchema = UnitCreateSchema

export type UnitCreateInput = z.infer<typeof UnitCreateSchema>
export type UnitUpdateInput = z.infer<typeof UnitUpdateSchema>
export type UnitManagementInput = z.infer<typeof UnitManagementSchema>
