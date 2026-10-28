import { z, type RefinementCtx } from "zod"

export const itemOrganizationIdSchema = z.string().min(1, "Organization ID is required")

export const itemNameEnSchema = z
  .string()
  .trim()
  .min(1, "English name is required")
  .max(255)

export const itemSkuSchema = z
  .string()
  .trim()
  .min(1, "SKU is required")
  .max(128)

export function itemNonNegativeNumberSchema(message?: string) {
  const schema = z.coerce.number()
  return message ? schema.min(0, message) : schema.min(0)
}

export const nullableTrimmedItemText = (max: number) =>
  z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(max).nullable().optional(),
  )

export const itemImageReferenceSchema = z
  .string()
  .trim()
  .min(1, "Product image is required")
  .refine(
    (value) => value.startsWith("/") || z.string().url().safeParse(value).success,
    "Product image must be a valid URL",
  )

export function validateItemStockRange(
  data: { minStockLevel: number; maxStockLevel?: number | null },
  ctx: RefinementCtx,
) {
  if (
    data.maxStockLevel !== null &&
    data.maxStockLevel !== undefined &&
    data.maxStockLevel < data.minStockLevel
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Maximum stock level must be greater than or equal to minimum stock level",
      path: ["maxStockLevel"],
    })
  }
}
