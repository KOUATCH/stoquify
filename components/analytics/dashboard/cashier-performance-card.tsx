"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star, Users } from "lucide-react"
import {
  analyticsMutedTextClass,
  analyticsPanelClass,
  analyticsRowClass,
  analyticsToneClass,
  analyticsToneText,
} from "./analytics-dashboard-theme"

const cashiers = [
  { name: "Sarah Johnson", sales: 2450, transactions: 89, score: 98, status: "online" },
  { name: "Mike Chen", sales: 2180, transactions: 76, score: 95, status: "online" },
  { name: "Emma Davis", sales: 1890, transactions: 65, score: 92, status: "break" },
  { name: "Alex Rodriguez", sales: 1650, transactions: 58, score: 88, status: "online" },
]

export function CashierPerformanceCard() {
  return (
    <div className={`${analyticsPanelClass} p-6 transition-all`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg border p-2 ${analyticsToneClass("gold")}`}>
            <Users className={`w-5 h-5 ${analyticsToneText("gold")}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--dash-text)]">Cashier Performance</h3>
            <p className={`text-sm ${analyticsMutedTextClass}`}>Today's top performers</p>
          </div>
        </div>
        <Badge variant="outline" className={analyticsToneClass("muted")}>
          {cashiers.length} active
        </Badge>
      </div>
      <div className="space-y-4">
        {cashiers.map((cashier, index) => (
          <div key={index} className={`${analyticsRowClass} flex items-center justify-between p-3`}>
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className={`font-semibold ${analyticsToneClass("brand")}`}>
                  {cashier.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm text-[var(--dash-text)]">{cashier.name}</p>
                <p className={`text-xs ${analyticsMutedTextClass}`}>
                  ${cashier.sales} • {cashier.transactions} transactions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-[var(--dash-gold)] text-[var(--dash-gold)]" />
                <span className="text-xs font-medium text-[var(--dash-text)]">{cashier.score}</span>
              </div>
              <Badge
                variant="outline"
                className={`text-xs ${analyticsToneClass(cashier.status === "online" ? "success" : "gold")}`}
              >
                {cashier.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
