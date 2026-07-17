import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  FileText,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

import type { APWorkbenchData } from "@/actions/purchasing/ap-control.actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"

type APControlWorkbenchProps = {
  data: APWorkbenchData | null
  error?: string | null
  locale?: Locale | string
}

const copy = {
  en: {
    title: "AP workbench",
    subtitle: "Supplier invoices, payment release, ledger posting, reconciliation, and country-pack controls.",
    updated: "Updated",
    noData: "AP workbench data is unavailable.",
    postedInvoices: "Posted invoices",
    paymentPending: "Payment pending",
    releasedPayments: "Released payments",
    ledgerBlockers: "Ledger blockers",
    reconciliationBlockers: "Recon blockers",
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
    requestedBy: "Requested by",
    reason: "Reason",
    source: "Source",
    created: "Created",
    none: "None",
    notAvailable: "N/A",
    actionRequired: "Action required",
  },
  fr: {
    title: "Atelier fournisseurs",
    subtitle: "Factures fournisseurs, reglements, ecritures, rapprochement et controles country-pack.",
    updated: "Mis a jour",
    noData: "Les donnees de l'atelier AP sont indisponibles.",
    postedInvoices: "Factures postees",
    paymentPending: "En attente paiement",
    releasedPayments: "Reglements liberes",
    ledgerBlockers: "Blocages comptables",
    reconciliationBlockers: "Blocages rapprochement",
    recentInvoices: "Factures fournisseur recentes",
    supplierPayments: "Reglements fournisseur liberes",
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
    requestedBy: "Demande par",
    reason: "Motif",
    source: "Source",
    created: "Cree",
    none: "Aucun",
    notAvailable: "N/D",
    actionRequired: "Action requise",
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
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusTone(status: string | null | undefined) {
  const normalized = (status ?? "").toUpperCase()
  if (["POSTED", "RESOLVED", "INPUT_VAT_PACK_RESOLVED", "NO_INPUT_VAT_AMOUNT"].includes(normalized)) {
    return "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
  }
  if (["PENDING", "AWAITING_STATEMENT_MATCH", "NOT_CONFIGURED", "BLOCKED_PENDING_RULES"].includes(normalized)) {
    return "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]"
  }
  if (["FAILED", "LEDGER_BLOCKED", "UNRESOLVED", "MISSING_COUNTRY"].includes(normalized)) {
    return "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]"
  }
  return "dashboard-filter-chip"
}

function StatusBadge({ value, fallback }: { value?: string | null; fallback: string }) {
  return (
    <Badge variant="outline" className={cn("max-w-full shrink-0 rounded-lg", statusTone(value))}>
      <span className="truncate">{value ?? fallback}</span>
    </Badge>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  detail: string
  icon: LucideIcon
  tone: "brand" | "success" | "warning" | "danger" | "info"
}) {
  const styles = {
    brand: { accent: "var(--dash-brand)", soft: "var(--dash-brand-soft)" },
    success: { accent: "var(--dash-success)", soft: "var(--dash-success-soft)" },
    warning: { accent: "var(--dash-warning)", soft: "var(--dash-warning-soft)" },
    danger: { accent: "var(--dash-danger)", soft: "var(--dash-danger-soft)" },
    info: { accent: "var(--dash-info)", soft: "var(--dash-info-soft)" },
  }[tone]

  return (
    <Card
      className="dashboard-stat-card group relative min-h-[132px] min-w-0 overflow-hidden"
      style={
        {
          "--stat-accent": styles.accent,
          "--stat-soft": styles.soft,
        } as CSSProperties
      }
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stat-accent)] opacity-80" />
      <CardHeader className="pb-2 pe-14">
        <CardTitle className="text-[0.7rem] font-semibold uppercase leading-4 text-[var(--dash-text-faint)]">
          {label}
        </CardTitle>
      </CardHeader>
      <span className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--stat-soft)] text-[var(--stat-accent)]">
        <Icon className="h-4 w-4" />
      </span>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums leading-tight text-[var(--dash-text)]">{value}</div>
        <div className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{detail}</div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.24)] p-6 text-sm text-[var(--dash-text-soft)]">
      {label}
    </div>
  )
}

