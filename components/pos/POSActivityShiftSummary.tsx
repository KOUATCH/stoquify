import Link from "next/link"

import { cn } from "@/lib/utils"
import type { POSActivityShiftSummary as ShiftSummary } from "@/services/pos/pos-activity-shift-summary"
import type { POSActivityPage } from "@/services/pos/pos-activity.types"

import { posActivityCopy } from "./pos-activity-copy"
import { activityHref, activityLinkClass, activityMutedClass, activityPanelClass } from "./pos-activity-presentation"

const summaryCopy = {
  en: { title: "Shift-close summary", variance: "Over/short", details: "View shift close" },
  fr: { title: "Résumé de clôture", variance: "Excédent / manque", details: "Voir la clôture" },
}

export function POSActivityShiftSummary({ summary, activity, locale }: {
  summary: ShiftSummary
  activity: Pick<POSActivityPage, "date" | "filters">
  locale: "en" | "fr"
}) {
  const copy = posActivityCopy[locale]
  const labels = summaryCopy[locale]
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: summary.currency })
  const signedMoney = new Intl.NumberFormat(locale, { style: "currency", currency: summary.currency, signDisplay: "exceptZero" })
  const closeDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(`${summary.closeDate}T00:00:00Z`))
  const href = activityHref(`/${locale}/dashboard/pos/activity`, activity, {
    date: summary.closeDate,
    locationId: summary.locationId,
    terminalId: summary.terminalId,
    sessionId: summary.sessionId,
    view: "all",
    search: "",
    kind: "shift_close",
    id: summary.sessionId,
  })
  const figures = [
    { label: copy.expectedCash, value: summary.expected === null ? null : money.format(Number(summary.expected)) },
    { label: copy.countedCash, value: summary.counted === null ? null : money.format(Number(summary.counted)) },
    { label: labels.variance, value: summary.variance === null ? null : signedMoney.format(Number(summary.variance)) },
  ]
  const figuresAndLink = (
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <dl className="flex min-w-0 flex-1 flex-wrap gap-x-5 gap-y-2">
        {figures.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className={cn(activityMutedClass, "text-xs")}>{label}</dt>
            <dd className={cn("break-words text-sm font-semibold tabular-nums", value === null && activityMutedClass)}>
              {value ?? copy.unrecorded}
            </dd>
          </div>
        ))}
      </dl>
      <Link href={href} prefetch={false} className={cn(activityLinkClass, "inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--dash-info)] hover:underline")}>
        {labels.details}
      </Link>
    </div>
  )

  return (
    <section aria-label={labels.title} className={activityPanelClass}>
      <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 xl:flex">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{labels.title}</h2>
          <p className={cn(activityMutedClass, "break-words text-xs")}>{summary.sessionNumber} · {closeDate}</p>
        </div>
        {figuresAndLink}
      </div>
      <details className="xl:hidden">
        <summary className={cn(activityLinkClass, "min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold")}>
          {labels.title}
          <span className={cn(activityMutedClass, "ml-2 font-normal [overflow-wrap:anywhere]")}>{summary.sessionNumber} · {closeDate}</span>
        </summary>
        <div className="border-t border-[var(--dash-border-subtle)] px-4 py-2">{figuresAndLink}</div>
      </details>
    </section>
  )
}
