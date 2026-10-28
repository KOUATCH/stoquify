import type { Metadata } from "next"

import { StockToCashFlowDashboard } from "@/components/stock-to-cash/StockToCashFlowDashboard"
import { getStockToCashFlowData } from "@/services/stock-to-cash/stock-to-cash-flow.service"
import { withFinanceSurfaceAccess, routeByKey } from "../finance-route-access"

export const metadata: Metadata = {
  title: "Stock-to-Cash Flow | Kontava",
  description: "Read-only stock-to-cash flow from purchasing, inventory, POS, payments, ledger, and close readiness.",
}

export default async function StockToCashFlowPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("finance-stock-to-cash")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-stock-to-cash")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: async ({ orgId }, locale) => {
      const data = await getStockToCashFlowData({
        organizationId: orgId,
        currency: "XAF",
      })

      return <StockToCashFlowDashboard data={data} locale={locale} />
    },
  })
}
