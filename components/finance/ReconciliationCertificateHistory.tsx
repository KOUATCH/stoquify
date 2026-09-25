"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { readReconciliationCertificateHistoryAction } from "@/actions/payments/reconciliation.actions"
import type { CertificateHistoryPage, CertificateHistoryQuery, CertificateHistoryRun } from "@/services/reconciliation/reconciliation-certificate-history.contracts"
import type { ReconciliationCertificateExportCommand } from "@/services/reconciliation/reconciliation-certificate-export.contracts"

export function ReconciliationCertificateHistory({ scope, canRead, canExport, onReview }: {
  scope: CertificateHistoryPage["scope"]; canRead: boolean; canExport: boolean
  onReview: (run: CertificateHistoryRun, request?: ReconciliationCertificateExportCommand) => void
}) {
  const t = useTranslations("paymentReconciliationWorkbench.certificateHistory"), locale = useLocale()
  const [open, setOpen] = useState(false), [search, setSearch] = useState("")
  const [page, setPage] = useState<CertificateHistoryPage | null>(null), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  const [query, setQuery] = useState<CertificateHistoryQuery>({ kind: "runs" }), [previous, setPrevious] = useState<CertificateHistoryQuery[]>([])
  const region = useRef<HTMLDivElement>(null), opener = useRef<HTMLButtonElement>(null), epoch = useRef(0), mounted = useRef(false), allowed = useRef(canRead)
  const retry = useRef<{ query: CertificateHistoryQuery; previous: CertificateHistoryQuery[] }>({ query: { kind: "runs" }, previous: [] })
  allowed.current = canRead
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { if (open && canRead) region.current?.focus() }, [open, canRead])
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  async function load(next: CertificateHistoryQuery, trail: CertificateHistoryQuery[] = []) {
    if (!allowed.current) return
    const ticket = ++epoch.current; retry.current = { query: next, previous: trail }; setBusy(true); setFailed(false)
    try {
      const result = await readReconciliationCertificateHistoryAction(next)
      if (!mounted.current || ticket !== epoch.current || !allowed.current) return
      if (!result.success || result.data.scope.organizationId !== scope.organizationId || result.data.scope.actorId !== scope.actorId || result.data.kind !== next.kind || (next.kind === "exports" && result.data.kind === "exports" && result.data.run.id !== next.runId)) throw new Error("History unavailable in current workspace")
      setPage(result.data); setQuery(next); setPrevious(trail)
    } catch { if (mounted.current && ticket === epoch.current && allowed.current) setFailed(true) }
    finally { if (mounted.current && ticket === epoch.current) setBusy(false) }
  }
  function close() { epoch.current++; setOpen(false); setBusy(false); requestAnimationFrame(() => opener.current?.focus()) }
  return <div className="min-w-0 space-y-3 [&_button]:h-auto [&_button]:min-h-10 [&_button]:max-w-full [&_button]:whitespace-normal">
    <Button ref={opener} variant="outline" disabled={!canRead} onClick={() => { setOpen(true); void load({ kind: "runs", search }) }}>{t("open")}</Button>
    {open && (!canRead ? <p role="status">{t("denied")}</p> : <div ref={region} role="region" aria-label={t("title")} tabIndex={-1} onKeyDown={event => { if (event.key === "Escape") close() }} className="min-w-0 space-y-3 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">
      <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{t("title")}</h4><Button variant="outline" onClick={close}>{t("close")}</Button></div>
      <p>{t("description")}</p>
      <form className="space-y-2" onSubmit={event => { event.preventDefault(); void load({ kind: "runs", search }) }}>
        <label htmlFor="certificate-history-search">{t("searchLabel")}</label><Input id="certificate-history-search" value={search} onChange={event => setSearch(event.target.value)} maxLength={100} className="dashboard-control" />
        <Button type="submit" variant="outline" disabled={busy}>{t("search")}</Button>
      </form>
      {busy && <p role="status">{t("loading")}</p>}
      {failed && <div role="alert"><p>{t("failed")}</p><Button variant="outline" disabled={busy} onClick={() => load(retry.current.query, retry.current.previous)}>{t("retry")}</Button></div>}
      {page && <>
        <p className="text-xs text-[var(--dash-text-soft)]">{t(failed || busy ? "previousResults" : "asOf", { time: date(page.asOf) })}</p>
        {page.kind === "runs" ? <>
          {!page.runs.length && <p>{t("emptyRuns")}</p>}
          <ul className="space-y-2">{page.runs.map(run => <li key={run.id} className="min-w-0 space-y-2 rounded-lg border border-[var(--dash-border)] p-3 [overflow-wrap:anywhere]">
            <p className="font-medium">{run.providerName} · {run.currencyCode}</p><p>{date(run.businessDate)}</p><p>{t("run", { id: run.id })}</p><p>{t(run.status === "SIGNED" ? "signed" : "changed")}</p>
            <Button variant="outline" disabled={busy} onClick={() => load({ kind: "exports", runId: run.id })}>{t("inspect")}</Button>
          </li>)}</ul>
        </> : <>
          <Button variant="outline" disabled={busy} onClick={() => load({ kind: "runs", search })}>{t("backToRuns")}</Button>
          <p className="font-medium [overflow-wrap:anywhere]">{page.run.providerName} · {t("run", { id: page.run.id })}</p>
          <p>{t(page.run.status === "SIGNED" ? "signed" : "changed")}</p>
          <Button variant="outline" disabled={busy || !canExport || page.run.status !== "SIGNED"} onClick={() => onReview(page.run)}>{t("newExport")}</Button>
          {!canExport && <p role="status">{t("exportDenied")}</p>}
          {!page.receipts.length && <p>{t("emptyExports")}</p>}
          <ul className="space-y-2">{page.receipts.map(receipt => <li key={receipt.id} className="min-w-0 space-y-2 rounded-lg border border-[var(--dash-border)] p-3 [overflow-wrap:anywhere]">
            <p>{t("receipt", { id: receipt.id })}</p><p>{date(receipt.createdAt)}</p><p>{t(receipt.state)}</p>
            {receipt.sha256 && <p className="text-xs">SHA-256: {receipt.sha256}</p>}
            {receipt.recoveryRequest ? <Button variant="outline" disabled={busy || !canExport} onClick={() => onReview(page.run, receipt.recoveryRequest!)}>{t("recover")}</Button> : receipt.state === "verified" && <p>{t("anotherActor")}</p>}
          </li>)}</ul>
        </>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy || !previous.length} onClick={() => load(previous[previous.length - 1], previous.slice(0, -1))}>{t("previous")}</Button>
          <Button variant="outline" disabled={busy || !page.nextCursor} onClick={() => load({ ...query, cursor: page.nextCursor }, [...previous, query])}>{t("next")}</Button>
          <Button variant="outline" disabled={busy} onClick={() => load(query, previous)}>{t("refresh")}</Button>
        </div>
      </>}
    </div>)}
  </div>
}
