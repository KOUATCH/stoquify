import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, CirclePlus } from "lucide-react"

import { biLocale, biCopy } from "@/lib/dashboard/bi-presentation"
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
  contentKind?: "changes" | "observations"
  locale?: string
  timezone?: string
  changes: BIChangeEvent[]
  title?: string
  detail?: string
  className?: string
  maxItems?: number
}

export function BIWhatChangedStrip({
  changes,
  title,
  detail,
  className,
  maxItems = 5,
  locale = "en",
  timezone = "UTC",
  contentKind = "changes",
}: BIWhatChangedStripProps) {
  const t = biCopy[biLocale(locale)]
  const visible = changes.slice(0, maxItems)
  const onlyObservations = contentKind === "observations" || (changes.length > 0 && changes.every(change => change.direction === "observed"))
  const observedCopy = biLocale(locale) === "fr"
    ? { title: "Signaux actuels", detail: "Observations issues des sources actuelles, sans comparaison avec un instantané antérieur.", count: changes.length === 1 ? "observation" : "observations", label: "Observé", value: "Valeur actuelle", score: "Score de risque", unavailable: "Comparaison historique indisponible", emptyTitle: "Aucune observation visible", emptyDetail: "Aucune observation n’est disponible pour ce périmètre et vos autorisations. Consultez les limites des sources ; cela ne confirme pas l’absence de risque." }
    : { title: "Current signals", detail: "Current source observations without a comparison to an earlier snapshot.", count: changes.length === 1 ? "observation" : "observations", label: "Observed", value: "Current value", score: "Risk score", unavailable: "Historical comparison unavailable", emptyTitle: "No visible observations", emptyDetail: "No observations are available for this scope and your permissions. Review source limitations; this does not confirm the absence of risk." }

  return (
    <section className={cn(dashboardPanelClass, "p-4", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title ?? (onlyObservations ? observedCopy.title : t.changes)}</h2>
          <p className={cn("text-sm", dashboardMutedTextClass)}>{detail ?? (onlyObservations ? observedCopy.detail : t.changeDetail)}</p>
        </div>
        <span className="text-xs font-medium text-[var(--dash-text-soft)]">{changes.length} {onlyObservations ? observedCopy.count : changes.length === 1 ? t.change : t.changesPlural}</span>
      </div>

      {visible.length ? (
        <div className="mt-4 grid gap-3">
          {visible.map((change) => (
            <article key={change.id} className={cn(dashboardRowClass, "p-3")}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <DirectionIcon direction={change.direction} />
                    {change.direction === "observed" ? <span className="text-xs text-[var(--dash-text-soft)]">{observedCopy.label}</span> : null}
                    <BISeverityBadge severity={change.severity} locale={locale} />
                    <BIStateBadge state={change.state} locale={locale} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{change.title}</h3>
                  <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{change.detail || change.businessImpact}</p>
                  {change.detail && change.businessImpact && change.businessImpact !== change.detail ? (
                    <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{change.businessImpact}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-left text-xs text-[var(--dash-text-soft)] lg:text-right">
                  {change.direction === "observed" ? (
                    <>
                      <p className="font-medium text-[var(--dash-text)]">{change.unit === "risk" ? observedCopy.score : observedCopy.value}: {change.currentValue ?? t.none}{change.unit && change.unit !== "risk" ? ` ${change.unit}` : ""}</p>
                      <p>{observedCopy.unavailable}</p>
                    </>
                  ) : <p className="font-medium text-[var(--dash-text)]">{formatChangeValue(change.previousValue, change.currentValue, change.unit, locale)}</p>}
                  <p>{formatDateTime(change.changedAt, locale, timezone)}</p>
                </div>
              </div>
              <BIEvidenceBadgeRow locale={locale}
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
          title={onlyObservations ? observedCopy.emptyTitle : t.noChanges}
          detail={onlyObservations ? observedCopy.emptyDetail : t.noChangesDetail}
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

function formatChangeValue(previousValue: number | string | null, currentValue: number | string | null, unit: string | null, locale: string) {
  const previous = previousValue ?? biCopy[biLocale(locale)].none
  const current = currentValue ?? biCopy[biLocale(locale)].none
  return `${previous} -> ${current}${unit ? ` ${unit}` : ""}`
}

function formatDateTime(value: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
