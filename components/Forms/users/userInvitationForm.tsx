"use client"

import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Loader2, UserPlus } from "lucide-react"
import { sendInvite } from "@/actions/users/sendInvite"
import { cancelInvite } from "@/actions/users/cancelInvite"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { invitationIssueInput } from "@/services/users/invitation-input"
import type { InvitationOptionsState } from "@/services/users/user-invitation-options.service"

export type InviteData = {
  email: string; roleId: string; organizationId: string; organizationName: string; name?: string; roleName?: string
}

export default function UserInvitationForm({ roles, availability = "ready", organizationName, triggerClassName, triggerIcon, management, onRecorded }: {
  roles: { label: string; value: string }[]
  availability?: InvitationOptionsState | "load_failed"
  organizationId: string; organizationName: string; name?: string; email: string; roleName?: string
  triggerClassName?: string; triggerIcon?: ReactNode
  onRecorded?: () => Promise<void>
  management?: { mode: "reissue" | "cancel"; invite: { id: string; email: string; roleId: string; revision: string; status: string }; returnFocusId?: string }
}) {
  const t = useTranslations("userInvitations"), router = useRouter(), id = useId()
  const locale = useLocale() === "fr" ? "fr" : "en"
  const request = useRef<{ fingerprint: string; id: string } | null>(null)
  const reviewed = useRef<{ id: string; email: string; roleId: string; revision: string; status: string } | null>(null)
  const [open, setOpen] = useState(false), [email, setEmail] = useState(management?.invite.email ?? "")
  const [roleId, setRoleId] = useState(management?.invite.roleId ?? roles[0]?.value ?? "")
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)
  const [stale, setStale] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false), [password, setPassword] = useState("")
  const [verified, setVerified] = useState(false)
  const busy = useRef(false), feedback = useRef<HTMLDivElement>(null)
  const selectedRole = roles.find(role => role.value === roleId)
  const copy = (key: "title" | "description" | "submit" | "created" | "createdBody") => management ? t(`management.${management.mode}.${key}`, { email, organization: organizationName }) : t(key, { email, organization: organizationName })
  const cannotManage = management?.invite.status === "ACCEPTED" || (management?.mode === "cancel" && management.invite.status === "CANCELLED")
  useEffect(() => { if (open && (error || created || verified)) feedback.current?.focus() }, [open, error, created, verified])
  useEffect(() => { if (availability !== "ready") { setPassword(""); setOpen(false) } }, [availability])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy.current || created || needsVerification || stale) return
    const parsed = invitationIssueInput.safeParse({ email, roleId })
    if (!parsed.success || !selectedRole) { setError(t("errors.input")); return }
    if (management && reason.trim().length < 3) { setError(t("management.reasonRequired")); return }
    busy.current = true; setPending(true); setError(null); setVerified(false)
    try {
      const reviewedInvite = reviewed.current
      if (management && !reviewedInvite) { setError(t("errors.changed")); return }
      const details = { ...parsed.data, locale, ...(management?.mode === "reissue" && reviewedInvite ? { replace: { inviteId: reviewedInvite.id, revision: reviewedInvite.revision, reason: reason.trim() } } : {}) }
      const cancellation = reviewedInvite ? { inviteId: reviewedInvite.id, revision: reviewedInvite.revision, reason: reason.trim() } : null
      const fingerprint = JSON.stringify(management?.mode === "cancel" ? cancellation : details)
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() }
      const result = management?.mode === "cancel" ? await cancelInvite({ ...cancellation, requestId: request.current.id }) : await sendInvite({ ...details, requestId: request.current.id })
      if (result.status === 200 && result.data) {
        setCreated(true); await onRecorded?.(); router.refresh()
      } else {
        const code = "code" in result ? result.code : undefined
        setStale(code === "INVITATION_CHANGED" || code === "INVITATION_ALREADY_ACCEPTED")
        setNeedsVerification(code === "FRESH_AUTH_REQUIRED")
        const key = code === "INVITATION_PENDING" ? "pending" : code === "INVITATION_ACCOUNT_EXISTS" ? "account"
          : code === "INVITATION_DELIVERY_NOT_CONFIGURED" ? "configuration" : code === "INVITATION_REQUEST_CONFLICT" ? "conflict"
          : code === "INVITATION_CHANGED" || code === "INVITATION_ALREADY_ACCEPTED" ? "changed"
          : code === "INVITATION_INPUT_INVALID" ? "input" : code === "FRESH_AUTH_REQUIRED" ? "fresh" : result.status === 401 ? "session"
          : result.status === 403 ? "denied" : "unknown"
        setError(t(`errors.${key}`))
      }
    } catch { setError(t("errors.unknown")) }
    finally { busy.current = false; setPending(false) }
  }

  async function confirmIdentity() {
    if (busy.current) return
    if (!password) { setError(t("errors.password")); return }
    busy.current = true; setPending(true); setError(null)
    try {
      const result = await stepUpWithPasswordAction({ password })
      if (result.success) { setNeedsVerification(false); setVerified(true) }
      else setError(t(result.code === "RATE_LIMITED" ? "errors.rateLimited" : result.code === "AUTH_REQUIRED" ? "errors.session" : "errors.verification"))
    } catch { setError(t("errors.verification")) }
    finally { setPassword(""); busy.current = false; setPending(false) }
  }

  if (availability !== "ready") return <div className="max-w-sm space-y-2 text-sm text-[var(--dash-text-soft)]">
    <p role={availability === "load_failed" ? "alert" : undefined}>{t(`availability.${availability}`)}</p>
    {availability !== "forbidden" && <Button type="button" variant="outline" onClick={() => router.refresh()} className="dashboard-button-secondary w-full sm:w-auto">{t("reloadRoles")}</Button>}
  </div>

  return <Dialog open={open} onOpenChange={next => { if (!busy.current) {
    if (next && management && (!reviewed.current || created)) {
      reviewed.current = { ...management.invite }; request.current = null
      setEmail(management.invite.email); setRoleId(management.invite.roleId); setCreated(false); setError(null); setReason("")
    }
    setOpen(next); if (!next) setPassword("")
  } }}>
    <DialogTrigger asChild><Button size="sm" disabled={cannotManage} className={cn("gap-2", triggerClassName ?? "h-9")}>
      {triggerIcon ?? <UserPlus className="h-4 w-4" aria-hidden="true" />}{management ? copy("submit") : t("invite")}
    </Button></DialogTrigger>
    <DialogContent closeLabel={t("close")} closeDisabled={pending} aria-busy={pending} onCloseAutoFocus={event => { if (cannotManage && management?.returnFocusId) { const row = document.getElementById(management.returnFocusId); if (row) { event.preventDefault(); row.focus() } } }} style={{ position: "fixed", background: "var(--dash-surface)" }} className="dashboard-landing-theme dark min-w-0 max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)] before:hidden after:hidden motion-reduce:animate-none [&>*]:min-w-0">
      <DialogHeader>
        <DialogTitle>{copy("title")}</DialogTitle>
        <DialogDescription className="break-words text-[var(--dash-text-soft)]">{copy("description")}</DialogDescription>
      </DialogHeader>
      {created ? <div className="space-y-4">
        <div role="status" tabIndex={-1} ref={feedback} className="rounded-lg border border-[var(--dash-info)] bg-[var(--dash-info-soft)] p-4 outline-offset-4">
          <p className="font-semibold">{copy("created")}</p><p className="mt-2 break-words text-sm">{copy("createdBody")}</p>
          {pending && management && <p className="mt-2 text-sm">{t("management.updating")}</p>}
        </div>
        {management ? <Button disabled={pending} className="dashboard-button-secondary w-full" variant="outline" onClick={() => setOpen(false)}>{t("close")}</Button> : <Button disabled={pending} className="dashboard-button-secondary w-full" variant="outline" onClick={() => { request.current = null; setCreated(false); setError(null); setEmail("") }}>{t("another")}</Button>}
      </div> : <form onSubmit={submit} noValidate className="min-w-0 space-y-4" aria-busy={pending}>
        {!roles.length && <p role="status" className="rounded-lg border border-[var(--dash-gold)] p-3 text-sm">{t("noRoles")}</p>}
        <div className="space-y-2"><Label htmlFor={`${id}-email`}>{t("email")}</Label>
          <Input id={`${id}-email`} type="email" autoComplete="off" maxLength={254} required disabled={pending || Boolean(management)} value={email} onChange={event => setEmail(event.target.value)} className="dashboard-control" />
        </div>
        <div className="space-y-2"><Label htmlFor={`${id}-role`}>{t("role")}</Label>
          <select id={`${id}-role`} value={roleId} onChange={event => setRoleId(event.target.value)} disabled={pending || !roles.length || management?.mode === "cancel"} required aria-describedby={`${id}-role-help`} className="dashboard-control h-10 w-full rounded-lg px-3 text-sm">
            <option value="">{t("chooseRole")}</option>{roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select><p id={`${id}-role-help`} className="text-sm text-[var(--dash-text-soft)]">{t("roleHelp")}</p>
        </div>
        {management && <div className="space-y-2"><Label htmlFor={`${id}-reason`}>{t("management.reason")}</Label><Input id={`${id}-reason`} value={reason} onChange={event => setReason(event.target.value)} disabled={pending} minLength={3} maxLength={500} required className="dashboard-control" /></div>}
        {error && <div ref={feedback} tabIndex={-1} role="alert" className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-3 text-sm outline-offset-4">{error}</div>}
        {stale && management && <Button type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-10 w-full whitespace-normal break-words py-2" onClick={() => { reviewed.current = null; request.current = null; setStale(false); setError(null); setOpen(false); router.refresh() }}>{t("management.reload")}</Button>}
        {needsVerification && <div className="space-y-3 rounded-lg border border-[var(--dash-gold)] p-4">
          <Label htmlFor={`${id}-password`}>{t("password")}</Label>
          <Input id={`${id}-password`} type="password" autoComplete="current-password" maxLength={128} value={password} disabled={pending} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void confirmIdentity() } }} className="dashboard-control" />
          <Button type="button" variant="outline" disabled={pending || !password} onClick={confirmIdentity} className="dashboard-button-secondary w-full">{t("confirmIdentity")}</Button>
        </div>}
        {verified && <div ref={feedback} role="status" tabIndex={-1} className="text-sm text-[var(--dash-info)] outline-offset-4">{t("verified")}</div>}
        {management?.mode !== "cancel" && <><p className="text-sm text-[var(--dash-text-soft)]">{t("expiryHelp")}</p><p className="rounded-lg border border-[var(--dash-gold)] p-3 text-sm">{t("deliveryPaused")}</p></>}
        <Button type="submit" disabled={pending || !selectedRole || needsVerification || cannotManage || stale} className={cn("w-full", management?.mode === "cancel" ? "border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]" : "dashboard-button-create")}>
          {pending && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{pending ? t("sending") : copy("submit")}
        </Button>
      </form>}
    </DialogContent>
  </Dialog>
}
