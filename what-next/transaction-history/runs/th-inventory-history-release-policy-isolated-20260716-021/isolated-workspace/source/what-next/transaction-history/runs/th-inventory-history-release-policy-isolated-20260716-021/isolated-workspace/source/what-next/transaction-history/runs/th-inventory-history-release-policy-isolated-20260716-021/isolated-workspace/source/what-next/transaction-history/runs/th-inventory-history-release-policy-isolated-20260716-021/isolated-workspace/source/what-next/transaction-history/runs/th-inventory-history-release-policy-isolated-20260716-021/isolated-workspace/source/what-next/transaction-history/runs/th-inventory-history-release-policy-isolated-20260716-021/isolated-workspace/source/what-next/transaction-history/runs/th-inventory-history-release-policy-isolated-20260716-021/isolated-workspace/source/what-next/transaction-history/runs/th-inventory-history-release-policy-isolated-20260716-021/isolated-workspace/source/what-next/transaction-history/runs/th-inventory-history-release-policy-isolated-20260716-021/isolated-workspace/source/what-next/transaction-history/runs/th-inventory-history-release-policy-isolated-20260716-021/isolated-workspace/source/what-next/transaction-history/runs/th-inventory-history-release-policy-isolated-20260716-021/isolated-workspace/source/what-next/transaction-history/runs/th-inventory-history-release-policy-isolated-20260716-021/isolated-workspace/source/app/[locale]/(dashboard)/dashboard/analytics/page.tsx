import type { Metadata } from "next"

import { BusinessPulseDashboard } from "@/components/analytics/BusinessPulseDashboard"
import { requireAnyPermission } from "@/lib/security/rbac"
import { getBusinessPulseCommandReadModel } from "@/services/analytics/sales-analytics.service"

export const metadata: Metadata = {
  title: "Business Pulse Analytics | Kontava",
  description: "Server-owned analytics command view for daily sales, POS sessions, inventory pressure, and operating action signals.",
}

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const resolvedLocale = pickLocale(locale)
  const ctx = await requireAnyPermission(["reports.read", "dashboard.read"], {
    resource: "BusinessPulseAnalytics",
  })
  const data = await getBusinessPulseCommandReadModel({
    organizationId: ctx.orgId,
  })

  return <BusinessPulseDashboard data={data} locale={resolvedLocale} />
}
