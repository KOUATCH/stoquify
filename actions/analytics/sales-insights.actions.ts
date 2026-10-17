"use server"
import { requirePermission } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { protect } from "@/services/_shared/protect"
import { performanceScopeSchema, type PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { financeDashboardViewPermissions } from "@/services/finance/finance-dashboard-access"
import { getSalesCollections, getSalesReceivables } from "@/services/analytics/sales-collections.service"
import { getSalesProducts } from "@/services/analytics/sales-products.service"
import { getSalesCashAttention } from "@/services/analytics/sales-cash-attention.service"

const guard = { permission: "reports.read", auditResource: "SalesInsights", module: { moduleSlug: "sales" as const, accessIntent: "read" as const, mode: "observe" as const } }
export const getSalesCashAttentionAction = protect({ ...guard, module: { ...guard.module, surface: "actions/analytics/sales-insights.actions.ts#getSalesCashAttentionAction" } }, async (input: PerformanceScope, ctx) => {
  await requirePermission("sales.read", { resource: "SalesInsights" })
  const scope = performanceScopeSchema.parse(input)
  return { state: "ready" as const, report: await getSalesCashAttention({ ...scope, organizationId: ctx.isSuperUser && scope.organizationId ? scope.organizationId : ctx.orgId }) }
})
export const getSalesCollectionsAction = protect({ ...guard, module: { ...guard.module, surface: "actions/analytics/sales-insights.actions.ts#getSalesCollectionsAction" } }, async (input: PerformanceScope, ctx) => {
  await requirePermission("sales.read", { resource: "SalesInsights" })
  const scope = performanceScopeSchema.parse(input)
  if (!financeDashboardViewPermissions.payments.some(p => hasRbacPermission(ctx.permissions, p))) return { state: "restricted" as const }
  return { state: "ready" as const, report: await getSalesCollections({ ...scope, organizationId: ctx.isSuperUser && scope.organizationId ? scope.organizationId : ctx.orgId }) }
})
export const getSalesReceivablesAction = protect({ ...guard, module: { ...guard.module, surface: "actions/analytics/sales-insights.actions.ts#getSalesReceivablesAction" } }, async (input: PerformanceScope, ctx) => {
  await requirePermission("sales.read", { resource: "SalesInsights" })
  const scope = performanceScopeSchema.parse(input)
  if (!financeDashboardViewPermissions.receivables.some(p => hasRbacPermission(ctx.permissions, p))) return { state: "restricted" as const }
  return { state: "ready" as const, report: await getSalesReceivables({ ...scope, organizationId: ctx.isSuperUser && scope.organizationId ? scope.organizationId : ctx.orgId }) }
})
export const getSalesProductsAction = protect({ ...guard, module: { ...guard.module, surface: "actions/analytics/sales-insights.actions.ts#getSalesProductsAction" } }, async (input: PerformanceScope, ctx) => {
  await requirePermission("sales.read", { resource: "SalesInsights" })
  const scope = performanceScopeSchema.parse(input)
  if (!hasRbacPermission(ctx.permissions, "inventory.items.read")) return { state: "restricted" as const }
  return { state: "ready" as const, report: await getSalesProducts({ ...scope, organizationId: ctx.isSuperUser && scope.organizationId ? scope.organizationId : ctx.orgId }, {
    stock: hasRbacPermission(ctx.permissions, "inventory.levels.read"), margin: financeDashboardViewPermissions.profitability.some(p => hasRbacPermission(ctx.permissions, p)),
  }) }
})
