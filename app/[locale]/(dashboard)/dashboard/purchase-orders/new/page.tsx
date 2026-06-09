import { ArrowLeft, ShoppingCart } from "lucide-react"

import { createPurchaseOrder } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { ModernCreatePurchaseOrderForm } from "@/components/purchase-orders/ModernCreatePurchaseOrderForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getAuthenticatedUser } from "@/config/useAuth"
import { Link } from "@/i18n/navigation"
import { localizedRedirect } from "@/i18n/server-routing"
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
  const user = await getAuthenticatedUser()

  if (!user?.organizationId) {
    return (
      <main className="mx-auto w-full max-w-[720px] p-4">
        <Card className="rounded-md border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
          <CardContent className="space-y-4 p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-current/15 bg-white/45 dark:bg-white/[0.06]">
              <ShoppingCart className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Organization required</h1>
              <p className="mt-1 text-sm opacity-80">No organization was found for the current user.</p>
            </div>
            <Button asChild variant="outline" className="rounded-md bg-white dark:bg-slate-950">
              <Link href="/dashboard/purchase-orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to purchase orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const options = await getPurchaseOrderFormOptions(user.organizationId)

  return (
    <ModernCreatePurchaseOrderForm
      action={handleCreatePurchaseOrder}
      suppliers={options.suppliers}
      locations={options.locations}
      items={options.items}
      organizationId={user.organizationId}
    />
  )
}
