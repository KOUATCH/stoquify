"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { PaymentReconciliationDashboardData, exportReconciliationCertificateAction } from "@/actions/payments/reconciliation.actions"
import { reconciliationCertificateExportSchema, type ReconciliationCertificateExportCommand } from "@/services/reconciliation/reconciliation-certificate-export.contracts"
import { downloadVerifiedEvidence } from "@/hooks/payments/verified-evidence-download"

type Scope = PaymentReconciliationDashboardData["scope"]
type Result = Extract<Awaited<ReturnType<typeof exportReconciliationCertificateAction>>, { success: true }>["data"]
type Run = Pick<PaymentReconciliationDashboardData["recentRuns"][number], "id" | "status" | "certificateHash" | "signedAt">
export function ReconciliationCertificateExportPanel({ scope, run, recoveryRequest, canRead, canExport, onExport, onClose }: {
  scope: Scope; run: Run | null; canRead: boolean; canExport: boolean
  recoveryRequest?: ReconciliationCertificateExportCommand
  onExport: (command: ReconciliationCertificateExportCommand) => Promise<Result>; onClose: () => void
}) {
  const t = useTranslations("paymentReconciliationWorkbench.certificateExport")
  const key = `stoquify:certificate-export:v1:${scope.organizationId}:${scope.actorId}`
  const [pending, setPending] = useState<ReconciliationCertificateExportCommand | null>(null), [hydrated, setHydrated] = useState(false)
  const [busy, setBusy] = useState(false), [needsAuth, setNeedsAuth] = useState(false), [notice, setNotice] = useState<{ key: string; error: boolean } | null>(null)
  const [download, setDownload] = useState<{ receiptId: string; sha256: string } | null>(null)
  const region = useRef<HTMLDivElement>(null), mounted = useRef(false), running = useRef(false), allowed = useRef(false), focusAfter = useRef(false)
  const adoptedRequest = useRef<ReconciliationCertificateExportCommand | null>(null)
  allowed.current = canRead && canExport
  const current = () => mounted.current && allowed.current
  function persist(value: ReconciliationCertificateExportCommand | null) {
    try { if (value) sessionStorage.setItem(key, JSON.stringify(value)); else sessionStorage.removeItem(key); setPending(value); return true }
    catch { setNotice({ key: "storage", error: true }); return false }
  }
  useEffect(() => {
    mounted.current = true
    try { const raw = sessionStorage.getItem(key); if (raw) setPending(reconciliationCertificateExportSchema.parse(JSON.parse(raw))); setHydrated(true) }
    catch { setNotice({ key: "storage", error: true }) }
    return () => { mounted.current = false }
  }, [key])
  useEffect(() => {
    if (!hydrated || !recoveryRequest || adoptedRequest.current === recoveryRequest) return
    adoptedRequest.current = recoveryRequest
    if (pending && pending.idempotencyKey !== recoveryRequest.idempotencyKey) { setNotice({ key: "pendingExists", error: true }); return }
    try { const command = reconciliationCertificateExportSchema.parse(recoveryRequest); sessionStorage.setItem(key, JSON.stringify(command)); setPending(command); setNotice(null); setDownload(null) }
    catch { setNotice({ key: "storage", error: true }) }
  }, [hydrated, recoveryRequest, pending, key])
  const visible = !!run || !!pending || !!notice || !!download
  useEffect(() => { if (visible && canRead) region.current?.focus() }, [visible, run?.id, canRead, recoveryRequest?.idempotencyKey])
  useEffect(() => { if (!busy && focusAfter.current) { focusAfter.current = false; if (mounted.current && allowed.current) region.current?.focus() } }, [busy])
  async function task(work: () => Promise<void>) {
    if (!current() || running.current) return
    running.current = true; setBusy(true); setNotice(null)
    try { await work() }
    catch (error) { if (current()) { const code = error && typeof error === "object" && "code" in error ? error.code : null; setNeedsAuth(code === "FRESH_AUTH_REQUIRED"); setNotice({ key: code === "FRESH_AUTH_REQUIRED" ? "authRequired" : code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" ? "stale" : code === "FORBIDDEN" ? "denied" : "failed", error: true }) } }
    finally { running.current = false; if (mounted.current) setBusy(false) }
  }
  async function issue(command: ReconciliationCertificateExportCommand) {
    if (!persist(command)) return
    const result = await onExport(command)
    if (!current() || result.scope.organizationId !== scope.organizationId || result.scope.actorId !== scope.actorId) throw new Error("Certificate export scope changed")
    if (result.runId !== command.runId || result.certificateHash !== command.expectedCertificateHash || !/^recon-cert-[a-zA-Z0-9-]+\.json$/.test(result.fileName)) throw new Error("Unexpected certificate export")
    await downloadVerifiedEvidence(result, current)
    if (!current()) return
    focusAfter.current = true
    if (!persist(null)) return
    setNeedsAuth(false); setDownload({ receiptId: result.inboxItemId, sha256: result.sha256 }); setNotice({ key: "downloadRequested", error: false })
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, password = String(new FormData(form).get("password") ?? ""); form.reset()
    await task(async () => { const result = await stepUpWithPasswordAction({ password }); if (!result.success) throw new Error("Authentication failed"); if (current()) { setNeedsAuth(false); setNotice({ key: "authenticated", error: false }) } })
  }
  function close() { if (!busy) { setDownload(null); setNotice(null); onClose() } }
  if (!visible) return null
  if (!canRead) return <p role="status">{t("denied")}</p>
  return <div role="region" aria-label={t("title")} tabIndex={-1} ref={region} onKeyDown={event => { if (event.key === "Escape" && !pending) close() }} className="min-w-0 space-y-3 rounded-lg border border-[var(--dash-gold)] bg-[var(--dash-surface)] p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)] [&_button]:h-auto [&_button]:min-h-10 [&_button]:max-w-full [&_button]:whitespace-normal">
    <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{t("title")}</h4>{!pending && <Button variant="outline" disabled={busy} onClick={close}>{t("close")}</Button>}</div>
    <p>{t("description")}</p><p className="break-all">{t("run")} {pending?.runId ?? run?.id}</p><p className="break-all">{t("certificateHash")} {pending?.expectedCertificateHash ?? run?.certificateHash}</p>
    {run?.signedAt && <p>{t("signedAt")} {run.signedAt}</p>}
    {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-[var(--dash-danger)]" : "text-[var(--dash-text-soft)]"}>{t(notice.key)}</p>}
    {!canExport && <p role="status">{t("denied")}</p>}
    {pending ? <div className="space-y-2"><p>{t("pending")}</p><div className="flex flex-wrap gap-2"><Button disabled={busy || needsAuth || !hydrated || !canExport} onClick={() => task(() => issue(pending))}>{t("retry")}</Button><Button variant="outline" disabled={busy || !hydrated} onClick={() => { if (persist(null)) { setNeedsAuth(false); setNotice(null) } }}>{t("discard")}</Button></div></div>
      : <Button disabled={busy || !hydrated || !canExport || run?.status !== "SIGNED" || !run?.certificateHash} onClick={() => { if (run?.certificateHash) void task(() => issue({ runId: run.id, expectedCertificateHash: run.certificateHash!, idempotencyKey: crypto.randomUUID(), fileType: "json" })) }}>{t("download")}</Button>}
    {needsAuth && <form onSubmit={authenticate} className="space-y-2"><label htmlFor="certificate-export-password">{t("password")}</label><Input id="certificate-export-password" name="password" type="password" autoComplete="current-password" required disabled={busy} className="dashboard-control" /><Button type="submit" disabled={busy || !canExport}>{t("authenticate")}</Button></form>}
    {download && <div className="space-y-1 text-xs"><p className="break-all">{t("receipt")} {download.receiptId}</p><p className="break-all">SHA-256: {download.sha256}</p></div>}
  </div>
}
