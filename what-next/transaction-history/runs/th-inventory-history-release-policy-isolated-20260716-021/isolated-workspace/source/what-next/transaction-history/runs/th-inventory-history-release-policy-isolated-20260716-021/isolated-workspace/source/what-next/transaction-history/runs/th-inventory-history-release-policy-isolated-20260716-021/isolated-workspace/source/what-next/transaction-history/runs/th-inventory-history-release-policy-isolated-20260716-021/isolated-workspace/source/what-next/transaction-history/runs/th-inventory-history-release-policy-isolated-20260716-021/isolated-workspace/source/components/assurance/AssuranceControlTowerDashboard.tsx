import Link from "next/link"
import { Activity, ArrowUpRight, Bell, CircleAlert, Clock3, ListChecks, ShieldCheck } from "lucide-react"

import { AssuranceIncidentAcknowledgeButton } from "@/components/assurance/AssuranceIncidentActions"
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
import type {
  AssuranceControlTowerBucket,
  AssuranceControlTowerData,
  AssuranceDashboardTone,
} from "@/services/assurance/assurance-control-tower-contracts"

type AssuranceControlTowerDashboardProps = {
  data: AssuranceControlTowerData
  locale: "en" | "fr"
}

const copy = {
  en: {
    title: "Workflow Assurance Control Tower",
    subtitle:
      "Incident routing, engine health, proof state, and owner queues for the workflows that protect ledger-backed operating intelligence.",
    open: "Open",
    blocking: "Blocking",
    overdue: "Overdue",
    hidden: "Hidden",
    engine: "Engine health",
    incidents: "Manager-visible incidents",
    recentRuns: "Recent check runs",
    source: "Source",
    detail: "Detail",
    proofBlocked: "Proof issue",
    noIncidents: "No visible workflow assurance incident needs action.",
  },
  fr: {
    title: "Tour de controle assurance workflows",
    subtitle:
      "Routage des incidents, sante moteur, preuves et files proprietaires pour les workflows qui protegent l'intelligence operationnelle adossee au grand livre.",
    open: "Ouverts",
    blocking: "Bloquants",
    overdue: "En retard",
    hidden: "Masques",
    engine: "Sante moteur",
    incidents: "Incidents visibles",
    recentRuns: "Controles recents",
    source: "Source",
    detail: "Detail",
    proofBlocked: "Preuve",
    noIncidents: "Aucun incident d'assurance workflow visible ne necessite une action.",
  },
} as const

