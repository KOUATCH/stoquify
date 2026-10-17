"use client"
import { useState } from "react"
import { useReceivablesCollections, type FinanceDashboardIdentity } from "@/hooks/finance/useFinanceDashboardSupplements"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { formatSalesDecimal } from "@/lib/analytics/sales-performance-scope"
import { dashboardControlClass, dashboardPanelClass } from "./finance-dashboard-theme"

const copy = {
  en: { title: "Receipts during a period", note: "Receipt activity includes cash sales and customer settlements, less processed refunds and reversals. It is not the reduction of the current open-invoice balance. This panel follows location only; invoice currency/search/queue filters do not apply.", start: "From", end: "Through", apply: "Apply period", receipts: "Receipts", refunds: "Processed refunds", reversals: "Settlement reversals", net: "Net receipts", loading: "Loading receipt evidence…", error: "Receipt evidence is unavailable. Invoice balances remain available.", restricted: "Payment-read permission is required for receipt activity.", retry: "Retry receipts", unknown: "Unavailable", missing: "Missing processing dates prevent a complete net-receipts total.", invalid: "Choose a valid start and end date, with the end on or after the start.", checked: "Checked", methods: "Receipt methods", method: { CASH: "Cash", CARD: "Card", MOBILE_MONEY: "Mobile money", BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque" } },
  fr: { title: "Encaissements sur une période", note: "L’activité comprend les ventes encaissées et règlements clients, moins les remboursements traités et contrepassations. Elle ne représente pas la diminution du solde actuel des factures ouvertes. Seul l’établissement s’applique ; les filtres de devise, recherche et file des factures ne s’appliquent pas.", start: "Du", end: "Au", apply: "Appliquer la période", receipts: "Encaissements", refunds: "Remboursements traités", reversals: "Contrepassations de règlements", net: "Encaissements nets", loading: "Chargement des justificatifs…", error: "Justificatifs d’encaissement indisponibles. Les soldes de factures restent disponibles.", restricted: "Une autorisation de lecture des paiements est nécessaire.", retry: "Réessayer les encaissements", unknown: "Indisponible", missing: "Des dates de traitement manquent ; le total net complet est indisponible.", invalid: "Choisissez des dates valides, avec une fin égale ou postérieure au début.", checked: "Vérifié le", methods: "Modes d’encaissement", method: { CASH: "Espèces", CARD: "Carte", MOBILE_MONEY: "Mobile money", BANK_TRANSFER: "Virement", CHEQUE: "Chèque" } },
}
export function ReceivablesCollectionsPanel({ organizationId, locationId, timezone, checkedAt, locale, period: selectedPeriod, onPeriodChange, identity, draft: savedDraft, onDraftChange }: { organizationId: string; locationId?: string; timezone: string; checkedAt: string; locale: "en" | "fr"; period?: { start: string; end: string }; onPeriodChange: (period: { start: string; end: string }) => void; identity: FinanceDashboardIdentity; draft?: { start: string; end: string }; onDraftChange: (draft: { start: string; end: string }) => void }) {
  const t = copy[locale]
  const [defaultPeriod] = useState(() => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(checkedAt))
    const part = (name: string) => parts.find(value => value.type === name)!.value
    return { start: `${part("year")}-${part("month")}-01`, end: `${part("year")}-${part("month")}-${part("day")}` }
  })
  const period = selectedPeriod ? { start: selectedPeriod.start, end: selectedPeriod.end } : defaultPeriod
  const draft = savedDraft ? { start: savedDraft.start, end: savedDraft.end } : period
  const [invalid, setInvalid] = useState(false)
  const query = useReceivablesCollections(organizationId, { ...period, locationId }, identity)
  const result = query.data, report = result?.state === "ready" ? result.report : undefined
  const money = (value: string | null) => value === null ? t.unknown : `${formatSalesDecimal(value, locale)} ${report!.currency}`
  return <Card className={dashboardPanelClass}><CardHeader><h2 className="font-semibold">{t.title}</h2><p className="text-sm">{t.note}</p></CardHeader><CardContent className="space-y-3">
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); const valid = !!draft.start && !!draft.end && draft.end >= draft.start; setInvalid(!valid); if (valid) onPeriodChange(draft) }}>
      <label className="grid gap-1 text-sm">{t.start}<input required type="date" className={dashboardControlClass} value={draft.start} onChange={event => onDraftChange({ ...draft, start: event.target.value })} /></label>
      <label className="grid gap-1 text-sm">{t.end}<input required type="date" className={dashboardControlClass} value={draft.end} onChange={event => onDraftChange({ ...draft, end: event.target.value })} /></label><Button type="submit">{t.apply}</Button>
    </form>
    {invalid && <p role="alert">{t.invalid}</p>}
    {query.isError ? <div role="alert"><p>{t.error}</p><Button variant="outline" onClick={() => void query.refetch()}>{t.retry}</Button></div> : !result ? <p role="status">{t.loading}</p> : result.state === "restricted" ? <p>{t.restricted}</p> : report && <>
      <p className="text-sm">{report.start} – {report.end} · {report.timezone} · {t.checked}: {new Intl.DateTimeFormat(locale, { timeZone: report.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(report.checkedAt))}</p>
      {report.missingTimes > 0 && <p role="status">{t.missing} ({report.missingTimes})</p>}
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([[t.receipts, report.receipts], [t.refunds, report.refunds], [t.reversals, report.reversals], [t.net, report.net]] as Array<[string, string | null]>).map(([label, value]) => <div key={label}><dt className="text-sm">{label}</dt><dd className="text-lg tabular-nums">{money(value)}</dd></div>)}</dl>
      <h3 className="font-medium">{t.methods}</h3><dl className="flex flex-wrap gap-4">{report.methods.map(method => <div key={method.method}><dt>{t.method[method.method as keyof typeof t.method] ?? method.method}</dt><dd className="tabular-nums">{money(method.amount)}</dd></div>)}</dl>
    </>}
  </CardContent></Card>
}
