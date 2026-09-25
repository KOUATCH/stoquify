import { InvoiceCorrectionWorkbench } from "@/components/purchasing/InvoiceCorrectionWorkbench"
import { routeByKey, withPurchasesSurfaceAccess } from "../../purchases-route-access"

export default async function CorrectSupplierInvoicePage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("purchases-invoice-correct")
  if (!surface) throw new Error("Missing invoice correction route definition")
  return withPurchasesSurfaceAccess({ params, surface, onAllowed: context => (
    <div className="dashboard-landing-theme dark min-h-screen">
      <div className="dashboard-landing-content mx-auto w-full min-w-0 max-w-5xl px-4 py-5 sm:px-6">
        <InvoiceCorrectionWorkbench organizationId={context.orgId} actorId={context.userId} />
      </div>
    </div>
  ) })
}
