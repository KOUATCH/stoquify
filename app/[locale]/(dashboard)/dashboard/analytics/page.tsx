import { AlertsCard } from "@/components/analytics/dashboard/alerts-card"
import { CashierPerformanceCard } from "@/components/analytics/dashboard/cashier-performance-card"
import { DashboardHeader } from "@/components/analytics/dashboard/dashboard-header"
import { DashboardStats } from "@/components/analytics/dashboard/dashboard-stats"
import { QuickActionsCard } from "@/components/analytics/dashboard/quick-actions-card"
import { RecentTransactionsCard } from "@/components/analytics/dashboard/recent-transactions-card"
import { RevenueChart } from "@/components/analytics/dashboard/revenue-chart"
import { TopProductsCard } from "@/components/analytics/dashboard/top-products-card"
import { analyticsContentClass, analyticsPanelClass, analyticsPageClass } from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { Suspense } from "react"

function AnalyticsSkeleton({ className }: { className: string }) {
  return <div className={`${analyticsPanelClass} animate-pulse ${className}`} />
}

export default async function HomePage() {
  return (
    <div className={analyticsPageClass}>
      <div className={analyticsContentClass}>
        <DashboardHeader />

        <Suspense fallback={<AnalyticsSkeleton className="h-28" />}>
          <DashboardStats />
        </Suspense>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Suspense fallback={<AnalyticsSkeleton className="h-96" />}>
              <RevenueChart />
            </Suspense>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Suspense fallback={<AnalyticsSkeleton className="h-80" />}>
                <TopProductsCard />
              </Suspense>

              <Suspense fallback={<AnalyticsSkeleton className="h-80" />}>
                <CashierPerformanceCard />
              </Suspense>
            </div>
          </div>

          <div className="space-y-6">
            <QuickActionsCard />

            <Suspense fallback={<AnalyticsSkeleton className="h-64" />}>
              <AlertsCard />
            </Suspense>

            <Suspense fallback={<AnalyticsSkeleton className="h-96" />}>
              <RecentTransactionsCard />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
