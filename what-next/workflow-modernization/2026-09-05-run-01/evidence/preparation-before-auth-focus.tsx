"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { readReconciliationPreparationAction, previewReconciliationPreparationAction, prepareReconciliationRunAction, previewAdditionalReconciliationSourcesAction, incorporateAdditionalReconciliationSourcesAction } from "@/actions/payments/reconciliation-preparation.actions"
import { reconciliationPreparationSchema, type ReconciliationPreparationCommand, type ReconciliationPreparationQuery } from "@/services/reconciliation/reconciliation-run-preparation.contracts"
import type { readReconciliationPreparation, previewReconciliationPreparation } from "@/services/reconciliation/reconciliation-run-preparation.service"

type Scope = { organizationId: string; actorId: string }
type Page = Awaited<ReturnType<typeof readReconciliationPreparation>>
type History = Extract<Page, { kind: "history" }>
type Preview = Awaited<ReturnType<typeof previewReconciliationPreparation>> | Awaited<ReturnType<typeof import("@/services/reconciliation/reconciliation-additional-sources.service").previewAdditionalReconciliationSources>>
const regionClass = "min-w-0 space-y-3 text-sm [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]"
const draftSchema = z.object({ operation: z.enum(["prepare", "additional"]).default("prepare"), reason: z.string().max(2000), pending: reconciliationPreparationSchema.nullable() }).strict()
function checkScope(value: { scope: Scope }, scope: Scope) {
  if (value.scope.organizationId !== scope.organizationId || value.scope.actorId !== scope.actorId) throw new Error("Workspace changed")
}

