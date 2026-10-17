import { biLocale } from "@/lib/dashboard/bi-presentation"
import { CalendarClock } from "lucide-react"

import { BIActionButton } from "@/components/bi/BIActionButton"
import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow"
import { BISeverityBadge, BIStateBadge } from "@/components/bi/BIStateBadge"
import { BIStateSurface } from "@/components/bi/BIStateSurface"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type {
  BIActionLink,
  BIBlocker,
  BIFreshness,
  BIKpiState,
  BIRedaction,
  BISeverity,
  BITrustState,
} from "@/services/bi/bi-contracts"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"

export type BIActionPriorityItem = {
  id: string
  title: string
  nextStep: string
  severity: BISeverity
  state: BIKpiState
  actionLink: BIActionLink
  evidenceGrade?: EvidenceGrade
  trustState?: BITrustState
  freshness?: BIFreshness
  dueLabel?: string | null
  ownerLabel?: string | null
  blockers?: BIBlocker[]
  redactions?: BIRedaction[]
}

type BIActionPriorityBoardProps = {
  items: BIActionPriorityItem[]
  locale?: string
  title?: string
  detail?: string
  className?: string
  maxItems?: number
  emptyTitle?: string
  emptyDetail?: string
}

export function BIActionPriorityBoard({
  items,
  title,
  detail,
  locale = "en",
  className,
  maxItems = 8,
  emptyTitle,
  emptyDetail,
}: BIActionPriorityBoardProps) {
  const visible = items.slice(0, maxItems)
  const french = biLocale(locale) === "fr"

  return (
    <section className={cn(dashboardPanelClass, "p-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title ?? (french ? "Actions à traiter aujourd’hui" : "What needs action today")}</h2>
          <p className={cn("text-sm", dashboardMutedTextClass)}>{detail ?? (french ? "Actions accessibles selon vos droits, classées par urgence, risque et impact métier." : "Permission-filtered actions ranked by urgency, risk, and business impact.")}</p>
        </div>
        <span className="rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs text-[var(--dash-text-soft)]">
          {items.length} action{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {visible.length ? (
        <div className="mt-4 space-y-3">
          {visible.map((item) => (
            <article key={item.id} className={cn(dashboardRowClass, "p-3")}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <BISeverityBadge severity={item.severity} locale={locale} />
                    <BIStateBadge state={item.state} locale={locale} />
                    {item.dueLabel ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs text-[var(--dash-text-soft)]">
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.dueLabel}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{item.title}</h3>
                  <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{item.nextStep}</p>
                </div>
                <BIActionButton action={item.actionLink} locale={locale} context={item.title} className="lg:max-w-[45%] lg:shrink-0" />
              </div>

              {item.evidenceGrade && item.trustState && item.freshness ? (
                <BIEvidenceBadgeRow
                  locale={locale}
                  className="mt-3"
                  evidenceGrade={item.evidenceGrade}
                  trustState={item.trustState}
                  freshness={item.freshness}
                />
              ) : null}

              {item.ownerLabel || item.blockers?.length || item.redactions?.length ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {item.ownerLabel ? (
                    <span className="rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-[var(--dash-text-soft)]">
                      {item.ownerLabel}
                    </span>
                  ) : null}
                  {item.blockers?.map((blocker) => (
                    <span key={blocker.id} className={cn("rounded-md border px-2 py-1", dashboardToneClass("danger"))}>
                      {blocker.title}
                    </span>
                  ))}
                  {item.redactions?.map((redaction) => (
                    <span key={redaction.id} className={cn("rounded-md border px-2 py-1", dashboardToneClass("gold"))}>
                      {redaction.field}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <BIStateSurface
          state="empty"
          title={emptyTitle ?? (french ? "Aucune action visible à traiter" : "No visible action is due")}
          detail={emptyDetail ?? (french ? "Aucune action accessible selon vos droits n’est actuellement affichée pour cette organisation." : "There is no permission-filtered command action for this user and tenant right now.")}
          className="mt-4"
        />
      )}
    </section>
  )
}
