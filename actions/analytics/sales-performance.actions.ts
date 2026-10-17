"use server"
import { z } from "zod"
import { requirePermission } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { protect } from "@/services/_shared/protect"
import { performanceScopeSchema, type PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { getSalesPerformance, getSalesPerformanceOrder } from "@/services/analytics/sales-performance.service"

export const getSalesPerformanceAction = protect(
  { permission: "reports.read", auditResource: "SalesPerformance", module: { moduleSlug: "sales", accessIntent: "read", mode: "observe", surface: "actions/analytics/sales-performance.actions.ts#getSalesPerformanceAction" } },
  async (input: PerformanceScope, ctx) => {
    await requirePermission("sales.read", { resource: "SalesPerformance" })
    const scope = performanceScopeSchema.parse(input)
    const report = await getSalesPerformance({ ...scope, organizationId: ctx.isSuperUser && scope.organizationId ? scope.organizationId : ctx.orgId, canReadCustomers: hasRbacPermission(ctx.permissions, "customers.read") })
    return { ...report, canExport: hasRbacPermission(ctx.permissions, "reports.export") }
  },
)
const detailSchema = z.object({ organizationId: z.string().min(1).optional(), orderId: z.string().min(1).max(200) }).strict()
export const getSalesPerformanceOrderAction = protect(
  { permission: "reports.read", auditResource: "SalesPerformance", module: { moduleSlug: "sales", accessIntent: "read", mode: "observe", surface: "actions/analytics/sales-performance.actions.ts#getSalesPerformanceOrderAction" } },
  async (input: z.input<typeof detailSchema>, ctx) => {
    await requirePermission("sales.read", { resource: "SalesPerformance" })
    const scope = detailSchema.parse(input)
    return getSalesPerformanceOrder({ orderId: scope.orderId, organizationId: ctx.isSuperUser && scope.organizationId ? scope.organizationId : ctx.orgId, canReadCustomers: hasRbacPermission(ctx.permissions, "customers.read") })
  },
)
