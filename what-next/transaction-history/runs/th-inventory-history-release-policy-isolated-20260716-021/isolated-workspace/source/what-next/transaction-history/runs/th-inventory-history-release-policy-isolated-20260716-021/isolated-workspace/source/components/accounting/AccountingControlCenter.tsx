"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  FileLock2,
  KeyRound,
  Landmark,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TableProperties,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import type {
  AccountingBlockerCategory,
  AccountingControlCenterBlocker,
  AccountingControlCenterData,
  AccountingReadinessStatus,
} from "@/actions/accounting/settings.actions"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import {
  useAccountingControlCenter,
  useLockAccountingSetup,
} from "@/hooks/useAccountingControlCenter"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type AccountingControlCenterProps = {
  initialData?: AccountingControlCenterData | null
  initialError?: string | null
  locale?: Locale
}

const copy = {
  en: {
    loadingTitle: "Loading accounting control center",
    loadingBody: "Checking mappings, journals, posting rules, periods, and setup-lock controls.",
    errorTitle: "Accounting readiness unavailable",
    retry: "Refresh",
    statusReady: "Operationally ready",
    statusReadyToLock: "Ready to lock",
    statusBlocked: "Blocked",
    settings: "Settings",
    mappings: "Mappings",
    journals: "Journals",
    rules: "Posting rules",
    periods: "Open periods",
    blockers: "Blockers",
    noBlockers: "No setup blockers detected.",
    generated: "As of",
    readinessTitle: "Readiness checklist",
    readinessDescription: "Service-backed setup gates by blocker category.",
    mappingsTitle: "Account mappings",
    mappingsDescription: "Required operational accounts with SYSCOHADA controls.",
    journalsTitle: "Default journals",
    journalsDescription: "Books required before automated and manual postings.",
    rulesTitle: "Posting rules status",
    rulesDescription: "Active effective rule scaffolds for operational posting purposes.",
    periodReady: "Current period is open",
    periodBlocked: "No current open period",
    periodDetail: "Postings require an open period covering today's date.",
    setupLockTitle: "Setup lock control",
    setupLockDescription: "Critical action governed by the sensitive-action control plane.",
    controlPlaneTitle: "Control plane status",
    controlPlaneDescription: "Latest ledger audit and sensitive-action decisions for accounting operations.",
    ledgerEvents: "Ledger events",
    controlEvents: "Control events",
    deniedEvents: "Denied",
    noEvents: "No accounting audit or control events yet.",
    source: "Source",
    actor: "Actor",
    resource: "Resource",
    time: "Time",
    lockAction: "Lock setup",
    confirmLockTitle: "Lock accounting setup?",
    confirmLockBody: "The service will run the accounting readiness preflight again, audit the decision, and only then mark setup ready.",
    cancel: "Cancel",
    confirm: "Confirm lock",
    locked: "Locked",
    available: "Available",
    blocked: "Blocked",
    permission: "Permission",
    assurance: "Assurance",
    risk: "Risk",
    freshAuth: "Fresh auth",
    notSet: "Not set",
    yes: "Yes",
    no: "No",
    ok: "OK",
    warning: "Warning",
    operational: "Operational",
    accounting: "Accounting",
    regulatory: "Regulatory",
    permissionCategory: "Permission",
    account: "Account",
    required: "Required",
    syscohada: "SYSCOHADA",
    status: "Status",
    detail: "Detail",
    journal: "Journal",
    type: "Type",
    manual: "Manual",
    purpose: "Purpose",
    rule: "Rule",
    lines: "Lines",
    effective: "Effective",
    emptyRows: "No records available.",
  },
  fr: {
    loadingTitle: "Chargement du centre de controle comptable",
    loadingBody: "Verification des mappages, journaux, regles d'ecriture, periodes et controles de verrouillage.",
    errorTitle: "Preparation comptable indisponible",
    retry: "Actualiser",
    statusReady: "Operationnel",
    statusReadyToLock: "Pret a verrouiller",
    statusBlocked: "Bloque",
    settings: "Parametres",
    mappings: "Mappages",
    journals: "Journaux",
    rules: "Regles",
    periods: "Periodes ouvertes",
    blockers: "Blocages",
    noBlockers: "Aucun blocage de configuration detecte.",
    generated: "A la date",
    readinessTitle: "Checklist de preparation",
    readinessDescription: "Portes de controle service par categorie de blocage.",
    mappingsTitle: "Mappages comptables",
    mappingsDescription: "Comptes operationnels requis avec controles SYSCOHADA.",
    journalsTitle: "Journaux par defaut",
    journalsDescription: "Livres requis avant les ecritures automatiques et manuelles.",
    rulesTitle: "Statut des regles d'ecriture",
    rulesDescription: "Regles actives et applicables pour les objectifs d'ecriture operationnels.",
    periodReady: "Periode courante ouverte",
    periodBlocked: "Aucune periode courante ouverte",
    periodDetail: "Les ecritures exigent une periode ouverte couvrant la date du jour.",
    setupLockTitle: "Controle de verrouillage",
    setupLockDescription: "Action critique gouvernee par le plan de controle des actions sensibles.",
    controlPlaneTitle: "Statut du plan de controle",
    controlPlaneDescription: "Derniers audits comptables et decisions d'actions sensibles.",
    ledgerEvents: "Audits ledger",
    controlEvents: "Controles",
    deniedEvents: "Refuses",
    noEvents: "Aucun audit comptable ou controle disponible.",
    source: "Source",
    actor: "Acteur",
    resource: "Ressource",
    time: "Date",
    lockAction: "Verrouiller",
    confirmLockTitle: "Verrouiller la configuration comptable ?",
    confirmLockBody: "Le service relancera le controle de preparation, auditera la decision, puis marquera la configuration prete seulement si tout passe.",
    cancel: "Annuler",
    confirm: "Confirmer",
    locked: "Verrouille",
    available: "Disponible",
    blocked: "Bloque",
    permission: "Permission",
    assurance: "Assurance",
    risk: "Risque",
    freshAuth: "Auth recente",
    notSet: "Non defini",
    yes: "Oui",
    no: "Non",
    ok: "OK",
    warning: "Alerte",
    operational: "Operationnel",
    accounting: "Comptable",
    regulatory: "Reglementaire",
    permissionCategory: "Permission",
    account: "Compte",
    required: "Requis",
    syscohada: "SYSCOHADA",
    status: "Statut",
    detail: "Detail",
    journal: "Journal",
    type: "Type",
    manual: "Manuel",
    purpose: "Objectif",
    rule: "Regle",
    lines: "Lignes",
    effective: "Validite",
    emptyRows: "Aucun enregistrement disponible.",
  },
} as const

