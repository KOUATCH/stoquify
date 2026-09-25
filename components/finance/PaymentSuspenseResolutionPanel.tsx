"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import * as actions from "@/actions/payments/suspense-resolution.actions"
import { downloadResolutionEvidence } from "@/hooks/payments/resolution-export-download"
import { suspenseResolutionExportSchema } from "@/services/reconciliation/payment-suspense-resolution.contracts"
import { suspenseResolutionProposalSchema, suspenseResolutionDecisionSchema } from "@/services/reconciliation/payment-suspense-resolution.contracts"
import { suspenseResolutionRecoveryProposalSchema, suspenseResolutionRecoveryDecisionSchema } from "@/services/reconciliation/payment-suspense-resolution-recovery.contracts"

type Data<F extends (...args: never[]) => unknown> = Extract<Awaited<ReturnType<F>>, { success: true }> extends { data: infer T } ? T : never
type Workspace = Data<typeof actions.readSuspenseResolutionWorkspaceAction>
type Candidates = Data<typeof actions.searchSuspenseClearingJournalsAction>
type Preview = { mode: "resolution"; data: Data<typeof actions.previewSuspenseResolutionAction> } | { mode: "recovery"; data: Data<typeof actions.previewSuspenseResolutionRecoveryAction> }
type Review = { mode: "resolution"; data: Data<typeof actions.reviewSuspenseResolutionAction> } | { mode: "recovery"; data: Data<typeof actions.reviewSuspenseResolutionRecoveryAction> }
type Scope = { organizationId: string; actorId: string }
const pendingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("export"), command: suspenseResolutionExportSchema }).strict(),
  z.object({ kind: z.literal("proposal"), command: suspenseResolutionProposalSchema }).strict(),
  z.object({ kind: z.literal("decision"), command: suspenseResolutionDecisionSchema }).strict(),
  z.object({ kind: z.literal("recoveryProposal"), command: suspenseResolutionRecoveryProposalSchema }).strict(),
  z.object({ kind: z.literal("recoveryDecision"), command: suspenseResolutionRecoveryDecisionSchema }).strict(),
])
const savedSchema = z.object({ reason: z.string().max(2000), clearingJournalId: z.string().max(191), outcome: z.enum(["RESOLVED", "WRITTEN_OFF"]), reversalDate: z.string().max(10), decisionReason: z.string().max(2000), pending: pendingSchema.nullable() }).strict()
type Saved = z.infer<typeof savedSchema>
const emptyDraft = (): Saved => ({ reason: "", clearingJournalId: "", outcome: "RESOLVED", reversalDate: new Date().toISOString().slice(0, 10), decisionReason: "", pending: null })

