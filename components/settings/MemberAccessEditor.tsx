"use client"
import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { MemberAccessError, useMemberAccess } from "@/hooks/useMemberAccess"
import type { MemberAccessModel } from "@/services/users/member-access-read.service"
import type { MemberAccessCommand, MemberAccessReceipt } from "@/services/users/member-access-input"
import { memberAccessCopy } from "./member-access-copy"
import MemberAccessHistory from "./MemberAccessHistory"
import { readMemberDraft, writeMemberDraft } from "@/hooks/member-access-draft"

type Props = { organizationId: string; actorId: string; memberId: string; locale: "en" | "fr" }
export default function MemberAccessEditor(props: Props) {
  const access = useMemberAccess(props.organizationId, props.actorId, props.memberId), t = memberAccessCopy[props.locale]
  return <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <Link className="rounded text-[var(--dash-brand)] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href={`/${props.locale}/dashboard/settings/users`}>{t.back}</Link>
    <h1 className="text-2xl font-semibold">{t.title}</h1>
    {access.query.isPending ? <p role="status">{t.loading}</p> : access.query.isError && !access.query.data ? <div role="alert"><p>{t.failed}</p><Button onClick={() => void access.query.refetch()}>{t.retry}</Button></div> : access.query.data && <MemberAccessForm key={props.memberId} {...props} initial={access.query.data} access={access} />}
  </div>
}

