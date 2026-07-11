import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import ModernPurchaseOrderDetailPage from "@/components/purchase-orders/ModernPurchaseOrderDetailPage"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { notFound } from "next/navigation"

interface PurchaseOrderDetailPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
  searchParams?: Promise<{
    organizationId?: string
    tab?: string
  }>
}

export default async function PurchaseOrderDetailPage({ params }: PurchaseOrderDetailPageProps) {
  const { id, locale: requestedLocale } = await params
  const locale = pickLocale(requestedLocale)

  if (!id) {
    notFound()
  }

  let ctx: Awaited<ReturnType<typeof requirePermission>>

  try {
    ctx = await requirePermission("purchases.orders.read", {
      resource: "PurchaseOrder",
      resourceId: id,
      auditAllowed: true,
    })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "purchasing",
      surfaceType: "page",
      surface: "/dashboard/purchase-orders/[id]",
      accessIntent: "read",
      mode: "observe",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Purchase order details need an active organization" : "Purchase order details are not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so purchasing can load tenant-scoped purchase order details."
              : "Viewing purchase order details requires purchasing read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard/purchase-orders", locale)}
        />
      )
    }

    throw error
  }

  return <ModernPurchaseOrderDetailPage id={id} organizationId={ctx.orgId} />
}