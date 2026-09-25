"use client"
import { z } from "zod"
import type { InvoiceMatchExceptionPreview } from "@/services/purchasing/invoice-match-exception.service"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, CheckCircle2, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { loadInvoiceMatchException, loadInvoiceMatchExceptionHistory, reviewInvoiceMatchException, submitInvoiceMatchException } from "@/actions/purchasing/invoice-match-exception.actions"
import { invoiceMatchExceptionCommandSchema, invoiceMatchExceptionDraftSchema, type InvoiceMatchExceptionCommand, type InvoiceMatchExceptionDecision, type InvoiceMatchExceptionDraft } from "@/services/purchasing/invoice-match-exception-contracts"

type Sources = Extract<Awaited<ReturnType<typeof loadInvoiceMatchException>>, { success: true }>["data"]
type HistoryData = Extract<Awaited<ReturnType<typeof loadInvoiceMatchExceptionHistory>>, { success: true }>["data"]
const denied = (code?: string) => ["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND", "TENANT_SCOPE_VIOLATION"].includes(code ?? "")
export const invoiceMatchExceptionStorageKey = (org: string, actor: string, kind: string) => `stoquify:invoice-match-exception:${JSON.stringify([org, actor, kind])}`
const formSchema = z.object({ invoiceId: z.string().max(160), exceptionId: z.string().max(160), reason: z.string().max(500), evidenceReference: z.string().max(500), expiry: z.string().max(40), choice: z.enum(["APPROVE", "REJECT"]), decisionReason: z.string().max(500) }).strict()
const emptyForm = { invoiceId: "", exceptionId: "", reason: "", evidenceReference: "", expiry: "", choice: "APPROVE" as const, decisionReason: "" }

