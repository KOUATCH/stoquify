"use client"

import type { ReactNode } from "react"
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Database,
  FileSearch,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  Target,
  Truck,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  CommandBriefHeader,
  KpiTile,
  dashboardPanelClass,
  dashboardRowClass,
  dashboardToneClass,
} from "@/components/dashboard/primitives/command-center-primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import type { Locale } from "@/types/bilingual"
import type {
  PurchaseOrderAnalyticsData,
  PurchaseOrderAnalyticsExceptionType,
  PurchaseOrderAnalyticsStatus,
} from "@/types/purchase-order-analytics"
import {
  PurchaseOrderAnalyticsTable,
  type AnalyticsTableColumn,
  type AnalyticsTableFacet,
} from "@/components/purchase-orders/PurchaseOrderAnalyticsTable"

type PurchaseOrderAnalyticsDashboardProps = {
  data: PurchaseOrderAnalyticsData
  locale: Locale | string
  range: "30d" | "90d" | "365d" | "all" | "custom"
}

const copy = {
  en: {
    eyebrow: "Purchasing intelligence",
    title: "Purchase order analytics",
    subtitle: "Monitor spend, open commitments, receipt progress, supplier delivery, approval speed, and procurement exceptions from one tenant-scoped read model.",
    live: "Live server snapshot",
    source: "Purchase-order, line and goods-receipt records",
    scope: "Current organization only",
    period: "Analysis period",
    generated: "Generated",
    back: "Purchase orders",
    ranges: { "30d": "30 days", "90d": "90 days", "365d": "12 months", all: "All time", custom: "Custom range" },
    customDates: "Custom date range",
    fromDate: "From date",
    toDate: "To date",
    applyRange: "Apply range",
    resetRange: "Reset",
    tableWorkspace: "Operational data workbench",
    tableWorkspaceDetail: "Search, sort, filter, paginate, and export each tenant-scoped list. Every table uses the analysis period above.",
    searchSuppliers: "Search suppliers, codes, or metrics",
    searchLocations: "Search locations or metrics",
    searchItems: "Search items, SKUs, or metrics",
    searchExceptions: "Search orders, suppliers, locations, or signals",
    clearSearch: "Clear table search",
    clearFilters: "Clear filters",
    exportCsv: "Export CSV",
    rowsPerPage: "Rows per page",
    firstPage: "Go to first page",
    previousPage: "Go to previous page",
    nextPage: "Go to next page",
    lastPage: "Go to last page",
    issueFilter: "Filter by signal",
    allIssues: "All signals",
    riskFilter: "Filter by risk",
    allRisks: "All risks",
    highRisk: "High risk",
    mediumRisk: "Medium risk",
    noMatchingRows: "No rows match the current table filters.",
    sortBy: (column: string) => `Sort by ${column}`,
    page: (current: number, total: number) => `Page ${current} of ${total}`,
    results: (from: number, to: number, total: number) => `${from}–${to} of ${total} rows`,
    totalSpend: "Ordered value",
    totalSpendDetail: "Non-cancelled purchase orders in the selected period",
    openCommitment: "Open goods commitment",
    openCommitmentDetail: "Remaining units valued at purchase-order unit cost",
    averageOrder: "Average order value",
    averageOrderDetail: "Across non-cancelled purchase orders",
    receiptProgress: "Receipt progress",
    receiptProgressDetail: "Received units divided by ordered units",
    onTime: "On-time delivery",
    onTimeDetail: "Orders with both expected and delivery evidence",
    overdue: "Overdue exposure",
    overdueDetail: "Open commitments past their expected date",
    approvalCycle: "Average approval cycle",
    approvalCycleDetail: "Created-to-approved elapsed time",
    completion: "Completion rate",
    completionDetail: "Received or completed orders among active orders",
    hours: "hours",
    orders: "orders",
    sample: "sample",
    spendTrend: "Spend and order movement",
    spendTrendDetail: "Monthly non-cancelled ordered value with purchase-order volume.",
    statusMix: "Lifecycle mix",
    statusMixDetail: "Distribution of purchase orders by persisted status.",
    supplierSpend: "Supplier concentration",
    supplierSpendDetail: "Top suppliers ranked by non-cancelled ordered value.",
    aging: "Open-order aging",
    agingDetail: "Open commitments grouped by days since the order date.",
    supplierTable: "Supplier performance",
    supplierTableDetail: "Spend, receipt completion, overdue workload, and delivery evidence by supplier.",
    locationTable: "Location performance",
    locationTableDetail: "Purchase activity and receipt progress by destination location.",
    itemTable: "Top purchased items",
    itemTableDetail: "Highest-value purchase-order lines and their receipt progress.",
    exceptionTable: "Procurement exception watchlist",
    exceptionTableDetail: "Read-only signals for overdue, approval-waiting, receipt-waiting, and partially received orders.",
    dataQuality: "Data trust signals",
    dataQualityDetail: "Coverage determines how confidently delivery and cycle metrics can be interpreted.",
    expectedCoverage: "Expected-date coverage",
    approvalCoverage: "Approval evidence coverage",
    deliveryCoverage: "Delivery evidence coverage",
    supplier: "Supplier",
    location: "Location",
    item: "Item",
    status: "Status",
    value: "Ordered value",
    commitment: "Open commitment",
    receipt: "Receipt rate",
    onTimeRate: "On-time rate",
    overdueOrders: "Overdue",
    orderCount: "Orders",
    ordered: "Ordered",
    received: "Received",
    expected: "Expected",
    age: "Age",
    issue: "Signal",
    noData: "No purchase-order data exists in this analysis period.",
    noExceptions: "No purchase-order exception meets the watchlist thresholds in this period.",
    concentrated: "Top supplier share",
    days: "days",
  },
  fr: {
    eyebrow: "Intelligence achats",
    title: "Analytique des bons de commande",
    subtitle: "Suivez les achats, engagements ouverts, réceptions, livraisons fournisseurs, délais d’approbation et exceptions dans un modèle limité au tenant.",
    live: "Instantané serveur en direct",
    source: "Bons de commande, lignes et réceptions",
    scope: "Organisation active uniquement",
    period: "Période d’analyse",
    generated: "Généré",
    back: "Bons de commande",
    ranges: { "30d": "30 jours", "90d": "90 jours", "365d": "12 mois", all: "Toute la période", custom: "Période personnalisée" },
    customDates: "Période personnalisée",
    fromDate: "Date de début",
    toDate: "Date de fin",
    applyRange: "Appliquer",
    resetRange: "Réinitialiser",
    tableWorkspace: "Espace de travail opérationnel",
    tableWorkspaceDetail: "Recherchez, triez, filtrez, paginez et exportez chaque liste du tenant. Toutes les tables utilisent la période ci-dessus.",
    searchSuppliers: "Rechercher fournisseurs, codes ou indicateurs",
    searchLocations: "Rechercher sites ou indicateurs",
    searchItems: "Rechercher articles, UGS ou indicateurs",
    searchExceptions: "Rechercher bons, fournisseurs, sites ou signaux",
    clearSearch: "Effacer la recherche",
    clearFilters: "Effacer les filtres",
    exportCsv: "Exporter CSV",
    rowsPerPage: "Lignes par page",
    firstPage: "Aller à la première page",
    previousPage: "Aller à la page précédente",
    nextPage: "Aller à la page suivante",
    lastPage: "Aller à la dernière page",
    issueFilter: "Filtrer par signal",
    allIssues: "Tous les signaux",
    riskFilter: "Filtrer par risque",
    allRisks: "Tous les risques",
    highRisk: "Risque élevé",
    mediumRisk: "Risque moyen",
    noMatchingRows: "Aucune ligne ne correspond aux filtres actuels.",
    sortBy: (column: string) => `Trier par ${column}`,
    page: (current: number, total: number) => `Page ${current} sur ${total}`,
    results: (from: number, to: number, total: number) => `${from}–${to} sur ${total} lignes`,
    totalSpend: "Valeur commandée",
    totalSpendDetail: "Bons non annulés sur la période sélectionnée",
    openCommitment: "Engagement marchandises ouvert",
    openCommitmentDetail: "Unités restantes valorisées au coût du bon de commande",
    averageOrder: "Valeur moyenne d’un bon",
    averageOrderDetail: "Sur les bons de commande non annulés",
    receiptProgress: "Progression des réceptions",
    receiptProgressDetail: "Unités reçues divisées par les unités commandées",
    onTime: "Livraisons à temps",
    onTimeDetail: "Bons avec date prévue et preuve de livraison",
    overdue: "Exposition en retard",
    overdueDetail: "Engagements ouverts après la date prévue",
    approvalCycle: "Délai moyen d’approbation",
    approvalCycleDetail: "Temps entre création et approbation",
    completion: "Taux d’achèvement",
    completionDetail: "Bons reçus ou terminés parmi les bons actifs",
    hours: "heures",
    orders: "bons",
    sample: "échantillon",
    spendTrend: "Évolution des achats et volumes",
    spendTrendDetail: "Valeur mensuelle non annulée et volume de bons de commande.",
    statusMix: "Répartition du cycle de vie",
    statusMixDetail: "Répartition selon le statut persistant du bon.",
    supplierSpend: "Concentration fournisseurs",
    supplierSpendDetail: "Principaux fournisseurs classés par valeur commandée non annulée.",
    aging: "Ancienneté des bons ouverts",
    agingDetail: "Engagements ouverts regroupés selon les jours depuis la commande.",
    supplierTable: "Performance fournisseurs",
    supplierTableDetail: "Achats, réceptions, retards et preuves de livraison par fournisseur.",
    locationTable: "Performance par site",
    locationTableDetail: "Activité d’achat et progression des réceptions par site de destination.",
    itemTable: "Articles les plus achetés",
    itemTableDetail: "Lignes de plus forte valeur et progression de leur réception.",
    exceptionTable: "Liste de surveillance achats",
    exceptionTableDetail: "Signaux en lecture seule pour retards, approbations, réceptions et livraisons partielles.",
    dataQuality: "Signaux de confiance des données",
    dataQualityDetail: "La couverture détermine la fiabilité des indicateurs de livraison et de délai.",
    expectedCoverage: "Couverture des dates prévues",
    approvalCoverage: "Couverture des preuves d’approbation",
    deliveryCoverage: "Couverture des preuves de livraison",
    supplier: "Fournisseur",
    location: "Site",
    item: "Article",
    status: "Statut",
    value: "Valeur commandée",
    commitment: "Engagement ouvert",
    receipt: "Taux de réception",
    onTimeRate: "Taux à temps",
    overdueOrders: "En retard",
    orderCount: "Bons",
    ordered: "Commandé",
    received: "Reçu",
    expected: "Prévu",
    age: "Ancienneté",
    issue: "Signal",
    noData: "Aucune donnée de bon de commande pour cette période.",
    noExceptions: "Aucune exception ne dépasse les seuils de surveillance pour cette période.",
    concentrated: "Part du premier fournisseur",
    days: "jours",
  },
} as const

