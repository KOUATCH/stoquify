"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import * as actions from "@/actions/purchasing/payment-reconciliation.actions"
import {
  paymentReconciliationDraftSchema, paymentReconciliationCommandSchema, paymentReconciliationDecisionSchema,
  paymentReconciliationReopenSchema, paymentReconciliationFinalizeSchema,
  type PaymentReconciliationView,
} from "@/services/purchasing/payment-reconciliation-contracts"
import { paymentReconciliationCopy } from "./payment-reconciliation-copy"

const pendingSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("propose"), command: paymentReconciliationCommandSchema }).strict(),
  z.object({ operation: z.literal("decide"), command: paymentReconciliationDecisionSchema }).strict(),
  z.object({ operation: z.literal("reopen"), command: paymentReconciliationReopenSchema }).strict(),
  z.object({ operation: z.literal("finalize"), command: paymentReconciliationFinalizeSchema }).strict(),
])
const draftSchema = z.object({ paymentRequestId: z.string().max(191), statementLineId: z.string().max(191), voucherReference: z.string().max(191), evidenceUri: z.string().max(1000), evidenceSha256: z.string().max(64), recipientName: z.string().max(191), acknowledgedAt: z.string().max(100), purpose: z.string().max(1000), acknowledgment: z.boolean(), reason: z.string().max(1000) }).strict()
type Draft = z.infer<typeof draftSchema>
type Pending = z.infer<typeof pendingSchema>
type Operation = "propose" | "APPROVE" | "REJECT" | "reopen" | "finalize"
type Queue = Extract<Awaited<ReturnType<typeof actions.loadSupplierPaymentReconciliationSources>>, { success: true }>["data"]
type Choices = Extract<Awaited<ReturnType<typeof actions.loadSupplierPaymentReconciliationChoices>>, { success: true }>["data"]
type Preview = Extract<Awaited<ReturnType<typeof actions.previewSupplierPaymentReconciliation>>, { success: true }>["data"]
const empty = (paymentRequestId = ""): Draft => ({ paymentRequestId, statementLineId: "", voucherReference: "", evidenceUri: "", evidenceSha256: "", recipientName: "", acknowledgedAt: "", purpose: "", acknowledgment: false, reason: "" })
const denied = (code?: string) => ["FORBIDDEN", "AUTH_REQUIRED", "TENANT_SCOPE_VIOLATION"].includes(code ?? "")
const panel = "rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 sm:p-6"
const button = "h-auto min-h-10 whitespace-normal"
const link = "button-gold-chestnut-link break-words underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
export const paymentReconciliationStorageKey = (org: string, actor: string) => `stoquify:payment-reconciliation:${JSON.stringify([org, actor])}`
const pendingPayment = (value: Pending) => value.operation === "propose" ? value.command.draft.paymentRequestId : value.command.paymentRequestId