export function PaymentSuspenseResolutionPanel({ scope, itemId, authority, onClose, onChanged, formatDateTime }: {
  scope: Scope; itemId: string; authority: { canRead: boolean; canPropose: boolean; canDecide: boolean; canRecover: boolean; canExport?: boolean }
  onClose: () => void; onChanged: () => Promise<void>; formatDateTime: (value: string | null | undefined) => string
}) {
  const t = useTranslations("paymentReconciliationWorkbench"), locale = useLocale()
  const key = `stoquify:suspense-resolution:v1:${scope.organizationId}:${scope.actorId}:${itemId}`
  const mounted = useRef(false), allowed = useRef(authority.canRead), running = useRef(false), region = useRef<HTMLDivElement>(null)
  allowed.current = authority.canRead
  const current = () => mounted.current && allowed.current
  const [saved, setSaved] = useState<Saved>(emptyDraft), savedRef = useRef(saved)
  const [workspace, setWorkspace] = useState<Workspace | null>(null), [candidates, setCandidates] = useState<Candidates | null>(null), [search, setSearch] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null), [review, setReview] = useState<Review | null>(null), [busy, setBusy] = useState(false), [hydrated, setHydrated] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false), [notice, setNotice] = useState<{ error: boolean; key: string } | null>(null)
  const [storageBlocked, setStorageBlocked] = useState(false)
  const [download, setDownload] = useState<{ receiptId: string; sha256: string } | null>(null), downloadFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!busy && downloadFocus.current) { const target = downloadFocus.current; downloadFocus.current = null; (target.isConnected && !(target as HTMLButtonElement).disabled ? target : region.current)?.focus() }
  }, [busy, download])
  const [historyCursors, setHistoryCursors] = useState<Array<Workspace["nextCursor"]>>([null]), [searchCursors, setSearchCursors] = useState<Array<Candidates["nextCursor"]>>([null])
  function persist(next: Saved, resetUnreadable = false) {
    if (!hydrated && !resetUnreadable) return false
    try { sessionStorage.setItem(key, JSON.stringify(next)); savedRef.current = next; setSaved(next); setStorageBlocked(false); return true }
    catch { setStorageBlocked(true); return false }
  }
  function unwrap<T extends { scope: Scope }>(result: { success: true; data: T } | { success: false; code?: string }) {
    if (!result.success) throw Object.assign(new Error("Resolution action failed"), { code: result.code })
    if (!current() || result.data.scope.actorId !== scope.actorId || result.data.scope.organizationId !== scope.organizationId) throw new Error("Scope changed")
    return result.data
  }
  async function task(work: () => Promise<void>) {
    if (!current() || running.current) return
    running.current = true; setBusy(true); setNotice(null)
    try { await work() } catch (error) {
      if (current()) {
        const code = error && typeof error === "object" && "code" in error ? error.code : null
        if (code === "FRESH_AUTH_REQUIRED") setNeedsAuth(true)
        setNotice({ error: true, key: code === "FRESH_AUTH_REQUIRED" ? "authRequired" : code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" ? "stale" : code === "FORBIDDEN" || code === "SOD_VIOLATION" ? "denied" : "failed" })
      }
    } finally { running.current = false; if (current()) setBusy(false) }
  }
  async function refresh() {
    setPreview(null); setReview(null); setWorkspace(null); setCandidates(null)
    const next = unwrap(await actions.readSuspenseResolutionWorkspaceAction({ suspenseItemId: itemId }))
    if (current()) { setWorkspace(next); setHistoryCursors([null]); setSearchCursors([null]) }
  }
  useEffect(() => {
    mounted.current = true; region.current?.focus()
    try { const raw = sessionStorage.getItem(key); if (raw) { const next = savedSchema.parse(JSON.parse(raw)); if (next.pending && next.pending.command.suspenseItemId !== itemId) throw new Error("Wrong item"); savedRef.current = next; setSaved(next) } setHydrated(true) }
    catch { setStorageBlocked(true) }
    void task(refresh)
    return () => { mounted.current = false }
    // Parent remounts on tenant, actor or item change; authoritative refresh never replaces saved input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  async function resetLocalDraft() {
    // Reconcile server history before the user explicitly discards unreadable local state.
    // This changes only this actor/item browser key; it cannot cancel a server decision.
    await refresh()
    if (current() && persist(emptyDraft(), true)) { setHydrated(true); setNeedsAuth(false); setNotice({ error: false, key: "draftReset" }); region.current?.focus() }
  }
  function edit(patch: Partial<Saved>) { if (!busy && !savedRef.current.pending) { persist({ ...savedRef.current, ...patch }); setPreview(null) } }
  async function submit(pending: NonNullable<Saved["pending"]>) {
    if (!persist({ ...savedRef.current, pending })) return
    if (pending.kind === "export") {
      const origin = document.activeElement instanceof HTMLElement ? document.activeElement : region.current
      const file = unwrap(await actions.exportSuspenseResolutionAction(pending.command))
      await downloadResolutionEvidence(file, current)
      if (!current()) return
      setDownload({ receiptId: file.receiptId, sha256: file.sha256 }); downloadFocus.current = origin
      if (!persist({ ...savedRef.current, pending: null })) return
      setNeedsAuth(false); setNotice({ error: false, key: "downloadRequested" }); return
    }
    if (pending.kind === "proposal") unwrap(await actions.proposeSuspenseResolutionAction(pending.command))
    else if (pending.kind === "decision") unwrap(await actions.decideSuspenseResolutionAction(pending.command))
    else if (pending.kind === "recoveryProposal") unwrap(await actions.proposeSuspenseResolutionRecoveryAction(pending.command))
    else unwrap(await actions.decideSuspenseResolutionRecoveryAction(pending.command))
    if (!current() || !persist({ ...savedRef.current, pending: null })) return
    setNeedsAuth(false); await refresh(); await onChanged()
    if (current()) setNotice({ error: false, key: "recorded" })
  }
  const final = workspace && ["RESOLVED", "WRITTEN_OFF"].includes(workspace.item.status)
  const draft = () => final ? { suspenseItemId: itemId, reason: saved.reason, reversalDate: saved.reversalDate } : { suspenseItemId: itemId, reason: saved.reason, clearingJournalId: saved.clearingJournalId, outcome: saved.outcome }
  async function loadPreview() { setReview(null); if (final) setPreview({ mode: "recovery", data: unwrap(await actions.previewSuspenseResolutionRecoveryAction(draft())) }); else setPreview({ mode: "resolution", data: unwrap(await actions.previewSuspenseResolutionAction(draft())) }) }
  async function loadReview() {
    if (!workspace) return
    setPreview(null)
    if (final) setReview({ mode: "recovery", data: unwrap(await actions.reviewSuspenseResolutionRecoveryAction({ suspenseItemId: itemId, proposalId: workspace.item.recoveryProposalId })) })
    else setReview({ mode: "resolution", data: unwrap(await actions.reviewSuspenseResolutionAction({ suspenseItemId: itemId, proposalId: workspace.item.resolutionProposalId })) })
  }
  async function propose() {
    if (!preview) return
    const common = { suspenseItemId: itemId, reason: saved.reason, expectedRevision: preview.data.revision, idempotencyKey: crypto.randomUUID() }
    await submit(preview.mode === "resolution" ? { kind: "proposal", command: { ...common, clearingJournalId: saved.clearingJournalId, outcome: saved.outcome } } : { kind: "recoveryProposal", command: { ...common, reversalDate: saved.reversalDate } })
  }
  async function decide(decision: "APPROVE" | "REJECT") {
    if (!review) return
    await submit({ kind: review.mode === "resolution" ? "decision" : "recoveryDecision", command: { suspenseItemId: itemId, proposalId: review.data.proposalId, expectedRevision: review.data.revision, decision, reason: saved.decisionReason } })
  }
  async function findJournals(cursors: Array<Candidates["nextCursor"]> = [null]) {
    const data = unwrap(await actions.searchSuspenseClearingJournalsAction({ suspenseItemId: itemId, search, cursor: cursors.at(-1) }))
    setCandidates(data); setSearchCursors(cursors)
  }
  async function historyPage(cursors: Array<Workspace["nextCursor"]>) {
    const data = unwrap(await actions.readSuspenseResolutionWorkspaceAction({ suspenseItemId: itemId, cursor: cursors.at(-1) })); setWorkspace(data); setHistoryCursors(cursors); setPreview(null); setReview(null)
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, password = String(new FormData(form).get("password") ?? ""); form.reset()
    await task(async () => { const result = await stepUpWithPasswordAction({ password }); if (!result.success) throw new Error("Authentication failed"); if (current()) { setNeedsAuth(false); setNotice({ error: false, key: "authenticated" }) } })
  }
  const independent = review && review.data.proposedById !== scope.actorId && (review.mode === "resolution" ? review.data.clearingCreatedById !== scope.actorId : review.data.clearingPostedById !== scope.actorId)
  const canDecide = authority.canDecide && (review?.mode !== "recovery" || authority.canRecover)
  const retryAllowed = saved.pending?.kind === "export" ? authority.canExport : saved.pending?.kind === "proposal" || saved.pending?.kind === "recoveryProposal" ? authority.canPropose : authority.canDecide && (saved.pending?.kind !== "recoveryDecision" || authority.canRecover)
  if (!authority.canRead) return <p role="status">{t("suspenseResolution.denied")}</p>
  return <div ref={region} tabIndex={-1} role="region" aria-label={t("suspenseResolution.title")} className="min-w-0 space-y-4 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-surface)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)] [&_button]:h-auto [&_button]:min-h-10 [&_button]:max-w-full [&_button]:whitespace-normal" onKeyDown={event => { if (event.key === "Escape" && !busy) onClose() }}>
    <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{t("suspenseResolution.title")}</h4><Button variant="outline" disabled={busy} onClick={onClose}>{t("suspenseResolution.close")}</Button></div>
    <p className="text-sm text-[var(--dash-text-soft)]">{t("suspenseResolution.description")}</p><p className="break-all text-xs">{itemId}</p>
    {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-[var(--dash-danger)]" : "text-sm text-[var(--dash-text-soft)]"}>{t(`suspenseResolution.${notice.key}`)}</p>}
    {storageBlocked && <div role="alert" className="space-y-2 text-sm text-[var(--dash-danger)]"><p>{t("suspenseResolution.storage")}</p><p>{t("suspenseResolution.resetDraftHelp")}</p><Button variant="outline" disabled={busy} onClick={() => task(resetLocalDraft)}>{t("suspenseResolution.resetDraft")}</Button></div>}
    <Button variant="outline" disabled={busy} onClick={() => task(refresh)}>{t("suspenseCorrection.refresh")}</Button>
    {!workspace ? <p role="status">{t(busy ? "suspenseCorrection.loading" : "suspenseCorrection.unavailable")}</p> : <p>{t(`suspenseWorkflow.states.${workspace.item.status}`)} · {workspace.item.amount} {workspace.item.currencyCode}</p>}
    {saved.pending && <div className="space-y-2 rounded border border-[var(--dash-gold)] p-3"><p>{t("suspenseCorrection.pending")}</p><p className="whitespace-pre-wrap break-words text-sm">{saved.pending.kind === "export" ? saved.pending.command.recordId : saved.pending.command.reason}</p><div className="flex flex-wrap gap-2"><Button disabled={busy || needsAuth || !hydrated || !retryAllowed} onClick={() => task(() => submit(saved.pending!))}>{t("suspenseCorrection.retry")}</Button><Button variant="outline" disabled={busy} onClick={() => task(async () => { await refresh(); persist({ ...savedRef.current, pending: null }); setNeedsAuth(false) })}>{t("suspenseCorrection.discard")}</Button></div></div>}
    {workspace && !saved.pending && (final || workspace.item.status === "POSTED_TO_SUSPENSE") && <>
      {workspace.item.correctionPending ? <p role="status">{t("suspenseResolution.correctionPending")}</p> : authority.canPropose ? <div className="space-y-3">
        <h5 className="font-semibold">{t(final ? "suspenseResolution.reopen" : "suspenseResolution.resolve")}</h5>
        {!final && <>
          <label className="block text-sm" htmlFor="resolution-journal-search">{t("suspenseResolution.search")}<Input id="resolution-journal-search" value={search} maxLength={120} disabled={busy} onChange={event => { setSearch(event.target.value); setCandidates(null); setSearchCursors([null]) }} className="dashboard-control mt-1" /></label>
          <Button variant="outline" disabled={busy} onClick={() => task(() => findJournals())}>{t("suspenseResolution.find")}</Button><p className="text-sm text-[var(--dash-text-soft)]">{t("suspenseResolution.candidateHelp")}</p>
          {candidates && <><label htmlFor="resolution-clearing" className="block text-sm">{t("suspenseResolution.clearing")}</label><select id="resolution-clearing" className="dashboard-control w-full min-w-0 rounded border p-2" value={saved.clearingJournalId} disabled={busy || !hydrated} onChange={event => edit({ clearingJournalId: event.target.value })}><option value="">{t("suspenseResolution.choose")}</option>{saved.clearingJournalId && !candidates.journals.some(j => j.id === saved.clearingJournalId) && <option value={saved.clearingJournalId}>{t("suspenseResolution.savedSelection")}</option>}{candidates.journals.map(j => <option key={j.id} value={j.id}>{j.number} · {j.reference || j.currency}</option>)}</select>{!candidates.journals.length && <p>{t("suspenseResolution.noJournals")}</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || searchCursors.length === 1} onClick={() => task(() => findJournals(searchCursors.slice(0, -1)))}>{t("suspenseWorkflow.history.previous")}</Button><Button variant="outline" disabled={busy || !candidates.nextCursor} onClick={() => task(() => findJournals([...searchCursors, candidates.nextCursor]))}>{t("suspenseWorkflow.history.next")}</Button></div></>}
          <div><label className="block text-sm" htmlFor="resolution-outcome">{t("suspenseResolution.outcome")}</label><select id="resolution-outcome" className="dashboard-control mt-1 w-full rounded border p-2" value={saved.outcome} disabled={busy || !hydrated} onChange={event => edit({ outcome: event.target.value as Saved["outcome"] })}>{(["RESOLVED", "WRITTEN_OFF"] as const).map(value => <option key={value} value={value}>{t(`suspenseWorkflow.states.${value}`)}</option>)}</select></div>
        </>}
        {final && <label className="block text-sm" htmlFor="resolution-reversal-date">{t("suspenseCorrection.date")}<Input id="resolution-reversal-date" type="date" value={saved.reversalDate} disabled={busy || !hydrated} onChange={event => edit({ reversalDate: event.target.value })} className="dashboard-control mt-1" /></label>}
        <label className="block text-sm" htmlFor="resolution-reason">{t("suspenseResolution.reason")}<Textarea id="resolution-reason" value={saved.reason} maxLength={2000} disabled={busy || !hydrated} onChange={event => edit({ reason: event.target.value })} className="dashboard-control mt-1" /></label>
        <Button variant="outline" disabled={busy || !hydrated || saved.reason.trim().length < 5 || (!final && !saved.clearingJournalId)} onClick={() => task(loadPreview)}>{t("suspenseResolution.preview")}</Button>
        {preview && <div className="space-y-2 rounded border border-[var(--dash-gold)] p-3"><p>{preview.data.amount} {preview.data.currencyCode}</p><p>{t(preview.mode === "recovery" ? "suspenseResolution.recoveryImpact" : "suspenseResolution.impact")}</p>{preview.mode === "resolution" && <p className="break-words">{preview.data.clearingJournal.number} · {preview.data.destination.code} · {locale === "fr" ? preview.data.destination.nameFr || preview.data.destination.nameEn : preview.data.destination.nameEn}</p>}<Button disabled={busy} onClick={() => task(propose)}>{t("suspenseResolution.propose")}</Button></div>}
      </div> : <p>{t("suspenseCorrection.proposerRequired")}</p>}
      {(final ? workspace.item.recoveryProposalId : workspace.item.resolutionProposalId) && <Button variant="outline" disabled={busy} onClick={() => task(loadReview)}>{t("suspenseResolution.review")}</Button>}
    </>}
    {review && !saved.pending && <div className="space-y-3 rounded border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-3"><h5 className="font-semibold">{t("suspenseResolution.review")}</h5><p className="break-words">{review.data.clearingJournalNumber} · {review.data.amount} {review.data.currencyCode}</p><p className="font-medium">{review.mode === "resolution" ? `${t("suspenseResolution.outcome")}: ${t(`suspenseWorkflow.states.${review.data.draft.outcome}`)}` : `${t("suspenseCorrection.date")}: ${review.data.draft.reversalDate}`}</p><p className="whitespace-pre-wrap break-words">{review.data.draft.reason}</p><p>{t(review.mode === "recovery" ? "suspenseResolution.recoveryImpact" : "suspenseResolution.impact")}</p><p className="text-sm">{t("suspenseResolution.independent")}</p>
      {canDecide && independent ? <><label className="block text-sm" htmlFor="resolution-decision-reason">{t("suspenseCorrection.decisionReason")}<Textarea id="resolution-decision-reason" value={saved.decisionReason} maxLength={2000} disabled={busy || !hydrated} onChange={event => persist({ ...savedRef.current, decisionReason: event.target.value })} className="dashboard-control mt-1" /></label><div className="flex flex-wrap gap-2">{(["APPROVE", "REJECT"] as const).map(decision => <Button key={decision} variant={decision === "APPROVE" ? "default" : "outline"} disabled={busy || needsAuth || !hydrated || saved.decisionReason.trim().length < 5} onClick={() => task(() => decide(decision))}>{t(decision === "APPROVE" ? "suspenseResolution.approve" : "suspenseCorrection.reject")}</Button>)}</div></> : <p>{t("suspenseResolution.denied")}</p>}
    </div>}
    {review?.mode === "resolution" && !saved.pending && <p className="break-words text-sm">{review.data.destination.code} · {locale === "fr" ? review.data.destination.nameFr || review.data.destination.nameEn : review.data.destination.nameEn}</p>}
    {needsAuth && <form onSubmit={authenticate} className="space-y-2"><label htmlFor="resolution-password" className="block text-sm">{t("manualMatch.passwordLabel")}<Input id="resolution-password" name="password" type="password" autoComplete="current-password" required disabled={busy} className="dashboard-control mt-1" /></label><Button type="submit" disabled={busy}>{t("suspenseWorkflow.review.authenticate")}</Button></form>}
    {download && <div className="space-y-1 text-xs"><p className="break-all">{t("suspenseResolution.exportReceipt")} {download.receiptId}</p><p className="break-all">SHA-256: {download.sha256}</p></div>}
    <section className="space-y-2 border-t border-[var(--dash-border-subtle)] pt-3" aria-label={t("suspenseResolution.history")}><h5 className="font-semibold">{t("suspenseResolution.history")}</h5>{workspace && <p className="text-xs">{t("suspenseWorkflow.history.asOf")} {formatDateTime(workspace.asOf)}</p>}{workspace && !workspace.history.length && <p>{t("suspenseCorrection.empty")}</p>}<p className="text-sm text-[var(--dash-text-soft)]">{t(authority.canExport ? "suspenseResolution.exportHelp" : "suspenseResolution.exportPermission")}</p><ol className="space-y-2">{workspace?.history.map(record => <li key={record.id} className="space-y-1 rounded border border-[var(--dash-border-subtle)] p-2 text-sm"><p className="font-medium">{t(`suspenseResolution.events.${record.kind}`)}</p><p>{formatDateTime(record.recordedAt)}</p><p className="whitespace-pre-wrap break-words">{record.reason}</p><p className="break-all text-xs">{record.id}</p>{authority.canExport && <Button variant="outline" aria-label={t("suspenseResolution.exportRecord", { record: record.id })} disabled={busy || !!saved.pending || !hydrated} onClick={() => task(() => submit({ kind: "export", command: { suspenseItemId: itemId, recordId: record.id, expectedRevision: record.revision, idempotencyKey: crypto.randomUUID() } }))}>{t("suspenseResolution.export")}</Button>}</li>)}</ol>{workspace && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || historyCursors.length === 1} onClick={() => task(() => historyPage(historyCursors.slice(0, -1)))}>{t("suspenseWorkflow.history.previous")}</Button><Button variant="outline" disabled={busy || !workspace.nextCursor} onClick={() => task(() => historyPage([...historyCursors, workspace.nextCursor]))}>{t("suspenseWorkflow.history.next")}</Button></div>}</section>
  </div>
}
