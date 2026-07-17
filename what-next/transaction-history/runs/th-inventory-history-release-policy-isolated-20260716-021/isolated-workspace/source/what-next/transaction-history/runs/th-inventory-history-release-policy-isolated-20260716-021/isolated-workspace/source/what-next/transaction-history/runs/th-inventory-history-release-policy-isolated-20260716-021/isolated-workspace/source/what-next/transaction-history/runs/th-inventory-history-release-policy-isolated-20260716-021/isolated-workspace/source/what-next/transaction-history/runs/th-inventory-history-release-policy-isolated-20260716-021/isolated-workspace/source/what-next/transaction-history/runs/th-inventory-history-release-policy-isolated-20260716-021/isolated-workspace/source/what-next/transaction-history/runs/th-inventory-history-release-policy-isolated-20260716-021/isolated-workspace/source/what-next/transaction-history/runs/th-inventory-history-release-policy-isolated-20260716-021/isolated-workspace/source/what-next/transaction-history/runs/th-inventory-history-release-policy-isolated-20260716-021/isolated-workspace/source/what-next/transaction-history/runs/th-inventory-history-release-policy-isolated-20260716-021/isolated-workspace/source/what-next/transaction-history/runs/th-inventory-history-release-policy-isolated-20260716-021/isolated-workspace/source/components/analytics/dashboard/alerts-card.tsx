"use client"

import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Info, CheckCircle, Bell } from "lucide-react"
import {
  analyticsAlertTone,
  analyticsMutedTextClass,
  analyticsPanelClass,
  analyticsRowClass,
  analyticsToneClass,
  analyticsToneText,
} from "./analytics-dashboard-theme"

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
    <div className={`${analyticsPanelClass} p-6 transition-all`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg border p-2 ${analyticsToneClass("danger")}`}>
            <Bell className={`w-5 h-5 ${analyticsToneText("danger")}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--dash-text)]">Alerts</h3>
            <p className={`text-sm ${analyticsMutedTextClass}`}>System notifications</p>
          </div>
        </div>
        <Badge variant="outline" className={analyticsToneClass("muted")}>
          {alerts.length} active
        </Badge>
      </div>
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon
          const tone = analyticsAlertTone(alert.type)

          return (
            <div key={index} className={`${analyticsRowClass} flex items-start space-x-3 p-3`}>
              <Icon className={`h-4 w-4 mt-0.5 ${analyticsToneText(tone)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--dash-text)]">{alert.message}</p>
                <p className={`text-xs ${analyticsMutedTextClass}`}>{alert.time}</p>
              </div>
              <Badge variant="outline" className={`text-xs ${analyticsToneClass(tone)}`}>
                {alert.type}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
