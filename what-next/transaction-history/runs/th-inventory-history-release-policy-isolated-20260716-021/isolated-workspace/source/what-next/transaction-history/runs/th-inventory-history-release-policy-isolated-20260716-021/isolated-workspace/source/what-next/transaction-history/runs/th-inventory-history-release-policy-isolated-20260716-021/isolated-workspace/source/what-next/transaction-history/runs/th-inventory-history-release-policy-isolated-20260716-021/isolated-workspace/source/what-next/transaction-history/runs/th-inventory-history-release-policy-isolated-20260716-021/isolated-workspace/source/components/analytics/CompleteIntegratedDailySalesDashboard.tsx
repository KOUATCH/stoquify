"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DollarSign, ShoppingCart, Users, TrendingUp, ArrowUpIcon, ArrowDownIcon, Clock, BarChart3, Target, Activity } from "lucide-react"
import { getDailyReportData } from "@/actions/analytics/financial-analytics"
import { useClientAuth } from "@/hooks/useClientAuth"
import {
  type AnalyticsTone,
  analyticsContentClass,
  analyticsMutedTextClass,
  analyticsPageClass,
  analyticsPanelClass,
  analyticsRowClass,
  analyticsStatCardClass,
  analyticsStatStyle,
  analyticsToneClass,
  analyticsToneText,
  analyticsTrendText,
} from "@/components/analytics/dashboard/analytics-dashboard-theme"

interface CompleteIntegratedDailySalesDashboardProps {
  organizationId?: string
  locationId?: string
  date?: Date
}

