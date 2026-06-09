import { ModernEditPurchaseOrderForm } from "@/components/purchase-orders/ModernEditPurchaseOrderForm"
import { getAuthenticatedUser } from "@/config/useAuth"
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
  const { id } = await params
  const user = await getAuthenticatedUser()

  if (!id || !user?.organizationId) {
    notFound()
  }

  const purchaseOrder = await getPurchaseOrderById(id, user.organizationId).catch(() => null)
  if (!purchaseOrder || purchaseOrder.status !== "DRAFT") {
    notFound()
  }

  const options = await getPurchaseOrderFormOptions(user.organizationId)

  return (
    <ModernEditPurchaseOrderForm
      purchaseOrder={purchaseOrder}
      suppliers={options.suppliers}
      locations={options.locations}
      items={options.items}
      organizationId={user.organizationId}
    />
  )
}
