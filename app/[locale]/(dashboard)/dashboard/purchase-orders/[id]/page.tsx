import ModernPurchaseOrderDetailPage from "@/components/purchase-orders/ModernPurchaseOrderDetailPage"
import { getAuthenticatedUser } from "@/config/useAuth"
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

export default async function PurchaseOrderDetailPage({ params, searchParams }: PurchaseOrderDetailPageProps) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}

  // Get organizationId from authenticated user session first, fallback to searchParams
  const user = await getAuthenticatedUser()
  const organizationId = user?.organizationId || resolvedSearchParams.organizationId

  if (!id) {
    notFound()
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Authentication required</h2>
          <p className="text-slate-600 dark:text-slate-400">Please sign in to view this purchase order.</p>
        </div>
      </div>
    )
  }

  return <ModernPurchaseOrderDetailPage id={id} organizationId={organizationId} />
}
