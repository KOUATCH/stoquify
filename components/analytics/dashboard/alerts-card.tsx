"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Info, CheckCircle, Bell } from "lucide-react"

const alerts = [
  {
    type: "warning",
    message: "Low stock: Premium Coffee",
    time: "5 min ago",
    icon: AlertTriangle,
  },
  {
    type: "info",
    message: "Daily report ready",
    time: "1 hour ago",
    icon: Info,
  },
  {
    type: "success",
    message: "Cash drawer balanced",
    time: "2 hours ago",
    icon: CheckCircle,
  },
]

export function AlertsCard() {
  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-6 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30">
            <Bell className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Alerts</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">System notifications</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">
          {alerts.length} active
        </Badge>
      </div>
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon
          const variant = alert.type === "warning" ? "destructive" : alert.type === "success" ? "default" : "secondary"

          return (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50/60 dark:bg-slate-700/60">
              <Icon
                className={`h-4 w-4 mt-0.5 ${
                  alert.type === "warning"
                    ? "text-destructive"
                    : alert.type === "success"
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.message}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{alert.time}</p>
              </div>
              <Badge variant={variant} className="text-xs">
                {alert.type}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
