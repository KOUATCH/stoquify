import { notFound } from "next/navigation"

import { ModernEditPurchaseOrderForm } from "@/components/purchase-orders/ModernEditPurchaseOrderForm"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPurchaseOrderDraftForActor, getPurchaseOrderCurrency, getPurchaseOrderFormOptions } from "@/services/purchase-order/purchase-order.service"
import { requireSession } from "@/lib/security/auth-session"
import { ForbiddenError } from "@/services/_shared/action-errors"
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
      const { claims } = await requireSession()
      if (claims.userId !== ctx.userId || claims.tenantId !== ctx.orgId) throw new ForbiddenError("Current purchase-order identity is required.")
      const purchaseOrder = await getPurchaseOrderDraftForActor(id, { organizationId: ctx.orgId, updatedById: ctx.userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }).catch((error: unknown) => {
        if (error instanceof NotFoundError) notFound()
        throw error
      })
      if (!purchaseOrder) {
        notFound()
      }

      const [options, currency] = await Promise.all([
        getPurchaseOrderFormOptions(ctx.orgId),
        getPurchaseOrderCurrency(ctx.orgId),
      ])

      return (
        <ModernEditPurchaseOrderForm
          key={`${ctx.orgId}:${ctx.userId}:${id}`}
          purchaseOrder={purchaseOrder}
          suppliers={options.suppliers}
          locations={options.locations}
          items={options.items}
          organizationId={ctx.orgId}
          actorId={ctx.userId}
          currency={currency}
        />
      )
    },
  })
}