function pick(locale: Locale, en: string | null | undefined, fr?: string | null) {
  if (locale === "fr" && fr) return fr
  return en || fr || ""
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return copy[locale].notSet
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatDateOnly(value: string | null | undefined, locale: Locale) {
  if (!value) return copy[locale].notSet
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function statusLabel(status: AccountingReadinessStatus, locale: Locale) {
  const t = copy[locale]
  if (status === "ok") return t.ok
  if (status === "warning") return t.warning
  return t.blocked
}

function statusClass(status: AccountingReadinessStatus) {
  if (status === "ok") return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
  if (status === "warning") return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
  return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
}

function categoryLabel(category: AccountingBlockerCategory, locale: Locale) {
  const t = copy[locale]
  if (category === "operational") return t.operational
  if (category === "accounting") return t.accounting
  if (category === "regulatory") return t.regulatory
  return t.permissionCategory
}

function categoryClass(category: AccountingBlockerCategory) {
  if (category === "operational") return "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
  if (category === "accounting") return "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]"
  if (category === "regulatory") return "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]"
  return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
}

function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <section className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
      <div className="flex min-w-0 flex-col gap-3 border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.38)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--dash-text)]">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-5 text-[var(--dash-text-soft)]">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: "brand" | "success" | "warning" | "danger" | "gold" | "info"
}) {
  const tones = {
    brand: "bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]",
    success: "bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    warning: "bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    danger: "bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    gold: "bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    info: "bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
  } as const

  return (
    <div className="min-h-[7.25rem] rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.46)] p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.68rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold leading-tight text-[var(--dash-text)]">{value}</p>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--dash-text-soft)]">{detail}</p>
    </div>
  )
}

