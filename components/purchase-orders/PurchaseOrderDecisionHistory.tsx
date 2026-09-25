"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { getPurchaseOrderDecisionHistory } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type History = NonNullable<Awaited<ReturnType<typeof getPurchaseOrderDecisionHistory>>["data"]>
export function PurchaseOrderDecisionHistory({ organizationId, actorId, orderId = "" }: { organizationId: string; actorId: string; orderId?: string }) {
  const t = useTranslations("purchaseOrderLifecycle"), locale = useLocale()
  const [lookup, setLookup] = useState(orderId), [history, setHistory] = useState<History | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("")
  const generation = useRef(0)
  const load = useCallback(async (reference: string) => {
    const current = ++generation.current; setBusy(true); setError(""); setHistory(null)
    try {
      const result = await getPurchaseOrderDecisionHistory(reference, organizationId)
      if (current !== generation.current) return
      if (!result.success || !result.data) { setError(t(result.code === "CONFLICT" ? "history.unverified" : ["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND"].includes(result.code ?? "") ? "denied" : "loadFailed")); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId) { setError(t("denied")); return }
      setHistory(result.data)
    } catch { if (current === generation.current) setError(t("loadFailed")) }
    finally { if (current === generation.current) setBusy(false) }
  }, [organizationId, actorId, t])
  const currentLoad = useRef(load); currentLoad.current = load
  useEffect(() => { ++generation.current; setLookup(orderId); setHistory(null); setError(""); setBusy(false); if (orderId) void currentLoad.current(orderId); return () => { ++generation.current } }, [organizationId, actorId, orderId])
  return <section aria-label={t("history.title")} className="min-w-0 space-y-4 [overflow-wrap:anywhere]">
    <p className="text-sm text-[var(--dash-text-soft)]">{t("history.scope")}</p>
    {!orderId && <form onSubmit={event => { event.preventDefault(); if (lookup.trim()) void load(lookup) }} className="space-y-2"><Label htmlFor="purchase-history-lookup">{t("history.lookup")}</Label><Input id="purchase-history-lookup" value={lookup} maxLength={191} onChange={event => setLookup(event.target.value)} /><Button className="dashboard-button-primary" disabled={busy || !lookup.trim()}>{t("history.find")}</Button></form>}
    {busy && <p role="status">{t("working")}</p>}{error && <div><p role="alert" className="text-[var(--dash-warning)]">{error}</p><Button className="dashboard-button-secondary mt-2" variant="outline" disabled={busy} onClick={() => void load(lookup)}>{t("history.retry")}</Button></div>}
    {history && <><h3 className="font-semibold">{history.orderNumber}</h3>{history.archived && <p>{t("history.archived")}</p>}{history.decisions.length === 0 ? <p>{t("history.empty")}</p> : <ol className="space-y-3">{history.decisions.map(record => <li key={record.requestReference} className="rounded-lg border border-[var(--dash-border-subtle)] p-3"><p className="font-medium">{t("title." + record.kind)}</p><time dateTime={record.recordedAt}>{new Date(record.recordedAt).toLocaleString(locale)}</time><p>{t("history.actor")}: {record.actorId}</p><p>{t("reference")}: {record.requestReference}</p>{record.reason && <p className="whitespace-pre-wrap">{record.reason}</p>}</li>)}</ol>}{history.hasEarlier && <p role="status">{t("history.earlier")}</p>}</>}
  </section>
}
