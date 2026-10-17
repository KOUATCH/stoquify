"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import * as actions from "@/actions/payments/exception-closure.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { exceptionClosureProposalSchema, exceptionClosureDecisionSchema } from "@/services/reconciliation/payment-exception-closure.contracts"

type Scope = { organizationId: string; actorId: string }
type Data<T extends (...args: never[]) => unknown> = Awaited<ReturnType<T>> extends infer R ? R extends { success: true; data: infer D } ? D : never : never
type Cases = Data<typeof actions.listExceptionClosureCasesAction>
type History = Data<typeof actions.readExceptionClosureHistoryAction>
type Preview = Data<typeof actions.previewExceptionClosureAction>
type Review = Data<typeof actions.reviewExceptionClosureAction>
const regionClass = "min-w-0 space-y-3 bg-[var(--dash-surface)] sm:rounded-lg sm:border sm:border-[var(--dash-border-subtle)] sm:p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]"
function unwrap<T extends { scope: Scope }>(result: { success: true; data: T } | { success: false; code?: string }, scope: Scope): T {
  if (!result.success) throw Object.assign(new Error("Exception action failed"), { code: result.code })
  if (result.data.scope.organizationId !== scope.organizationId || result.data.scope.actorId !== scope.actorId) throw new Error("Workspace changed")
  return result.data
}

export function PaymentExceptionClosurePanel({ scope, canDecide, onClose, onChanged, formatDateTime }: {
  scope: Scope; canDecide: boolean; onClose: () => void; onChanged: () => Promise<unknown>; formatDateTime: (value: string | null | undefined) => string
}) {
  const t = useTranslations("paymentReconciliationWorkbench.exceptionClosure"), common = useTranslations("paymentReconciliationWorkbench")
  const key = `stoquify:exception-cases:v1:${scope.organizationId}:${scope.actorId}`
  const panel = useRef<HTMLElement>(null), mounted = useRef(false), running = useRef(false), opener = useRef<HTMLButtonElement | null>(null), returnCaseId = useRef<string | null>(null)
  const [cases, setCases] = useState<Cases | null>(null), [view, setView] = useState<"OPEN" | "ALL">("OPEN"), [cursors, setCursors] = useState<Array<Cases["nextCursor"]>>([null])
  const [selected, setSelected] = useState<string | null>(null), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  async function load(nextView = view, nextCursors: Array<Cases["nextCursor"]> = [null]) {
    if (running.current) return
    running.current = true; setBusy(true); setFailed(false)
    try { const data = unwrap(await actions.listExceptionClosureCasesAction({ view: nextView, cursor: nextCursors.at(-1) }), scope); if (mounted.current) { setCases(data); setView(nextView); setCursors(nextCursors) } }
    catch { if (mounted.current) { setCases(null); setFailed(true) } }
    finally { running.current = false; if (mounted.current) setBusy(false) }
  }
  useEffect(() => {
    mounted.current = true; panel.current?.focus()
    try { const id = sessionStorage.getItem(key); if (id && id.length <= 191) setSelected(id) } catch { /* Individual drafts remain protected by the case panel. */ }
    void load()
    return () => { mounted.current = false }
    // Parent remounts this private panel when organization or actor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  function select(id: string | null) { try { if (id) sessionStorage.setItem(key, id); else sessionStorage.removeItem(key) } catch { /* No command is issued by selection. */ } setSelected(id) }
  return <section ref={panel} tabIndex={-1} aria-label={t("title")} className={regionClass}>
    <h4 className="font-semibold">{t("title")}</h4><p className="text-sm text-[var(--dash-text-soft)]">{t("description")}</p>
    {!selected && <>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} aria-pressed={view === "OPEN"} onClick={() => void load("OPEN")}>{t("openCases")}</Button><Button variant="outline" disabled={busy} aria-pressed={view === "ALL"} onClick={() => void load("ALL")}>{t("allCases")}</Button><Button variant="outline" disabled={busy} onClick={() => void load()}>{t("refresh")}</Button></div>
      {busy && <p role="status">{t("loading")}</p>}{failed && <p role="alert" className="text-[var(--dash-danger)]">{t("failed")}</p>}
      {cases && <><p className="text-sm">{t("coverage", { count: cases.items.length, total: cases.total })} · {t("checked", { at: formatDateTime(cases.asOf) })}</p>
        {!cases.items.length && <p>{t("empty")}</p>}
        {cases.items.map(item => <article key={item.id} aria-label={t("case", { id: item.id })} className="min-w-0 space-y-2 rounded-lg border border-[var(--dash-border-subtle)] p-3">
          <p className="font-medium">{common(`manualMatch.exceptionTypes.${item.type}`)}</p><p>{t(`states.${item.status}`)}</p><p className="break-all text-xs">{item.id}</p>
          <p className="text-sm text-[var(--dash-text-soft)]">{t(item.closurePath === "FINANCIAL_REVIEW" ? "financialPath" : item.closurePath === "SOURCE_REVIEW" ? "sourcePath" : "investigation")}</p>
          <Button ref={node => { if (node && returnCaseId.current === item.id) opener.current = node }} variant="outline" disabled={busy} onClick={event => { returnCaseId.current = item.id; opener.current = event.currentTarget; select(item.id) }}>{t("inspect")}</Button>
        </article>)}
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || cursors.length < 2} onClick={() => void load(view, cursors.slice(0, -1))}>{t("previous")}</Button><Button variant="outline" disabled={busy || !cases.nextCursor} onClick={() => void load(view, [...cursors, cases.nextCursor])}>{t("next")}</Button></div></>}
    </>}
    {selected && <ExceptionCase key={`${key}:${selected}`} scope={scope} exceptionId={selected} canDecide={canDecide} formatDateTime={formatDateTime} onChanged={async () => { await onChanged(); await load(view, cursors) }} onBack={() => { select(null); requestAnimationFrame(() => (opener.current?.isConnected ? opener.current : panel.current)?.focus()) }} />}
    {!selected && <Button variant="outline" disabled={busy} onClick={onClose}>{t("close")}</Button>}
  </section>
}

