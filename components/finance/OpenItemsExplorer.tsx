"use client"
import Link from "next/link"
import type { OpenItemsWorkflowLink } from "@/lib/finance/open-items-navigation"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"
import { DataTableSearch } from "@/components/DataTableComponents/DataTableSearch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DetailDrawer } from "@/components/dashboard/primitives/command-center-primitives"
import { formatSalesDecimal } from "@/lib/analytics/sales-performance-scope"
import type { OpenItemsDashboard, OpenItemsRow, OpenItemsScope } from "@/services/finance/open-items-dashboard.contract"
import { dashboardControlClass } from "./finance-dashboard-theme"

const copy = {
  en: { filters: "Find invoices to review", search: "Invoice or customer / supplier", apply: "Search", clear: "Clear invoice filters", currency: "Currency", allCurrencies: "All currencies", aging: "Aging bucket", all: "All", pageSize: "Rows per page", note: "Search, queue, aging and counterparty filters affect invoice rows only. Balance cards and queue counts keep the selected location and currency scope. Queues overlap; do not add their counts.", party: "Counterparty filter applied", noMatch: "No invoices match these filters.", queues: { all: "All open invoices", overdue: "Overdue", due7: "Due in 7 days", due30: "Due in 30 days", unknown: "Missing due date", unverified: "Unverified evidence" }, buckets: { all: "All ages", current: "Not overdue", "1-30": "1–30 days", "31-60": "31–60 days", "61-90": "61–90 days", "90+": "Over 90 days", unknown: "Missing due date" }, details: "Invoice detail", original: "Original amount", allocated: "Allocated / settled", credits: "Verified credits", remaining: "Remaining amount", due: "Due date", unknown: "Unavailable", close: "Close", evidence: "Use the existing history workflow for retained evidence. These figures share the dashboard snapshot.", history: "Open history", broader: "History opens the broader organization scope. Select this invoice there.", states: { DRAFT: "Draft", MATCHED: "Matched", CANCELLED: "Cancelled", open: "Open", partial: "Partially settled", POSTED: "Posted", PAYMENT_PENDING: "Payment pending", PAID: "Marked paid — review evidence", DISPUTED: "Disputed" } },
  fr: { filters: "Trouver les factures à examiner", search: "Facture ou client / fournisseur", apply: "Rechercher", clear: "Effacer les filtres de factures", currency: "Devise", allCurrencies: "Toutes les devises", aging: "Tranche d’ancienneté", all: "Tout", pageSize: "Lignes par page", note: "La recherche, la file, l’ancienneté et le tiers filtrent uniquement les factures. Les cartes de solde et les compteurs conservent l’établissement et la devise sélectionnés. Les files se recoupent ; ne pas additionner leurs compteurs.", party: "Filtre de tiers appliqué", noMatch: "Aucune facture ne correspond aux filtres.", queues: { all: "Toutes les factures ouvertes", overdue: "En retard", due7: "Échéance sous 7 jours", due30: "Échéance sous 30 jours", unknown: "Échéance manquante", unverified: "Justificatifs non vérifiés" }, buckets: { all: "Toutes les anciennetés", current: "Sans retard", "1-30": "1–30 jours", "31-60": "31–60 jours", "61-90": "61–90 jours", "90+": "Plus de 90 jours", unknown: "Échéance manquante" }, details: "Détail de la facture", original: "Montant initial", allocated: "Affecté / réglé", credits: "Avoirs vérifiés", remaining: "Montant restant", due: "Échéance", unknown: "Indisponible", close: "Fermer", evidence: "Consultez l’historique existant pour les justificatifs conservés. Ces montants proviennent du même instantané que le tableau de bord.", history: "Ouvrir l’historique", broader: "L’historique ouvre le périmètre global de l’organisation. Sélectionnez-y cette facture.", states: { DRAFT: "Brouillon", MATCHED: "Rapprochée", CANCELLED: "Annulée", open: "Ouverte", partial: "Partiellement réglée", POSTED: "Comptabilisée", PAYMENT_PENDING: "Paiement en attente", PAID: "Marquée payée — vérifier les justificatifs", DISPUTED: "Contestée" } },
}

