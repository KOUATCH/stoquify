"use client"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { reviewReceiptLedgerRecovery, submitReceiptLedgerRecovery } from "@/actions/purchaseOrderWorkflow/purchase-receiving.actions"
import { receiptLedgerRecoveryCommandSchema, receiptLedgerRecoveryDecisionSchema, type ReceiptLedgerRecoveryCommand, type ReceiptLedgerRecoveryDecision, type ReceiptLedgerRecoveryPreview } from "@/services/purchase-order/receipt-ledger-recovery-contracts"

const denied = (code?: string) => ["FORBIDDEN", "AUTH_REQUIRED", "NOT_FOUND", "TENANT_SCOPE_VIOLATION"].includes(code ?? "")
export const receiptLedgerRecoveryStorageKey = (org: string, actor: string, order: string, receipt: string) => `stoquify:receipt-ledger-recovery:${JSON.stringify([org, actor, order, receipt])}`

export function ReceiptLedgerRecoveryDialog({ organizationId, actorId, orderId, receiptId, onChanged, disabled = false }: { organizationId: string; actorId: string; orderId: string; receiptId: string; onChanged: () => void; disabled?: boolean }) {
  const t = useTranslations("purchaseReceiving.accountingRecovery"), locale = useLocale(), passwordId = useId()
  const key = receiptLedgerRecoveryStorageKey(organizationId, actorId, orderId, receiptId)
  const [preview, setPreview] = useState<ReceiptLedgerRecoveryPreview | null>(null), [pending, setPending] = useState<ReceiptLedgerRecoveryCommand | null>(null), [decision, setDecision] = useState<ReceiptLedgerRecoveryDecision | null>(null)
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [password, setPassword] = useState(""), [needsPassword, setNeedsPassword] = useState(false)
  const generation = useRef(0), inFlight = useRef(false), trigger = useRef<HTMLButtonElement>(null)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const explain = (code?: string) => t(denied(code) ? "denied" : code === "FRESH_AUTH_REQUIRED" ? "freshRequired" : code === "RECEIPT_EVIDENCE_REQUIRED" ? "evidence" : code === "CONFLICT" ? "stale" : code === "IDEMPOTENCY_CONFLICT" ? "conflict" : code === "VALIDATION_ERROR" ? "invalid" : code === "BUSINESS_RULE_VIOLATION" ? "conditions" : "unknown")
  function clearPrivate() {
    try { sessionStorage.removeItem(key) } catch { /* Clear private memory even if storage is unavailable. */ }
    setPending(null); setPreview(null); setDecision(null); setPassword(""); setNeedsPassword(false)
  }
  useEffect(() => {
    invalidate(); inFlight.current = false; setPreview(null); setPending(null); setDecision(null); setOpen(false); setBusy(false); setError(""); setPassword(""); setNeedsPassword(false)
    try {
      const raw = sessionStorage.getItem(key), parsed = raw && raw.length < 2000 ? receiptLedgerRecoveryCommandSchema.safeParse(JSON.parse(raw)) : null
      if (parsed?.success && parsed.data.orderId === orderId && parsed.data.receiptId === receiptId) setPending(parsed.data)
      else if (raw) sessionStorage.removeItem(key)
    } catch { setError(t("storage")) }
    return invalidate
  // A different tenant, operator or receipt must not inherit an in-flight response.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, orderId, receiptId, invalidate])
  async function review() {
    if (inFlight.current || disabled) return
    if (pending || decision) { setOpen(true); return }
    const current = generation.current; inFlight.current = true; setBusy(true); setError(""); setOpen(true)
    try {
      const result = await reviewReceiptLedgerRecovery({ orderId, receiptId })
      if (current !== generation.current) return
      if (!result.success) { setError(explain(result.code)); if (denied(result.code)) clearPrivate(); return }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId || result.data.orderId !== orderId || result.data.receiptId !== receiptId) { clearPrivate(); setError(t("denied")); return }
      setPreview(result.data); setNeedsPassword(result.data.requiresFreshAuth)
    } catch { if (current === generation.current) setError(t("loadFailed")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  async function submit() {
    if (inFlight.current || disabled || !pending && (!preview || preview.blockers.length)) return
    const current = generation.current, command = pending ?? { orderId, receiptId, expectedRevision: preview!.revision, idempotencyKey: crypto.randomUUID() }
    try { sessionStorage.setItem(key, JSON.stringify(command)); setPending(command) } catch { setError(t("storage")); return }
    inFlight.current = true; setBusy(true); setError("")
    try {
      if (needsPassword) {
        const assurance = await stepUpWithPasswordAction({ password }); setPassword("")
        if (current !== generation.current) return
        if (!assurance.success) { setError(t("passwordFailed")); return }
        setNeedsPassword(false)
      }
      const result = await submitReceiptLedgerRecovery(command)
      if (current !== generation.current) return
      if (!result.success) {
        setError(explain(result.code))
        if (denied(result.code)) clearPrivate()
        else if (result.code === "FRESH_AUTH_REQUIRED") setNeedsPassword(true)
        else if (["CONFLICT", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION", "RECEIPT_EVIDENCE_REQUIRED"].includes(result.code)) { sessionStorage.removeItem(key); setPending(null); setPreview(null); setNeedsPassword(false) }
        return
      }
      const { replayed, ...record } = result.data, parsed = receiptLedgerRecoveryDecisionSchema.safeParse(record)
      if (!parsed.success || typeof replayed !== "boolean" || record.organizationId !== organizationId || record.actorId !== actorId || record.orderId !== orderId || record.receiptId !== receiptId || record.requestReference !== command.idempotencyKey || record.reviewedRevision !== command.expectedRevision) { setError(t("unknown")); return }
      setDecision(parsed.data); setPreview(null); setPending(null); setNeedsPassword(false)
      try { sessionStorage.removeItem(key) } catch { /* An exact retained request can safely replay. */ }
      onChanged()
    } catch { if (current === generation.current) setError(t("unknown")) }
    finally { if (current === generation.current) { inFlight.current = false; setBusy(false) } }
  }
  const action = "h-auto min-h-11 whitespace-normal", time = (value: string) => new Date(value).toLocaleString(locale)
  function close() { if (!busy) { setOpen(false); setPassword(""); if (!pending) { setPreview(null); setDecision(null) } } }
  return <div className="space-y-2">
    {pending && <p role="status" className="text-sm">{t("pending")}</p>}
    {!open && error && <p role="alert" className="text-sm">{error}</p>}
    <Button ref={trigger} variant="outline" className={`dashboard-button-secondary ${action}`} disabled={busy || disabled} onClick={() => void review()}>{t(pending ? "retry" : "review")}</Button>
    <Dialog open={open} onOpenChange={value => { if (!value) close() }}><DialogContent closeLabel={t("close")} closeDisabled={busy} onCloseAutoFocus={event => { if (trigger.current && !trigger.current.disabled) { event.preventDefault(); trigger.current.focus() } }} onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => { if (busy) event.preventDefault() }} className="dashboard-landing-theme dark dashboard-glass-panel max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 text-[var(--dash-text)] [overflow-wrap:anywhere] [&>*]:min-w-0 sm:p-6 motion-reduce:animate-none">
      <DialogHeader className="pr-8 text-left"><DialogTitle>{t(decision ? "recorded" : pending ? "recoverTitle" : "reviewTitle")}</DialogTitle><DialogDescription>{t("reviewHelp")}</DialogDescription></DialogHeader>
      {busy && <p role="status">{t("working")}</p>}{error && <p role="alert" className="rounded-lg border border-[var(--dash-warning)] p-3"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true"/>{error}</p>}
      {preview && <div className="space-y-3"><p className="text-lg font-medium">{preview.receiptNumber} · {preview.supplierName}</p>{preview.sourceEventId && <p className="text-xl font-semibold">{new Intl.NumberFormat(locale, { style: "currency", currency: preview.currency }).format(Number(preview.value))}</p>}<dl className="grid gap-3 text-sm sm:grid-cols-2">{[[t("effectiveAt"), preview.effectiveAt ? time(preview.effectiveAt) : null], [t("period"), preview.periodName], [t("rule"), preview.ruleCode], [t("journal"), preview.journalCode], [t("source"), preview.sourceEventId], [t("checked"), time(preview.checkedAt)]].map(([label, value]) => <div key={label}><dt className="text-[var(--dash-text-soft)]">{label}</dt><dd className="break-words">{value ?? t("missing")}</dd></div>)}</dl>{preview.blockers.length > 0 && <ul className="space-y-2" aria-label={t("conditions")}>{preview.blockers.map(blocker => <li key={blocker} className="text-[var(--dash-warning)]"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true"/>{t(`blockers.${blocker}`)}</li>)}</ul>}</div>}
      <p className="rounded-lg border border-[var(--dash-border)] p-3 text-sm"><ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden="true"/>{t("preserved")}</p>
      {preview && preview.returns.length > 0 && <section className="space-y-3"><h3 className="font-medium">{t("returnsTitle")}</h3><p className="text-sm">{t("returnsHelp")}</p><ul className="space-y-3">{preview.returns.map(row => <li key={row.returnId} className="space-y-2 rounded-lg border border-[var(--dash-border)] p-3 text-sm"><p className="break-all">{t("returnReference")}: {row.returnId}</p><p>{row.value} {row.currency}</p><p>{t("effectiveAt")}: {time(row.effectiveAt)}</p>{row.accountingRequired === false ? <p className="text-[var(--dash-text-soft)]">{t("noJournalRequired")}</p> : <><p>{t("period")}: {row.periodName ?? t("missing")}</p><p>{t("rule")}: {row.ruleCode ?? t("missing")}</p><p>{t("returnJournal")}: {row.journalCode ?? t("missing")}</p></>}{row.blockers.map(blocker => <p key={blocker} className="text-[var(--dash-warning)]"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true"/>{t(`returnBlockers.${blocker}`)}</p>)}</li>)}</ul></section>}
      {pending && <div className="space-y-2 text-sm"><p>{t("pending")}</p><p className="break-all">{t("request")}: {pending.idempotencyKey}</p></div>}
      {decision && <div role="status" className="space-y-3"><p className={decision.ledgerStatus === "POSTED" ? "text-[var(--dash-success)]" : "text-[var(--dash-warning)]"}>{decision.ledgerStatus === "POSTED" ? <CheckCircle2 className="mr-2 inline h-5 w-5" aria-hidden="true"/> : <AlertTriangle className="mr-2 inline h-5 w-5" aria-hidden="true"/>}{t(decision.ledgerStatus === "POSTED" ? "posted" : "stillBlocked")}</p><p>{decision.receiptNumber}: {decision.value} {decision.currency}</p><p>{t("recordedAt")}: {time(decision.recordedAt)}</p><p className="break-all text-xs">{t("request")}: {decision.requestReference}</p>{decision.journalEntryId && <p className="break-all text-xs">{t("journalReference")}: {decision.journalEntryId}</p>}</div>}
      {!decision && needsPassword && <div><Label htmlFor={passwordId}>{t("password")}</Label><Input id={passwordId} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/><p className="mt-1 text-xs text-[var(--dash-text-soft)]">{t("passwordHelp")}</p></div>}
      {decision && decision.returnOutcomes.length > 0 && <section className="space-y-2"><h3 className="font-medium">{t("returnsRecorded")}</h3><ul className="space-y-2 text-sm">{decision.returnOutcomes.map(row => <li key={row.returnId} className="rounded-lg border border-[var(--dash-border)] p-3"><p className="break-all">{t("returnReference")}: {row.returnId}</p><p>{t("effectiveAt")}: {time(row.effectiveAt)}</p>{row.ledgerStatus === "NOT_REQUIRED" ? <p>{t("noJournalRequired")}</p> : <p className="break-all">{t("journalReference")}: {row.journalEntryId}</p>}</li>)}</ul></section>}
      <div className="flex flex-wrap gap-3 border-t border-[var(--dash-border)] pt-3">{!decision && (pending || preview && !preview.blockers.length) && <Button className={`dashboard-button-primary ${action}`} onClick={() => void submit()} disabled={busy || disabled || needsPassword && !password}>{t(pending ? "retry" : "confirm")}</Button>}{!decision && !pending && !preview && <Button className={`dashboard-button-primary ${action}`} onClick={() => void review()} disabled={busy || disabled}>{t("review")}</Button>}<Button variant="outline" className={`dashboard-button-secondary ${action}`} disabled={busy} onClick={close}>{t("close")}</Button></div>
    </DialogContent></Dialog>
  </div>
}
