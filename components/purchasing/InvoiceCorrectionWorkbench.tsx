"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { loadInvoiceCorrection, loadInvoiceCorrectionDetail, loadInvoiceCorrectionHistory, reviewInvoiceCorrection, submitInvoiceCorrection } from "@/actions/purchasing/invoice-correction.actions"
import { invoiceCorrectionCommandSchema, invoiceCorrectionDraftSchema, type InvoiceCorrectionCommand } from "@/services/purchasing/invoice-correction-contracts"

type Success<T> = Extract<T, { success: true }> extends { data: infer D } ? D : never
type Sources = Success<Awaited<ReturnType<typeof loadInvoiceCorrection>>>
type Detail = Success<Awaited<ReturnType<typeof loadInvoiceCorrectionDetail>>>
type History = Success<Awaited<ReturnType<typeof loadInvoiceCorrectionHistory>>>
type Preview = Success<Awaited<ReturnType<typeof reviewInvoiceCorrection>>>
type Decision = Success<Awaited<ReturnType<typeof submitInvoiceCorrection>>>
const text = z.string().max(1200)
export const invoiceCorrectionFormSchema = z.object({ invoiceId: text, reason: text, preparation: z.object({ supplierId: text, invoiceNumber: text, currency: text, invoiceDate: text, dueDate: text, documentReference: text, documentSha256: text, notes: text, lines: z.array(z.object({ goodsReceiptLineId: text, description: text, quantity: text, unitCost: text, taxRate: text }).strict()).max(100) }).strict() }).strict()
type Form = z.infer<typeof invoiceCorrectionFormSchema>
export const invoiceCorrectionStorageKey = (org: string, actor: string) => `stoquify:invoice-correction:${JSON.stringify([org, actor])}`
const denied = (code?: string) => ["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND", "TENANT_SCOPE_VIOLATION"].includes(code ?? "")