function CategoryPills({
  categories,
  locale,
}: {
  categories: AccountingBlockerCategory[]
  locale: Locale
}) {
  if (categories.length === 0) {
    return <span className="text-xs text-[var(--dash-text-faint)]">-</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((category) => (
        <Badge key={category} variant="outline" className={cn("rounded-md px-2 py-0.5", categoryClass(category))}>
          {categoryLabel(category, locale)}
        </Badge>
      ))}
    </div>
  )
}

function BlockerList({
  blockers,
  locale,
}: {
  blockers: AccountingControlCenterBlocker[]
  locale: Locale
}) {
  const t = copy[locale]

  if (blockers.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--dash-success)] bg-[var(--dash-success-soft)] px-4 py-3 text-sm text-[var(--dash-success)]">
        {t.noBlockers}
      </div>
    )
  }

  return (
    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
      {blockers.map((item) => (
        <div key={item.id} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("rounded-md", categoryClass(item.category))}>
              {categoryLabel(item.category, locale)}
            </Badge>
            <Badge variant="outline" className={cn("rounded-md", statusClass(item.severity))}>
              {statusLabel(item.severity, locale)}
            </Badge>
          </div>
          <p className="text-sm leading-5 text-[var(--dash-text-soft)]">{pick(locale, item.messageEn, item.messageFr)}</p>
        </div>
      ))}
    </div>
  )
}

