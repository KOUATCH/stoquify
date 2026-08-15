import { notFound } from "next/navigation"

import { SupplierPoAcknowledgementWorkbench } from "@/components/purchase-orders/SupplierPoAcknowledgementWorkbench"
import { getSupplierPoAcknowledgementWorkbench } from "@/services/purchase-order/supplier-po-acknowledgement.service"

import { routeByKey, withPurchaseOrdersSurfaceAccess } from "../../purchase-orders-route-access"

export const dynamic = "force-dynamic"

export default async function SupplierPoAcknowledgementPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!id) notFound()
  const surface = routeByKey("purchase-orders-supplier-acknowledgement")
  if (!surface) {
    throw new Error("Missing purchase orders supplier acknowledgement route surface")
  }

  return withPurchaseOrdersSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    permissionOptions: { resourceId: id },
    onAllowed: async (ctx, resolvedLocale) => {
      const workbench = await getSupplierPoAcknowledgementWorkbench({
        organizationId: ctx.orgId,
        purchaseOrderId: id,
      })
      return (
        <SupplierPoAcknowledgementWorkbench
          initialData={workbench}
          locale={resolvedLocale}
        />
      )
    },
  })
}
