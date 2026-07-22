"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck2,
  CalendarClock,
  CircleCheck,
  Clock3,
  Database,
  EyeOff,
  ListChecks,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Store,
} from "lucide-react"

import { EvidenceGradeBadge } from "@/components/evidence/EvidenceGradeBadge"
import {
  dashboardMutedTextClass,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/finance/finance-dashboard-theme"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { localizePath } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import type { ManagerLocationActionBundle, ManagerLocationActionCenterData } from "@/services/manager-action-center/manager-location-action-center-contracts"
import type { SnapshotStatus, SnapshotUiState } from "@/services/snapshots/snapshot-contracts"

type Locale = "en" | "fr"

type ManagerLocationActionCenterDashboardProps = {
  data: ManagerLocationActionCenterData
  locale: Locale
  title: string
  subtitle: string
}

const copy = {
  en: {
    readOnly: "Read-only",
    branchScoped: "Branch-scoped",
    permissionFiltered: "Permission-filtered",
    authority: "Location responsibility",
    generated: "Generated",
    period: "Period",
    chooseLocation: "Choose a managed location",
    emptyTitle: "No managed location is available",
    emptyDetail: "The verified operating scope did not return a location bundle. No tenant-wide fallback is shown.",
    snapshotTrust: "Snapshot trust",
    snapshotStatus: "Snapshot status",
    displayState: "Display state",
    evidence: "Evidence",
    sourceModules: "Source modules",
    freshness: "Freshness",
    sourceObserved: "Latest source observation",
    generatedAt: "Snapshot generated",
    expectedAge: "Expected maximum age",
    minutes: "minutes",
    noSourceTime: "No source timestamp",
    blockers: "Branch blockers",
    noBlockers: "No blocker is reported for this branch snapshot.",
    nextAction: "Next safe action",
    redactions: "Redactions",
    noRedactions: "No field is redacted in this branch snapshot.",
    redactionPolicy: "Policy",
    metrics: "Supported branch metrics",
    metricsDetail: "Every value below belongs only to the selected location bundle.",
    amountNote: "Amounts are shown as source values. No currency is inferred.",
    commerce: "Sales and cash",
    stockControl: "Stock and operating control",
    payroll: "Payroll allocation",
    locationState: "Location state",
    active: "Active",
    inactive: "Inactive",
    actions: "Visible branch actions",
    dailyClose: "Daily close",
    openDailyClose: "Open daily close",
    actionsDetail: "Links are emitted only after server-side permission filtering.",
    hidden: "hidden by permission",
    hiddenNotice: "Additional branch actions are withheld by server-side permission filtering.",
    noActions: "No visible action is available for this branch and permission set.",
    openAction: "Open action",
    due: "Due",
    ownerRole: "Owner role",
    requiredPermission: "Required permission",
    blockedTitle: "Branch evidence is blocked",
    blockedDetail: "This branch remains inspectable, but its current snapshot must not be treated as complete operating truth.",
    staleTitle: "Branch evidence is stale",
    staleDetail: "The source evidence is outside its freshness window. Review the timestamps before acting.",
    partialTitle: "Branch evidence is partial",
    partialDetail: "Some source modules or fields are unavailable. Available evidence remains branch-scoped.",
    emptyStateTitle: "Branch evidence is empty",
    emptyStateDetail: "No supported operating activity was found for this branch and period.",
    buildingTitle: "Branch evidence is building",
    buildingDetail: "The branch snapshot is not ready yet. No completion is inferred.",
    failedTitle: "Branch evidence is unavailable",
    failedDetail: "The branch snapshot failed safely. No replacement value has been fabricated.",
    redactedTitle: "Branch evidence contains redactions",
    redactedDetail: "Protected fields remain hidden under the listed server-side policies.",
    unavailable: "Unavailable",
    metric: {
      completedSalesCount: "Completed sales",
      completedSalesRevenue: "Recorded sales value",
      cashCollected: "Cash collected",
      inventoryValue: "Recorded inventory value",
      inventoryTransactionCount: "Inventory transactions",
      pendingPurchaseOrderCount: "Pending purchase orders",
      openTransferCount: "Open transfers",
      postedJournalLineCount: "Posted journal lines",
      posShiftCount: "POS shifts",
      closedPosShiftCount: "Closed POS shifts",
      payrollEmployeeAtLocationCount: "Employees allocated",
      frozenAttendanceSnapshotCount: "Frozen attendance snapshots",
      approvedPayrollRunLineCount: "Approved payroll lines",
      unallocatedPayrollRunLineCount: "Unallocated payroll lines",
      payrollGrossAmount: "Payroll gross source amount",
      payrollEmployerChargeAmount: "Employer charge source amount",
      payrollNetPayAmount: "Net pay source amount",
      payrollAllocatedCostAmount: "Allocated payroll source amount",
      payrollProfitContribution: "Payroll profit contribution",
    },
  },
  fr: {
    readOnly: "Lecture seule",
    branchScoped: "Limite au site",
    permissionFiltered: "Filtre par permission",
    authority: "Responsabilite de site",
    generated: "Genere",
    period: "Periode",
    chooseLocation: "Choisir un site gere",
    emptyTitle: "Aucun site gere n'est disponible",
    emptyDetail: "Le perimetre verifie n'a retourne aucun dossier de site. Aucune donnee globale de remplacement n'est affichee.",
    snapshotTrust: "Fiabilite de l'instantane",
    snapshotStatus: "Etat de l'instantane",
    displayState: "Etat d'affichage",
    evidence: "Preuve",
    sourceModules: "Modules sources",
    freshness: "Fraicheur",
    sourceObserved: "Derniere observation source",
    generatedAt: "Instantane genere",
    expectedAge: "Age maximal attendu",
    minutes: "minutes",
    noSourceTime: "Aucun horodatage source",
    blockers: "Blocages du site",
    noBlockers: "Aucun blocage n'est signale pour l'instantane de ce site.",
    nextAction: "Prochaine action sure",
    redactions: "Masquages",
    noRedactions: "Aucun champ n'est masque dans l'instantane de ce site.",
    redactionPolicy: "Politique",
    metrics: "Indicateurs de site pris en charge",
    metricsDetail: "Chaque valeur ci-dessous appartient uniquement au dossier du site selectionne.",
    amountNote: "Les montants sont affiches comme valeurs sources. Aucune devise n'est deduite.",
    commerce: "Ventes et tresorerie",
    stockControl: "Stock et controle operationnel",
    payroll: "Affectation de paie",
    locationState: "Etat du site",
    active: "Actif",
    inactive: "Inactif",
    actions: "Actions visibles du site",
    dailyClose: "Cloture quotidienne",
    openDailyClose: "Ouvrir la cloture quotidienne",
    actionsDetail: "Les liens sont emis uniquement apres le filtrage serveur des permissions.",
    hidden: "masquees par permission",
    hiddenNotice: "D'autres actions du site sont retenues par le filtrage serveur des permissions.",
    noActions: "Aucune action visible n'est disponible pour ce site et ces permissions.",
    openAction: "Ouvrir l'action",
    due: "Echeance",
    ownerRole: "Role responsable",
    requiredPermission: "Permission requise",
    blockedTitle: "Les preuves du site sont bloquees",
    blockedDetail: "Ce site reste consultable, mais son instantane actuel ne doit pas etre considere comme une verite operationnelle complete.",
    staleTitle: "Les preuves du site sont perimees",
    staleDetail: "Les preuves sources depassent leur fenetre de fraicheur. Verifiez les horodatages avant d'agir.",
    partialTitle: "Les preuves du site sont partielles",
    partialDetail: "Certains modules ou champs sources sont indisponibles. Les preuves disponibles restent limitees au site.",
    emptyStateTitle: "Les preuves du site sont vides",
    emptyStateDetail: "Aucune activite operationnelle prise en charge n'a ete trouvee pour ce site et cette periode.",
    buildingTitle: "Les preuves du site sont en preparation",
    buildingDetail: "L'instantane du site n'est pas encore pret. Aucun etat final n'est deduit.",
    failedTitle: "Les preuves du site sont indisponibles",
    failedDetail: "L'instantane du site a echoue de maniere sure. Aucune valeur de remplacement n'a ete fabriquee.",
    redactedTitle: "Les preuves du site contiennent des masquages",
    redactedDetail: "Les champs proteges restent caches selon les politiques serveur indiquees.",
    unavailable: "Indisponible",
    metric: {
      completedSalesCount: "Ventes terminees",
      completedSalesRevenue: "Valeur des ventes enregistree",
      cashCollected: "Especes encaissees",
      inventoryValue: "Valeur de stock enregistree",
      inventoryTransactionCount: "Mouvements de stock",
      pendingPurchaseOrderCount: "Commandes d'achat en attente",
      openTransferCount: "Transferts ouverts",
      postedJournalLineCount: "Lignes comptables comptabilisees",
      posShiftCount: "Sessions de caisse",
      closedPosShiftCount: "Sessions de caisse fermees",
      payrollEmployeeAtLocationCount: "Employes affectes",
      frozenAttendanceSnapshotCount: "Instantanes de presence figes",
      approvedPayrollRunLineCount: "Lignes de paie approuvees",
      unallocatedPayrollRunLineCount: "Lignes de paie non affectees",
      payrollGrossAmount: "Montant source brut de paie",
      payrollEmployerChargeAmount: "Montant source des charges employeur",
      payrollNetPayAmount: "Montant source net a payer",
      payrollAllocatedCostAmount: "Montant source de paie affecte",
      payrollProfitContribution: "Contribution de la paie au resultat",
    },
  },
} as const

const snapshotStatusLabels: Record<Locale, Record<SnapshotStatus, string>> = {
  en: {
    fresh: "Fresh",
    stale: "Stale",
    partial: "Partial",
    blocked: "Blocked",
    building: "Building",
    failed: "Failed",
    empty: "Empty",
  },
  fr: {
    fresh: "A jour",
    stale: "Perime",
    partial: "Partiel",
    blocked: "Bloque",
    building: "En preparation",
    failed: "Echec",
    empty: "Vide",
  },
}

const uiStateLabels: Record<Locale, Record<SnapshotUiState, string>> = {
  en: {
    loading: "Loading",
    empty: "Empty",
    fresh: "Fresh",
    stale: "Stale",
    partial: "Partial",
    blocked: "Blocked",
    redacted: "Redacted",
    permission_denied: "Permission denied",
    module_unavailable: "Module unavailable",
    safe_error: "Safely unavailable",
  },
  fr: {
    loading: "Chargement",
    empty: "Vide",
    fresh: "A jour",
    stale: "Perime",
    partial: "Partiel",
    blocked: "Bloque",
    redacted: "Masque",
    permission_denied: "Permission refusee",
    module_unavailable: "Module indisponible",
    safe_error: "Indisponible en securite",
  },
}

export function ManagerLocationActionCenterDashboard({
  data,
  locale,
  title,
  subtitle,
}: ManagerLocationActionCenterDashboardProps) {
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-5 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <section className={cn(dashboardPanelClass, "p-4 md:p-5")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-5xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", dashboardToneClass("success"))}>{t.readOnly}</Badge>
                <Badge className={cn("border", dashboardToneClass("brand"))}>{t.branchScoped}</Badge>
                <Badge className={cn("border", dashboardToneClass("gold"))}>{t.permissionFiltered}</Badge>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">
                  {title}
                </h1>
                <p className={cn("mt-2 max-w-4xl text-sm leading-6", dashboardMutedTextClass)}>{subtitle}</p>
              </div>
            </div>
            <dl className={cn(dashboardRowClass, "grid min-w-0 gap-2 p-3 text-xs lg:min-w-[340px]")}>
              <MetaLine icon={<ShieldCheck className="h-4 w-4" />} label={t.authority}>
                {data.authority.basis}
              </MetaLine>
              <MetaLine icon={<Clock3 className="h-4 w-4" />} label={t.generated}>
                {formatDateTime(data.generatedAt, formatterLocale)}
              </MetaLine>
              <MetaLine icon={<CalendarClock className="h-4 w-4" />} label={t.period}>
                {formatPeriod(data.periodStart, data.periodEnd, formatterLocale)}
              </MetaLine>
            </dl>
          </div>
        </section>

        {data.bundles.length === 0 ? (
          <section className={cn(dashboardPanelClass, "p-6 text-center")}>
            <Store className="mx-auto h-6 w-6 text-[var(--dash-text-faint)]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-[var(--dash-text)]">{t.emptyTitle}</h2>
            <p className={cn("mx-auto mt-2 max-w-2xl text-sm leading-6", dashboardMutedTextClass)}>{t.emptyDetail}</p>
          </section>
        ) : (
          <Tabs defaultValue={data.bundles[0].location.id} className="w-full">
            <div className="overflow-x-auto pb-1">
              <TabsList
                aria-label={t.chooseLocation}
                className="inline-flex h-auto min-w-full justify-start gap-2 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.46)] p-1 sm:min-w-0"
              >
                {data.bundles.map((bundle) => (
                  <TabsTrigger
                    key={bundle.location.id}
                    value={bundle.location.id}
                    title={`${bundle.location.name} (${bundle.location.code})`}
                    className="min-h-12 min-w-40 max-w-[18rem] shrink-0 items-start gap-2 whitespace-normal rounded-md px-3 py-2 text-left text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words">
                      <span className="block font-semibold">{bundle.location.name}</span>
                      <span className="block text-xs font-normal opacity-80">{bundle.location.code}</span>
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {data.bundles.map((bundle) => (
              <TabsContent key={bundle.location.id} value={bundle.location.id} className="mt-4 focus-visible:ring-[var(--dash-brand)]">
                <LocationBundleView bundle={bundle} locale={locale} formatterLocale={formatterLocale} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </main>
  )
}

function LocationBundleView({
  bundle,
  locale,
  formatterLocale,
}: {
  bundle: ManagerLocationActionBundle
  locale: Locale
  formatterLocale: string
}) {
  const t = copy[locale]
  const { location, snapshot, actionQueue } = bundle
  const stateNotice = getStateNotice(snapshot.status, snapshot.uiState, locale)
  const dailyCloseHref = `${localizePath("/dashboard/manager-action-center/daily-close", locale)}?locationId=${encodeURIComponent(location.id)}`

  return (
    <div className="space-y-5" data-location-id={location.id}>
      <section className={cn(dashboardPanelClass, "p-4 md:p-5")} aria-labelledby={`location-${location.id}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("border", dashboardToneClass(snapshotStatusTone(snapshot.status)))}>
                {snapshotStatusLabels[locale][snapshot.status]}
              </Badge>
              <EvidenceGradeBadge grade={snapshot.evidenceGrade} />
              <Badge variant="outline" className={cn("border", dashboardToneClass(snapshot.metrics.locationActive ? "success" : "danger"))}>
                {snapshot.metrics.locationActive ? t.active : t.inactive}
              </Badge>
            </div>
            <div className="mt-3 flex min-w-0 items-start gap-3">
              <Store className="mt-1 h-5 w-5 shrink-0 text-[var(--dash-brand)]" aria-hidden="true" />
              <div className="min-w-0">
                <h2 id={`location-${location.id}`} className="break-words text-xl font-semibold text-[var(--dash-text)]">
                  {location.name}
                </h2>
                <p className={cn("mt-1 break-words text-sm", dashboardMutedTextClass)}>
                  {location.code} / {location.id}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2 text-xs lg:justify-end">
              <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                {t.snapshotStatus}: {snapshotStatusLabels[locale][snapshot.status]}
              </Badge>
              <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                {t.displayState}: {uiStateLabels[locale][snapshot.uiState]}
              </Badge>
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
              <Link href={dailyCloseHref} aria-label={`${t.openDailyClose}: ${location.name}`}>
                <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                {t.dailyClose}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {stateNotice ? (
        <StateNotice title={stateNotice.title} detail={stateNotice.detail} tone={stateNotice.tone} />
      ) : null}
      {snapshot.redactions.length > 0 && snapshot.uiState !== "redacted" ? (
        <StateNotice title={t.redactedTitle} detail={t.redactedDetail} tone="gold" />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2" aria-label={t.snapshotTrust}>
        <div className={cn(dashboardPanelClass, "p-4")}>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--dash-info)]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[var(--dash-text)]">{t.snapshotTrust}</h3>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <DetailLine label={t.snapshotStatus}>{snapshotStatusLabels[locale][snapshot.status]}</DetailLine>
            <DetailLine label={t.displayState}>{uiStateLabels[locale][snapshot.uiState]}</DetailLine>
            <DetailLine label={t.evidence}>
              <EvidenceGradeBadge grade={snapshot.evidenceGrade} />
            </DetailLine>
            <DetailLine label={t.sourceModules}>
              {snapshot.sourceModules.length ? snapshot.sourceModules.join(", ") : t.unavailable}
            </DetailLine>
          </dl>
        </div>

        <div className={cn(dashboardPanelClass, "p-4")}>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[var(--dash-gold)]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[var(--dash-text)]">{t.freshness}</h3>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <DetailLine label={t.generatedAt}>{formatDateTime(snapshot.generatedAt, formatterLocale)}</DetailLine>
            <DetailLine label={t.sourceObserved}>
              {snapshot.freshness.sourceMaxUpdatedAt
                ? formatDateTime(snapshot.freshness.sourceMaxUpdatedAt, formatterLocale)
                : t.noSourceTime}
            </DetailLine>
            <DetailLine label={t.expectedAge}>
              {formatNumber(snapshot.freshness.maxAgeMinutes, formatterLocale)} {t.minutes}
            </DetailLine>
            {snapshot.freshness.staleReason ? (
              <DetailLine label={snapshotStatusLabels[locale].stale}>{snapshot.freshness.staleReason}</DetailLine>
            ) : null}
          </dl>
        </div>
      </section>

      <MetricsSection bundle={bundle} locale={locale} formatterLocale={formatterLocale} />

      <section className="grid gap-5 xl:grid-cols-2">
        <div aria-labelledby={`blockers-${location.id}`}>
          <SectionHeading id={`blockers-${location.id}`} icon={<AlertTriangle className="h-4 w-4" />} title={t.blockers} />
          {snapshot.blockers.length ? (
            <div className="mt-3 space-y-3">
              {snapshot.blockers.map((blocker) => (
                <article key={blocker.id} className={cn(dashboardRowClass, "p-4")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("border", dashboardToneClass(blocker.severity === "critical" ? "danger" : "gold"))}>
                      {blocker.severity}
                    </Badge>
                    <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                      {blocker.gate}
                    </Badge>
                  </div>
                  <h4 className="mt-3 break-words text-sm font-semibold text-[var(--dash-text)]">{blocker.title}</h4>
                  <p className={cn("mt-1 break-words text-sm leading-6", dashboardMutedTextClass)}>{blocker.detail}</p>
                  {blocker.nextAction ? (
                    <p className="mt-3 break-words text-xs text-[var(--dash-text-soft)]">
                      <span className="font-semibold text-[var(--dash-text)]">{t.nextAction}: </span>
                      {blocker.nextAction}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyLine icon={<CircleCheck className="h-4 w-4" />} text={t.noBlockers} />
          )}
        </div>

        <div aria-labelledby={`redactions-${location.id}`}>
          <SectionHeading id={`redactions-${location.id}`} icon={<EyeOff className="h-4 w-4" />} title={t.redactions} />
          {snapshot.redactions.length ? (
            <div className="mt-3 space-y-3">
              {snapshot.redactions.map((redaction) => (
                <article key={redaction.id} className={cn(dashboardRowClass, "p-4")}>
                  <Badge variant="outline" className={cn("border", dashboardToneClass("gold"))}>
                    {redaction.field}
                  </Badge>
                  <p className={cn("mt-3 break-words text-sm leading-6", dashboardMutedTextClass)}>{redaction.reason}</p>
                  <p className="mt-2 break-words text-xs text-[var(--dash-text-soft)]">
                    <span className="font-semibold text-[var(--dash-text)]">{t.redactionPolicy}: </span>
                    {redaction.policy}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyLine icon={<CircleCheck className="h-4 w-4" />} text={t.noRedactions} />
          )}
        </div>
      </section>

      <section aria-labelledby={`actions-${location.id}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading id={`actions-${location.id}`} icon={<ListChecks className="h-4 w-4" />} title={t.actions} />
          <Badge variant="outline" className="w-fit border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
            <LockKeyhole className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {actionQueue.filteredOutCount} {t.hidden}
          </Badge>
        </div>
        <p className={cn("mt-1 text-sm", dashboardMutedTextClass)}>{t.actionsDetail}</p>

        {actionQueue.filteredOutCount > 0 ? (
          <div className={cn("mt-3 flex gap-2 rounded-lg border p-3 text-sm", dashboardToneClass("gold"))}>
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{t.hiddenNotice}</p>
          </div>
        ) : null}

        {actionQueue.actionItems.length ? (
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {actionQueue.actionItems.map((item) => (
              <article key={item.id} className={cn(dashboardRowClass, "flex min-w-0 flex-col p-4")}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("border", dashboardToneClass(actionTone(item.severity)))}>
                    {item.severity}
                  </Badge>
                  <EvidenceGradeBadge grade={item.evidenceGrade} />
                  <Badge variant="outline" className="border-[var(--dash-border-subtle)] text-[var(--dash-text-soft)]">
                    {item.status}
                  </Badge>
                </div>
                <h4 className="mt-3 break-words text-sm font-semibold text-[var(--dash-text)]">{item.title}</h4>
                <p className={cn("mt-1 break-words text-sm leading-6", dashboardMutedTextClass)}>{item.nextStep}</p>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <DetailLine label={t.due}>{formatDateTime(item.dueAt, formatterLocale)}</DetailLine>
                  <DetailLine label={t.ownerRole}>{item.assignedRole}</DetailLine>
                  <div className="sm:col-span-2">
                    <DetailLine label={t.requiredPermission}>{item.requiredPermission}</DetailLine>
                  </div>
                </dl>
                {(item.blockers.length > 0 || item.redactions.length > 0) ? (
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
                <div className="mt-auto pt-4">
                  <Button asChild size="sm" variant="outline" className="rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
                    <Link href={item.actionPath} aria-label={`${t.openAction}: ${item.title}`}>
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      {t.openAction}
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyLine icon={<ListChecks className="h-4 w-4" />} text={t.noActions} />
        )}
      </section>
    </div>
  )
}

function MetricsSection({
  bundle,
  locale,
  formatterLocale,
}: {
  bundle: ManagerLocationActionBundle
  locale: Locale
  formatterLocale: string
}) {
  const t = copy[locale]
  const metrics = bundle.snapshot.metrics

  const groups = [
    {
      id: "commerce",
      title: t.commerce,
      metrics: [
        [t.metric.completedSalesCount, metrics.completedSalesCount],
        [t.metric.completedSalesRevenue, metrics.completedSalesRevenue],
        [t.metric.cashCollected, metrics.cashCollected],
        [t.metric.posShiftCount, metrics.posShiftCount],
        [t.metric.closedPosShiftCount, metrics.closedPosShiftCount],
      ],
    },
    {
      id: "stock-control",
      title: t.stockControl,
      metrics: [
        [t.metric.inventoryValue, metrics.inventoryValue],
        [t.metric.inventoryTransactionCount, metrics.inventoryTransactionCount],
        [t.metric.pendingPurchaseOrderCount, metrics.pendingPurchaseOrderCount],
        [t.metric.openTransferCount, metrics.openTransferCount],
        [t.metric.postedJournalLineCount, metrics.postedJournalLineCount],
      ],
    },
    {
      id: "payroll",
      title: t.payroll,
      metrics: [
        [t.metric.payrollEmployeeAtLocationCount, metrics.payrollEmployeeAtLocationCount],
        [t.metric.frozenAttendanceSnapshotCount, metrics.frozenAttendanceSnapshotCount],
        [t.metric.approvedPayrollRunLineCount, metrics.approvedPayrollRunLineCount],
        [t.metric.unallocatedPayrollRunLineCount, metrics.unallocatedPayrollRunLineCount],
        [t.metric.payrollGrossAmount, metrics.payrollGrossAmount],
        [t.metric.payrollEmployerChargeAmount, metrics.payrollEmployerChargeAmount],
        [t.metric.payrollNetPayAmount, metrics.payrollNetPayAmount],
        [t.metric.payrollAllocatedCostAmount, metrics.payrollAllocatedCostAmount],
        [t.metric.payrollProfitContribution, metrics.payrollProfitContribution],
      ],
    },
  ] as const

  return (
    <section aria-labelledby={`metrics-${bundle.location.id}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionHeading id={`metrics-${bundle.location.id}`} icon={<Database className="h-4 w-4" />} title={t.metrics} />
          <p className={cn("mt-1 text-sm", dashboardMutedTextClass)}>{t.metricsDetail}</p>
        </div>
        <p className="max-w-lg text-xs leading-5 text-[var(--dash-text-faint)] sm:text-right">{t.amountNote}</p>
      </div>
      <div className="mt-3 grid gap-4 xl:grid-cols-3">
        {groups.map((group) => (
          <div key={group.id} className={cn(dashboardPanelClass, "p-4")}>
            <h4 className="text-sm font-semibold text-[var(--dash-text)]">{group.title}</h4>
            <dl className="mt-3 divide-y divide-[var(--dash-border-subtle)]">
              {group.metrics.map(([label, value]) => (
                <div key={label} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 text-sm">
                  <dt className="min-w-0 break-words text-[var(--dash-text-soft)]">{label}</dt>
                  <dd className="max-w-[12rem] break-words text-right font-semibold tabular-nums text-[var(--dash-text)]">
                    {value === null ? t.unavailable : formatNumber(value, formatterLocale)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}

function StateNotice({ title, detail, tone }: { title: string; detail: string; tone: "danger" | "gold" | "info" }) {
  return (
    <section className={cn("rounded-lg border p-4", dashboardToneClass(tone))} aria-live="polite">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold">{title}</h3>
          <p className="mt-1 break-words text-sm leading-6">{detail}</p>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--dash-brand)]" aria-hidden="true">{icon}</span>
      <h3 id={id} className="text-base font-semibold text-[var(--dash-text)]">{title}</h3>
    </div>
  )
}

function EmptyLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className={cn(dashboardRowClass, "mt-3 flex min-h-16 items-center gap-3 p-4 text-sm text-[var(--dash-text-soft)]")}>
      <span className="shrink-0 text-[var(--dash-success)]" aria-hidden="true">{icon}</span>
      <p className="break-words">{text}</p>
    </div>
  )
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start sm:gap-3">
      <dt className="break-words text-[var(--dash-text-soft)]">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-[var(--dash-text)] sm:text-right">{children}</dd>
    </div>
  )
}

function MetaLine({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[var(--dash-text-faint)]" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1 sm:flex sm:items-start sm:justify-between sm:gap-3">
        <dt className="break-words text-[var(--dash-text-soft)]">{label}</dt>
        <dd className="min-w-0 break-words font-medium text-[var(--dash-text)] sm:text-right">{children}</dd>
      </div>
    </div>
  )
}

function getStateNotice(status: SnapshotStatus, uiState: SnapshotUiState, locale: Locale) {
  const t = copy[locale]
  if (status === "blocked" || uiState === "blocked") return { title: t.blockedTitle, detail: t.blockedDetail, tone: "danger" as const }
  if (status === "failed" || uiState === "safe_error") return { title: t.failedTitle, detail: t.failedDetail, tone: "danger" as const }
  if (status === "stale" || uiState === "stale") return { title: t.staleTitle, detail: t.staleDetail, tone: "gold" as const }
  if (status === "partial" || uiState === "partial") return { title: t.partialTitle, detail: t.partialDetail, tone: "gold" as const }
  if (status === "empty" || uiState === "empty") return { title: t.emptyStateTitle, detail: t.emptyStateDetail, tone: "info" as const }
  if (status === "building" || uiState === "loading") return { title: t.buildingTitle, detail: t.buildingDetail, tone: "info" as const }
  if (uiState === "redacted") return { title: t.redactedTitle, detail: t.redactedDetail, tone: "gold" as const }
  if (uiState === "permission_denied" || uiState === "module_unavailable") {
    return { title: t.failedTitle, detail: t.failedDetail, tone: "danger" as const }
  }
  return null
}

function snapshotStatusTone(status: SnapshotStatus) {
  if (status === "fresh") return "success" as const
  if (status === "blocked" || status === "failed") return "danger" as const
  if (status === "stale" || status === "partial") return "gold" as const
  return "info" as const
}

function actionTone(severity: "info" | "low" | "medium" | "high" | "critical") {
  if (severity === "critical" || severity === "high") return "danger" as const
  if (severity === "medium") return "gold" as const
  if (severity === "low") return "info" as const
  return "spruce" as const
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

function formatPeriod(start: string, end: string, locale: string) {
  return `${formatDate(start, locale)} - ${formatDate(end, locale)}`
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
