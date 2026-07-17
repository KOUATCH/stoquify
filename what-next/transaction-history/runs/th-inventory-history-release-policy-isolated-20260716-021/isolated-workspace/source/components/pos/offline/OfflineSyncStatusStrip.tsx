"use client"

import { AlertTriangle, Clock3, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useOfflineSyncDashboard } from "@/hooks/posHooks/useOfflineSync"

type OfflineSyncStatusStripProps = {
  locationId?: string | null
  terminalId?: string | null
  sessionId?: string | null
  locale?: "en" | "fr"
  className?: string
}

const copy = {
  en: {
    noTerminal: "Choose a location and terminal to start offline sync monitoring.",
    loading: "Checking offline sync state...",
    unavailable: "Offline sync evidence is unavailable.",
    permissionDenied: "Offline sync status requires POS transaction access.",
    ready: "Online certified path",
    degraded: "Offline degraded path armed",
    blocked: "Offline close blocked",
    pending: "pending",
    conflicts: "conflicts",
    blockers: "blockers",
    noDevice: "No enrolled offline device for this terminal.",
    asOf: "As of",
    retry: "Retry",
    session: "Session",
  },
  fr: {
    noTerminal: "Choisissez un site et un terminal pour surveiller la synchronisation hors ligne.",
    loading: "Verification de l'etat de synchronisation hors ligne...",
    unavailable: "Les preuves de synchronisation hors ligne sont indisponibles.",
    permissionDenied: "Le statut hors ligne requiert l'acces aux transactions POS.",
    ready: "Parcours certifie en ligne",
    degraded: "Mode degrade hors ligne arme",
    blocked: "Cloture hors ligne bloquee",
    pending: "en attente",
    conflicts: "conflits",
    blockers: "blocages",
    noDevice: "Aucun appareil hors ligne enrole pour ce terminal.",
    asOf: "A",
    retry: "Reessayer",
    session: "Session",
  },
} as const

function formatAsOf(value: string, locale: "en" | "fr") {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function OfflineSyncStatusStrip({
  locationId,
  terminalId,
  sessionId,
  locale = "en",
  className,
}: OfflineSyncStatusStripProps) {
  const t = copy[locale]
  const enabled = Boolean(locationId && terminalId)
  const query = useOfflineSyncDashboard(
    {
      locationId: locationId ?? undefined,
      terminalId: terminalId ?? undefined,
      limit: 10,
    },
    { enabled },
  )

  if (!enabled) {
    return (
      <section className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(15,23,42,0.48)] px-4 py-3 text-sm text-[var(--dash-text-soft)]", className)}>
        <WifiOff className="h-4 w-4 text-[var(--dash-text-muted)]" />
        <span>{t.noTerminal}</span>
      </section>
    )
  }

  if (query.isLoading) {
    return (
      <section className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(15,23,42,0.48)] px-4 py-3 text-sm text-[var(--dash-text-soft)]", className)}>
        <RefreshCw className="h-4 w-4 animate-spin text-[var(--dash-info)]" />
        <span>{t.loading}</span>
      </section>
    )
  }

  if (query.isError) {
    const message = query.error instanceof Error ? query.error.message : t.unavailable
    const permissionDenied = /forbidden|unauth/i.test(message)

    return (
      <section className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--dash-danger)]/40 bg-[rgba(127,29,29,0.28)] px-4 py-3 text-sm text-[#fee2e2]", className)}>
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="truncate">{permissionDenied ? t.permissionDenied : t.unavailable}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()} className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/15">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          {t.retry}
        </Button>
      </section>
    )
  }

  const data = query.data
  const summary = data?.summary
  const hasDevice = summary ? summary.deviceCount > 0 : false
  const conflictCount = summary ? summary.openConflictCount : 0
  const pendingCount = summary ? summary.pendingEventCount : 0
  const blockerCount = summary ? summary.closeBlockerCount : 0
  const blocked = conflictCount > 0 || blockerCount > 0

  return (
    <section className={cn(
      "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-[0_14px_34px_rgba(5,12,16,0.18)]",
      blocked
        ? "border-[var(--dash-warning)]/45 bg-[rgba(120,53,15,0.32)] text-[#ffedd5]"
        : "border-[var(--dash-border-subtle)] bg-[rgba(10,30,38,0.62)] text-[var(--dash-text-soft)]",
      className,
    )}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {blocked ? <AlertTriangle className="h-4 w-4 text-[var(--dash-warning)]" /> : <ShieldCheck className="h-4 w-4 text-[var(--dash-spruce)]" />}
        <span className="font-medium text-[var(--dash-text)]">
          {blocked ? t.blocked : hasDevice ? t.degraded : t.ready}
        </span>
        {!hasDevice ? (
          <span className="text-xs text-[var(--dash-text-soft)]">{t.noDevice}</span>
        ) : null}
        {sessionId ? (
          <Badge variant="outline" className="border-white/15 bg-white/5 text-[var(--dash-text-soft)]">
            {t.session}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-[var(--dash-info)]/35 bg-[var(--dash-info-soft)] text-[#dff1ff]">
          <Clock3 className="mr-1 h-3.5 w-3.5" />
          {pendingCount} {t.pending}
        </Badge>
        <Badge variant={conflictCount > 0 ? "destructive" : "outline"} className={conflictCount > 0 ? "" : "border-white/15 bg-white/5 text-[var(--dash-text-soft)]"}>
          {conflictCount} {t.conflicts}
        </Badge>
        <Badge variant={blockerCount > 0 ? "secondary" : "outline"} className={blockerCount > 0 ? "" : "border-white/15 bg-white/5 text-[var(--dash-text-soft)]"}>
          {blockerCount} {t.blockers}
        </Badge>
        {data?.asOf ? (
          <span className="flex items-center gap-1 text-xs text-[var(--dash-text-muted)]">
            <Wifi className="h-3.5 w-3.5" />
            {t.asOf} {formatAsOf(data.asOf, locale)}
          </span>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()} className="h-8 border-white/15 bg-white/5 px-2.5 text-[var(--dash-text)] hover:bg-white/10">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="sr-only">{t.retry}</span>
        </Button>
      </div>
    </section>
  )
}
