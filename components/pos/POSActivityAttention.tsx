import Link from "next/link"
import { AlertTriangle, ChevronRight } from "lucide-react"

import { OfflineConflictReview } from "@/components/pos/offline/OfflineConflictReview"
import { cn } from "@/lib/utils"
import type { POSActivityAttentionData } from "@/services/pos/pos-activity-attention.types"
import type { POSActivityPage } from "@/services/pos/pos-activity.types"

import { ActivityStatus, activityLinkClass, activityMutedClass, activityPanelClass, posActivityDetailId } from "./pos-activity-presentation"

const copy = {
  en: {
    heading: "Needs attention",
    empty: "No cash differences or receipt delivery issues found for this business date and selection.",
    emptyPage: "The records on this page have changed. Check the next page or return to the first page.",
    unavailable: "Could not load attention items.",
    first: "Return to first page",
    next: "Next page",
    cash: "Cash difference",
    failed: "WhatsApp failed",
    uncertain: "WhatsApp outcome uncertain",
    offline: "Current register offline status",
    current: "This reflects server records for the selected register, regardless of the business date or shift.",
    asOf: "As of",
    choose: "Select a register to check current offline conflicts and close blockers.",
    offlineUnavailable: "Current register offline status is unavailable.",
    offlineClear: "No open conflicts or close blockers recorded on the server.",
    conflict: "Open conflicts",
    blocker: "Close blockers",
    review: "Review offline evidence",
  },
  fr: {
    heading: "À examiner",
    empty: "Aucun écart de caisse ni problème d’envoi de reçu pour cette date d’activité et cette sélection.",
    emptyPage: "Les éléments de cette page ont changé. Consultez la page suivante ou revenez à la première page.",
    unavailable: "Impossible de charger les éléments à examiner.",
    first: "Revenir à la première page",
    next: "Page suivante",
    cash: "Écart de caisse",
    failed: "Échec WhatsApp",
    uncertain: "Résultat WhatsApp incertain",
    offline: "État hors ligne actuel de la caisse",
    current: "Ces données proviennent du serveur pour la caisse sélectionnée, quelle que soit la date d’activité ou la session.",
    asOf: "Vérifié à",
    choose: "Sélectionnez une caisse pour consulter les conflits hors ligne et les blocages de clôture actuels.",
    offlineUnavailable: "L’état hors ligne actuel de la caisse est indisponible.",
    offlineClear: "Aucun conflit ouvert ni blocage de clôture enregistré sur le serveur.",
    conflict: "Conflits ouverts",
    blocker: "Blocages de clôture",
    review: "Examiner les éléments hors ligne",
  },
} as const

