"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, CheckCircle2, RefreshCw, Send, ShieldCheck, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { usePermissions } from "@/hooks/usePermissions"
import { useResolveSuspenseItem } from "@/hooks/payments/usePaymentReconciliationDashboard"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { PaymentReconciliationDashboardData } from "@/actions/payments/reconciliation.actions"
import { emptySuspenseRecovery, readSuspenseRecovery, saveSuspenseRecovery, suspenseRecoveryKey, type SuspenseDraft, type SuspenseRecovery, type SuspenseApprovalRequest } from "@/hooks/payments/suspense-recovery"
import { PaymentSuspenseHistory, loadSuspenseRecords } from "./PaymentSuspenseHistory"
import { PaymentSuspenseCorrectionPanel } from "./PaymentSuspenseCorrectionPanel"
import { PaymentSuspenseResolutionPanel } from "./PaymentSuspenseResolutionPanel"
import { PaymentExceptionLinkPanel } from "./PaymentExceptionLinkPanel"
import { PaymentExceptionClosurePanel } from "./PaymentExceptionClosurePanel"

type Item = PaymentReconciliationDashboardData["suspenseQueue"][number]
type Draft = SuspenseDraft
const editableStatuses = ["OPEN", "ASSIGNED", "IN_REVIEW", "RESOLUTION_PROPOSED", "REOPENED"]

