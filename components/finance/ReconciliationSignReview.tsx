"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { previewReconciliationSignOffAction, signReviewedReconciliationAction } from "@/actions/payments/reconciliation-sign-review.actions"
import { reconciliationReviewedSignSchema, type ReconciliationReviewedSignCommand } from "@/services/reconciliation/reconciliation-sign-review.contracts"
import type { previewReconciliationSignOff, SignReconciliationRunResult } from "@/services/reconciliation/payment-reconciliation-certification.service"

import styles from "./ReconciliationSignReview.module.css"

type Scope = { organizationId: string; actorId: string }
type Preview = Awaited<ReturnType<typeof previewReconciliationSignOff>>
export type SignedRunForExport = { id: string; status: "SIGNED"; certificateHash: string; signedAt: string }

type SignReviewProps = {
  scope: Scope; runId: string; canSign: boolean; onClose: () => void; onExport: (run: SignedRunForExport) => void
}

export function ReconciliationSignReview(props: SignReviewProps) {
  // Withdraw visible evidence and retire outstanding responses whenever authority changes.
  // Only the scoped uncertain command survives; restored access rereads server evidence.
  return <SignReviewSession key={JSON.stringify([props.scope.organizationId, props.scope.actorId, props.runId, props.canSign])} {...props} />
}

