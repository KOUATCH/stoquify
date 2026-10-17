import { PaymentReconciliationHandoffWorkbench } from "@/components/purchasing/PaymentReconciliationHandoffWorkbench"
import { paymentReconciliationDraftSchema } from "@/services/purchasing/payment-reconciliation-contracts"
import { routeByKey, withPurchasesSurfaceAccess } from "../../../purchases-route-access"

export default async function PaymentReconciliationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ payment?: string | string[] }> }) {
  const surface = routeByKey("purchases-payment-reconciliation")
  if (!surface) throw new Error("Missing payment reconciliation route definition")
  const query = await searchParams
  const parsed = paymentReconciliationDraftSchema.shape.paymentRequestId.safeParse(query.payment)
  return withPurchasesSurfaceAccess({ params, surface, onAllowed: context => <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden"><div className="dashboard-landing-content mx-auto w-full min-w-0 max-w-5xl px-4 py-5 sm:px-6"><PaymentReconciliationHandoffWorkbench organizationId={context.orgId} actorId={context.userId} initialPaymentId={parsed.success ? parsed.data : undefined} /></div></div> })
}
