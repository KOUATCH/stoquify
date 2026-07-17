import { z } from "zod"

const nullableTerminalText = z
  .string()
  .trim()
  .max(40, "Must be at most 40 characters")
  .or(z.literal(""))
  .nullish()
  .transform((value) => (value ? value : null))

export const TerminalManagementSchema = z.object({
  terminalNumber: nullableTerminalText,
  name: z.string().trim().min(1, "Terminal name is required").max(100, "Must be at most 100 characters"),
  locationId: z.string().trim().min(1, "Location is required"),
  isActive: z.boolean().optional(),
  hasCashDrawer: z.boolean().optional(),
})

export type TerminalManagementInput = z.infer<typeof TerminalManagementSchema>
