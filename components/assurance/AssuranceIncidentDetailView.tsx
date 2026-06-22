import Link from "next/link"
import { ArrowLeft, ArrowUpRight, CalendarClock, EyeOff, FileSearch, GitBranch, ShieldCheck } from "lucide-react"

import { AssuranceIncidentActions } from "@/components/assurance/AssuranceIncidentActions"
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
import type { AssuranceIncidentDetailData } from "@/services/assurance/assurance-control-tower-contracts"

type AssuranceIncidentDetailViewProps = {
  data: AssuranceIncidentDetailData
  locale: "en" | "fr"
}

const copy = {
  en: {
    back: "Control Tower",
    source: "Open source workflow",
    proof: "Proof subject",
    timeline: "Timeline",
    waivers: "Waivers",
    evidence: "Evidence",
    noWaivers: "No waiver has been recorded for this incident.",
    redactions: "Redactions",
  },
  fr: {
    back: "Tour de controle",
    source: "Ouvrir le workflow source",
    proof: "Sujet de preuve",
    timeline: "Chronologie",
    waivers: "Derogations",
    evidence: "Preuve",
    noWaivers: "Aucune derogation n'a ete enregistree pour cet incident.",
    redactions: "Masquages",
  },
} as const

export function AssuranceIncidentDetailView({ data, locale }: AssuranceIncidentDetailViewProps) {
  const t = copy[locale]
  const incident = data.incident
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1440px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <Button asChild variant="ghost" className="mb-4 rounded-lg text-[var(--dash-text-soft)] hover:text-[var(--dash-text)]">
            <Link href="/dashboard/assurance/control-tower">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t.back}
            </Link>
          </Button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-5xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", dashboardToneClass("danger"))}>{incident.severity}</Badge>
                <Badge className={cn("border", dashboardToneClass("gold"))}>{incident.status}</Badge>
                <EvidenceGradeBadge grade={incident.evidenceGrade} />
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">
                {incident.title}
              </h1>
              <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>{incident.detail}</p>
            </div>
            <Button asChild variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
              <Link href={incident.sourceRoute}>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                {t.source}
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Panel title={t.evidence} icon={<FileSearch className="h-4 w-4" />}>
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <Info label="Source label" value={incident.sourceLabel} />
                <Info label="Source hash" value={incident.sourceHash} />
                <Info label="Workflow" value={incident.workflow} />
                <Info label="Required permission" value={incident.requiredPermission} />
                <Info label="Owner role" value={incident.ownerRole} />
                <Info label="Occurrences" value={String(incident.occurrenceCount)} />
              </dl>
              {incident.proofSubject ? (
                <div className={cn(dashboardRowClass, "mt-4 p-3")}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dash-text)]">
                    <GitBranch className="h-4 w-4 text-[var(--dash-brand-strong)]" aria-hidden="true" />
                    {t.proof}
                  </div>
                  <p className="mt-2 break-words text-sm text-[var(--dash-text-soft)]">
                    {incident.proofSubject.subjectType} / {incident.proofSubject.subjectId}
                  </p>
                </div>
              ) : null}
              {incident.proofSummary.blockerReason ? (
                <div className="mt-4 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-3 text-sm text-[var(--dash-text)]">
                  {incident.proofSummary.blockerReason}
                </div>
              ) : null}
            </Panel>

            <Panel title={t.timeline} icon={<CalendarClock className="h-4 w-4" />}>
              <div className="space-y-3">
                {data.timeline.map((event) => (
                  <article key={event.id} className={cn(dashboardRowClass, "p-3")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                        {event.eventType}
                      </Badge>
                      {event.toStatus ? <Badge className={cn("border", dashboardToneClass("info"))}>{event.toStatus}</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm text-[var(--dash-text)]">{event.message}</p>
                    <p className="mt-1 text-xs text-[var(--dash-text-soft)]">
                      {formatDateTime(event.createdAt, formatterLocale)}
                      {event.actorId ? ` / ${event.actorId}` : ""}
                    </p>
                  </article>
                ))}
              </div>
            </Panel>
          </div>

          <aside className="space-y-4">
            <AssuranceIncidentActions incident={incident} waivers={data.waivers} locale={locale} />

            <Panel title={t.waivers} icon={<ShieldCheck className="h-4 w-4" />}>
              {data.waivers.length ? (
                <div className="space-y-2">
                  {data.waivers.map((waiver) => (
                    <div key={waiver.id} className={cn(dashboardRowClass, "p-3 text-sm")}>
                      <div className="font-medium text-[var(--dash-text)]">{waiver.status}</div>
                      <p className="mt-1 break-words text-xs text-[var(--dash-text-soft)]">{waiver.evidenceHash}</p>
                      <p className="mt-2 text-xs text-[var(--dash-text-soft)]">
                        {formatDateTime(waiver.requestedAt, formatterLocale)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--dash-text-soft)]">{t.noWaivers}</p>
              )}
            </Panel>

            <Panel title={t.redactions} icon={<EyeOff className="h-4 w-4" />}>
              {data.redactions.length ? (
                <div className="space-y-2">
                  {data.redactions.map((redaction) => (
                    <div key={redaction.id} className={cn(dashboardRowClass, "p-3 text-sm")}>
                      <div className="font-medium text-[var(--dash-text)]">{redaction.field}</div>
                      <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{redaction.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--dash-text-soft)]">No protected evidence was redacted for this view.</p>
              )}
            </Panel>
          </aside>
        </section>
      </div>
    </main>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(dashboardRowClass, "min-w-0 p-3")}>
      <dt className="text-xs uppercase tracking-normal text-[var(--dash-text-faint)]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-[var(--dash-text)]">{value}</dd>
    </div>
  )
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
