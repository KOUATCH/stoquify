import { notFound } from "next/navigation"

import { ModernEditPurchaseOrderForm } from "@/components/purchase-orders/ModernEditPurchaseOrderForm"
import { getPurchaseOrderById, getPurchaseOrderFormOptions } from "@/services/purchase-order/purchase-order.service"
import { routeByKey, withPurchaseOrdersSurfaceAccess } from "../../purchase-orders-route-access"

interface PurchaseOrderEditPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function PurchaseOrderEditPage({ params }: PurchaseOrderEditPageProps) {
  const { id, locale } = await params

  if (!id) {
    notFound()
  }

  const surface = routeByKey("purchase-orders-edit")

  if (!surface) {
    throw new Error("Missing purchase orders route surface definition: purchase-orders-edit")
  }

  return withPurchaseOrdersSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    permissionOptions: {
      resourceId: id,
    },
    onAllowed: async (ctx) => {
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
    },
  })
}