function SignReviewSession({ scope, runId, canSign, onClose, onExport }: SignReviewProps) {
  const t = useTranslations("paymentReconciliationWorkbench.signReview"), common = useTranslations("paymentReconciliationWorkbench"), locale = useLocale(), cache = useQueryClient()
  const key = `stoquify:sign-review:v1:${scope.organizationId}:${scope.actorId}:${runId}`
  const [preview, setPreview] = useState<Preview | null>(null), [pending, setPending] = useState<ReconciliationReviewedSignCommand | null>(null), [signed, setSigned] = useState<SignReconciliationRunResult | null>(null)
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [storageFailed, setStorageFailed] = useState(false), [needsAuth, setNeedsAuth] = useState(false), [feedback, setFeedback] = useState<string | null>(null)
  const primaryAction = useRef<HTMLButtonElement>(null), focusAfterAuthentication = useRef(false)
  const region = useRef<HTMLElement>(null), password = useRef<HTMLInputElement>(null), mounted = useRef(false), working = useRef(false)
  function persist(command: ReconciliationReviewedSignCommand | null) {
    try { if (command) sessionStorage.setItem(key, JSON.stringify(command)); else sessionStorage.removeItem(key); return true }
    catch { setStorageFailed(true); return false }
  }
  async function perform(work: () => Promise<void>, failureMessage?: string) {
    if (working.current) return; working.current = true; setBusy(true); setFeedback(null)
    try { await work() } catch (error) {
      if (mounted.current) {
        const code = (error as { code?: string })?.code
        if (code === "FRESH_AUTH_REQUIRED") setNeedsAuth(true)
        setFeedback(failureMessage ?? t(code === "FRESH_AUTH_REQUIRED" ? "authRequired" : code === "FORBIDDEN" || code === "SOD_VIOLATION" ? "denied" : code === "CONFLICT" || code === "BUSINESS_RULE_VIOLATION" ? "stale" : "failed"))
      }
    } finally { working.current = false; if (mounted.current) setBusy(false) }
  }
  async function review() {
    setPreview(null)
    const result = await previewReconciliationSignOffAction({ runId })
    if (!result.success) throw Object.assign(new Error(result.error ?? "Review failed"), { code: result.code })
    if (result.data.scope.organizationId !== scope.organizationId || result.data.scope.actorId !== scope.actorId || result.data.runId !== runId) throw new Error("Workspace changed")
    if (mounted.current) { setPreview(result.data); region.current?.focus() }
  }
  useEffect(() => {
    mounted.current = true; region.current?.focus()
    try { const raw = sessionStorage.getItem(key); if (raw) { const saved = reconciliationReviewedSignSchema.parse(JSON.parse(raw)); if (saved.runId !== runId) throw new Error("Run changed"); setPending(saved) } } catch { setStorageFailed(true) }
    setReady(true)
    if (canSign) void perform(review)
    return () => { mounted.current = false }
    // Parent keys this review by tenant, actor and run; a pending request survives refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => { if (needsAuth && !busy) password.current?.focus() }, [needsAuth, busy])
  useEffect(() => {
    if (busy || needsAuth || !focusAfterAuthentication.current) return
    focusAfterAuthentication.current = false
    if (primaryAction.current && !primaryAction.current.disabled) primaryAction.current.focus()
    else region.current?.focus()
  }, [busy, needsAuth])
  async function submit() {
    if (!canSign || !ready || storageFailed || needsAuth || preview?.blocker === "MODULE_WRITE_REQUIRED" || (!pending && !preview?.canSign)) return
    const command = pending ?? reconciliationReviewedSignSchema.parse({ runId, expectedSourceVersionHash: preview!.expectedSourceVersionHash, expectedEvidenceRevision: preview!.expectedEvidenceRevision, correlationId: crypto.randomUUID() })
    if (!persist(command)) return; setPending(command)
    const result = await signReviewedReconciliationAction(command)
    if (!result.success) throw Object.assign(new Error(result.error ?? "Sign failed"), { code: result.code })
    if (result.data.runId !== runId || result.data.status !== "SIGNED") throw new Error("Unexpected result")
    if (!mounted.current) return
    setSigned(result.data); setPreview(null); setNeedsAuth(false)
    if (persist(null)) setPending(null)
    try { await cache.invalidateQueries({ queryKey: ["payment-reconciliation"] }); await cache.invalidateQueries({ queryKey: ["payment-reconciliation-workbench"] }) }
    catch { if (mounted.current) setFeedback(t("savedRefreshFailed")) }
    region.current?.focus()
  }
  return <section ref={region} role="region" tabIndex={-1} aria-label={t("title")} aria-busy={busy}
    className={`${styles.root} min-w-0 space-y-3 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-surface)] p-3 text-sm [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)] sm:p-4 [&_button]:h-auto [&_button]:min-h-10 [&_button]:max-w-full [&_button]:whitespace-normal`}>
    <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{t("title")}</h4><Button variant="outline" disabled={busy} onClick={onClose}>{t("close")}</Button></div>
    <p>{t("description")}</p><p>{common("runPreparation.run", { id: runId })}</p>
    {!canSign && <p role="alert">{t("denied")}</p>}{busy && <p role="status">{t("loading")}</p>}{feedback && <p role="alert" className="text-[var(--dash-danger)]">{feedback}</p>}{storageFailed && <p role="alert">{t("storage")}</p>}
    {pending && <p>{t("pending")}</p>}
    {preview && <>
      <p className="font-medium">{preview.provider} · {preview.currencyCode} · {new Date(preview.businessDate).toLocaleDateString(locale)}</p>
      <p>{common("runPreparation.asOf", { time: new Date(preview.asOf).toLocaleString(locale) })}</p>
      <p>{preview.canSign ? t("ready") : preview.blocker === "MODULE_WRITE_REQUIRED" ? t("moduleUnavailable") : preview.blocker === "INDEPENDENT_SIGNER" ? t("independent") : preview.blocker === "PREPARATION_CHANGED" ? t("preparationChanged") : common(`runPreparation.blockers.${preview.blocker}`)}</p>
      {preview.amountSummary ? <div className="space-y-3"><p>{t("amounts.explanation")}</p>{preview.amountSummary.currencies.map(row => <div key={row.currencyCode} className="space-y-2"><h5 className="font-semibold">{row.currencyCode}</h5><dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">{Object.entries(row.amounts).map(([name, value]) => <div key={name}><dt className="text-[var(--dash-text-soft)]">{t(`amounts.${name}`)}</dt><dd>{value === null ? t("amounts.unavailable") : value + " " + row.currencyCode}</dd></div>)}</dl></div>)}</div> : <p>{t("amounts.unavailable")}</p>}
      {preview.counts && <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">{Object.entries(preview.counts).map(([name, count]) => <div key={name}><dt className="text-[var(--dash-text-soft)]">{common(`runPreparation.counts.${name}`)}</dt><dd>{count}</dd></div>)}</dl>}
    </>}
    {needsAuth && <form className="space-y-2" onSubmit={event => { event.preventDefault(); const form = event.currentTarget, value = String(new FormData(form).get("password") ?? ""); form.reset(); void perform(async () => {
      const result = await stepUpWithPasswordAction({ password: value }); if (!mounted.current) return; if (!result.success) throw new Error("Authentication failed"); focusAfterAuthentication.current = true; setNeedsAuth(false)
    }, common("suspenseWorkflow.review.authFailed")) }}><label htmlFor={`${runId}-sign-password`}>{common("manualMatch.passwordLabel")}</label><input ref={password} id={`${runId}-sign-password`} name="password" type="password" autoComplete="current-password" required disabled={busy} className="dashboard-control w-full" /><Button type="submit" disabled={busy}>{common("suspenseWorkflow.review.authenticate")}</Button></form>}
    {!signed && <div className="flex flex-wrap gap-2"><Button ref={primaryAction} className="dashboard-button-primary" disabled={busy || !canSign || !ready || storageFailed || needsAuth || preview?.blocker === "MODULE_WRITE_REQUIRED" || (!pending && !preview?.canSign)} onClick={() => void perform(submit)}>{t(pending ? "retry" : "confirm")}</Button>
      <Button variant="outline" disabled={busy || !canSign} onClick={() => void perform(async () => { await review(); if (mounted.current && persist(null)) { setPending(null); setStorageFailed(false); setNeedsAuth(false) } })}>{t("reviewAgain")}</Button></div>}
    {signed && <div role="status" className="space-y-2"><p>{t(signed.completedByAnotherActor ? "alreadySigned" : "signed", { time: new Date(signed.signedAt).toLocaleString(locale) })}</p><p>{t("certificate", { hash: signed.certificateHash })}</p><Button variant="outline" onClick={() => onExport({ id: runId, status: "SIGNED", signedAt: signed.signedAt, certificateHash: signed.certificateHash })}>{t("export")}</Button></div>}
  </section>
}
