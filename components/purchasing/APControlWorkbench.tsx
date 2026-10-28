"use client"

import {
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileClock,
  FileText,
  History,
  Landmark,
  ReceiptText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Truck,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import type { APWorkbenchData } from "@/actions/purchasing/ap-control.actions"
import {
  ActionQueue,
  CommandBriefHeader,
  KpiTile,
  RouteStatePanel,
  StatusStrip,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
  type ActionQueueItemData,
  type DashboardTone,
} from "@/components/dashboard/primitives/command-center-primitives"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"

type APControlWorkbenchProps = {
  data: APWorkbenchData | null
  error?: string | null
  locale?: Locale | string
  evaluatedAt?: string
}

const AP_STALE_AFTER_MS = 15 * 60 * 1000

const copy = {
  en: {
    eyebrow: "Purchasing control center",
    title: "Accounts payable workbench",
    subtitle: "Review supplier invoices, payment readiness, ledger posting, reconciliation, and country-pack proof from one tenant-scoped operating view.",
    stateBlocked: "Control blockers",
    stateAttention: "Review required",
    stateReady: "Control-ready",
    organizationScope: "Organization scope",
    tenantScoped: "Current tenant only",
    sourceModel: "Server-owned AP read model",
    history: "Open AP history",
    suppliers: "Open suppliers",
    updated: "Updated",
    operatingSnapshot: "Operating snapshot",
    operatingSnapshotDetail: "Counts come from the current organization-scoped AP read model; they are not client-estimated totals.",
    controlSignals: "Control and freshness signals",
    controlSignalsDetail: "Confirmed blockers, reconciliation state, snapshot age, and visible source coverage.",
    actionQueue: "What needs AP review",
    actionQueueDetail: "Read-only signals ordered by blockers, exceptions, approval dependencies, and payment readiness.",
    noActions: "No AP review signal is due",
    noActionsMessage: "No blocker, exception, destination change, or operator-action flag is visible in this snapshot.",
    noData: "AP workbench data is unavailable.",
    postedInvoices: "Posted invoices",
    paymentPending: "Payment pending",
    releasedPayments: "Released payments",
    ledgerBlockers: "Ledger blockers",
    reconciliationBlockers: "Recon blockers",
    matchExceptions: "Match exceptions",
    pendingBankChanges: "Pending bank changes",
    freshness: "Snapshot freshness",
    visibleRecords: "Visible source records",
    current: "Current",
    stale: "Stale",
    staleTitle: "AP snapshot is stale",
    staleMessage: "This server snapshot is older than 15 minutes. Refresh before using it for an operating decision.",
    partialTitle: "AP proof is partial",
    partialMessage: "Visible rows are missing country-pack, withholding, tax, or reconciliation proof. Review them before relying on the snapshot.",
    emptyTitle: "No AP activity in this scope",
    emptyMessage: "No invoice, payment, destination-change, match-exception, or blocker record is visible for the current organization.",
    recentInvoices: "Recent supplier invoices",
    supplierPayments: "Released supplier payments",
    bankChanges: "Pending bank changes",
    blockers: "Ledger blockers",
    supplier: "Supplier",
    document: "Document",
    amount: "Amount",
    status: "Status",
    ledger: "Ledger",
    countryPack: "Country pack",
    tax: "Tax",
    withholding: "Withholding",
    reconciliation: "Reconciliation",
    paymentTx: "Payment transaction",
    paymentProof: "Payment proof",
    paymentProofRecorded: "Transaction recorded",
    exceptionProofRecorded: "Exception recorded",
    reason: "Reason",
    source: "Source",
    created: "Created",
    none: "None",
    notAvailable: "N/A",
    actionRequired: "Action required",
    bankChangePending: "Bank change pending",
    safeBlockerMessage: "A server-owned posting control stopped this record. Review configuration and accounting evidence without bypassing the blocker.",
    openHistory: "Review history",
  },
  fr: {
    eyebrow: "Centre de contrôle achats",
    title: "Atelier des dettes fournisseurs",
    subtitle: "Examinez les factures, la préparation des paiements, les écritures, le rapprochement et les preuves country-pack dans une vue limitée au tenant.",
    stateBlocked: "Contrôles bloqués",
    stateAttention: "Revue requise",
    stateReady: "Contrôles prêts",
    organizationScope: "Périmètre organisation",
    tenantScoped: "Tenant actif uniquement",
    sourceModel: "Modèle de lecture AP côté serveur",
    history: "Ouvrir l'historique AP",
    suppliers: "Ouvrir les fournisseurs",
    updated: "Mis à jour",
    operatingSnapshot: "Instantané opérationnel",
    operatingSnapshotDetail: "Les compteurs proviennent du modèle AP limité à l'organisation active ; ils ne sont pas estimés côté client.",
    controlSignals: "Signaux de contrôle et de fraîcheur",
    controlSignalsDetail: "Blocages confirmés, rapprochement, âge de l'instantané et couverture source visible.",
    actionQueue: "Revues AP requises",
    actionQueueDetail: "Signaux en lecture seule classés par blocages, exceptions, approbations et préparation au paiement.",
    noActions: "Aucune revue AP requise",
    noActionsMessage: "Aucun blocage, exception, changement de destination ou indicateur d'action opérateur n'est visible.",
    noData: "Les données de l'atelier AP sont indisponibles.",
    postedInvoices: "Factures comptabilisées",
    paymentPending: "Paiement en attente",
    releasedPayments: "Paiements libérés",
    ledgerBlockers: "Blocages comptables",
    reconciliationBlockers: "Blocages de rapprochement",
    matchExceptions: "Exceptions de rapprochement",
    pendingBankChanges: "Coordonnées bancaires en attente",
    freshness: "Fraîcheur de l'instantané",
    visibleRecords: "Enregistrements sources visibles",
    current: "Actuel",
    stale: "Périmé",
    staleTitle: "L'instantané AP est périmé",
    staleMessage: "Cet instantané serveur date de plus de 15 minutes. Actualisez avant toute décision opérationnelle.",
    partialTitle: "Les preuves AP sont partielles",
    partialMessage: "Des lignes visibles n'ont pas toutes les preuves country-pack, retenue, taxe ou rapprochement. Examinez-les avant de vous fier à l'instantané.",
    emptyTitle: "Aucune activité AP dans ce périmètre",
    emptyMessage: "Aucune facture, paiement, modification de destination, exception ou blocage n'est visible pour l'organisation active.",
    recentInvoices: "Factures fournisseurs récentes",
    supplierPayments: "Paiements fournisseurs libérés",
    bankChanges: "Changements bancaires en attente",
    blockers: "Blocages comptables",
    supplier: "Fournisseur",
    document: "Document",
    amount: "Montant",
    status: "Statut",
    ledger: "Comptabilite",
    countryPack: "Country pack",
    tax: "Taxe",
    withholding: "Retenue",
    reconciliation: "Rapprochement",
    paymentTx: "Transaction paiement",
    paymentProof: "Preuve de paiement",
    paymentProofRecorded: "Transaction enregistrée",
    exceptionProofRecorded: "Exception enregistrée",
    reason: "Motif",
    source: "Source",
    created: "Créé",
    none: "Aucun",
    notAvailable: "N/D",
    actionRequired: "Action requise",
    bankChangePending: "Changement bancaire en attente",
    safeBlockerMessage: "Un contrôle serveur a arrêté cet enregistrement. Examinez la configuration et les preuves sans contourner le blocage.",
    openHistory: "Examiner l'historique",
  },
} as const

function localeKey(locale?: Locale | string): Locale {
  return locale === "fr" ? "fr" : "en"
}

function money(value: string, currency: string, locale: Locale) {
  const amount = Number(value)
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: ["XAF", "XOF"].includes(currency.toUpperCase()) ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function dateTime(value: string, locale: Locale) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const statusLabels: Record<Locale, Record<string, string>> = {
  en: {
    POSTED: "Posted", RESOLVED: "Resolved", INPUT_VAT_PACK_RESOLVED: "Input VAT resolved",
    NO_INPUT_VAT_AMOUNT: "No input VAT amount", PENDING: "Pending", PENDING_APPROVAL: "Pending approval",
    PAYMENT_PENDING: "Payment pending", AWAITING_STATEMENT_MATCH: "Awaiting statement match",
    NOT_CONFIGURED: "Not configured", BLOCKED_PENDING_RULES: "Blocked pending rules", FAILED: "Failed",
    LEDGER_BLOCKED: "Ledger blocked", UNRESOLVED: "Unresolved", MISSING_COUNTRY: "Country missing",
    NOT_POSTED: "Not posted", UNKNOWN: "Unknown", DRAFT: "Draft", MATCHED: "Matched", PAID: "Paid",
    RELEASED: "Released", RECONCILED: "Reconciled", SETTLED: "Settled", COMPLETED: "Completed",
    CANCELLED: "Cancelled", EXCEPTION: "Exception", PARTIAL: "Partial",
  },
  fr: {
    POSTED: "Comptabilisé", RESOLVED: "Résolu", INPUT_VAT_PACK_RESOLVED: "TVA déductible résolue",
    NO_INPUT_VAT_AMOUNT: "Aucune TVA déductible", PENDING: "En attente", PENDING_APPROVAL: "Approbation en attente",
    PAYMENT_PENDING: "Paiement en attente", AWAITING_STATEMENT_MATCH: "Rapprochement relevé en attente",
    NOT_CONFIGURED: "Non configuré", BLOCKED_PENDING_RULES: "Bloqué par les règles", FAILED: "Échec",
    LEDGER_BLOCKED: "Comptabilité bloquée", UNRESOLVED: "Non résolu", MISSING_COUNTRY: "Pays manquant",
    NOT_POSTED: "Non comptabilisé", UNKNOWN: "Inconnu", DRAFT: "Brouillon", MATCHED: "Rapproché", PAID: "Payé",
    RELEASED: "Libéré", RECONCILED: "Rapproché", SETTLED: "Réglé", COMPLETED: "Terminé",
    CANCELLED: "Annulé", EXCEPTION: "Exception", PARTIAL: "Partiel",
  },
}

export function apStatusTone(status: string | null | undefined): DashboardTone {
  const normalized = (status ?? "").toUpperCase()
  if (normalized === "POSTED") return "brand"
  if (normalized === "RELEASED") return "spruce"
  if (["RESOLVED", "INPUT_VAT_PACK_RESOLVED", "NO_INPUT_VAT_AMOUNT", "PAID", "RECONCILED", "SETTLED", "COMPLETED"].includes(normalized)) return "success"
  if (["MATCHED", "PROCESSING"].includes(normalized)) return "info"
  if (["PENDING", "PENDING_APPROVAL", "PAYMENT_PENDING", "AWAITING_STATEMENT_MATCH", "NOT_CONFIGURED", "PARTIAL"].includes(normalized)) return "gold"
  if (["FAILED", "LEDGER_BLOCKED", "UNRESOLVED", "MISSING_COUNTRY", "BLOCKED_PENDING_RULES", "EXCEPTION", "REJECTED"].includes(normalized)) return "danger"
  if (["DRAFT", "NOT_POSTED", "UNKNOWN", "CANCELLED", "VOIDED", ""].includes(normalized)) return "muted"
  return "info"
}

export function formatAPStatus(status: string | null | undefined, locale: Locale) {
  const normalized = (status ?? "").toUpperCase()
  if (!normalized) return copy[locale].notAvailable
  return statusLabels[locale][normalized] ?? normalized.toLowerCase().replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase())
}

export function isAPSnapshotStale(asOf: string, evaluatedAt: string) {
  const snapshotTime = new Date(asOf).getTime()
  const evaluationTime = new Date(evaluatedAt).getTime()
  if (!Number.isFinite(snapshotTime) || !Number.isFinite(evaluationTime)) return true
  return evaluationTime - snapshotTime > AP_STALE_AFTER_MS
}

function StatusBadge({ value, fallback, locale }: { value?: string | null; fallback: string; locale: Locale }) {
  return (
    <Badge variant="outline" className={cn("max-w-full shrink-0 rounded-md", dashboardToneClass(apStatusTone(value)))}>
      <span className="truncate">{value ? formatAPStatus(value, locale) : fallback}</span>
    </Badge>
  )
}

function SectionHeader({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <CardHeader className="border-b border-[var(--dash-border-subtle)] px-4 py-4 sm:px-5">
      <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--dash-text)]">
        <Icon className="h-4 w-4 text-[var(--dash-brand-strong)]" aria-hidden="true" />
        {title}
      </CardTitle>
      <CardDescription className="text-sm leading-6 text-[var(--dash-text-soft)]">{description}</CardDescription>
    </CardHeader>
  )
}

