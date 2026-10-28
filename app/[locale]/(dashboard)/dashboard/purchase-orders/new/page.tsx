import { getLocale } from "next-intl/server"

import { createPurchaseOrder } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { ModernCreatePurchaseOrderForm } from "@/components/purchase-orders/ModernCreatePurchaseOrderForm"
import { getAuthenticatedUser } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import { localizedRedirect } from "@/i18n/server-routing"
import { getPurchaseOrderFormOptions } from "@/services/purchase-order/purchase-order.service"
import { routeByKey, withPurchaseOrdersSurfaceAccess } from "../purchase-orders-route-access"

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
  const surface = routeByKey("purchase-orders-new")

  if (!surface) {
    throw new Error("Missing purchase orders route surface definition: purchase-orders-new")
  }

  return withPurchaseOrdersSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async (_ctx, _ctxLocale) => {
      const options = await getPurchaseOrderFormOptions(_ctx.orgId)

      return (
        <ModernCreatePurchaseOrderForm
          action={handleCreatePurchaseOrder}
          suppliers={options.suppliers}
          locations={options.locations}
          items={options.items}
          organizationId={_ctx.orgId}
        />
      )
    },
  })
}
