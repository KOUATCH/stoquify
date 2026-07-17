import { z } from "zod"

const idSchema = z.string().trim().min(1)
const dateInputSchema = z.union([z.date(), z.string().trim().min(1)]).nullable().optional()

export const accountantPortalInputSchema = z
  .object({
    periodId: idSchema.nullable().optional(),
    startDate: dateInputSchema,
    endDate: dateInputSchema,
    limit: z.number().int().min(1).max(50).optional(),
  })
  .optional()

export const exportAccountantTrustPackInputSchema = z
  .object({
    periodId: idSchema.nullable().optional(),
    startDate: dateInputSchema,
    endDate: dateInputSchema,
    fileType: z.enum(["json"]).default("json"),
    includeLedgerRows: z.boolean().default(false),
  })
  .optional()

export type AccountantPortalInput = z.input<typeof accountantPortalInputSchema>
export type ExportAccountantTrustPackInput = z.input<typeof exportAccountantTrustPackInputSchema>