const statusLabels: Record<Locale, Record<PurchaseOrderAnalyticsStatus, string>> = {
  en: { DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved", PARTIALLY_RECEIVED: "Partially received", RECEIVED: "Received", COMPLETED: "Completed", CANCELLED: "Cancelled" },
  fr: { DRAFT: "Brouillon", SUBMITTED: "Soumis", APPROVED: "Approuvé", PARTIALLY_RECEIVED: "Partiellement reçu", RECEIVED: "Reçu", COMPLETED: "Terminé", CANCELLED: "Annulé" },
}

const issueLabels: Record<Locale, Record<PurchaseOrderAnalyticsExceptionType, string>> = {
  en: { OVERDUE: "Delivery overdue", APPROVAL_WAIT: "Approval waiting", RECEIPT_WAIT: "Receipt waiting", PARTIAL_RECEIPT: "Partial receipt" },
  fr: { OVERDUE: "Livraison en retard", APPROVAL_WAIT: "Approbation en attente", RECEIPT_WAIT: "Réception en attente", PARTIAL_RECEIPT: "Réception partielle" },
}

const chartColors = ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb7185", "#2dd4bf", "#94a3b8"]

function localeKey(locale: Locale | string): Locale {
  return locale === "fr" ? "fr" : "en"
}

function money(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: ["XAF", "XOF"].includes(currency) ? 0 : 2,
  }).format(value)
}

