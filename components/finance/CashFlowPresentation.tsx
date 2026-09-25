"use client"

import { useTranslations } from "next-intl"
import { ArrowDown, ArrowDownLeft, ArrowUpRight, ArrowRight } from "lucide-react"

import type { FinanceTrendPoint } from "@/services/finance/finance-dashboard.service"
import type { Locale } from "@/types/bilingual"
import { cn } from "@/lib/utils"
import { dashboardEmptyClass, dashboardRowClass, dashboardValueTone } from "./finance-dashboard-theme"

export function CashFlowNavigation() {
  const t = useTranslations("financeDashboard.cashFlow")
  return (
    <nav aria-label={t("navigation")} className="flex flex-wrap gap-2">
      {["overview", "movement", "aging", "payments"].map((section, index) => (
        <a key={section} href={`#cash-flow-${section}`} className="dashboard-filter-chip inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--dash-text-soft)] transition-colors hover:border-[var(--dash-brand)] hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">
          <span aria-hidden="true" className="text-xs tabular-nums text-[var(--dash-text-faint)]">0{index + 1}</span>
          {t(`navigationLabels.${section}`)}
          <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      ))}
    </nav>
  )
}

export function CashFlowSectionHeading({ section }: { section: "aging" | "payments" }) {
  const t = useTranslations("financeDashboard.cashFlow")
  return (
    <div className="flex min-w-0 items-center gap-4 pt-2">
      <div className="min-w-0">
        <h2 id={`cash-flow-${section}-title`} className="text-lg font-semibold tracking-tight text-[var(--dash-text)]">{t(`${section}Title`)}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">{t(`${section}Description`)}</p>
      </div>
      <div aria-hidden="true" className="hidden h-px flex-1 bg-[var(--dash-border-subtle)] sm:block" />
    </div>
  )
}

export function CashFlowMovementSummary({ trend, locale, money }: {
  trend: FinanceTrendPoint[]
  locale: Locale
  money: (value: number) => string
}) {
  const t = useTranslations("financeDashboard.cashFlow")
  if (!trend.length) return <p className={dashboardEmptyClass}>{t("emptyMovement")}</p>

  const totals = trend.reduce((result, point) => ({ inflow: result.inflow + point.inflow, outflow: result.outflow + point.outflow, net: result.net + point.net }), { inflow: 0, outflow: 0, net: 0 })
  const lower = Math.min(0, ...trend.flatMap((point) => [point.inflow, point.outflow]))
  const upper = Math.max(1, ...trend.flatMap((point) => [point.inflow, point.outflow]))
  const y = (amount: number) => 150 - ((amount - lower) / (upper - lower)) * 130
  const step = 580 / trend.length
  const barWidth = Math.min(12, step * 0.32)
  const number = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })
  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" })
  const metrics = [
    { label: t("inflow"), value: totals.inflow, Icon: ArrowDownLeft, tone: "text-[var(--dash-success)]", soft: "bg-[var(--dash-success-soft)]" },
    { label: t("outflow"), value: totals.outflow, Icon: ArrowUpRight, tone: "text-[var(--dash-gold)]", soft: "bg-[var(--dash-gold-soft)]" },
    { label: t("net"), value: totals.net, Icon: ArrowRight, tone: dashboardValueTone(totals.net), soft: "bg-[var(--dash-brand-soft)]" },
  ]

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" data-testid="cash-flow-movement-summary">
      <figure className={cn(dashboardRowClass, "min-w-0 p-4")}>
        <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-[var(--dash-text)]">{t("chartTitle")}</span>
          <span className="flex gap-4 text-xs text-[var(--dash-text-soft)]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--dash-success)]" />{t("inflow")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--dash-gold)]" />{t("outflow")}</span>
          </span>
        </figcaption>
        <div className="mt-3 flex gap-2">
          <div aria-hidden="true" className="flex h-40 w-12 shrink-0 flex-col justify-between py-3 text-right text-[10px] tabular-nums text-[var(--dash-text-faint)]">
            {[upper, (upper + lower) / 2, lower].map((amount, index) => <span key={index}>{number.format(amount)}</span>)}
          </div>
          <svg viewBox="52 0 586 164" preserveAspectRatio="none" role="img" aria-label={t("chartDescription")} className="h-40 min-w-0 flex-1">
            {[upper, (upper + lower) / 2, lower].map((amount, index) => (
              <g key={index}>
                <line x1="52" x2="636" y1={y(amount)} y2={y(amount)} stroke="var(--dash-border-subtle)" strokeDasharray="3 4" />
              </g>
            ))}
            {trend.map((point, index) => (
              <g key={point.key}>
                <title>{`${date.format(new Date(point.key))}: ${t("inflow")} ${money(point.inflow)}, ${t("outflow")} ${money(point.outflow)}`}</title>
                <rect x={54 + step * (index + 0.5) - barWidth} y={Math.min(y(0), y(point.inflow))} width={barWidth} height={Math.abs(y(0) - y(point.inflow))} rx="2" fill="var(--dash-success)" />
                <rect x={55 + step * (index + 0.5)} y={Math.min(y(0), y(point.outflow))} width={barWidth} height={Math.abs(y(0) - y(point.outflow))} rx="2" fill="var(--dash-gold)" />
              </g>
            ))}
            <line x1="52" x2="636" y1={y(0)} y2={y(0)} stroke="var(--dash-border)" />
          </svg>
        </div>
        <div aria-hidden="true" className="ml-14 flex justify-between gap-2 text-xs text-[var(--dash-text-soft)]">
          <span>{date.format(new Date(trend[0].key))}</span>
          {trend.length > 1 ? <span>{date.format(new Date(trend[trend.length - 1].key))}</span> : null}
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--dash-text-faint)]">{t("chartNote")}</p>
      </figure>
      <dl className="grid min-w-0 gap-3 sm:grid-cols-3 xl:grid-cols-1">
        {metrics.map(({ label, value, Icon, tone, soft }) => (
          <div key={label} className={cn(dashboardRowClass, "flex min-w-0 items-center gap-3 p-3")}>
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", soft, tone)}><Icon aria-hidden="true" className="h-4 w-4" /></span>
            <div className="min-w-0"><dt className="text-xs font-medium text-[var(--dash-text-soft)]">{label}</dt><dd className={cn("mt-1 break-words text-lg font-semibold tabular-nums", tone)}>{money(value)}</dd></div>
          </div>
        ))}
      </dl>
    </div>
  )
}