export default function APControlWorkbench({ data, error, locale: rawLocale = "en" }: APControlWorkbenchProps) {
  const locale = localeKey(rawLocale)
  const t = copy[locale]

  if (!data) {
    return (
      <section className="dashboard-glass-panel rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-5 text-[var(--dash-danger)]">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div className="text-sm font-semibold">{error ?? t.noData}</div>
        </div>
      </section>
    )
  }

  const currency = data.queues.recentInvoices[0]?.currency ?? data.queues.releasedPayments[0]?.currency ?? "XAF"

  return (
    <div className="space-y-4 text-[var(--dash-text)]">
      <section className="dashboard-glass-panel rounded-lg p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
                <WalletCards className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)]">{t.title}</h1>
                <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t.subtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--dash-text-soft)]">
            <Badge variant="outline" className="dashboard-filter-chip gap-1 rounded-lg">
              <Building2 className="h-3 w-3" />
              {data.organizationId}
            </Badge>
            <Badge variant="outline" className="dashboard-filter-chip gap-1 rounded-lg">
              <Landmark className="h-3 w-3" />
              {t.updated}: {dateTime(data.asOf, locale)}
            </Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={t.postedInvoices} value={data.counts.postedInvoices} detail={t.recentInvoices} icon={FileText} tone="brand" />
        <MetricCard label={t.paymentPending} value={data.counts.paymentPendingInvoices} detail={t.supplierPayments} icon={Banknote} tone="info" />
        <MetricCard label={t.releasedPayments} value={data.counts.releasedPayments} detail={t.reconciliation} icon={CheckCircle2} tone="success" />
        <MetricCard label={t.ledgerBlockers} value={data.counts.ledgerBlockers} detail={t.blockers} icon={ShieldAlert} tone={data.counts.ledgerBlockers > 0 ? "danger" : "success"} />
        <MetricCard label={t.reconciliationBlockers} value={data.counts.reconciliationBlockers} detail={t.reconciliation} icon={ShieldCheck} tone={data.counts.reconciliationBlockers > 0 ? "warning" : "success"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
        <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
          <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.48)] px-5 py-4">
            <CardTitle className="text-base font-semibold">{t.recentInvoices}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.queues.recentInvoices.length === 0 ? (
              <div className="p-4"><EmptyState label={t.none} /></div>
            ) : (
              <ScrollArea className="w-full">
                <table className="w-full min-w-[980px] text-sm">
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
                      <tr key={invoice.id} className="border-b border-[var(--dash-border-subtle)] last:border-0 hover:bg-[rgba(37,57,67,0.26)]">
                        <td className="px-4 py-3">
                          <div className="font-medium">{invoice.invoiceNumber}</div>
                          <div className="mt-1 text-xs text-[var(--dash-text-faint)]">{dateTime(invoice.invoiceDate, locale)}</div>
                        </td>
                        <td className="px-4 py-3">{invoice.supplierName}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div className="font-semibold">{money(invoice.total, invoice.currency, locale)}</div>
                          <div className="mt-1 text-xs text-[var(--dash-text-faint)]">{money(invoice.amountPaid, invoice.currency, locale)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={invoice.ledgerStatus} fallback={t.notAvailable} />
                          {invoice.ledgerBlockerCode ? <div className="mt-1 max-w-[220px] truncate text-xs text-[var(--dash-text-faint)]">{invoice.ledgerBlockerCode}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={invoice.countryPackStatus} fallback={t.notAvailable} />
                          <div className="mt-1 max-w-[200px] truncate text-xs text-[var(--dash-text-faint)]">{invoice.countryPackVersion ?? t.notAvailable}</div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge value={invoice.taxTreatmentStatus} fallback={t.notAvailable} /></td>
                        <td className="px-4 py-3">
                          <StatusBadge value={invoice.withholdingTreatmentStatus} fallback={t.notAvailable} />
                          {invoice.operatorActionRequired ? <div className="mt-1 text-xs text-[var(--dash-warning)]">{t.actionRequired}</div> : null}
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
          <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
            <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.48)] px-5 py-4">
              <CardTitle className="text-base font-semibold">{t.bankChanges}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {data.queues.pendingBankChanges.length === 0 ? (
                <EmptyState label={t.none} />
              ) : (
                data.queues.pendingBankChanges.map((change) => (
                  <div key={change.id} className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.28)] p-3">
                    <div className="font-medium">{change.supplierName}</div>
                    <div className="mt-2 grid gap-1 text-xs text-[var(--dash-text-soft)]">
                      <span>{t.requestedBy}: {change.requestedById}</span>
                      <span>{t.created}: {dateTime(change.requestedAt, locale)}</span>
                      <span>{t.reason}: {change.reason ?? t.notAvailable}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
            <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.48)] px-5 py-4">
              <CardTitle className="text-base font-semibold">{t.blockers}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {data.queues.ledgerBlockers.length === 0 ? (
                <EmptyState label={t.none} />
              ) : (
                data.queues.ledgerBlockers.map((blocker) => (
                  <div key={blocker.id} className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-3 text-[var(--dash-danger)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={blocker.status} fallback={t.notAvailable} />
                      <span className="text-xs">{blocker.postingPurpose}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium">{blocker.errorMessage ?? t.notAvailable}</div>
                    <div className="mt-1 text-xs opacity-80">{t.source}: {blocker.sourceType} / {blocker.sourceId}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <Card className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg text-[var(--dash-text)]">
          <CardHeader className="border-b border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.48)] px-5 py-4">
            <CardTitle className="text-base font-semibold">{t.supplierPayments}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.queues.releasedPayments.length === 0 ? (
              <div className="p-4"><EmptyState label={t.none} /></div>
            ) : (
              <ScrollArea className="w-full">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs text-[var(--dash-text-faint)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t.document}</th>
                      <th className="px-4 py-3 font-medium">{t.supplier}</th>
                      <th className="px-4 py-3 text-right font-medium">{t.amount}</th>
                      <th className="px-4 py-3 font-medium">{t.ledger}</th>
                      <th className="px-4 py-3 font-medium">{t.reconciliation}</th>
                      <th className="px-4 py-3 font-medium">{t.paymentTx}</th>
                      <th className="px-4 py-3 font-medium">{t.countryPack}</th>
                      <th className="px-4 py-3 font-medium">{t.withholding}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queues.releasedPayments.map((payment) => (
                      <tr key={payment.id} className="border-b border-[var(--dash-border-subtle)] last:border-0 hover:bg-[rgba(37,57,67,0.26)]">
                        <td className="px-4 py-3">
                          <div className="font-medium">{payment.paymentNumber}</div>
                          <div className="mt-1 text-xs text-[var(--dash-text-faint)]">{dateTime(payment.paymentDate, locale)} / {payment.method}</div>
                        </td>
                        <td className="px-4 py-3">{payment.supplierName}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(payment.amount, payment.currency, locale)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge value={payment.ledgerStatus} fallback={t.notAvailable} />
                          {payment.ledgerBlockerCode ? <div className="mt-1 max-w-[220px] truncate text-xs text-[var(--dash-text-faint)]">{payment.ledgerBlockerCode}</div> : null}
                        </td>
                        <td className="px-4 py-3"><StatusBadge value={payment.reconciliationStatus} fallback={t.notAvailable} /></td>
                        <td className="px-4 py-3">
                          <div className="max-w-[180px] truncate font-mono text-xs">{payment.paymentTransactionId ?? t.notAvailable}</div>
                          <div className="mt-1 max-w-[180px] truncate font-mono text-xs text-[var(--dash-text-faint)]">{payment.paymentExceptionId ?? t.notAvailable}</div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge value={payment.countryPackStatus} fallback={t.notAvailable} /></td>
                        <td className="px-4 py-3">
                          <StatusBadge value={payment.withholdingTreatmentStatus} fallback={t.notAvailable} />
                          {payment.operatorActionRequired ? <div className="mt-1 text-xs text-[var(--dash-warning)]">{t.actionRequired}</div> : null}
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
    </div>
  )
}
