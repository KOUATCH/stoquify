"use client"

import type { ReactNode } from "react"
import { CalendarDays, Clock3, GitBranch, ShieldCheck } from "lucide-react"

import { BIActionButton } from "@/components/bi/BIActionButton"
import { biLocale, biCopy, biGradeCopy } from "@/lib/dashboard/bi-presentation"
import { BIEvidenceBadgeRow, BIFreshnessNotice } from "@/components/bi/BIEvidenceBadgeRow"
import { BICommandModeTabs } from "@/components/bi/BICommandModeTabs"
import { BIStateBadge } from "@/components/bi/BIStateBadge"
import { EvidenceGradeBadge } from "@/components/evidence/EvidenceGradeBadge"
import { Badge } from "@/components/ui/badge"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BICommandBrief, BICommandMode } from "@/services/bi/bi-contracts"

type BICommandBriefHeaderProps = {
  brief: BICommandBrief
  mode?: BICommandMode
  onModeChange?: (mode: BICommandMode) => void
  className?: string
  locale?: string
  timezone?: string
  periodTimezone?: string
  compact?: boolean
}

export function BICommandBriefHeader({
  brief,
  mode = brief.mode,
  onModeChange,
  className,
  locale = "en",
  timezone,
  periodTimezone,
  compact = false,
}: BICommandBriefHeaderProps) {
  const t = biCopy[biLocale(locale)]
  const french = biLocale(locale) === "fr"
  const freshnessState = brief.freshness.stale && brief.freshness.state === "fresh" ? "stale" : brief.freshness.state
  const evidence = (
    <BIEvidenceBadgeRow
      locale={locale}
      className="mt-3"
      evidenceGrade={brief.evidenceGrade}
      trustState={brief.trustState}
      freshness={brief.freshness}
      provenance={brief.provenance}
    />
  )
  return (
    <section className={cn(dashboardPanelClass, "p-4 md:p-5", className)}>
      <div className={cn("flex flex-col gap-4", compact ? "lg:flex-row lg:items-start" : "xl:flex-row xl:items-start xl:justify-between")}>
        <div className={cn("min-w-0 space-y-3", compact ? "flex-1" : "max-w-5xl")}>
          <div className="flex flex-wrap items-center gap-2">
            <BIStateBadge state={brief.state} locale={locale} />
            {!compact ? <Badge variant="outline" className={cn("gap-1.5 border", dashboardToneClass("brand"))}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t.brief}
            </Badge> : null}
            <Badge variant="outline" className="gap-1.5 rounded-md border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {t[freshnessState]}
            </Badge>
            {compact ? <>
              <EvidenceGradeBadge grade={brief.evidenceGrade} locale={locale} />
              <span className="text-xs text-[var(--dash-text-soft)]">
                {french ? "Confiance" : "Trust"}: {biGradeCopy[biLocale(locale)][brief.trustState]}
              </span>
            </> : null}
          </div>

          <div>
            <h1 className={cn("font-semibold tracking-normal text-[var(--dash-text)]", compact ? "text-xl sm:text-2xl" : "text-2xl md:text-3xl")}>
              {brief.title}
            </h1>
            {!compact ? <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>
              {brief.summary}
            </p> : null}
          </div>

          <div className={compact ? "space-y-2" : cn(dashboardRowClass, "p-3")}>
            <p className="text-sm font-semibold text-[var(--dash-text)]">{brief.conclusion}</p>
            {compact ? <>
              <BIFreshnessNotice freshness={brief.freshness} locale={locale} compact />
              <details className="rounded-md border border-[var(--dash-border-subtle)] px-3">
                <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--dash-text-soft)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">
                  {french ? "Preuves et sources" : "Evidence and sources"}
                </summary>
                <div className="pb-3">
                  <p className={cn("mb-3 text-sm leading-6", dashboardMutedTextClass)}>{brief.summary}</p>
                  <MetaLine icon={<GitBranch className="h-3.5 w-3.5" />} label={t.sources}>
                    {brief.sourceModules.length ? brief.sourceModules.join(", ") : t.noSources}
                  </MetaLine>
                  {evidence}
                </div>
              </details>
            </> : evidence}
          </div>
        </div>

        <aside className={cn("flex w-full min-w-0 flex-col gap-3", compact ? "lg:w-[340px] lg:shrink-0" : "xl:w-[420px]")}>
          <BICommandModeTabs value={mode} onValueChange={onModeChange} locale={locale} />
          <div className={cn(dashboardRowClass, "space-y-2 p-3 text-xs text-[var(--dash-text-soft)]")}>
            <MetaLine icon={<CalendarDays className="h-3.5 w-3.5" />} label={periodTimezone ? `${t.period} (${periodTimezone})` : t.period}>
              {formatPeriod(brief.periodStart, brief.periodEnd, locale, periodTimezone ?? timezone)}
            </MetaLine>
            <MetaLine icon={<Clock3 className="h-3.5 w-3.5" />} label={t.generated}>
              {formatDateTime(brief.generatedAt, locale, timezone)}
            </MetaLine>
            {!compact ? <MetaLine icon={<GitBranch className="h-3.5 w-3.5" />} label={t.sources}>
              {brief.sourceModules.length ? brief.sourceModules.join(", ") : t.noSources}
            </MetaLine> : null}
            {brief.reviewState ? (
              <MetaLine icon={<ShieldCheck className="h-3.5 w-3.5" />} label={t.review}>
                {t[brief.reviewState.state]}
              </MetaLine>
            ) : null}
          </div>
          {brief.primaryAction ? <BIActionButton action={brief.primaryAction} locale={locale} context={brief.title} primary /> : null}
        </aside>
      </div>
    </section>
  )
}

function MetaLine({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[var(--dash-text-faint)]">{icon}</span>
      <p className="min-w-0">
        <span className="font-medium text-[var(--dash-text)]">{label}: </span>
        <span className="break-words">{children}</span>
      </p>
    </div>
  )
}

function formatPeriod(start: string | null, end: string | null, locale: string, timezone?: string) {
  if (!start && !end) return biCopy[biLocale(locale)].notSet
  if (!start) return `${biCopy[biLocale(locale)].until} ${formatDate(end, locale, timezone)}`
  if (!end) return `${biCopy[biLocale(locale)].from} ${formatDate(start, locale, timezone)}`
  return `${formatDate(start, locale, timezone)} - ${formatDate(end, locale, timezone)}`
}

function formatDate(value: string | null, locale: string, timezone?: string) {
  if (!value) return biCopy[biLocale(locale)].notSet
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: timezone }).format(new Date(value))
}

function formatDateTime(value: string, locale: string, timezone?: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
