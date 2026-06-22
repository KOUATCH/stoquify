"use client"

import { BarChart3, FileSearch, ListChecks } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BICommandMode } from "@/services/bi/bi-contracts"

type BICommandModeTabsProps = {
  value: BICommandMode
  onValueChange?: (value: BICommandMode) => void
  modes?: BICommandMode[]
  className?: string
}

const modeLabels: Record<BICommandMode, string> = {
  brief: "Brief",
  command: "Command",
  investigate: "Investigate",
}

const modeIcons: Record<BICommandMode, typeof ListChecks> = {
  brief: ListChecks,
  command: BarChart3,
  investigate: FileSearch,
}

export function BICommandModeTabs({
  value,
  onValueChange,
  modes = ["brief", "command", "investigate"],
  className,
}: BICommandModeTabsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-1", className)}>
      {modes.map((mode) => {
        const Icon = modeIcons[mode]
        const active = mode === value

        return (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={active}
            onClick={() => onValueChange?.(mode)}
            className={cn(
              "h-8 rounded-md px-3 text-xs text-[var(--dash-text-soft)]",
              active && "border border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-text)]",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {modeLabels[mode]}
          </Button>
        )
      })}
    </div>
  )
}
