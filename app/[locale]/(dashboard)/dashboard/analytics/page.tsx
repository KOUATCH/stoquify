import { BusinessPulseDashboard } from "@/components/analytics/BusinessPulseDashboard"
import { getBusinessPulseCommandReadModel } from "@/services/analytics/sales-analytics.service"

import { routeByKey, withAnalyticsSurfaceAccess } from "./analytics-route-access"

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("analytics-dashboard")

  if (!surface) {
    throw new Error("Missing analytics route surface definition: analytics-dashboard")
  }

  return withAnalyticsSurfaceAccess({
    params,
    surface,
    onAllowed: async (ctx, locale) => {
      const resolvedLocale = pickLocale(locale)
      const data = await getBusinessPulseCommandReadModel({
        organizationId: ctx.orgId,
      })

      return <BusinessPulseDashboard data={data} locale={resolvedLocale} />
    },
  })
}
