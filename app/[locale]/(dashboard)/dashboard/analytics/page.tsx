import { AlertsCard } from "@/components/analytics/dashboard/alerts-card"
import { CashierPerformanceCard } from "@/components/analytics/dashboard/cashier-performance-card"
import { DashboardHeader } from "@/components/analytics/dashboard/dashboard-header"
import { DashboardStats } from "@/components/analytics/dashboard/dashboard-stats"
import { QuickActionsCard } from "@/components/analytics/dashboard/quick-actions-card"
import { RecentTransactionsCard } from "@/components/analytics/dashboard/recent-transactions-card"
import { RevenueChart } from "@/components/analytics/dashboard/revenue-chart"
import { TopProductsCard } from "@/components/analytics/dashboard/top-products-card"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

export default async function HomePage() {
  const t = await getTranslations("common")
  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto p-6 space-y-8">
        <DashboardHeader />

        <Suspense fallback={<div className="animate-pulse">{t("loading")}</div>}>
          <DashboardStats />
        </Suspense>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Suspense fallback={<div className="h-96 bg-card rounded-xl animate-pulse" />}>
              <RevenueChart />
            </Suspense>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Suspense fallback={<div className="h-80 bg-card rounded-xl animate-pulse" />}>
                <TopProductsCard />
              </Suspense>

              <Suspense fallback={<div className="h-80 bg-card rounded-xl animate-pulse" />}>
                <CashierPerformanceCard />
              </Suspense>
            </div>
          </div>

          <div className="space-y-6">
            <QuickActionsCard />

            <Suspense fallback={<div className="h-64 bg-card rounded-xl animate-pulse" />}>
              <AlertsCard />
            </Suspense>

            <Suspense fallback={<div className="h-96 bg-card rounded-xl animate-pulse" />}>
              <RecentTransactionsCard />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