export function AccountingControlCenter({
  initialData = null,
  initialError = null,
  locale = "en",
}: AccountingControlCenterProps) {
  const organizationId = initialData?.organizationId ?? "current"
  const query = useAccountingControlCenter({ organizationId, initialData })
  const data = query.data
  const lockMutation = useLockAccountingSetup(locale, data?.organizationId ?? organizationId)
  const t = copy[locale]

  const status = useMemo(() => {
    if (!data) return { label: t.statusBlocked, tone: "danger" as const, icon: ShieldAlert }
    if (data.status === "ready") return { label: t.statusReady, tone: "success" as const, icon: ShieldCheck }
    if (data.status === "ready_to_lock") return { label: t.statusReadyToLock, tone: "warning" as const, icon: BadgeCheck }
    return { label: t.statusBlocked, tone: "danger" as const, icon: ShieldAlert }
  }, [data, t.statusBlocked, t.statusReady, t.statusReadyToLock])

  if (query.isLoading && !data) {
    return (
      <Panel title={t.loadingTitle} description={t.loadingBody}>
        <div className="flex min-h-[18rem] items-center justify-center p-8 text-center">
          <div>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--dash-brand-strong)]" />
            <p className="mt-4 text-sm text-[var(--dash-text-soft)]">{t.loadingBody}</p>
          </div>
        </div>
      </Panel>
    )
  }

  if (!data) {
    return (
      <Panel title={t.errorTitle} description={initialError || (query.error as Error | null)?.message || t.errorTitle}>
        <div className="flex min-h-[18rem] items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <ShieldAlert className="mx-auto h-9 w-9 text-[var(--dash-danger)]" />
            <p className="mt-3 text-sm leading-6 text-[var(--dash-text-soft)]">
              {initialError || (query.error as Error | null)?.message || t.errorTitle}
            </p>
            <Button type="button" onClick={() => query.refetch()} className="dashboard-button-primary mt-5 h-10 rounded-lg">
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </Button>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricTile
          label={t.settings}
          value={data.settings.setupStatus}
          detail={data.settings.accountingEnabled ? t.statusReady : t.statusReadyToLock}
          icon={status.icon}
          tone={status.tone}
        />
        <MetricTile
          label={t.mappings}
          value={`${data.summary.mappingReadyCount}/${data.summary.mappingRequiredCount}`}
          detail={t.mappingsDescription}
          icon={Landmark}
          tone={data.summary.mappingReadyCount === data.summary.mappingRequiredCount ? "success" : "danger"}
        />
        <MetricTile
          label={t.journals}
          value={`${data.summary.defaultJournalReadyCount}/${data.summary.defaultJournalRequiredCount}`}
          detail={t.journalsDescription}
          icon={BookOpenCheck}
          tone={data.summary.defaultJournalReadyCount === data.summary.defaultJournalRequiredCount ? "success" : "warning"}
        />
        <MetricTile
          label={t.rules}
          value={`${data.summary.postingRuleReadyCount}/${data.summary.postingRuleRequiredCount}`}
          detail={t.rulesDescription}
          icon={TableProperties}
          tone={data.summary.postingRuleReadyCount === data.summary.postingRuleRequiredCount ? "success" : "danger"}
        />
        <MetricTile
          label={t.periods}
          value={data.summary.openPeriodCount.toString()}
          detail={data.periods.currentOpenPeriod ? data.periods.currentOpenPeriod.name : t.periodDetail}
          icon={CalendarDays}
          tone={data.periods.currentOpenPeriod ? "success" : "danger"}
        />
        <MetricTile
          label={t.blockers}
          value={data.summary.blockerCount.toString()}
          detail={`${t.generated}: ${formatDate(data.generatedAt, locale)}`}
          icon={data.summary.blockerCount > 0 ? XCircle : CheckCircle2}
          tone={data.summary.blockerCount > 0 ? "danger" : "success"}
        />
      </div>

      <OpenPeriodBanner data={data} locale={locale} />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <AccountingReadinessChecklist data={data} locale={locale} />
        <SetupLockControl data={data} locale={locale} onLock={() => lockMutation.mutate()} isLocking={lockMutation.isPending} />
      </div>

      <ControlPlaneStatusPanel data={data} locale={locale} />

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <AccountMappingsPanel data={data} locale={locale} />
        <DefaultJournalsPanel data={data} locale={locale} />
      </div>

      <PostingRulesStatusTable data={data} locale={locale} />
    </div>
  )
}

