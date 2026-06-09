"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DollarSign, ShoppingCart, Users, TrendingUp, ArrowUpIcon, ArrowDownIcon, Clock, BarChart3, Target, Activity } from "lucide-react"
import { getDailyReportData } from "@/actions/analytics/financial-analytics"
import { useClientAuth } from "@/hooks/useClientAuth"

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
        bg: "from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20",
        border: "border-orange-200/40 dark:border-orange-800/40",
        iconBg: "bg-orange-500/10 dark:bg-orange-400/10",
        iconColor: "text-orange-600 dark:text-orange-400",
        textColor: "text-orange-600 dark:text-orange-400",
        valueColor: "text-orange-900 dark:text-orange-100"
      },
      {
        bg: "from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
        border: "border-purple-200/40 dark:border-purple-800/40",
        iconBg: "bg-purple-500/10 dark:bg-purple-400/10",
        iconColor: "text-purple-600 dark:text-purple-400",
        textColor: "text-purple-600 dark:text-purple-400",
        valueColor: "text-purple-900 dark:text-purple-100"
      }
    ]
    return colorSchemes[index % colorSchemes.length]
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Daily Sales Reports</h1>
        <Badge variant="outline" className="text-sm">
          <Clock className="h-3 w-3 mr-1" />
          Real-time data
        </Badge>
      </div>

      {/* Daily Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dailyStats.map((stat, index) => {
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

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Current Session Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Session Details</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-medium">Session:</span> {dailyData?.session.sessionNumber || "Loading..."}</p>
                <p className="text-sm"><span className="font-medium">Cashier:</span> {dailyData?.session.cashierName || "Loading..."}</p>
                <p className="text-sm"><span className="font-medium">Terminal:</span> {dailyData?.session.terminalName || "Loading..."}</p>
                <p className="text-sm"><span className="font-medium">Started:</span> {dailyData?.session.startTime ? new Date(dailyData.session.startTime).toLocaleTimeString() : "Loading..."}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Cash Management</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-medium">Opening Balance:</span> ${dailyData?.metrics.openingBalance?.toFixed(2) || "0.00"}</p>
                <p className="text-sm"><span className="font-medium">Cash In:</span> ${dailyData?.metrics.cashIn?.toFixed(2) || "0.00"}</p>
                <p className="text-sm"><span className="font-medium">Cash Out:</span> ${dailyData?.metrics.cashOut?.toFixed(2) || "0.00"}</p>
                <p className="text-sm"><span className="font-medium">Expected Balance:</span> ${dailyData?.metrics.expectedBalance?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Payment Methods</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                <p className="text-xs text-gray-500 mt-1">$2,847 of $3,000 target</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Transaction Goal</span>
                  <span>84.7%</span>
                </div>
                <Progress value={84.7} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">127 of 150 transactions</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Customer Satisfaction</span>
                  <span>96%</span>
                </div>
                <Progress value={96} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">Based on recent feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Selling Items Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyData?.topItems && dailyData.topItems.length > 0 ? (
                dailyData.topItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{item.itemName}</p>
                      <p className="text-xs text-gray-500">{item.quantitySold} units sold</p>
                    </div>
                    <span className="font-bold text-green-600">${item.totalRevenue.toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    {loading ? "Loading top items..." : "No sales data available"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}