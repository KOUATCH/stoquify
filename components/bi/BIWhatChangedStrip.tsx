import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, CirclePlus } from "lucide-react"

import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow"
import { BISeverityBadge, BIStateBadge } from "@/components/bi/BIStateBadge"
import { BIStateSurface } from "@/components/bi/BIStateSurface"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BIChangeDirection, BIChangeEvent } from "@/services/bi/bi-contracts"

type BIWhatChangedStripProps = {
  changes: BIChangeEvent[]
  title?: string
  detail?: string
  className?: string
  maxItems?: number
}

export function BIWhatChangedStrip({
  changes,
  title = "What changed",
  detail = "Important business movement since the last trusted review.",
  className,
  maxItems = 5,
}: BIWhatChangedStripProps) {
  const visible = changes.slice(0, maxItems)

  return (
    <section className={cn(dashboardPanelClass, "p-4", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2>
          <p className={cn("text-sm", dashboardMutedTextClass)}>{detail}</p>
        </div>
        <span className="text-xs font-medium text-[var(--dash-text-soft)]">{changes.length} change{changes.length === 1 ? "" : "s"}</span>
      </div>

      {visible.length ? (
        <div className="mt-4 grid gap-3">
          {visible.map((change) => (
            <article key={change.id} className={cn(dashboardRowClass, "p-3")}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <DirectionIcon direction={change.direction} />
                    <BISeverityBadge severity={change.severity} />
                    <BIStateBadge state={change.state} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{change.title}</h3>
                  <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{change.businessImpact || change.detail}</p>
                </div>
                <div className="shrink-0 text-left text-xs text-[var(--dash-text-soft)] lg:text-right">
                  <p className="font-medium text-[var(--dash-text)]">{formatChangeValue(change.previousValue, change.currentValue, change.unit)}</p>
                  <p>{formatDateTime(change.changedAt)}</p>
                </div>
              </div>
              <BIEvidenceBadgeRow
                className="mt-3"
                evidenceGrade={change.evidenceGrade}
                trustState={change.trustState}
                freshness={change.freshness}
                provenance={change.provenance}
              />
            </article>
          ))}
        </div>
      ) : (
        <BIStateSurface
          state="empty"
          title="No important changes yet"
          detail="When trusted snapshots or business signals move, the command surface will show the most important changes here."
          className="mt-4"
        />
      )}
    </section>
  )
}

function DirectionIcon({ direction }: { direction: BIChangeDirection }) {
  const className = "h-4 w-4"
  if (direction === "improved") return <ArrowUpRight className={cn(className, "text-[var(--dash-success)]")} aria-hidden="true" />
  if (direction === "worsened") return <ArrowDownRight className={cn(className, "text-[var(--dash-danger)]")} aria-hidden="true" />
  if (direction === "new") return <CirclePlus className={cn(className, "text-[var(--dash-info)]")} aria-hidden="true" />
  if (direction === "resolved") return <CheckCircle2 className={cn(className, "text-[var(--dash-success)]")} aria-hidden="true" />
  return <ArrowRight className={cn(className, "text-[var(--dash-text-soft)]")} aria-hidden="true" />
}

function formatChangeValue(previousValue: number | string | null, currentValue: number | string | null, unit: string | null) {
  const previous = previousValue ?? "none"
  const current = currentValue ?? "none"
  return `${previous} -> ${current}${unit ? ` ${unit}` : ""}`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
