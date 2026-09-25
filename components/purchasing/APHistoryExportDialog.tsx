"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { prepareAPHistoryExportAction } from "@/actions/purchasing/ap-history.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { APHistoryExportInput } from "@/services/purchasing/ap-history-export.service"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function APHistoryExportDialog({ open, onOpenChange, filters, organizationId, actorId }: { open: boolean; onOpenChange: (open: boolean) => void; filters: APHistoryExportInput["filters"]; organizationId: string; actorId: string }) {
  const t = useTranslations("apHistory.exportFlow"), locale = useLocale()
  const [busy, setBusy] = useState(false), [password, setPassword] = useState(""), [needsPassword, setNeedsPassword] = useState(false), [message, setMessage] = useState(""), [done, setDone] = useState(false)
  const generation = useRef(0), lock = useRef(false), trigger = useRef<HTMLElement | null>(null)
  const filterKey = JSON.stringify(filters)
  const invalidate = useCallback(() => { generation.current++ }, [])
  useEffect(() => {
    generation.current++; lock.current = false; setBusy(false); setPassword(""); setNeedsPassword(false); setMessage(""); setDone(false)
    return invalidate
  }, [open, filterKey, organizationId, actorId, invalidate])
  async function download() {
    if (lock.current) return
    lock.current = true; setBusy(true); setMessage(""); setDone(false)
    const current = generation.current
    try {
      if (needsPassword) {
        const assurance = await stepUpWithPasswordAction({ password }); setPassword("")
        if (current !== generation.current) return
        if (!assurance.success) { setMessage(assurance.code === "RATE_LIMITED" ? t("rateLimit", { seconds: assurance.retryAfterSeconds ?? 1 }) : t("passwordFailed")); return }
        setNeedsPassword(false)
      }
      const result = await prepareAPHistoryExportAction({ filters, locale: locale === "fr" ? "fr" : "en" })
      if (current !== generation.current) return
      if (!result.success) {
        if (result.code === "FRESH_AUTH_REQUIRED") { setNeedsPassword(true); setMessage(t("fresh")) }
        else setMessage(t(["FORBIDDEN", "AUTH_REQUIRED"].includes(result.code) ? "denied" : ["VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION"].includes(result.code) ? "conditions" : "failed"))
        return
      }
      if (result.data.organizationId !== organizationId || result.data.actorId !== actorId) { setMessage(t("denied")); return }
      const file = result.data
      const bytes = Uint8Array.from(atob(file.contentBase64), character => character.charCodeAt(0))
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(x => x.toString(16).padStart(2, "0")).join("")
      if (current !== generation.current) return
      if (file.contentHash !== "sha256:" + digest) throw new Error("Export integrity mismatch")
      const url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType }))
      const anchor = document.createElement("a")
      try { anchor.href = url; anchor.download = file.fileName; document.body.appendChild(anchor); anchor.click() }
      finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
      setDone(true); setMessage(t("downloadStarted", { count: file.rowCount, reference: file.watermarkId }))
    } catch { if (current === generation.current) setMessage(t("failed")) }
    finally { if (current === generation.current) { lock.current = false; setBusy(false) } }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent closeLabel={t("close")} onOpenAutoFocus={() => { trigger.current = document.activeElement as HTMLElement }} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }} className="dashboard-landing-theme dark max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-xl border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text)]">
      <DialogHeader><DialogTitle>{t("title")}</DialogTitle><DialogDescription className="text-[var(--dash-text-soft)]">{t("help")}</DialogDescription></DialogHeader>
      <p className="text-sm">{t("scope", { from: filters?.dateFrom ?? t("allDates"), to: filters?.dateTo ?? t("allDates"), lane: t(filters?.lane === "invoice" ? "invoices" : filters?.lane === "payment" ? "payments" : "allLanes") })}</p>
      {filters?.supplierId && <p className="break-all text-sm">{t("supplier", { id: filters.supplierId })}</p>}
      <form onSubmit={event => { event.preventDefault(); void download() }} className="space-y-4" aria-busy={busy}>
        {needsPassword && <div><Label htmlFor="ap-export-password">{t("password")}</Label><Input id="ap-export-password" autoFocus type="password" autoComplete="current-password" maxLength={1024} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} className="dashboard-control" /></div>}
        {message && <p role={done ? "status" : "alert"} className="break-words text-sm">{message}</p>}
        <div className="flex flex-wrap gap-3"><Button type="submit" className="dashboard-button-primary h-auto min-h-11 whitespace-normal" disabled={busy || (needsPassword && !password)}>{busy ? t("preparing") : needsPassword ? t("verifyDownload") : t("download")}</Button><Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={() => onOpenChange(false)}>{t("close")}</Button></div>
      </form>
    </DialogContent>
  </Dialog>
}
