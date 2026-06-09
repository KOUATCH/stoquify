import { z } from "zod"

export const financeDashboardViewSchema = z.enum([
  "overview",
  "payments",
  "receivables",
  "payables",
  "cash-flow",
  "sales",
  "costs",
  "profitability",
  "analytics",
  "retail",
])

export const financeDashboardPeriodSchema = z.enum(["today", "yesterday", "7d", "30d", "mtd", "qtd", "ytd", "custom"])

export const financeDashboardInputSchema = z.object({
  view: financeDashboardViewSchema.default("overview"),
  locationId: z.string().min(1).optional(),
  period: financeDashboardPeriodSchema.default("mtd"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

export const financeDashboardServiceSchema = financeDashboardInputSchema.extend({
  organizationId: z.string().min(1, "Organization is required"),
})

export type FinanceDashboardView = z.infer<typeof financeDashboardViewSchema>
export type FinanceDashboardPeriod = z.infer<typeof financeDashboardPeriodSchema>
export type FinanceDashboardInput = z.infer<typeof financeDashboardInputSchema>
export type FinanceDashboardServiceInput = z.infer<typeof financeDashboardServiceSchema>
