import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { ModernEditPurchaseOrderForm } from "@/components/purchase-orders/ModernEditPurchaseOrderForm"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  getPurchaseOrderById,
  getPurchaseOrderFormOptions,
} from "@/services/purchase-order/purchase-order.service"
import { notFound } from "next/navigation"

interface PurchaseOrderEditPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function PurchaseOrderEditPage({ params }: PurchaseOrderEditPageProps) {
  const { id, locale: requestedLocale } = await params
  const locale = pickLocale(requestedLocale)

  if (!id) {
    notFound()
  }

  let ctx: Awaited<ReturnType<typeof requirePermission>>

  try {
    ctx = await requirePermission("purchases.orders.update", {
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
      surface: "/dashboard/purchase-orders/[id]/edit",
      accessIntent: "write",
      mode: "observe",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Purchase order editing needs an active organization" : "Purchase order editing is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so purchasing can load tenant-scoped edit data."
              : "Editing purchase orders requires purchasing update access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard/purchase-orders", locale)}
        />
      )
    }

    throw error
  }

  const purchaseOrder = await getPurchaseOrderById(id, ctx.orgId).catch(() => null)
  if (!purchaseOrder || purchaseOrder.status !== "DRAFT") {
    notFound()
  }

  const options = await getPurchaseOrderFormOptions(ctx.orgId)

  return (
    <ModernEditPurchaseOrderForm
      purchaseOrder={purchaseOrder}
      suppliers={options.suppliers}
      locations={options.locations}
      items={options.items}
      organizationId={ctx.orgId}
    />
  )
}