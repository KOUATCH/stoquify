"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Settings, Users } from "lucide-react"

const actions = [
  { label: "New Sale", icon: Plus, variant: "default" as const },
  { label: "Reports", icon: FileText, variant: "outline" as const },
  { label: "Settings", icon: Settings, variant: "outline" as const },
  { label: "Staff", icon: Users, variant: "outline" as const },
]

export function QuickActionsCard() {
  return (
    <Card className="glass-effect border-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold font-[family-name:var(--font-montserrat)]">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button key={index} variant={action.variant} className="w-full justify-start h-12">
              <Icon className="h-4 w-4 mr-3" />
              {action.label}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
