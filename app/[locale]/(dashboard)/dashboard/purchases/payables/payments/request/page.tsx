import { PaymentRequestWorkbench } from "@/components/purchasing/PaymentRequestWorkbench"
import { routeByKey, withPurchasesSurfaceAccess } from "../../../purchases-route-access"
export default async function PaymentRequestPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("purchases-payment-request")
  if (!surface) throw new Error("Missing payment request route definition")
  return withPurchasesSurfaceAccess({ params, surface, onAllowed: context => <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden"><div className="dashboard-landing-content mx-auto w-full min-w-0 max-w-5xl px-4 py-5 sm:px-6"><PaymentRequestWorkbench organizationId={context.orgId} actorId={context.userId} mode="request" /></div></div> })
}