export function POSActivityAttention({ activity, locale, path, attention }: {
  activity: POSActivityPage
  locale: string
  path: string
  attention: POSActivityAttentionData | null
}) {
  const language = locale === "fr" ? "fr" : "en"
  const t = copy[language]
  const currency = new Intl.NumberFormat(language, { style: "currency", currency: activity.currency, signDisplay: "exceptZero" })
  const time = new Intl.DateTimeFormat(language, { timeStyle: "short", timeZone: activity.timezone })
  const dateTime = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short", timeZone: activity.timezone })
  const offline = attention?.offline
  const params = new URLSearchParams({
    date: activity.date,
    locationId: activity.filters.locationId ?? "",
    terminalId: activity.filters.terminalId ?? "",
    sessionId: activity.filters.sessionId ?? "",
    view: "attention",
  })
  const startHref = `${path}?${params.toString()}`

  if (attention === null) return (
    <section className={cn(activityPanelClass, "space-y-2 px-4 py-3")} aria-label={t.heading}>
      <p role="alert">{t.unavailable}</p>
      <Link className={cn(activityLinkClass, "inline-flex min-h-11 items-center text-sm underline")} href={startHref} prefetch={false}>
        {t.first}
      </Link>
    </section>
  )

  return (
    <section aria-labelledby="pos-attention-heading" className={cn(activityPanelClass, "space-y-4 px-4 py-3")}>
      <h2 id="pos-attention-heading" className="text-base font-semibold">{t.heading}</h2>
      {attention.rows.length === 0 && (
        <p className={cn(activityMutedClass, "text-sm")}>{attention.nextCursor ? t.emptyPage : t.empty}</p>
      )}
      {attention.rows.length > 0 && (
        <ul className="divide-y divide-[var(--dash-border-subtle)]">
          {attention.rows.map((row) => {
            const detail = new URLSearchParams({
              date: activity.date, view: row.kind === "cash" ? "all" : "receipts",
              locationId: row.locationId, terminalId: row.terminalId ?? "", sessionId: row.sessionId ?? "",
              kind: row.kind === "cash" ? "shift_close" : "sale", id: row.id,
            })
            const label = row.kind === "cash" ? t.cash : row.status === "FAILED" ? t.failed : t.uncertain
            return (
              <li key={`${row.kind}:${row.id}`}>
                <Link
                  href={`${path}?${detail.toString()}#${posActivityDetailId}`}
                  prefetch={false}
                  className={cn(activityLinkClass, "grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-1 py-2.5 hover:bg-[var(--dash-brand-soft)]")}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{row.reference}</span>
                      <ActivityStatus label={label} tone={row.status === "FAILED" ? "danger" : "warning"} />
                    </div>
                    <p className={cn(activityMutedClass, "break-words text-xs [overflow-wrap:anywhere]")}>
                      <time dateTime={row.occurredAt}>{time.format(new Date(row.occurredAt))}</time> · {row.location}{row.terminal && ` · ${row.terminal}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.variance !== null && <span className="text-sm font-semibold tabular-nums">{currency.format(Number(row.variance))}</span>}
                    <ChevronRight className={cn(activityMutedClass, "size-4")} aria-hidden="true" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {attention.nextCursor && (
        <Link
          href={`${startHref}&${new URLSearchParams({ cursor: attention.nextCursor }).toString()}`}
          prefetch={false}
          className={cn(activityLinkClass, "inline-flex min-h-11 items-center text-sm font-medium underline")}
        >
          {t.next}
        </Link>
      )}
      {offline && (
        <section aria-labelledby="pos-attention-offline-heading" className="space-y-2 border-t border-[var(--dash-border-subtle)] pt-4">
          <h3 id="pos-attention-offline-heading" className="text-sm font-semibold">{t.offline}</h3>
          {offline.state === "choose_register" && <p className={cn(activityMutedClass, "text-sm")}>{t.choose}</p>}
          {offline.state === "unavailable" && <p className={cn(activityMutedClass, "text-sm")}>{t.offlineUnavailable}</p>}
          {offline.state === "ready" && (
            <>
              <p className={cn(activityMutedClass, "text-xs")}>
                {t.current} {t.asOf} <time dateTime={offline.asOf}>{dateTime.format(new Date(offline.asOf))}</time>.
              </p>
              {offline.conflictCount > 0 || offline.closeBlockerCount > 0 ? (
                <details className="space-y-2 rounded-lg border border-[var(--dash-warning)]/35 px-3 py-1">
                  <summary className={cn(activityLinkClass, "min-h-11 cursor-pointer py-2 text-sm font-medium")}>
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                      <AlertTriangle className="size-4 text-[var(--dash-warning)]" aria-hidden="true" />
                      {t.review}
                      <span className={activityMutedClass}>{t.conflict} {offline.conflictCount} · {t.blocker} {offline.closeBlockerCount}</span>
                    </span>
                  </summary>
                  <OfflineConflictReview
                    access={offline.access}
                    conflicts={offline.conflicts}
                    count={offline.conflictCount}
                    locationId={offline.locationId}
                    terminalId={offline.terminalId}
                  />
                </details>
              ) : <p className={cn(activityMutedClass, "text-sm")}>{t.offlineClear}</p>}
            </>
          )}
        </section>
      )}
    </section>
  )
}
