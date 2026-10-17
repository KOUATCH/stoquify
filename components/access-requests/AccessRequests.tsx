"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { accessTargets, type AccessTarget, type AccessRequestView, type AccessRequestList, type AccessRequestReview, type AccessRequestHistory } from "@/services/access-requests/access-request-contracts"
import { listAccessRequestsAction, submitAccessRequestAction, previewAccessRequestAction, decideAccessRequestAction, applyAccessRequestAction, withdrawAccessRequestAction, readAccessRequestHistoryAction, accessRequestReturnPathAction } from "@/actions/access-requests/access-request.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { dashboardLoginRecoveryHref } from "@/lib/security/dashboard-session-recovery"
import { accessRequestCopy } from "./access-request-copy"

type Locale = "en" | "fr"
type ErrorReason = keyof typeof accessRequestCopy.en.errors
const button = "dashboard-button-secondary min-h-10 rounded-md px-3 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
const control = "dashboard-control min-h-10 w-full rounded-md border p-2"
const date = (value: string, locale: Locale) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC"

function ErrorNotice({ reason, locale }: { reason: ErrorReason; locale: Locale }) {
  const t = accessRequestCopy[locale]
  return <div role="alert" className="space-y-2"><p>{t.errors[reason]}</p>{reason === "session" && <Link className="underline" href={dashboardLoginRecoveryHref(`/${locale}/dashboard/access-requests`, locale)}>{t.login}</Link>}{reason === "organization" && <Link className="underline" href={`/${locale}/dashboard`}>{t.dashboard}</Link>}</div>
}

export default function AccessRequests({ locale, initialTarget }: { locale: Locale; initialTarget?: AccessTarget }) {
  const t = accessRequestCopy[locale]
  const [query, setQuery] = useState<{ queue: "mine" | "review"; beforeId?: string; refresh: number }>({ queue: "mine", refresh: 0 })
  const [data, setData] = useState<AccessRequestList | null>(null), [error, setError] = useState<ErrorReason | null>(null), [loading, setLoading] = useState(true)
  const [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false)
  const [submissionError, setSubmissionError] = useState<ErrorReason | null>(null)
  const command = useRef<{ commandId: string; target: AccessTarget; reason: string } | null>(null), submitting = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let current = true; setLoading(true); setData(null); setError(null)
    void listAccessRequestsAction({ queue: query.queue, ...(query.beforeId ? { beforeId: query.beforeId } : {}) }).then(result => {
      if (!current) return
      if (result.success) setData(result.data); else setError(result.reason)
    }).catch(() => { if (current) setError("unavailable") }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [query])
  const refresh = () => setQuery(q => ({ queue: q.queue, refresh: q.refresh + 1 }))
  const submit = async () => {
    if (submitting.current || !data?.submissionsEnabled || !initialTarget) return
    submitting.current = true; setBusy(true); setSubmissionError(null)
    command.current ??= { commandId: crypto.randomUUID(), target: initialTarget, reason: reason.trim() }
    try {
      const result = await submitAccessRequestAction(command.current)
      if (!alive.current) return
      if (result.success) { command.current = null; setReason(""); setUncertain(false); setQuery(q => ({ queue: "mine", refresh: q.refresh + 1 })) }
      else { setSubmissionError(result.reason); setUncertain(result.reason === "unavailable"); if (result.reason !== "unavailable") command.current = null }
    } catch { if (alive.current) { setSubmissionError("unavailable"); setUncertain(true) } }
    finally { submitting.current = false; if (alive.current) setBusy(false) }
  }
  return <div className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)] text-[var(--dash-text)]"><div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
    <h1 className="text-2xl font-semibold">{t.title}</h1><p className="text-sm text-[var(--dash-text-soft)]">{t.intro}</p>
    <nav aria-label={t.title} className="flex flex-wrap gap-2">
      <button className={button} disabled={busy} aria-pressed={query.queue === "mine"} onClick={() => setQuery(q => ({ queue: "mine", refresh: q.refresh + 1 }))}>{t.mine}</button>
      {(data?.canReview || query.queue === "review") && <button className={button} disabled={busy} aria-pressed={query.queue === "review"} onClick={() => setQuery(q => ({ queue: "review", refresh: q.refresh + 1 }))}>{t.review}</button>}
      <button className={button} disabled={busy || loading} onClick={refresh}>{t.refresh}</button>
    </nav>
    {loading && <p role="status">{t.loading}</p>}{error && <ErrorNotice reason={error} locale={locale} />}
    {data && <>
      {!data.submissionsEnabled && <p role="status">{t.disabled}</p>}
      {initialTarget && query.queue === "mine" && data.submissionsEnabled && <form className="dashboard-glass-panel space-y-3 rounded-lg p-4" onSubmit={event => { event.preventDefault(); void submit() }}>
        <h2 className="font-semibold">{t.task}: {accessTargets[initialTarget][locale]}</h2>
        <label className="block" htmlFor="access-request-reason">{t.reason}</label><p id="access-request-help" className="text-sm">{t.reasonHelp}</p>
        <textarea id="access-request-reason" aria-describedby="access-request-help" className={control} minLength={3} maxLength={400} required value={reason} disabled={busy || uncertain} onChange={event => setReason(event.target.value)} />
        {uncertain && <p role="status">{t.uncertain}</p>}{submissionError && <ErrorNotice reason={submissionError} locale={locale} />}
        <button className={button} disabled={busy || reason.trim().length < 3}>{busy ? t.working : uncertain ? t.retry : t.submit}</button>
      </form>}
      {!data.entries.length && <p role="status">{t.empty}</p>}
      <ol className="space-y-4">{data.entries.map(entry => <li key={entry.id}><RequestCard entry={entry} locale={locale} onChanged={updated => setData(current => current && ({ ...current, entries: current.entries.map(item => item.id === updated.id ? updated : item) }))} refresh={refresh} /></li>)}</ol>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={!query.beforeId || busy} onClick={refresh}>{t.first}</button><button className={button} disabled={!data.nextCursor || busy} onClick={() => setQuery(q => ({ ...q, beforeId: data.nextCursor ?? undefined }))}>{t.older}</button></div>
    </>}
  </div></div>
}

