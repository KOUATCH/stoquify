"use client"

import { useEffect, useMemo, useState, type MouseEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, EyeOff, LayoutList, LockKeyhole } from "lucide-react"
import { AgentCommandPanel } from "@/components/agents/AgentCommandPanel"
import styles from "./DailyHabitDigestDashboard.module.css"

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
import type { CommandAgentSurfaceAccess } from "@/services/agents/command-agent-contracts"

type DailyHabitDigestDashboardProps = {
  data: DailyHabitDigestData
  locale: "en" | "fr"
  commandAgentAccess?: CommandAgentSurfaceAccess
  proposalDraftsEnabled?: boolean
}
const DISABLED_COMMAND_AGENT_ACCESS: CommandAgentSurfaceAccess = {
  mode: "off",
  canRun: false,
  canRender: false,
  reason: "disabled",
}


const copy = {
  en: {
    readOnly: "Read-only", signalBacked: "Signal-backed", noAutomation: "No automation",
    signals: "Digest signals", signalsDetail: "Business signals derived from existing snapshots and permission-filtered for this role.",
    radar: "Digest risk radar", radarDetail: "Visible signal-backed risks ranked for the selected role.",
    sourceLinks: "Read-only links to the source workflow.", open: "Open", hiddenAction: "Hidden",
    roles: { owner: "Owner", manager: "Manager", finance: "Finance", accountant: "Accountant", stockkeeper: "Stockkeeper", end_of_day: "End of day", weekly: "Weekly" },
    viewTitles: { brief: "Summary and changes", command: "Actions and risks", investigate: "Source details" },
    viewHelp: { brief: "Review the key figures and changes, then switch to Command for next steps.", command: "Open the permitted source workflows to act. This digest does not execute or approve work.", investigate: "Inspect the source view and its limitations before relying on the figures." },
    limitations: "Source limitations", blockers: "Blockers", redactions: "Redactions", inspect: "Inspect sources", noSources: "No source view is available for this workspace.",
    title: "Daily Habit Digest",
    subtitle: "Your permission-aware daily and weekly workspaces, built from existing operating signals.",
    hidden: "Some signal actions are hidden because this user lacks their required permission.",
    actions: "Digest actions",
    noActions: "No visible action is due for this digest.",
    generated: "Generated",
    period: "Period",
    currency: "Currency",
    workspaces: "Visible workspaces",
    hiddenWorkspaces: "workspace(s) are hidden by the current role, permissions or module access.",
    noWorkspaceTitle: "No Daily Digest workspace is available",
    noWorkspaceMessage: "No workspace matches the current role, permissions and module access. Return to the dashboard or ask an administrator to review these access settings.",
    back: "Back to dashboard",
  },
  fr: {
    readOnly: "Lecture seule", signalBacked: "Issu des signaux", noAutomation: "Sans automatisation",
    signals: "Signaux du digest", signalsDetail: "Signaux métier issus des instantanés existants et filtrés selon les autorisations de ce rôle.",
    radar: "Risques du digest", radarDetail: "Risques visibles issus des signaux, classés pour le rôle sélectionné.",
    sourceLinks: "Liens en lecture seule vers le processus source.", open: "Ouvrir", hiddenAction: "Masqué",
    roles: { owner: "Dirigeant", manager: "Responsable", finance: "Finance", accountant: "Comptable", stockkeeper: "Magasinier", end_of_day: "Fin de journée", weekly: "Hebdomadaire" },
    viewTitles: { brief: "Synthèse et évolutions", command: "Actions et risques", investigate: "Détails des sources" },
    viewHelp: { brief: "Examinez les chiffres clés et les évolutions, puis passez en mode Pilotage pour les prochaines étapes.", command: "Ouvrez les processus sources autorisés pour agir. Ce digest n’exécute et n’approuve aucune opération.", investigate: "Examinez la vue source et ses limites avant de vous fier aux chiffres." },
    limitations: "Limites des sources", blockers: "Blocages", redactions: "Données masquées", inspect: "Examiner les sources", noSources: "Aucune vue source n’est disponible pour cet espace.",
    title: "Digest quotidien",
    subtitle: "Vos espaces quotidiens et hebdomadaires selon vos permissions, issus des signaux opérationnels existants.",
    hidden: "Certaines actions sont masquées car l'utilisateur n'a pas la permission requise.",
    actions: "Actions du digest",
    noActions: "Aucune action visible pour ce digest.",
    generated: "Généré",
    period: "Période",
    currency: "Devise",
    workspaces: "Espaces visibles",
    hiddenWorkspaces: "espace(s) sont masqués selon le rôle, les permissions ou les accès aux modules actuels.",
    noWorkspaceTitle: "Aucun espace de digest quotidien disponible",
    noWorkspaceMessage: "Aucun espace ne correspond au rôle, aux permissions et aux accès aux modules actuels. Revenez au tableau de bord ou demandez à un administrateur de vérifier ces accès.",
    back: "Retour au tableau de bord",
  },
} as const

