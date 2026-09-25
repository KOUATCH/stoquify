"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import type { OfflineReviewAccess } from "@/hooks/posHooks/useOfflineSync"
import { getOfflineConflictReviewAction, acknowledgeOfflineConflictAction, previewOfflineConflictResolutionAction, resolveOfflineRecordedReplayAction } from "@/actions/pos/offline-review.actions"
import type { previewOfflineConflictResolution } from "@/services/pos/offline-resolution.service"
import type { getOfflineConflictReview } from "@/services/pos/offline-review.service"
import type { OfflineSyncConflictDTO } from "@/services/pos/offline-sync.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { OfflineConflictHistory, OfflineConflictTimeline } from "./OfflineConflictHistory"
import { readReviewNoteDraft, saveReviewNoteDraft } from "./review-note-draft"

type Detail = Awaited<ReturnType<typeof getOfflineConflictReview>>
const reviewButtonClass = "h-auto min-h-10 min-w-0 max-w-full whitespace-normal py-2"
export function OfflineConflictReview({ conflicts, count, access, locationId, terminalId }: { conflicts: OfflineSyncConflictDTO[]; count: number; access: OfflineReviewAccess; locationId?: string; terminalId?: string }) {
  const t = useTranslations("pos.offlineReview"), queryClient = useQueryClient()
  const [detail, setDetail] = useState<Detail | null>(null), [note, setNote] = useState("")
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewOfflineConflictResolution>> | null>(null)
  const [resolved, setResolved] = useState(false)
  const [showHistory, setShowHistory] = useState(false), [draftUnavailable, setDraftUnavailable] = useState(false), [draftRestored, setDraftRestored] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [saved, setSaved] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false), [password, setPassword] = useState(""), [authenticated, setAuthenticated] = useState(false)
  const canRead = access.canRead, canReview = canRead && access.canReview
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  useEffect(() => { detailHeading.current?.focus({ preventScroll: true }); detailHeading.current?.scrollIntoView?.({ block: "start" }) }, [detail?.id])
  useEffect(() => { if (needsAuth) passwordInput.current?.focus() }, [needsAuth])
  function storeNote(id: string, value: string | null) {
    if (!access.organizationId || !access.userId || !canReview) return
    try { setDraftUnavailable(!saveReviewNoteDraft(window.sessionStorage, { organizationId: access.organizationId, userId: access.userId, conflictId: id }, value)) }
    catch { setDraftUnavailable(true) }
  }
  async function load(id: string) {
    setBusy(true); setError(null); setSaved(false); setAuthenticated(false); setPreview(null); setResolved(false)
    try {
      const response = await getOfflineConflictReviewAction({ conflictId: id })
      if (!response.success) { setError(t("failed")); return }
      const editable = ["OPEN", "ACKNOWLEDGED"].includes(response.data.status)
      if (!editable) { setNote(response.data.resolutionNote ?? response.data.note ?? ""); storeNote(id, null); setDraftRestored(false) }
      else if (detail?.id !== id) {
        let restored: string | null = null
        if (canReview && access.organizationId && access.userId) {
          try {
            const draft = readReviewNoteDraft(window.sessionStorage, { organizationId: access.organizationId, userId: access.userId, conflictId: id })
            restored = draft.note; setDraftUnavailable(draft.unavailable)
          } catch { setDraftUnavailable(true) }
        }
        setNote(restored ?? response.data.note ?? ""); setDraftRestored(restored !== null)
      }
      setDetail(response.data)
    } catch { setError(t("failed")) } finally { setBusy(false) }
  }
  async function save() {
    if (!detail || !canReview || busy) return
    setBusy(true); setError(null); setSaved(false); setAuthenticated(false)
    try {
      const response = await acknowledgeOfflineConflictAction({ conflictId: detail.id, expectedRevision: detail.revision, note })
      if (!response.success) { setNeedsAuth(response.code === "FRESH_AUTH_REQUIRED"); setError(t(response.code === "FRESH_AUTH_REQUIRED" ? "freshAuth" : response.code === "CONFLICT" ? "stale" : "failed")); return }
      setDetail(response.data.review); setSaved(true); setPreview(null); storeNote(detail.id, null); setDraftRestored(false)
      await queryClient.invalidateQueries({ queryKey: ["pos-offline-sync"] })
      await queryClient.invalidateQueries({ queryKey: ["pos-offline-history"] })
      await queryClient.invalidateQueries({ queryKey: ["pos-offline-timeline"] })
    } catch { setError(t("failed")) } finally { setBusy(false) }
  }
  async function checkOutcome() {
    if (!detail || !canReview || busy) return
    setBusy(true); setError(null); setSaved(false); setAuthenticated(false); setPreview(null); setResolved(false)
    try {
      const response = await previewOfflineConflictResolutionAction({ conflictId: detail.id })
      if (!response.success) { setError(t("failed")); return }
      setPreview(response.data)
    } catch { setError(t("failed")) } finally { setBusy(false) }
  }
  async function resolve() {
    if (!preview?.eligible || !canReview || busy) return
    setBusy(true); setError(null); setSaved(false); setAuthenticated(false)
    try {
      const response = await resolveOfflineRecordedReplayAction({ conflictId: preview.conflictId, expectedRevision: preview.revision, note })
      if (!response.success) {
        setNeedsAuth(response.code === "FRESH_AUTH_REQUIRED")
        setError(t(response.code === "FRESH_AUTH_REQUIRED" ? "freshAuth" : response.code === "CONFLICT" ? "staleResolution" : "failed"))
        if (response.code === "CONFLICT") setPreview(null)
        return
      }
      setResolved(true); storeNote(preview.conflictId, null); setDraftRestored(false); setPreview(null); setDetail(previous => previous ? { ...previous, status: "RESOLVED", resolutionNote: note } : null)
      await queryClient.invalidateQueries({ queryKey: ["pos-offline-sync"] })
      await queryClient.invalidateQueries({ queryKey: ["pos-offline-history"] })
      await queryClient.invalidateQueries({ queryKey: ["pos-offline-timeline"] })
    } catch { setError(t("failed")) } finally { setBusy(false) }
  }
  async function authenticate() {
    if (!canReview || busy || !password) return
    const value = password; setPassword(""); setBusy(true); setError(null)
    try {
      const response = await stepUpWithPasswordAction({ password: value })
      if (!response.success) { setError(t(response.code === "RATE_LIMITED" ? "authRate" : "authFailed")); return }
      setNeedsAuth(false); setAuthenticated(true)
    } catch { setError(t("authFailed")) } finally { setBusy(false) }
  }
  if (!canRead) return null
  return <section aria-label={t("title")} data-testid="offline-conflict-review" className="min-w-0 scroll-mt-48 space-y-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-4 text-[var(--dash-text)]">
    <h2 className="font-semibold">{t("title")}</h2>
    <p className="text-sm text-[var(--dash-text-soft)]">{t("explanation")}</p>
    {locationId && terminalId ? <Button className={reviewButtonClass} variant="outline" aria-expanded={showHistory} disabled={busy} onClick={() => setShowHistory(value => !value)}>{t(showHistory ? "closeHistory" : "browseHistory")}</Button> : null}
    {showHistory && locationId && terminalId ? <OfflineConflictHistory access={access} locationId={locationId} terminalId={terminalId} onSelect={load} disabled={busy} /> : <>
      <p className="text-sm">{t("showing", { shown: conflicts.length, total: count })}</p>
      {!conflicts.length ? <p>{t("empty")}</p> : <ul className="flex flex-wrap gap-2">{conflicts.map(row => <li key={row.id} className="min-w-0 max-w-full"><Button className={reviewButtonClass} variant="outline" disabled={busy} aria-pressed={detail?.id === row.id} onClick={() => load(row.id)}>{t("open")} · {row.id.slice(-8)}</Button></li>)}</ul>}
    </>}
    {busy || saved || authenticated || resolved ? <p role="status">{t(busy ? "working" : resolved ? "resolved" : saved ? "saved" : "authenticated")}</p> : null}
    {error ? <p role="alert" className="text-[var(--dash-danger)]">{error}</p> : null}
    {needsAuth && canReview ? <form className="space-y-2" onSubmit={event => { event.preventDefault(); void authenticate() }}>
      <label htmlFor="offline-review-password">{t("password")}</label>
      <Input ref={passwordInput} id="offline-review-password" type="password" autoComplete="current-password" value={password} maxLength={1024} onChange={event => setPassword(event.target.value)} disabled={busy} />
      <Button className={reviewButtonClass} type="submit" disabled={busy || !password}>{t("authenticate")}</Button>
    </form> : null}
    {detail ? <div className="min-w-0 space-y-3 [overflow-wrap:anywhere]">
      <h3 ref={detailHeading} tabIndex={-1} className="scroll-mt-48 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{t("reference")} · {detail.id.slice(-8)}</h3>
      <dl className="grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-2 [&>div]:min-w-0">
        <div><dt>{t("device")}</dt><dd>{detail.device}</dd></div>
        <div><dt>{t("status")}</dt><dd>{t(`historyRowStatus.${detail.status}`)}</dd></div>
        <div><dt>{t("reference")}</dt><dd className="break-all">{detail.id}</dd></div>
        <div><dt>{t("event")}</dt><dd className="break-all">{detail.eventId ?? t("none")}</dd></div>
        <div><dt>{t("issue")}</dt><dd>{detail.blockerCode ?? detail.conflictType}</dd></div>
        {detail.reviewedBy ? <div><dt>{t("reviewer")}</dt><dd>{detail.reviewedBy} · {detail.reviewedAt}</dd></div> : null}
        {detail.resolvedAt ? <div><dt>{t("resolvedOn")}</dt><dd>{detail.resolvedAt} · {detail.resolvedById}</dd></div> : null}
      </dl>
      <label className="block text-sm" htmlFor="offline-review-note">{t("note")}</label>
      <textarea id="offline-review-note" value={canReview ? note : detail.resolutionNote ?? detail.note ?? ""} onChange={event => { setNote(event.target.value); storeNote(detail.id, event.target.value) }} maxLength={1000} rows={4} disabled={!canReview || busy || !["OPEN", "ACKNOWLEDGED"].includes(detail.status)} className="w-full rounded-md border border-[var(--dash-border-subtle)] bg-[var(--dash-chrome)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]" />
      {canReview && ["OPEN", "ACKNOWLEDGED"].includes(detail.status) ? <p className="text-sm" aria-live="polite">{t(draftUnavailable ? "draftUnavailable" : draftRestored ? "draftRestored" : "draftScope")}</p> : null}
      {!canReview ? <p>{t("denied")}</p> : null}
      <div className="flex flex-wrap gap-2"><Button className={reviewButtonClass} disabled={!canReview || busy || note.trim().length < 10 || !["OPEN", "ACKNOWLEDGED"].includes(detail.status)} onClick={save}>{t("save")}</Button><Button className={reviewButtonClass} variant="outline" disabled={busy} onClick={() => load(detail.id)}>{t("refresh")}</Button></div>
      {canReview && ["OPEN", "ACKNOWLEDGED"].includes(detail.status) ? <Button className={reviewButtonClass} variant="outline" disabled={busy} onClick={checkOutcome}>{t("checkOutcome")}</Button> : null}
      {preview ? <section aria-label={t("outcomeTitle")} className="space-y-2 rounded-md border border-[var(--dash-border-subtle)] p-[8px] sm:p-3">
        <h4 className="font-medium">{t("outcomeTitle")}</h4>
        <p>{t(`resolutionReason.${preview.reason}`)}</p>
        {preview.eligible ? <>
          <p>{t("recordedSale", { order: preview.orderNumber ?? "", status: t(`saleStatus.${preview.currentSaleStatus ?? "UNKNOWN"}`) })}</p>
          <p>{t("postingReference")} <span className="break-all">{preview.postingBatchId}</span></p>
          <p>{t("remaining", { conflicts: preview.remainingConflicts, events: preview.remainingEvents })}</p>
          <p>{t("resolutionScope")}</p>
          {preview.legalDeliveryBlocked ? <p>{t("deliveryBlocked")}</p> : null}
          <Button className={`${reviewButtonClass} px-[8px]`} disabled={busy || note.trim().length < 10} onClick={resolve}>{t("resolveRecorded")}</Button>
        </> : null}
      </section> : null}
      <OfflineConflictTimeline key={detail.id} access={access} conflictId={detail.id} />
    </div> : null}
  </section>
}
