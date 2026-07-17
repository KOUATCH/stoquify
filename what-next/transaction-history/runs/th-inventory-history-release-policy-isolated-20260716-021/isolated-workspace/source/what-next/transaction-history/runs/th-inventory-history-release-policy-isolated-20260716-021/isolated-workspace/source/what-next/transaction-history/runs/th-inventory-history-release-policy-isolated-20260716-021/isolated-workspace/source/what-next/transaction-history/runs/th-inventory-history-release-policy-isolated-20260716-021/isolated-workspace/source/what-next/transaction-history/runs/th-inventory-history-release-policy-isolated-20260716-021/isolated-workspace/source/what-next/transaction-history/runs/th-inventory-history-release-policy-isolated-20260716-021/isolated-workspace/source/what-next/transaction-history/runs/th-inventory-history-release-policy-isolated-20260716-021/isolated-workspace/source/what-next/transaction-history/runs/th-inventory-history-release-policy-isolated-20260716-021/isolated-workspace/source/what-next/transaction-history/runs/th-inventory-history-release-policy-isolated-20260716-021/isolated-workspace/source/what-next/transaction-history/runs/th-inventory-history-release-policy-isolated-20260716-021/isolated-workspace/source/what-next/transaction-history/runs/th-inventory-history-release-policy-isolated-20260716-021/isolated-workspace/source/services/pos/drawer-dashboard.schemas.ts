import { z } from "zod"

export const drawerDashboardPeriodSchema = z.enum(["today", "yesterday", "7d", "30d", "mtd", "custom"])

export const drawerDashboardInputSchema = z.object({
  locationId: z.string().min(1).optional(),
  period: drawerDashboardPeriodSchema.default("today"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export const drawerDashboardServiceSchema = drawerDashboardInputSchema.extend({
  organizationId: z.string().min(1, "Organization is required"),
})

export type DrawerDashboardPeriod = z.infer<typeof drawerDashboardPeriodSchema>
export type DrawerDashboardInput = z.infer<typeof drawerDashboardInputSchema>
export type DrawerDashboardServiceInput = z.infer<typeof drawerDashboardServiceSchema>
