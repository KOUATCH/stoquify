"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpIcon, ArrowDownIcon, DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getDashboardSummary } from "@/actions/analytics/get-sales-analytics"
import { useClientAuth } from "@/hooks/useClientAuth"

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
  const getCardColors = (index: number) => {
    const colorSchemes = [
      {
        bg: "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20",
        border: "border-emerald-200/40 dark:border-emerald-800/40",
        iconBg: "bg-emerald-500/10 dark:bg-emerald-400/10",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        textColor: "text-emerald-600 dark:text-emerald-400",
        valueColor: "text-emerald-900 dark:text-emerald-100"
      },
      {
        bg: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
        border: "border-blue-200/40 dark:border-blue-800/40",
        iconBg: "bg-blue-500/10 dark:bg-blue-400/10",
        iconColor: "text-blue-600 dark:text-blue-400",
        textColor: "text-blue-600 dark:text-blue-400",
        valueColor: "text-blue-900 dark:text-blue-100"
      },
      {
        bg: "from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20",
        border: "border-teal-200/40 dark:border-teal-800/40",
        iconBg: "bg-teal-500/10 dark:bg-teal-400/10",
        iconColor: "text-teal-600 dark:text-teal-400",
        textColor: "text-teal-600 dark:text-teal-400",
        valueColor: "text-teal-900 dark:text-teal-100"
      },
      {
        bg: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
        border: "border-amber-200/40 dark:border-amber-800/40",
        iconBg: "bg-amber-500/10 dark:bg-amber-400/10",
        iconColor: "text-amber-600 dark:text-amber-400",
        textColor: "text-amber-600 dark:text-amber-400",
        valueColor: "text-amber-900 dark:text-amber-100"
      }
    ]
    return colorSchemes[index % colorSchemes.length]
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isPositive = stat.trend === "up"
        const colors = getCardColors(index)

        return (
          <div key={index} className={`bg-gradient-to-br ${colors.bg} p-4 rounded-xl border ${colors.border}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                <Icon className={`w-5 h-5 ${colors.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium ${colors.textColor} uppercase tracking-wide`}>
                  {stat.title}
                </p>
                <p className={`text-xl font-bold ${colors.valueColor}`}>{stat.value}</p>
              </div>
              <div className="flex items-center text-xs">
                {isPositive ? <ArrowUpIcon className="mr-1 h-3 w-3 text-emerald-600" /> : <ArrowDownIcon className="mr-1 h-3 w-3 text-red-600" />}
                <span className={isPositive ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-red-700 dark:text-red-400 font-semibold"}>
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
