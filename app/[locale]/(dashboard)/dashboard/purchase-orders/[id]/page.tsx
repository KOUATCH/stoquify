import { routeByKey, withPurchaseOrdersSurfaceAccess } from "../purchase-orders-route-access"
import ModernPurchaseOrderDetailPage from "@/components/purchase-orders/ModernPurchaseOrderDetailPage"
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
  const { id, locale } = await params

  if (!id) {
    notFound()
  }

  const surface = routeByKey("purchase-orders-detail")

  if (!surface) {
    throw new Error("Missing purchase orders route surface definition: purchase-orders-detail")
  }

  return withPurchaseOrdersSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    permissionOptions: {
      resourceId: id,
    },
    onAllowed: async (ctx) => {
      return <ModernPurchaseOrderDetailPage id={id} organizationId={ctx.orgId} />
    },
  })
}
