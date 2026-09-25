"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { readReconciliationExceptionLinkAction, repairReconciliationExceptionLinkAction } from "@/actions/payments/exception-link.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { exceptionLinkRepairSchema, type ExceptionLinkRepair } from "@/services/reconciliation/payment-exception-link.contracts"

type Scope = { organizationId: string; actorId: string }
type Preview = { suspenseItemId: string; exceptionId: string; runId: string; revision: string; state: "LINKED" | "REPAIRABLE"; hasCurrentSignOff: boolean; asOf: string; scope: Scope }
export function PaymentExceptionLinkPanel({ scope, itemId, canRepair, onClose, onChanged }: { scope: Scope; itemId: string; canRepair: boolean; onClose: () => void; onChanged: () => Promise<unknown> }) {
  const t = useTranslations("paymentReconciliationWorkbench.exceptionLink"), common = useTranslations("paymentReconciliationWorkbench")
  const key = `stoquify:exception-link:v1:${scope.organizationId}:${scope.actorId}:${itemId}`
  const panel = useRef<HTMLElement>(null), mounted = useRef(true)
  const [preview, setPreview] = useState<Preview | null>(null), [reason, setReason] = useState(""), [pending, setPending] = useState<ExceptionLinkRepair | null>(null)
  const [busy, setBusy] = useState(false), [storageFailed, setStorageFailed] = useState(false), [ready, setReady] = useState(false), [needsAuth, setNeedsAuth] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null)
  function failure(error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null
    if (code === "FRESH_AUTH_REQUIRED") setNeedsAuth(true)
    setFeedback({ error: true, text: code === "FRESH_AUTH_REQUIRED" ? t("authRequired") : code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" ? t("changed") : t("failed") })
  }
  function verifyScope(value: { scope: Scope }) { if (value.scope.organizationId !== scope.organizationId || value.scope.actorId !== scope.actorId) throw new Error("Workspace changed") }
  function persist(nextReason: string, request: ExceptionLinkRepair | null) {
    try { sessionStorage.setItem(key, JSON.stringify({ reason: nextReason, pending: request })); return true }
    catch { setStorageFailed(true); return false }
  }
  async function load() {
    const result = await readReconciliationExceptionLinkAction({ suspenseItemId: itemId })
    if (!result.success) throw Object.assign(new Error(result.error), { code: result.code })
    verifyScope(result.data); if (mounted.current) setPreview(result.data)
    return result.data
  }
  useEffect(() => {
    mounted.current = true; panel.current?.focus()
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) {
        const saved = JSON.parse(raw)
        if (!saved || typeof saved.reason !== "string" || saved.reason.length > 2000) throw new Error("Invalid local draft")
        const request = saved.pending === null ? null : exceptionLinkRepairSchema.parse(saved.pending)
        if (request && request.suspenseItemId !== itemId) throw new Error("Invalid local scope")
        setReason(saved.reason); setPending(request)
      }
    } catch { setStorageFailed(true) }
    setReady(true); setBusy(true)
    void load().catch(error => { if (mounted.current) failure(error) }).finally(() => { if (mounted.current) setBusy(false) })
    return () => { mounted.current = false }
    // The parent keys this panel by organization, actor and item; reads must preserve the pending command.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  async function refresh(reset = false) {
    setBusy(true); setFeedback(null)
    try { await load(); if (!mounted.current) return; if (reset) { if (!persist(reason, null)) return; setStorageFailed(false); setPending(null); setNeedsAuth(false) } }
    catch (error) { if (mounted.current) { setPreview(null); failure(error) } }
    finally { if (mounted.current) setBusy(false) }
  }
  async function submit() {
    if (!preview || !canRepair || storageFailed || !ready) return
    const command = pending ?? exceptionLinkRepairSchema.parse({ suspenseItemId: itemId, reason, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() })
    if (!persist(reason, command)) return
    setPending(command); setBusy(true); setFeedback(null)
    try {
      const result = await repairReconciliationExceptionLinkAction(command)
      if (!result.success) throw Object.assign(new Error(result.error), { code: result.code })
      verifyScope(result.data); if (!mounted.current) return
      setFeedback({ error: false, text: t("saved", { receipt: result.data.receiptId }) }); setNeedsAuth(false)
      if (persist(reason, null)) setPending(null)
      try { await onChanged(); await load() }
      catch { if (mounted.current) { setPreview(null); setFeedback({ error: true, text: t("savedRefreshFailed", { receipt: result.data.receiptId }) }) } }
    } catch (error) { if (mounted.current) failure(error) }
    finally { if (mounted.current) { setBusy(false); panel.current?.focus() } }
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, password = String(new FormData(form).get("password") ?? ""); form.reset(); setBusy(true)
    try { const result = await stepUpWithPasswordAction({ password }); if (!mounted.current) return; if (!result.success) throw new Error("Authentication failed"); setNeedsAuth(false); setFeedback({ error: false, text: common("suspenseWorkflow.review.authenticated") }) }
    catch { if (mounted.current) setFeedback({ error: true, text: common("suspenseWorkflow.review.authFailed") }) }
    finally { if (mounted.current) setBusy(false) }
  }
  return <section ref={panel} tabIndex={-1} aria-label={t("title")} aria-busy={busy} className="min-w-0 space-y-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">
    <h4 className="font-semibold">{t("title")}</h4><p className="text-sm text-[var(--dash-text-soft)]">{t("description")}</p>
    {feedback && <p role={feedback.error ? "alert" : "status"} className={`break-words text-sm ${feedback.error ? "text-[var(--dash-danger)]" : "text-[var(--dash-text-soft)]"}`}>{feedback.text}</p>}
    {storageFailed && <p role="alert" className="text-sm text-[var(--dash-danger)]">{t("storage")}</p>}{busy && <p role="status">{t("loading")}</p>}
    {preview && <div className="space-y-2 text-sm"><p>{t(preview.state === "LINKED" ? "linked" : "repairable")}</p><p className="break-all">{t("exception", { id: preview.exceptionId })}</p><p className="break-all">{t("run", { id: preview.runId })}</p><p>{t("checked", { at: preview.asOf })}</p>{preview.hasCurrentSignOff && <p className="text-[var(--dash-warning)]">{t("signOff")}</p>}</div>}
    {!canRepair && <p className="text-sm">{t("permission")}</p>}
    {(pending || preview?.state === "REPAIRABLE") && <><label htmlFor={`${itemId}-repair-reason`} className="block text-sm">{t("reason")}</label><textarea id={`${itemId}-repair-reason`} maxLength={2000} value={reason} disabled={busy || !!pending || storageFailed || !canRepair} className="dashboard-control min-h-24 w-full" onChange={event => { const next = event.target.value; if (persist(next, null)) setReason(next) }} /></>}
    {pending && <p className="text-sm">{t("pending")}</p>}
    {needsAuth && <form onSubmit={authenticate} className="space-y-2"><label htmlFor={`${itemId}-repair-password`}>{common("manualMatch.passwordLabel")}</label><input id={`${itemId}-repair-password`} name="password" type="password" autoComplete="current-password" required disabled={busy} className="dashboard-control w-full" /><Button type="submit" disabled={busy}>{common("suspenseWorkflow.review.authenticate")}</Button></form>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void refresh()}>{t("refresh")}</Button>{(pending || storageFailed) && <Button variant="outline" disabled={busy} onClick={() => void refresh(true)}>{t("reset")}</Button>}
      {(pending || preview?.state === "REPAIRABLE") && <Button className="dashboard-button-primary" disabled={busy || !ready || storageFailed || !canRepair || needsAuth || !preview || reason.trim().length < 5} onClick={() => void submit()}>{t(pending ? "retry" : "confirm")}</Button>}
      <Button variant="outline" disabled={busy} onClick={onClose}>{t("close")}</Button></div>
  </section>
}