export default function CompleteIntegratedDailySalesDashboard({
  organizationId,
  locationId,
  date = new Date()
}: CompleteIntegratedDailySalesDashboardProps) {
  const { organizationId: authOrgId } = useClientAuth()
  const [dailyData, setDailyData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const orgId = organizationId || authOrgId || ""
  const locId = locationId || "default-location"

  useEffect(() => {
    async function fetchDailyData() {
      if (!orgId) return

      try {
        setLoading(true)
        const data = await getDailyReportData(orgId, locId, date)
        setDailyData(data)
      } catch (error) {
        console.error("Error fetching daily data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDailyData()
  }, [orgId, locId, date])
  const getDailyStats = () => {
    if (loading || !dailyData) {
      return [
        {
          title: "Today's Sales",
          value: "Loading...",
          change: "...",
          trend: "up",
          icon: DollarSign,
          description: "loading...",
        },
        {
          title: "Transactions",
          value: "...",
          change: "...",
          trend: "up",
          icon: ShoppingCart,
          description: "loading...",
        },
        {
          title: "Active Cashiers",
          value: "...",
          change: "...",
          trend: "up",
          icon: Users,
          description: "loading...",
        },
        {
          title: "Avg. Transaction",
          value: "...",
          change: "...",
          trend: "up",
          icon: TrendingUp,
          description: "loading...",
        },
      ]
    }

    return [
      {
        title: "Today's Sales",
        value: `$${dailyData.metrics.totalSales.toLocaleString()}`,
        change: `${dailyData.metrics.totalSales > 2000 ? "Strong" : "Moderate"} sales`,
        trend: dailyData.metrics.totalSales > 1000 ? "up" : "down",
        icon: DollarSign,
        description: "total revenue",
      },
      {
        title: "Transactions",
        value: dailyData.metrics.totalTransactions.toString(),
        change: `${dailyData.metrics.totalItemsSold} items sold`,
        trend: dailyData.metrics.totalTransactions > 50 ? "up" : "down",
        icon: ShoppingCart,
        description: "completed today",
      },
      {
        title: "Session Status",
        value: dailyData.session.status === "active" ? "Active" : "Closed",
        change: dailyData.session.cashierName,
        trend: "up",
        icon: Users,
        description: "current status",
      },
      {
        title: "Avg. Transaction",
        value: `$${dailyData.metrics.averageTransaction.toFixed(2)}`,
        change: `${dailyData.metrics.averageTransaction > 20 ? "Above" : "Below"} target`,
        trend: dailyData.metrics.averageTransaction > 20 ? "up" : "down",
        icon: TrendingUp,
        description: "per transaction",
      },
    ]
  }

  const dailyStats = getDailyStats()
  const cardTones: AnalyticsTone[] = ["success", "brand", "info", "gold"]

  return (
    <div className={analyticsPageClass}>
      <div className={analyticsContentClass}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--dash-text)]">Daily Sales Reports</h1>
        <Badge variant="outline" className={`text-sm ${analyticsToneClass("success")}`}>
          <Clock className="h-3 w-3 mr-1" />
          Real-time data
        </Badge>
      </div>

      {/* Daily Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dailyStats.map((stat, index) => {
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

      {/* Session Overview */}
      <Card className={analyticsPanelClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--dash-text)]">
            <Activity className="h-5 w-5" />
            Current Session Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className={`text-sm font-medium ${analyticsMutedTextClass}`}>Session Details</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-medium">Session:</span> {dailyData?.session.sessionNumber || "Loading..."}</p>
                <p className="text-sm"><span className="font-medium">Cashier:</span> {dailyData?.session.cashierName || "Loading..."}</p>
                <p className="text-sm"><span className="font-medium">Terminal:</span> {dailyData?.session.terminalName || "Loading..."}</p>
                <p className="text-sm"><span className="font-medium">Started:</span> {dailyData?.session.startTime ? new Date(dailyData.session.startTime).toLocaleTimeString() : "Loading..."}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className={`text-sm font-medium ${analyticsMutedTextClass}`}>Cash Management</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-medium">Opening Balance:</span> ${dailyData?.metrics.openingBalance?.toFixed(2) || "0.00"}</p>
                <p className="text-sm"><span className="font-medium">Cash In:</span> ${dailyData?.metrics.cashIn?.toFixed(2) || "0.00"}</p>
                <p className="text-sm"><span className="font-medium">Cash Out:</span> ${dailyData?.metrics.cashOut?.toFixed(2) || "0.00"}</p>
                <p className="text-sm"><span className="font-medium">Expected Balance:</span> ${dailyData?.metrics.expectedBalance?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className={`text-sm font-medium ${analyticsMutedTextClass}`}>Payment Methods</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-medium">Cash:</span> ${dailyData?.metrics.cashTotal?.toFixed(2) || "0.00"} ({dailyData?.metrics.totalSales > 0 ? Math.round((dailyData.metrics.cashTotal / dailyData.metrics.totalSales) * 100) : 0}%)</p>
                <p className="text-sm"><span className="font-medium">Card:</span> ${dailyData?.metrics.cardTotal?.toFixed(2) || "0.00"} ({dailyData?.metrics.totalSales > 0 ? Math.round((dailyData.metrics.cardTotal / dailyData.metrics.totalSales) * 100) : 0}%)</p>
                <p className="text-sm"><span className="font-medium">Digital:</span> ${dailyData?.metrics.digitalTotal?.toFixed(2) || "0.00"} ({dailyData?.metrics.totalSales > 0 ? Math.round((dailyData.metrics.digitalTotal / dailyData.metrics.totalSales) * 100) : 0}%)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Reports */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Performance */}
        <Card className={analyticsPanelClass}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <BarChart3 className="h-5 w-5" />
              Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Revenue Goal</span>
                  <span>94.9%</span>
                </div>
                <Progress value={94.9} className="h-2" />
                <p className={`mt-1 text-xs ${analyticsMutedTextClass}`}>$2,847 of $3,000 target</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Transaction Goal</span>
                  <span>84.7%</span>
                </div>
                <Progress value={84.7} className="h-2" />
                <p className={`mt-1 text-xs ${analyticsMutedTextClass}`}>127 of 150 transactions</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Customer Satisfaction</span>
                  <span>96%</span>
                </div>
                <Progress value={96} className="h-2" />
                <p className={`mt-1 text-xs ${analyticsMutedTextClass}`}>Based on recent feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card className={analyticsPanelClass}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--dash-text)]">
              <Target className="h-5 w-5" />
              Top Selling Items Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyData?.topItems && dailyData.topItems.length > 0 ? (
                dailyData.topItems.map((item: any, index: number) => (
                  <div key={index} className={`${analyticsRowClass} flex items-center justify-between p-3`}>
                    <div>
                      <p className="font-medium text-sm">{item.itemName}</p>
                      <p className={`text-xs ${analyticsMutedTextClass}`}>{item.quantitySold} units sold</p>
                    </div>
                    <span className="font-bold text-[var(--dash-success)]">${item.totalRevenue.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className={`text-sm ${analyticsMutedTextClass}`}>
                    {loading ? "Loading top items..." : "No sales data available"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
