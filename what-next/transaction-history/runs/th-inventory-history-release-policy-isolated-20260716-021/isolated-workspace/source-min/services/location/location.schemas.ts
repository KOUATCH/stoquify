import { z } from "zod"
import { LocationType } from "@prisma/client"

export const LocationCreateSchema = z.object({
  name: z.string().min(1, "Location name is required").max(120).trim(),
  address: z.string().max(300).trim().nullish(),
  phone: z.string().max(30).trim().nullish(),
  email: z.string().email().nullish(),
})

export const LocationUpdateSchema = LocationCreateSchema.partial()

const nullableTrimmedText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .nullish()

const nullableEmail = z
  .string()
  .trim()
  .email("Invalid email address")
  .max(254, "Must be at most 254 characters")
  .or(z.literal(""))
  .nullish()
  .transform((value) => (value === "" ? null : value))

export const LocationManagementSchema = z.object({
  name: z.string().trim().min(1, "Location name is required").max(120, "Must be at most 120 characters"),
  code: nullableTrimmedText(40),
  type: z.nativeEnum(LocationType).optional(),
  address: nullableTrimmedText(300),
  phone: nullableTrimmedText(30),
  email: nullableEmail,
  managerId: nullableTrimmedText(100),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  allowNegativeStock: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
})

export type LocationCreateInput = z.infer<typeof LocationCreateSchema>
export type LocationUpdateInput = z.infer<typeof LocationUpdateSchema>
export type LocationManagementInput = z.infer<typeof LocationManagementSchema>
