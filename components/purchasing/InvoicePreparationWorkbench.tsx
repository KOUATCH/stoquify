"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { z } from "zod"
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { loadInvoicePreparation, reviewInvoicePreparation, submitInvoicePreparation } from "@/actions/purchasing/invoice-preparation.actions"
import { invoicePreparationDraftSchema, invoicePreparationCommandSchema, type InvoicePreparationCommand, type InvoicePreparationOutcome, type InvoicePreparationPreview, type InvoicePreparationSources, type InvoicePreparationQuery } from "@/services/purchasing/invoice-preparation-contracts"

const text = z.string().max(1200)
const formSchema = z.object({ supplierId: text, invoiceNumber: text, invoiceDate: text, dueDate: text, currency: text, documentReference: text, documentSha256: text, notes: text, lines: z.array(z.object({ goodsReceiptLineId: text, description: text, quantity: text, unitCost: text, taxRate: text }).strict()).max(100) }).strict()
type Form = z.infer<typeof formSchema>
const empty = (): Form => ({ supplierId: "", invoiceNumber: "", invoiceDate: "", dueDate: "", currency: "", documentReference: "", documentSha256: "", notes: "", lines: [] })
const denied = (code?: string) => ["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND", "TENANT_SCOPE_VIOLATION"].includes(code ?? "")
export const invoicePreparationStorageKey = (org: string, actor: string) => `stoquify:invoice-preparation:${JSON.stringify([org, actor])}`

