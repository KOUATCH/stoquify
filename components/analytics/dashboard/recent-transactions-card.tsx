"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Banknote, Smartphone, Activity } from "lucide-react"

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
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-6 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Latest payment activity</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">
          {transactions.length} recent
        </Badge>
      </div>
      <div className="space-y-3">
        {transactions.map((transaction, index) => {
          const Icon = getPaymentIcon(transaction.method)

          return (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/60 dark:bg-slate-700/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{transaction.id}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{transaction.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">${transaction.amount}</p>
                <Badge variant={transaction.status === "completed" ? "default" : "destructive"} className="text-xs">
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