export function InvoiceCorrectionWorkbench({ organizationId, actorId }: { organizationId: string; actorId: string }) {
  const t = useTranslations("invoiceCorrection"), p = useTranslations("invoicePreparation"), locale = useLocale(), key = invoiceCorrectionStorageKey(organizationId, actorId)
  const [selected, setSelected] = useState("")
  const [data, setData] = useState<Sources | null>(null), [detail, setDetail] = useState<Detail | null>(null), [form, setForm] = useState<Form | null>(null), [history, setHistory] = useState<History | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null), [pending, setPending] = useState<InvoiceCorrectionCommand | null>(null), [decision, setDecision] = useState<Decision | null>(null)
  const [error, setError] = useState(""), [historyError, setHistoryError] = useState(""), [search, setSearch] = useState(""), [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false), [historyLoading, setHistoryLoading] = useState(false), [needsPassword, setNeedsPassword] = useState(false), [open, setOpen] = useState(false), [hydrated, setHydrated] = useState("")
  const generation = useRef(0), sourceRequest = useRef(0), detailRequest = useRef(0), historyRequest = useRef(0), inFlight = useRef(false), reviewButton = useRef<HTMLButtonElement>(null)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const explain = (code?: string) => t(denied(code) ? "denied" : code === "CONFLICT" ? "stale" : code === "FRESH_AUTH_REQUIRED" ? "fresh" : code === "SOD_VIOLATION" ? "makerOnly" : code === "IDEMPOTENCY_CONFLICT" ? "conflict" : code === "VALIDATION_ERROR" ? "invalid" : ["BUSINESS_RULE_VIOLATION", "INVOICE_EVIDENCE_REQUIRED"].includes(code ?? "") ? "unavailable" : "unknown")
  function clearPrivate() {
    invalidate(); inFlight.current = false; setBusy(false); setLoading(false); setDetailLoading(false); setHistoryLoading(false)
    setSelected(""); setData(null); setDetail(null); setForm(null); setHistory(null); setPreview(null); setPending(null); setDecision(null); setPassword(""); setOpen(false); setHydrated("")
    try { sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft"); sessionStorage.removeItem(key + ":selected") } catch { /* Private memory is already cleared. */ }
  }
  function identity(value: { organizationId: string; actorId: string }) { return value.organizationId === organizationId && value.actorId === actorId }
  async function load(after?: string) {
    const current = generation.current, request = ++sourceRequest.current; setLoading(true)
    try {
      const result = await loadInvoiceCorrection({ search, after })
      if (current !== generation.current || request !== sourceRequest.current) return
      if (!result.success) { setData(null); setError(explain(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (!identity(result.data)) { clearPrivate(); setError(t("denied")); return }
      setData(old => ({ ...result.data, invoices: after ? [...(old?.invoices ?? []), ...result.data.invoices] : result.data.invoices }))
    } catch { if (current === generation.current) { setData(null); setError(t("loadFailed")) } }
    finally { if (current === generation.current && request === sourceRequest.current) setLoading(false) }
  }
  async function loadHistory(invoiceId: string, before?: string) {
    const current = generation.current, request = ++historyRequest.current; setHistoryLoading(true); setHistoryError(""); if (!before) setHistory(null)
    try {
      const result = await loadInvoiceCorrectionHistory({ invoiceId, before })
      if (current !== generation.current || request !== historyRequest.current) return
      if (!result.success) { setHistory(null); setHistoryError(explain(result.code)); if (denied(result.code)) { clearPrivate(); setError(explain(result.code)) } return }
      if (!identity(result.data) || result.data.invoiceId !== invoiceId) { clearPrivate(); setError(t("denied")); return }
      setHistory(old => ({ ...result.data, records: before ? [...(old?.records ?? []), ...result.data.records] : result.data.records }))
    } catch { if (current === generation.current && request === historyRequest.current) { setHistory(null); setHistoryError(t("loadFailed")) } }
    finally { if (current === generation.current && request === historyRequest.current) setHistoryLoading(false) }
  }
  async function loadDetail(invoiceId: string, preserve = false, receiptAfter?: string) {
    const current = generation.current, request = ++detailRequest.current; setDetailLoading(true); if (!receiptAfter) setDetail(null)
    try {
      const result = await loadInvoiceCorrectionDetail({ invoiceId, receiptAfter })
      if (current !== generation.current || request !== detailRequest.current) return
      if (!result.success) { setDetail(null); setError(explain(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (!identity(result.data) || result.data.invoiceId !== invoiceId) { clearPrivate(); setError(t("denied")); return }
      setDetail(old => ({ ...result.data, receipts: receiptAfter ? [...(old?.receipts ?? []), ...result.data.receipts] : result.data.receipts }))
      if (!preserve) setForm({ invoiceId, reason: "", preparation: result.data.preparation })
    } catch { if (current === generation.current && request === detailRequest.current) { setDetail(null); setError(t("loadFailed")) } }
    finally { if (current === generation.current && request === detailRequest.current) setDetailLoading(false) }
  }
  const loadRef = useRef(load); loadRef.current = load
  const detailRef = useRef(loadDetail); detailRef.current = loadDetail
  const historyRef = useRef(loadHistory); historyRef.current = loadHistory
  useEffect(() => {
    invalidate(); inFlight.current = false; setData(null); setDetail(null); setForm(null); setHistory(null); setPreview(null); setPending(null); setDecision(null); setError(""); setPassword(""); setBusy(false); setOpen(false)
    let invoiceId = "", recovering = false, hasDraft = false
    try {
      const selection = sessionStorage.getItem(key + ":selected"); if (selection && selection.length <= 191) invoiceId = selection
      const raw = sessionStorage.getItem(key + ":draft"), saved = raw && raw.length < 200000 ? invoiceCorrectionFormSchema.safeParse(JSON.parse(raw)) : null
      if (saved?.success) { setForm(saved.data); invoiceId = saved.data.invoiceId; hasDraft = true }
      const value = sessionStorage.getItem(key), request = value && value.length < 200000 ? invoiceCorrectionCommandSchema.safeParse(JSON.parse(value)) : null
      if (request?.success) { setPending(request.data); setOpen(true); setNeedsPassword(true); invoiceId = request.data.draft.invoiceId; recovering = true }
    } catch { setError(t("storage")) }
    setSelected(invoiceId); setHydrated(key); void loadRef.current(); if (invoiceId) { if (!recovering && hasDraft) void detailRef.current(invoiceId, true); void historyRef.current(invoiceId) }
    return invalidate
  // Organization and actor changes invalidate requests and isolate local drafts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, invalidate])
  useEffect(() => {
    if (hydrated !== key || pending || decision) return
    try { if (form) sessionStorage.setItem(key + ":draft", JSON.stringify(form)); else sessionStorage.removeItem(key + ":draft") } catch { setError(t("storage")) }
  }, [form, hydrated, key, pending, decision, t])
  useEffect(() => { if (hydrated !== key) return; try { if (selected) sessionStorage.setItem(key + ":selected", selected); else sessionStorage.removeItem(key + ":selected") } catch { setError(t("storage")) } }, [selected, hydrated, key, t])
  function change(field: keyof Form["preparation"], value: string | Form["preparation"]["lines"]) { setForm(old => old ? { ...old, preparation: { ...old.preparation, [field]: value } } : old); setPreview(null) }
  async function chooseFile(file?: File) {
    if (!file || inFlight.current) return
    if (file.size > 20 * 1024 * 1024) { setError(t("invalid")); return }
    const current = generation.current; setBusy(true); inFlight.current = true
    try { const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); if (current === generation.current) change("documentSha256", Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2,"0")).join("")) }
    catch { if (current === generation.current) setError(t("fileFailed")) }
    finally { if (current === generation.current) { setBusy(false); inFlight.current = false } }
  }
  async function review() {
    if (inFlight.current || !form || pending) return
    const parsed = invoiceCorrectionDraftSchema.safeParse({ ...form, preparation: { ...form.preparation, dueDate: form.preparation.dueDate || undefined, notes: form.preparation.notes || undefined } })
    if (!parsed.success) { setError(t("invalid")); return }
    const current = generation.current; inFlight.current = true; setBusy(true); setError(""); setDecision(null)
    try {
      const result = await reviewInvoiceCorrection(parsed.data)
      if (current !== generation.current) return
      if (!result.success) { setError(explain(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (!identity(result.data) || result.data.invoiceId !== form.invoiceId) { clearPrivate(); setError(t("denied")); return }
      setPreview(result.data); setOpen(true); setNeedsPassword(result.data.requiresFreshAuth)
    } catch { if (current === generation.current) setError(t("loadFailed")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  async function submit() {
    if (inFlight.current || !pending && !preview) return
    const current = generation.current, command = pending ?? { draft: preview!.draft, expectedRevision: preview!.revision, idempotencyKey: crypto.randomUUID() }
    try { sessionStorage.setItem(key, JSON.stringify(command)); setPending(command) } catch { setError(t("storage")); return }
    inFlight.current = true; setBusy(true); setError("")
    try {
      if (needsPassword) { const assurance = await stepUpWithPasswordAction({ password }); setPassword(""); if (current !== generation.current) return; if (!assurance.success) { setError(t("passwordFailed")); return } setNeedsPassword(false) }
      const result = await submitInvoiceCorrection(command)
      if (current !== generation.current) return
      if (!result.success) {
        setError(explain(result.code)); if (denied(result.code)) clearPrivate()
        else if (result.code === "FRESH_AUTH_REQUIRED") setNeedsPassword(true)
        else if (["CONFLICT", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "SOD_VIOLATION", "INVOICE_EVIDENCE_REQUIRED"].includes(result.code)) { sessionStorage.removeItem(key); setPending(null); setPreview(null); setOpen(false) }
        return
      }
      if (!identity(result.data) || result.data.invoiceId !== command.draft.invoiceId) { clearPrivate(); setError(t("denied")); return }
      if (result.data.requestReference !== command.idempotencyKey || result.data.reviewedRevision !== command.expectedRevision || !result.data.sourceEventId) { setError(t("unknown")); return }
      setDecision(result.data); setPending(null); setPreview(null); setOpen(true)
      try { sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft") } catch { /* Retained exact replay remains safe. */ }
      void loadHistory(command.draft.invoiceId); void load()
    } catch { if (current === generation.current) setError(t("unknown")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  const panel = "rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 sm:p-6", button = "h-auto min-h-10 whitespace-normal", locked = busy || !!pending || open, values = form?.preparation
  const time = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC"
  const invoiceId = pending?.draft.invoiceId ?? selected
  return <main className="min-w-0 space-y-5 text-[var(--dash-text)]" aria-busy={busy}>
    <header className="space-y-2"><Link className="text-sm underline" href={`/${locale}/dashboard/purchases/payables`}>{p("back")}</Link><h1 className="text-2xl font-semibold">{t("title")}</h1><p className="max-w-3xl text-[var(--dash-text-soft)]">{t("intro")}</p></header>
    {error && !open && <p role="alert" className={panel}>{error}</p>}
    {pending && <section className={panel}><p>{t("unknown")}</p><Button className={button} disabled={busy} onClick={() => setOpen(true)}>{t("recover")}</Button></section>}
    {decision && <section role="status" className={panel}><p>{t("recorded")}: {decision.invoiceNumber} · {decision.total} {decision.currency}</p><p>{t(decision.isCurrentPreparation ? "current" : "historical")}</p><p>{t("observed")}: {t(`statuses.${decision.observedInvoiceStatus}`)}</p><p>{t("effect")}</p>{["DRAFT","MATCHED","DISPUTED"].includes(decision.observedInvoiceStatus) && <Button variant="outline" className={`mt-3 ${button}`} disabled={busy || detailLoading} onClick={() => { const id = decision.invoiceId; setDecision(null); setForm(null); void loadDetail(id); void loadHistory(id) }}>{t("editCurrent")}</Button>}</section>}
    <section className={panel}><form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void load() }}><div className="min-w-0 flex-1"><Label htmlFor="correction-search">{t("search")}</Label><Input id="correction-search" maxLength={120} value={search} disabled={locked} onChange={e => setSearch(e.target.value)} /></div><Button className={button} variant="outline" disabled={locked || loading}>{p("find")}</Button></form>
      {loading && <p role="status">{p("loading")}</p>}{!loading && data?.invoices.length === 0 && <p className="mt-3">{t("empty")}</p>}
      <fieldset disabled={locked || loading || detailLoading} className="mt-3 space-y-2"><legend className="sr-only">{t("select")}</legend>{data?.invoices.map(row => <label key={row.id} className={`flex items-start gap-3 rounded-lg border p-3 ${invoiceId === row.id ? 'border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]' : 'border-[var(--dash-border)]'}`}><input className="mt-1 h-4 w-4 shrink-0 accent-[var(--dash-brand)]" type="radio" name="correction-invoice" checked={invoiceId === row.id} onChange={() => { setSelected(row.id); setDecision(null); setPreview(null); setForm(null); setDetail(null); setError(""); if (row.canCorrect) void loadDetail(row.id); void loadHistory(row.id) }} /><span className="min-w-0 break-words">{row.invoiceNumber} · {row.total} {row.currency}{!row.canCorrect && <span className="block text-sm">{t("historyOnly")}</span>}</span></label>)}</fieldset>
      {data?.next && <Button className={`mt-3 ${button}`} variant="outline" disabled={locked || loading} onClick={() => void load(data.next!)}>{t("more")}</Button>}
    </section>
    {detailLoading && <p role="status">{p("loading")}</p>}
    {form && values && !decision && <section className={panel}><h2 className="text-lg font-semibold">{t("details")}</h2><p className="mt-2">{detail?.supplierName} · {values.invoiceNumber} · {values.currency}</p><p className="my-2 text-sm">{t("fixed")}</p>{detail && !detail.previousEvidenceVerified && <p className="text-[var(--dash-warning)]">{t("unverified")}</p>}{detail?.activeException && <p role="alert" className="text-[var(--dash-warning)]">{t("activeException")}</p>}
      <fieldset disabled={locked || detailLoading} className="mt-4 space-y-4"><div><Label htmlFor="correction-reason">{t("reason")}</Label><Textarea id="correction-reason" maxLength={1000} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2">{([['invoiceDate','date','date'],['dueDate','due','date'],['documentReference','reference','url']] as const).map(([field,label,type]) => <div key={field} className={field === 'documentReference' ? 'sm:col-span-2' : ''}><Label htmlFor={`correction-${field}`}>{p(label)}</Label><Input id={`correction-${field}`} type={type} value={values[field]} onChange={e => change(field,e.target.value)} maxLength={1000} /></div>)}</div>
      <div><Label htmlFor="correction-file">{p("file")}</Label><Input id="correction-file" type="file" onChange={e => void chooseFile(e.target.files?.[0])} aria-describedby="correction-file-help" /><p id="correction-file-help" className="mt-2 text-sm">{p("fileHelp")}</p><p className="break-all text-xs">{p("hash")}: {values.documentSha256 || t("missing")}</p></div>
      <div><h3 className="font-semibold">{p("receipts")}</h3><p className="text-sm">{t("receiptHelp")}</p>{detail?.receipts.map(row => <label key={row.id} className="mt-2 flex items-start gap-3 rounded-lg border border-[var(--dash-border)] p-3"><input className="mt-1 h-4 w-4 shrink-0 accent-[var(--dash-brand)]" type="checkbox" checked={values.lines.some(line => line.goodsReceiptLineId === row.id)} disabled={Number(row.available) <= 0 && !values.lines.some(line => line.goodsReceiptLineId === row.id)} onChange={e => change("lines",e.target.checked ? [...values.lines,{goodsReceiptLineId:row.id,description:locale === 'fr' ? row.descriptionFr : row.description,quantity:"",unitCost:row.unitCost,taxRate:"0"}] : values.lines.filter(line => line.goodsReceiptLineId !== row.id))} /><span className="min-w-0 break-words">{row.receiptNumber} · {row.orderNumber}<br />{locale === 'fr' ? row.descriptionFr : row.description}<br />{p("available")}: {row.available}</span></label>)}{detail?.receiptNext && <Button variant="outline" className={`mt-3 ${button}`} onClick={() => void loadDetail(form.invoiceId,true,detail.receiptNext!)}>{p("moreReceipts")}</Button>}</div>
      {values.lines.map((line,index) => <div key={`${line.goodsReceiptLineId}-${index}`} className="rounded-lg border border-[var(--dash-border)] p-3"><h3 className="mb-2 font-semibold">{p("line")} {index+1}</h3><div className="grid gap-3 sm:grid-cols-2">{(['description','quantity','unitCost','taxRate'] as const).map(field => <div key={field}><Label htmlFor={`correction-line-${index}-${field}`}>{p(field === 'unitCost' ? 'cost' : field)}</Label><Input id={`correction-line-${index}-${field}`} value={line[field]} maxLength={field === 'description' ? 240 : 20} inputMode={field === 'description' ? 'text' : 'decimal'} onChange={e => change('lines',values.lines.map((old,i) => i === index ? {...old,[field]:field === 'description' ? e.target.value : e.target.value.replace(',','.')} : old))} /></div>)}</div><Button variant="ghost" className={`mt-2 ${button}`} onClick={() => change('lines',values.lines.filter((_,i) => i !== index))}>{p("remove")}</Button></div>)}
      <div><Label htmlFor="correction-notes">{p("notes")}</Label><Textarea id="correction-notes" value={values.notes} maxLength={1000} onChange={e => change('notes',e.target.value)} /></div></fieldset>
      <div className="mt-4 flex flex-wrap gap-3"><Button ref={reviewButton} className={`dashboard-button-primary ${button}`} onClick={() => void review()} disabled={locked || detailLoading || !detail || detail.activeException}>{t("review")}</Button><Button variant="outline" className={button} disabled={locked || detailLoading} onClick={() => void loadDetail(form.invoiceId,true)}>{t("refreshSources")}</Button></div>{detail && <p className="mt-2 text-xs">{p("sourceTime")}: {time(detail.checkedAt)}</p>}
    </section>}
    {invoiceId && <section className={panel}><h2 className="text-lg font-semibold">{t("history")}</h2><p className="mt-2 text-sm">{t("historyHelp")}</p><Button className={`my-3 ${button}`} variant="outline" disabled={busy || historyLoading} onClick={() => void loadHistory(invoiceId)}>{t("refreshHistory")}</Button>{historyLoading && <p role="status">{p("loading")}</p>}{historyError && <p role="alert">{historyError}</p>}{!historyLoading && history?.records.length === 0 && <p>{t("historyEmpty")}</p>}<ul className="space-y-3">{history?.records.map(row => <li key={row.recordId} className="rounded-lg border border-[var(--dash-border)] p-3"><p>{time(row.recordedAt)}</p>{row.verified && row.result ? <><p>{row.result.total} {row.result.currency} · {typeof row.reason === 'string' ? row.reason : ''}</p><p>{t(row.isCurrentPreparation ? "current" : "historical")}</p><p>{t("observed")}: {t(`statuses.${row.observedInvoiceStatus}`)}</p><p className="break-all text-xs">{p("request")}: {row.result.requestReference}</p></> : <p className="text-[var(--dash-warning)]">{t("historyUnverified")}</p>}</li>)}</ul>{history?.next && <Button className={`mt-3 ${button}`} variant="outline" disabled={historyLoading || busy} onClick={() => void loadHistory(invoiceId,history.next!)}>{t("more")}</Button>}</section>}
    <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setPassword(""); if (!value && !pending) setPreview(null) } }}><DialogContent closeLabel={t("close")} closeDisabled={busy} onCloseAutoFocus={event => { if (reviewButton.current && !reviewButton.current.disabled) { event.preventDefault(); reviewButton.current.focus() } }} className="dashboard-landing-theme dark max-h-[90dvh] max-w-2xl overflow-y-auto text-[var(--dash-text)] motion-reduce:animate-none"><DialogHeader><DialogTitle>{t(decision ? "recorded" : pending ? "recover" : "review")}</DialogTitle><DialogDescription>{t("effect")}</DialogDescription></DialogHeader>
      {error && <p role="alert">{error}</p>}
      {preview && <div className="space-y-3"><p>{preview.supplierName} · {preview.invoiceNumber}</p><p>{t("reason")}: {preview.draft.reason}</p><div className="grid gap-4 sm:grid-cols-2">{(['before','after'] as const).map(side => { const prior = side === 'before'; return <section key={side} className="min-w-0 rounded-lg border border-[var(--dash-border)] p-3"><h3 className="font-semibold">{t(side)}</h3><p>{prior ? preview.previousTotal : preview.total} {preview.currency}</p><p>{p("date")}: {prior ? preview.before.invoiceDate : preview.draft.preparation.invoiceDate}</p><p>{p("due")}: {(prior ? preview.before.dueDate : preview.draft.preparation.dueDate) || t("missing")}</p><p className="break-words">{p("notes")}: {(prior ? preview.before.notes : preview.draft.preparation.notes) || t("missing")}</p><p className="break-all text-xs">{p("reference")}: {(prior ? preview.before.documentReference : preview.draft.preparation.documentReference) || t("missing")}</p><p className="break-all text-xs">{p("hash")}: {(prior ? preview.before.documentSha256 : preview.draft.preparation.documentSha256) || t("missing")}</p><ul className="mt-3 space-y-2">{(prior ? preview.before.lines : preview.draft.preparation.lines).map((line,index) => <li key={index} className="break-words text-sm">{line.description}: {line.quantity} × {line.unitCost} · {p("taxRate")}: {line.taxRate}</li>)}</ul></section> })}</div>{!preview.previousEvidenceVerified && <p className="text-[var(--dash-warning)]">{t("unverified")}</p>}{preview.requiresNewException && <p className="text-[var(--dash-warning)]">{t("newException")}: {preview.variance} {preview.currency}</p>}{preview.countrySetupRequired && <p className="text-[var(--dash-warning)]">{t("countrySetup")}</p>}{preview.expiredRequests.length > 0 && <p>{t("expiryEffect",{count:preview.expiredRequests.length})}</p>}</div>}
      {pending && <p className="break-all text-xs">{p("request")}: {pending.idempotencyKey}</p>}
      {decision && <div role="status"><p>{decision.invoiceNumber}: {decision.total} {decision.currency}</p><p>{t(decision.isCurrentPreparation ? "current" : "historical")}</p><p>{t("observed")}: {t(`statuses.${decision.observedInvoiceStatus}`)}</p><p>{p("recorded")}: {time(decision.recordedAt)}</p></div>}
      {!decision && needsPassword && <div><Label htmlFor="correction-password">{t("password")}</Label><Input id="correction-password" type="password" autoComplete="current-password" value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /><p className="mt-1 text-sm">{t("passwordHelp")}</p></div>}
      <div className="flex flex-wrap gap-3 border-t border-[var(--dash-border)] pt-3">{!decision && (pending || preview) && <Button className={`dashboard-button-primary ${button}`} onClick={() => void submit()} disabled={busy || needsPassword && !password}>{busy ? t("working") : t(pending ? "retry" : "confirm")}</Button>}<Button variant="outline" className={button} disabled={busy} onClick={() => { setOpen(false); setPassword(""); if (!pending) setPreview(null) }}>{t("close")}</Button></div>
    </DialogContent></Dialog>
  </main>
}