function number(value: number, locale: Locale, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits }).format(value)
}

function date(value: string | null, locale: Locale) {
  if (!value) return "—"
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium" }).format(new Date(value))
}

function dateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function monthLabel(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { month: "short", year: "2-digit" }).format(new Date(`${value}-01T00:00:00Z`))
}

function percent(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { style: "percent", maximumFractionDigits: 1 }).format(value / 100)
}

function chartTooltipStyle() {
  return {
    background: "rgba(8, 16, 20, 0.96)",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: "8px",
    color: "#f8fafc",
  }
}

function AnalyticsPanel({ title, detail, children, className }: { title: string; detail: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn(dashboardPanelClass, "min-w-0 overflow-hidden", className)}>
      <CardHeader className="border-b border-[var(--dash-border-subtle)] pb-4">
        <CardTitle className="text-base text-[var(--dash-text)]">{title}</CardTitle>
        <CardDescription className="text-sm leading-6 text-[var(--dash-text-soft)]">{detail}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">{children}</CardContent>
    </Card>
  )
}

export function PurchaseOrderAnalyticsDashboard({ data, locale: localeInput, range }: PurchaseOrderAnalyticsDashboardProps) {
  const locale = localeKey(localeInput)
  const t = copy[locale]
  const periodLabel = range === "custom"
    ? [data.period.from, data.period.to]
        .filter(Boolean)
        .map(value => date(value, locale))
        .join(" – ") || t.ranges.custom
    : t.ranges[range]
  const statusData = data.statusBreakdown.map(item => ({ ...item, label: statusLabels[locale][item.status] }))
  const supplierChart = data.supplierPerformance.slice(0, 6).map(item => ({ name: item.name, value: item.totalSpend }))
  const agingData = data.aging.map(item => ({
    ...item,
    label: item.bucket === "0_7" ? "0–7" : item.bucket === "8_30" ? "8–30" : item.bucket === "31_60" ? "31–60" : "61+",
  }))
  const tableLabels = {
    clearSearch: t.clearSearch,
    clearFilters: t.clearFilters,
    exportCsv: t.exportCsv,
    rowsPerPage: t.rowsPerPage,
    previousPage: t.previousPage,
    nextPage: t.nextPage,
    firstPage: t.firstPage,
    lastPage: t.lastPage,
    page: t.page,
    results: t.results,
    sortBy: t.sortBy,
  }
  const rangeLabel = `${t.period}: ${periodLabel}`

  const supplierColumns: Array<AnalyticsTableColumn<PurchaseOrderAnalyticsData["supplierPerformance"][number]>> = [
    {
      id: "supplier",
      header: t.supplier,
      accessor: supplier => supplier.name,
      cell: supplier => <div><div className="font-medium text-[var(--dash-text)]">{supplier.name}</div><div className="text-xs text-[var(--dash-text-faint)]">{supplier.code || "—"} · {supplier.orders} {t.orders}</div></div>,
    },
    { id: "value", header: t.value, accessor: supplier => supplier.totalSpend, cell: supplier => money(supplier.totalSpend, data.currency, locale), align: "right" },
    { id: "commitment", header: t.commitment, accessor: supplier => supplier.openCommitmentValue, cell: supplier => money(supplier.openCommitmentValue, data.currency, locale), align: "right" },
    { id: "receipt", header: t.receipt, accessor: supplier => supplier.receiptRate, cell: supplier => percent(supplier.receiptRate, locale), align: "right" },
    { id: "onTime", header: t.onTimeRate, accessor: supplier => supplier.onTimeSampleSize ? supplier.onTimeRate : null, cell: supplier => supplier.onTimeSampleSize ? percent(supplier.onTimeRate, locale) : "—", align: "right" },
    { id: "overdue", header: t.overdueOrders, accessor: supplier => supplier.overdueOrders, cell: supplier => supplier.overdueOrders, align: "right" },
  ]
  const locationColumns: Array<AnalyticsTableColumn<PurchaseOrderAnalyticsData["locationPerformance"][number]>> = [
    { id: "location", header: t.location, accessor: location => location.name, cell: location => <span className="font-medium text-[var(--dash-text)]">{location.name}</span> },
    { id: "orders", header: t.orderCount, accessor: location => location.orders, cell: location => location.orders, align: "right" },
    { id: "value", header: t.value, accessor: location => location.totalSpend, cell: location => money(location.totalSpend, data.currency, locale), align: "right" },
    { id: "commitment", header: t.commitment, accessor: location => location.openCommitmentValue, cell: location => money(location.openCommitmentValue, data.currency, locale), align: "right" },
    { id: "receipt", header: t.receipt, accessor: location => location.receiptRate, cell: location => percent(location.receiptRate, locale), align: "right" },
    { id: "overdue", header: t.overdueOrders, accessor: location => location.overdueOrders, cell: location => location.overdueOrders, align: "right" },
  ]
  const itemColumns: Array<AnalyticsTableColumn<PurchaseOrderAnalyticsData["itemPerformance"][number]>> = [
    {
      id: "item",
      header: t.item,
      accessor: item => locale === "fr" ? item.nameFr || item.nameEn : item.nameEn,
      cell: item => <div><div className="font-medium text-[var(--dash-text)]">{locale === "fr" ? item.nameFr || item.nameEn : item.nameEn}</div><div className="text-xs text-[var(--dash-text-faint)]">{item.sku}</div></div>,
    },
    { id: "ordered", header: t.ordered, accessor: item => item.orderedUnits, cell: item => number(item.orderedUnits, locale), align: "right" },
    { id: "received", header: t.received, accessor: item => item.receivedUnits, cell: item => number(item.receivedUnits, locale), align: "right" },
    { id: "receipt", header: t.receipt, accessor: item => item.receiptRate, cell: item => percent(item.receiptRate, locale), align: "right" },
    { id: "value", header: t.value, accessor: item => item.totalSpend, cell: item => money(item.totalSpend, data.currency, locale), align: "right" },
  ]
  const exceptionColumns: Array<AnalyticsTableColumn<PurchaseOrderAnalyticsData["exceptions"][number]>> = [
    {
      id: "order",
      header: t.orders,
      accessor: item => item.orderNumber,
      cell: item => <div><Link href={`/dashboard/purchase-orders/${item.id}`} className="font-medium text-[var(--dash-info)] hover:underline">{item.orderNumber}</Link><div className="text-xs text-[var(--dash-text-faint)]">{item.locationName}</div></div>,
    },
    { id: "supplier", header: t.supplier, accessor: item => item.supplierName, cell: item => item.supplierName },
    { id: "issue", header: t.issue, accessor: item => issueLabels[locale][item.issue], cell: item => <Badge variant="outline" className={cn("rounded-md", dashboardToneClass(item.risk === "high" ? "danger" : "gold"))}>{issueLabels[locale][item.issue]}</Badge> },
    { id: "status", header: t.status, accessor: item => statusLabels[locale][item.status], cell: item => statusLabels[locale][item.status] },
    { id: "expected", header: t.expected, accessor: item => item.expectedDeliveryDate ?? "", cell: item => date(item.expectedDeliveryDate, locale) },
    { id: "age", header: t.age, accessor: item => item.daysOverdue || item.daysOpen, cell: item => `${item.daysOverdue || item.daysOpen} ${t.days}`, align: "right" },
    { id: "commitment", header: t.commitment, accessor: item => item.openCommitmentValue, cell: item => money(item.openCommitmentValue, data.currency, locale), align: "right" },
    { id: "receipt", header: t.receipt, accessor: item => item.receiptRate, cell: item => percent(item.receiptRate, locale), align: "right" },
  ]
  const exceptionFacets: Array<AnalyticsTableFacet<PurchaseOrderAnalyticsData["exceptions"][number]>> = [
    {
      id: "issue",
      label: t.issueFilter,
      allLabel: t.allIssues,
      value: item => item.issue,
      options: (Object.keys(issueLabels[locale]) as PurchaseOrderAnalyticsExceptionType[]).map(issue => ({ value: issue, label: issueLabels[locale][issue] })),
    },
    {
      id: "risk",
      label: t.riskFilter,
      allLabel: t.allRisks,
      value: item => item.risk,
      options: [{ value: "high", label: t.highRisk }, { value: "medium", label: t.mediumRisk }],
    },
  ]

  if (data.totals.orders === 0) {
    return (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <main className="dashboard-landing-content w-full space-y-5 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8 2xl:px-8">
          <CommandBriefHeader
            eyebrow={t.eyebrow}
            title={t.title}
            summary={t.subtitle}
            state={{ label: t.live, tone: "info", icon: Database }}
            metadata={[
              { label: t.scope, value: t.scope, icon: Target },
              { label: t.period, value: periodLabel, icon: CalendarClock },
              { label: t.generated, value: dateTime(data.generatedAt, locale), icon: Clock3 },
            ]}
            actions={[{ label: t.back, href: "/dashboard/purchase-orders", icon: ShoppingCart, variant: "secondary" }]}
            proof={{ state: "unavailable", label: t.source, source: `0 ${t.orders}` }}
          >
            <div className="grid gap-3 pt-1 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-end">
              <nav aria-label={t.period} className="flex flex-wrap gap-2">
                {(["30d", "90d", "365d", "all"] as const).map(option => (
                  <Button key={option} asChild size="sm" variant="outline" className={cn("h-9 rounded-lg", option === range ? dashboardToneClass("brand") : "dashboard-button-secondary")}>
                    <Link href={`/dashboard/purchase-orders/analytics?range=${option}`} aria-current={option === range ? "page" : undefined}>
                      {t.ranges[option]}
                    </Link>
                  </Button>
                ))}
              </nav>
              <form method="get" className="grid gap-2 rounded-xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/72 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
                <label className="grid gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
                  {t.fromDate}
                  <input
                    type="date"
                    name="from"
                    aria-label={t.fromDate}
                    defaultValue={range === "custom" ? data.period.from?.slice(0, 10) ?? "" : ""}
                    className="dashboard-control h-10 min-w-0 rounded-lg border border-[var(--dash-border-subtle)] px-3 text-sm text-[var(--dash-text)]"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
                  {t.toDate}
                  <input
                    type="date"
                    name="to"
                    aria-label={t.toDate}
                    defaultValue={range === "custom" ? data.period.to?.slice(0, 10) ?? "" : ""}
                    className="dashboard-control h-10 min-w-0 rounded-lg border border-[var(--dash-border-subtle)] px-3 text-sm text-[var(--dash-text)]"
                  />
                </label>
                <Button type="submit" size="sm" className="dashboard-button-create h-10 rounded-lg">{t.applyRange}</Button>
                <Button asChild type="button" variant="outline" size="sm" className="dashboard-button-secondary h-10 rounded-lg">
                  <Link href="/dashboard/purchase-orders/analytics?range=90d">{t.resetRange}</Link>
                </Button>
              </form>
            </div>
          </CommandBriefHeader>
          <div className={cn(dashboardPanelClass, "flex min-h-64 flex-col items-center justify-center p-8 text-center")}>
            <FileSearch className="h-10 w-10 text-[var(--dash-text-faint)]" />
            <p className="mt-4 text-sm text-[var(--dash-text-soft)]">{t.noData}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <main className="dashboard-landing-content w-full space-y-5 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8 2xl:px-8">
        <CommandBriefHeader
          eyebrow={t.eyebrow}
          title={t.title}
          summary={t.subtitle}
          state={{ label: t.live, tone: "success", icon: Database }}
          metadata={[
            { label: t.scope, value: t.scope, icon: Target },
            { label: t.period, value: periodLabel, icon: CalendarClock },
            { label: t.generated, value: dateTime(data.generatedAt, locale), icon: Clock3 },
          ]}
          actions={[{ label: t.back, href: "/dashboard/purchase-orders", icon: ShoppingCart, variant: "secondary" }]}
          proof={{ state: "operational", label: t.source, source: `${data.totals.orders} ${t.orders}` }}
        >
          <div className="grid gap-3 pt-1 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-end">
            <nav aria-label={t.period} className="flex flex-wrap gap-2">
              {(["30d", "90d", "365d", "all"] as const).map(option => (
                <Button key={option} asChild size="sm" variant="outline" className={cn("h-9 rounded-lg", option === range ? dashboardToneClass("brand") : "dashboard-button-secondary")}>
                  <Link href={`/dashboard/purchase-orders/analytics?range=${option}`} aria-current={option === range ? "page" : undefined}>
                    {t.ranges[option]}
                  </Link>
                </Button>
              ))}
            </nav>
            <form method="get" className="grid gap-2 rounded-xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/72 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
              <label className="grid gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
                {t.fromDate}
                <input
                  type="date"
                  name="from"
                  aria-label={t.fromDate}
                  defaultValue={range === "custom" ? data.period.from?.slice(0, 10) ?? "" : ""}
                  className="dashboard-control h-10 min-w-0 rounded-lg border border-[var(--dash-border-subtle)] px-3 text-sm text-[var(--dash-text)]"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-[var(--dash-text-soft)]">
                {t.toDate}
                <input
                  type="date"
                  name="to"
                  aria-label={t.toDate}
                  defaultValue={range === "custom" ? data.period.to?.slice(0, 10) ?? "" : ""}
                  className="dashboard-control h-10 min-w-0 rounded-lg border border-[var(--dash-border-subtle)] px-3 text-sm text-[var(--dash-text)]"
                />
              </label>
              <Button type="submit" size="sm" className="dashboard-button-create h-10 rounded-lg">{t.applyRange}</Button>
              <Button asChild type="button" variant="outline" size="sm" className="dashboard-button-secondary h-10 rounded-lg">
                <Link href="/dashboard/purchase-orders/analytics?range=90d">{t.resetRange}</Link>
              </Button>
            </form>
          </div>
        </CommandBriefHeader>

        <section aria-label="Purchase order key performance indicators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile label={t.totalSpend} value={money(data.totals.totalSpend, data.currency, locale)} detail={t.totalSpendDetail} icon={ReceiptText} tone="brand" />
          <KpiTile label={t.openCommitment} value={money(data.totals.openCommitmentValue, data.currency, locale)} detail={t.openCommitmentDetail} icon={Truck} tone={data.totals.openCommitmentValue > 0 ? "gold" : "muted"} />
          <KpiTile label={t.averageOrder} value={money(data.totals.averageOrderValue, data.currency, locale)} detail={t.averageOrderDetail} icon={BarChart3} tone="info" />
          <KpiTile label={t.receiptProgress} value={percent(data.totals.receiptRate, locale)} detail={t.receiptProgressDetail} icon={PackageCheck} tone={data.totals.receiptRate >= 90 ? "success" : "info"} trend={{ label: `${number(data.totals.receivedUnits, locale)} / ${number(data.totals.orderedUnits, locale)}`, tone: "muted" }} />
          <KpiTile label={t.onTime} value={percent(data.totals.onTimeRate, locale)} detail={t.onTimeDetail} icon={CheckCircle2} tone={data.totals.onTimeRate >= 85 ? "success" : "gold"} trend={{ label: `${t.sample}: ${data.totals.onTimeSampleSize}`, tone: "muted" }} />
          <KpiTile label={t.overdue} value={money(data.totals.overdueValue, data.currency, locale)} detail={t.overdueDetail} icon={AlertTriangle} tone={data.totals.overdueOrders > 0 ? "danger" : "success"} trend={{ label: `${data.totals.overdueOrders} ${t.orders}`, tone: data.totals.overdueOrders > 0 ? "danger" : "success" }} />
          <KpiTile label={t.approvalCycle} value={`${number(data.totals.approvalCycle.averageHours, locale)} ${t.hours}`} detail={t.approvalCycleDetail} icon={Clock3} tone="spruce" trend={{ label: `P90 ${number(data.totals.approvalCycle.p90Hours, locale)} ${t.hours}`, tone: "muted" }} />
          <KpiTile label={t.completion} value={percent(data.totals.completionRate, locale)} detail={t.completionDetail} icon={Target} tone="success" trend={{ label: `${t.concentrated}: ${percent(data.totals.supplierConcentrationRate, locale)}`, tone: "muted" }} />
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <AnalyticsPanel title={t.spendTrend} detail={t.spendTrendDetail} className="xl:col-span-7">
            <div role="img" aria-label={t.spendTrend} className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.monthly.map(item => ({ ...item, label: monthLabel(item.month, locale) }))} margin={{ top: 12, right: 12, left: 6, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="value" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} width={72} tickFormatter={value => number(Number(value), locale, 0)} />
                  <YAxis yAxisId="count" orientation="right" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                  <Tooltip contentStyle={chartTooltipStyle()} formatter={(value, name) => name === t.value ? money(Number(value), data.currency, locale) : number(Number(value), locale, 0)} />
                  <Legend />
                  <Bar yAxisId="value" dataKey="totalSpend" name={t.value} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="count" type="monotone" dataKey="orderCount" name={t.orderCount} stroke="#34d399" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsPanel>

          <AnalyticsPanel title={t.statusMix} detail={t.statusMixDetail} className="xl:col-span-5">
            <div role="img" aria-label={t.statusMix} className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData.filter(item => item.orders > 0)} dataKey="orders" nameKey="label" cx="50%" cy="47%" innerRadius={62} outerRadius={100} paddingAngle={2}>
                    {statusData.filter(item => item.orders > 0).map((item, index) => <Cell key={item.status} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle()} formatter={value => `${number(Number(value), locale, 0)} ${t.orders}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsPanel>

          <AnalyticsPanel title={t.supplierSpend} detail={t.supplierSpendDetail} className="xl:col-span-7">
            <div role="img" aria-label={t.supplierSpend} className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierChart} layout="vertical" margin={{ top: 6, right: 16, left: 10, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={value => number(Number(value), locale, 0)} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle()} formatter={value => money(Number(value), data.currency, locale)} />
                  <Bar dataKey="value" name={t.value} fill="#2dd4bf" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsPanel>

          <AnalyticsPanel title={t.aging} detail={t.agingDetail} className="xl:col-span-5">
            <div role="img" aria-label={t.aging} className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData} margin={{ top: 12, right: 12, left: 6, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} width={72} tickFormatter={value => number(Number(value), locale, 0)} />
                  <Tooltip contentStyle={chartTooltipStyle()} formatter={(value, name) => name === t.commitment ? money(Number(value), data.currency, locale) : number(Number(value), locale, 0)} />
                  <Legend />
                  <Bar dataKey="openCommitmentValue" name={t.commitment} fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsPanel>
        </section>

        <AnalyticsPanel title={t.dataQuality} detail={t.dataQualityDetail}>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              [t.expectedCoverage, data.dataQuality.expectedDeliveryCoverage, data.dataQuality.expectedDeliverySampleSize],
              [t.approvalCoverage, data.dataQuality.approvalEvidenceCoverage, data.dataQuality.approvalEvidenceSampleSize],
              [t.deliveryCoverage, data.dataQuality.deliveryEvidenceCoverage, data.dataQuality.deliveryEvidenceSampleSize],
            ].map(([label, value, sampleSize]) => (
              <div key={String(label)} className={cn(dashboardRowClass, "p-4")}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--dash-text)]">{label}</span>
                  <Badge variant="outline" className={cn("rounded-md", dashboardToneClass(Number(value) >= 90 ? "success" : Number(value) >= 70 ? "gold" : "danger"))}>
                    {percent(Number(value), locale)}
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.16)]">
                  <div className="h-full rounded-full bg-[var(--dash-info)]" style={{ width: `${Math.min(100, Number(value))}%` }} />
                </div>
                <p className="mt-2 text-xs text-[var(--dash-text-faint)]">{t.sample}: {number(Number(sampleSize), locale, 0)}</p>
              </div>
            ))}
          </div>
        </AnalyticsPanel>

        <section className="space-y-2 rounded-2xl border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/45 p-4 sm:p-5">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dash-info)]">{t.tableWorkspace}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">{t.tableWorkspaceDetail}</p>
          </div>
        </section>

        <section aria-label={t.tableWorkspace} className="space-y-5">
          <AnalyticsPanel title={t.supplierTable} detail={t.supplierTableDetail}>
            <PurchaseOrderAnalyticsTable
              rows={data.supplierPerformance}
              columns={supplierColumns}
              rowKey={supplier => supplier.supplierId}
              searchText={supplier => `${supplier.name} ${supplier.code} ${supplier.orders} ${supplier.totalSpend} ${supplier.openCommitmentValue}`}
              searchPlaceholder={t.searchSuppliers}
              emptyMessage={t.noMatchingRows}
              rangeLabel={rangeLabel}
              labels={tableLabels}
              exportFilename="purchase-order-supplier-performance.csv"
              defaultSort={{ id: "value", direction: "desc" }}
            />
          </AnalyticsPanel>

          <AnalyticsPanel title={t.locationTable} detail={t.locationTableDetail}>
            <PurchaseOrderAnalyticsTable
              rows={data.locationPerformance}
              columns={locationColumns}
              rowKey={location => location.locationId}
              searchText={location => `${location.name} ${location.orders} ${location.totalSpend} ${location.openCommitmentValue}`}
              searchPlaceholder={t.searchLocations}
              emptyMessage={t.noMatchingRows}
              rangeLabel={rangeLabel}
              labels={tableLabels}
              exportFilename="purchase-order-location-performance.csv"
              defaultSort={{ id: "value", direction: "desc" }}
            />
          </AnalyticsPanel>

          <AnalyticsPanel title={t.itemTable} detail={t.itemTableDetail}>
            <PurchaseOrderAnalyticsTable
              rows={data.itemPerformance}
              columns={itemColumns}
              rowKey={item => item.itemId}
              searchText={item => `${item.sku} ${item.nameEn} ${item.nameFr ?? ""} ${item.orderedUnits} ${item.receivedUnits} ${item.totalSpend}`}
              searchPlaceholder={t.searchItems}
              emptyMessage={t.noMatchingRows}
              rangeLabel={rangeLabel}
              labels={tableLabels}
              exportFilename="purchase-order-item-performance.csv"
              defaultSort={{ id: "value", direction: "desc" }}
            />
          </AnalyticsPanel>

          <AnalyticsPanel title={t.exceptionTable} detail={t.exceptionTableDetail}>
            <PurchaseOrderAnalyticsTable
              rows={data.exceptions}
              columns={exceptionColumns}
              rowKey={item => item.id}
              searchText={item => `${item.orderNumber} ${item.supplierName} ${item.locationName} ${issueLabels[locale][item.issue]} ${statusLabels[locale][item.status]}`}
              searchPlaceholder={t.searchExceptions}
              emptyMessage={data.exceptions.length ? t.noMatchingRows : t.noExceptions}
              rangeLabel={rangeLabel}
              labels={tableLabels}
              facets={exceptionFacets}
              exportFilename="purchase-order-exceptions.csv"
              defaultSort={{ id: "age", direction: "desc" }}
              pageSizeOptions={[10, 25, 50]}
            />
          </AnalyticsPanel>
        </section>
      </main>
    </div>
  )
}