export function PaymentReconciliationHandoffWorkbench(props: { organizationId: string; actorId: string; initialPaymentId?: string }) {
  return <Workspace key={JSON.stringify([props.organizationId, props.actorId])} {...props} />
}
function Workspace({ organizationId, actorId, initialPaymentId }: { organizationId: string; actorId: string; initialPaymentId?: string }) {
  const locale = useLocale(), copy = paymentReconciliationCopy(locale), storageKey = paymentReconciliationStorageKey(organizationId, actorId)
  const [draft, setDraft] = useState(() => empty(initialPaymentId)), [queue, setQueue] = useState<Queue | null>(null), [search, setSearch] = useState("")
  const [view, setView] = useState<PaymentReconciliationView | null>(null), [choices, setChoices] = useState<Choices | null>(null), [preview, setPreview] = useState<Preview | null>(null)
  const [pending, setPending] = useState<Pending | null>(null), [operation, setOperation] = useState<Operation | null>(null), [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(""), [queueError, setQueueError] = useState(""), [feedback, setFeedback] = useState("")
  const [password, setPassword] = useState(""), [needsPassword, setNeedsPassword] = useState(false), [hydrated, setHydrated] = useState(false)
  const epoch = useRef(0), queueSequence = useRef(0), inFlight = useRef(false), origin = useRef<HTMLButtonElement | null>(null), confirmButton = useRef<HTMLButtonElement | null>(null), passwordInput = useRef<HTMLInputElement | null>(null), status = useRef<HTMLParagraphElement | null>(null)
  const matches = (data: { organizationId: string; actorId: string }) => data.organizationId === organizationId && data.actorId === actorId
  const explain = (code?: string) => denied(code) ? copy.denied : code === "FRESH_AUTH_REQUIRED" ? copy.freshRequired : code === "SOD_VIOLATION" ? copy.independent : code === "REVIEW_REQUIRED" ? copy.evidenceRequired : ["CONFLICT", "IDEMPOTENCY_CONFLICT"].includes(code ?? "") ? copy.stale : code === "VALIDATION_ERROR" ? copy.invalid : ["BUSINESS_RULE_VIOLATION", "NOT_FOUND", "INVALID_TRANSITION"].includes(code ?? "") ? copy.conditions : copy.unknown
  function clearPrivate() {
    epoch.current++; inFlight.current = false; setBusy(false); setLoading(false); setQueue(null); setView(null); setChoices(null); setDraft(empty()); setPreview(null); setPending(null); setPassword(""); setOpen(false); setFeedback(""); setHydrated(false)
    try { sessionStorage.removeItem(storageKey); sessionStorage.removeItem(storageKey + ":draft") } catch { /* Clear memory regardless of browser storage. */ }
  }
  function fail(code?: string) { if (denied(code)) clearPrivate(); setError(explain(code)) }
  async function loadQueue(after?: string) {
    const current = epoch.current, sequence = ++queueSequence.current; setLoading(true); setQueueError("")
    try {
      const result = await actions.loadSupplierPaymentReconciliationSources({ search, after })
      if (current !== epoch.current || sequence !== queueSequence.current) return
      if (!result.success) { setQueue(null); if (denied(result.code)) clearPrivate(); setQueueError(explain(result.code)); return }
      if (!matches(result.data)) { clearPrivate(); setQueueError(copy.denied); return }
      setQueue(previous => ({ ...result.data, rows: after ? [...(previous?.rows ?? []), ...result.data.rows] : result.data.rows }))
    } catch { if (current === epoch.current && sequence === queueSequence.current) { setQueue(null); setQueueError(copy.loadFailed) } }
    finally { if (current === epoch.current && sequence === queueSequence.current) setLoading(false) }
  }
  async function load(id: string, preserveDraft = false) {
    if (inFlight.current) return
    const current = epoch.current; inFlight.current = true; setBusy(true); setError(""); setView(null); setChoices(null); setPreview(null)
    if (!preserveDraft) setDraft(empty(id))
    try {
      const result = await actions.loadSupplierPaymentReconciliation(id)
      if (current !== epoch.current) return
      if (!result.success) { fail(result.code); return }
      if (!matches(result.data) || result.data.paymentRequestId !== id) { fail("FORBIDDEN"); return }
      setView(result.data)
      if (result.data.method === "BANK_TRANSFER" && result.data.canPropose) {
        const evidence = await actions.loadSupplierPaymentReconciliationChoices(id)
        if (current !== epoch.current) return
        if (!evidence.success) { fail(evidence.code); return }
        if (!matches(evidence.data) || evidence.data.paymentRequestId !== id) { fail("FORBIDDEN"); return }
        setChoices(evidence.data)
      }
    } catch { if (current === epoch.current) { setView(null); setError(copy.loadFailed) } }
    finally { if (current === epoch.current) { inFlight.current = false; setBusy(false) } }
  }
  const loadRef = useRef(load), queueRef = useRef(loadQueue); loadRef.current = load; queueRef.current = loadQueue
  useEffect(() => {
    let id = initialPaymentId
    try {
      const rawDraft = sessionStorage.getItem(storageKey + ":draft"), raw = sessionStorage.getItem(storageKey)
      if (rawDraft && rawDraft.length < 12000) { const parsed = draftSchema.safeParse(JSON.parse(rawDraft)); if (parsed.success && (!id || id === parsed.data.paymentRequestId)) { setDraft(parsed.data); id = parsed.data.paymentRequestId } }
      if (raw && raw.length < 15000) { const parsed = pendingSchema.safeParse(JSON.parse(raw)); if (parsed.success) { setPending(parsed.data); id = pendingPayment(parsed.data); setDraft(previous => ({ ...previous, paymentRequestId: id! })); setOpen(true); setNeedsPassword(true) } }
    } catch { setError(copy.storage) }
    setHydrated(true); void queueRef.current(); if (id) void loadRef.current(id, true)
    return () => { epoch.current++ }
    // The parent keys the workspace by trusted organization and actor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])
  useEffect(() => { if (!hydrated || pending) return; try { sessionStorage.setItem(storageKey + ":draft", JSON.stringify(draft)) } catch { setError(copy.storage) } }, [draft, hydrated, pending, storageKey, copy.storage])
  useEffect(() => { if (feedback && !open) status.current?.focus() }, [feedback, open])
  function change<K extends keyof Draft>(field: K, value: Draft[K]) { setDraft(previous => ({ ...previous, [field]: value })); setPreview(null); setError(""); setFeedback("") }
  async function hashFile(file?: File) {
    if (!file || inFlight.current) return
    if (file.size > 20 * 1024 * 1024) { setError(copy.fileLarge); return }
    const current = epoch.current; inFlight.current = true; setBusy(true)
    try { const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); if (current === epoch.current) change("evidenceSha256", Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")) }
    catch { if (current === epoch.current) setError(copy.hashFailed) }
    finally { if (current === epoch.current) { inFlight.current = false; setBusy(false) } }
  }
  async function review(next: Operation) {
    if (!view || pending || inFlight.current) return
    const current = epoch.current; inFlight.current = true; setBusy(true); setError(""); setFeedback("")
    try {
      if (next === "propose") {
        const { voucherReference, evidenceUri, evidenceSha256, recipientName, acknowledgedAt, purpose } = draft
        const parsed = paymentReconciliationDraftSchema.safeParse({ paymentRequestId: view.paymentRequestId, evidence: view.method === "CASH" ? { kind: "CASH_VOUCHER", voucherReference, evidenceUri, evidenceSha256, recipientName, acknowledgedAt, purpose, acknowledgment: draft.acknowledgment ? "RECIPIENT_ACKNOWLEDGED" : undefined } : { kind: "BANK_STATEMENT", statementLineId: draft.statementLineId } })
        if (!parsed.success) { setError(copy.invalid); return }
        const result = await actions.previewSupplierPaymentReconciliation(parsed.data)
        if (current !== epoch.current) return
        if (!result.success) { fail(result.code); return }
        if (!matches(result.data) || result.data.paymentRequestId !== view.paymentRequestId) { fail("FORBIDDEN"); return }
        setView(result.data); setPreview(result.data); setNeedsPassword(!result.data.fresh)
      } else {
        const result = await actions.reviewSupplierPaymentReconciliation(view.paymentRequestId)
        if (current !== epoch.current) return
        if (!result.success) { fail(result.code); return }
        if (!matches(result.data) || result.data.paymentRequestId !== view.paymentRequestId) { fail("FORBIDDEN"); return }
        setView(result.data); setPreview(null); setNeedsPassword(!result.data.fresh)
      }
      setOperation(next); setOpen(true)
    } catch { if (current === epoch.current) setError(copy.loadFailed) }
    finally { if (current === epoch.current) { inFlight.current = false; setBusy(false) } }
  }
  async function verify() {
    if (inFlight.current || !password) return
    const current = epoch.current; inFlight.current = true; setBusy(true); setError("")
    try {
      const result = await stepUpWithPasswordAction({ password }); setPassword("")
      if (current !== epoch.current) return
      if (!result.success) { setError(copy.passwordFailed); return }
      setNeedsPassword(false); setFeedback(copy.verified)
    } catch { if (current === epoch.current) { setPassword(""); setError(copy.passwordFailed) } }
    finally { if (current === epoch.current) { inFlight.current = false; setBusy(false) } }
  }
  useEffect(() => { if (open && !busy && !needsPassword && feedback === copy.verified) confirmButton.current?.focus() }, [open, busy, needsPassword, feedback, copy.verified])
  useEffect(() => { if (open && !busy && needsPassword) passwordInput.current?.focus() }, [open, busy, needsPassword])
  async function confirm() {
    if (inFlight.current || needsPassword || (!pending && (!view || !operation))) return
    let request = pending
    if (!request && view) {
      const common = { paymentRequestId: view.paymentRequestId, expectedRevision: preview?.revision ?? view.revision, idempotencyKey: crypto.randomUUID() }
      const candidate = operation === "propose" ? { operation: "propose", command: { draft: preview?.draft, expectedRevision: common.expectedRevision, idempotencyKey: common.idempotencyKey } } : operation === "APPROVE" || operation === "REJECT" ? { operation: "decide", command: { ...common, proposalId: view.proposalId, decision: operation, reason: draft.reason } } : { operation, command: { ...common, ...(operation === "reopen" ? { reason: draft.reason } : {}) } }
      const parsed = pendingSchema.safeParse(candidate)
      if (!parsed.success) { setError(copy.invalid); return }
      request = parsed.data
    }
    if (!request) return
    try { sessionStorage.setItem(storageKey, JSON.stringify(request)); setPending(request) } catch { setError(copy.storage); return }
    const current = epoch.current; inFlight.current = true; setBusy(true); setError(""); setFeedback("")
    try {
      const result = await (request.operation === "propose" ? actions.proposeSupplierPaymentReconciliation(request.command) : request.operation === "decide" ? actions.decideSupplierPaymentReconciliation(request.command) : request.operation === "reopen" ? actions.reopenSupplierPaymentReconciliation(request.command) : actions.finalizeSupplierPaymentReconciliation(request.command))
      if (current !== epoch.current) return
      if (!result.success) {
        fail(result.code)
        if (result.code === "FRESH_AUTH_REQUIRED") setNeedsPassword(true)
        else if (["CONFLICT", "IDEMPOTENCY_CONFLICT", "VALIDATION_ERROR", "REVIEW_REQUIRED", "SOD_VIOLATION", "BUSINESS_RULE_VIOLATION", "NOT_FOUND", "INVALID_TRANSITION"].includes(result.code ?? "")) { sessionStorage.removeItem(storageKey); setPending(null); setPreview(null); setView(null); setOpen(false) }
        return
      }
      if (!matches(result.data) || result.data.paymentRequestId !== pendingPayment(request) || result.data.requestReference !== request.command.idempotencyKey || result.data.reviewedRevision !== request.command.expectedRevision) { setError(copy.unknown); return }
      setView(result.data); setPending(null); setPreview(null); setOperation(null); setPassword(""); setOpen(false); setFeedback(copy.saved); sessionStorage.removeItem(storageKey); void loadQueue()
    } catch { if (current === epoch.current) setError(copy.unknown) }
    finally { if (current === epoch.current) { inFlight.current = false; setBusy(false) } }
  }
  const locked = busy || !!pending, state = (value: string) => copy.states[value as keyof typeof copy.states] ?? copy.conditions
  const method = (value: string) => value === "CASH" ? copy.cashMethod : value === "BANK_TRANSFER" ? copy.bankMethod : copy.unsupported
  const operationAllowed = !!view && (operation === "propose" ? view.canPropose : operation === "APPROVE" || operation === "REJECT" ? view.canDecide : operation === "reopen" ? view.canReopen : operation === "finalize" && view.canFinalize)
  const time = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "long" }).format(new Date(value))
  const evidence = pending?.operation === "propose" ? pending.command.draft.evidence : preview?.draft.evidence ?? view?.evidence
  const statement = evidence?.kind === "BANK_STATEMENT" ? choices?.rows.find(row => row.statementLineId === evidence.statementLineId) ?? (view?.statementEvidence?.statementLineId === evidence.statementLineId ? view.statementEvidence : null) : null
  const label = operation === "propose" ? copy.propose : operation === "APPROVE" ? copy.approve : operation === "REJECT" ? copy.reject : operation === "reopen" ? copy.reopen : copy.finalize
  return <main className="space-y-5 text-[var(--dash-text)]">
    <header className="space-y-2"><Link className={link} href={`/${locale}/dashboard/purchases/payables`}>{copy.back}</Link><h1 className="text-2xl font-semibold">{copy.title}</h1><p className="max-w-3xl text-[var(--dash-text-soft)]">{copy.intro}</p><p className="text-sm text-[var(--dash-text-soft)]">{copy.supported}</p></header>
    {feedback && !open && <p role="status" tabIndex={-1} ref={status} className="rounded-lg border border-[var(--dash-border)] p-3 focus-visible:outline focus-visible:outline-2">{feedback}</p>}
    {error && !open && <p role="alert" className="break-words">{error}</p>}
    {pending && !open && <Button className={`dashboard-button-primary ${button}`} onClick={() => setOpen(true)}>{copy.resume}</Button>}
    <section className={`${panel} space-y-4`} aria-labelledby="handoff-queue"><h2 id="handoff-queue" className="text-lg font-semibold">{copy.queue}</h2>
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => { event.preventDefault(); void loadQueue() }}><div className="min-w-0 flex-1"><Label htmlFor="handoff-search">{copy.search}</Label><Input id="handoff-search" value={search} maxLength={120} onChange={event => setSearch(event.target.value)} disabled={locked || loading} /></div><Button variant="outline" className={button} disabled={locked || loading}>{copy.refresh}</Button></form>
      {loading && <p role="status">{copy.loading}</p>}{queueError && <p role="alert">{queueError}</p>}{queue && !loading && queue.rows.length === 0 && <p>{copy.empty}</p>}
      <ul className="space-y-3">{queue?.rows.map(row => <li key={row.id} className="rounded-lg border border-[var(--dash-border)] p-3"><p className="break-words font-medium">{row.number} · {row.supplierName}</p><p>{row.total} {row.currency} · {method(row.method)}</p><p>{copy.retainedDecision}: {state(row.status)}</p><Button variant="outline" className={`mt-2 ${button}`} disabled={locked} onClick={() => void load(row.id)}>{copy.choose}</Button></li>)}</ul>
      {queue?.next && <Button variant="outline" className={button} disabled={locked || loading} onClick={() => void loadQueue(queue.next!)}>{copy.more}</Button>}
      {queue && <p className="text-xs">{copy.checked}: {time(queue.checkedAt)}</p>}
    </section>
    {draft.paymentRequestId && <section className={`${panel} space-y-4`} aria-labelledby="handoff-payment"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="handoff-payment" className="text-lg font-semibold">{copy.payment}</h2><Button variant="outline" className={button} disabled={locked} onClick={() => void load(draft.paymentRequestId, true)}>{copy.refresh}</Button></div>
      {busy && !view && <p role="status">{copy.loading}</p>}
      {view && <><dl className="grid min-w-0 gap-3 sm:grid-cols-2">{[[copy.payment, view.paymentNumber], [copy.supplier, view.supplierName], [copy.amount, `${view.total} ${view.currency}`], [copy.method, method(view.method)], [copy.destination, view.method === "CASH" ? copy.cashMethod : view.destinationLabel === "UNAVAILABLE" ? copy.unavailable : view.destinationLabel], [copy.execution, view.executionReference], [copy.executedAt, time(view.executedAt)]].map(([term, value]) => <div key={term} className="min-w-0"><dt className="text-sm text-[var(--dash-text-soft)]">{term}</dt><dd className="break-words font-medium">{value}</dd></div>)}</dl><p className="font-medium">{state(view.status)}</p><p className="text-sm text-[var(--dash-warning)]">{copy.country}</p>
        {view.evidenceIssue && <p role="alert" className="rounded-lg border border-[var(--dash-warning)] p-3">{copy.proofStale}</p>}
        {view.canPropose && ["CASH", "BANK_TRANSFER"].includes(view.method) && <form className="space-y-4 border-t border-[var(--dash-border)] pt-4" onSubmit={event => { event.preventDefault(); void review("propose") }}>
          <h3 className="font-semibold">{view.method === "CASH" ? copy.cash : copy.bank}</h3><p className="text-sm">{view.method === "CASH" ? copy.cashHelp : copy.bankHelp}</p>
          {view.method === "CASH" ? <>
            {(["voucherReference", "recipientName", "acknowledgedAt", "purpose", "evidenceUri", "evidenceSha256"] as const).map(field => <div key={field}><Label htmlFor={`handoff-${field}`}>{copy[field]}</Label><Input id={`handoff-${field}`} value={draft[field]} onChange={event => change(field, event.target.value)} disabled={locked} required maxLength={field === "evidenceUri" || field === "purpose" ? 1000 : field === "evidenceSha256" ? 64 : 191} type={field === "evidenceUri" ? "url" : "text"} /><p className="mt-1 text-xs text-[var(--dash-text-soft)]">{field === "evidenceUri" ? copy.uriHelp : field === "evidenceSha256" ? copy.hashHelp : null}</p></div>)}
            <div><Label htmlFor="handoff-file">{copy.file}</Label><Input id="handoff-file" type="file" disabled={locked} onChange={event => void hashFile(event.target.files?.[0])} /><p className="mt-1 text-xs">{copy.hashHelp}</p></div>
            <label className="flex items-start gap-3"><input type="checkbox" checked={draft.acknowledgment} disabled={locked} onChange={event => change("acknowledgment", event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--dash-brand)]" /><span className="text-sm">{copy.acknowledgment}</span></label>
          </> : <div><Label htmlFor="handoff-statement">{copy.statement}</Label><select id="handoff-statement" className="dashboard-control min-h-10 w-full min-w-0" value={draft.statementLineId} onChange={event => change("statementLineId", event.target.value)} disabled={locked || !choices} required><option value="">{copy.selectStatement}</option>{choices?.rows.map(row => <option key={row.statementLineId} value={row.statementLineId}>{row.providerName} · {row.reference ?? row.fileName} · {row.total} {row.currency} · {time(row.occurredAt)}</option>)}</select>{choices?.rows.length === 0 && <p className="mt-2 text-sm">{copy.noStatements}</p>}<Link className={link} href={`/${locale}/dashboard/finance/reconciliation`}>{copy.reconcile}</Link></div>}
          {choices?.truncated && <p className="text-sm text-[var(--dash-warning)]">{copy.statementLimit}</p>}
          <Button type="submit" className={`dashboard-button-primary ${button}`} disabled={locked} onClick={event => { origin.current = event.currentTarget }}>{copy.preview}</Button>
        </form>}
        {view.status === "PROPOSED" && !view.canDecide && <p className="text-sm">{copy.independent}</p>}
        <div className="flex flex-wrap gap-3">{([["APPROVE", view.canDecide, copy.approve], ["REJECT", view.canDecide, copy.reject], ["reopen", view.canReopen, copy.reopen], ["finalize", view.canFinalize, copy.finalize]] as const).filter(([, allowed]) => allowed).map(([op, , text]) => <Button key={op} variant="outline" className={button} disabled={locked} onClick={event => { origin.current = event.currentTarget; void review(op) }}>{text}</Button>)}</div>
        {view.status === "ADMITTED" && <><p className="text-sm">{copy.bankHelp}</p><Link className={link} href={`/${locale}/dashboard/finance/reconciliation`}>{copy.reconcile}</Link></>}
        <h3 className="font-semibold">{copy.history}</h3>{view.history.length ? <ol className="space-y-2">{view.history.map(row => <li key={row.id} className="break-words border-b border-[var(--dash-border)] pb-2"><p>{state(row.status)} · {time(row.recordedAt)}</p>{row.reason && <p>{row.reason}</p>}</li>)}</ol> : <p>{copy.noHistory}</p>}<p className="text-xs">{copy.checked}: {time(view.checkedAt)}</p>
      </>}
    </section>}
    <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setPassword("") } }}><DialogContent closeLabel={copy.close} closeDisabled={busy} onCloseAutoFocus={event => { if (feedback === copy.saved) { event.preventDefault(); status.current?.focus() } else if (origin.current?.isConnected && !origin.current.disabled) { event.preventDefault(); origin.current.focus() } }} className="dashboard-landing-theme dark max-h-[90dvh] max-w-2xl overflow-y-auto text-[var(--dash-text)] motion-reduce:animate-none"><DialogHeader><DialogTitle>{pending ? copy.resume : copy.reviewTitle}</DialogTitle><DialogDescription>{copy.effect}</DialogDescription></DialogHeader>
      {error && <p role="alert">{error}</p>}{feedback && <p role="status">{feedback}</p>}
      {view && <div className="space-y-1"><p className="break-words font-semibold">{view.paymentNumber} · {view.supplierName}</p><p>{view.total} {view.currency}</p><p className="break-words">{copy.execution}: {view.executionReference}</p><p>{state(view.status)}</p></div>}
      {evidence?.kind === "CASH_VOUCHER" && <div className="space-y-2 text-sm"><p>{copy.cashHelp}</p><p className="break-words">{evidence.recipientName} · {evidence.voucherReference}</p><p>{evidence.acknowledgedAt}</p><p className="break-words">{evidence.purpose}</p><a className={link} href={evidence.evidenceUri} target="_blank" rel="noopener noreferrer">{copy.openEvidence}</a><p className="break-all font-mono text-xs">{evidence.evidenceSha256}</p></div>}
      {view?.evidenceIssue && <p role="alert">{copy.proofStale}</p>}
      {evidence?.kind === "BANK_STATEMENT" && <div className="space-y-2 text-sm"><p>{copy.bankHelp}</p>{statement ? <><p className="break-words">{statement.providerName} · {statement.fileName}</p><p className="break-words">{statement.reference} · {statement.total} {statement.currency}</p><p>{time(statement.occurredAt)}</p></> : <p>{copy.evidenceRequired}</p>}<p className="break-all">{copy.statement}: {evidence.statementLineId}</p></div>}
      {(operation === "APPROVE" || operation === "REJECT" || operation === "reopen") && !pending && <div><Label htmlFor="handoff-reason">{copy.reason}</Label><textarea id="handoff-reason" value={draft.reason} onChange={event => change("reason", event.target.value)} maxLength={1000} minLength={10} className="dashboard-control min-h-24 w-full" disabled={busy} /><p className="text-xs">{copy.reasonHelp}</p></div>}
      {(operation === "reopen" || pending?.operation === "reopen") && <p className="text-sm">{copy.withdrawal} {copy.retained}</p>}
      {pending && <div className="space-y-2 text-sm"><p>{copy.pending}</p><p className="break-all">{copy.reference}: {pending.command.idempotencyKey}</p>{"reason" in pending.command && <p className="break-words">{pending.command.reason}</p>}</div>}
      {needsPassword && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void verify() }}><Label htmlFor="handoff-password">{copy.password}</Label><Input ref={passwordInput} id="handoff-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /><Button type="submit" variant="outline" className={button} disabled={busy || !password}>{copy.verify}</Button></form>}
      {!pending && !operationAllowed && <p>{copy.readOnly}</p>}
      <div className="flex flex-wrap gap-3 border-t border-[var(--dash-border)] pt-3"><Button ref={confirmButton} className={`dashboard-button-primary ${button}`} disabled={busy || needsPassword || (!pending && !operationAllowed)} onClick={() => void confirm()}>{busy ? copy.working : pending ? copy.retry : label}</Button><Button variant="outline" className={button} disabled={busy} onClick={() => { setOpen(false); setPassword("") }}>{copy.close}</Button></div>
    </DialogContent></Dialog>
  </main>
}
