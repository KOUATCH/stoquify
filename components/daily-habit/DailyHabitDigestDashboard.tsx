"use client"

import { useMemo, useState } from "react"
import { CalendarDays, EyeOff, LayoutList, LockKeyhole } from "lucide-react"

import {
  BICommandBriefHeader,
  BIBusinessTruthZone,
  BIKpiCard,
  BIRiskOpportunityRadar,
  BIWhatChangedStrip,
} from "@/components/bi"
import { Button } from "@/components/ui/button"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BICommandMode, BIDailyDigest } from "@/services/bi/bi-contracts"
import type { DailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest-contracts"

type DailyHabitDigestDashboardProps = {
  data: DailyHabitDigestData
  locale: "en" | "fr"
}

const copy = {
  en: {
    title: "Daily Habit Digest",
    subtitle: "Read-only owner, manager, finance, accountant, stockkeeper, end-of-day, and weekly review surfaces from existing signals.",
    hidden: "Some signal actions are hidden because this user lacks their required permission.",
    actions: "Digest actions",
    noActions: "No visible action is due for this digest.",
    generated: "Generated",
    period: "Period",
  },
  fr: {
    title: "Digest quotidien",
    subtitle: "Surfaces de revue en lecture seule pour proprietaire, manager, finance, comptable, stock, fin de jour et semaine.",
    hidden: "Certaines actions sont masquees car l'utilisateur n'a pas la permission requise.",
    actions: "Actions du digest",
    noActions: "Aucune action visible pour ce digest.",
    generated: "Genere",
    period: "Periode",
  },
} as const

export function DailyHabitDigestDashboard({ data, locale }: DailyHabitDigestDashboardProps) {
  const [selectedId, setSelectedId] = useState(data.digests[0]?.id ?? "")
  const [mode, setMode] = useState<BICommandMode>("brief")
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"
  const selectedDigest = useMemo(
    () => data.digests.find((digest) => digest.id === selectedId) ?? data.digests[0] ?? null,
    [data.digests, selectedId],
  )

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-md border px-2 py-1 text-xs", dashboardToneClass("success"))}>Read-only</span>
                <span className={cn("rounded-md border px-2 py-1 text-xs", dashboardToneClass("brand"))}>Signal-backed</span>
                <span className={cn("rounded-md border px-2 py-1 text-xs", dashboardToneClass("gold"))}>No automation</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">{t.title}</h1>
                <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>{t.subtitle}</p>
              </div>
            </div>
            <div className={cn(dashboardRowClass, "min-w-0 p-3 text-sm xl:min-w-[420px]")}>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--dash-info)]" aria-hidden="true" />
                <span className="font-medium text-[var(--dash-text)]">{data.organizationName ?? data.organizationId}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-[var(--dash-text-soft)]">
                <MetaLine label={t.generated} value={formatDateTime(data.generatedAt, formatterLocale)} />
                <MetaLine label={t.period} value={`${formatDate(data.periodStart, formatterLocale)} - ${formatDate(data.periodEnd, formatterLocale)}`} />
              </dl>
            </div>
          </div>
        </section>

        <section className={cn(dashboardPanelClass, "p-3")}>
          <div className="flex gap-2 overflow-x-auto">
            {data.digests.map((digest) => (
              <Button
                key={digest.id}
                type="button"
                size="sm"
                variant={digest.id === selectedDigest?.id ? "default" : "outline"}
                onClick={() => {
                  setSelectedId(digest.id)
                  setMode(digest.commandBrief.mode)
                }}
                className={cn(
                  "h-9 shrink-0 rounded-lg",
                  digest.id === selectedDigest?.id
                    ? "dashboard-button-primary"
                    : "border-[var(--dash-border-subtle)] text-[var(--dash-text)]",
                )}
              >
                <LayoutList className="h-4 w-4" aria-hidden="true" />
                {digest.audienceRole.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </section>

        {selectedDigest ? (
          <>
            <BICommandBriefHeader
              brief={selectedDigest.commandBrief}
              mode={mode}
              onModeChange={setMode}
            />

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedDigest.zones.flatMap((zone) => zone.cards).map((card) => (
                <BIKpiCard key={card.id} card={card} locale={formatterLocale} currencyCode={data.currency} />
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
              <BIWhatChangedStrip
                changes={selectedDigest.changes}
                title="Digest signals"
                detail="Business signals derived from existing snapshots and permission-filtered for this role."
                maxItems={5}
              />
              <DigestActions digest={selectedDigest} emptyLabel={t.noActions} title={t.actions} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
              <BIRiskOpportunityRadar
                risks={selectedDigest.risks}
                title="Digest risk radar"
                detail="Visible signal-backed risks ranked for the selected role."
                maxItems={5}
              />
              {selectedDigest.zones[0] ? (
                <BIBusinessTruthZone zone={selectedDigest.zones[0]} locale={formatterLocale} currencyCode={data.currency} />
              ) : null}
            </section>
          </>
        ) : null}

        {data.actionQueue.filteredOutCount > 0 ? (
          <section className={cn(dashboardPanelClass, "border-[var(--dash-gold)] p-3")}>
            <div className="flex gap-2 text-sm text-[var(--dash-text)]">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
              <p>{t.hidden}</p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}

function DigestActions({
  digest,
  title,
  emptyLabel,
}: {
  digest: BIDailyDigest
  title: string
  emptyLabel: string
}) {
  return (
    <section className={cn(dashboardPanelClass, "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2>
          <p className={cn("mt-1 text-sm", dashboardMutedTextClass)}>Read-only links to the source workflow.</p>
        </div>
        <span className="rounded-md border border-[var(--dash-border-subtle)] px-2 py-1 text-xs text-[var(--dash-text-soft)]">
          {digest.actions.length}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {digest.actions.length ? digest.actions.map((action) => (
          <article key={action.id} className={cn(dashboardRowClass, "p-3")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--dash-text)]">{action.label}</p>
                <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{action.requiredPermission}</p>
              </div>
              <Button asChild={!action.disabled} size="sm" variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                {action.disabled ? (
                  <span>
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                    Hidden
                  </span>
                ) : (
                  <a href={action.href}>Open</a>
                )}
              </Button>
            </div>
          </article>
        )) : (
          <p className="text-sm text-[var(--dash-text-soft)]">{emptyLabel}</p>
        )}
      </div>
    </section>
  )
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-medium text-[var(--dash-text)]">{value}</dd>
    </div>
  )
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(value))
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
