"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target } from "lucide-react"

const topProducts = [
  { name: "Premium Coffee", sales: 245, revenue: 1225, trend: "+15%" },
  { name: "Breakfast Sandwich", sales: 189, revenue: 945, trend: "+8%" },
  { name: "Fresh Pastry", sales: 156, revenue: 624, trend: "+22%" },
  { name: "Iced Latte", sales: 134, revenue: 536, trend: "+5%" },
  { name: "Energy Drink", sales: 98, revenue: 294, trend: "-3%" },
]

export function TopProductsCard() {
  const maxSales = Math.max(...topProducts.map((p) => p.sales))

  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-6 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30">
            <Target className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Products</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Best performing items today</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">
          {topProducts.length} items
        </Badge>
      </div>
      <div className="space-y-4">
        {topProducts.map((product, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{product.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {product.sales} sold • ${product.revenue}
                  </p>
                </div>
              </div>
              <Badge variant={product.trend.startsWith("+") ? "default" : "destructive"} className="text-xs">
                {product.trend}
              </Badge>
            </div>
            <Progress value={(product.sales / maxSales) * 100} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