export function ControlPlaneStatusPanel({
  data,
  locale = "en",
}: {
  data: AccountingControlCenterData
  locale?: Locale
}) {
  const t = copy[locale]

  return (
    <Panel
      title={t.controlPlaneTitle}
      description={t.controlPlaneDescription}
      actions={
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-md border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
            {t.ledgerEvents}: {data.controlEvents.ledgerEventCount}
          </Badge>
          <Badge variant="outline" className="rounded-md border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]">
            {t.controlEvents}: {data.controlEvents.controlEventCount}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "rounded-md",
              data.controlEvents.deniedControlEventCount > 0
                ? "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
                : "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
            )}
          >
            {t.deniedEvents}: {data.controlEvents.deniedControlEventCount}
          </Badge>
        </div>
      }
    >
      {data.controlEvents.latest.length === 0 ? (
        <div className="p-5 text-sm text-[var(--dash-text-soft)]">{t.noEvents}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
              <tr>
                <th className="px-4 py-3">{t.source}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3">{t.detail}</th>
                <th className="px-4 py-3">{t.resource}</th>
                <th className="px-4 py-3">{t.actor}</th>
                <th className="px-4 py-3">{t.time}</th>
              </tr>
            </thead>
            <tbody>
              {data.controlEvents.latest.map((event) => (
                <tr key={`${event.source}-${event.id}`} className="border-b border-[var(--dash-border-subtle)] align-top">
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md",
                        event.source === "ledger"
                          ? "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]"
                          : "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
                      )}
                    >
                      {event.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md",
                        event.status === "denied"
                          ? statusClass("blocked")
                          : event.status === "allowed"
                            ? statusClass("ok")
                            : statusClass("warning"),
                      )}
                    >
                      {event.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--dash-text)]">{event.action}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">
                      {event.message || event.reasonCode || event.riskTier || "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--dash-text-soft)]">
                    {event.resourceType}
                    <span className="block max-w-[12rem] truncate text-xs text-[var(--dash-text-faint)]">{event.resourceId || "-"}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[12rem] truncate text-[var(--dash-text-soft)]">{event.actorId || "-"}</td>
                  <td className="px-4 py-3 text-xs leading-5 text-[var(--dash-text-soft)]">{formatDate(event.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

export function OpenPeriodBanner({
  data,
  locale = "en",
}: {
  data: AccountingControlCenterData
  locale?: Locale
}) {
  const t = copy[locale]
  const period = data.periods.currentOpenPeriod

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        period
          ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)]"
          : "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            period ? "bg-[rgba(46,201,138,0.18)] text-[var(--dash-success)]" : "bg-[rgba(239,106,106,0.18)] text-[var(--dash-danger)]",
          )}
        >
          {period ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className={cn("font-semibold", period ? "text-[var(--dash-success)]" : "text-[var(--dash-danger)]")}>
            {period ? t.periodReady : t.periodBlocked}
          </p>
          <p className="mt-1 text-sm leading-5 text-[var(--dash-text-soft)]">
            {period
              ? `${period.name} - ${formatDateOnly(period.startDate, locale)} to ${formatDateOnly(period.endDate, locale)}`
              : t.periodDetail}
          </p>
        </div>
      </div>
      <Badge variant="outline" className={cn("w-fit rounded-md", period ? statusClass("ok") : statusClass("blocked"))}>
        {period ? t.ok : t.blocked}
      </Badge>
    </section>
  )
}

