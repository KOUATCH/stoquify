"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { previewSuspenseCorrectionAction, proposeSuspenseCorrectionAction, reviewSuspenseCorrectionAction, decideSuspenseCorrectionAction, readSuspenseCorrectionHistoryAction, exportSuspenseCorrectionAction, type PaymentReconciliationDashboardData } from "@/actions/payments/reconciliation.actions"
import { suspenseCorrectionProposalSchema, suspenseCorrectionDecisionSchema, suspenseCorrectionExportSchema } from "@/services/reconciliation/payment-suspense-correction.contracts"
import { downloadCorrectionEvidence } from "@/hooks/payments/correction-export-download"
import { loadSuspenseRecords } from "./PaymentSuspenseHistory"

type Item = PaymentReconciliationDashboardData["suspenseQueue"][number]
type Scope = PaymentReconciliationDashboardData["scope"]
type Data<F extends (...args: never[]) => unknown> = Extract<Awaited<ReturnType<F>>, { success: true }> extends { data: infer T } ? T : never
type Preview = Data<typeof previewSuspenseCorrectionAction>
type Review = Data<typeof reviewSuspenseCorrectionAction>
type History = Data<typeof readSuspenseCorrectionHistoryAction>
const pendingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("proposal"), command: suspenseCorrectionProposalSchema }).strict(),
  z.object({ kind: z.literal("decision"), command: suspenseCorrectionDecisionSchema }).strict(),
  z.object({ kind: z.literal("export"), command: suspenseCorrectionExportSchema }).strict(),
])
const savedSchema = z.object({ reason: z.string().max(2000), reversalDate: z.string().max(10), decisionReason: z.string().max(2000), pending: pendingSchema.nullable() }).strict()
type Saved = z.infer<typeof savedSchema>

