"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { getAPHistoryAction } from "@/actions/purchasing/ap-history.actions"
import type { FinanceDashboardIdentity } from "@/hooks/finance/useFinanceDashboardSupplements"
import { canOpenItemsHistory } from "@/lib/finance/open-items-navigation"
import { formatSalesDecimal } from "@/lib/analytics/sales-performance-scope"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { dashboardControlClass, dashboardPanelClass } from "./finance-dashboard-theme"

export function PayablesPaymentActivity({ identity, timezone, checkedAt, locale, returnTo, selectedPeriod, onPeriodChange }: { identity: FinanceDashboardIdentity; timezone: string; checkedAt: string; locale: "en" | "fr"; returnTo: string; selectedPeriod?: { start: string; end: string }; onPeriodChange?: (period: { start: string; end: string }) => void }) {
  const fr = locale === "fr"
  const [defaultPeriod, setDefaultPeriod] = useState(() => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(checkedAt))
    const part = (name: string) => parts.find(p => p.type === name)!.value
    return { start: `${part("year")}-${part("month")}-01`, end: `${part("year")}-${part("month")}-${part("day")}` }
  })
  const period = selectedPeriod ?? defaultPeriod
  const periodKey = `${period.start}:${period.end}`
  const [savedDraft, setDraft] = useState<{ key: string; start: string; end: string }>()
  const draft = savedDraft?.key === periodKey ? savedDraft : period
  useEffect(() => { setDraft(undefined) }, [periodKey])
  const enabled = identity.enabled && canOpenItemsHistory("payables", identity.permissionKey.split("|"))
  const query = useQuery({
    queryKey: ["payables-payment-activity", identity.userId, identity.organizationId, identity.permissionKey, period], enabled,
    queryFn: async () => {
      const result = await getAPHistoryAction({ filters: { lane: "payment", dateFrom: period.start, dateTo: period.end, pageSize: 25 } })
      if (!result.success) throw new Error(result.error)
      if (result.data.scope.organizationId !== identity.organizationId || result.data.scope.actorUserId !== identity.userId) throw new Error("History workspace changed")
      return result.data
    }, staleTime: 0, gcTime: 0, retry: false,
  })
  const report = enabled && !query.isError ? query.data : undefined
  const href = `/${locale}/dashboard/purchases/payables/history?${new URLSearchParams({ lane: "payment", dateFrom: period.start, dateTo: period.end, returnTo })}`
  return <Card className={dashboardPanelClass}><CardHeader><h2 className="font-semibold">{fr ? "Paiements fournisseurs sur une période" : "Supplier payments during a period"}</h2><p className="text-sm">{fr ? "Montants libérés selon les dates de paiement et les preuves opérationnelles de l’historique, sur toute l’organisation. Ils ne prouvent ni une sortie bancaire rapprochée ni une diminution du solde actuel. Les filtres de factures ne s’appliquent pas ; devises séparées, sans comparaison historique." : "Released amounts by payment date and history’s operational evidence, across the organization. They do not establish reconciled bank outflow or reduction of the current balance. Invoice filters do not apply; currencies stay separate, with no historical comparison."}</p></CardHeader><CardContent className="space-y-3">
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (draft.start && draft.end && draft.start <= draft.end) { const next = { start: draft.start, end: draft.end }; if (onPeriodChange) onPeriodChange(next); else setDefaultPeriod(next) } }}>
      <label className="grid gap-1 text-sm">{fr ? "Du" : "From"}<input required type="date" className={dashboardControlClass} value={draft.start} max={draft.end} onChange={event => setDraft({ ...draft, key: periodKey, start: event.target.value })} /></label>
      <label className="grid gap-1 text-sm">{fr ? "Au" : "Through"}<input required type="date" className={dashboardControlClass} min={draft.start} value={draft.end} onChange={event => setDraft({ ...draft, key: periodKey, end: event.target.value })} /></label><Button>{fr ? "Appliquer la période" : "Apply period"}</Button>
    </form>
    <p className="text-sm">{period.start} – {period.end} · {timezone} · {fr ? "La période en cours peut être incomplète." : "The current period may be incomplete."}</p>
    {!enabled ? <p>{fr ? "Lecture de l’historique fournisseurs requise." : "AP history read permission required."}</p> : query.isError ? <div role="alert"><p>{fr ? "Justificatifs de paiements indisponibles." : "Payment evidence unavailable."}</p><Button onClick={() => void query.refetch()}>{fr ? "Réessayer" : "Retry payments"}</Button></div> : !report ? <p role="status">{fr ? "Chargement…" : "Loading payment evidence…"}</p> : <>
      <p className="text-sm">{fr ? "Vérifié le" : "Checked"}: {new Intl.DateTimeFormat(locale, { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(report.snapshot.generatedAt))}</p>
      {report.summary.currencyTotals.length === 0 ? <p>{fr ? "Aucun paiement dans cette période." : "No payments in this period."}</p> : <dl className="flex flex-wrap gap-6">{report.summary.currencyTotals.map(group => <div key={group.currency}><dt>{fr ? "Paiements libérés enregistrés" : "Recorded released payments"} · {group.currency}</dt><dd className="tabular-nums">{group.releasedPaymentTotal === null ? fr ? "Indisponible — preuves non vérifiées" : "Unavailable — unverified evidence" : `${formatSalesDecimal(group.releasedPaymentTotal, locale)} ${group.currency}`}</dd></div>)}</dl>}
      <Link href={href} className="underline focus-visible:outline">{fr ? "Examiner les paiements et les exports contrôlés" : "Review payments and controlled exports"}</Link>
    </>}
  </CardContent></Card>
}
