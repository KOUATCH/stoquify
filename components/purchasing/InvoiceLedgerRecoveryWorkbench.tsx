"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, CheckCircle2, Clock, History, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { loadInvoiceLedgerRecovery, loadInvoiceLedgerRecoveryHistory, reviewInvoiceLedgerRecovery, submitInvoiceLedgerRecovery } from "@/actions/purchasing/invoice-ledger-recovery.actions"
import { invoiceLedgerRecoveryCommandSchema, invoiceLedgerRecoveryDraftSchema, type InvoiceLedgerRecoveryCommand, type InvoiceLedgerRecoveryDecision, type InvoiceLedgerRecoveryPreview } from "@/services/purchasing/invoice-ledger-recovery-contracts"

type Sources = Extract<Awaited<ReturnType<typeof loadInvoiceLedgerRecovery>>, { success: true }>["data"]
type HistoryData = Extract<Awaited<ReturnType<typeof loadInvoiceLedgerRecoveryHistory>>, { success: true }>["data"]
const denied = (code?: string) => ["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND", "TENANT_SCOPE_VIOLATION"].includes(code ?? "")
export const invoiceLedgerRecoveryStorageKey = (org: string, actor: string) => `stoquify:invoice-ledger-recovery:${JSON.stringify([org, actor])}`