export function ReconciliationPreparationWorkbench({ scope, canRead, canReadPreparation, canPrepare, canSign = false, onSign }: { scope: Scope; canRead: boolean; canReadPreparation: boolean; canPrepare: boolean; canSign?: boolean; onSign?: (runId: string) => void }) {
  const t = useTranslations("paymentReconciliationWorkbench.runPreparation"), sign = useTranslations("paymentReconciliationWorkbench.signReview"), locale = useLocale()
  const [open, setOpen] = useState(false), [selected, setSelected] = useState<string | null>(null), [page, setPage] = useState<Extract<Page, { kind: "runs" }> | null>(null)
  const [search, setSearch] = useState(""), [view, setView] = useState<"REVIEW" | "ALL">("REVIEW"), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false)
  const [query, setQuery] = useState<ReconciliationPreparationQuery>({ kind: "runs", search: "", view: "REVIEW" }), [trail, setTrail] = useState<ReconciliationPreparationQuery[]>([])
  const region = useRef<HTMLDivElement>(null), opener = useRef<HTMLButtonElement>(null), mounted = useRef(false), epoch = useRef(0), allowed = useRef(canRead)
  const selectedKey = `stoquify:run-preparation-selection:v1:${scope.organizationId}:${scope.actorId}`
  allowed.current = canRead
  useEffect(() => {
    mounted.current = true
    try { const id = sessionStorage.getItem(selectedKey); if (canReadPreparation && id && id.length <= 191) { setSelected(id); setOpen(true) } } catch { /* Selection is optional; the scoped request draft has its own strict recovery. */ }
    return () => { mounted.current = false }
  }, [selectedKey, canReadPreparation])
  useEffect(() => { if (open && canRead && (!selected || !canReadPreparation)) region.current?.focus() }, [open, canRead, selected, canReadPreparation])
  async function load(next: ReconciliationPreparationQuery, previous: ReconciliationPreparationQuery[] = []) {
    if (!allowed.current) return
    const ticket = ++epoch.current; setBusy(true); setFailed(false); setQuery(next); setTrail(previous)
    try {
      const result = await readReconciliationPreparationAction(next)
      if (!mounted.current || ticket !== epoch.current || !allowed.current) return
      if (!result.success) throw new Error("Read unavailable")
      checkScope(result.data, scope); if (result.data.kind !== "runs") throw new Error("Unexpected page")
      setPage(result.data)
    } catch { if (mounted.current && ticket === epoch.current) setFailed(true) }
    finally { if (mounted.current && ticket === epoch.current) setBusy(false) }
  }
  function select(id: string | null) { try { if (id) sessionStorage.setItem(selectedKey, id); else sessionStorage.removeItem(selectedKey) } catch { /* No authoritative state is stored here. */ } setSelected(id) }
  function close() { epoch.current++; setOpen(false); setBusy(false); select(null); requestAnimationFrame(() => opener.current?.focus()) }
  return <div className="min-w-0 space-y-3 [&_button]:h-auto [&_button]:min-h-10 [&_button]:max-w-full [&_button]:whitespace-normal">
    <Button ref={opener} variant="outline" className="dashboard-button-secondary" disabled={!canRead} onClick={() => { setOpen(true); void load({ kind: "runs", search, view }) }}>{t("open")}</Button>
    {!canRead && <p className="text-sm text-[var(--dash-text-soft)]">{t("readDenied")}</p>}
    {open && canRead && <div className="min-w-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-3 sm:p-4">
      {selected && canReadPreparation ? <PreparationReview key={`${scope.organizationId}:${scope.actorId}:${selected}`} scope={scope} runId={selected} canPrepare={canPrepare}
        canSign={canSign} onSign={onSign}
        onBack={() => { select(null); void load({ kind: "runs", search, view }) }} /> : <div ref={region} role="region" aria-label={t("title")} tabIndex={-1} className={regionClass} aria-busy={busy}>
        <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{t("title")}</h4><Button variant="outline" onClick={close}>{t("close")}</Button></div>
        <p>{t("discoveryDescription")}</p>
        {!canReadPreparation && <p>{t("preparationReadDenied")}</p>}
        <form className="space-y-2" onSubmit={event => { event.preventDefault(); void load({ kind: "runs", search, view }) }}>
          <label htmlFor="preparation-search">{t("searchLabel")}</label><Input id="preparation-search" value={search} maxLength={100} onChange={e => setSearch(e.target.value)} className="dashboard-control" />
          <label htmlFor="preparation-view" className="block">{t("view")}</label><select id="preparation-view" value={view} onChange={e => setView(e.target.value as typeof view)} className="dashboard-control w-full"><option value="REVIEW">{t("reviewRuns")}</option><option value="ALL">{t("allRuns")}</option></select>
          <Button type="submit" variant="outline" disabled={busy}>{t("search")}</Button>
        </form>
        {busy && <p role="status">{t("loading")}</p>}{failed && <div role="alert"><p>{t("failed")}</p><Button variant="outline" disabled={busy} onClick={() => void load(query, trail)}>{t("retryRead")}</Button></div>}
        {page && <><p>{t(failed || busy ? "previousResults" : "asOf", { time: new Date(page.asOf).toLocaleString(locale) })}</p><p>{t("total", { count: page.total })}</p>
          {!page.runs.length && <p>{t("emptyRuns")}</p>}
          <ul className="space-y-2">{page.runs.map(run => <li key={run.id} className="space-y-2 border-b border-[var(--dash-border-subtle)] pb-3"><p className="font-medium">{run.providerName} · {run.currencyCode}</p><p>{new Date(run.businessDate).toLocaleDateString(locale)}</p><p>{t("run", { id: run.id })}</p><p>{t(`states.${run.status}`)}</p>
            <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || failed || !canReadPreparation} onClick={() => select(run.id)}>{t("review")}</Button>
              {run.status === "READY_FOR_SIGNOFF" && onSign && <Button variant="outline" disabled={busy || failed || !canSign} onClick={() => { epoch.current++; setOpen(false); setBusy(false); select(null); onSign(run.id) }}>{sign("open")}</Button>}
            </div></li>)}</ul>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !trail.length} onClick={() => void load(trail[trail.length - 1], trail.slice(0, -1))}>{t("previous")}</Button><Button variant="outline" disabled={busy || failed || !page.nextCursor} onClick={() => void load({ ...query, cursor: page.nextCursor }, [...trail, query])}>{t("next")}</Button></div>
        </>}
      </div>}
    </div>}
  </div>
}

