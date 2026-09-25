"use server"
import { z } from "zod"
import { requirePermission } from "@/lib/security/rbac"
import { protect } from "@/services/_shared/protect"
import { getDailySalesReadModel } from "@/services/analytics/daily-sales-read.service"

const scopeSchema = z.object({
  organizationId: z.string().trim().min(1).optional(),
  locationId: z.string().trim().min(1).optional(),
  date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()]).optional(),
}).strict()

export const getDailySalesReportAction = protect(
  { permission: "reports.read", auditResource: "DailySalesReport", module: { moduleSlug: "sales", accessIntent: "read", mode: "observe", surface: "actions/analytics/daily-sales.actions.ts#getDailySalesReportAction" } },
  async (input: z.input<typeof scopeSchema>, ctx) => {
    // The existing screen requires sales.read and the report requires reports.read.
    // Neither requirement is replaced by the other or supplied by the client.
    await requirePermission("sales.read", { resource: "DailySalesReport" })
    const scope = scopeSchema.parse(input)
    return getDailySalesReadModel({ ...scope, organizationId: ctx.isSuperUser && scope.organizationId ? scope.organizationId : ctx.orgId })
  },
)