export function OpenItemsFilters({ scope, report, locale, onChange, search, setSearch, children }: { children: ReactNode; scope: OpenItemsScope; report: OpenItemsDashboard; locale: "en" | "fr"; onChange: (scope: OpenItemsScope) => void; search: string; setSearch: (value: string) => void }) {
  const t = copy[locale]
  const change = (patch: Partial<OpenItemsScope>) => onChange({ ...scope, ...patch, page: 1, revision: undefined })
  const queue = scope.queue ?? "all"
  return <Tabs value={queue} onValueChange={value => change({ queue: value as OpenItemsScope["queue"] })} activationMode="manual" className="min-w-0 space-y-3">
    <TabsList aria-label={t.filters} className="h-auto w-full flex-wrap justify-start gap-1">
      {Object.entries(t.queues).filter(([key]) => key !== "unverified" || scope.view === "payables").map(([key, label]) => <TabsTrigger key={key} value={key} className="min-h-10 whitespace-normal text-left">{label} ({report.queueCounts?.[key as keyof typeof report.queueCounts] ?? 0})</TabsTrigger>)}
    </TabsList>
    <TabsContent key={queue} value={queue} className="min-w-0 space-y-3">
    <form className="dashboard-table-toolbar flex min-w-0 flex-wrap items-end gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-3" onSubmit={event => { event.preventDefault(); change({ search }) }}>
      <div className="min-w-0 flex-1 basis-64"><DataTableSearch type="text" value={search} onChange={value => setSearch(value.slice(0, 100))} ariaLabel={t.search} placeholder={t.search} clearButtonLabel={locale === "fr" ? "Effacer la recherche" : "Clear table search"} /></div><Button type="submit">{t.apply}</Button>
      <label className="grid gap-1 text-sm">{t.currency}<select className={dashboardControlClass} value={scope.currency ?? ""} onChange={event => change({ currency: event.target.value || undefined })}><option value="">{t.allCurrencies}</option>{(report.availableCurrencies ?? report.currencies.map(group => group.currency)).map(currency => <option key={currency}>{currency}</option>)}</select></label>
      <label className="grid gap-1 text-sm">{t.aging}<select className={dashboardControlClass} value={scope.bucket ?? "all"} onChange={event => change({ bucket: event.target.value as OpenItemsScope["bucket"] })}>{Object.entries(t.buckets).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Button type="button" variant="outline" className="h-auto min-h-10 whitespace-normal" onClick={() => { setSearch(""); onChange({ view: scope.view, locationId: scope.locationId, currency: scope.currency }) }}>{t.clear}</Button>
    </form>
    {scope.counterpartyId && <p role="status">{t.party}</p>}
    <p className="text-sm text-[var(--dash-text-soft)]">{t.note}</p>
    {children}
    </TabsContent>
  </Tabs>
}

export function OpenItemDetails({ row, locale, timezone, history, view, workflowLinks = [] }: { row: OpenItemsRow; locale: "en" | "fr"; timezone: string; history?: string; view: OpenItemsScope["view"]; workflowLinks?: OpenItemsWorkflowLink[] }) {
  const t = copy[locale]
  const money = (value: string | null) => value === null ? t.unknown : `${formatSalesDecimal(value, locale)} ${row.currency}`
  return <DetailDrawer title={`${t.details} · ${row.reference}`} description={t.evidence} closeLabel={t.close} trigger={<Button variant="link" className="h-auto whitespace-normal p-0 text-left" aria-label={`${t.details}: ${row.reference}`}>{row.reference}</Button>} actions={history ? [{ label: t.history, href: history }] : []}>
    <p className="font-semibold">{row.counterparty}</p><p>{t.states[row.state as keyof typeof t.states] ?? row.state}</p>
    <dl className="mt-4 space-y-3">{([[t.original, money(row.original)], [t.allocated, money(row.allocated)], [t.credits, money(row.credits)], [t.remaining, money(row.outstanding)], [t.due, row.dueDate ? new Intl.DateTimeFormat(locale, { timeZone: timezone, dateStyle: "medium" }).format(new Date(row.dueDate)) : t.unknown]]).map(([label, value]) => <div key={label}><dt className="text-sm text-[var(--dash-text-soft)]">{label}</dt><dd className="tabular-nums">{value}</dd></div>)}</dl>
    <p className="mt-4 text-sm">{locale === "fr" ? "L’historique sélectionne cette facture dans son périmètre de tiers. Les autres parcours ouvrent leur périmètre organisationnel ; leurs filtres et autorisations s’appliquent séparément." : "History selects this invoice in its counterparty scope. Other workflows open broader organization scope; their filters and permissions apply separately."}</p>
    {workflowLinks.length > 0 && <nav className="mt-4 flex flex-wrap gap-3" aria-label={locale === "fr" ? "Parcours disponibles" : "Available workflows"}>{workflowLinks.map(link => <Link className="underline focus-visible:outline" key={link.href} href={link.href}>{link.label}</Link>)}</nav>}
    {view === "receivables" && workflowLinks.length > 0 && <p className="mt-3 text-sm">{locale === "fr" ? "Les contestations et promesses proviennent des relevés clients. Une promesse n’est pas un encaissement et ne réduit pas ce solde. Ouvrir le parcours n’envoie aucune relance." : "Disputes and promises come from customer statements. A promise is not a receipt and does not reduce this balance. Opening the workflow sends no reminder."}</p>}
  </DetailDrawer>
}
