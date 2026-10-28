import { z } from "zod"

export const pOSStationSchema = z.object({
  stationNumber: z.string().min(1, "Terminal number is required"),
  name: z.string().min(1, "Terminal name is required"),
  isActive: z.boolean().default(true),
  hasCashDrawer: z.boolean().default(true),
  hasReceiptPrinter: z.boolean().default(true),
  hasBarcodeScanner: z.boolean().default(false),
  hasCardReader: z.boolean().default(false),
  locationId: z.string().min(1, "Location is required"),
  organizationId: z.string().min(1, "Organization is required"),
})

export const updatePosStationSchema = pOSStationSchema.partial().extend({
  id: z.string().min(1, "Terminal ID is required"),
})

export type CreatePosStationInput = z.infer<typeof pOSStationSchema>
export type UpdatePosStationInput = z.infer<typeof updatePosStationSchema>