export function PaymentSuspenseCorrectionPanel({ scope, initialItem, authority, onClose, onChanged, formatDateTime }: {
  scope: Scope; initialItem: Item; onClose: () => void; onChanged: () => Promise<void>
  authority: { canRead: boolean; canPropose: boolean; canDecide: boolean; canExport?: boolean }
  formatDateTime: (value: string | null | undefined) => string
}) {
  const t = useTranslations("paymentReconciliationWorkbench")
  const storageKey = `stoquify:suspense-correction:v1:${scope.organizationId}:${scope.actorId}:${initialItem.id}`
  // Reuse the parent snapshot: mounting another zero-stale-time permissions observer causes a refetch/unmount loop.
  const ready = authority.canRead
  const allowed = useRef(ready); allowed.current = ready
  const mounted = useRef(false), running = useRef(false), region = useRef<HTMLDivElement>(null)
  const downloadFocus = useRef<HTMLElement | null>(null)
  const [item, setItem] = useState<Item | null>(null), [busy, setBusy] = useState(false), [hydrated, setHydrated] = useState(false)
  const [saved, setSaved] = useState<Saved>({ reason: "", reversalDate: new Date().toISOString().slice(0, 10), decisionReason: "", pending: null })
  const savedRef = useRef(saved), [preview, setPreview] = useState<Preview | null>(null), [review, setReview] = useState<Review | null>(null)
  const [history, setHistory] = useState<History | null>(null), [cursors, setCursors] = useState<Array<History["nextCursor"]>>([null])
  const [notice, setNotice] = useState<{ error: boolean; key: string } | null>(null), [needsAuth, setNeedsAuth] = useState(false)
  const [download, setDownload] = useState<{ receiptId: string; sha256: string } | null>(null)
  useEffect(() => {
    if (!busy && downloadFocus.current) {
      const target = downloadFocus.current; downloadFocus.current = null
      if (mounted.current && allowed.current) (target.isConnected && !target.hasAttribute("disabled") ? target : region.current)?.focus()
    }
  }, [busy])
  const current = () => mounted.current && allowed.current
  function persist(next: Saved) {
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); savedRef.current = next; setSaved(next); return true }
    catch { setNotice({ error: true, key: "storage" }); return false }
  }
  function unwrap<T extends { scope: Scope }>(result: { success: true; data: T } | { success: false; code?: string }) {
    if (!result.success) throw Object.assign(new Error("Correction action failed"), { code: result.code })
    if (!current() || result.data.scope.actorId !== scope.actorId || result.data.scope.organizationId !== scope.organizationId) throw new Error("Scope changed")
    return result.data
  }
  function fail(error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null
    if (code === "FRESH_AUTH_REQUIRED") setNeedsAuth(true)
    setNotice({ error: true, key: code === "FRESH_AUTH_REQUIRED" ? "authRequired" : code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" ? "stale" : code === "FORBIDDEN" || code === "SOD_VIOLATION" ? "denied" : "failed" })
  }
  async function task(work: () => Promise<void>) {
    if (!current() || running.current) return
    running.current = true; setBusy(true); setNotice(null)
    try { await work() } catch (error) { if (current()) fail(error) }
    finally { running.current = false; if (current()) setBusy(false) }
  }
  async function refresh() {
    setPreview(null); setReview(null); setItem(null); setHistory(null)
    const data = await loadSuspenseRecords(scope, { itemId: initialItem.id })
    const records = unwrap(await readSuspenseCorrectionHistoryAction({ suspenseItemId: initialItem.id }))
    if (current()) { setItem(data.items[0]); setHistory(records); setCursors([null]) }
  }
  useEffect(() => {
    mounted.current = true; region.current?.focus()
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) { const value = savedSchema.parse(JSON.parse(raw)); if (value.pending && value.pending.command.suspenseItemId !== initialItem.id) throw new Error("Wrong recovery item"); savedRef.current = value; setSaved(value) }
      setHydrated(true)
    } catch { setNotice({ error: true, key: "storage" }) }
    void task(refresh)
    return () => { mounted.current = false }
    // Parent keys this panel by actor, organization and item. Refresh must never overwrite a draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])
  function edit(patch: Partial<Saved>) { if (!busy && !savedRef.current.pending) { persist({ ...savedRef.current, ...patch }); setPreview(null) } }
  async function submitPending(pending: NonNullable<Saved["pending"]>) {
    if (!persist({ ...savedRef.current, pending })) return
    if (pending.kind === "export") {
      const origin = document.activeElement instanceof HTMLElement && region.current?.contains(document.activeElement) ? document.activeElement : region.current
      const result = unwrap(await exportSuspenseCorrectionAction(pending.command))
      await downloadCorrectionEvidence(result, current)
      if (!current()) return
      // Download handoff can move focus to the browser; restore it after controls re-enable.
      downloadFocus.current = origin
      if (!persist({ ...savedRef.current, pending: null })) return
      setDownload({ receiptId: result.receiptId, sha256: result.sha256 }); setNeedsAuth(false)
      setNotice({ error: false, key: "downloadRequested" }); return
    }
    if (pending.kind === "proposal") unwrap(await proposeSuspenseCorrectionAction(pending.command))
    else unwrap(await decideSuspenseCorrectionAction(pending.command))
    if (!current()) return
    if (!persist({ ...savedRef.current, pending: null })) return
    setNeedsAuth(false)
    // A replay acknowledges its historical decision; only a fresh read establishes today's item status.
    await refresh(); await onChanged()
    if (current()) setNotice({ error: false, key: pending.kind === "proposal" ? "proposalRecorded" : "decisionRecorded" })
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, password = String(new FormData(form).get("password") ?? ""); form.reset()
    await task(async () => { const result = await stepUpWithPasswordAction({ password }); if (!result.success) throw new Error("Authentication failed"); if (current()) { setNeedsAuth(false); setNotice({ error: false, key: "authenticated" }) } })
  }
  async function historyPage(next: Array<History["nextCursor"]>) {
    await task(async () => { const data = unwrap(await readSuspenseCorrectionHistoryAction({ suspenseItemId: initialItem.id, cursor: next[next.length - 1] })); setHistory(data); setCursors(next) })
  }
  function submitProposal() {
    if (!item || !preview) return
    return task(() => submitPending({ kind: "proposal", command: { suspenseItemId: item.id, reason: saved.reason,
      reversalDate: saved.reversalDate, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() } }))
  }
  function submitDecision(decision: "APPROVE" | "REJECT") {
    if (!review) return
    return task(() => submitPending({ kind: "decision", command: { suspenseItemId: initialItem.id, proposalId: review.proposalId,
      expectedRevision: review.revision, decision, reason: saved.decisionReason } }))
  }
  const { canPropose, canDecide, canExport } = authority
  const retryAllowed = saved.pending?.kind === "export" ? canExport : saved.pending?.kind === "proposal" ? canPropose : canDecide
  const independent = !!review && review.proposedById !== scope.actorId && review.originalPostedById !== scope.actorId
  if (!ready) return <p role="status">{t("suspenseWorkflow.recovery.scope")}</p>
  return <div ref={region} tabIndex={-1} role="region" aria-label={t("suspenseCorrection.title")} className="space-y-4 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-surface)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)] [&_button]:h-auto [&_button]:min-h-10 [&_button]:whitespace-normal" onKeyDown={event => { if (event.key === "Escape" && !busy) onClose() }}>
    <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{t("suspenseCorrection.title")}</h4><Button variant="outline" disabled={busy} onClick={onClose}>{t("suspenseCorrection.close")}</Button></div>
    <p className="text-sm text-[var(--dash-text-soft)]">{t("suspenseCorrection.description")}</p><p className="break-all text-xs">{initialItem.id}</p>
    {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-[var(--dash-danger)]" : "text-sm text-[var(--dash-text-soft)]"}>{t(`suspenseCorrection.${notice.key}`)}</p>}
    <Button variant="outline" disabled={busy} onClick={() => task(refresh)}>{t("suspenseCorrection.refresh")}</Button>
    {!item ? <p role="status">{t(busy ? "suspenseCorrection.loading" : "suspenseCorrection.unavailable")}</p> : <p>{t("suspenseCorrection.currentStatus")} <strong>{t(`suspenseWorkflow.states.${item.status}`)}</strong></p>}
    {saved.pending && <div className="space-y-2 rounded border border-[var(--dash-gold)] p-3"><p>{t("suspenseCorrection.pending")}</p><p className="whitespace-pre-wrap break-words text-sm">{saved.pending.kind === "export" ? saved.pending.command.recordId : saved.pending.command.reason}</p><div className="flex flex-wrap gap-2"><Button disabled={busy || needsAuth || !hydrated || !retryAllowed} onClick={() => task(() => submitPending(saved.pending!))}>{t("suspenseCorrection.retry")}</Button><Button variant="outline" disabled={busy} onClick={() => task(async () => { await refresh(); persist({ ...savedRef.current, pending: null }); setNeedsAuth(false) })}>{t("suspenseCorrection.discard")}</Button></div></div>}
    {download && <div className="space-y-1 text-xs"><p className="break-all">{t("suspenseCorrection.exportReceipt")} {download.receiptId}</p><p className="break-all">SHA-256: {download.sha256}</p></div>}
    {item?.status === "POSTED_TO_SUSPENSE" && !saved.pending && <>
      {canPropose ? <div className="space-y-3">
        <div><label className="block text-sm" htmlFor="suspense-correction-reason">{t("suspenseCorrection.reason")}</label><Textarea id="suspense-correction-reason" value={saved.reason} onChange={event => edit({ reason: event.target.value })} maxLength={2000} disabled={busy || !hydrated} className="dashboard-control mt-1" /></div>
        <label className="block text-sm" htmlFor="suspense-correction-date">{t("suspenseCorrection.date")}<Input id="suspense-correction-date" type="date" value={saved.reversalDate} onChange={event => edit({ reversalDate: event.target.value })} disabled={busy || !hydrated} className="dashboard-control mt-1 max-w-xs" /></label>
        <Button variant="outline" disabled={busy || !hydrated || saved.reason.trim().length < 5 || !saved.reversalDate} onClick={() => task(async () => { setReview(null); setPreview(unwrap(await previewSuspenseCorrectionAction({ suspenseItemId: item.id, reason: saved.reason, reversalDate: saved.reversalDate }))) })}>{t("suspenseCorrection.preview")}</Button>
        {preview && <div className="space-y-2 rounded border border-[var(--dash-gold)] p-3"><p className="break-words font-medium">{preview.originalJournalNumber} · {preview.amount} {preview.currencyCode}</p><p>{t("suspenseCorrection.impact", { date: preview.reversalDate })}</p><Button disabled={busy} onClick={submitProposal}>{t("suspenseCorrection.propose")}</Button></div>}
      </div> : <p className="text-sm">{t("suspenseCorrection.proposerRequired")}</p>}
      {item.correctionProposalId && <Button variant="outline" disabled={busy} onClick={() => task(async () => { setPreview(null); setReview(unwrap(await reviewSuspenseCorrectionAction({ suspenseItemId: item.id, proposalId: item.correctionProposalId }))) })}>{t("suspenseCorrection.review")}</Button>}
    </>}
    {review && !saved.pending && <div className="space-y-3 rounded border border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] p-3">
      <h5 className="font-semibold">{t("suspenseCorrection.review")}</h5><p className="break-words">{review.originalJournalNumber} · {review.amount} {review.currencyCode}</p><p className="whitespace-pre-wrap break-words">{review.draft.reason}</p><p>{t("suspenseCorrection.impact", { date: review.draft.reversalDate })}</p>
      <p className="text-sm">{t("suspenseCorrection.independent")}</p>
      {canDecide && independent ? <>
        <div><label className="block text-sm" htmlFor="suspense-correction-decision-reason">{t("suspenseCorrection.decisionReason")}</label><Textarea id="suspense-correction-decision-reason" value={saved.decisionReason} onChange={event => persist({ ...savedRef.current, decisionReason: event.target.value })} disabled={busy} maxLength={2000} className="dashboard-control mt-1" /></div>
        <div className="flex flex-wrap gap-2">{(["APPROVE", "REJECT"] as const).map(decision => <Button key={decision} variant={decision === "APPROVE" ? "default" : "outline"} disabled={busy || needsAuth || !hydrated || saved.decisionReason.trim().length < 5} onClick={() => submitDecision(decision)}>{t(decision === "APPROVE" ? "suspenseCorrection.approve" : "suspenseCorrection.reject")}</Button>)}</div>
      </> : <p>{t("suspenseCorrection.denied")}</p>}
    </div>}
    {needsAuth && <form onSubmit={authenticate} className="space-y-2"><label className="block text-sm" htmlFor="suspense-correction-password">{t("manualMatch.passwordLabel")}<Input id="suspense-correction-password" name="password" type="password" autoComplete="current-password" required disabled={busy} className="dashboard-control mt-1" /></label><Button disabled={busy} type="submit">{t("suspenseWorkflow.review.authenticate")}</Button></form>}
    <section aria-label={t("suspenseCorrection.history")} className="space-y-3 border-t border-[var(--dash-border-subtle)] pt-3"><h5 className="font-semibold">{t("suspenseCorrection.history")}</h5><p className="text-sm">{t("suspenseCorrection.historyHelp")}</p>
      {history && !history.records.length && <p>{t("suspenseCorrection.empty")}</p>}
      <p className="text-sm text-[var(--dash-text-soft)]">{t(canExport ? "suspenseCorrection.exportHelp" : "suspenseCorrection.exportPermission")}</p>
      <ol className="space-y-3">{history?.records.map(record => <li key={record.id} className="space-y-1 rounded border border-[var(--dash-border-subtle)] p-2 text-sm">
        <p className="font-medium">{t(`suspenseCorrection.events.${record.kind}`)}</p><p>{formatDateTime(record.recordedAt)} · {t("suspenseCorrection.cycle", { cycle: record.cycle })}</p><p className="whitespace-pre-wrap break-words">{record.reason}</p><p className="break-all text-xs">{t("suspenseCorrection.record")} {record.id}</p>{record.reversalJournalId && <p className="break-all text-xs">{t("suspenseCorrection.reversalJournal")} {record.reversalJournalId}</p>}
        {canExport && <Button variant="outline" aria-label={t("suspenseCorrection.exportRecord", { record: record.id })} disabled={busy || !!saved.pending || !hydrated} onClick={() => task(() => submitPending({ kind: "export", command: { suspenseItemId: initialItem.id, recordId: record.id, expectedRevision: record.revision, idempotencyKey: crypto.randomUUID() } }))}>{t("suspenseCorrection.export")}</Button>}
      </li>)}</ol>
      {history && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || cursors.length === 1} onClick={() => historyPage(cursors.slice(0, -1))}>{t("suspenseWorkflow.history.previous")}</Button><Button variant="outline" disabled={busy || !history.nextCursor} onClick={() => historyPage([...cursors, history.nextCursor])}>{t("suspenseWorkflow.history.next")}</Button></div>}
    </section>
  </div>
}
