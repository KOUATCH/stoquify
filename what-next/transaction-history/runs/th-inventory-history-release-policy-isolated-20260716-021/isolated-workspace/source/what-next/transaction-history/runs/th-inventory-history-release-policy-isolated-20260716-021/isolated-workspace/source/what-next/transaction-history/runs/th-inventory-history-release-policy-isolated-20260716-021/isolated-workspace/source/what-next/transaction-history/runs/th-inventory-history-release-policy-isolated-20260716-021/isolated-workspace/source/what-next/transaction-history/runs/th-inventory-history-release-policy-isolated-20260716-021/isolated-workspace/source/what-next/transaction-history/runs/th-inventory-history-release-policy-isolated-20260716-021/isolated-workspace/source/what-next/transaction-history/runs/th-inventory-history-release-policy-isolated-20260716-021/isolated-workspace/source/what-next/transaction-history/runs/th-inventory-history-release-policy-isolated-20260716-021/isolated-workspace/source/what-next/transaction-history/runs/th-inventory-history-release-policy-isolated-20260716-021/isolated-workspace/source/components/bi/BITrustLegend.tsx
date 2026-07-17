import { CheckCircle2, CircleDot, Clock3, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BIFreshnessState, BIKpiState, BITrustState } from "@/services/bi/bi-contracts"

type BITrustLegendProps = {
  title?: string
  detail?: string
  compact?: boolean
  className?: string
}

const trustItems: Array<{
  state: BITrustState
  label: string
  detail: string
  tone: Parameters<typeof dashboardToneClass>[0]
}> = [
  {
    state: "operational",
    label: "Operational",
    detail: "Useful business signal, not yet accounting-certified.",
    tone: "info",
  },
  {
    state: "posted",
    label: "Posted",
    detail: "Connected to ledger posting evidence.",
    tone: "brand",
  },
  {
    state: "reconciled",
    label: "Reconciled",
    detail: "Matched against payment or balance evidence.",
    tone: "spruce",
  },
  {
    state: "certified",
    label: "Certified",
    detail: "Reviewed and suitable for close, audit, or owner trust.",
    tone: "success",
  },
  {
    state: "blocked",
    label: "Blocked",
    detail: "Not trustworthy until blockers are resolved.",
    tone: "danger",
  },
]

const freshnessItems: Array<{ state: BIFreshnessState; label: string }> = [
  { state: "fresh", label: "Fresh" },
  { state: "stale", label: "Stale" },
  { state: "partial", label: "Partial" },
  { state: "blocked", label: "Blocked" },
  { state: "unknown", label: "Unknown" },
]

const safeStateItems: Array<{ state: BIKpiState; label: string; icon: typeof CircleDot }> = [
  { state: "redacted", label: "Redacted", icon: EyeOff },
  { state: "permission_denied", label: "Permission denied", icon: LockKeyhole },
  { state: "module_unavailable", label: "Module unavailable", icon: LockKeyhole },
  { state: "safe_error", label: "Safe error", icon: ShieldCheck },
]

export function BITrustLegend({
  title = "Trust legend",
  detail = "How Kontava labels business intelligence before users act on it.",
  compact = false,
  className,
}: BITrustLegendProps) {
  return (
    <section className={cn(dashboardPanelClass, "p-4", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2>
        <p className={cn("text-sm", dashboardMutedTextClass)}>{detail}</p>
      </div>

      <div className={cn("mt-4 grid gap-3", compact ? "md:grid-cols-2" : "lg:grid-cols-5")}>
        {trustItems.map((item) => (
          <div key={item.state} className={cn(dashboardRowClass, "p-3")}>
            <Badge variant="outline" className={cn("border", dashboardToneClass(item.tone))}>
              <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
              {item.label}
            </Badge>
            {!compact ? <p className={cn("mt-2 text-xs leading-5", dashboardMutedTextClass)}>{item.detail}</p> : null}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {freshnessItems.map((item) => (
          <Badge key={item.state} variant="outline" className="rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
            <Clock3 className="mr-1 h-3 w-3" aria-hidden="true" />
            {item.label}
          </Badge>
        ))}
        {safeStateItems.map((item) => {
          const Icon = item.icon
          return (
            <Badge key={item.state} variant="outline" className="rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
              <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
              {item.label}
            </Badge>
          )
        })}
      </div>
    </section>
  )
}