export function DailyHabitDigestDashboard({
  data,
  locale,
  commandAgentAccess = DISABLED_COMMAND_AGENT_ACCESS,
  proposalDraftsEnabled = false,
}: DailyHabitDigestDashboardProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(data.digests[0]?.id ?? "")
  const [mode, setMode] = useState<BICommandMode>("brief")
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const restoreView = () => {
      const params = new URL(window.location.href).searchParams
      const requested = data.digests.find(digest => digest.id === params.get("digest"))
      setSelectedId(requested?.id ?? data.digests[0]?.id ?? "")
      const requestedMode = params.get("mode")
      setMode(requestedMode === "command" || requestedMode === "investigate" ? requestedMode : "brief")
      setReady(true)
    }
    restoreView()
    window.addEventListener("popstate", restoreView)
    return () => window.removeEventListener("popstate", restoreView)
  }, [data.digests])
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"
  const timezone = data.timezone ?? "UTC"
  const selectedDigest = useMemo(
    () => data.digests.find((digest) => digest.id === selectedId) ?? data.digests[0] ?? null,
    [data.digests, selectedId],
  )
  function selectView(digestId: string, nextMode: BICommandMode) {
    setSelectedId(digestId)
    setMode(nextMode)
    const url = new URL(window.location.href)
    url.searchParams.set("digest", digestId)
    url.searchParams.set("mode", nextMode)
    window.history.replaceState(window.history.state, "", url)
  }

  function openSourceAtTop(event: MouseEvent<HTMLElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    const anchor = event.target instanceof Element ? event.target.closest("a") : null
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return
    const destination = new URL(anchor.href, window.location.href)
    const dashboard = `/${locale}/dashboard`
    if (destination.origin !== window.location.origin || destination.hash || destination.pathname === window.location.pathname
      || !(destination.pathname === dashboard || destination.pathname.startsWith(`${dashboard}/`))) return
    // Explicit hash navigation avoids carrying a deep Digest scroll position into
    // the next workspace. Keep the original href for native new-tab navigation.
    event.preventDefault()
    router.push(`${destination.pathname}${destination.search}#top`, { scroll: true })
  }

  return (
    <main onClickCapture={openSourceAtTop} className={cn(styles.root, "dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]")}>
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-md border px-2 py-1 text-xs", dashboardToneClass("success"))}>{t.readOnly}</span>
                <span className={cn("rounded-md border px-2 py-1 text-xs", dashboardToneClass("brand"))}>{t.signalBacked}</span>
                <span className={cn("rounded-md border px-2 py-1 text-xs", dashboardToneClass("gold"))}>{t.noAutomation}</span>
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
                <MetaLine label={`${t.generated} (${timezone})`} value={formatDateTime(data.generatedAt, formatterLocale, timezone)} />
                <MetaLine label={`${t.period} (UTC)`} value={`${formatDate(selectedDigest?.periodStart ?? data.periodStart, formatterLocale, "UTC")} - ${formatDate(selectedDigest?.periodEnd ?? data.periodEnd, formatterLocale, "UTC")}`} />
                <MetaLine label={t.currency} value={data.currency} />
                <MetaLine label={t.workspaces} value={data.summary.digestCount.toLocaleString(formatterLocale)} />              </dl>
            </div>
          </div>
        </section>

        <section className={cn(dashboardPanelClass, "p-3")}>
          <div className="-m-1.5 flex gap-2 overflow-x-auto p-1.5">
            {data.digests.map((digest) => (
              <Button
                key={digest.id}
                type="button"
                size="sm"
                variant={digest.id === selectedDigest?.id ? "default" : "outline"}
                aria-pressed={digest.id === selectedDigest?.id}
                disabled={!ready}
                onClick={(event) => {
                  selectView(digest.id, digest.commandBrief.mode)
                  event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
                }}
                className={cn(
                  "h-9 shrink-0 rounded-lg",
                  digest.id === selectedDigest?.id
                    ? "dashboard-button-primary"
                    : "border-[var(--dash-border-subtle)] text-[var(--dash-text)]",
                )}
              >
                <LayoutList className="h-4 w-4" aria-hidden="true" />
                {t.roles[digest.audienceRole as keyof typeof t.roles] ?? digest.audienceRole.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </section>

        {selectedDigest ? (
          <>
            <AgentCommandPanel
              key={`${data.organizationId}:${data.generatedAt}:${selectedDigest.id}:${selectedDigest.periodStart}:${selectedDigest.periodEnd}:${locale}`}
              access={commandAgentAccess}
              proposalDraftsEnabled={proposalDraftsEnabled}
              digestId={selectedDigest.id}
              periodStart={selectedDigest.periodStart}
              periodEnd={selectedDigest.periodEnd}
              locale={locale}
            />
            <BICommandBriefHeader

              brief={selectedDigest.commandBrief}
              mode={mode}
              onModeChange={nextMode => selectView(selectedDigest.id, nextMode)}
              locale={locale}
              timezone={timezone}
              periodTimezone="UTC"
            />

            {selectedDigest.blockers.length > 0 || selectedDigest.redactions.length > 0 ? (
              <section className={cn(dashboardPanelClass, "border-[var(--dash-gold)] p-4")} aria-label={t.limitations}>
                <h2 className="text-sm font-semibold text-[var(--dash-text)]">{t.limitations}</h2>
                <p className="mt-1 text-sm text-[var(--dash-text-soft)]">
                  {t.blockers}: {selectedDigest.blockers.length.toLocaleString(formatterLocale)} · {t.redactions}: {selectedDigest.redactions.length.toLocaleString(formatterLocale)}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[var(--dash-text-soft)]">
                  {selectedDigest.blockers.map((blocker, index) => (
                    <li key={blocker.id + "-" + index}>
                      <details className="min-w-0 rounded-md [overflow-wrap:anywhere] open:bg-white/[0.035] open:p-2">
                        <summary className="cursor-pointer rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">{blocker.title}</summary>
                        <p className="mt-2">{blocker.detail}</p>
                        {blocker.nextAction ? <p className="mt-2 text-[var(--dash-text)]"><span className="font-semibold">{locale === "fr" ? "Prochaine étape" : "Next step"}: </span>{blocker.nextAction}</p> : null}
                      </details>
                    </li>
                  ))}
                </ul>
                {mode !== "investigate" ? <Button type="button" variant="outline" size="sm" className="mt-3" disabled={!ready} onClick={() => selectView(selectedDigest.id, "investigate")} aria-controls="daily-digest-view">{t.inspect}</Button> : null}
              </section>
            ) : null}

            <section id="daily-digest-view" aria-label={t.viewTitles[mode]} className="space-y-4">
              <div className={cn(dashboardPanelClass, "p-4")}>
                <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.viewTitles[mode]}</h2>
                <p role="status" className={cn("mt-1 text-sm", dashboardMutedTextClass)}>{t.viewHelp[mode]}</p>
              </div>
              {mode === "brief" ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {selectedDigest.zones.flatMap((zone) => zone.cards).map((card) => (
                      <BIKpiCard key={card.id} card={card} locale={formatterLocale} currencyCode={data.currency} />
                    ))}
                  </div>
                  <BIWhatChangedStrip contentKind="observations" changes={selectedDigest.changes} title={t.signals} locale={locale} timezone={timezone} detail={t.signalsDetail} maxItems={5} />
                </>
              ) : mode === "command" ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  <DigestActions digest={selectedDigest} emptyLabel={t.noActions} title={t.actions} locale={locale} />
                  <BIRiskOpportunityRadar risks={selectedDigest.risks} title={t.radar} locale={locale} currencyCode={data.currency} detail={t.radarDetail} maxItems={5} />
                </div>
              ) : (
                selectedDigest.zones.length ? selectedDigest.zones.map(zone => (
                  <BIBusinessTruthZone key={zone.id} zone={zone} locale={formatterLocale} currencyCode={data.currency} />
                )) : <p role="status" className={cn(dashboardPanelClass, "p-4", dashboardMutedTextClass)}>{t.noSources}</p>
              )}
            </section>
          </>
        ) : (
          <section className={cn(dashboardPanelClass, "p-6")} role="status">
            <div className="flex max-w-3xl items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dash-gold)]" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-[var(--dash-text)]">{t.noWorkspaceTitle}</h2>
                <p className={cn("mt-2 text-sm leading-6", dashboardMutedTextClass)}>{t.noWorkspaceMessage}</p>
                <Button asChild size="sm" variant="outline" className="mt-4 rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                  <a href={"/" + locale + "/dashboard"}>{t.back}</a>
                </Button>
              </div>
            </div>
          </section>
        )}

        {data.actionQueue.filteredOutCount > 0 || data.summary.hiddenDigestCount > 0 ? (
          <section className={cn(dashboardPanelClass, "border-[var(--dash-gold)] p-3")}>
            <div className="flex gap-2 text-sm text-[var(--dash-text)]">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
              <div className="space-y-1">
                {data.actionQueue.filteredOutCount > 0 ? <p>{t.hidden}</p> : null}
                {data.summary.hiddenDigestCount > 0 ? (
                  <p>{data.summary.hiddenDigestCount.toLocaleString(formatterLocale)} {t.hiddenWorkspaces}</p>
                ) : null}
              </div>
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
  locale,
}: {
  digest: BIDailyDigest
  title: string
  emptyLabel: string
  locale: "en" | "fr"
}) {
  return (
    <section className={cn(dashboardPanelClass, "min-w-0 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2>
          <p className={cn("mt-1 text-sm", dashboardMutedTextClass)}>{copy[locale].sourceLinks}</p>
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
                {action.disabled && action.disabledReason ? <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{action.disabledReason}</p> : null}
              </div>
              <Button asChild={!action.disabled} disabled={action.disabled} title={action.disabledReason ?? undefined} size="sm" variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                {action.disabled ? (
                  <span>
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                    {copy[locale].hiddenAction}
                  </span>
                ) : (
                  <Link href={action.href} prefetch={false}>{copy[locale].open}</Link>
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

function formatDate(value: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone }).format(new Date(value))
}

function formatDateTime(value: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value))
}