function SourceReviewEvidence({ source }: { source: Preview["sourceReview"] }) {
  const t = useTranslations("paymentReconciliationWorkbench.exceptionClosure")
  if (!source) return null
  return <div className="space-y-2 text-sm"><p>{t("sourceEvidence", { amount: source.amount, currency: source.currencyCode })}</p><p className="break-all">{t("sourceIdentity", { source: source.sourceId, match: source.matchId, payment: source.paymentId })}</p><p>{t("sourceConsequences")}</p></div>
}

function WithdrawalEvidence({ withdrawal }: { withdrawal: NonNullable<Preview["withdrawal"]> }) {
  const t = useTranslations("paymentReconciliationWorkbench.exceptionClosure")
  return <div className="space-y-2 text-sm"><p className="break-words">{t("withdrawalEvidence", { id: withdrawal.decisionId })}</p><p>{t("withdrawalConsequences")}</p>{withdrawal.priorCertificateHash && <p className="break-all">{t("withdrawalCertificate", { hash: withdrawal.priorCertificateHash })}</p>}</div>
}

const pendingSchema = z.discriminatedUnion("kind", [z.object({ kind: z.literal("proposal"), command: exceptionClosureProposalSchema }).strict(), z.object({ kind: z.literal("decision"), command: exceptionClosureDecisionSchema, purpose: z.literal("REOPEN_SOURCE").optional() }).strict()])
const draftSchema = z.object({ reason: z.string().max(2000), decisionReason: z.string().max(2000), pending: pendingSchema.nullable() }).strict()
type Draft = z.infer<typeof draftSchema>
const emptyDraft = (): Draft => ({ reason: "", decisionReason: "", pending: null })
function ExceptionCase({ scope, exceptionId, canDecide, onBack, onChanged, formatDateTime }: {
  scope: Scope; exceptionId: string; canDecide: boolean; onBack: () => void; onChanged: () => Promise<unknown>; formatDateTime: (value: string | null | undefined) => string
}) {
  const t = useTranslations("paymentReconciliationWorkbench.exceptionClosure"), common = useTranslations("paymentReconciliationWorkbench")
  const key = `stoquify:exception-closure:v1:${scope.organizationId}:${scope.actorId}:${exceptionId}`
  const panel = useRef<HTMLElement>(null), mounted = useRef(false), running = useRef(false)
  const previewRegion = useRef<HTMLDivElement>(null), reviewRegion = useRef<HTMLDivElement>(null), passwordInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft), draftRef = useRef(draft)
  const [history, setHistory] = useState<History | null>(null), [cursors, setCursors] = useState<Array<History["nextCursor"]>>([null])
  const [preview, setPreview] = useState<Preview | null>(null), [review, setReview] = useState<Review | null>(null)
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [storageFailed, setStorageFailed] = useState(false), [needsAuth, setNeedsAuth] = useState(false)
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null)
  useEffect(() => { if (preview) previewRegion.current?.focus() }, [preview])
  useEffect(() => { if (review) reviewRegion.current?.focus() }, [review])
  useEffect(() => { if (needsAuth && !busy) passwordInput.current?.focus() }, [needsAuth, busy])
  function persist(value: Draft) { try { sessionStorage.setItem(key, JSON.stringify(value)); draftRef.current = value; setDraft(value); setStorageFailed(false); return true } catch { setStorageFailed(true); return false } }
  async function task(work: () => Promise<void>) {
    if (!mounted.current || running.current) return
    running.current = true; setBusy(true); setNotice(null)
    try { await work() } catch (error) {
      if (mounted.current) {
        const code = error && typeof error === "object" && "code" in error ? error.code : null
        if (code === "FRESH_AUTH_REQUIRED") setNeedsAuth(true)
        setNotice({ error: true, text: t(code === "FRESH_AUTH_REQUIRED" ? "authRequired" : code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" ? "stale" : code === "REVIEW_REQUIRED" ? "investigation" : code === "FORBIDDEN" || code === "SOD_VIOLATION" ? "denied" : "failed") })
      }
    } finally { running.current = false; if (mounted.current) setBusy(false) }
  }
  async function load(nextCursors: Array<History["nextCursor"]> = [null]) {
    setHistory(null); setPreview(null); setReview(null)
    const data = unwrap(await actions.readExceptionClosureHistoryAction({ exceptionId, cursor: nextCursors.at(-1) }), scope)
    if (mounted.current) { setHistory(data); setCursors(nextCursors) }
  }
  useEffect(() => {
    mounted.current = true; panel.current?.focus()
    try { const raw = sessionStorage.getItem(key); if (raw) { const saved = draftSchema.parse(JSON.parse(raw)); if (saved.pending && saved.pending.command.exceptionId !== exceptionId) throw new Error("Wrong case"); draftRef.current = saved; setDraft(saved) } setReady(true) } catch { setStorageFailed(true) }
    void task(() => load())
    return () => { mounted.current = false }
    // Restoring drafts never sends a write. Scope changes cause a parent remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  function edit(value: Partial<Draft>) { if (!busy && ready && !storageFailed && !draftRef.current.pending) { persist({ ...draftRef.current, ...value }); setPreview(null) } }
  async function submit(pending: NonNullable<Draft["pending"]>) {
    if (!canDecide || !ready || storageFailed || !persist({ ...draftRef.current, pending })) return
    const result = pending.kind === "proposal" ? unwrap(await actions.proposeExceptionClosureAction(pending.command), scope) : unwrap(await actions.decideExceptionClosureAction(pending.command), scope)
    if (!mounted.current) return
    const id = "proposalId" in result ? result.proposalId : result.receiptId
    setNeedsAuth(false); persist({ ...draftRef.current, pending: null }); setPreview(null); setReview(null)
    setNotice({ error: false, text: t("recorded", { id }) })
    try { await load(); await onChanged() } catch { if (mounted.current) { setHistory(null); setNotice({ error: true, text: t("recordedRefreshFailed", { id }) }) } }
    panel.current?.focus()
  }
  async function reset() {
    await load()
    if (mounted.current && persist({ ...emptyDraft(), reason: draftRef.current.reason, decisionReason: draftRef.current.decisionReason })) { setReady(true); setNeedsAuth(false); setNotice({ error: false, text: t("resetDone") }) }
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, password = String(new FormData(form).get("password") ?? ""); form.reset()
    await task(async () => { const result = await stepUpWithPasswordAction({ password }); if (!result.success) throw new Error("Authentication failed"); if (mounted.current) { setNeedsAuth(false); setNotice({ error: false, text: t("authenticated") }) } })
  }
  const withdrawing = history?.exception.canWithdrawSourceDecision === true
  const disabled = busy || !ready || storageFailed || !canDecide || !!draft.pending
  return <section ref={panel} tabIndex={-1} aria-label={t("case", { id: exceptionId })} className={regionClass} aria-busy={busy}>
    <h5 className="break-all font-semibold">{t("case", { id: exceptionId })}</h5>
    {notice && <p role={notice.error ? "alert" : "status"} className={`break-words text-sm ${notice.error ? "text-[var(--dash-danger)]" : "text-[var(--dash-text-soft)]"}`}>{notice.text}</p>}
    {storageFailed && <p role="alert">{t("storage")}</p>}{busy && <p role="status">{t("loading")}</p>}
    {!canDecide && <p>{t("denied")}</p>}
    {history && <><p>{t("currentState", { state: t(`states.${history.exception.status}`) })}</p><p>{common(`manualMatch.exceptionTypes.${history.exception.type}`)}</p><p className="text-sm">{t("checked", { at: formatDateTime(history.asOf) })}</p>
      <p className="text-sm text-[var(--dash-text-soft)]">{t(withdrawing ? "withdrawalConsequences" : "consequences")}</p>
      <label className="block text-sm" htmlFor={`${exceptionId}-closure-reason`}>{t(withdrawing ? "withdrawalReason" : "reason")}</label><Textarea id={`${exceptionId}-closure-reason`} className="dashboard-control" value={draft.reason} disabled={disabled} maxLength={2000} onChange={event => edit({ reason: event.target.value })} />
      <Button variant="outline" disabled={disabled || draft.reason.trim().length < 5} onClick={() => void task(async () => { setPreview(null); setReview(null); const data = unwrap(await actions.previewExceptionClosureAction({ exceptionId, ...(withdrawing ? { purpose: "REOPEN_SOURCE" } : {}) }), scope); if (mounted.current) setPreview(data) })}>{t(withdrawing ? "withdrawalPreview" : "preview")}</Button>
      {preview && <div ref={previewRegion} role="region" tabIndex={-1} aria-label={t("preview")} className="space-y-2 rounded-lg border border-[var(--dash-gold)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{preview.withdrawal ? <WithdrawalEvidence withdrawal={preview.withdrawal} /> : <SourceReviewEvidence source={preview.sourceReview} />}{preview.financialDecisionId && <><p>{t("financialEvidence", { id: preview.financialDecisionId })}</p><p>{common(`suspenseWorkflow.states.${preview.financialOutcome}`)}</p></>}<p>{t(preview.canPropose ? preview.withdrawal ? "withdrawalHint" : "proposalHint" : "alreadyClosed")}</p>
        <Button className="dashboard-button-primary" disabled={disabled || !preview.canPropose || needsAuth} onClick={() => void task(() => submit({ kind: "proposal", command: { exceptionId, reason: draft.reason, expectedRevision: preview.revision, ...(preview.purpose ? { purpose: preview.purpose } : {}), idempotencyKey: crypto.randomUUID() } }))}>{t(preview.withdrawal ? "withdrawalPropose" : "propose")}</Button></div>}
      <h6 className="font-semibold">{t("history")}</h6><p className="text-sm">{t("historyHint")}</p><p className="text-sm">{t("coverage", { count: history.items.length, total: history.total })}</p>
      {!history.items.length && <p>{t("noHistory")}</p>}
      {history.items.map(row => <article key={row.id} className="space-y-2 rounded-lg border border-[var(--dash-border-subtle)] p-3">
        <p className="font-medium">{t(row.purpose === "REOPEN_SOURCE" ? `withdrawalRecords.${row.kind}` : `records.${row.kind}`)}</p><p className="break-all text-xs">{row.id}</p><p className="text-sm">{formatDateTime(row.at)}</p><p className="break-all text-sm">{t("actor", { id: row.actorId })}</p><p className="whitespace-pre-wrap break-words text-sm">{row.reason}</p>
        {row.requiresCurrentReview && <Button variant="outline" disabled={disabled} onClick={() => void task(async () => { setPreview(null); setReview(null); const data = unwrap(await actions.reviewExceptionClosureAction({ exceptionId, proposalId: row.id }), scope); if (mounted.current) setReview(data) })}>{t("review")}</Button>}
      </article>)}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || cursors.length < 2} onClick={() => void task(() => load(cursors.slice(0, -1)))}>{t("previous")}</Button><Button variant="outline" disabled={busy || !history.nextCursor} onClick={() => void task(() => load([...cursors, history.nextCursor]))}>{t("next")}</Button></div>
    </>}
    {review && <div ref={reviewRegion} role="region" tabIndex={-1} aria-label={t("review")} className="space-y-2 rounded-lg border border-[var(--dash-gold)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]"><h6 className="font-semibold">{t("review")}</h6><p className="whitespace-pre-wrap break-words">{review.reason}</p>{review.withdrawal ? <WithdrawalEvidence withdrawal={review.withdrawal} /> : <SourceReviewEvidence source={review.sourceReview} />}{review.financialDecisionId && <p className="break-all text-sm">{t("financialEvidence", { id: review.financialDecisionId })}</p>}<p>{t(review.withdrawal ? "withdrawalIndependent" : review.sourceReview ? "sourceIndependent" : "independent")}</p>
      <label htmlFor={`${exceptionId}-closure-decision`}>{t("decisionReason")}</label><Textarea id={`${exceptionId}-closure-decision`} className="dashboard-control" maxLength={2000} value={draft.decisionReason} disabled={disabled} onChange={event => edit({ decisionReason: event.target.value })} />
      <div className="flex flex-wrap gap-2">{(["APPROVE", "REJECT"] as const).map(decision => <Button key={decision} variant="outline" disabled={disabled || needsAuth || draft.decisionReason.trim().length < 5 || scope.actorId === review.proposedById || (decision === "APPROVE" && (scope.actorId === review.runMakerId || (review.withdrawal?.excludedApproverIds ?? review.sourceReview?.excludedApproverIds)?.includes(scope.actorId)))} onClick={() => void task(() => submit({ kind: "decision", ...(review.purpose ? { purpose: review.purpose } : {}), command: { exceptionId, proposalId: review.proposalId, expectedRevision: review.revision, decision, reason: draft.decisionReason } }))}>{t(decision === "APPROVE" ? review.withdrawal ? "withdrawalApprove" : "approve" : "reject")}</Button>)}</div>
    </div>}
    {draft.pending && <div className="space-y-2"><p>{t("pending")}</p><p className="font-medium">{t("requestOperation", { operation: t(draft.pending.kind === "proposal" ? draft.pending.command.purpose ? "withdrawalPropose" : "propose" : draft.pending.command.decision === "APPROVE" ? draft.pending.purpose ? "withdrawalApprove" : "approve" : "reject") })}</p><p className="whitespace-pre-wrap break-words">{draft.pending.command.reason}</p><Button disabled={busy || !ready || storageFailed || !canDecide || needsAuth} onClick={() => void task(() => submit(draft.pending!))}>{t("retry")}</Button></div>}
    {needsAuth && <form onSubmit={authenticate} className="space-y-2"><label htmlFor={`${exceptionId}-closure-password`}>{common("manualMatch.passwordLabel")}</label><Input ref={passwordInput} id={`${exceptionId}-closure-password`} name="password" type="password" autoComplete="current-password" required disabled={busy} className="dashboard-control" /><Button type="submit" disabled={busy}>{common("suspenseWorkflow.review.authenticate")}</Button></form>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void task(() => load())}>{t("refresh")}</Button>{(draft.pending || storageFailed) && <Button variant="outline" disabled={busy} onClick={() => void task(reset)}>{t("reset")}</Button>}<Button variant="outline" disabled={busy} onClick={onBack}>{t("back")}</Button></div>
  </section>
}
