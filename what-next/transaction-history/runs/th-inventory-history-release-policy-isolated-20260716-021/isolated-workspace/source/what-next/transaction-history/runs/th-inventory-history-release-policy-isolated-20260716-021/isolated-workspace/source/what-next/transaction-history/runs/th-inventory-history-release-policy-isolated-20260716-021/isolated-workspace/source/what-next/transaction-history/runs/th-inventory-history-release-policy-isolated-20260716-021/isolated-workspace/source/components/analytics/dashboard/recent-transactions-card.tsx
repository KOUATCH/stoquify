"use client"

import { Badge } from "@/components/ui/badge"
import { CreditCard, Banknote, Smartphone, Activity } from "lucide-react"
import {
  analyticsMutedTextClass,
  analyticsPanelClass,
  analyticsRowClass,
  analyticsToneClass,
  analyticsToneText,
} from "./analytics-dashboard-theme"

const transactions = [
  { id: "#1247", amount: 24.5, method: "card", time: "2 min ago", status: "completed" },
  { id: "#1246", amount: 15.75, method: "cash", time: "5 min ago", status: "completed" },
  { id: "#1245", amount: 32.0, method: "mobile", time: "8 min ago", status: "completed" },
  { id: "#1244", amount: 18.25, method: "card", time: "12 min ago", status: "completed" },
  { id: "#1243", amount: 45.8, method: "cash", time: "15 min ago", status: "refunded" },
]

const getPaymentIcon = (method: string) => {
  switch (method) {
    case "card":
      return CreditCard
    case "cash":
      return Banknote
    case "mobile":
      return Smartphone
    default:
      return CreditCard
  }
}

export function RecentTransactionsCard() {
  return (
    <div className={`${analyticsPanelClass} p-6 transition-all`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg border p-2 ${analyticsToneClass("brand")}`}>
            <Activity className={`w-5 h-5 ${analyticsToneText("brand")}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--dash-text)]">Recent Transactions</h3>
            <p className={`text-sm ${analyticsMutedTextClass}`}>Latest payment activity</p>
          </div>
        </div>
        <Badge variant="outline" className={analyticsToneClass("muted")}>
          {transactions.length} recent
        </Badge>
      </div>
      <div className="space-y-3">
        {transactions.map((transaction, index) => {
          const Icon = getPaymentIcon(transaction.method)

          return (
            <div key={index} className={`${analyticsRowClass} flex items-center justify-between p-3`}>
              <div className="flex items-center space-x-3">
                <div className={`rounded-lg border p-2 ${analyticsToneClass("muted")}`}>
                  <Icon className={`h-4 w-4 ${analyticsToneText("muted")}`} />
                </div>
                <div>
                  <p className="font-medium text-sm text-[var(--dash-text)]">{transaction.id}</p>
                  <p className={`text-xs ${analyticsMutedTextClass}`}>{transaction.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-[var(--dash-text)]">${transaction.amount}</p>
                <Badge
                  variant="outline"
                  className={`text-xs ${analyticsToneClass(transaction.status === "completed" ? "success" : "danger")}`}
                >
                  {transaction.status}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
