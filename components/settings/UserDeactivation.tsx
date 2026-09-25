"use client"

import { useId, useRef, useState } from "react"
import { deleteUser } from "@/actions/users/deleteUser"
import getOrgUsers from "@/actions/users/getOrgUsers"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { UserDeactivationCommand, UserDeactivationReceipt } from "@/services/users/user-deactivation-input"
import { userDirectoryCopy } from "./user-directory-copy"

type Props = { user: { id: string; name: string; email: string; updatedAt: Date | string; isActive: boolean }; locale: "en" | "fr"; onRecorded: () => void; initiallyOpen?: boolean; onDismiss?: () => void }

export function UserDeactivation(props: Props) {
  return <MemberDeactivation key={props.user.id} {...props} />
}

function MemberDeactivation({ user, locale, onRecorded, initiallyOpen = false, onDismiss }: Props) {
  const t = userDirectoryCopy[locale], id = useId()
  const [open, setOpen] = useState(initiallyOpen), [reason, setReason] = useState(""), [password, setPassword] = useState("")
  const [baseline, setBaseline] = useState(user), [code, setCode] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false), [receipt, setReceipt] = useState<UserDeactivationReceipt | null>(null)
  const command = useRef<UserDeactivationCommand | null>(null), inFlight = useRef(false)
  const uncertain = code === "UNCERTAIN" || code === "INTERNAL_ERROR" || code === "DATABASE_UNAVAILABLE"
  const stale = code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT"
  const errorText = ({ FORBIDDEN: t.denied, AUTH_REQUIRED: t.denied, NOT_FOUND: t.missing, BUSINESS_RULE_VIOLATION: t.blocked, FRESH_AUTH_REQUIRED: t.fresh, VALIDATION_ERROR: t.validation, CONFLICT: t.stale, IDEMPOTENCY_CONFLICT: t.stale } as Record<string, string>)[code ?? ""] ?? t.failed
  const run = async (work: () => Promise<void>) => { if (inFlight.current) return; inFlight.current = true; setBusy(true); try { await work() } finally { inFlight.current = false; setBusy(false) } }
  const submit = () => run(async () => {
    if (!baseline.isActive || stale || reason.trim().length < 3) return
    if (!command.current) command.current = { requestId: crypto.randomUUID(), expectedUpdatedAt: new Date(baseline.updatedAt).toISOString(), reason: reason.trim() }
    setNotice(null)
    try {
      const result = await deleteUser(baseline.id, command.current)
      if (result.data) { setReceipt(result.data); setCode(null) }
      else { setCode(result.code); if (!["FRESH_AUTH_REQUIRED", "INTERNAL_ERROR", "DATABASE_UNAVAILABLE"].includes(result.code)) command.current = null }
    } catch { setCode("UNCERTAIN") }
  })
  const reload = () => run(async () => {
    try {
      const result = await getOrgUsers()
      if (!result.success) { setNotice(t.loadHelp); return }
      const current = result.data.find(member => member.id === user.id)
      if (!current) { setCode("NOT_FOUND"); return }
      setBaseline({ ...current, name: [current.firstName, current.lastName].filter(Boolean).join(" ") || current.email })
      command.current = null; setCode(null); setNotice(current.isActive ? null : t.already)
    } catch { setNotice(t.loadHelp) }
  })
  const verify = () => run(async () => {
    try { const result = await stepUpWithPasswordAction({ password }); if (result.success) { setCode(null); setNotice(t.verifiedPassword) } else setNotice(t.verifyFailed) }
    catch { setNotice(t.verifyFailed) }
    finally { setPassword("") }
  })
  const close = () => { if (busy) return; setOpen(false); setPassword(""); if (receipt) onRecorded(); onDismiss?.() }
  return <Dialog open={open} onOpenChange={value => { if (!value) close(); else if (!busy) setOpen(true) }}>
    {!initiallyOpen && <DialogTrigger asChild><Button type="button" variant="outline" className="h-auto whitespace-normal text-[var(--dash-danger)]" aria-label={`${t.deactivate} ${user.name}`}>{t.deactivate}</Button></DialogTrigger>}
    <DialogContent onCloseAutoFocus={event => { if (onDismiss) event.preventDefault() }} closeLabel={`${t.cancel} : ${t.reviewTitle}`} closeDisabled={busy} className="dashboard-landing-theme dark max-h-[90dvh] overflow-y-auto border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)] sm:max-w-xl" onInteractOutside={event => { if (busy || uncertain) event.preventDefault() }}>
      <DialogHeader><DialogTitle>{receipt ? t.saved : t.reviewTitle}</DialogTitle><DialogDescription className="break-words text-[var(--dash-text-soft)]">{baseline.name} · {baseline.email}</DialogDescription></DialogHeader>
      {receipt ? <div role="status" className="space-y-3 break-words"><p>{t.saved}</p><p>{t.sessions}: {receipt.sessionsRevoked}</p><p>{t.invites}: {receipt.pendingInvitesCancelled}</p><p className="break-all text-xs">{t.receipt}: {receipt.auditId}</p></div> : <>
        <p className="text-sm leading-6">{t.consequences}</p>
        <p className="text-xs text-[var(--dash-text-soft)]">{t.updated}: {new Date(baseline.updatedAt).toLocaleString(locale, { timeZone: "UTC" })} UTC</p>
        {code && <p role="alert" className="rounded border border-[var(--dash-warning)] p-3 text-sm">{errorText}</p>}
        {notice && <p role="status" className="text-sm">{notice}</p>}
        <div className="space-y-2"><Label htmlFor={id + "-reason"}>{t.reason}</Label><Textarea id={id + "-reason"} value={reason} maxLength={400} disabled={busy || uncertain} aria-describedby={id + "-help"} onChange={event => { setReason(event.target.value); command.current = null }} className="dashboard-control" /><p id={id + "-help"} className="text-xs text-[var(--dash-text-soft)]">{t.reasonHelp}</p></div>
        {stale && <Button type="button" onClick={reload} disabled={busy} className="dashboard-button-secondary h-auto whitespace-normal">{t.reload}</Button>}
        {code === "FRESH_AUTH_REQUIRED" && <div className="space-y-2"><Label htmlFor={id + "-password"}>{t.password}</Label><Input id={id + "-password"} type="password" autoComplete="current-password" value={password} maxLength={128} disabled={busy} onChange={event => setPassword(event.target.value)} className="dashboard-control" /><Button type="button" onClick={verify} disabled={busy || !password} className="dashboard-button-secondary h-auto whitespace-normal">{t.verify}</Button></div>}
      </>}
      <DialogFooter className="gap-2"><Button type="button" variant="outline" disabled={busy} onClick={close} className="dashboard-button-secondary">{t.cancel}</Button>{!receipt && <Button type="button" variant="destructive" disabled={busy || !baseline.isActive || stale || reason.trim().length < 3 || code === "FRESH_AUTH_REQUIRED"} onClick={submit} className="h-auto whitespace-normal">{busy ? t.busy : uncertain ? t.retrySame : t.confirm}</Button>}</DialogFooter>
    </DialogContent>
  </Dialog>
}
