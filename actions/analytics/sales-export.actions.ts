"use server"
import { requirePermission } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { protect } from "@/services/_shared/protect"
import { performanceScopeSchema, type PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { prepareSalesPerformanceExport } from "@/services/analytics/sales-performance-export.service"

export const exportSalesPerformanceAction = protect({ permission: "reports.export", auditResource: "SalesPerformanceExport", freshAuth: { maxAgeSeconds: 300 },
  module: { moduleSlug: "sales", accessIntent: "read", mode: "observe", surface: "actions/analytics/sales-export.actions.ts#exportSalesPerformanceAction" },
}, async (input: PerformanceScope, ctx) => {
  await requirePermission("reports.read", { resource: "SalesPerformanceExport" })
  await requirePermission("sales.read", { resource: "SalesPerformanceExport" })
  const scope = performanceScopeSchema.parse(input)
  return prepareSalesPerformanceExport({ scope: { ...scope, organizationId: ctx.isSuperUser && scope.organizationId ? scope.organizationId : ctx.orgId }, actorId: ctx.userId,
    permissions: ctx.permissions, lastAuthAt: ctx.freshAuth!.claims.lastAuthAt, canReadCustomers: hasRbacPermission(ctx.permissions, "customers.read") })
})
