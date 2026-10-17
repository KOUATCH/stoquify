import { z } from "zod"

export const performanceScopeSchema = z.object({
  organizationId: z.string().trim().min(1).optional(),
  locationId: z.string().trim().min(1).max(200).optional(),
  preset: z.enum(["today", "yesterday", "7d", "month", "custom"]).default("7d"),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["COMPLETED", "DELIVERED"]).optional(),
  channel: z.enum(["POS", "DELIVERY"]).optional(),
  search: z.string().trim().max(100).optional(),
  cursor: z.string().min(1).max(200).optional(),
  pageSize: z.enum(["10", "25", "50"]).optional(),
}).strict().superRefine((scope, context) => {
  if (scope.preset === "custom" && (!scope.start || !scope.end)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose both custom dates." })
  if (scope.preset !== "custom" && (scope.start || scope.end)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Use custom mode for fixed dates." })
})
export type PerformanceScope = z.input<typeof performanceScopeSchema>
export const performanceKeys = ["preset", "start", "end", "status", "channel", "search", "cursor", "pageSize"] as const

export function readPerformanceScope(search: string, organizationId?: string): { scope: PerformanceScope; invalid: boolean } {
  const params = new URLSearchParams(search)
  if (params.has("reportOrg") && params.get("reportOrg") !== organizationId) return { scope: {}, invalid: false }
  const keys = [...performanceKeys, "locationId"]
  const parsed = performanceScopeSchema.safeParse(Object.fromEntries(keys.filter(key => params.has(key)).map(key => [key, params.get(key)])))
  return { scope: parsed.success ? parsed.data : {}, invalid: !parsed.success || [...keys, "view", "reportOrg"].some(key => params.getAll(key).length > 1) }
}

/** Display exact decimal strings without passing the amount through Number. */
export function formatSalesDecimal(value: string, locale: string) {
  const [whole, fraction] = value.split(".")
  const negativeZero = whole === "-0"
  const integer = negativeZero ? -0 : BigInt(whole)
  const separator = new Intl.NumberFormat(locale).formatToParts(1.1).find(part => part.type === "decimal")?.value ?? "."
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(integer) + (fraction ? separator + fraction : "")
}