export function AccountingReadinessChecklist({
  data,
  locale = "en",
}: {
  data: AccountingControlCenterData
  locale?: Locale
}) {
  const t = copy[locale]

  return (
    <Panel title={t.readinessTitle} description={t.readinessDescription}>
      <div className="divide-y divide-[var(--dash-border-subtle)]">
        {data.checklist.map((item) => (
          <div key={item.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1.4fr)] lg:items-center">
            <div className="min-w-0">
              <p className="font-medium text-[var(--dash-text)]">{pick(locale, item.labelEn, item.labelFr)}</p>
              <div className="mt-2">
                <CategoryPills categories={[item.category]} locale={locale} />
              </div>
            </div>
            <Badge variant="outline" className={cn("w-fit rounded-md", statusClass(item.status))}>
              {statusLabel(item.status, locale)}
            </Badge>
            <p className="min-w-0 text-sm leading-5 text-[var(--dash-text-soft)]">{pick(locale, item.detailEn, item.detailFr)}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

export function SetupLockControl({
  data,
  locale = "en",
  onLock,
  isLocking,
}: {
  data: AccountingControlCenterData
  locale?: Locale
  onLock: () => void
  isLocking: boolean
}) {
  const t = copy[locale]
  const lock = data.setupLock
  const canSubmit = lock.canLock && !isLocking

  return (
    <Panel title={t.setupLockTitle} description={t.setupLockDescription}>
      <div className="space-y-4 p-4">
        <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.28)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-[var(--dash-text)]">{lock.locked ? t.locked : lock.canLock ? t.available : t.blocked}</p>
              <p className="mt-1 text-sm leading-5 text-[var(--dash-text-soft)]">
                {lock.disabledReasonEn ? pick(locale, lock.disabledReasonEn, lock.disabledReasonFr) : t.confirmLockBody}
              </p>
            </div>
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                lock.locked || lock.canLock
                  ? "bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
                  : "bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
              )}
            >
              {lock.locked || lock.canLock ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </span>
          </div>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <ControlFact icon={KeyRound} label={t.permission} value={lock.requiredPermission} ok={lock.hasPermission} locale={locale} />
          <ControlFact icon={ShieldCheck} label={t.assurance} value={lock.requiredAssurance} ok locale={locale} />
          <ControlFact icon={ShieldAlert} label={t.risk} value={lock.riskTier} ok={lock.riskTier !== "critical" ? true : lock.hasPermission} locale={locale} />
          <ControlFact
            icon={FileLock2}
            label={t.freshAuth}
            value={lock.freshAuthMaxAgeSeconds ? `${lock.freshAuthMaxAgeSeconds}s` : t.notSet}
            ok
            locale={locale}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" disabled={!canSubmit} className="dashboard-button-primary h-10 w-full rounded-lg">
              {isLocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {t.lockAction}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="dashboard-glass-panel border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[var(--dash-text)]">{t.confirmLockTitle}</AlertDialogTitle>
              <AlertDialogDescription className="text-[var(--dash-text-soft)]">{t.confirmLockBody}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="dashboard-button-secondary rounded-lg">{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={onLock} disabled={!canSubmit} className="dashboard-button-primary rounded-lg">
                {isLocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {t.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BlockerList blockers={data.blockers} locale={locale} />
      </div>
    </Panel>
  )
}

function ControlFact({
  icon: Icon,
  label,
  value,
  ok,
  locale,
}: {
  icon: LucideIcon
  label: string
  value: string
  ok: boolean
  locale: Locale
}) {
  const t = copy[locale]

  return (
    <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.28)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[var(--dash-brand-strong)]" />
          <span className="truncate text-xs font-semibold uppercase text-[var(--dash-text-faint)]">{label}</span>
        </div>
        <Badge variant="outline" className={cn("rounded-md", ok ? statusClass("ok") : statusClass("blocked"))}>
          {ok ? t.yes : t.no}
        </Badge>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-[var(--dash-text)]">{value}</p>
    </div>
  )
}

export function AccountMappingsPanel({
  data,
  locale = "en",
}: {
  data: AccountingControlCenterData
  locale?: Locale
}) {
  const t = copy[locale]

  return (
    <Panel title={t.mappingsTitle} description={t.mappingsDescription}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
            <tr>
              <th className="px-4 py-3">{t.required}</th>
              <th className="px-4 py-3">{t.account}</th>
              <th className="px-4 py-3">{t.type}</th>
              <th className="px-4 py-3">{t.syscohada}</th>
              <th className="px-4 py-3">{t.status}</th>
              <th className="px-4 py-3">{t.detail}</th>
            </tr>
          </thead>
          <tbody>
            {data.accountMappings.map((row) => (
              <tr key={row.key} className="border-b border-[var(--dash-border-subtle)] align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--dash-text)]">{row.key}</p>
                  <p className="mt-1 text-xs text-[var(--dash-text-faint)]">{pick(locale, row.labelEn, row.labelFr)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--dash-text)]">{row.code || "-"}</p>
                  <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{pick(locale, row.nameEn, row.nameFr) || "-"}</p>
                </td>
                <td className="px-4 py-3 text-[var(--dash-text-soft)]">
                  {row.requiredType} / {row.requiredNormalBalance}
                </td>
                <td className="px-4 py-3 text-[var(--dash-text-soft)]">
                  {row.syscohadaClass || row.requiredSyscohadaClass}
                  <span className="block text-xs text-[var(--dash-text-faint)]">{row.syscohadaReference || t.notSet}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn("rounded-md", statusClass(row.status))}>
                    {statusLabel(row.status, locale)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <CategoryPills categories={row.blockerCategories} locale={locale} />
                  {row.blockers.length ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--dash-text-soft)]">
                      {row.blockers.map((item) => pick(locale, item.messageEn, item.messageFr)).join("; ")}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export function DefaultJournalsPanel({
  data,
  locale = "en",
}: {
  data: AccountingControlCenterData
  locale?: Locale
}) {
  const t = copy[locale]

  return (
    <Panel title={t.journalsTitle} description={t.journalsDescription}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
            <tr>
              <th className="px-4 py-3">{t.type}</th>
              <th className="px-4 py-3">{t.journal}</th>
              <th className="px-4 py-3">{t.manual}</th>
              <th className="px-4 py-3">{t.status}</th>
              <th className="px-4 py-3">{t.detail}</th>
            </tr>
          </thead>
          <tbody>
            {data.defaultJournals.map((row) => (
              <tr key={row.type} className="border-b border-[var(--dash-border-subtle)] align-top">
                <td className="px-4 py-3 font-medium text-[var(--dash-text)]">{row.type}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--dash-text)]">{row.code || "-"}</p>
                  <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{pick(locale, row.nameEn, row.nameFr) || "-"}</p>
                </td>
                <td className="px-4 py-3 text-[var(--dash-text-soft)]">{row.allowManualEntries === null ? "-" : row.allowManualEntries ? t.yes : t.no}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn("rounded-md", statusClass(row.status))}>
                    {statusLabel(row.status, locale)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs leading-5 text-[var(--dash-text-soft)]">
                  {row.blockers.length
                    ? row.blockers.map((item) => pick(locale, item.messageEn, item.messageFr)).join("; ")
                    : t.ok}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export function PostingRulesStatusTable({
  data,
  locale = "en",
}: {
  data: AccountingControlCenterData
  locale?: Locale
}) {
  const t = copy[locale]

  return (
    <Panel title={t.rulesTitle} description={t.rulesDescription}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-sm">
          <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
            <tr>
              <th className="px-4 py-3">{t.purpose}</th>
              <th className="px-4 py-3">{t.source}</th>
              <th className="px-4 py-3">{t.rule}</th>
              <th className="px-4 py-3">{t.lines}</th>
              <th className="px-4 py-3">{t.effective}</th>
              <th className="px-4 py-3">{t.status}</th>
              <th className="px-4 py-3">{t.detail}</th>
            </tr>
          </thead>
          <tbody>
            {data.postingRules.map((row) => (
              <tr key={row.postingPurpose} className="border-b border-[var(--dash-border-subtle)] align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--dash-text)]">{row.postingPurpose}</p>
                  <p className="mt-1 text-xs text-[var(--dash-text-faint)]">{row.defaultCode || "-"}</p>
                </td>
                <td className="px-4 py-3 text-[var(--dash-text-soft)]">{row.sourceType || row.expectedSourceType || "-"}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--dash-text)]">{row.code || "-"}</p>
                  <p className="mt-1 text-xs text-[var(--dash-text-soft)]">{pick(locale, row.nameEn, row.nameFr) || "-"}</p>
                </td>
                <td className="px-4 py-3 text-[var(--dash-text-soft)]">
                  {row.lineCount}
                  <span className="block text-xs text-[var(--dash-text-faint)]">
                    D {row.debitLineCount} / C {row.creditLineCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs leading-5 text-[var(--dash-text-soft)]">
                  {row.effectiveFrom ? formatDateOnly(row.effectiveFrom, locale) : t.notSet}
                  <span className="block">{row.effectiveTo ? formatDateOnly(row.effectiveTo, locale) : t.notSet}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn("rounded-md", statusClass(row.status))}>
                    {statusLabel(row.status, locale)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs leading-5 text-[var(--dash-text-soft)]">
                  {row.blockers.length
                    ? row.blockers.map((item) => pick(locale, item.messageEn, item.messageFr)).join("; ")
                    : t.ok}
                </td>
              </tr>
            ))}
            {data.postingRules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--dash-text-soft)]">
                  {t.emptyRows}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
