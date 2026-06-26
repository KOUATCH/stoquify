import type { Metadata } from "next"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { StockToCashFlowDashboard } from "@/components/stock-to-cash/StockToCashFlowDashboard"
import { localizePath } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getStockToCashFlowData } from "@/services/stock-to-cash/stock-to-cash-flow.service"

export const metadata: Metadata = {
  title: "Stock-to-Cash Flow | Kontava",
  description: "Read-only stock-to-cash flow from purchasing, inventory, POS, payments, ledger, and close readiness.",
}

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function StockToCashFlowPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const resolvedLocale = pickLocale(locale)
  let ctx: Awaited<ReturnType<typeof requireAnyPermission>>

  try {
    ctx = await requireAnyPermission(["finance.read", "dashboard.read", "inventory.read"], {
      resource: "KontavaStockToCashFlow",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Stock-to-Cash needs an active organization" : "Stock-to-Cash is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so Stock-to-Cash can load tenant-scoped evidence."
              : "Stock-to-Cash is read-only, but it still requires finance, dashboard, or inventory access."
          }
          primaryHref={localizePath("/dashboard", resolvedLocale)}
        />
      )
    }

    throw error
  }

  const data = await getStockToCashFlowData({
    organizationId: ctx.orgId,
    currency: "XAF",
  })

  return <StockToCashFlowDashboard data={data} locale={resolvedLocale} />
}