function MemberAccessForm({ organizationId, actorId, memberId, locale, initial, access }: Props & { initial: MemberAccessModel; access: ReturnType<typeof useMemberAccess> }) {
  const t = memberAccessCopy[locale], id = useId()
  const [baseline, setBaseline] = useState(initial), [selected, setSelected] = useState(initial.roleIds), [reason, setReason] = useState("")
  const [open, setOpen] = useState(false), [code, setCode] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null), [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false), [receipt, setReceipt] = useState<MemberAccessReceipt | null>(null)
  const [draftReady, setDraftReady] = useState(false), [draftUnavailable, setDraftUnavailable] = useState(false), [restored, setRestored] = useState(false)
  const draftScope = useRef({ organizationId, actorId, memberId }), restoredReview = useRef<{ roleIds: string[]; revision: string; operation: "roles" | "reactivate" } | null>(null)
  const inFlight = useRef(false), command = useRef<MemberAccessCommand | null>(null), reviewButton = useRef<HTMLButtonElement>(null), memberHeading = useRef<HTMLHeadingElement>(null)
  const uncertain = ["UNCERTAIN", "INTERNAL_ERROR", "DATABASE_UNAVAILABLE"].includes(code ?? ""), stale = ["CONFLICT", "IDEMPOTENCY_CONFLICT"].includes(code ?? "")
  const reviewedIds = command.current && restoredReview.current ? restoredReview.current.roleIds : baseline.roleIds
  const added = selected.filter(role => !reviewedIds.includes(role)), removed = reviewedIds.filter(role => !selected.includes(role))
  const name = (roleId: string) => { const role = baseline.catalogue.find(value => value.id === roleId); return role ? locale === "fr" ? role.nameFr || role.nameEn : role.nameEn : t.missing }
  const reactivation = command.current ? command.current.operation === "reactivate" : !baseline.member.isActive
  const disallowedSelection = selected.some(roleId => !baseline.catalogue.some(role => role.id === roleId && (!reactivation || role.canAssign)))
  const canSubmit = draftReady && !baseline.ownAccount && !baseline.inconsistent && (!!command.current || (!disallowedSelection && (!reactivation || baseline.canReactivate) && (!removed.length || baseline.canRemove) && added.every(id => baseline.catalogue.some(role => role.id === id && role.canAssign)) && (reactivation || !!added.length || !!removed.length) && reason.trim().length >= 3))
  useEffect(() => {
    try {
      const result = readMemberDraft(draftScope.current, window.sessionStorage)
      setDraftUnavailable(result.unavailable)
      if (result.draft) {
        const draft = result.draft
        setSelected(draft.selected); setReason(draft.reason); command.current = draft.request
        restoredReview.current = { roleIds: draft.baselineRoleIds, revision: draft.revision, operation: draft.operation }
        setRestored(true)
        if (draft.request) setCode("UNCERTAIN")
        else if (draft.revision !== initial.revision) setCode("CONFLICT")
      }
    } catch { setDraftUnavailable(true) }
    setDraftReady(true)
    // A draft belongs to this mounted actor/member. Refreshing server data must not restore it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const persist = (request: MemberAccessCommand | null = command.current) => {
    try {
      const revision = request?.expectedRevision ?? baseline.revision, roleIds = request && restoredReview.current ? restoredReview.current.roleIds : baseline.roleIds
      const changed = !!request || !!reason || JSON.stringify([...selected].sort()) !== JSON.stringify([...baseline.roleIds].sort())
      setDraftUnavailable(!writeMemberDraft(draftScope.current, changed ? { selected, reason, baselineRoleIds: roleIds, revision, operation: request?.operation ?? (baseline.member.isActive ? "roles" : "reactivate"), request } : null, window.sessionStorage))
    } catch { setDraftUnavailable(true) }
  }
  useEffect(() => { if (draftReady && !receipt) persist(); }, [selected, reason, draftReady, receipt, baseline]) // eslint-disable-line react-hooks/exhaustive-deps
  const errorText = ({ FRESH_AUTH_REQUIRED: t.fresh, FORBIDDEN: t.denied, AUTH_REQUIRED: t.denied, BUSINESS_RULE_VIOLATION: t.blocked, NOT_FOUND: t.missing, CONFLICT: t.stale, IDEMPOTENCY_CONFLICT: t.stale, VALIDATION_ERROR: t.validation } as Record<string, string>)[code ?? ""] ?? t.uncertain
  const run = async (work: () => Promise<void>) => { if (inFlight.current) return; inFlight.current = true; setBusy(true); try { await work() } finally { inFlight.current = false; setBusy(false) } }
  const submit = () => run(async () => {
    if (!canSubmit || stale) return
    command.current ??= { requestId: crypto.randomUUID(), expectedRevision: baseline.revision, roleIds: selected, operation: reactivation ? "reactivate" : "roles", reason: reason.trim() }
    persist(command.current)
    try { const result = await access.mutation.mutateAsync(command.current); setReceipt(result); setCode(null); setNotice(null); setRestored(false); try { setDraftUnavailable(!writeMemberDraft(draftScope.current, null, window.sessionStorage)) } catch { setDraftUnavailable(true) } }
    catch (error) { const next = error instanceof MemberAccessError ? error.code : "UNCERTAIN"; setCode(next); if (!["UNCERTAIN", "INTERNAL_ERROR", "DATABASE_UNAVAILABLE", "FRESH_AUTH_REQUIRED"].includes(next)) { command.current = null; persist(null) } }
  })
  const reload = () => run(async () => {
    const result = await access.query.refetch()
    if (result.error || !result.data) { setNotice(t.failed); return }
    setBaseline(result.data); command.current = null; restoredReview.current = null; setCode(null); setOpen(false); setNotice(t.compared)
  })
  const verify = () => run(async () => {
    try { const result = await stepUpWithPasswordAction({ password }); if (result.success) { setCode(null); setNotice(t.verifiedPassword) } else setNotice(t.verifyFailed) }
    catch { setNotice(t.verifyFailed) } finally { setPassword("") }
  })
  const close = () => {
    if (busy || uncertain) return
    if (!receipt) { setOpen(false); setPassword(""); return }
    void run(async () => {
      const result = await access.query.refetch()
      if (result.error || !result.data) { setNotice(t.failed); return }
      setBaseline(result.data); setSelected(result.data.roleIds); setReceipt(null); setReason(""); command.current = null; setNotice(null); setPassword(""); setOpen(false)
    })
  }
  return <>
    <div className="space-y-2 break-words"><h2 ref={memberHeading} tabIndex={-1} className="text-xl font-semibold focus-visible:outline focus-visible:outline-2">{baseline.member.name}</h2><p>{baseline.member.email}</p><p>{baseline.member.isActive ? t.active : t.inactive}</p><p className="text-xs text-[var(--dash-text-soft)]">{t.checked}: {new Date(baseline.checkedAt).toLocaleString(locale, { timeZone: "UTC" })} UTC</p></div>
    {baseline.ownAccount && <p role="status">{t.self}</p>}{baseline.inconsistent && <p role="alert">{t.inconsistent}</p>}
    {reactivation && !baseline.canReactivate && <p role="status">{t.cannotReactivate}</p>}
    {notice && <p role="status" className="rounded border border-[var(--dash-border-subtle)] p-3">{notice}</p>}
    <p role="status" className="text-xs text-[var(--dash-text-soft)]">{draftUnavailable ? (locale === "fr" ? "Le brouillon ne peut pas être conservé dans ce navigateur. Gardez cet onglet ouvert." : "This browser cannot retain the draft. Keep this tab open.") : restored ? (locale === "fr" ? "Brouillon restauré. Aucune demande n’est envoyée automatiquement. Examinez le résultat incertain ou les accès actuels avant de continuer." : "Draft restored. Nothing is submitted automatically. Review the unconfirmed request or current access before continuing.") : (locale === "fr" ? "Le brouillon est conservé dans cet onglet pendant 24 heures au maximum, sans mot de passe." : "The draft is retained in this tab for up to 24 hours, without passwords.")}</p>
    {stale && !open && <><p role="alert">{t.stale}</p><Button type="button" onClick={reload} disabled={busy} className="dashboard-button-secondary h-auto whitespace-normal">{t.reload}</Button></>}
    <fieldset disabled={!draftReady || busy || uncertain || !!receipt || baseline.ownAccount || baseline.inconsistent || (reactivation && !baseline.canReactivate)} className="space-y-4">
      <legend className="mb-3 text-lg font-medium">{t.roles}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{baseline.catalogue.map(role => {
        const checked = selected.includes(role.id), wasAssigned = baseline.roleIds.includes(role.id), unavailable = wasAssigned ? !baseline.canRemove : !role.canAssign
        return <label key={role.id} className={`flex gap-3 rounded-lg border p-4 ${checked ? "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]" : "border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)]"}`}>
          <input type="checkbox" aria-label={name(role.id)} className="mt-1 size-4 shrink-0 accent-[var(--dash-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" checked={checked} disabled={unavailable} onChange={event => { setSelected(values => event.target.checked ? [...values, role.id] : values.filter(value => value !== role.id)); command.current = null }} />
          <span className="min-w-0 space-y-1 break-words"><span className="block font-medium">{name(role.id)}</span><span className="block text-xs text-[var(--dash-text-soft)]">{role.permissionCount} {t.permissions}{checked ? ` · ${t.selected}` : ""}</span>{role.description && <span className="block text-sm">{role.description}</span>}{unavailable && <span className="block text-xs">{wasAssigned ? t.retained : t.unavailable}</span>}</span>
        </label>
      })}</div>
      <div className="space-y-2"><Label htmlFor={id + "-reason"}>{t.reason}</Label><Textarea className="dashboard-control" id={id + "-reason"} value={reason} maxLength={400} onChange={event => { setReason(event.target.value); command.current = null }} /></div>
    </fieldset>
    {reactivation && disallowedSelection && <p role="status">{t.selectedUnassignable}</p>}
    <p className="text-sm text-[var(--dash-text-soft)]">{t.draft}</p>
    <Button ref={reviewButton} type="button" className="dashboard-button-primary h-auto whitespace-normal" disabled={!canSubmit || busy || !!receipt} onClick={() => { setOpen(true); setNotice(null) }}>{t.review}</Button>
    {initial.canReadHistory && initial.historyPage ? <MemberAccessHistory key={initial.revision} organizationId={organizationId} actorId={actorId} memberId={memberId} locale={locale} initial={{ entries: initial.history, ...initial.historyPage, checkedAt: initial.checkedAt }} /> : <p>{t.restrictedHistory}</p>}
    <Dialog open={open} onOpenChange={value => { if (!value) close() }}><DialogContent closeLabel={`${t.close}: ${t.reviewTitle}`} closeDisabled={busy || uncertain} onCloseAutoFocus={event => { event.preventDefault(); if (reviewButton.current && !reviewButton.current.disabled) reviewButton.current.focus(); else memberHeading.current?.focus() }} onInteractOutside={event => { if (busy || uncertain) event.preventDefault() }} className="dashboard-landing-theme dark max-h-[90dvh] overflow-y-auto border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)] sm:max-w-xl">
      <DialogHeader><DialogTitle>{receipt ? t.saved : t.reviewTitle}</DialogTitle><DialogDescription className="break-words text-[var(--dash-text-soft)]">{baseline.member.name} · {baseline.member.email}</DialogDescription></DialogHeader>
      {receipt ? <div role="status" className="space-y-3"><p>{receipt.operation === "reactivate" ? t.reactivate : t.roleChange}</p><p>{t.sessions}: {receipt.sessionsRevoked}</p><p className="break-all text-xs">{t.receipt}: {receipt.auditId}</p>{notice && <p>{notice}</p>}</div> : <div className="space-y-4 text-sm">
        <p className="font-medium">{reactivation ? t.reactivate : t.roleChange}</p><p>{t.consequences}</p>
        <p className="break-words">{t.add}: {added.map(name).join(", ") || t.none}</p><p className="break-words">{t.remove}: {removed.map(name).join(", ") || t.none}</p><p className="break-words">{t.reason}: {reason}</p>
        {code && <p role="alert">{errorText}</p>}{notice && <p role="status">{notice}</p>}
        {stale && <Button type="button" onClick={reload} disabled={busy} className="dashboard-button-secondary h-auto whitespace-normal">{t.reload}</Button>}
        {code === "FRESH_AUTH_REQUIRED" && <div className="space-y-2"><Label htmlFor={id + "-password"}>{t.password}</Label><Input id={id + "-password"} className="dashboard-control" type="password" autoComplete="current-password" value={password} maxLength={128} onChange={event => setPassword(event.target.value)} disabled={busy} /><Button type="button" onClick={verify} disabled={busy || !password} className="dashboard-button-secondary h-auto whitespace-normal">{t.verify}</Button></div>}
      </div>}
      <DialogFooter className="gap-2"><Button type="button" onClick={close} disabled={busy || uncertain} className="dashboard-button-secondary h-auto whitespace-normal">{receipt ? t.close : t.cancel}</Button>{!receipt && <Button type="button" onClick={submit} disabled={busy || stale || code === "FRESH_AUTH_REQUIRED" || !canSubmit} className="dashboard-button-primary h-auto whitespace-normal">{busy ? t.busy : uncertain ? t.retrySame : t.confirm}</Button>}</DialogFooter>
    </DialogContent></Dialog>
  </>
}