function partialProofCount(data: APWorkbenchData) {
  return data.queues.recentInvoices.filter((invoice) => !invoice.countryPackStatus || !invoice.taxTreatmentStatus || !invoice.withholdingTreatmentStatus).length
    + data.queues.releasedPayments.filter((payment) => !payment.reconciliationStatus || !payment.countryPackStatus || !payment.withholdingTreatmentStatus).length
}

function buildActionItems(data: APWorkbenchData, locale: Locale, historyHref: string, supplierBaseHref: string): ActionQueueItemData[] {
  const t = copy[locale]
  const reviewAction = { label: t.openHistory, href: historyHref, icon: History, variant: "secondary" as const }
  const items: ActionQueueItemData[] = data.queues.ledgerBlockers.map((blocker) => ({
    id: `ledger-${blocker.id}`,
    title: t.ledgerBlockers,
    summary: t.safeBlockerMessage,
    tone: "danger",
    riskLabel: t.stateBlocked,
    stateLabel: formatAPStatus(blocker.status, locale),
    due: dateTime(blocker.createdAt, locale),
    icon: ShieldAlert,
    metadata: [{ label: t.source, value: formatAPStatus(blocker.sourceType, locale) }],
    action: reviewAction,
  }))

  if (data.counts.matchExceptions > 0) items.push({ id: "match", title: t.matchExceptions, summary: String(data.counts.matchExceptions), tone: "danger", riskLabel: t.stateBlocked, icon: Scale, action: reviewAction })
  if (data.counts.reconciliationBlockers > 0) items.push({ id: "reconciliation", title: t.reconciliationBlockers, summary: String(data.counts.reconciliationBlockers), tone: "danger", riskLabel: t.stateBlocked, icon: ShieldAlert, action: reviewAction })

  items.push(...data.queues.pendingBankChanges.map((change) => ({
    id: `bank-${change.id}`,
    title: `${t.bankChangePending}: ${change.supplierName}`,
    summary: change.reason ?? t.bankChangePending,
    tone: "gold" as const,
    riskLabel: t.stateAttention,
    due: dateTime(change.requestedAt, locale),
    icon: Landmark,
    action: { label: t.suppliers, href: `${supplierBaseHref}/${encodeURIComponent(change.supplierId)}`, icon: Truck, variant: "secondary" as const },
  })))

  items.push(...data.queues.recentInvoices.filter((invoice) => invoice.operatorActionRequired).map((invoice) => ({ id: `invoice-${invoice.id}`, title: `${t.actionRequired}: ${invoice.invoiceNumber}`, summary: t.countryPack, tone: "gold" as const, riskLabel: t.stateAttention, icon: FileClock, action: reviewAction })))
  items.push(...data.queues.releasedPayments.filter((payment) => payment.operatorActionRequired).map((payment) => ({ id: `payment-${payment.id}`, title: `${t.actionRequired}: ${payment.paymentNumber}`, summary: t.withholding, tone: "gold" as const, riskLabel: t.stateAttention, icon: ReceiptText, action: reviewAction })))

  if (data.counts.paymentPendingInvoices > 0) items.push({ id: "payment-pending", title: t.paymentPending, summary: String(data.counts.paymentPendingInvoices), tone: "gold", riskLabel: t.stateAttention, icon: Banknote, action: reviewAction })
  return items
}

