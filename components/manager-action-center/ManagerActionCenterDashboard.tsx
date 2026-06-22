import Link from "next/link"
import {
  ArrowUpRight,
  CalendarClock,
  EyeOff,
  ListChecks,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { BIEvidenceBadgeRow } from "@/components/bi/BIEvidenceBadgeRow"
import { BIEmptyState } from "@/components/bi/BIEmptyState"
import { BIKpiCard } from "@/components/bi/BIKpiCard"
import { BISeverityBadge, BIStateBadge } from "@/components/bi/BIStateBadge"
import { EvidenceGradeBadge } from "@/components/evidence/EvidenceGradeBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { ManagerActionCenterData } from "@/services/manager-action-center/manager-action-center-contracts"

type ManagerActionCenterDashboardProps = {
  data: ManagerActionCenterData
  locale: "en" | "fr"
  title: string
  subtitle: string
}

const copy = {
  en: {
    readOnly: "Read-only",
    evidenceBacked: "Evidence-backed",
    permissionFiltered: "Permission-filtered",
    generated: "Generated",
    period: "Period",
    open: "Open",
    critical: "Critical",
    overdue: "Overdue",
    hidden: "Hidden",
    actions: "Manager actions",
    insights: "Business signals",
    noActions: "No manager action is visible for this tenant and permission set.",
    noSignals: "No business signal is visible for this tenant and permission set.",
    nextStep: "Next step",
    due: "Due",
    role: "Role",
    requiredPermission: "Required permission",
    openSurface: "Open",
    hiddenNotice: "Some actions are withheld by server-side permission filtering.",
  },
  fr: {
    readOnly: "Lecture seule",
    evidenceBacked: "Appuye sur preuves",
    permissionFiltered: "Filtre par permission",
    generated: "Genere",
    period: "Periode",
    open: "Ouvert",
    critical: "Critique",
    overdue: "En retard",
    hidden: "Masque",
    actions: "Actions manager",
    insights: "Signaux metier",
    noActions: "Aucune action manager n'est visible pour ce tenant et ces permissions.",
    noSignals: "Aucun signal metier n'est visible pour ce tenant et ces permissions.",
    nextStep: "Prochaine etape",
    due: "Echeance",
    role: "Role",
    requiredPermission: "Permission requise",
    openSurface: "Ouvrir",
    hiddenNotice: "Certaines actions sont retenues par le filtrage serveur des permissions.",
  },
} as const

export function ManagerActionCenterDashboard({
  data,
  locale,
  title,
  subtitle,
}: ManagerActionCenterDashboardProps) {
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"
  const periodLabel = `${formatDate(data.periodStart, formatterLocale)} - ${formatDate(data.periodEnd, formatterLocale)}`

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-5xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", dashboardToneClass("success"))}>{t.readOnly}</Badge>
                <Badge className={cn("border", dashboardToneClass("brand"))}>{t.evidenceBacked}</Badge>
                <Badge className={cn("border", dashboardToneClass("gold"))}>{t.permissionFiltered}</Badge>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">
                  {title}
                </h1>
                <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>{subtitle}</p>
              </div>
            </div>
            <div className={cn(dashboardRowClass, "min-w-0 p-3 text-sm lg:min-w-[340px]")}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--dash-success)]" aria-hidden="true" />
                <span className="font-medium text-[var(--dash-text)]">{data.organizationId}</span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-[var(--dash-text-soft)] sm:grid-cols-2 lg:grid-cols-1">
                <div className="flex items-center justify-between gap-3">
                  <dt>{t.generated}</dt>
                  <dd className="font-medium text-[var(--dash-text)]">
                    {formatDateTime(data.generatedAt, formatterLocale)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>{t.period}</dt>
                  <dd className="font-medium text-[var(--dash-text)]">{periodLabel}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile label={t.open} value={data.summary.open} tone="brand" />
          <SummaryTile label={t.critical} value={data.summary.critical} tone="danger" />
          <SummaryTile label={t.overdue} value={data.summary.overdue} tone="gold" />
          <SummaryTile label={t.hidden} value={data.summary.hiddenByPermission} tone="spruce" />
        </section>

        {data.summary.hiddenByPermission > 0 ? (
          <div className="rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-3 text-sm text-[var(--dash-text)]">
            <div className="flex gap-2">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
              <p>{t.hiddenNotice}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.kpis.map((card) => (
            <BIKpiCard key={card.id} card={card} locale={formatterLocale} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className={cn(dashboardPanelClass, "p-4")}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.actions}</h2>
                <p className={cn("text-sm", dashboardMutedTextClass)}>
                  {data.summary.total} total / {data.summary.assigned} assigned / {data.summary.redacted} redacted
                </p>
              </div>
              <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                <ListChecks className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {data.actionQueue.generatedAt ? formatDateTime(data.actionQueue.generatedAt, formatterLocale) : t.generated}
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              {data.actionItems.length ? (
                data.actionItems.slice(0, 10).map((item) => (
                  <article key={item.id} className={cn(dashboardRowClass, "p-3")}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <BISeverityBadge severity={item.severity} />
                          <BIStateBadge state={item.state} />
                          <EvidenceGradeBadge grade={item.evidenceGrade} />
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{item.title}</h3>
                        <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{item.nextStep}</p>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="shrink-0 rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]"
                      >
                        <Link href={item.actionLink.href}>
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          {t.openSurface}
                        </Link>
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-[var(--dash-text-soft)] md:grid-cols-3">
                      <InfoLine icon={<CalendarClock className="h-3.5 w-3.5" />} label={t.due}>
                        {formatDateTime(item.dueAt, formatterLocale)} / {item.dueState}
                      </InfoLine>
                      <InfoLine icon={<Sparkles className="h-3.5 w-3.5" />} label={t.role}>
                        {item.assignedRole}
                      </InfoLine>
                      <InfoLine icon={<LockKeyhole className="h-3.5 w-3.5" />} label={t.requiredPermission}>
                        {item.requiredPermission}
                      </InfoLine>
                    </div>
                    {item.redactions.length || item.blockers.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.blockers.map((blocker) => (
                          <Badge key={blocker.id} variant="outline" className={cn("border", dashboardToneClass("danger"))}>
                            {blocker.title}
                          </Badge>
                        ))}
                        {item.redactions.map((redaction) => (
                          <Badge key={redaction.id} variant="outline" className={cn("border", dashboardToneClass("gold"))}>
                            <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />
                            {redaction.field}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <BIEmptyState title={t.noActions} />
              )}
            </div>
          </div>

          <div className={cn(dashboardPanelClass, "p-4")}>
            <div>
              <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.insights}</h2>
              <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>
                {data.insights.length} visible signal{data.insights.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {data.insights.length ? (
                data.insights.map((insight) => (
                  <article key={insight.id} className={cn(dashboardRowClass, "p-3")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <BISeverityBadge severity={insight.severity} />
                      <BIStateBadge state={insight.state} />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{insight.title}</h3>
                    <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{insight.businessImpact}</p>
                    <BIEvidenceBadgeRow
                      className="mt-3"
                      evidenceGrade={insight.evidenceGrade}
                      trustState={insight.trustState}
                      freshness={insight.freshness}
                    />
                    {insight.actionLink && !insight.actionLink.disabled ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="mt-3 rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]"
                      >
                        <Link href={insight.actionLink.href}>
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          {insight.actionLink.label}
                        </Link>
                      </Button>
                    ) : null}
                  </article>
                ))
              ) : (
                <BIEmptyState title={t.noSignals} />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "brand" | "danger" | "gold" | "spruce" }) {
  return (
    <div className={cn(dashboardPanelClass, "p-4")}>
      <p className={cn("text-xs font-medium uppercase tracking-normal", dashboardMutedTextClass)}>{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-[var(--dash-text)]">{value}</p>
      <div className="mt-3 h-1 rounded-full bg-[var(--dash-border-subtle)]">
        <div className={cn("h-1 rounded-full", summaryBarClass(tone))} style={{ width: value > 0 ? "72%" : "18%" }} />
      </div>
    </div>
  )
}

function InfoLine({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
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

function summaryBarClass(tone: "brand" | "danger" | "gold" | "spruce") {
  if (tone === "danger") return "bg-[var(--dash-danger)]"
  if (tone === "gold") return "bg-[var(--dash-gold)]"
  if (tone === "spruce") return "bg-[var(--dash-spruce)]"
  return "bg-[var(--dash-brand)]"
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