function RequestCard({ entry, locale, onChanged, refresh }: { entry: AccessRequestView; locale: Locale; onChanged: (entry: AccessRequestView) => void; refresh: () => void }) {
  const t = accessRequestCopy[locale], router = useRouter(), request = { id: entry.id, revision: entry.revision }
  const [review, setReview] = useState<AccessRequestReview | null>(null), [selected, setSelected] = useState<string[]>([]), [reason, setReason] = useState(""), [confirmed, setConfirmed] = useState(false)
  const [history, setHistory] = useState<AccessRequestHistory | null>(null), [error, setError] = useState<ErrorReason | null>(null), [busy, setBusy] = useState(false)
  const [password, setPassword] = useState(""), [notice, setNotice] = useState<string | null>(null)
  const active = useRef(true), inFlight = useRef(false), passwordInput = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null)
  const cardHeading = useRef<HTMLHeadingElement>(null), previousRevision = useRef(entry.revision)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => { if (error === "fresh-auth") passwordInput.current?.focus() }, [error])
  useEffect(() => { if (review) heading.current?.focus() }, [review])
  useEffect(() => {
    if (previousRevision.current === entry.revision) return
    previousRevision.current = entry.revision
    setReview(null); setHistory(null); setSelected([]); setConfirmed(false); setReason(""); setError(null); setNotice(null)
    cardHeading.current?.focus()
  }, [entry.revision])
  const run = async (work: () => Promise<void>) => {
    if (inFlight.current) return; inFlight.current = true; setBusy(true); setError(null); setNotice(null)
    try { await work() } catch { if (active.current) setError("unavailable") }
    finally { inFlight.current = false; if (active.current) setBusy(false) }
  }
  const mutate = (work: () => ReturnType<typeof withdrawAccessRequestAction>) => run(async () => {
    const result = await work(); if (!active.current) return
    if (result.success) onChanged(result.data); else { setReview(null); setError(result.reason) }
  })
  const loadReview = () => run(async () => {
    const result = await previewAccessRequestAction(request); if (!active.current) return
    if (result.success) { setReview(result.data); setSelected([]); setConfirmed(false); setReason("") } else setError(result.reason)
  })
  const loadHistory = (beforeId?: string) => run(async () => {
    const result = await readAccessRequestHistoryAction({ ...request, ...(beforeId ? { beforeId } : {}) }); if (!active.current) return
    if (result.success) setHistory(result.data); else { setHistory(null); setError(result.reason) }
  })
  const decide = (decision: "APPROVED" | "DECLINED") => {
    if (!review) return
    return mutate(() => decideAccessRequestAction({ ...request, decision, reason: reason.trim(), roleIds: decision === "APPROVED" ? selected : [], memberRevision: review.memberRevision }))
  }
  const check = () => run(async () => {
    const result = await accessRequestReturnPathAction(entry.id); if (!active.current) return
    if (result.success) router.push(`/${locale}${result.data}`); else setError(result.reason)
  })
  const verify = () => run(async () => {
    try { const result = await stepUpWithPasswordAction({ password }); if (active.current) setNotice(result.success ? t.verified : t.verifyFailed) }
    finally { if (active.current) setPassword("") }
  })
  const status = (value: string) => t.status[value as keyof typeof t.status] ?? value
  const blocked = !!error || !!notice
  return <section aria-label={`${accessTargets[entry.target][locale]}: ${entry.id}`} aria-busy={busy} className="dashboard-glass-panel space-y-3 rounded-lg p-4">
    <h2 ref={cardHeading} tabIndex={-1} className="font-semibold">{accessTargets[entry.target][locale]}</h2>
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div><dt>{t.decision}</dt><dd>{status(entry.decision)}</dd></div><div><dt>{t.application}</dt><dd>{status(entry.application)}</dd></div>
      <div className="break-all"><dt>{t.owner}</dt><dd>{entry.reviewerId ?? t.queueOwner}</dd></div><div className="break-all"><dt>{t.requester}</dt><dd>{entry.requesterId}</dd></div>
      <div><dt>{t.created}</dt><dd>{date(entry.createdAt, locale)}</dd></div><div><dt>{t.expires}</dt><dd>{date(entry.expiresAt, locale)}</dd></div>
      {entry.decidedAt && <div><dt>{t.decided}</dt><dd>{date(entry.decidedAt, locale)}</dd></div>}{entry.appliedAt && <div><dt>{t.applied}</dt><dd>{date(entry.appliedAt, locale)}</dd></div>}
    </dl>
    <p className="break-words whitespace-pre-wrap">{entry.reason}</p>{entry.decisionReason && <p className="break-words whitespace-pre-wrap">{t.decisionReason}: {entry.decisionReason}</p>}
    {entry.decision === "APPROVED" && <p className="text-sm">{entry.application === "APPLIED" ? t.appliedHelp : entry.application === "FAILED" ? t.failedHelp : t.approvedHelp}</p>}
    <p className="break-all text-xs">{t.reference}: {entry.id} · {t.revision} {entry.revision}</p>
    {error && <ErrorNotice reason={error} locale={locale} />}{notice && <p role="status">{notice}</p>}
    {error === "fresh-auth" && <form onSubmit={event => { event.preventDefault(); void verify() }} className="space-y-2">
      <label className="block">{t.password}<input ref={passwordInput} type="password" autoComplete="current-password" maxLength={128} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} className={control} /></label>
      <button className={button} disabled={busy || !password}>{t.verify}</button>
    </form>}
    {blocked && <button className={button} disabled={busy} onClick={refresh}>{t.refresh}</button>}
    <div className="flex flex-wrap gap-2">
      {entry.canWithdraw && <button className={button} disabled={busy || blocked} onClick={() => void mutate(() => withdrawAccessRequestAction(request))}>{t.withdraw}</button>}
      {entry.canReview && <button className={button} disabled={busy || blocked} onClick={() => void loadReview()}>{t.inspect}</button>}
      {entry.canApply && <button className={button} disabled={busy || blocked} onClick={() => void mutate(() => applyAccessRequestAction(request))}>{t.apply}</button>}
      {entry.canCheckAccess && <button className={button} disabled={busy || blocked} onClick={() => void check()}>{t.check}</button>}
      <button className={button} disabled={busy || blocked} onClick={() => void loadHistory()}>{t.history}</button>
    </div>
    {busy && <p role="status">{t.working}</p>}
    {review && <div className="space-y-3 border-t border-[var(--dash-border-subtle)] pt-4">
      <h3 tabIndex={-1} ref={heading} className="font-semibold">{t.selectRoles}</h3><p className="text-sm">{t.roleHelp}</p><p className="text-sm">{t.roleCount}: {review.existingRoleCount}</p>
      {!review.roles.length && <p>{t.noRoles}</p>}
      <fieldset disabled={busy} className="space-y-3"><legend className="sr-only">{t.selectRoles}</legend>{review.roles.map(role => <div key={role.id} className="rounded border p-3">
        <label className="flex items-start gap-2"><input type="checkbox" checked={selected.includes(role.id)} onChange={event => { setConfirmed(false); setSelected(ids => event.target.checked ? [...ids, role.id] : ids.filter(id => id !== role.id)) }} /><span>{locale === "fr" ? role.nameFr || role.nameEn : role.nameEn}</span></label>
        <ul className="mt-2 break-all pl-5 text-xs">{role.permissions.map(permission => <li key={permission}>{permission}</li>)}</ul>
      </div>)}</fieldset>
      <label className="block">{t.decisionReason}<textarea className={control} minLength={3} maxLength={400} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /><span>{t.confirm}</span></label>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={busy || reason.trim().length < 3 || !selected.length || !confirmed} onClick={() => void decide("APPROVED")}>{t.approve}</button><button className={button} disabled={busy || reason.trim().length < 3} onClick={() => void decide("DECLINED")}>{t.decline}</button><button className={button} disabled={busy} onClick={() => setReview(null)}>{t.cancel}</button></div>
    </div>}
    {history && <div className="space-y-3 border-t border-[var(--dash-border-subtle)] pt-4"><h3 className="font-semibold">{t.history}</h3>
      {!history.entries.length && <p>{t.historyEmpty}</p>}
      <ol className="space-y-2">{history.entries.map(event => <li key={event.id} className="break-words text-sm"><p>{t.events[event.action as keyof typeof t.events] ?? t.historyLimited} · {date(event.at, locale)}</p><p className="break-all">{t.actor}: {event.actorId}</p>{event.state ? <p>{t.decision}: {status(event.state.decision)} · {t.application}: {status(event.state.application)}</p> : <p>{t.historyLimited}</p>}</li>)}</ol>
      {history.nextCursor && <button className={button} disabled={busy} onClick={() => void loadHistory(history.nextCursor!)}>{t.historyOlder}</button>}
    </div>}
  </section>
}