export function InvoiceMatchExceptionWorkbench({ organizationId, actorId, kind, canApproveInvoice = false }: { organizationId: string; actorId: string; kind: "request" | "review"; canApproveInvoice?: boolean }) {
  const t = useTranslations("invoiceMatchException"), locale = useLocale(), key = invoiceMatchExceptionStorageKey(organizationId, actorId, kind)
  const [form, setForm] = useState<z.infer<typeof formSchema>>(emptyForm), [reviewedDraft, setReviewedDraft] = useState<InvoiceMatchExceptionDraft | null>(null)
  const [data, setData] = useState<Sources | null>(null), [history, setHistory] = useState<HistoryData | null>(null)
  const [search, setSearch] = useState(""), [selected, setSelected] = useState(""), [loading, setLoading] = useState(true), [historyLoading, setHistoryLoading] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [historyError, setHistoryError] = useState("")
  const [preview, setPreview] = useState<InvoiceMatchExceptionPreview | null>(null), [pending, setPending] = useState<InvoiceMatchExceptionCommand | null>(null), [decision, setDecision] = useState<InvoiceMatchExceptionDecision | null>(null)
  const [open, setOpen] = useState(false), [password, setPassword] = useState(""), [needsPassword, setNeedsPassword] = useState(false), [hydrated, setHydrated] = useState("")
  const generation = useRef(0), sourceRequest = useRef(0), historyRequest = useRef(0), inFlight = useRef(false), reviewButton = useRef<HTMLButtonElement>(null)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const explain = (code?: string) => t(denied(code) ? "denied" : code === "FRESH_AUTH_REQUIRED" ? "freshRequired" : code === "SOD_VIOLATION" ? "independent" : code === "INVOICE_EVIDENCE_REQUIRED" ? "evidence" : code === "CONFLICT" ? "stale" : code === "IDEMPOTENCY_CONFLICT" ? "conflict" : code === "VALIDATION_ERROR" ? "invalid" : code === "BUSINESS_RULE_VIOLATION" ? "conditions" : "unknown")
  const readFailure = (code?: string) => ["INTERNAL_ERROR", "DATABASE_UNAVAILABLE", "DATABASE_CONFLICT", "CONCURRENCY_CONFLICT"].includes(code ?? "") ? t("loadFailed") : explain(code)
  function clearPrivate() {
    invalidate(); inFlight.current = false; setBusy(false); setLoading(false); setHistoryLoading(false); setOpen(false)
    try { sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft") } catch { /* Clear private memory even if storage is unavailable. */ }
    setData(null); setHistory(null); setSelected(""); setPending(null); setPreview(null); setDecision(null); setPassword(""); setHydrated(""); setForm(emptyForm); setReviewedDraft(null)
  }
  async function load(after?: string) {
    const current = generation.current, request = ++sourceRequest.current; setLoading(true); setError("")
    try {
      const result = await loadInvoiceMatchException({ kind, search, after })
      if (current !== generation.current || request !== sourceRequest.current) return
      if (!result.success) { setError(readFailure(result.code)); setData(null); if (denied(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId) { clearPrivate(); setError(t("denied")); return }
      setData(previous => ({ ...result.data, invoices: after ? [...(previous?.invoices ?? []), ...result.data.invoices] : result.data.invoices }))
    } catch { if (current === generation.current && request === sourceRequest.current) { setData(null); setError(t("loadFailed")) } }
    finally { if (current === generation.current && request === sourceRequest.current) setLoading(false) }
  }
  async function loadHistory(invoiceId: string, before?: string) {
    const current = generation.current, request = ++historyRequest.current; setHistoryLoading(true); setHistoryError("")
    if (!before) setHistory(null)
    try {
      const result = await loadInvoiceMatchExceptionHistory({ kind, invoiceId, before })
      if (current !== generation.current || request !== historyRequest.current) return
      if (!result.success) { setHistory(null); setHistoryError(readFailure(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId || result.data.invoiceId !== invoiceId) { clearPrivate(); setError(t("denied")); return }
      setHistory(previous => ({ ...result.data, records: before ? [...(previous?.records ?? []), ...result.data.records] : result.data.records }))
    } catch { if (current === generation.current && request === historyRequest.current) { setHistory(null); setHistoryError(t("loadFailed")) } }
    finally { if (current === generation.current && request === historyRequest.current) setHistoryLoading(false) }
  }
  const loadRef = useRef(load); loadRef.current = load
  const historyRef = useRef(loadHistory); historyRef.current = loadHistory
  useEffect(() => {
    invalidate(); inFlight.current = false; setData(null); setHistory(null); setSelected(""); setPreview(null); setPending(null); setDecision(null); setPassword(""); setNeedsPassword(false); setOpen(false); setBusy(false); setError(""); setHistoryError("")
    setForm(emptyForm); setReviewedDraft(null)
    let invoiceId = ""
    try {
      const draft = sessionStorage.getItem(key + ":draft"), parsed = draft && draft.length < 4000 ? formSchema.safeParse(JSON.parse(draft)) : null
      if (parsed?.success) { invoiceId = parsed.data.invoiceId; setForm(parsed.data) }
      const raw = sessionStorage.getItem(key), request = raw && raw.length < 5000 ? invoiceMatchExceptionCommandSchema.safeParse(JSON.parse(raw)) : null
      if (request?.success && request.data.draft.kind === kind) { setPending(request.data); setOpen(true); invoiceId = request.data.draft.invoiceId }
    } catch { setError(t("storage")) }
    setSelected(invoiceId); setHydrated(key); void loadRef.current(); if (invoiceId) void historyRef.current(invoiceId)
    return invalidate
  // Invalidate asynchronous responses and isolate drafts when the organization or actor changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, invalidate])
  useEffect(() => {
    if (hydrated !== key || pending) return
    try { if (selected) sessionStorage.setItem(key + ":draft", JSON.stringify({ ...form, invoiceId: selected })); else sessionStorage.removeItem(key + ":draft") } catch { setError(t("storage")) }
  }, [key, hydrated, selected, pending, form, t])
  function choose(invoiceId: string) { setForm(previous => ({ ...previous, invoiceId, exceptionId: "" })); setSelected(invoiceId); setPreview(null); setDecision(null); setError(""); void loadHistory(invoiceId) }
  async function review() {
    if (!selected || inFlight.current || pending) return
    const current = generation.current; inFlight.current = true; setBusy(true); setError(""); setDecision(null)
    try {
      const expiryDate = new Date(form.expiry)
      const parsed = invoiceMatchExceptionDraftSchema.safeParse(kind === "request" ? { kind, invoiceId: selected, reason: form.reason, evidenceReference: form.evidenceReference, expiresAt: Number.isNaN(expiryDate.getTime()) ? "" : expiryDate.toISOString() } : { kind, invoiceId: selected, exceptionId: form.exceptionId, decision: form.choice, ...(form.decisionReason ? { decisionReason: form.decisionReason } : {}) })
      if (!parsed.success) { setError(t("invalid")); return }
      const result = await reviewInvoiceMatchException(parsed.data)
      if (current !== generation.current) return
      if (!result.success) { setError(readFailure(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId || result.data.invoiceId !== selected) { clearPrivate(); setError(t("denied")); return }
      setReviewedDraft(parsed.data); setPreview(result.data); setNeedsPassword(result.data.requiresFreshAuth); setOpen(true)
    } catch { if (current === generation.current) setError(t("loadFailed")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  async function submit() {
    if (inFlight.current || (!pending && (!preview || !reviewedDraft || preview.blockers.length))) return
    const current = generation.current, command = pending ?? { draft: reviewedDraft!, expectedRevision: preview!.revision, idempotencyKey: crypto.randomUUID() }
    try { sessionStorage.setItem(key, JSON.stringify(command)); setPending(command) } catch { setError(t("storage")); return }
    inFlight.current = true; setBusy(true); setError("")
    try {
      if (needsPassword) {
        const assurance = await stepUpWithPasswordAction({ password }); setPassword("")
        if (current !== generation.current) return
        if (!assurance.success) { setError(t("passwordFailed")); return }
        setNeedsPassword(false)
      }
      const result = await submitInvoiceMatchException(command)
      if (current !== generation.current) return
      if (!result.success) {
        setError(explain(result.code))
        if (denied(result.code)) clearPrivate()
        else if (result.code === "FRESH_AUTH_REQUIRED") setNeedsPassword(true)
        else if (["CONFLICT", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "SOD_VIOLATION"].includes(result.code)) { sessionStorage.removeItem(key); setPending(null); setPreview(null); setOpen(false) }
        return
      }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId || result.data.invoiceId !== command.draft.invoiceId) { clearPrivate(); setError(t("denied")); return }
      if (result.data.requestReference !== command.idempotencyKey || result.data.reviewedRevision !== command.expectedRevision || (!result.data.sourceEventId || result.data.kind !== command.draft.kind || (command.draft.kind === "request" ? result.data.status !== "OPEN" : result.data.exceptionId !== command.draft.exceptionId || result.data.status !== (command.draft.decision === "APPROVE" ? "APPROVED" : "REJECTED")))) { setError(t("unknown")); return }
      setDecision(result.data); setPreview(null); setPending(null); setNeedsPassword(false); setOpen(true)
      try { sessionStorage.removeItem(key) } catch { /* Exact replay remains safe if local removal fails. */ }
      void loadHistory(command.draft.invoiceId)
      void load()
    } catch { if (current === generation.current) setError(t("unknown")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  const panel = "rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 sm:p-6", action = "h-auto min-h-10 whitespace-normal", locked = busy || !!pending
  const time = (value: string) => new Date(value).toLocaleString(locale), status = (value: string | null) => t(`statuses.${value ?? "UNVERIFIED"}`)
  const selectedInvoice = data?.invoices.find(invoice => invoice.id === selected)
  return <main className="space-y-5 text-[var(--dash-text)]" aria-busy={busy}>
    <header className="space-y-2"><Link className="text-sm text-[var(--dash-brand)] underline" href={`/${locale}/dashboard/purchases/payables`}>{t("back")}</Link><h1 className="text-2xl font-semibold sm:text-3xl">{t(kind === "request" ? "requestTitle" : "reviewTitle")}</h1><p className="max-w-3xl text-[var(--dash-text-soft)]">{t(kind === "request" ? "requestIntro" : "reviewIntro")}</p></header>
    {error && !open && <p role="alert" className={`${panel} border-[var(--dash-warning)]`}>{error}</p>}
    <section className={panel} aria-label={t("select")}><form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={event=>{event.preventDefault();void load()}}><div className="min-w-0 flex-1"><Label htmlFor="exception-search">{t("search")}</Label><Input id="exception-search" value={search} onChange={event=>setSearch(event.target.value)} maxLength={120} disabled={locked}/></div><Button type="submit" variant="outline" className={action} disabled={locked||loading}>{t("refresh")}</Button></form>
      {loading&&<p role="status">{t("loading")}</p>}{!loading&&data?.invoices.length===0&&<p>{t("empty")}</p>}
      {data&&<fieldset disabled={locked||loading||open} className="space-y-2"><legend className="sr-only">{t("select")}</legend>{data.invoices.map(invoice=><label key={invoice.id} className={`flex items-start gap-3 rounded-lg border p-3 ${selected===invoice.id?'border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]':'border-[var(--dash-border)]'}`}><input type="radio" name="exception-invoice" value={invoice.id} checked={selected===invoice.id} onChange={()=>choose(invoice.id)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--dash-brand)]"/><span className="min-w-0 break-words"><span className="font-medium">{invoice.invoiceNumber}</span><span className="block">{invoice.total} {invoice.currency}</span>{invoice.archivedSource&&<span className="block text-sm text-[var(--dash-warning)]">{t("archivedSource")}</span>}{kind==='review'&&invoice.independentReviewerRequired&&<span className="block text-sm text-[var(--dash-warning)]">{t("independent")}</span>}</span></label>)}</fieldset>}
      {selected&&<fieldset className="mt-4 grid gap-4" disabled={locked||open}><legend className="sr-only">{t("details")}</legend>{kind==='request'?<><div><Label htmlFor="exception-reason">{t("reason")}</Label><Input id="exception-reason" value={form.reason} maxLength={500} onChange={event=>setForm({...form,reason:event.target.value})}/></div><div><Label htmlFor="exception-evidence">{t("evidenceReference")}</Label><Input id="exception-evidence" value={form.evidenceReference} maxLength={500} onChange={event=>setForm({...form,evidenceReference:event.target.value})}/><p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t("evidenceHelp")}</p></div><div><Label htmlFor="exception-expiry">{t("expires")}</Label><Input id="exception-expiry" type="datetime-local" value={form.expiry} onChange={event=>setForm({...form,expiry:event.target.value})}/><p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t("expiryHelp")} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</p></div></>:<><div><Label htmlFor="exception-record">{t("exception")}</Label><select id="exception-record" value={form.exceptionId} onChange={event=>setForm({...form,exceptionId:event.target.value})} className="mt-1 w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 text-[var(--dash-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]"><option value="">{t("chooseException")}</option>{selectedInvoice?.exceptions.map(row=><option key={row.id} value={row.id}>{status(row.status)} · {row.reason} · {time(row.expiresAt)}</option>)}</select>{!selectedInvoice?.exceptions.length&&<p className="mt-2">{t("noRequests")}</p>}</div><div><Label htmlFor="exception-choice">{t("decision")}</Label><select id="exception-choice" value={form.choice} onChange={event=>setForm({...form,choice:event.target.value as "APPROVE"|"REJECT"})} className="mt-1 w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]"><option value="APPROVE">{t("approve")}</option><option value="REJECT">{t("reject")}</option></select></div><div><Label htmlFor="exception-decision-reason">{t("decisionReason")}</Label><Input id="exception-decision-reason" value={form.decisionReason} maxLength={500} onChange={event=>setForm({...form,decisionReason:event.target.value})}/></div></>}</fieldset>}
      <div className="mt-4 flex flex-wrap gap-3"><Button ref={reviewButton} className={`dashboard-button-primary ${action}`} onClick={()=>void review()} disabled={locked||loading||!selected||!data||kind==='review'&&(!form.exceptionId||selectedInvoice?.independentReviewerRequired)}>{t("review")}</Button>{data?.next&&<Button variant="outline" className={action} disabled={locked||loading} onClick={()=>void load(data.next!)}>{t("more")}</Button>}</div>{data&&<p className="mt-3 text-xs text-[var(--dash-text-soft)]">{t("checked")}: {time(data.checkedAt)}</p>}
    </section>
    {selected&&<section className={panel} aria-labelledby="exception-history"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="exception-history" className="text-lg font-semibold"><History className="mr-2 inline h-5 w-5" aria-hidden="true"/>{t("history")}</h2><Button variant="outline" className={action} disabled={historyLoading||busy} onClick={()=>void loadHistory(selected)}>{t("refreshHistory")}</Button></div><p className="mt-2 text-sm">{t("historyHelp")}</p>{historyLoading&&<p role="status">{t("loading")}</p>}{historyError&&<p role="alert">{historyError}</p>}{!historyLoading&&history?.records.length===0&&<p className="mt-3">{t("historyEmpty")}</p>}<ul className="mt-3 space-y-3">{history?.records.map(row=><li key={row.recordId} className="rounded-lg border border-[var(--dash-border)] p-3"><p>{time(row.recordedAt)}</p>{row.verified&&row.decision?<><p>{t("recordedOutcome")}: {status(row.decision.status)}</p><p>{t("currentStatus")}: {status(row.observedStatus)}</p>{row.decision.sourceVerification==='UNVERIFIED'&&<p className="text-[var(--dash-warning)]">{t("refusedUnverified")}</p>}<p className="break-all text-xs">{t("request")}: {row.decision.requestReference}</p></>:<p className="text-[var(--dash-warning)]">{t("historyUnverified")}</p>}</li>)}</ul>{history?.next&&<Button variant="outline" className={`mt-3 ${action}`} disabled={historyLoading||busy} onClick={()=>void loadHistory(selected,history.next!)}>{t("moreHistory")}</Button>}</section>}
    <Dialog open={open} onOpenChange={value=>{if(!busy){setOpen(value);setPassword("");if(!value&&!pending)setPreview(null)}}}><DialogContent closeLabel={t("close")} closeDisabled={busy} onCloseAutoFocus={event=>{if(reviewButton.current&&!reviewButton.current.disabled){event.preventDefault();reviewButton.current.focus()}}} className="dashboard-landing-theme dark max-h-[90dvh] max-w-2xl overflow-y-auto text-[var(--dash-text)] motion-reduce:animate-none"><DialogHeader><DialogTitle>{t(decision?"recorded":pending?"recoverTitle":"previewTitle")}</DialogTitle><DialogDescription>{t("reviewEffect")}</DialogDescription></DialogHeader>
      {error&&<p role="alert"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true"/>{error}</p>}
      {preview&&<div className="space-y-3">{!!preview.previousRequests?.length&&<section aria-label={t("previousRequests")} className="space-y-2 rounded-lg border border-[var(--dash-border)] p-3"><h3 className="font-semibold">{t("previousRequests")}</h3><p>{t("replacementHelp")}</p><ul className="space-y-2">{preview.previousRequests.map(row=><li key={row.id} className="break-words"><p>{status(row.status)} · {row.reason}</p><p className="text-sm">{t("expires")}: {time(row.expiresAt)}</p></li>)}</ul></section>}{reviewedDraft?.kind==='review'&&reviewedDraft.decision==='REJECT'&&!preview.sourceVerified&&<p role="alert" className="text-[var(--dash-warning)]"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true"/>{t("refusalWarning")}</p>}<p className="break-words text-lg font-medium">{preview.invoiceNumber} · {preview.supplierName}</p><p>{preview.total} {preview.currency}</p><p>{t("variance")}: {preview.variance??t("missing")} {preview.currency}</p><p className="break-words">{t("reason")}: {preview.reason}</p><p>{t("expires")}: {time(preview.expiresAt)}</p><p className="break-all">{t("evidenceReference")}: {/^(https?):\/\//i.test(preview.evidenceReference)?<a className="text-[var(--dash-brand)] underline" href={preview.evidenceReference} target="_blank" rel="noopener noreferrer">{preview.evidenceReference}</a>:preview.evidenceReference}</p>{reviewedDraft?.kind==='review'&&<p>{t("decision")}: {t(reviewedDraft.decision==='APPROVE'?'approve':'reject')} {reviewedDraft.decisionReason}</p>}<ul className="space-y-2" aria-label={t("lines")}>{preview.lines.map(line=><li key={line.id} className="rounded-lg border border-[var(--dash-border)] p-3"><p className="break-words">{line.description}</p><p>{line.quantity} × {line.unitCost} {preview.currency} · {line.total} {preview.currency}</p></li>)}</ul>{preview.blockers.map(blocker=><p key={blocker} className="text-[var(--dash-warning)]"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true"/>{t(`blockers.${blocker}`)}</p>)}</div>}
      {pending&&<div className="space-y-2 text-sm"><p>{t("pending")}</p><p className="break-all">{t("request")}: {pending.idempotencyKey}</p></div>}
      {decision&&<div role="status" className="space-y-3"><p className={decision.status==='APPROVED'?'text-[var(--dash-success)]':'text-[var(--dash-text)]'}><CheckCircle2 className="mr-2 inline h-5 w-5" aria-hidden="true"/>{t(`outcomes.${decision.status}`)}</p><p>{decision.invoiceNumber} · {decision.variance} {decision.currency}</p><p>{t("decisionEffect")}</p>{decision.sourceVerification==='UNVERIFIED'&&<p className="text-[var(--dash-warning)]">{t("refusedUnverified")}</p>}{decision.status==='APPROVED'&&canApproveInvoice&&<Link className="block text-[var(--dash-brand)] underline" href={`/${locale}/dashboard/purchases/payables/approve`}>{t("openApproval")}</Link>}<p>{t("recordedAt")}: {time(decision.recordedAt)}</p><p className="break-all text-xs">{t("request")}: {decision.requestReference}</p></div>}
      {!decision&&needsPassword&&<div><Label htmlFor="exception-password">{t("password")}</Label><Input id="exception-password" type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} disabled={busy}/><p className="mt-1 text-xs">{t("passwordHelp")}</p></div>}
      <div className="flex flex-wrap gap-3 border-t border-[var(--dash-border)] pt-3">{!decision&&(pending||preview&&!preview.blockers.length)&&<Button className={`dashboard-button-primary ${action}`} onClick={()=>void submit()} disabled={busy||needsPassword&&!password}>{busy?t("working"):t(pending?"retry":"confirm")}</Button>}<Button variant="outline" className={action} disabled={busy} onClick={()=>{setOpen(false);setPassword("");if(!pending)setPreview(null)}}>{t("close")}</Button></div>
    </DialogContent></Dialog>
  </main>
}
