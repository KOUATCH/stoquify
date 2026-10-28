"use client"

import { useEffect, useState } from "react"
import { ArrowUpIcon, ArrowDownIcon, DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react"
import { getDashboardSummary } from "@/actions/analytics/get-sales-analytics"
import { useClientAuth } from "@/hooks/useClientAuth"
import {
  type AnalyticsTone,
  analyticsMutedTextClass,
  analyticsStatCardClass,
  analyticsStatStyle,
  analyticsToneClass,
  analyticsToneText,
  analyticsTrendText,
} from "./analytics-dashboard-theme"

interface DashboardStatsProps {
  organizationId?: string
  locationId?: string
}

export function DashboardStats({ organizationId, locationId }: DashboardStatsProps) {
  const { organizationId: authOrgId } = useClientAuth()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const orgId = organizationId || authOrgId || ""
  const locId = locationId || "default-location"

  useEffect(() => {
    async function fetchDashboardData() {
      if (!orgId) return

      try {
        setLoading(true)
        const data = await getDashboardSummary(orgId, locId)
        setDashboardData(data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        // Keep default data on error
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [orgId, locId])

  const getStats = () => {
    if (loading || !dashboardData) {
      return [
        {
          title: "Total Revenue",
          value: "$0",
          change: "+0%",
          trend: "up",
          icon: DollarSign,
          description: "loading...",
        },
        {
          title: "Transactions",
          value: "0",
          change: "+0%",
          trend: "up",
          icon: ShoppingCart,
          description: "loading...",
        },
        {
          title: "Active Sessions",
          value: "0",
          change: "+0",
          trend: "up",
          icon: Users,
          description: "loading...",
        },
        {
          title: "Avg. Transaction",
          value: "$0",
          change: "+0%",
          trend: "up",
          icon: TrendingUp,
          description: "loading...",
        },
      ]
    }

    const changePercentage = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? "+100%" : "0%"
      const change = ((current - previous) / previous) * 100
      return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
    }

    return [
      {
        title: "Today's Revenue",
        value: `$${dashboardData.today.sales.toLocaleString()}`,
        change: changePercentage(dashboardData.today.sales, dashboardData.today.sales - dashboardData.today.salesChange),
        trend: dashboardData.today.salesChange >= 0 ? "up" : "down",
        icon: DollarSign,
        description: "vs yesterday",
      },
      {
        title: "Today's Transactions",
        value: dashboardData.today.transactions.toLocaleString(),
        change: changePercentage(dashboardData.today.transactions, dashboardData.today.transactions - dashboardData.today.transactionsChange),
        trend: dashboardData.today.transactionsChange >= 0 ? "up" : "down",
        icon: ShoppingCart,
        description: "vs yesterday",
      },
      {
        title: "Active Sessions",
        value: dashboardData.activeSessions.toString(),
        change: "Currently active",
        trend: "up",
        icon: Users,
        description: "POS sessions",
      },
      {
        title: "Avg. Transaction",
        value: `$${dashboardData.today.averageTransaction.toFixed(2)}`,
        change: `${dashboardData.today.transactions > 0 ? "Active" : "No sales"}`,
        trend: dashboardData.today.averageTransaction > 20 ? "up" : "down",
        icon: TrendingUp,
        description: "today",
      },
    ]
  }

  const stats = getStats()
  const cardTones: AnalyticsTone[] = ["success", "brand", "info", "gold"]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isPositive = stat.trend === "up"
        const tone = cardTones[index % cardTones.length]

        return (
          <div key={index} className={`${analyticsStatCardClass} p-4`} style={analyticsStatStyle(tone)}>
            <div className="flex items-center gap-3">
              <div className={`rounded-lg border p-2 ${analyticsToneClass(tone)}`}>
                <Icon className={`w-5 h-5 ${analyticsToneText(tone)}`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium uppercase tracking-wide ${analyticsToneText(tone)}`}>
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-[var(--dash-text)]">{stat.value}</p>
              </div>
              <div className="flex items-center text-xs">
                {isPositive ? (
                  <ArrowUpIcon className={`mr-1 h-3 w-3 ${analyticsTrendText(true)}`} />
                ) : (
                  <ArrowDownIcon className={`mr-1 h-3 w-3 ${analyticsTrendText(false)}`} />
                )}
                <span className={`${analyticsTrendText(isPositive)} font-semibold`}>
                  {stat.change}
                </span>
              </div>
            </div>
            <p className={`mt-2 text-xs ${analyticsMutedTextClass}`}>{stat.description}</p>
          </div>
        )
      })}
    </div>
  )
}
