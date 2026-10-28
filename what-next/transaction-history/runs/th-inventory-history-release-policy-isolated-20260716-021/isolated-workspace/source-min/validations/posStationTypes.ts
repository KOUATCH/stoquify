import { z } from "zod"

export const posStationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  isActive: z.boolean().default(true),
  hasCashDrawer: z.boolean().default(true),
  locationId: z.string().min(1, "Location is required"),
  stationNumber: z.string().min(1, "Terminal is required"),
  organizationId: z.string().min(1, "Organization is required"),
})

export const updatePosStationSchema = posStationSchema.partial().extend({
  id: z.string().min(1, "ID is required"),
})

export type CreatePosStationInput = z.infer<typeof posStationSchema>
export type UpdatePosStationInput = z.infer<typeof updatePosStationSchema>

// Response types
export type   PosStationWithRelations = {
  id: string
  stationNumber: string
  name: string
  isActive: boolean
  hasCashDrawer: boolean
  locationId: string
  organizationId: string
  currentSessionId: string | null
  createdAt: Date
  updatedAt: Date
  location: {
    id: string
    name: string
  }
  organization: {
    id: string
    name: string
  }
  currentSession: {
    id: string
    sessionNumber: string
    status: string
  } | null
}
