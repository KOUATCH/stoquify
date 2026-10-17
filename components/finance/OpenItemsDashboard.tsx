"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { useOpenItemsDashboard } from "@/hooks/finance/useOpenItemsDashboard"
import { formatSalesDecimal } from "@/lib/analytics/sales-performance-scope"
import { dashboardPanelClass, dashboardControlClass } from "./finance-dashboard-theme"
import type { OpenItemsScope } from "@/services/finance/open-items-dashboard.contract"
import { OpenItemsFilters } from "./OpenItemsExplorer"
import { OpenItemsInvoiceTable } from "./OpenItemsInvoiceTable"
import { ReceivablesCollectionsPanel } from "./ReceivablesCollectionsPanel"
import { PayablesPaymentActivity } from "./PayablesPaymentActivity"
import { openItemsHref } from "@/lib/finance/open-items-navigation"
import { PayablesWorkflowPanel } from "./PayablesWorkflowPanel"
import { useOpenItemsScope } from "@/hooks/finance/useOpenItemsScope"
import { canOpenItemsHistory, openItemsHistoryHref } from "@/lib/finance/open-items-navigation"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"

const copy = {
  en: {
    receivables: "Customer receivables", payables: "Supplier payables", current: "Current invoice position", checked: "Checked",
    location: "Location", all: "All locations", outstanding: "Outstanding", overdue: "Overdue", due7: "Due in the next 7 days", dueToday: "Due today",
    aging: "Invoice aging", buckets: { current: "Not overdue", "1-30": "1–30 days", "31-60": "31–60 days", "61-90": "61–90 days", "90+": "90+ days", unknown: "Due date unavailable" },
    invoices: "Outstanding invoices", party: "Customer / supplier", reference: "Invoice", due: "Due date", balance: "Remaining amount", evidence: "Evidence",
    posted: "Posted AR lifecycle", operational: "Operational AP evidence", unverified: "Unverified", unavailable: "Unavailable",
    incomplete: "Some invoice evidence is unverified. Affected currency totals are unavailable.",
    noDocuments: "No source documents were found. This does not establish that all obligations have been posted or cleared.",
    noOpen: "No outstanding invoices in the available evidence.",
    scope: "Balances are current, not activity during a reporting period. Amounts in different currencies remain separate.",
    apProof: "Operational supplier evidence; not a reconciled or certified general-ledger balance.",
    allocation: "AP location follows the source purchase order. Invoices without a purchase order are included only in All locations.",
    unassigned: "Unassigned posted/disputed invoices in the organization", history: "Open invoice history", workbench: "Open AP workbench",
    broader: "History opens a broader organization scope; destination permissions apply independently.",
    previous: "Previous", next: "Next", page: "Page", of: "of", records: "matching invoices", refresh: "Refresh", refreshing: "Refreshing…",
    error: "Invoice evidence is unavailable", errorDetail: "Refresh the dashboard or open the existing history workflow.", retry: "Retry", back: "Dashboard",
    delayed: "Loading is taking longer than expected", delayedDetail: "Your session or invoice evidence has not finished loading. You can keep waiting or reload this page with the same filters. No balances are shown until access and data are verified.", reload: "Reload page",
  },
  fr: {
    receivables: "Créances clients", payables: "Dettes fournisseurs", current: "Situation actuelle des factures", checked: "Vérifié le",
    location: "Établissement", all: "Tous les établissements", outstanding: "Solde restant", overdue: "En retard", due7: "À échéance dans les 7 prochains jours", dueToday: "À échéance aujourd’hui",
    aging: "Ancienneté des factures", buckets: { current: "Sans retard", "1-30": "1–30 jours", "31-60": "31–60 jours", "61-90": "61–90 jours", "90+": "90+ jours", unknown: "Échéance indisponible" },
    invoices: "Factures restant à régler", party: "Client / fournisseur", reference: "Facture", due: "Échéance", balance: "Montant restant", evidence: "Justificatifs",
    posted: "Cycle de créance comptabilisée", operational: "Justificatifs fournisseurs opérationnels", unverified: "Non vérifiés", unavailable: "Indisponible",
    incomplete: "Certains justificatifs ne sont pas vérifiés. Les totaux des devises concernées sont indisponibles.",
    noDocuments: "Aucun document source trouvé. Cela ne prouve pas que toutes les obligations ont été comptabilisées ou réglées.",
    noOpen: "Aucune facture à régler dans les justificatifs disponibles.",
    scope: "Les soldes représentent la situation actuelle, pas l’activité d’une période. Les devises restent séparées.",
    apProof: "Justificatifs fournisseurs opérationnels ; ce solde n’est pas un solde du grand livre rapproché ou certifié.",
    allocation: "L’établissement fournisseur provient du bon de commande. Les factures sans bon figurent uniquement dans Tous les établissements.",
    unassigned: "Factures comptabilisées ou contestées sans établissement dans l’organisation", history: "Ouvrir l’historique des factures", workbench: "Ouvrir l’espace fournisseurs",
    broader: "L’historique couvre un périmètre organisationnel plus large ; ses autorisations sont vérifiées séparément.",
    previous: "Précédent", next: "Suivant", page: "Page", of: "sur", records: "factures correspondantes", refresh: "Actualiser", refreshing: "Actualisation…",
    error: "Justificatifs des factures indisponibles", errorDetail: "Actualisez le tableau de bord ou ouvrez l’historique existant.", retry: "Réessayer", back: "Tableau de bord",
    delayed: "Le chargement prend plus de temps que prévu", delayedDetail: "Votre session ou les justificatifs des factures sont encore en cours de chargement. Vous pouvez patienter ou recharger la page avec les mêmes filtres. Aucun solde n’est affiché avant la vérification des accès et des données.", reload: "Recharger la page",
  },
}

