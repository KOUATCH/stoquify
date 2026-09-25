"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { getPaymentSuspenseRecordsAction, type PaymentSuspenseRecords, type PaymentReconciliationDashboardData } from "@/actions/payments/reconciliation.actions"

export async function loadSuspenseRecords(scope: PaymentReconciliationDashboardData["scope"], input: { itemId?: string; cursor?: PaymentSuspenseRecords["nextCursor"] }) {
  const result = await getPaymentSuspenseRecordsAction(input)
  if (!result.success) throw Object.assign(new Error("Suspense records could not be loaded."), { code: result.code })
  if (result.data.scope.organizationId !== scope.organizationId || result.data.scope.actorId !== scope.actorId) throw new Error("Suspense record scope changed.")
  return result.data
}

export function PaymentSuspenseHistory({ scope, onInspect, formatDateTime, onClose }: {
  scope: PaymentReconciliationDashboardData["scope"]
  onInspect: (item: PaymentSuspenseRecords["items"][number], opener: HTMLButtonElement) => void
  formatDateTime: (value: string | null | undefined) => string
  onClose: () => void
}) {
  const t = useTranslations("paymentReconciliationWorkbench"), locale = useLocale()
  const [cursors, setCursors] = useState<Array<PaymentSuspenseRecords["nextCursor"]>>([null])
  const [result, setResult] = useState<PaymentSuspenseRecords | null>(null), [error, setError] = useState(false), [attempt, setAttempt] = useState(0)
  const cursor = cursors[cursors.length - 1]
  useEffect(() => {
    let active = true; setResult(null); setError(false)
    loadSuspenseRecords(scope, { cursor }).then(value => { if (active) setResult(value) }, () => { if (active) setError(true) })
    return () => { active = false }
  }, [scope, cursor, attempt]) // Scope changes unmount this view in its parent.
  return <section aria-label={t("suspenseWorkflow.history.title")} className="space-y-3 border-t border-[var(--dash-border-subtle)] pt-3">
    <h4 className="font-semibold">{t("suspenseWorkflow.history.title")}</h4>
    <p className="text-sm text-[var(--dash-text-soft)]">{t("suspenseWorkflow.history.description")}</p>
    <Button variant="outline" onClick={onClose}>{t("suspenseWorkflow.history.close")}</Button>
    {error ? <div role="alert"><p>{t("suspenseWorkflow.history.failed")}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>{t("suspenseWorkflow.history.retry")}</Button></div>
      : !result ? <p role="status">{t("suspenseWorkflow.history.loading")}</p>
      : <><p className="text-xs text-[var(--dash-text-soft)]">{t("suspenseWorkflow.history.asOf")} {formatDateTime(result.asOf)}</p>
        {!result.items.length && <p role="status">{t("suspenseWorkflow.history.empty")}</p>}
        <ul className="space-y-2">{result.items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--dash-border-subtle)] p-3">
          <div className="min-w-0"><p className="break-all text-xs">{item.id}</p><p>{new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.amount)} · {item.currencyCode}</p><p className="text-sm">{t(`suspenseWorkflow.states.${item.status}`)}</p></div>
          <Button variant="outline" onClick={event => onInspect(item, event.currentTarget)}>{t("suspenseWorkflow.history.inspect")}</Button>
        </li>)}</ul>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={cursors.length === 1} onClick={() => setCursors(value => value.slice(0, -1))}>{t("suspenseWorkflow.history.previous")}</Button><Button variant="outline" disabled={!result.nextCursor} onClick={() => setCursors(value => [...value, result.nextCursor])}>{t("suspenseWorkflow.history.next")}</Button></div>
      </>}
  </section>
}
