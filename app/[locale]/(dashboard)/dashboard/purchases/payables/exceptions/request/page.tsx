import { InvoiceMatchExceptionWorkbench } from "@/components/purchasing/InvoiceMatchExceptionWorkbench"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { routeByKey, withPurchasesSurfaceAccess } from "../../../purchases-route-access"
export default async function InvoiceExceptionPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("purchases-exception-request")
  if (!surface) throw new Error("Missing invoice exception route definition")
  return withPurchasesSurfaceAccess({ params, surface, onAllowed: context => <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden"><div className="dashboard-landing-content mx-auto w-full min-w-0 max-w-5xl px-4 py-5 sm:px-6"><InvoiceMatchExceptionWorkbench organizationId={context.orgId} actorId={context.userId} kind="request" canApproveInvoice={hasRbacPermission(context.permissions, "purchasing.ap.invoice.post")} /></div></div> })
}
