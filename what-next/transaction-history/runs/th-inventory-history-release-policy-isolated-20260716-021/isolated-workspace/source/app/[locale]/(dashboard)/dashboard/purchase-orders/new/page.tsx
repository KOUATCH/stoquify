import { getLocale } from "next-intl/server"

import { createPurchaseOrder } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { ModernCreatePurchaseOrderForm } from "@/components/purchase-orders/ModernCreatePurchaseOrderForm"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { localizedRedirect } from "@/i18n/server-routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getPurchaseOrderFormOptions } from "@/services/purchase-order/purchase-order.service"

async function handleCreatePurchaseOrder(formData: FormData) {
  "use server"

  const user = await getAuthenticatedUser()
  if (!user?.organizationId) {
    throw new Error("Organization ID is required")
  }

  const result = await createPurchaseOrder({
    organizationId: user.organizationId,
    supplierId: String(formData.get("supplierId") ?? ""),
    locationId: String(formData.get("locationId") ?? ""),
    date: String(formData.get("date") ?? ""),
    expectedDeliveryDate: String(formData.get("expectedDeliveryDate") ?? ""),
    paymentTerms: String(formData.get("paymentTerms") || "Net 30 days"),
    notes: String(formData.get("notes") || ""),
    shippingCost: Number.parseFloat(String(formData.get("shippingCost") || "0")) || 0,
    orderLines: JSON.parse(String(formData.get("orderLines") || "[]")),
  })

  if (!result.success) {
    throw new Error(result.error || "Failed to create purchase order")
  }

  await localizedRedirect("/dashboard/purchase-orders")
}

export default async function CreatePurchaseOrderPage() {
  const locale = pickLocale(await getLocale())
  let ctx: Awaited<ReturnType<typeof requirePermission>>

  try {
    ctx = await requirePermission("purchases.orders.create", {
      resource: "PurchaseOrder",
      auditAllowed: true,
    })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "purchasing",
      surfaceType: "page",
      surface: "/dashboard/purchase-orders/new",
      accessIntent: "write",
      mode: "observe",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Purchase order creation needs an active organization" : "Purchase order creation is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so purchasing can load tenant-scoped create options."
              : "Creating purchase orders requires purchasing create access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard/purchase-orders", locale)}
        />
      )
    }

    throw error
  }

  const options = await getPurchaseOrderFormOptions(ctx.orgId)

  return (
    <ModernCreatePurchaseOrderForm
      action={handleCreatePurchaseOrder}
      suppliers={options.suppliers}
      locations={options.locations}
      items={options.items}
      organizationId={ctx.orgId}
    />
  )
}