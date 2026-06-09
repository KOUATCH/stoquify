"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star, Users } from "lucide-react"

const cashiers = [
  { name: "Sarah Johnson", sales: 2450, transactions: 89, score: 98, status: "online" },
  { name: "Mike Chen", sales: 2180, transactions: 76, score: 95, status: "online" },
  { name: "Emma Davis", sales: 1890, transactions: 65, score: 92, status: "break" },
  { name: "Alex Rodriguez", sales: 1650, transactions: 58, score: 88, status: "online" },
]

export function CashierPerformanceCard() {
  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-6 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Cashier Performance</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Today's top performers</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">
          {cashiers.length} active
        </Badge>
      </div>
      <div className="space-y-4">
        {cashiers.map((cashier, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/60 dark:bg-slate-700/60">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {cashier.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{cashier.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  ${cashier.sales} • {cashier.transactions} transactions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">{cashier.score}</span>
              </div>
              <Badge variant={cashier.status === "online" ? "default" : "secondary"} className="text-xs">
                {cashier.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
