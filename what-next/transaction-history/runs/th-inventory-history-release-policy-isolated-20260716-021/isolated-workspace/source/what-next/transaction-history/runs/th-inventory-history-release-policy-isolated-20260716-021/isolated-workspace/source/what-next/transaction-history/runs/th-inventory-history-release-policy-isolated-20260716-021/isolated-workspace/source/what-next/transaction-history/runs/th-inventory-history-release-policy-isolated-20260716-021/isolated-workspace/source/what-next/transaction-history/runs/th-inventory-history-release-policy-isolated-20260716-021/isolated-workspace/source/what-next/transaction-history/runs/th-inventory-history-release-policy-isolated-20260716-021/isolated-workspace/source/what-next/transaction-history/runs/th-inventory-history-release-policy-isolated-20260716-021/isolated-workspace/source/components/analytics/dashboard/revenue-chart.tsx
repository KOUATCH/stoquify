"use client"

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { TrendingUp } from "lucide-react"
import { analyticsMutedTextClass, analyticsPanelClass, analyticsToneClass, analyticsToneText } from "./analytics-dashboard-theme"

const data = [
  { time: "00:00", revenue: 0, transactions: 0 },
  { time: "06:00", revenue: 1200, transactions: 45 },
  { time: "09:00", revenue: 3400, transactions: 120 },
  { time: "12:00", revenue: 5800, transactions: 200 },
  { time: "15:00", revenue: 4200, transactions: 150 },
  { time: "18:00", revenue: 6800, transactions: 250 },
  { time: "21:00", revenue: 3200, transactions: 100 },
  { time: "23:59", revenue: 1800, transactions: 60 },
]

export function RevenueChart() {
  return (
    <div className={`${analyticsPanelClass} p-6 transition-all`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg border p-2 ${analyticsToneClass("success")}`}>
            <TrendingUp className={`w-5 h-5 ${analyticsToneText("success")}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--dash-text)]">Revenue Trends</h3>
            <p className={`text-sm ${analyticsMutedTextClass}`}>Hourly revenue and transaction volume</p>
          </div>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--dash-brand)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--dash-brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border-subtle)" opacity={0.35} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12, fill: "var(--dash-text-soft)" }}
              axisLine={{ stroke: "var(--dash-border-subtle)" }}
              tickLine={{ stroke: "var(--dash-border-subtle)" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--dash-text-soft)" }}
              axisLine={{ stroke: "var(--dash-border-subtle)" }}
              tickLine={{ stroke: "var(--dash-border-subtle)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--dash-surface-raised)",
                border: "1px solid var(--dash-border)",
                borderRadius: "8px",
                color: "var(--dash-text)",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--dash-brand)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
