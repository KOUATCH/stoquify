"use client"
import { ReceiptLedgerRecoveryDialog } from "./ReceiptLedgerRecoveryDialog"

import { useCallback, useEffect, useRef, useState } from "react"
import { z } from "zod"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { loadPurchaseReceiving, reviewPurchaseReceiving, submitPurchaseReceiving } from "@/actions/purchaseOrderWorkflow/purchase-receiving.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { purchaseReceivingCommandSchema, purchaseReceivingDecisionSchema, purchaseReceivingDraftSchema, type PurchaseReceivingCommand, type PurchaseReceivingDecision, type PurchaseReceivingDraft, type PurchaseReceivingPreview, type PurchaseReceivingWorkbench as Workbench } from "@/services/purchase-order/purchase-receiving-contracts"

export const purchaseReceivingStorageKey = (organizationId: string, actorId: string, orderId: string) => `stoquify:purchase-receiving:${JSON.stringify([organizationId, actorId, orderId])}`
type Entry = { quantity: string; batch: string; expiry: string; serials: string }
const localFormSchema = z.object({ entries: z.record(z.object({ quantity: z.string().max(40), batch: z.string().max(191), expiry: z.string().max(10), serials: z.string().max(960000) }).strict()).refine(value => Object.keys(value).length <= 200), outcome: z.enum(["", "PASSED", "FAILED", "INCOMPLETE"]), reason: z.string().max(2000), notes: z.string().max(2000), resolution: z.object({ id: z.string().min(1).max(191), decision: z.enum(["ACCEPT", "REJECT"]) }).strict().nullable() }).strict()
const emptyEntry = (): Entry => ({ quantity: "", batch: "", expiry: "", serials: "" })
const privateDenial = (code?: string) => ["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND", "TENANT_SCOPE_VIOLATION"].includes(code ?? "")
const knownFailure = (code?: string) => ["CONFLICT", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "SOD_VIOLATION", "INVALID_TRANSITION", "IDEMPOTENCY_CONFLICT"].includes(code ?? "")

