import { PaymentPostingRecoveryWorkbench } from "@/components/purchasing/PaymentPostingRecoveryWorkbench"
import { routeByKey, withPurchasesSurfaceAccess } from "../../../purchases-route-access"
export default async function PaymentPostingRecoveryPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ payment?: string | string[] }> }) {
  const surface=routeByKey("purchases-payment-recovery")
  const query=await searchParams
  if(!surface)throw new Error("Missing payment posting recovery route definition")
  const initialPaymentId=typeof query.payment==="string"&&query.payment.length<=191?query.payment:undefined
  return withPurchasesSurfaceAccess({params,surface,onAllowed:context=><div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden"><div className="dashboard-landing-content mx-auto w-full min-w-0 max-w-5xl px-4 py-5 sm:px-6"><PaymentPostingRecoveryWorkbench organizationId={context.orgId} actorId={context.userId} initialPaymentId={initialPaymentId}/></div></div>})
}