function PreparationReview({ scope, runId, canPrepare, canSign, onSign, onBack }: { scope: Scope; runId: string; canPrepare: boolean; canSign: boolean; onSign?: (runId: string) => void; onBack: () => void }) {
  const t = useTranslations("paymentReconciliationWorkbench.runPreparation"), common = useTranslations("paymentReconciliationWorkbench"), locale = useLocale(), cache = useQueryClient()
  const key = `stoquify:run-preparation:v1:${scope.organizationId}:${scope.actorId}:${runId}`
  const [operation, setOperation] = useState<"prepare" | "additional">("prepare")
  const [history, setHistory] = useState<History | null>(null), [preview, setPreview] = useState<Preview | null>(null), [reason, setReason] = useState(""), [pending, setPending] = useState<ReconciliationPreparationCommand | null>(null)
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [storageFailed, setStorageFailed] = useState(false), [needsAuth, setNeedsAuth] = useState(false), [historyFailed, setHistoryFailed] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null), [trail, setTrail] = useState<ReconciliationPreparationQuery[]>([]), [historyQuery, setHistoryQuery] = useState<ReconciliationPreparationQuery>({ kind: "history", runId })
  const region = useRef<HTMLElement>(null), previewRegion = useRef<HTMLDivElement>(null), historyRegion = useRef<HTMLDivElement>(null), password = useRef<HTMLInputElement>(null), mounted = useRef(false), working = useRef(false)
  function fail(error: unknown) { const code = (error as { code?: string })?.code; if (code === "FRESH_AUTH_REQUIRED") setNeedsAuth(true); setFeedback({ error: true, text: t(code === "FRESH_AUTH_REQUIRED" ? "authRequired" : code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" ? "stale" : code === "FORBIDDEN" ? "writeDenied" : "failed") }) }
  async function perform(work: () => Promise<void>) {
    if (working.current) return; working.current = true; setBusy(true); setFeedback(null)
    try { await work() } catch (error) { if (mounted.current) fail(error) }
    finally { working.current = false; if (mounted.current) setBusy(false) }
  }
  function persist(nextReason: string, request: ReconciliationPreparationCommand | null) {
    try { sessionStorage.setItem(key, JSON.stringify({ operation, reason: nextReason, pending: request })); return true } catch { setStorageFailed(true); return false }
  }
  async function readHistory(query: ReconciliationPreparationQuery = { kind: "history", runId }, previous: ReconciliationPreparationQuery[] = []) {
    try {
      const result = await readReconciliationPreparationAction(query)
      if (!result.success) throw Object.assign(new Error(result.error), { code: result.code })
      checkScope(result.data, scope); if (result.data.kind !== "history" || result.data.run.id !== runId) throw new Error("Run changed")
      if (mounted.current) { setHistory(result.data); setHistoryQuery(query); setTrail(previous); setHistoryFailed(false) }
    } catch (error) { if (mounted.current) setHistoryFailed(true); throw error }
  }
  async function navigateHistory(query: ReconciliationPreparationQuery, previous: ReconciliationPreparationQuery[]) {
    try { await readHistory(query, previous) }
    finally { historyRegion.current?.focus() }
  }
  useEffect(() => {
    mounted.current = true; region.current?.focus()
    try { const raw = sessionStorage.getItem(key); if (raw) { const saved = draftSchema.parse(JSON.parse(raw)); if (saved.pending && (saved.pending.runId !== runId || saved.pending.reason !== saved.reason)) throw new Error("Invalid draft scope"); setOperation(saved.operation); setReason(saved.reason); setPending(saved.pending) } } catch { setStorageFailed(true) }
    setReady(true); void perform(() => readHistory())
    return () => { mounted.current = false }
    // Parent keys by organization, actor and run. Pending requests must survive server refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => { if (preview) previewRegion.current?.focus() }, [preview])
  useEffect(() => { if (needsAuth && !busy) password.current?.focus() }, [needsAuth, busy])
  async function review(next: "prepare" | "additional" = operation) {
    if (pending && next !== operation) return
    setOperation(next); setPreview(null)
    const result = await (next === "additional" ? previewAdditionalReconciliationSourcesAction : previewReconciliationPreparationAction)({ runId })
    if (!result.success) throw Object.assign(new Error(result.error), { code: result.code })
    checkScope(result.data, scope); if (result.data.runId !== runId) throw new Error("Run changed")
    if (mounted.current) setPreview(result.data)
  }
  const actionable = preview && ("canPrepare" in preview ? preview.canPrepare : preview.canIncorporate)
  const moduleWriteUnavailable = preview && "canPrepare" in preview && preview.blocker === "MODULE_WRITE_REQUIRED"
  async function submit() {
    if (!canPrepare || moduleWriteUnavailable || storageFailed || !ready || needsAuth || (!pending && !actionable)) return
    const command = pending ?? reconciliationPreparationSchema.parse({ runId, reason, expectedRevision: preview!.revision, idempotencyKey: crypto.randomUUID() })
    if (!persist(command.reason, command)) return; setPending(command)
    const result = await (operation === "additional" ? incorporateAdditionalReconciliationSourcesAction : prepareReconciliationRunAction)(command)
    if (!result.success) throw Object.assign(new Error(result.error), { code: result.code })
    checkScope(result.data, scope); if (result.data.runId !== runId) throw new Error("Run changed")
    if (!mounted.current) return
    setPreview(null); setNeedsAuth(false)
    if (persist(command.reason, null)) setPending(null)
    setFeedback({ error: false, text: t(operation === "additional" ? "additional.saved" : "saved", { receipt: result.data.receiptId, status: t(`states.${result.data.currentStatus}`) }) })
    try { await readHistory(); await cache.invalidateQueries({ queryKey: ["payment-reconciliation"] }); await cache.invalidateQueries({ queryKey: ["payment-reconciliation-workbench"] }) }
    catch { if (mounted.current) setFeedback({ error: true, text: t(operation === "additional" ? "additional.savedRefreshFailed" : "savedRefreshFailed", { receipt: result.data.receiptId }) }) }
    region.current?.focus()
  }
  async function reset() { await readHistory(); if (!mounted.current) return; if (persist(reason, null)) { setStorageFailed(false); setPending(null); setPreview(null); setNeedsAuth(false); region.current?.focus() } }
  return <section ref={region} tabIndex={-1} aria-label={t(operation === "additional" ? "additional.title" : "reviewTitle")} aria-busy={busy} className={regionClass}>
    <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{t(operation === "additional" ? "additional.title" : "reviewTitle")}</h4><Button variant="outline" disabled={busy} onClick={onBack}>{t("back")}</Button></div>
    <p>{t(operation === "additional" ? "additional.description" : "description")}</p><p>{t("run", { id: runId })}</p>
    {history && <><p className="font-medium">{history.run.providerName} · {history.run.currencyCode}</p><p>{t("currentStatus", { status: t(`states.${history.run.status}`) })}</p><p>{t(historyFailed || busy ? "previousResults" : "asOf", { time: new Date(history.asOf).toLocaleString(locale) })}</p></>}
    {busy && <p role="status">{t("loading")}</p>}{feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "text-[var(--dash-danger)]" : "text-[var(--dash-text)]"}>{feedback.text}</p>}
    {storageFailed && <p role="alert" className="text-[var(--dash-danger)]">{t("storage")}</p>}{!canPrepare && <p>{t("writeDenied")}</p>}
    <label htmlFor={`${runId}-preparation-reason`} className="block">{t("reason")}</label><textarea id={`${runId}-preparation-reason`} value={reason} maxLength={2000} disabled={busy || !!pending || storageFailed || !canPrepare} className="dashboard-control min-h-24 w-full" onChange={e => { if (persist(e.target.value, null)) setReason(e.target.value) }} />
    {pending && <p>{t(operation === "additional" ? "additional.pending" : "pending")}</p>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || (!!pending && operation !== "prepare")} onClick={() => void perform(() => review("prepare"))}>{t("preview")}</Button>
      <Button variant="outline" disabled={busy || !canPrepare || storageFailed || (!!pending && operation !== "additional")} onClick={() => void perform(() => review("additional"))}>{t("additional.preview")}</Button></div>
    {preview && <div ref={previewRegion} role="region" tabIndex={-1} aria-label={t(operation === "additional" ? "additional.preview" : "previewTitle")} className={regionClass}>
      <p>{t("canPrepare" in preview ? (preview.canPrepare ? "ready" : `blockers.${preview.blocker}`) : preview.canIncorporate ? "additional.ready" : "additional.empty")}</p><p>{t("asOf", { time: new Date(preview.asOf).toLocaleString(locale) })}</p>
      {"signedCertificate" in preview && preview.signedCertificate && <div className="space-y-2 rounded-lg border border-[var(--dash-gold)] p-3"><p>{t("additional.signedConsequences")}</p><p>{t("additional.retainedCertificate", { hash: preview.signedCertificate.hash })}</p></div>}
      {preview.counts && <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">{Object.entries(preview.counts).map(([name, count]) => <div key={name}><dt className="text-[var(--dash-text-soft)]">{t(`${operation === "additional" ? "additional.counts" : "counts"}.${name}`)}</dt><dd>{count}</dd></div>)}</dl>}
    </div>}
    {needsAuth && <form className="space-y-2" onSubmit={e => { e.preventDefault(); const form = e.currentTarget, value = String(new FormData(form).get("password") ?? ""); form.reset(); void perform(async () => {
      const result = await stepUpWithPasswordAction({ password: value }); if (!mounted.current) return; if (!result.success) throw new Error("Authentication failed"); setNeedsAuth(false); setFeedback({ error: false, text: common("suspenseWorkflow.review.authenticated") })
    }) }}><label htmlFor={`${runId}-preparation-password`}>{common("manualMatch.passwordLabel")}</label><input ref={password} id={`${runId}-preparation-password`} name="password" type="password" autoComplete="current-password" required disabled={busy} className="dashboard-control w-full" /><Button type="submit" disabled={busy}>{common("suspenseWorkflow.review.authenticate")}</Button></form>}
    <div className="flex flex-wrap gap-2"><Button className="dashboard-button-primary" disabled={busy || !ready || !canPrepare || !!moduleWriteUnavailable || storageFailed || needsAuth || (!pending && (!actionable || reason.trim().length < 5))} onClick={() => void perform(submit)}>{t(operation === "additional" ? (pending ? "additional.retry" : "additional.confirm") : pending ? "retry" : "confirm")}</Button>
      {(pending || storageFailed) && <Button variant="outline" disabled={busy} onClick={() => void perform(reset)}>{t("reset")}</Button>}
      <Button variant="outline" disabled={busy} onClick={() => void perform(() => readHistory())}>{t("refresh")}</Button></div>
    {history?.run.status === "READY_FOR_SIGNOFF" && onSign && <Button variant="outline" disabled={busy || historyFailed || !canSign} onClick={() => onSign(runId)}>{common("signReview.open")}</Button>}
    <div ref={historyRegion} role="region" aria-label={t("history")} tabIndex={-1} className={regionClass}>
    <h5 className="font-semibold">{t("history")}</h5><p>{t("historyExplanation")}</p>{historyFailed && <p role="alert">{t("historyFailed")}</p>}
    {history && <><p>{t("total", { count: history.total })}</p>{!history.records.length && <p>{t("emptyHistory")}</p>}
      <ul className="space-y-3">{history.records.map(record => <li key={record.id} className="space-y-1 border-b border-[var(--dash-border-subtle)] pb-3"><p>{t(record.kind === "ADDITIONAL_SOURCES" ? "additional.receipt" : "receipt", { id: record.id })}</p><p>{new Date(record.recordedAt).toLocaleString(locale)}</p><p>{t(record.kind === "ADDITIONAL_SOURCES" ? "additional.actor" : "actor", { id: record.actorId })}</p><p>{record.reason}</p>{record.retainedCertificateHash && <p>{t("additional.retainedCertificate", { hash: record.retainedCertificateHash })}</p>}</li>)}</ul>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !trail.length} onClick={() => void perform(() => navigateHistory(trail[trail.length - 1], trail.slice(0, -1)))}>{t("previous")}</Button><Button variant="outline" disabled={busy || historyFailed || !history.nextCursor} onClick={() => void perform(() => navigateHistory({ kind: "history", runId, cursor: history.nextCursor }, [...trail, historyQuery]))}>{t("next")}</Button></div>
    </>}
    </div>
  </section>
}