export default function APControlWorkbench({ data, locale: rawLocale = "en", evaluatedAt }: APControlWorkbenchProps) {
  const locale = localeKey(rawLocale)
  const t = copy[locale]
  const localeBase = `/${locale}/dashboard`
  const historyHref = `${localeBase}/purchases/payables/history`
  const supplierBaseHref = `${localeBase}/purchases/suppliers`

  if (!data) {
    return <RouteStatePanel kind="error" title={t.noData} message={t.noData} />
  }

  const stale = isAPSnapshotStale(data.asOf, evaluatedAt ?? data.asOf)
  const partialCount = partialProofCount(data)
  const blockerCount = data.counts.ledgerBlockers + data.counts.reconciliationBlockers + data.counts.matchExceptions
  const attentionCount = data.counts.paymentPendingInvoices + data.counts.pendingBankChanges + partialCount
  const state = blockerCount > 0
    ? { label: t.stateBlocked, tone: "danger" as const, icon: ShieldAlert }
    : attentionCount > 0
      ? { label: t.stateAttention, tone: "gold" as const, icon: Clock3 }
      : { label: t.stateReady, tone: "success" as const, icon: ShieldCheck }
  const visibleRecordCount = data.queues.recentInvoices.length + data.queues.releasedPayments.length + data.queues.pendingBankChanges.length + data.queues.ledgerBlockers.length
  const empty = Object.values(data.counts).every((value) => value === 0) && visibleRecordCount === 0
  const actionItems = buildActionItems(data, locale, historyHref, supplierBaseHref)

  return (
    <main className="min-w-0 space-y-4 text-[var(--dash-text)]">
      <CommandBriefHeader
        title={t.title}
        summary={t.subtitle}
        eyebrow={t.eyebrow}
        state={state}
        metadata={[
          { label: t.organizationScope, value: t.tenantScoped, icon: Building2 },
          { label: t.updated, value: dateTime(data.asOf, locale), icon: CalendarClock },
          { label: t.source, value: t.sourceModel, icon: ShieldCheck },
        ]}
        actions={[
          { label: t.history, href: historyHref, icon: History, variant: "primary" },
          { label: t.suppliers, href: supplierBaseHref, icon: Truck, variant: "secondary" },
        ]}
        proof={{ state: blockerCount > 0 ? "blocked" : partialCount > 0 ? "pending" : "operational", source: t.sourceModel }}
      />

      {stale ? <RouteStatePanel kind="stale_data" title={t.staleTitle} message={t.staleMessage} /> : null}
      {partialCount > 0 ? <RouteStatePanel kind="partial" title={t.partialTitle} message={t.partialMessage} /> : null}
      {empty ? <RouteStatePanel kind="empty" title={t.emptyTitle} message={t.emptyMessage} /> : null}

      <section aria-labelledby="ap-snapshot-title">
        <div className="mb-3">
          <h2 id="ap-snapshot-title" className="text-base font-semibold">{t.operatingSnapshot}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">{t.operatingSnapshotDetail}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <KpiTile label={t.postedInvoices} value={data.counts.postedInvoices} detail={t.recentInvoices} icon={FileText} tone="brand" proof={{ state: "posted", source: t.sourceModel }} />
          <KpiTile label={t.paymentPending} value={data.counts.paymentPendingInvoices} detail={t.supplierPayments} icon={Banknote} tone={data.counts.paymentPendingInvoices > 0 ? "gold" : "muted"} proof={{ state: data.counts.paymentPendingInvoices > 0 ? "pending" : "verified", source: t.sourceModel }} />
          <KpiTile label={t.releasedPayments} value={data.counts.releasedPayments} detail={t.reconciliation} icon={CheckCircle2} tone={data.counts.releasedPayments > 0 ? "spruce" : "muted"} proof={{ state: "operational", source: t.sourceModel }} />
          <KpiTile label={t.matchExceptions} value={data.counts.matchExceptions} detail={t.matchExceptions} icon={Scale} tone={data.counts.matchExceptions > 0 ? "danger" : "success"} proof={{ state: data.counts.matchExceptions > 0 ? "blocked" : "verified", source: t.sourceModel }} />
          <KpiTile label={t.pendingBankChanges} value={data.counts.pendingBankChanges} detail={t.bankChanges} icon={Landmark} tone={data.counts.pendingBankChanges > 0 ? "gold" : "muted"} proof={{ state: data.counts.pendingBankChanges > 0 ? "pending" : "verified", source: t.sourceModel }} />
        </div>
      </section>

      <StatusStrip
        title={t.controlSignals}
        detail={t.controlSignalsDetail}
        items={[
          { id: "ledger", label: t.ledgerBlockers, value: data.counts.ledgerBlockers, detail: t.blockers, tone: data.counts.ledgerBlockers > 0 ? "danger" : "success", icon: ShieldAlert, source: t.sourceModel },
          { id: "reconciliation", label: t.reconciliationBlockers, value: data.counts.reconciliationBlockers, detail: t.reconciliation, tone: data.counts.reconciliationBlockers > 0 ? "danger" : "success", icon: ShieldCheck, source: t.sourceModel },
          { id: "freshness", label: t.freshness, value: stale ? t.stale : t.current, detail: dateTime(data.asOf, locale), tone: stale ? "warning" : "info", icon: CalendarClock, source: t.sourceModel },
          { id: "records", label: t.visibleRecords, value: visibleRecordCount, detail: t.sourceModel, tone: "info", icon: WalletCards, source: t.sourceModel },
        ]}
      />

      <ActionQueue items={actionItems} title={t.actionQueue} detail={t.actionQueueDetail} emptyTitle={t.noActions} emptyMessage={t.noActionsMessage} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
        <Card className={cn(dashboardPanelClass, "min-w-0 overflow-hidden")}>
          <SectionHeader title={t.recentInvoices} description={t.operatingSnapshotDetail} icon={FileText} />
          <CardContent className="p-0">
            {data.queues.recentInvoices.length === 0 ? (
              <div className="p-4"><RouteStatePanel kind="empty" title={t.recentInvoices} message={t.emptyMessage} /></div>
            ) : (
              <ScrollArea className="w-full">
                <table className="w-full min-w-[1040px] text-sm">
                  <caption className="sr-only">{t.recentInvoices}</caption>
                  <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs text-[var(--dash-text-faint)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t.document}</th>
                      <th className="px-4 py-3 font-medium">{t.supplier}</th>
                      <th className="px-4 py-3 text-right font-medium">{t.amount}</th>
                      <th className="px-4 py-3 font-medium">{t.ledger}</th>
                      <th className="px-4 py-3 font-medium">{t.countryPack}</th>
                      <th className="px-4 py-3 font-medium">{t.tax}</th>
                      <th className="px-4 py-3 font-medium">{t.withholding}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queues.recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-[var(--dash-border-subtle)] transition last:border-0 hover:bg-[var(--dash-brand-soft)]">
                        <td className="px-4 py-3">
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--dash-text-faint)]">
                            <span>{dateTime(invoice.invoiceDate, locale)}</span>
                            <StatusBadge value={invoice.status} fallback={t.notAvailable} locale={locale} />
                          </div>
                        </td>
                        <td className="px-4 py-3">{invoice.supplierName}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div className="font-semibold">{money(invoice.total, invoice.currency, locale)}</div>
                          <div className="mt-1 text-xs text-[var(--dash-text-faint)]">{money(invoice.amountPaid, invoice.currency, locale)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={invoice.ledgerStatus} fallback={t.notAvailable} locale={locale} />
                          {invoice.ledgerBlockerCode ? <div className="mt-1 max-w-[220px] truncate text-xs text-[var(--dash-danger)]">{invoice.ledgerBlockerCode}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={invoice.countryPackStatus} fallback={t.notAvailable} locale={locale} />
                          <div className="mt-1 max-w-[200px] truncate text-xs text-[var(--dash-text-faint)]">{invoice.countryPackVersion ?? t.notAvailable}</div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge value={invoice.taxTreatmentStatus} fallback={t.notAvailable} locale={locale} /></td>
                        <td className="px-4 py-3">
                          <StatusBadge value={invoice.withholdingTreatmentStatus} fallback={t.notAvailable} locale={locale} />
                          {invoice.operatorActionRequired ? <div className="mt-1 text-xs font-medium text-[var(--dash-gold)]">{t.actionRequired}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={cn(dashboardPanelClass, "min-w-0 overflow-hidden")}>
            <SectionHeader title={t.bankChanges} description={t.actionQueueDetail} icon={Landmark} />
            <CardContent className="space-y-2 p-4">
              {data.queues.pendingBankChanges.length === 0 ? (
                <RouteStatePanel kind="empty" title={t.bankChanges} message={t.noActionsMessage} />
              ) : (
                data.queues.pendingBankChanges.map((change) => (
                  <div key={change.id} className={cn(dashboardRowClass, "p-3")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{change.supplierName}</div>
                      <Badge variant="outline" className={cn("rounded-md", dashboardToneClass("gold"))}>{t.bankChangePending}</Badge>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-[var(--dash-text-soft)]">
                      <span>{t.created}: {dateTime(change.requestedAt, locale)}</span>
                      <span>{t.reason}: {change.reason ?? t.notAvailable}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className={cn(dashboardPanelClass, "min-w-0 overflow-hidden")}>
            <SectionHeader title={t.blockers} description={t.controlSignalsDetail} icon={ShieldAlert} />
            <CardContent className="space-y-2 p-4">
              {data.queues.ledgerBlockers.length === 0 ? (
                <RouteStatePanel kind="empty" title={t.blockers} message={t.noActionsMessage} />
              ) : (
                data.queues.ledgerBlockers.map((blocker) => (
                  <div key={blocker.id} className={cn(dashboardRowClass, dashboardToneClass("danger"), "p-3")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={blocker.status} fallback={t.notAvailable} locale={locale} />
                      <span className="text-xs">{formatAPStatus(blocker.postingPurpose, locale)}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium">{t.safeBlockerMessage}</div>
                    <div className="mt-1 text-xs text-[var(--dash-text-soft)]">{t.source}: {formatAPStatus(blocker.sourceType, locale)}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <Card className={cn(dashboardPanelClass, "min-w-0 overflow-hidden")}>
          <SectionHeader title={t.supplierPayments} description={t.operatingSnapshotDetail} icon={ReceiptText} />
          <CardContent className="p-0">
            {data.queues.releasedPayments.length === 0 ? (
              <div className="p-4"><RouteStatePanel kind="empty" title={t.supplierPayments} message={t.emptyMessage} /></div>
            ) : (
              <ScrollArea className="w-full">
                <table className="w-full min-w-[1080px] text-sm">
                  <caption className="sr-only">{t.supplierPayments}</caption>
                  <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs text-[var(--dash-text-faint)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t.document}</th>
                      <th className="px-4 py-3 font-medium">{t.supplier}</th>
                      <th className="px-4 py-3 text-right font-medium">{t.amount}</th>
                      <th className="px-4 py-3 font-medium">{t.ledger}</th>
                      <th className="px-4 py-3 font-medium">{t.reconciliation}</th>
                      <th className="px-4 py-3 font-medium">{t.paymentProof}</th>
                      <th className="px-4 py-3 font-medium">{t.countryPack}</th>
                      <th className="px-4 py-3 font-medium">{t.withholding}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queues.releasedPayments.map((payment) => (
                      <tr key={payment.id} className="border-b border-[var(--dash-border-subtle)] transition last:border-0 hover:bg-[var(--dash-brand-soft)]">
                        <td className="px-4 py-3">
                          <div className="font-medium">{payment.paymentNumber}</div>
                          <div className="mt-1 text-xs text-[var(--dash-text-faint)]">{dateTime(payment.paymentDate, locale)} / {formatAPStatus(payment.method, locale)}</div>
                        </td>
                        <td className="px-4 py-3">{payment.supplierName}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(payment.amount, payment.currency, locale)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge value={payment.ledgerStatus} fallback={t.notAvailable} locale={locale} />
                          {payment.ledgerBlockerCode ? <div className="mt-1 max-w-[220px] truncate text-xs text-[var(--dash-danger)]">{payment.ledgerBlockerCode}</div> : null}
                        </td>
                        <td className="px-4 py-3"><StatusBadge value={payment.reconciliationStatus} fallback={t.notAvailable} locale={locale} /></td>
                        <td className="px-4 py-3 text-xs text-[var(--dash-text-soft)]">
                          <div>{payment.paymentTransactionId ? t.paymentProofRecorded : t.notAvailable}</div>
                          {payment.paymentExceptionId ? <div className="mt-1 text-[var(--dash-danger)]">{t.exceptionProofRecorded}</div> : null}
                        </td>
                        <td className="px-4 py-3"><StatusBadge value={payment.countryPackStatus} fallback={t.notAvailable} locale={locale} /></td>
                        <td className="px-4 py-3">
                          <StatusBadge value={payment.withholdingTreatmentStatus} fallback={t.notAvailable} locale={locale} />
                          {payment.operatorActionRequired ? <div className="mt-1 text-xs font-medium text-[var(--dash-gold)]">{t.actionRequired}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