export function PurchaseReceivingWorkbench({ orderId, organizationId, actorId, open, onOpenChange, onChanged }: { orderId: string; organizationId: string; actorId: string; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const t = useTranslations("purchaseReceiving"), locale = useLocale(), key = purchaseReceivingStorageKey(organizationId, actorId, orderId)
  const [data, setData] = useState<Workbench | null>(null), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState("")
  const [entries, setEntries] = useState<Record<string, Entry>>({}), [outcome, setOutcome] = useState<"PASSED" | "FAILED" | "INCOMPLETE" | "">("")
  const [reason, setReason] = useState(""), [notes, setNotes] = useState(""), [resolution, setResolution] = useState<{ id: string; decision: "ACCEPT" | "REJECT" } | null>(null)
  const [preview, setPreview] = useState<PurchaseReceivingPreview | null>(null), [pending, setPending] = useState<PurchaseReceivingCommand | null>(null), [receipt, setReceipt] = useState<PurchaseReceivingDecision | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [password, setPassword] = useState(""), [needsPassword, setNeedsPassword] = useState(false)
  const [hydratedScope, setHydratedScope] = useState("")
  const generation = useRef(0), inFlight = useRef(false), returnFocus = useRef<HTMLElement | null>(null), initialized = useRef("")
  const invalidate = useCallback(() => { generation.current += 1 }, [])
  const explain = useCallback((code?: string) => t(privateDenial(code) ? "denied" : code === "RECEIPT_EVIDENCE_REQUIRED" ? "evidenceUnverified" : code === "CONFLICT" ? "stale" : code === "FRESH_AUTH_REQUIRED" ? "fresh" : code === "SOD_VIOLATION" ? "separation" : code === "VALIDATION_ERROR" ? "invalid" : code === "IDEMPOTENCY_CONFLICT" ? "referenceConflict" : code === "BUSINESS_RULE_VIOLATION" || code === "INVALID_TRANSITION" ? "unavailable" : "unknown"), [t])
  const clearPrivate = useCallback(() => {
    try { sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft"); sessionStorage.removeItem(key + ":form") } catch { /* Clear private in-memory state even when storage is unavailable. */ }
    setHydratedScope("")
    setPending(null); setPreview(null); setReceipt(null); setData(null); setEntries({}); setReason(""); setNotes(""); setPassword(""); setOutcome(""); setResolution(null)
  }, [key])
  const load = useCallback(async () => {
    const current = generation.current; setLoading(true); setLoadError("")
    try {
      const result = await loadPurchaseReceiving(orderId)
      if (current !== generation.current) return
      if (!result.success) { setData(null); setLoadError(explain(result.code)); if (privateDenial(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId || result.data.orderId !== orderId) { clearPrivate(); setLoadError(t("denied")); return }
      setData(result.data)
    } catch { if (current === generation.current) { setData(null); setLoadError(t("loadFailed")) } }
    finally { if (current === generation.current) setLoading(false) }
  }, [actorId, clearPrivate, explain, orderId, organizationId, t])
  const loadRef = useRef(load), openRef = useRef(onOpenChange); loadRef.current = load; openRef.current = onOpenChange
  useEffect(() => {
    invalidate(); initialized.current = key; setEntries({}); setOutcome(""); setReason(""); setNotes(""); setResolution(null); setPreview(null); setReceipt(null); setPending(null); setPassword(""); setNeedsPassword(false); setError(""); setData(null); setBusy(false)
    try {
      const raw = sessionStorage.getItem(key)
      if (raw && raw.length <= 1200000) {
        const parsed = purchaseReceivingCommandSchema.safeParse(JSON.parse(raw))
        if (parsed.success && parsed.data.draft.orderId === orderId) { setPending(parsed.data); openRef.current(true) }
        else { sessionStorage.removeItem(key) }
      }
      const form = sessionStorage.getItem(key + ":form"), parsedForm = form && form.length <= 1200000 ? localFormSchema.safeParse(JSON.parse(form)) : null
      if (parsedForm?.success) { setEntries(parsedForm.data.entries); setOutcome(parsedForm.data.outcome); setReason(parsedForm.data.reason); setNotes(parsedForm.data.notes); setResolution(parsedForm.data.resolution) }
      const saved = parsedForm?.success ? null : sessionStorage.getItem(key + ":draft")
      if (saved && saved.length <= 1200000) {
        const parsed = purchaseReceivingDraftSchema.safeParse(JSON.parse(saved))
        if (parsed.success && parsed.data.orderId === orderId) {
          const draft = parsed.data
          if (draft.kind === "receive") { setEntries(Object.fromEntries(draft.items.map(i => [i.lineId, { quantity: String(i.receivedQuantity), batch: i.batchNumber ?? "", expiry: i.expiryDate ?? "", serials: i.serialNumbers?.join("\n") ?? "" }]))); setOutcome(draft.inspectionOutcome); setReason(draft.inspectionReason ?? ""); setNotes(draft.inspectionEvidenceNotes ?? "") }
          else { setResolution({ id: draft.goodsReceiptId, decision: draft.decision }); setReason(draft.reason) }
        }
      }
    } catch { setError(t("storage")) }
    setHydratedScope(key)
    void loadRef.current()
    return invalidate
  // Scope changes invalidate every in-flight response, including an old tenant's response.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, orderId, invalidate])
  useEffect(() => { if (open && initialized.current === key) void loadRef.current() }, [open, key])

  useEffect(() => {
    if (hydratedScope !== key || pending || receipt || busy) return
    try { sessionStorage.setItem(key + ":form", JSON.stringify({ entries, outcome, reason, notes, resolution })) }
    catch { setError(t("draftStorage")) }
  }, [key, hydratedScope, entries, outcome, reason, notes, resolution, pending, receipt, busy, t])

  function draft(): PurchaseReceivingDraft {
    if (resolution) return purchaseReceivingDraftSchema.parse({ kind: "resolve", orderId, goodsReceiptId: resolution.id, decision: resolution.decision, reason })
    return purchaseReceivingDraftSchema.parse({ kind: "receive", orderId, locationId: data?.locationId, inspectionOutcome: outcome, inspectionReason: reason.trim() || undefined, inspectionEvidenceNotes: notes.trim() || undefined, items: Object.entries(entries).filter(([, e]) => e.quantity.trim() !== "" && Number(e.quantity.replace(",", ".")) !== 0).map(([lineId, e]) => ({ lineId, receivedQuantity: Number(e.quantity.replace(",", ".")), batchNumber: e.batch.trim() || undefined, expiryDate: e.expiry || undefined, serialNumbers: e.serials.trim() ? e.serials.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : undefined })) })
  }
  async function review() {
    if (inFlight.current || pending) return
    let value: PurchaseReceivingDraft
    try { value = draft() } catch { setError(t("invalid")); return }
    const current = generation.current; inFlight.current = true; setBusy(true); setError(""); setReceipt(null)
    try {
      sessionStorage.setItem(key + ":draft", JSON.stringify(value))
      const result = await reviewPurchaseReceiving(value)
      if (current !== generation.current) return
      if (!result.success) { setError(explain(result.code)); if (privateDenial(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId || result.data.orderId !== orderId) { clearPrivate(); setError(t("denied")); return }
      setPreview(result.data); setNeedsPassword(result.data.requiresFreshAuth)
    } catch { if (current === generation.current) setError(t("reviewFailed")) }
    finally { inFlight.current = false; if (current === generation.current) setBusy(false) }
  }
  async function confirm() {
    if (inFlight.current || !pending && !preview) return
    const current = generation.current; inFlight.current = true; setBusy(true); setError("")
    try {
      if (needsPassword) { const result = await stepUpWithPasswordAction({ password }); setPassword(""); if (current !== generation.current) return; if (!result.success) { setError(t("passwordFailed")); return } }
      const command = pending ?? { draft: preview!.draft, expectedRevision: preview!.revision, idempotencyKey: crypto.randomUUID() }
      try { sessionStorage.setItem(key, JSON.stringify(command)) } catch { setError(t("storage")); return }
      setPending(command)
      const result = await submitPurchaseReceiving(command)
      if (current !== generation.current) return
      if (!result.success) {
        setError(explain(result.code))
        if (result.code === "FRESH_AUTH_REQUIRED") setNeedsPassword(true)
        if (privateDenial(result.code)) clearPrivate()
        else if (knownFailure(result.code)) { sessionStorage.removeItem(key); setPending(null); setPreview(null); void loadRef.current() }
        return
      }
      const { replayed, ...record } = result.data, parsed = purchaseReceivingDecisionSchema.safeParse(record)
      if (!parsed.success || typeof replayed !== "boolean" || record.kind !== command.draft.kind || record.orderId !== orderId || record.actorId !== actorId || record.requestReference !== command.idempotencyKey || record.reviewedRevision !== command.expectedRevision) { setError(t("unknown")); return }
      sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft"); sessionStorage.removeItem(key + ":form"); setPending(null); setPreview(null); setReceipt(parsed.data); setNeedsPassword(false); setEntries({}); setOutcome(""); setReason(""); setNotes(""); setResolution(null)
      void loadRef.current(); onChanged()
    } catch { if (current === generation.current) setError(t("unknown")) }
    finally { inFlight.current = false; if (current === generation.current) setBusy(false) }
  }
  function startResolution(id: string, decision: "ACCEPT" | "REJECT") {
    if (pending) { onOpenChange(true); return }
    setResolution({ id, decision }); setReason(""); setPreview(null); setReceipt(null); setError(""); setNeedsPassword(false); onOpenChange(true)
  }
  function close() { if (!busy) { setPassword(""); if (!pending) { setPreview(null); setReceipt(null); if (resolution) { setResolution(null); setReason("") } } onOpenChange(false) } }
  function update(id: string, field: keyof Entry, value: string) { setEntries(old => ({ ...old, [id]: { ...emptyEntry(), ...old[id], [field]: value } })) }
  const money = (value: string, currency: string | null | undefined = data?.currency ?? preview?.currency ?? receipt?.currency) => currency ? new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value)) : value
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  const status = (value: string) => t(["HELD", "RECEIVED", "COMPLETED", "REJECTED", "CANCELLED"].includes(value) ? `status.${value}` : "status.unknown")
  const outcomeView = (value: Pick<PurchaseReceivingDecision, "stockStatus" | "accountingStatus">) => <div className="space-y-1 text-sm"><p>{t(`stock.${value.stockStatus}`)}</p><p className={value.accountingStatus === "review_required" ? "text-[var(--dash-warning)]" : ""}>{t(`accounting.${value.accountingStatus}`)}</p>{value.accountingStatus === "review_required" && <p>{t("accountingNext")}</p>}</div>
  const actionClass = "h-auto min-h-11 whitespace-normal"
  return <>
    <section aria-label={t("history")} className="dashboard-glass-panel space-y-4 rounded-lg p-4 text-[var(--dash-text)] sm:p-6 [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("history")}</h2><Button variant="outline" className={`dashboard-button-secondary ${actionClass}`} disabled={loading || busy} onClick={() => void load()}><RefreshCw aria-hidden className="mr-2 h-4 w-4"/>{t("refresh")}</Button></div>
      {loading && <p role="status">{t("loading")}</p>}{loadError && <p role="alert">{loadError}</p>}
      {data && <><p className="text-sm text-[var(--dash-text-soft)]">{t("checked", { at: date(data.checkedAt) })}</p>{data.receipts.length === 0 && <p>{t("empty")}</p>}
        <ul className="space-y-4">{data.receipts.map(row => <li key={row.id} className="space-y-3 rounded-lg border border-[var(--dash-border)] p-4">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{row.number}</h3><p className={`inline-flex items-center gap-2 ${row.status === "HELD" ? "text-[var(--dash-warning)]" : row.stockStatus === "recorded" ? "text-[var(--dash-success)]" : ""}`}>{row.status === "HELD" ? <Clock aria-hidden className="h-4 w-4"/> : row.stockStatus === "recorded" ? <CheckCircle2 aria-hidden className="h-4 w-4"/> : <AlertTriangle aria-hidden className="h-4 w-4"/>}{status(row.status)}</p></div>
          <p>{date(row.recordedAt)} · {row.receiver} · {row.location}</p><p>{t("quantity")}: {row.quantity} · {t("value")}: {money(row.value, row.currency)}</p>
          {row.inspection && <div><p>{t("inspection")}: {t(`inspectionOutcome.${row.inspection.outcome}`)} · {row.inspection.inspector}</p>{row.inspection.reason && <p>{row.inspection.reason}</p>}{row.inspection.evidenceNotes && <p className="whitespace-pre-wrap">{row.inspection.evidenceNotes}</p>}</div>}
          {row.resolution && <p>{t(row.resolution.decision === "ACCEPT" ? "acceptedBy" : "rejectedBy", { person: row.resolution.resolver, at: date(row.resolution.at) })}: {row.resolution.reason}</p>}
          {outcomeView(row)}{row.decision ? <p className="break-all text-xs">{t("reference")}: {row.decision.requestReference}</p> : <p className="text-sm">{t("legacy")}</p>}
          {data.canReviewAccounting && row.stockStatus === "recorded" && <ReceiptLedgerRecoveryDialog organizationId={organizationId} actorId={actorId} orderId={orderId} receiptId={row.id} disabled={busy} onChanged={() => { void loadRef.current(); onChanged() }}/>} 
          {row.canReject && <div className="space-y-2"><div className="flex flex-wrap gap-3"><Button className={`dashboard-button-primary ${actionClass}`} disabled={!row.canAccept || busy} onClick={() => startResolution(row.id, "ACCEPT")}>{t("accept")}</Button><Button variant="outline" className={`dashboard-button-secondary ${actionClass}`} disabled={busy} onClick={() => startResolution(row.id, "REJECT")}>{t("reject")}</Button></div>{!row.canAccept && <p className="text-sm">{t("separation")}</p>}</div>}
        </li>)}</ul>{data.olderReceipts && <p>{t("older")}</p>}</>}
    </section>
    <Dialog open={open} onOpenChange={value => { if (!value) close() }}><DialogContent closeLabel={t("close")} closeDisabled={busy} className="dashboard-landing-theme dark dashboard-glass-panel max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 text-[var(--dash-text)] [overflow-wrap:anywhere] [&>*]:min-w-0 sm:p-6 motion-reduce:animate-none" onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement }} onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus() }} onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => { if (busy) event.preventDefault() }}>
      <DialogHeader className="pr-8 text-left"><DialogTitle>{t(resolution || pending?.draft.kind === "resolve" ? "resolveTitle" : "title")}</DialogTitle><DialogDescription>{t("description")}</DialogDescription></DialogHeader>
      {(busy || loading) && <p role="status">{t("loading")}</p>}{(error || loadError) && <p role="alert" className="rounded-lg border border-[var(--dash-warning)] p-3">{error || loadError}</p>}
      {receipt ? <div role="status" className="space-y-3"><h3 className="font-semibold">{status(receipt.disposition)} · {receipt.receiptNumber}</h3><p>{t("quantity")}: {receipt.quantity} · {t("value")}: {money(receipt.value, receipt.currency)}</p>{outcomeView(receipt)}<p className="break-all">{t("reference")}: {receipt.requestReference}</p></div> : pending && !preview ? <div className="space-y-3"><p>{t("pending")}</p><p className="break-all">{t("reference")}: {pending.idempotencyKey}</p></div> : preview ? <div className="space-y-3"><h3 className="font-semibold">{t("reviewTitle")} · {preview.orderNumber}</h3><p>{preview.location} · {t("proposed", { status: status(preview.disposition) })}</p><ul className="space-y-2">{preview.lines.map(line => <li key={line.id} className="rounded-lg border border-[var(--dash-border)] p-3"><p className="font-medium">{locale === "fr" ? line.nameFr : line.nameEn}</p><p>{line.quantity} × {money(line.unitCost, preview.currency)} = {money(line.value, preview.currency)}</p></li>)}</ul><p className="font-semibold">{t("value")}: {money(preview.value, preview.currency)}</p><p>{t(preview.disposition === "HELD" ? "holdEffect" : preview.disposition === "REJECTED" ? "rejectEffect" : "receiveEffect")}</p>{preview.draft.kind === "resolve" && <p>{t("reason")}: {preview.draft.reason}</p>}</div> : data ? <div className="space-y-4">
        <p className="font-medium">{data.orderNumber} · {data.supplier} · {data.location}</p>
        {resolution ? <><p>{t(resolution.decision === "ACCEPT" ? "accept" : "reject")}: {data.receipts.find(r => r.id === resolution.id)?.number ?? resolution.id}</p><Label htmlFor="receiving-reason">{t("reason")}</Label><Textarea id="receiving-reason" value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} disabled={busy}/></> : <>
          {!data.canReceive && <p role="status">{t("unavailable")}</p>}
          <fieldset disabled={busy || !data.canReceive} className="space-y-4"><legend className="sr-only">{t("items")}</legend>
            {data.lines.map(line => <div key={line.id} className="space-y-3 rounded-lg border border-[var(--dash-border)] p-3"><h3 className="font-semibold">{locale === "fr" ? line.nameFr : line.nameEn}</h3><p className="text-sm">{t("lineScope", { ordered: line.ordered, received: line.received, held: line.held, available: line.available })}</p>
              <Label htmlFor={`quantity-${line.id}`}>{t("quantity")}</Label><Input id={`quantity-${line.id}`} inputMode="decimal" value={entries[line.id]?.quantity ?? ""} disabled={!line.active || Number(line.available) <= 0} onChange={e => update(line.id, "quantity", e.target.value)} aria-describedby={`quantity-help-${line.id}`}/><p id={`quantity-help-${line.id}`} className="text-xs">{t(line.trackSerialNumbers ? "wholeUnits" : "precision")}</p>
              {Number((entries[line.id]?.quantity ?? "0").replace(",", ".")) > 0 && <><div className="grid gap-3 sm:grid-cols-2">{line.trackBatches && <div><Label htmlFor={`batch-${line.id}`}>{t("batch")}</Label><Input id={`batch-${line.id}`} value={entries[line.id]?.batch ?? ""} maxLength={191} onChange={e => update(line.id, "batch", e.target.value)}/><p className="text-xs">{t("batchHelp")}</p></div>}{line.trackExpiry && <div><Label htmlFor={`expiry-${line.id}`}>{t("expiry")}</Label><Input id={`expiry-${line.id}`} type="date" value={entries[line.id]?.expiry ?? ""} onChange={e => update(line.id, "expiry", e.target.value)}/></div>}</div>{line.trackSerialNumbers && <div><Label htmlFor={`serials-${line.id}`}>{t("serials")}</Label><Textarea id={`serials-${line.id}`} value={entries[line.id]?.serials ?? ""} maxLength={960000} onChange={e => update(line.id, "serials", e.target.value)}/><p className="text-xs">{t("serialHelp")}</p></div>}</>}
            </div>)}
            <div><Label htmlFor="receiving-inspection">{t("inspection")}</Label><select id="receiving-inspection" className="dashboard-control mt-2 min-h-11 w-full rounded-lg p-2" value={outcome} onChange={e => setOutcome(e.target.value as typeof outcome)}><option value="">{t("chooseInspection")}</option>{(["PASSED", "FAILED", "INCOMPLETE"] as const).map(value => <option key={value} value={value}>{t(`inspectionOutcome.${value}`)}</option>)}</select></div>
            {outcome && outcome !== "PASSED" && <div><Label htmlFor="receiving-reason">{t("reason")}</Label><Textarea id="receiving-reason" value={reason} maxLength={2000} onChange={e => setReason(e.target.value)}/><p className="text-sm">{t("holdEffect")}</p></div>}
            <div><Label htmlFor="receiving-evidence">{t("evidence")}</Label><Textarea id="receiving-evidence" value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)}/></div>
          </fieldset>
        </>}
      </div> : null}
      {!receipt && needsPassword && <div><Label htmlFor="receiving-password">{t("password")}</Label><Input id="receiving-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy}/></div>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--dash-border)] pt-3"><Button variant="outline" className={`dashboard-button-secondary ${actionClass}`} disabled={busy} onClick={close}>{t("close")}</Button>{!receipt && !pending && preview && <Button variant="outline" className={`dashboard-button-secondary ${actionClass}`} disabled={busy} onClick={() => { setPreview(null); setPassword("") }}>{t("edit")}</Button>}{!receipt && !pending && !preview && <Button className={`dashboard-button-primary ${actionClass}`} disabled={busy || loading || !data || !resolution && !data.canReceive} onClick={() => void review()}>{t("review")}</Button>}{!receipt && (preview || pending) && <Button className={`dashboard-button-primary ${actionClass}`} disabled={busy || needsPassword && !password} onClick={() => void confirm()}>{t(pending ? "recover" : "confirm")}</Button>}{!data && !pending && <Button variant="outline" className={`dashboard-button-secondary ${actionClass}`} disabled={busy || loading} onClick={() => void load()}>{t("refresh")}</Button>}</div>
    </DialogContent></Dialog>
  </>
}