/** Current position, invoice review queues and independently scoped workflow activity. */
export function OpenItemsDashboard({ view }: { view: OpenItemsScope["view"] }) {
  const locale = useLocale() === "fr" ? "fr" : "en"
  const t = copy[locale]
  const [scope, setScope, activity] = useOpenItemsScope(view, locale)
  const [receiptDraft, setReceiptDraft] = useState<{ key: string; start: string; end: string }>()
  const [searchDraft, setSearchDraft] = useState<{ key: string; value: string }>()
  const query = useOpenItemsDashboard({ ...scope, view })
  useEffect(() => { setReceiptDraft(undefined) }, [activity?.period?.start, activity?.period?.end, query.identity?.userId, query.identity?.organizationId])
  useEffect(() => { setSearchDraft(undefined) }, [scope.search, query.identity?.userId, query.identity?.organizationId])
  const report = query.data
  const [loadDelayed, setLoadDelayed] = useState(false)
  const waitingForReport = !report && !query.accessState && !query.isError
  useEffect(() => {
    setLoadDelayed(false)
    if (!waitingForReport) return
    const timer = setTimeout(() => setLoadDelayed(true), 30_000)
    return () => clearTimeout(timer)
  }, [waitingForReport, view, query.identity?.userId, query.identity?.organizationId])
  const history = openItemsHistoryHref(locale, scope, undefined, activity?.period)
  const permissions = query.identity?.enabled ? query.identity.permissionKey.split("|") : []
  const canHistory = canOpenItemsHistory(view, permissions)
  const reset = () => setScope({ ...scope, page: 1, revision: undefined })
  if (query.accessState) return <DashboardRouteState embedded kind={query.accessState} locale={locale} primaryHref={`/${locale}/dashboard`} primaryLabel={t.back} />
  if (query.isError) return <DashboardRouteState embedded kind="error" locale={locale} title={t.error} message={query.error?.message || t.errorDetail} primaryHref={canHistory ? history : `/${locale}/dashboard`} primaryLabel={canHistory ? t.history : t.back} actions={<Button onClick={() => { if ((scope.page ?? 1) > 1 || scope.revision) reset(); else void query.refetch() }}>{t.retry}</Button>} />
  if (!report) return <div role={loadDelayed ? "alert" : undefined}><DashboardRouteState embedded kind={loadDelayed ? "error" : "loading"} locale={locale} title={loadDelayed ? t.delayed : undefined} message={loadDelayed ? t.delayedDetail : undefined} primaryHref={`/${locale}/dashboard`} primaryLabel={t.back} actions={loadDelayed ? <Button asChild><a href={openItemsHref(locale, scope, activity?.period)}>{t.reload}</a></Button> : undefined} /></div>
  const draftKey = `${query.identity?.userId}:${report.organization.id}`
  const receiptDraftKey = `${draftKey}:${activity?.period?.start ?? ""}:${activity?.period?.end ?? ""}`
  const money = (value: string | null, currency: string) => value === null ? t.unavailable : `${formatSalesDecimal(value, locale)} ${currency}`
  return <div className="dashboard-landing-theme dark min-h-screen">
    <div className="dashboard-landing-content mx-auto max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] sm:px-6">
      <Card className={dashboardPanelClass}>
        <CardHeader><h1 className="text-2xl font-semibold">{t[view]}</h1><p className="text-sm text-[var(--dash-text-soft)]">{t.scope}</p></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 basis-full text-sm xl:flex-1"><p>{report.organization.name} · {t.current}</p><p>{t.checked}: {new Intl.DateTimeFormat(locale, { timeZone: report.organization.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(report.checkedAt))} · {report.organization.timezone}</p></div>
          <label className="grid w-full min-w-0 gap-1 text-sm sm:w-auto">{t.location}<select className={`${dashboardControlClass} w-full max-w-full sm:max-w-xs`} value={scope.locationId ?? ""} onChange={event => setScope({ view, locationId: event.target.value || undefined })}><option value="">{t.all}</option>{report.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <Button className="dashboard-button-primary" disabled={query.isFetching} onClick={() => { if ((scope.page ?? 1) > 1 || scope.revision) reset(); else void query.refetch() }}>{query.isFetching ? t.refreshing : t.refresh}</Button>
        </CardContent>
      </Card>
      <p role="status" className="text-sm text-[var(--dash-text-soft)]">{view === "receivables" ? t.posted : t.apProof}{report.coverage === "unverified" ? ` — ${t.incomplete}` : ""}</p>
      {view === "payables" && <p className="text-sm text-[var(--dash-text-soft)]">{t.allocation} {t.unassigned}: {report.unassignedDocumentCount}</p>}
      {report.coverage === "no-documents" && <p role="status">{t.noDocuments}</p>}

      {report.currencies.map(group => <section key={group.currency} aria-label={group.currency} className="space-y-3">
        <h2 className="font-semibold">{group.currency}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([
          [t.outstanding, group.outstanding], [t.overdue, group.overdue], [t.dueToday, group.due?.today ?? null], [t.due7, group.due?.next7 ?? null],
        ] as Array<[string, string | null]>).map(([label, value]) => <Card key={label} className={dashboardPanelClass}><CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent className="break-words text-xl font-semibold tabular-nums">{money(value, group.currency)}</CardContent></Card>)}</div>
        <Card className={dashboardPanelClass}><CardHeader><CardTitle className="text-base">{t.aging}</CardTitle></CardHeader><CardContent><dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{Object.entries(t.buckets).map(([bucket, label]) => <div key={bucket}><dt className="text-sm text-[var(--dash-text-soft)]">{label}</dt><dd className="tabular-nums">{money(group.aging?.[bucket as keyof typeof t.buckets] ?? null, group.currency)}</dd></div>)}</dl></CardContent></Card>
        <Card className={dashboardPanelClass}><CardHeader><CardTitle className="text-base">{locale === "fr" ? "Exposition du solde actuel" : "Current balance exposure"}</CardTitle><p className="text-sm">{locale === "fr" ? "Parts du solde dans cette devise et cet établissement, sur toutes les factures ouvertes. Les filtres de lignes ne changent pas le dénominateur. Les échéances inconnues restent dans le solde total." : "Shares of outstanding in this currency and location across all open invoices. Row filters do not change the denominator. Unknown due dates remain in total outstanding."}</p></CardHeader><CardContent><dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([
          [locale === "fr" ? "Part en retard" : "Overdue share", group.performance?.overdueShare],
          [locale === "fr" ? "Part du premier tiers" : "Largest counterparty share", group.performance?.largestCounterpartyShare],
          [locale === "fr" ? "Part des cinq premiers tiers" : "Top five counterparties share", group.performance?.topFiveShare],
        ]).map(([label, value]) => <div key={label}><dt className="text-sm">{label}</dt><dd className="tabular-nums">{value == null ? t.unavailable : `${formatSalesDecimal(value, locale)} %`}</dd></div>)}<div><dt className="text-sm">{locale === "fr" ? "À échéance de demain à 30 jours" : "Due tomorrow through 30 days"}</dt><dd>{money(group.due?.next30 ?? null, group.currency)}</dd></div></dl></CardContent></Card>
        {group.topCounterparties && <div><h3 className="font-medium">{locale === "fr" ? "Les 5 tiers aux soldes les plus élevés" : "Top 5 counterparties by outstanding balance"}</h3><ul className="flex flex-wrap gap-3">{group.topCounterparties.map(party => <li key={party.id}><Button variant="outline" className="h-auto min-h-10 whitespace-normal text-left" onClick={() => setScope({ view, locationId: scope.locationId, currency: group.currency, counterpartyId: party.id })}>{party.name} · {money(party.outstanding, group.currency)} ({party.count})</Button></li>)}</ul></div>}
      </section>)}
      <Card className={dashboardPanelClass}><CardHeader><h2 className="font-semibold">{t.invoices}</h2></CardHeader><CardContent className="min-w-0">
        <OpenItemsFilters scope={scope} report={report} locale={locale} onChange={setScope} search={searchDraft?.key === draftKey ? searchDraft.value : scope.search ?? ""} setSearch={value => setSearchDraft({ key: draftKey, value })}>
          <OpenItemsInvoiceTable report={report} scope={scope} locale={locale} pending={Boolean(query.isFetching)} onChange={setScope} canHistory={canHistory} permissions={permissions} period={activity?.period} />
        </OpenItemsFilters>
      </CardContent></Card>
      {view === "receivables" ? <ReceivablesCollectionsPanel key={draftKey} identity={query.identity} organizationId={report.organization.id} locationId={scope.locationId} timezone={report.organization.timezone} checkedAt={report.checkedAt} locale={locale} period={activity?.period} onPeriodChange={period => activity?.setPeriod(period)} draft={receiptDraft?.key === receiptDraftKey ? receiptDraft : undefined} onDraftChange={draft => setReceiptDraft({ ...draft, key: receiptDraftKey })} /> : <PayablesWorkflowPanel identity={query.identity} organizationId={report.organization.id} timezone={report.organization.timezone} locale={locale} />}
      {view === "payables" && query.identity && <PayablesPaymentActivity key={draftKey} identity={query.identity} timezone={report.organization.timezone} checkedAt={report.checkedAt} locale={locale} selectedPeriod={activity?.period} onPeriodChange={activity?.setPeriod} returnTo={openItemsHref(locale, scope, activity?.period)} />}
      <nav aria-label={t.history} className="flex flex-wrap gap-3"><>{canHistory && <Button asChild variant="outline"><Link href={history}>{t.history}</Link></Button>}</>{view === "payables" && hasRbacPermission(permissions, "purchasing.ap.invoice.view") && <Button asChild variant="outline"><Link href={`/${locale}/dashboard/purchases/payables`}>{t.workbench}</Link></Button>}</nav>
      <p className="text-xs text-[var(--dash-text-soft)]">{t.broader} {locale === "fr" ? "Les exports contrôlés sont disponibles dans l’historique avec les droits requis et une authentification récente. Leur périmètre est celui de l’historique, pas la page de factures visible." : "Controlled exports are available in history with the required permissions and fresh authentication. Their scope follows history, not the visible invoice page."}</p>
      {view === "payables" && <p className="text-sm">{locale === "fr" ? "Couverture de financement indisponible : les échéances ne sont pas comparées à un solde bancaire disponible vérifié, aux fonds restreints ou aux engagements. Aucune remise pour paiement anticipé n’est estimée." : "Funding coverage unavailable: due obligations are not compared with a verified available bank balance, restricted funds or commitments. No early-payment discount is estimated."}</p>}
    </div>
  </div>
}