export function InvoicePreparationWorkbench({ organizationId, actorId }: { organizationId: string; actorId: string }) {
  const t = useTranslations("invoicePreparation"), locale = useLocale(), key = invoicePreparationStorageKey(organizationId, actorId)
  const [form, setForm] = useState<Form>(empty), [data, setData] = useState<InvoicePreparationSources | null>(null), [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("")
  const [preview, setPreview] = useState<InvoicePreparationPreview | null>(null), [pending, setPending] = useState<InvoicePreparationCommand | null>(null), [decision, setDecision] = useState<InvoicePreparationOutcome | null>(null), [open, setOpen] = useState(false), [hydrated, setHydrated] = useState("")
  const generation = useRef(0), inFlight = useRef(false), sourceRequest = useRef(0), reviewButton = useRef<HTMLButtonElement>(null), newButton = useRef<HTMLButtonElement>(null)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const explain = (code?: string) => t(denied(code) ? "denied" : code === "INVOICE_EVIDENCE_REQUIRED" ? "evidence" : code === "CONFLICT" ? "stale" : code === "IDEMPOTENCY_CONFLICT" ? "conflict" : code === "VALIDATION_ERROR" ? "invalid" : code === "BUSINESS_RULE_VIOLATION" ? "unavailable" : "unknown")
  function clearPrivate() {
    invalidate(); inFlight.current = false; setBusy(false); setLoading(false); setOpen(false)
    try { sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft") } catch { /* Always clear in-memory private state. */ }
    setData(null); setForm(empty()); setPending(null); setPreview(null); setDecision(null); setHydrated("")
  }
  async function load(query: InvoicePreparationQuery = {}) {
    const current = generation.current, request = ++sourceRequest.current; setLoading(true)
    try {
      const result = await loadInvoicePreparation(query)
      if (current !== generation.current || request !== sourceRequest.current) return
      if (!result.success) { setData(null); setError(explain(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId) { clearPrivate(); setError(t("denied")); return }
      setData(previous => ({ ...result.data, suppliers: query.supplierAfter ? [...(previous?.suppliers ?? []), ...result.data.suppliers] : result.data.suppliers, receipts: query.receiptAfter ? [...(previous?.receipts ?? []), ...result.data.receipts] : result.data.receipts }))
      setForm(previous => ({ ...previous, currency: previous.currency || result.data.currency }))
    } catch { if (current === generation.current && request === sourceRequest.current) { setData(null); setError(t("loadFailed")) } }
    finally { if (current === generation.current && request === sourceRequest.current) setLoading(false) }
  }
  const loadRef = useRef(load); loadRef.current = load
  useEffect(() => {
    invalidate(); inFlight.current = false; setForm(empty()); setData(null); setPending(null); setPreview(null); setDecision(null); setError(""); setBusy(false); setOpen(false)
    let supplierId = "", recovering = false
    try {
      const saved = sessionStorage.getItem(key + ":draft"), parsed = saved && saved.length <= 200000 ? formSchema.safeParse(JSON.parse(saved)) : null
      if (parsed?.success) { setForm(parsed.data); supplierId = parsed.data.supplierId }
      const raw = sessionStorage.getItem(key), request = raw && raw.length <= 200000 ? invoicePreparationCommandSchema.safeParse(JSON.parse(raw)) : null
      if (request?.success) { setPending(request.data); setOpen(true); recovering = true; supplierId = request.data.draft.supplierId }
    } catch { setError(t("storage")) }
    setHydrated(key); if (recovering) setLoading(false); else void loadRef.current({ supplierId: supplierId || undefined })
    return invalidate
  // Identity changes invalidate old responses and isolate retained drafts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, invalidate])
  useEffect(() => {
    if (hydrated !== key || pending || decision) return
    try { sessionStorage.setItem(key + ":draft", JSON.stringify(form)) } catch { setError(t("storage")) }
  }, [form, key, hydrated, pending, decision, t])
  function change<K extends keyof Form>(field: K, value: Form[K]) { setForm(previous => ({ ...previous, [field]: value })); setPreview(null) }
  async function chooseFile(file?: File) {
    if (!file) return
    const current = generation.current
    if (file.size > 20 * 1024 * 1024) { setError(t("invalid")); return }
    setBusy(true)
    try { const value = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); if (current === generation.current) change("documentSha256", Array.from(new Uint8Array(value), b => b.toString(16).padStart(2, "0")).join("")) }
    catch { if (current === generation.current) setError(t("chooseFile")) }
    finally { if (current === generation.current) setBusy(false) }
  }
  async function review() {
    if (inFlight.current || busy || pending) return
    const value = invoicePreparationDraftSchema.safeParse({ ...form, dueDate: form.dueDate || undefined, notes: form.notes || undefined })
    if (!value.success) { setError(t("invalid")); return }
    const current = generation.current; inFlight.current = true; setBusy(true); setError("")
    try {
      const result = await reviewInvoicePreparation(value.data)
      if (current !== generation.current) return
      if (!result.success) { setError(explain(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId) { clearPrivate(); setError(t("denied")); return }
      setPreview(result.data); setOpen(true)
    } catch { if (current === generation.current) setError(t("loadFailed")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  async function submit() {
    if (inFlight.current || busy || (!preview && !pending)) return
    const current = generation.current
    const command = pending ?? { draft: preview!.draft, expectedRevision: preview!.revision, idempotencyKey: crypto.randomUUID() }
    try { sessionStorage.setItem(key, JSON.stringify(command)); setPending(command) } catch { setError(t("storage")); return }
    inFlight.current = true; setBusy(true); setError("")
    try {
      const result = await submitInvoicePreparation(command)
      if (current !== generation.current) return
      if (!result.success) {
        setError(explain(result.code))
        if (denied(result.code)) clearPrivate()
        else if (["CONFLICT", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION"].includes(result.code)) { sessionStorage.removeItem(key); setPending(null); setPreview(null); setOpen(false) }
        return
      }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId) { clearPrivate(); setError(t("denied")); return }
      if (result.data.requestReference !== command.idempotencyKey || result.data.reviewedRevision !== command.expectedRevision || !result.data.sourceEventId || !["CURRENT", "SUPERSEDED", "UNVERIFIED"].includes(result.data.currentPreparationState)) { setError(t("unknown")); return }
      setDecision(result.data); setPending(null); setPreview(null); setOpen(true)
      try { sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft") } catch { /* Exact server replay remains safe if local removal fails. */ }
    } catch { if (current === generation.current) setError(t("unknown")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  const locked = busy || open || !!pending || !!decision, inputClass = "w-full min-w-0", card = "rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 sm:p-6"
  const formatTime = (value: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) + " UTC"
  const observation = decision && <section aria-label={t("currentObservation")} className="space-y-2 rounded-lg border border-[var(--dash-border)] p-3"><h3 className="font-semibold">{t("currentObservation")}</h3><p className={decision.currentPreparationState === "UNVERIFIED" ? "text-[var(--dash-warning)]" : ""}>{t(`preparationStates.${decision.currentPreparationState}`)}</p><p>{t("observedStatus")}: {t(`invoiceStates.${decision.observedInvoiceStatus}`)}</p><p>{t("observedTotal")}: {decision.observedTotal} {decision.currency}</p>{decision.archived && <p>{t("archivedObservation")}</p>}<p className="text-xs">{t("sourceTime")}: {formatTime(decision.observedAt)}</p></section>
  return <main className="min-w-0 space-y-5 text-[var(--dash-text)]">
    <Link href={`/${locale}/dashboard/purchases/payables`} className="text-sm underline">{t("back")}</Link>
    <header><h1 className="text-2xl font-semibold">{t("title")}</h1><p className="mt-2 max-w-3xl text-[var(--dash-text-soft)]">{t("intro")}</p></header>
    {error && <div role="alert" className={card}><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true" />{error}</div>}
    {pending && <section className={card} aria-live="polite"><p>{t("unknown")}</p><p className="break-all text-sm">{t("request")}: {pending.idempotencyKey}</p><Button onClick={() => { setOpen(true); void submit() }} disabled={busy} className="mt-3">{t("retry")}</Button></section>}
    {decision && <section className={card} aria-live="polite"><h2 className="font-semibold"><CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden="true" />{t("prepared")}</h2><p>{decision.invoiceNumber} — {decision.total} {decision.currency}</p><p>{t("recordedState")}: {t(decision.preparationStatus === "MATCHED" ? "recordedMatched" : "recordedDisputed")}</p>{observation}<p>{t("noPosting")}</p><Link className="underline" href={`/${locale}/dashboard/purchases/payables/history`}>{t("history")}</Link><Button ref={newButton} className="mt-3 block" onClick={() => { setForm(empty()); setDecision(null); setOpen(false); void load({}) }}>{t("new")}</Button></section>}
    {!decision && <>
      <section className={card}><h2 className="mb-3 text-lg font-semibold">{t("document")}</h2><fieldset disabled={locked} className="space-y-4">
        <div className="flex flex-wrap items-end gap-2"><div className="min-w-0 flex-1"><Label htmlFor="invoice-supplier-search">{t("search")}</Label><Input id="invoice-supplier-search" value={search} onChange={e => setSearch(e.target.value)} maxLength={120} /></div><Button variant="secondary" onClick={() => void load({ supplierSearch: search, supplierId: form.supplierId || undefined })} disabled={loading}>{t("find")}</Button></div>
        <div><Label htmlFor="invoice-supplier">{t("supplier")}</Label><select id="invoice-supplier" className="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm" value={form.supplierId} onChange={e => { const id = e.target.value; setForm(previous => ({ ...previous, supplierId: id, lines: [] })); setPreview(null); void load({ supplierId: id || undefined }) }}><option value="">{t("choose")}</option>{form.supplierId && !data?.suppliers.some(s => s.id === form.supplierId) && <option value={form.supplierId}>{form.supplierId}</option>}{data?.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{data?.supplierNext && <Button variant="ghost" disabled={loading} onClick={() => void load({ supplierSearch: search, supplierAfter: data.supplierNext!, supplierId: form.supplierId || undefined })}>{t("moreSuppliers")}</Button>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {([['invoiceNumber','number','text'],['invoiceDate','date','date'],['dueDate','due','date'],['currency','currency','text'],['documentReference','reference','url']] as const).map(([field,label,type]) => <div key={field} className={field === 'documentReference' ? 'sm:col-span-2' : ''}><Label htmlFor={`invoice-${field}`}>{t(label)}</Label><Input id={`invoice-${field}`} type={type} className={inputClass} value={form[field]} maxLength={field === 'documentReference' ? 1000 : 80} readOnly={field === 'currency'} onChange={e => change(field,e.target.value)} /></div>)}
        </div>
        <div><Label htmlFor="invoice-file">{t("file")}</Label><Input id="invoice-file" type="file" onChange={e => void chooseFile(e.target.files?.[0])} aria-describedby="invoice-file-help" /><p id="invoice-file-help" className="mt-2 text-sm text-[var(--dash-text-soft)]">{t("fileHelp")}</p><p className="mt-2 break-all text-xs">{t("hash")}: {form.documentSha256 || t("chooseFile")}</p></div>
      </fieldset></section>
      <section className={card}><h2 className="text-lg font-semibold">{t("receipts")}</h2><p className="my-2 text-sm text-[var(--dash-text-soft)]">{t("receiptHelp")}</p>
        {loading ? <p role="status">{t("loading")}</p> : <><Button variant="outline" disabled={locked} onClick={() => void load({ supplierId: form.supplierId || undefined })}>{t("refresh")}</Button>{data && <p className="mt-2 text-xs">{t("sourceTime")}: {formatTime(data.checkedAt)}</p>}</>}
        {!loading && data && !data.receipts.length && <p className="mt-3">{t("empty")}</p>}
        <fieldset disabled={locked || loading} className="mt-3 space-y-2">{data?.receipts.map(row => <label key={row.id} className="flex items-start gap-3 rounded-lg border border-[var(--dash-border)] p-3"><input className="mt-1 h-4 w-4 shrink-0 accent-[var(--dash-brand)]" type="checkbox" checked={form.lines.some(line => line.goodsReceiptLineId === row.id)} disabled={Number(row.available) <= 0} onChange={e => change("lines", e.target.checked ? [...form.lines, { goodsReceiptLineId: row.id, description: locale === "fr" ? row.descriptionFr : row.description, quantity: "", unitCost: row.unitCost, taxRate: "0" }] : form.lines.filter(line => line.goodsReceiptLineId !== row.id))} /><span className="min-w-0 break-words">{row.receiptNumber} · {row.orderNumber}<br />{locale === "fr" ? row.descriptionFr : row.description}<br /><span className="text-sm text-[var(--dash-text-soft)]">{t("available")}: {row.available}</span></span></label>)}{data?.receiptNext && <Button variant="ghost" onClick={() => void load({ supplierId: form.supplierId, receiptAfter: data.receiptNext! })}>{t("moreReceipts")}</Button>}</fieldset>
        <fieldset disabled={locked} className="mt-4 space-y-4">{form.lines.map((line,index) => <div key={line.goodsReceiptLineId} className="rounded-lg border border-[var(--dash-border)] p-3"><h3 className="mb-2 font-medium">{t("line")} {index + 1}</h3><div className="grid gap-3 sm:grid-cols-2">{(['description','quantity','unitCost','taxRate'] as const).map(field => <div key={field}><Label htmlFor={`invoice-line-${index}-${field}`}>{t(field === 'unitCost' ? 'cost' : field)}</Label><Input id={`invoice-line-${index}-${field}`} value={line[field]} inputMode={field === 'description' ? 'text' : 'decimal'} maxLength={field === 'description' ? 240 : 20} onChange={e => change('lines', form.lines.map((old,i) => i === index ? { ...old, [field]: field === 'description' ? e.target.value : e.target.value.replace(',', '.') } : old))} /></div>)}</div><Button variant="ghost" className="mt-2" onClick={() => change('lines',form.lines.filter((_,i) => i !== index))}>{t("remove")}</Button></div>)}<div><Label htmlFor="invoice-notes">{t("notes")}</Label><Textarea id="invoice-notes" value={form.notes} maxLength={1000} onChange={e => change('notes',e.target.value)} /></div></fieldset>
      </section><div className="pb-6"><Button ref={reviewButton} onClick={() => void review()} disabled={locked || loading || !data || !form.lines.length}>{t("review")}</Button></div>
    </>}
    <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (!value && !pending) setPreview(null) } }}><DialogContent closeLabel={locale === "fr" ? "Fermer" : "Close"} closeDisabled={busy} onCloseAutoFocus={event => { const target = decision ? newButton.current : reviewButton.current; if (target && !target.disabled) { event.preventDefault(); target.focus() } }} className="dashboard-landing-theme dark max-h-[90dvh] max-w-2xl overflow-y-auto text-[var(--dash-text)]"><DialogHeader><DialogTitle>{t(decision ? "prepared" : "reviewTitle")}</DialogTitle><DialogDescription>{t(decision ? "observationHelp" : pending ? "recoveryHelp" : "reviewHelp")}</DialogDescription></DialogHeader>
      {error && <p role="alert" className="break-words">{error}</p>}
      {preview && <div className="space-y-3"><p>{preview.supplierName} · {preview.draft.invoiceNumber}</p><dl className="grid grid-cols-2 gap-2">{(['subtotal','tax','total'] as const).map(field => <div key={field}><dt>{t(field)}</dt><dd className="font-semibold">{preview[field]} {preview.draft.currency}</dd></div>)}</dl>{Number(preview.variance) > 0 && <p><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true" />{t("variance")}: {preview.variance} {preview.draft.currency}</p>}<p className="break-all text-sm">{t("reference")}: {preview.draft.documentReference}</p><p className="break-all text-xs">{t("hash")}: {preview.draft.documentSha256}</p></div>}
      {pending && <p className="break-all text-sm">{t("request")}: {pending.idempotencyKey}</p>}
      {preview && <ul className="space-y-2 text-sm">{preview.lines.map((line,index) => <li key={`${line.id}-${index}`} className="rounded-lg border border-[var(--dash-border)] p-3"><p className="font-medium">{preview.draft.lines[index].description}</p><p>{t("quantity")}: {line.quantity} · {t("available")}: {line.available}</p><p>{t("cost")}: {preview.draft.lines[index].unitCost} · {t("taxRate")}: {preview.draft.lines[index].taxRate}</p><p>{t("total")}: {line.total} {preview.draft.currency}</p></li>)}</ul>}
      {decision && <div className="space-y-3"><p><Clock className="mr-2 inline h-4 w-4" aria-hidden="true" />{t("recordedState")}: {t(decision.preparationStatus === 'MATCHED' ? 'recordedMatched' : 'recordedDisputed')}</p><p>{decision.invoiceNumber}: {decision.total} {decision.currency}</p><p>{t("noPosting")}</p><p className="break-all text-sm">{t("request")}: {decision.requestReference}</p><p>{t("recorded")}: {formatTime(decision.recordedAt)}</p>{observation}</div>}
      {!decision && <div className="flex flex-wrap gap-2"><Button onClick={() => void submit()} disabled={busy}>{t(pending ? "retry" : "confirm")}</Button>{!pending && <Button variant="outline" disabled={busy} onClick={() => { setOpen(false); setPreview(null) }}>{t("edit")}</Button>}</div>}
    </DialogContent></Dialog>
  </main>
}
