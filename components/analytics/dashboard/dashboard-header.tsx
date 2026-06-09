"use client"

import { Calendar, Download, Filter, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export function DashboardHeader() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
      <div>
        <h1 className="text-4xl font-black font-[family-name:var(--font-montserrat)] text-balance">
          Financial Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-pretty">Real-time insights into your business performance</p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="secondary" className="glass-effect">
            Live Data
          </Badge>
          <Badge variant="outline">Last updated: {new Date().toLocaleTimeString()}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="glass-effect bg-transparent">
          <Calendar className="h-4 w-4 mr-2" />
          Today
        </Button>

        <Button variant="outline" size="sm" className="glass-effect bg-transparent">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="glass-effect bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <Button size="sm" className="bg-primary hover:bg-primary/90">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  )
}
