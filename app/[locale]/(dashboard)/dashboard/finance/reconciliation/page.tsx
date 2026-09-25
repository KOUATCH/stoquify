import PaymentReconciliationWorkbench from "@/components/finance/PaymentReconciliationWorkbench"

import { routeByKey, withFinanceSurfaceAccess } from "../finance-route-access"

export default async function FinanceReconciliationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ reviewRun?: string | string[] }> }) {
  const query = await searchParams
  const initialSignRunId = typeof query?.reviewRun === "string" && query.reviewRun.trim().length > 0 && query.reviewRun.length <= 191 ? query.reviewRun.trim() : undefined
  const surface = routeByKey("finance-reconciliation")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-reconciliation")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => <PaymentReconciliationWorkbench initialSignRunId={initialSignRunId} />,
  })
}