export function InvoiceLedgerRecoveryWorkbench({ organizationId, actorId }: { organizationId: string; actorId: string }) {
  const t = useTranslations("invoiceLedgerRecovery"), locale = useLocale(), key = invoiceLedgerRecoveryStorageKey(organizationId, actorId)
  const [data, setData] = useState<Sources | null>(null), [history, setHistory] = useState<HistoryData | null>(null)
  const [search, setSearch] = useState(""), [selected, setSelected] = useState(""), [loading, setLoading] = useState(true), [historyLoading, setHistoryLoading] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [historyError, setHistoryError] = useState("")
  const [preview, setPreview] = useState<InvoiceLedgerRecoveryPreview | null>(null), [pending, setPending] = useState<InvoiceLedgerRecoveryCommand | null>(null), [decision, setDecision] = useState<InvoiceLedgerRecoveryDecision | null>(null)
  const [open, setOpen] = useState(false), [password, setPassword] = useState(""), [needsPassword, setNeedsPassword] = useState(false), [hydrated, setHydrated] = useState("")
  const generation = useRef(0), sourceRequest = useRef(0), historyRequest = useRef(0), inFlight = useRef(false), reviewButton = useRef<HTMLButtonElement>(null)
  const restoreReviewFocus = useRef(false)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const explain = (code?: string) => t(denied(code) ? "denied" : code === "FRESH_AUTH_REQUIRED" ? "freshRequired" : code === "SOD_VIOLATION" ? "independent" : code === "INVOICE_EVIDENCE_REQUIRED" ? "evidence" : code === "CONFLICT" ? "stale" : code === "IDEMPOTENCY_CONFLICT" ? "conflict" : code === "VALIDATION_ERROR" ? "invalid" : code === "BUSINESS_RULE_VIOLATION" ? "conditions" : "unknown")
  function clearPrivate() {
    try { sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft") } catch { /* Clear private memory even if storage is unavailable. */ }
    setData(null); setHistory(null); setSelected(""); setPending(null); setPreview(null); setDecision(null); setPassword(""); setHydrated("")
  }
  async function load(after?: string) {
    const current = generation.current, request = ++sourceRequest.current; setLoading(true); setError("")
    try {
      const result = await loadInvoiceLedgerRecovery({ search, after })
      if (current !== generation.current || request !== sourceRequest.current) return
      if (!result.success) { setError(explain(result.code)); setData(null); if (denied(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId) { clearPrivate(); setError(t("denied")); return }
      setData(previous => ({ ...result.data, invoices: after ? [...(previous?.invoices ?? []), ...result.data.invoices] : result.data.invoices }))
    } catch { if (current === generation.current && request === sourceRequest.current) { setData(null); setError(t("loadFailed")) } }
    finally { if (current === generation.current && request === sourceRequest.current) setLoading(false) }
  }
  async function loadHistory(invoiceId: string, before?: string) {
    const current = generation.current, request = ++historyRequest.current; setHistoryLoading(true); setHistoryError("")
    if (!before) setHistory(null)
    try {
      const result = await loadInvoiceLedgerRecoveryHistory({ invoiceId, before })
      if (current !== generation.current || request !== historyRequest.current) return
      if (!result.success) { setHistory(null); setHistoryError(explain(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId || result.data.invoiceId !== invoiceId) { clearPrivate(); setError(t("denied")); return }
      setHistory(previous => ({ ...result.data, records: before ? [...(previous?.records ?? []), ...result.data.records] : result.data.records }))
    } catch { if (current === generation.current && request === historyRequest.current) { setHistory(null); setHistoryError(t("loadFailed")) } }
    finally { if (current === generation.current && request === historyRequest.current) setHistoryLoading(false) }
  }
  const loadRef = useRef(load); loadRef.current = load
  const historyRef = useRef(loadHistory); historyRef.current = loadHistory
  useEffect(() => {
    if (!open && restoreReviewFocus.current && reviewButton.current && !reviewButton.current.disabled) {
      if (document.activeElement === document.body) reviewButton.current.focus()
      restoreReviewFocus.current = false
    }
  }, [open, loading, busy, pending])
  useEffect(() => {
    invalidate(); inFlight.current = false; restoreReviewFocus.current = false; setData(null); setHistory(null); setSelected(""); setPreview(null); setPending(null); setDecision(null); setPassword(""); setNeedsPassword(false); setOpen(false); setBusy(false); setError(""); setHistoryError("")
    let invoiceId = ""
    try {
      const draft = sessionStorage.getItem(key + ":draft"), parsed = draft && draft.length < 1000 ? invoiceLedgerRecoveryDraftSchema.safeParse(JSON.parse(draft)) : null
      if (parsed?.success) invoiceId = parsed.data.invoiceId
      const raw = sessionStorage.getItem(key), request = raw && raw.length < 2000 ? invoiceLedgerRecoveryCommandSchema.safeParse(JSON.parse(raw)) : null
      if (request?.success) { setPending(request.data); setOpen(true); invoiceId = request.data.invoiceId }
    } catch { setError(t("storage")) }
    setSelected(invoiceId); setHydrated(key); void loadRef.current(); if (invoiceId) void historyRef.current(invoiceId)
    return invalidate
  // Invalidate asynchronous responses and isolate drafts when the organization or actor changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, invalidate])
  useEffect(() => {
    if (hydrated !== key || pending) return
    try { if (selected) sessionStorage.setItem(key + ":draft", JSON.stringify({ invoiceId: selected })); else sessionStorage.removeItem(key + ":draft") } catch { setError(t("storage")) }
  }, [key, hydrated, selected, pending, t])
  function choose(invoiceId: string) { setSelected(invoiceId); setPreview(null); setDecision(null); setError(""); void loadHistory(invoiceId) }
  async function review() {
    if (!selected || inFlight.current || pending) return
    const current = generation.current; inFlight.current = true; setBusy(true); setError(""); setDecision(null)
    try {
      const result = await reviewInvoiceLedgerRecovery({ invoiceId: selected })
      if (current !== generation.current) return
      if (!result.success) { setError(explain(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId || result.data.invoiceId !== selected) { clearPrivate(); setError(t("denied")); return }
      setPreview(result.data); setNeedsPassword(result.data.requiresFreshAuth); setOpen(true)
    } catch { if (current === generation.current) setError(t("loadFailed")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  async function submit() {
    if (inFlight.current || (!pending && (!preview || preview.blockers.length))) return
    const current = generation.current, command = pending ?? { invoiceId: preview!.invoiceId, expectedRevision: preview!.revision, idempotencyKey: crypto.randomUUID() }
    try { sessionStorage.setItem(key, JSON.stringify(command)); setPending(command) } catch { setError(t("storage")); return }
    inFlight.current = true; setBusy(true); setError("")
    try {
      if (needsPassword) {
        const assurance = await stepUpWithPasswordAction({ password }); setPassword("")
        if (current !== generation.current) return
        if (!assurance.success) { setError(t("passwordFailed")); return }
        setNeedsPassword(false)
      }
      const result = await submitInvoiceLedgerRecovery(command)
      if (current !== generation.current) return
      if (!result.success) {
        setError(explain(result.code))
        if (denied(result.code)) clearPrivate()
        else if (result.code === "FRESH_AUTH_REQUIRED") setNeedsPassword(true)
        else if (["CONFLICT", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "SOD_VIOLATION"].includes(result.code)) { sessionStorage.removeItem(key); setPending(null); setPreview(null); setOpen(false) }
        return
      }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId || result.data.invoiceId !== command.invoiceId) { clearPrivate(); setError(t("denied")); return }
      if (result.data.requestReference !== command.idempotencyKey || result.data.reviewedRevision !== command.expectedRevision || (result.data.ledgerStatus === "POSTED" && (!result.data.journalEntryId || !result.data.accountingSourceLinkId))) { setError(t("unknown")); return }
      setDecision(result.data); setPreview(null); setPending(null); setNeedsPassword(false); setOpen(true)
      try { sessionStorage.removeItem(key) } catch { /* Exact replay remains safe if local removal fails. */ }
      void loadHistory(command.invoiceId)
      void load()
    } catch { if (current === generation.current) setError(t("unknown")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  const panel = "rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 sm:p-6", action = "h-auto min-h-10 whitespace-normal", locked = busy || !!pending
  const time = (value: string) => new Date(value).toLocaleString(locale)
  const date = (value: string) => new Date(value).toLocaleDateString(locale, { timeZone: "UTC" })
  const status = (value: string | null) => t(`statuses.${value ?? "UNVERIFIED"}`)
  return <main className="space-y-5 text-[var(--dash-text)]" aria-busy={busy}>
    <header className="space-y-2"><Link className="text-sm text-[var(--dash-brand)] underline" href={`/${locale}/dashboard/purchases/payables`}>{t("back")}</Link><h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1><p className="max-w-3xl text-[var(--dash-text-soft)]">{t("intro")}</p></header>
    {!open && error && <p role="alert" className={`${panel} border-[var(--dash-warning)]`}><AlertTriangle className="mr-2 inline h-5 w-5" aria-hidden="true" />{error}</p>}
    {pending && <section className={panel}><p role="status">{t("pending")}</p><Button className={`mt-3 ${action}`} onClick={() => setOpen(true)}>{t("retry")}</Button></section>}
    <section className={panel} aria-labelledby="recovery-invoices"><h2 id="recovery-invoices" className="text-lg font-semibold">{t("invoices")}</h2><p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t("invoiceHelp")}</p>
      <form className="my-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={event => { event.preventDefault(); void load() }}><div className="min-w-0 flex-1"><Label htmlFor="recovery-search">{t("search")}</Label><Input id="recovery-search" className="dashboard-control" value={search} maxLength={120} onChange={event => setSearch(event.target.value)} disabled={locked || loading} /></div><Button variant="outline" className={action} disabled={locked || loading}>{t("refresh")}</Button></form>
      {loading && <p role="status">{t("loading")}</p>}
      {!loading && data?.invoices.length === 0 && <p>{t("empty")}</p>}
      {data && <fieldset disabled={locked || loading} className="space-y-2"><legend className="sr-only">{t("select")}</legend>{data.invoices.map(invoice => <label key={invoice.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${selected === invoice.id ? 'border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]' : 'border-[var(--dash-border)]'}`}><input type="radio" name="recovery-invoice" className="mt-1 h-4 w-4 shrink-0 accent-[var(--dash-brand)]" value={invoice.id} checked={selected === invoice.id} onChange={() => choose(invoice.id)} /><span className="min-w-0 flex-1 break-words"><span className="font-medium">{invoice.invoiceNumber}</span><span className="block text-sm text-[var(--dash-text-soft)]">{invoice.supplierName}</span><span className="block">{invoice.total} {invoice.currency}</span><span className="block text-sm">{t("batch")}: {status(invoice.batchStatus)}</span></span></label>)}</fieldset>}
      <div className="mt-4 flex flex-wrap gap-3"><Button ref={reviewButton} className={`dashboard-button-primary ${action}`} onClick={() => void review()} disabled={locked || loading || !selected || !data}>{t("review")}</Button>{data?.next && <Button variant="outline" className={action} disabled={locked || loading} onClick={() => void load(data.next!)}>{t("more")}</Button>}</div>
      {data && <p className="mt-3 text-xs text-[var(--dash-text-soft)]">{t("checked")}: {time(data.checkedAt)}</p>}
    </section>
    {selected && <section className={panel} aria-labelledby="recovery-history"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="recovery-history" className="text-lg font-semibold"><History className="mr-2 inline h-5 w-5" aria-hidden="true" />{t("history")}</h2><Button variant="outline" className={action} disabled={historyLoading || busy} onClick={() => void loadHistory(selected)}>{t("refreshHistory")}</Button></div><p className="mt-2 text-sm text-[var(--dash-text-soft)]">{t("historyHelp")}</p>
      {historyLoading && <p role="status" className="mt-3">{t("loading")}</p>}{historyError && <p role="alert" className="mt-3">{historyError}</p>}
      {!historyLoading && history?.records.length === 0 && <p className="mt-3">{t("historyEmpty")}</p>}
      <ul className="mt-3 space-y-3">{history?.records.map(row => <li key={row.recordId} className="rounded-lg border border-[var(--dash-border)] p-3"><p className="text-sm">{time(row.recordedAt)}</p>{row.verified && row.decision ? <><p className="mt-1"><Clock className="mr-2 inline h-4 w-4" aria-hidden="true" />{t("recordedOutcome")}: {status(row.decision.ledgerStatus)}</p><p>{t("currentJournal")}: {status(row.observedJournalStatus)}</p><p className="mt-2 break-all text-xs">{t("request")}: {row.decision.requestReference}</p></> : <p className="mt-2 text-[var(--dash-warning)]"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true" />{t("historyUnverified")}</p>}</li>)}</ul>
      {history?.next && <Button variant="outline" className={`mt-3 ${action}`} disabled={historyLoading || busy} onClick={() => void loadHistory(selected, history.next!)}>{t("moreHistory")}</Button>}
    </section>}
    <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setPassword(""); if (!value && !pending) setPreview(null) } }}><DialogContent closeLabel={t("close")} closeDisabled={busy} onCloseAutoFocus={event => { event.preventDefault(); restoreReviewFocus.current = true; if (reviewButton.current && !reviewButton.current.disabled) { reviewButton.current.focus(); restoreReviewFocus.current = false } }} className="dashboard-landing-theme dark max-h-[90dvh] max-w-2xl overflow-y-auto text-[var(--dash-text)] motion-reduce:animate-none"><DialogHeader><DialogTitle>{t(decision ? "recorded" : pending ? "recoverTitle" : "reviewTitle")}</DialogTitle><DialogDescription>{t(decision ? "historyHelp" : "reviewHelp")}</DialogDescription></DialogHeader>
      {error && <p role="alert"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true" />{error}</p>}
      {preview && <div className="space-y-3"><p className="break-words text-lg font-medium">{preview.invoiceNumber} · {preview.supplierName}</p><p className="text-xl font-semibold">{preview.total} {preview.currency}</p><dl className="grid gap-3 text-sm sm:grid-cols-2">{[[t("invoiceDate"), date(preview.invoiceDate)], [t("approved"), time(preview.approvalAt)], [t("period"), preview.periodName], [t("rule"), preview.ruleCode], [t("journal"), preview.journalCode], [t("country"), preview.countryPackVersion]].map(([label, value]) => <div key={label}><dt className="text-[var(--dash-text-soft)]">{label}</dt><dd className="break-words">{value ?? t("missing")}</dd></div>)}</dl><p className="rounded-lg border border-[var(--dash-border)] p-3 text-sm"><ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden="true" />{t("preserved")}</p>{preview.blockers.length > 0 && <ul className="space-y-2" aria-label={t("conditions")}>{preview.blockers.map(blocker => <li key={blocker} className="text-[var(--dash-warning)]"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true" />{t(`blockers.${blocker}`)}</li>)}</ul>}</div>}
      {pending && <div className="space-y-2 text-sm"><p>{t("pending")}</p><p className="break-all">{t("request")}: {pending.idempotencyKey}</p></div>}
      {decision?.blockerCode === "AP_NON_STOCK_TREATMENT_REVIEW" && <p className="rounded-lg border border-[var(--dash-warning)] p-3 text-sm">{t("nonStockTreatmentHelp")}</p>}
      {decision && <div role="status" className="space-y-3"><p className={decision.ledgerStatus === "POSTED" ? "text-[var(--dash-success)]" : "text-[var(--dash-warning)]"}>{decision.ledgerStatus === "POSTED" ? <CheckCircle2 className="mr-2 inline h-5 w-5" aria-hidden="true" /> : <AlertTriangle className="mr-2 inline h-5 w-5" aria-hidden="true" />}{t(decision.ledgerStatus === "POSTED" ? "posted" : "stillBlocked")}</p><p>{decision.invoiceNumber}: {decision.total} {decision.currency}</p><p>{t("preserved")}</p><p className="text-sm">{t("recordedAt")}: {time(decision.recordedAt)}</p><p className="break-all text-xs">{t("request")}: {decision.requestReference}</p></div>}
      {!decision && needsPassword && <div><Label htmlFor="recovery-password">{t("password")}</Label><Input id="recovery-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /><p className="mt-1 text-xs text-[var(--dash-text-soft)]">{t("passwordHelp")}</p></div>}
      <div className="flex flex-wrap gap-3 border-t border-[var(--dash-border)] pt-3">{!decision && (pending || preview && !preview.blockers.length) && <Button className={`dashboard-button-primary ${action}`} onClick={() => void submit()} disabled={busy || needsPassword && !password}>{busy ? t("working") : t(pending ? "retry" : "confirm")}</Button>}<Button variant="outline" className={action} disabled={busy} onClick={() => { setOpen(false); setPassword(""); if (!pending) setPreview(null) }}>{t("close")}</Button></div>
    </DialogContent></Dialog>
  </main>
}