export function AssuranceControlTowerDashboard({ data, locale }: AssuranceControlTowerDashboardProps) {
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-5xl">
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("border", dashboardToneClass("brand"))}>Proof-linked</Badge>
                <Badge className={cn("border", dashboardToneClass("gold"))}>Permission-routed</Badge>
                <Badge className={cn("border", dashboardToneClass(data.engineHealth.state === "healthy" ? "success" : "danger"))}>
                  {data.engineHealth.state}
                </Badge>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">
                {t.title}
              </h1>
              <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>{t.subtitle}</p>
            </div>
            <div className={cn(dashboardRowClass, "min-w-0 p-3 text-sm lg:min-w-[340px]")}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--dash-success)]" aria-hidden="true" />
                <span className="font-medium text-[var(--dash-text)]">{data.organizationId}</span>
              </div>
              <p className="mt-2 text-xs text-[var(--dash-text-soft)]">{formatDateTime(data.generatedAt, formatterLocale)}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile label={t.open} value={data.summary.open} tone="brand" />
          <SummaryTile label={t.blocking} value={data.summary.blocking + data.summary.complianceCritical} tone="danger" />
          <SummaryTile label={t.overdue} value={data.summary.overdue} tone="gold" />
          <SummaryTile label={t.hidden} value={data.summary.hiddenByPermission} tone="spruce" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className={cn(dashboardPanelClass, "p-4")}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--dash-text)]">{t.incidents}</h2>
                <p className={cn("text-sm", dashboardMutedTextClass)}>
                  {data.summary.redacted} redacted / {data.summary.suppressed} suppressed / {data.summary.waived} waived
                </p>
              </div>
              <Badge variant="outline" className={cn("border", dashboardToneClass("info"))}>
                <ListChecks className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {data.incidents.length}
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              {data.incidents.length ? (
                data.incidents.map((incident) => (
                  <article key={incident.id} className={cn(dashboardRowClass, "p-3")}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn("border", dashboardToneClass(severityTone(incident.severity)))}>{incident.severity}</Badge>
                          <Badge className={cn("border", dashboardToneClass(statusTone(incident.status)))}>{incident.status}</Badge>
                          <EvidenceGradeBadge grade={incident.evidenceGrade} />
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-[var(--dash-text)]">{incident.title}</h3>
                        <p className={cn("mt-1 text-sm leading-6", dashboardMutedTextClass)}>{incident.detail}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--dash-text-soft)]">
                          <span>{incident.workflow}</span>
                          <span>{incident.sourceLabel}</span>
                          <span>{formatDateTime(incident.lastDetectedAt, formatterLocale)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <AssuranceIncidentAcknowledgeButton
                          incidentId={incident.id}
                          status={incident.status}
                          locale={locale}
                        />
                        <Button asChild size="sm" variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                          <Link href={incident.detailRoute}>
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            {t.detail}
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                          <Link href={incident.sourceRoute}>
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            {t.source}
                          </Link>
                        </Button>
                      </div>
                    </div>
                    {incident.proofSummary.blockerReason ? (
                      <div className="mt-3 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-2 text-xs text-[var(--dash-text)]">
                        {t.proofBlocked}: {incident.proofSummary.blockerReason}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--dash-border-subtle)] p-8 text-center text-sm text-[var(--dash-text-soft)]">
                  {t.noIncidents}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <Panel title={t.engine} icon={<Activity className="h-4 w-4" />}>
              <div className="grid gap-2 text-sm">
                <EngineMetric icon={<Clock3 className="h-4 w-4" />} label="Recent runs" value={data.engineHealth.recentRunCount} />
                <EngineMetric icon={<CircleAlert className="h-4 w-4" />} label="Stale running" value={data.engineHealth.staleRunningCount} />
                <EngineMetric icon={<CircleAlert className="h-4 w-4" />} label="Failed runs" value={data.engineHealth.failedRunCount} />
                <EngineMetric icon={<Bell className="h-4 w-4" />} label="Pending alerts" value={data.engineHealth.pendingAlertCount} />
                <EngineMetric icon={<Bell className="h-4 w-4" />} label="Failed alerts" value={data.engineHealth.failedAlertCount} />
              </div>
            </Panel>

            <Panel title="Severity queues" icon={<ListChecks className="h-4 w-4" />}>
              <BucketList buckets={data.severityBuckets} />
            </Panel>
            <Panel title="Workflow queues" icon={<ListChecks className="h-4 w-4" />}>
              <BucketList buckets={data.workflowBuckets.slice(0, 8)} />
            </Panel>
            <Panel title={t.recentRuns} icon={<Clock3 className="h-4 w-4" />}>
              <div className="space-y-2">
                {data.recentRuns.slice(0, 6).map((run) => (
                  <div key={run.id} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-2 text-xs">
                    <div className="font-medium text-[var(--dash-text)]">{run.checkKey}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[var(--dash-text-soft)]">
                      <span>{run.runStatus}</span>
                      <span>{run.resultStatus ?? "pending"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  )
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: AssuranceDashboardTone }) {
  return (
    <div className={cn(dashboardPanelClass, "p-4")}>
      <p className="text-xs font-medium uppercase tracking-normal text-[var(--dash-text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-[var(--dash-text)]">{value}</p>
      <div className="mt-3 h-1 rounded-full bg-[var(--dash-border-subtle)]">
        <div className={cn("h-1 rounded-full", toneBar(tone))} style={{ width: value > 0 ? "72%" : "18%" }} />
      </div>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={cn(dashboardPanelClass, "p-4")}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--dash-text)]">
        <span className="text-[var(--dash-brand-strong)]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  )
}

function BucketList({ buckets }: { buckets: AssuranceControlTowerBucket[] }) {
  return (
    <div className="space-y-2">
      {buckets.map((bucket) => (
        <div key={bucket.key} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] px-3 py-2 text-sm">
          <span className="text-[var(--dash-text-soft)]">{bucket.label}</span>
          <Badge className={cn("border", dashboardToneClass(bucket.tone))}>{bucket.count}</Badge>
        </div>
      ))}
    </div>
  )
}

function EngineMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] px-3 py-2">
      <span className="flex items-center gap-2 text-[var(--dash-text-soft)]">
        <span className="text-[var(--dash-info)]">{icon}</span>
        {label}
      </span>
      <span className="font-semibold text-[var(--dash-text)]">{value}</span>
    </div>
  )
}

function severityTone(severity: string): AssuranceDashboardTone {
  if (severity === "blocking" || severity === "compliance_critical") return "danger"
  if (severity === "high") return "gold"
  if (severity === "warning") return "info"
  return "muted"
}

function statusTone(status: string): AssuranceDashboardTone {
  if (status === "resolved" || status === "closed" || status === "waived") return "success"
  if (status === "suppressed") return "muted"
  if (status === "reopened") return "danger"
  if (status === "assigned" || status === "in_progress") return "info"
  return "gold"
}

function toneBar(tone: AssuranceDashboardTone) {
  if (tone === "danger") return "bg-[var(--dash-danger)]"
  if (tone === "gold") return "bg-[var(--dash-gold)]"
  if (tone === "spruce") return "bg-[var(--dash-spruce)]"
  if (tone === "success") return "bg-[var(--dash-success)]"
  if (tone === "info") return "bg-[var(--dash-info)]"
  return "bg-[var(--dash-brand)]"
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
