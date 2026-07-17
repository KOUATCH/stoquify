"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target } from "lucide-react"
import {
  analyticsMutedTextClass,
  analyticsPanelClass,
  analyticsRowClass,
  analyticsToneClass,
  analyticsToneText,
} from "./analytics-dashboard-theme"

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
    <div className={`${analyticsPanelClass} p-6 transition-all`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg border p-2 ${analyticsToneClass("info")}`}>
            <Target className={`w-5 h-5 ${analyticsToneText("info")}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--dash-text)]">Top Products</h3>
            <p className={`text-sm ${analyticsMutedTextClass}`}>Best performing items today</p>
          </div>
        </div>
        <Badge variant="outline" className={analyticsToneClass("muted")}>
          {topProducts.length} items
        </Badge>
      </div>
      <div className="space-y-4">
        {topProducts.map((product, index) => (
          <div key={index} className={`${analyticsRowClass} space-y-2 p-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${analyticsToneClass(index === 0 ? "gold" : "muted")}`}>
                  <span className="text-xs font-bold text-[var(--dash-text)]">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-sm text-[var(--dash-text)]">{product.name}</p>
                  <p className={`text-xs ${analyticsMutedTextClass}`}>
                    {product.sales} sold • ${product.revenue}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-xs ${analyticsToneClass(product.trend.startsWith("+") ? "success" : "danger")}`}
              >
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