export function PaymentSuspenseQueue({ authority, scope, items, formatDateTime, t, typeOptions }: {
  authority: ReturnType<typeof usePermissions>
  scope: PaymentReconciliationDashboardData["scope"]
  items: Item[]; money: (value: number | null | undefined) => string
  formatDateTime: (value: string | null | undefined) => string
  t: ReturnType<typeof useTranslations>; typeOptions: readonly string[]
}) {
  const workflow = useResolveSuspenseItem(), { hasPermission, user, organizationId, permissionState } = authority
  const key = suspenseRecoveryKey(scope), activeKey = useRef(key); activeKey.current = key
  const scoped = permissionState === "ready" && user?.id === scope.actorId && organizationId === scope.organizationId && hasPermission("payments.reconciliation.read")
  const locale = useLocale()
  // Approval must show the recorded precision, including fractional XAF/XOF values.
  const amount = (value: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [approval, setApproval] = useState<SuspenseApprovalRequest | null>(null), [hydrated, setHydrated] = useState("")
  const recovery = useRef<SuspenseRecovery>(emptySuspenseRecovery()), restoredReview = useRef(false)
  const [review, setReview] = useState<Item | null>(null)
  const [correction, setCorrection] = useState<Item | null>(null)
  const correctionOpener = useRef<HTMLButtonElement | null>(null)
  const [resolutionItem, setResolutionItem] = useState<Item | null>(null)
  const resolutionOpener = useRef<HTMLButtonElement | null>(null)
  const [linkItem, setLinkItem] = useState<Item | null>(null)
  const linkOpener = useRef<HTMLButtonElement | null>(null)
  const [closureOpen, setClosureOpen] = useState(false)
  const closureOpener = useRef<HTMLButtonElement | null>(null)
  const queueRef = useRef<HTMLElement>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)
  const [selectedStale, setSelectedStale] = useState(false)
  const selectedRef = useRef<HTMLDivElement>(null)
  const historyOpener = useRef<HTMLButtonElement | null>(null)
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false), [authBusy, setAuthBusy] = useState(false), [refreshing, setRefreshing] = useState(false)
  const reviewRef = useRef<HTMLDivElement>(null), opener = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    activeKey.current = key
    setClosureOpen(false)
    setReview(null); setCorrection(null); setResolutionItem(null); setLinkItem(null); setFeedback(null); setNeedsAuth(false); setHistoryOpen(false); setSelected(null); setSelectedStale(false); restoredReview.current = false
    let saved = emptySuspenseRecovery()
    try { saved = readSuspenseRecovery(sessionStorage, scope) } catch { setFeedback({ error: true, message: t("suspenseWorkflow.recovery.storage") }) }
    recovery.current = saved; setDrafts(saved.drafts); setApproval(saved.approval); setHydrated(key)
    return () => { activeKey.current = "" }
    // The key binds organization and actor; translations and read-model refreshes must not overwrite drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => {
    if (!scoped || !approval || restoredReview.current) return
    const current = items.find(item => item.id === approval.suspenseItemId)
    if (current) { restoredReview.current = true; setReview({ ...current }) }
  }, [scoped, approval, items])
  useEffect(() => { if (review) reviewRef.current?.focus() }, [review])
  useEffect(() => { if (selected) selectedRef.current?.focus() }, [selected])
  const busy = workflow.assign.isPending || workflow.propose.isPending || workflow.approve.isPending || authBusy || refreshing
  const base = (item: Item): Draft => ({ targetType: item.type || "OTHER", reason: item.resolutionNotes ?? "", expectedEvidenceRevision: item.evidenceRevision, idempotencyKey: crypto.randomUUID(), suspenseLedgerAccountId: item.suspenseLedgerAccountId })
  function persist(saved: SuspenseRecovery) {
    recovery.current = saved; setDrafts(saved.drafts); setApproval(saved.approval)
    try { saveSuspenseRecovery(sessionStorage, scope, saved); return true }
    catch { setFeedback({ error: true, message: t("suspenseWorkflow.recovery.storage") }); return false }
  }
  function edit(item: Item, patch: Partial<Draft>) {
    persist({ ...recovery.current, drafts: { ...recovery.current.drafts, [item.id]: { ...(recovery.current.drafts[item.id] ?? base(item)), ...patch, idempotencyKey: crypto.randomUUID() } } })
  }
  function fail(error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null
    if (code === "FRESH_AUTH_REQUIRED") setNeedsAuth(true)
    setFeedback({ error: true, message: t(code === "SUSPENSE_CURRENCY_EVIDENCE_REQUIRED" ? "suspenseWorkflow.review.currencyEvidenceRequired" : code === "FRESH_AUTH_REQUIRED" ? "suspenseWorkflow.review.authRequired" : code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" ? "suspenseWorkflow.review.changed" : "suspenseWorkflow.review.failed") })
  }
  async function refresh() {
    const owner = key
    setRefreshing(true)
    try { await workflow.refresh(); if (activeKey.current === owner && await refreshSelected(owner)) setFeedback({ error: false, message: t("suspenseWorkflow.review.refreshed") }) } catch (error) { if (activeKey.current === owner) fail(error) } finally { if (activeKey.current === owner) setRefreshing(false) }
  }
  async function refreshSelected(owner: string, afterWrite = false) {
    if (!selected) return true
    try {
      const data = await loadSuspenseRecords(scope, { itemId: selected.id })
      if (activeKey.current !== owner) return false
      setSelected(data.items[0]); setSelectedStale(false); return true
    } catch {
      if (activeKey.current === owner) { setSelectedStale(true); setFeedback({ error: true, message: t(afterWrite ? "overviewScope.unavailable" : "suspenseWorkflow.history.failed") }) }
      return false
    }
  }
  async function assign(item: Item) {
    if (!scoped) return
    const owner = key
    try { await workflow.assign.mutateAsync({ suspenseItemId: item.id }); if (activeKey.current === owner && await refreshSelected(owner, true)) setFeedback({ error: false, message: t("suspenseWorkflow.notifications.assignedMessage") }) } catch (error) { if (activeKey.current === owner) fail(error) }
  }
  async function resume() {
    if (!scoped || !approval) return
    const owner = key; setRefreshing(true)
    try {
      const data = await loadSuspenseRecords(scope, { itemId: approval.suspenseItemId })
      if (activeKey.current === owner) { restoredReview.current = true; setReview(data.items[0]); setFeedback(null); setNeedsAuth(false) }
    } catch { if (activeKey.current === owner) setFeedback({ error: true, message: t("suspenseWorkflow.history.failed") }) }
    finally { if (activeKey.current === owner) setRefreshing(false) }
  }
  async function propose(item: Item) {
    if (!scoped || hydrated !== key) return
    const owner = key
    const saved = drafts[item.id] ?? base(item), draft = { ...saved, idempotencyKey: saved.idempotencyKey || crypto.randomUUID() }
    if (!persist({ ...recovery.current, drafts: { ...recovery.current.drafts, [item.id]: draft } })) return
    try {
      const result = await workflow.propose.mutateAsync({ suspenseItemId: item.id, ...draft })
      if (activeKey.current !== owner) return
      if (recovery.current.drafts[item.id]?.idempotencyKey === draft.idempotencyKey) { const next = { ...recovery.current.drafts }; delete next[item.id]; persist({ ...recovery.current, drafts: next }) }
      if (await refreshSelected(owner, true)) setFeedback({ error: false, message: t(result.replayed ? "suspenseWorkflow.review.alreadyProposed" : "suspenseWorkflow.notifications.proposedMessage") })
    } catch (error) { if (activeKey.current === owner) fail(error) }
  }
  async function approve() {
    if (!review || !scoped || hydrated !== key || !hasPermission("payments.reconciliation.suspense.post")) return
    const owner = key, command = approval ?? { suspenseItemId: review.id, expectedEvidenceRevision: review.evidenceRevision }
    restoredReview.current = true
    if (!persist({ ...recovery.current, approval: command })) return
    try {
      const result = await workflow.approve.mutateAsync(command)
      if (activeKey.current !== owner) return
      persist({ ...recovery.current, approval: null })
      if (await refreshSelected(owner, true)) setFeedback({ error: false, message: t(result.replayed ? "suspenseWorkflow.review.alreadyPosted" : "suspenseWorkflow.notifications.approvedMessage") })
      setReview(null); setNeedsAuth(false)
    } catch (error) { if (activeKey.current === owner) fail(error) }
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, password = String(new FormData(form).get("password") ?? "")
    const owner = key
    form.reset(); setAuthBusy(true)
    try { const result = await stepUpWithPasswordAction({ password }); if (activeKey.current !== owner) return; if (!result.success) throw new Error("Authentication failed"); setNeedsAuth(false); setFeedback({ error: false, message: t("suspenseWorkflow.review.authenticated") }) } catch { if (activeKey.current === owner) setFeedback({ error: true, message: t("suspenseWorkflow.review.authFailed") }) } finally { if (activeKey.current === owner) setAuthBusy(false) }
  }
  function cancelReview() { setReview(null); setNeedsAuth(false); opener.current?.focus() }
  if (!scoped || hydrated !== key) return <p role="status">{t("suspenseWorkflow.recovery.scope")}</p>
  return <section ref={queueRef} tabIndex={-1} className="min-w-0 space-y-4 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)] [&_button]:h-auto [&_button]:min-h-10 [&_button]:max-w-full [&_button]:whitespace-normal" aria-label={t("suspenseWorkflow.title")}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold">{t("suspenseWorkflow.title")}</h3><p className="mt-1 text-sm text-[var(--dash-text-soft)]">{t("suspenseWorkflow.description")}</p></div>
      <Button variant="outline" className="dashboard-button-secondary" disabled={busy} onClick={refresh}><RefreshCw aria-hidden="true" className="h-4 w-4" />{t("suspenseWorkflow.review.refresh")}</Button>
    </div>
    {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "flex gap-2 text-sm text-[var(--dash-danger)]" : "flex gap-2 text-sm text-[var(--dash-text-soft)]"}>{feedback.error ? <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" /> : <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />}{feedback.message}</p>}
    {approval && <div className="space-y-2 text-sm"><p role="status">{t("suspenseWorkflow.recovery.pending")}</p><p className="break-all">{approval.suspenseItemId}</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={event => { opener.current = event.currentTarget; void resume() }}>{t("suspenseWorkflow.recovery.resume")}</Button><Button variant="outline" disabled={busy} onClick={() => { persist({ ...recovery.current, approval: null }); setReview(null); setNeedsAuth(false) }}>{t("suspenseWorkflow.recovery.discard")}</Button></div></div>}
    <Button variant="outline" disabled={busy} onClick={event => { historyOpener.current = event.currentTarget; setHistoryOpen(true) }}>{t("suspenseWorkflow.history.open")}</Button>
    {hasPermission("accounting.journal.read") && <Button variant="outline" disabled={busy || closureOpen} onClick={event => { closureOpener.current = event.currentTarget; setClosureOpen(true) }}>{t("exceptionClosure.open")}</Button>}
    {closureOpen && hasPermission("accounting.journal.read") && <PaymentExceptionClosurePanel key={key} scope={scope} canDecide={hasPermission("payments.reconciliation.exception.resolve")} formatDateTime={formatDateTime} onChanged={async () => { await workflow.refresh(); await refreshSelected(key, true) }} onClose={() => { setClosureOpen(false); requestAnimationFrame(() => (closureOpener.current?.isConnected ? closureOpener.current : queueRef.current)?.focus()) }} />}
    {historyOpen && <PaymentSuspenseHistory key={key} scope={scope} formatDateTime={formatDateTime} onClose={() => { setHistoryOpen(false); historyOpener.current?.focus() }} onInspect={(item, button) => { opener.current = button; setReview({ ...item }); setFeedback(null); setNeedsAuth(false) }} />}
    {selected && <div ref={selectedRef} tabIndex={-1} role="region" aria-label={t("overviewScope.working")} className="space-y-2 rounded-lg border border-[var(--dash-brand)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]"><h4 className="font-semibold">{t("overviewScope.working")}</h4><p className="break-all text-sm">{selected.id}</p><Button variant="outline" disabled={busy} onClick={() => { setSelected(null); setSelectedStale(false); historyOpener.current?.focus() }}>{t("overviewScope.close")}</Button></div>}
    {!items.length && !selected && <p className="text-sm text-[var(--dash-text-soft)]">{t("suspenseWorkflow.empty")}</p>}
    {(selected ? [selected] : items).map(item => {
      const draft = drafts[item.id] ?? base(item), editable = editableStatuses.includes(item.status) && !selectedStale
      const canPropose = editable && hasPermission("payments.reconciliation.suspense.propose")
      const canApprove = item.status === "RESOLUTION_PROPOSED" && !selectedStale && hasPermission("payments.reconciliation.suspense.post")
      return <article key={item.id} className="space-y-3 rounded-lg border border-[var(--dash-border-subtle)] p-3" aria-label={`${t("suspenseWorkflow.review.item")} ${item.id}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1"><Badge variant="outline" className="dashboard-filter-chip">{t(`suspenseWorkflow.states.${item.status}`)}</Badge><p className="break-all text-xs text-[var(--dash-text-faint)]">{item.id}</p><p className="font-semibold tabular-nums">{amount(item.amount)} · {item.currencyCode}</p><p className="text-sm text-[var(--dash-text-soft)]">{t(`durableSuspenseTypes.${item.type}`)}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || !!linkItem} onClick={event => { linkOpener.current = event.currentTarget; setLinkItem(item) }}>{t("exceptionLink.open")}</Button>
            {["POSTED_TO_SUSPENSE", "RESOLVED", "WRITTEN_OFF"].includes(item.status) && hasPermission("accounting.journal.read") && <Button variant="outline" disabled={busy || !!resolutionItem} onClick={event => { resolutionOpener.current = event.currentTarget; setResolutionItem(item); setCorrection(null) }}>{t("suspenseResolution.open")}</Button>}
            {(item.status === "POSTED_TO_SUSPENSE" || (item.postingCycle ?? 1) > 1) && <Button variant="outline" disabled={busy || !!correction || !!resolutionItem} onClick={event => { correctionOpener.current = event.currentTarget; setCorrection(item) }}>{t("suspenseCorrection.open")}</Button>}
            <Button variant="outline" className="dashboard-button-secondary" disabled={busy || !editable || !hasPermission("payments.reconciliation.exception.assign")} onClick={() => assign(item)}><UserCheck aria-hidden="true" className="h-4 w-4" />{t("suspenseWorkflow.actions.assign")}</Button>
            <Button variant="outline" className="dashboard-button-secondary" disabled={busy || !!approval || !canApprove} onClick={event => { opener.current = event.currentTarget; setReview({ ...item }); setFeedback(null); setNeedsAuth(false) }}><ShieldCheck aria-hidden="true" className="h-4 w-4" />{t("suspenseWorkflow.review.open")}</Button>
          </div>
        </div>
        {!canApprove && <p className="text-xs text-[var(--dash-text-soft)]">{t(item.status === "POSTED_TO_SUSPENSE" ? "suspenseWorkflow.review.posted" : "suspenseWorkflow.review.approvalRequires")}</p>}
        {editable && <div className="grid gap-3 md:grid-cols-[minmax(160px,1fr)_minmax(0,2fr)]">
          <div><label htmlFor={`suspense-type-${item.id}`} className="text-sm">{t("suspenseWorkflow.review.type")}</label><Select disabled={busy || !canPropose} value={draft.targetType} onValueChange={value => edit(item, { targetType: value })}><SelectTrigger id={`suspense-type-${item.id}`} className="dashboard-control mt-1"><SelectValue /></SelectTrigger><SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">{typeOptions.map(option => <SelectItem key={option} value={option}>{t(`durableSuspenseTypes.${option}`)}</SelectItem>)}</SelectContent></Select></div>
          <div><label htmlFor={`suspense-reason-${item.id}`} className="text-sm">{t("suspenseWorkflow.review.reason")}</label><Textarea id={`suspense-reason-${item.id}`} className="dashboard-control mt-1" maxLength={10000} disabled={busy || !canPropose} value={draft.reason} onChange={event => edit(item, { reason: event.target.value })} /></div>
          {draft.expectedEvidenceRevision !== item.evidenceRevision && <p role="status" className="text-sm text-[var(--dash-gold)] md:col-span-2">{t("suspenseWorkflow.review.draftStale")}</p>}
          <div className="flex flex-wrap gap-2 md:col-span-2"><Button disabled={busy || !canPropose || draft.reason.trim().length < 3} onClick={() => propose(item)} className="dashboard-button-primary"><Send aria-hidden="true" className="h-4 w-4" />{t("suspenseWorkflow.actions.propose")}</Button>{drafts[item.id] && <Button variant="outline" disabled={busy} className="dashboard-button-secondary" onClick={() => edit(item, { expectedEvidenceRevision: item.evidenceRevision, suspenseLedgerAccountId: item.suspenseLedgerAccountId })}>{t("suspenseWorkflow.review.rebase")}</Button>}</div>
        </div>}
      </article>
    })}
    {review && <div ref={reviewRef} tabIndex={-1} role="region" aria-label={t("suspenseWorkflow.review.title")} className="space-y-3 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-gold)]" onKeyDown={event => { if (event.key === "Escape" && !busy) cancelReview() }}>
      <h4 className="font-semibold">{t("suspenseWorkflow.review.title")}</h4><p className="text-sm">{t(approval?.suspenseItemId === review.id || review.status === "RESOLUTION_PROPOSED" ? "suspenseWorkflow.review.savedOnly" : "overviewScope.retained")}</p>
      {editableStatuses.includes(review.status) && (hasPermission("payments.reconciliation.suspense.propose") || hasPermission("payments.reconciliation.exception.assign")) && <Button variant="outline" disabled={busy} onClick={() => { setSelected({ ...review }); setSelectedStale(false); setReview(null); setHistoryOpen(false) }}>{t("overviewScope.work")}</Button>}
      {approval && <p className="text-sm">{t("suspenseWorkflow.recovery.currentFacts")}</p>}
      <dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt>{t("suspenseWorkflow.review.item")}</dt><dd className="break-all font-medium">{review.id}</dd></div><div><dt>{t("suspenseWorkflow.review.amount")}</dt><dd className="font-medium">{amount(review.amount)} · {review.currencyCode}</dd></div><div><dt>{t("suspenseWorkflow.review.type")}</dt><dd>{t(`durableSuspenseTypes.${review.type}`)}</dd></div><div><dt>{t("suspenseWorkflow.review.account")}</dt><dd className="break-words">{review.suspenseAccount ? `${review.suspenseAccount.code} · ${locale === "fr" ? review.suspenseAccount.nameFr || review.suspenseAccount.nameEn : review.suspenseAccount.nameEn}` : review.suspenseLedgerAccountId ?? t("common.notAvailable")}</dd></div><div><dt>{t(review.postedAt ? "suspenseWorkflow.history.date" : "suspenseWorkflow.review.date")}</dt><dd>{review.postingDate ? formatDateTime(review.postingDate) : t("suspenseWorkflow.history.missingDate")}</dd></div><div><dt>{t("suspenseWorkflow.review.reason")}</dt><dd className="whitespace-pre-wrap break-words">{review.resolutionNotes}</dd></div>{review.journal && <div><dt>{t("suspenseWorkflow.history.journal")}</dt><dd className="break-all">{review.journal.number} · {review.journal.id}</dd></div>}</dl>
      {needsAuth && <form onSubmit={authenticate} className="space-y-2"><label className="text-sm">{t("manualMatch.passwordLabel")}<Input name="password" type="password" autoComplete="current-password" required autoFocus className="dashboard-control mt-1" /></label><Button type="submit" disabled={busy} className="dashboard-button-secondary">{t("suspenseWorkflow.review.authenticate")}</Button></form>}
      <div className="flex flex-wrap gap-2">{hasPermission("payments.reconciliation.suspense.post") && (approval ? approval.suspenseItemId === review.id : review.status === "RESOLUTION_PROPOSED") && <Button disabled={busy || needsAuth} onClick={approve} className="dashboard-button-primary">{t(approval ? "suspenseWorkflow.history.resume" : "suspenseWorkflow.review.confirm")}</Button>}<Button variant="outline" disabled={busy} onClick={cancelReview} className="dashboard-button-secondary">{t("suspenseWorkflow.review.cancel")}</Button></div>
    </div>}
    {review && !resolutionItem && ["POSTED_TO_SUSPENSE", "RESOLVED", "WRITTEN_OFF"].includes(review.status) && hasPermission("accounting.journal.read") && <Button variant="outline" disabled={busy} onClick={event => { resolutionOpener.current = event.currentTarget; setResolutionItem(review); setCorrection(null) }}>{t("suspenseResolution.open")}</Button>}
    {review && !correction && !resolutionItem && (review.status === "POSTED_TO_SUSPENSE" || (review.postingCycle ?? 1) > 1) && <Button variant="outline" disabled={busy} onClick={event => { correctionOpener.current = event.currentTarget; setCorrection(review) }}>{t("suspenseCorrection.open")}</Button>}
    {resolutionItem && <PaymentSuspenseResolutionPanel key={`${key}:${resolutionItem.id}`} scope={scope} itemId={resolutionItem.id} authority={{ canRead: scoped && hasPermission("accounting.journal.read"), canPropose: hasPermission("payments.reconciliation.suspense.propose"), canDecide: hasPermission("payments.reconciliation.suspense.post"), canRecover: hasPermission("accounting.journal.reverse"), canExport: hasPermission("payments.export") }} formatDateTime={formatDateTime} onChanged={async () => { await workflow.refresh(); await refreshSelected(key, true) }} onClose={() => { setResolutionItem(null); requestAnimationFrame(() => { const opener = resolutionOpener.current; (opener?.isConnected && !opener.disabled ? opener : queueRef.current)?.focus() }) }} />}
    {correction && <PaymentSuspenseCorrectionPanel key={`${key}:${correction.id}`} scope={scope} initialItem={correction} authority={{ canRead: scoped, canPropose: hasPermission("payments.reconciliation.suspense.propose"), canDecide: hasPermission("payments.reconciliation.suspense.post") && hasPermission("accounting.journal.reverse"), canExport: hasPermission("payments.export") }} formatDateTime={formatDateTime} onChanged={async () => { await workflow.refresh(); await refreshSelected(key, true) }} onClose={() => { setCorrection(null); requestAnimationFrame(() => correctionOpener.current?.focus()) }} />}
    {linkItem && <PaymentExceptionLinkPanel key={`${key}:${linkItem.id}`} scope={scope} itemId={linkItem.id} canRepair={hasPermission("payments.reconciliation.run")} onChanged={async () => { await workflow.refresh(); await refreshSelected(key, true) }} onClose={() => { setLinkItem(null); requestAnimationFrame(() => { const opener = linkOpener.current; (opener?.isConnected && !opener.disabled ? opener : queueRef.current)?.focus() }) }} />}
  </section>
}
