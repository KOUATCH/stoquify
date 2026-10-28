"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Settings, Users } from "lucide-react"
import { analyticsFilterClass, analyticsPanelClass, analyticsPrimaryButtonClass } from "./analytics-dashboard-theme"

const actions = [
  { label: "New Sale", icon: Plus, variant: "default" as const },
  { label: "Reports", icon: FileText, variant: "outline" as const },
  { label: "Settings", icon: Settings, variant: "outline" as const },
  { label: "Staff", icon: Users, variant: "outline" as const },
]

export function QuickActionsCard() {
  return (
    <Card className={analyticsPanelClass}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold font-[family-name:var(--font-montserrat)] text-[var(--dash-text)]">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button
              key={index}
              variant={action.variant}
              className={`h-12 w-full justify-start ${index === 0 ? analyticsPrimaryButtonClass : analyticsFilterClass}`}
            >
              <Icon className="h-4 w-4 mr-3" />
              {action.label}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
