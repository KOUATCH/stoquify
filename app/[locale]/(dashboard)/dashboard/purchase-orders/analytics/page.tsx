import { getLocale } from "next-intl/server"

import { PurchaseOrderAnalyticsDashboard } from "@/components/purchase-orders/PurchaseOrderAnalyticsDashboard"
import { pickLocale } from "@/i18n/routing"
import { getAnalytics } from "@/services/purchase-order/purchase-order.service"

import { routeByKey, withPurchaseOrdersSurfaceAccess } from "../purchase-orders-route-access"
import { resolveAnalyticsDateWindow } from "./analytics-range"

type PurchaseOrderAnalyticsPageProps = {
  searchParams?: Promise<{
    range?: string
    from?: string
    to?: string
  }>
}

export default async function PurchaseOrderAnalyticsPage({
  searchParams,
}: PurchaseOrderAnalyticsPageProps) {
  const locale = pickLocale(await getLocale())
  const query = await searchParams
  const dateWindow = resolveAnalyticsDateWindow(query?.range, query?.from, query?.to)
  const surface = routeByKey("purchase-orders-analytics")

  if (!surface) {
    throw new Error("Missing purchase orders route surface definition: purchase-orders-analytics")
  }

  return withPurchaseOrdersSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    permissionOptions: {
      resource: "PurchaseOrder",
    },
    onAllowed: async (ctx, activeLocale) => {
      const data = await getAnalytics({
        organizationId: ctx.orgId,
        ...(dateWindow.from ? { from: dateWindow.from } : {}),
        ...(dateWindow.to ? { to: dateWindow.to } : {}),
        topSuppliersLimit: 8,
      })

      return (
        <PurchaseOrderAnalyticsDashboard
          data={data}
          locale={activeLocale}
          range={dateWindow.range}
        />
      )
    },
  })
}
