"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getCloseEvidenceWorkflowAction, getCloseEvidenceReviewAction, requestCloseEvidenceAction, respondCloseEvidenceAction, acceptCloseEvidenceAction, replaceCloseEvidenceRecipientAction } from "@/actions/accounting/close-evidence-workflow.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { CloseEvidenceWorkflow, CloseEvidenceReview } from "@/services/accounting/close-evidence-workflow.service"
import type { CloseEvidencePage } from "@/services/accounting/close-evidence-pagination"
import { closeEvidenceFindingTitle, closeEvidenceWorkflowCopy } from "./close-evidence-workflow-copy"
import { CloseEvidenceInvestigationPanel } from "./CloseEvidenceInvestigationPanel"
import { CloseEvidenceNotifications } from "./CloseEvidenceNotifications"
import { CloseNotificationOperations } from "./CloseNotificationOperations"

type Mode = "request" | "respond" | "review" | "replace"
type Command = { mode: Mode; input: Record<string, unknown> }
type Draft = { mode: Mode | ""; findingId: string; recipientId: string; requestId: string; due: string; text: string; notes: string; revision?: string }
const empty: Draft = { mode: "", findingId: "", recipientId: "", requestId: "", due: "", text: "", notes: "" }
const button = "dashboard-button-primary min-h-11 rounded-lg px-3 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
const field = "dashboard-control w-full min-w-0 rounded-lg p-3"

export function CloseEvidenceWorkflowPanel({ periodId, locale = "en" }: { periodId: string; locale?: "en" | "fr" }) {
  const copy = closeEvidenceWorkflowCopy[locale], [data, setData] = useState<CloseEvidenceWorkflow | null>(null)
  const [draft, setDraft] = useState<Draft>(empty), [pending, setPending] = useState<Command | null>(null)
  const [detail, setDetail] = useState<CloseEvidenceReview | null>(null), [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [message, setMessage] = useState("")
  const [failed, setFailed] = useState(false), [fresh, setFresh] = useState(false), [password, setPassword] = useState("")
  const generation = useRef(0), storage = useRef<string | null>(null), notice = useRef<HTMLParagraphElement>(null), passwordInput = useRef<HTMLInputElement>(null)
  const load = useCallback(async () => {
    const token = ++generation.current; setLoading(true); setDetail(null); setChecked(false)
    try {
      const result = await getCloseEvidenceWorkflowAction({ periodId })
      if (generation.current !== token) return
      if (!result.success || !result.data) { setData(null); setFailed(true); setMessage(copy.error); return }
      const key = `close-evidence:${result.data.organizationId}:${result.data.actorId}:${periodId}`
      if (storage.current !== key) {
        let restored: { draft?: Draft; pending?: Command } = {}
        try { restored = JSON.parse(sessionStorage.getItem(key) || "{}") } catch { /* Unavailable storage does not prevent use. */ }
        const candidate = restored.draft
        setDraft(candidate && Object.keys(empty).every(name => typeof candidate[name as keyof Draft] === "string") && ["", "request", "respond", "review", "replace"].includes(candidate.mode) ? candidate : empty)
        setPending(restored.pending && ["request", "respond", "review", "replace"].includes(restored.pending.mode) && restored.pending.input && typeof restored.pending.input === "object" ? restored.pending : null)
        storage.current = key
      }
      setData(result.data)
    } catch { if (generation.current === token) { setData(null); setFailed(true); setMessage(copy.error) } }
    finally { if (generation.current === token) setLoading(false) }
  }, [periodId, copy.error])
  const loadMore = async (kind: CloseEvidencePage["kind"]) => {
    const cursor = data?.cursors?.[kind]
    if (!data || !cursor || busy || loading) return
    const token = ++generation.current; setLoading(true)
    try {
      const result = await getCloseEvidenceWorkflowAction({ periodId, page: { kind, cursor } })
      if (generation.current !== token) return
      if (!result.success && ["FORBIDDEN", "AUTH_REQUIRED"].includes(result.code || "")) {
        setData(null); setDetail(null); setChecked(false); setFailed(true); setMessage(copy.denied); return
      }
      if (!result.success || !result.data) throw new Error()
      const next = result.data
      if (next.organizationId !== data.organizationId || next.actorId !== data.actorId || next.periodId !== periodId) { setData(null); throw new Error() }
      if (["writable", "canRequest", "canRespond", "canReview", "canTrack", "canReplace", "canSupervise"].some(key => data[key as "writable"] !== next[key as "writable"])) {
        setData(next); setDetail(null); setChecked(false); setFailed(true); setMessage(copy.stale); return
      }
      // Merge only the requested collection. Keep the selected form, prior rows,
      // recipient choice and pending command; pagination never submits a write.
      const cursors = { ...data.cursors, [kind]: next.cursors[kind] }
      const merge = <T,>(prior: T[], added: T[], identity: (row: T) => string) => Array.from(new Map([...prior, ...added].map(row => [identity(row), row])).values())
      const evidenceIssue = data.evidenceIssue || next.evidenceIssue
      setData({ ...data, generatedAt: next.generatedAt, cursors, evidenceIssue, partial: evidenceIssue || Object.values(cursors).some(Boolean),
        assessments: { ...data.assessments, ...next.assessments },
        tracking: kind === "tracking" ? merge(data.tracking ?? [], next.tracking, row => row.requestId) : data.tracking,
        supervision: kind === "supervision" ? merge(data.supervision ?? [], next.supervision, row => row.requestId) : data.supervision,
        findings: kind === "findings" ? merge(data.findings, next.findings, row => row.id) : data.findings,
        recipients: kind === "recipients" ? merge(data.recipients, next.recipients, row => row.id) : data.recipients,
        requests: kind === "requests" ? merge(data.requests, next.requests, row => row.requestId) : data.requests,
        reviews: kind === "reviews" ? merge(data.reviews, next.reviews, row => row.request.requestId) : data.reviews })
      setFailed(false); setMessage(copy.pageLoaded)
    } catch { if (generation.current === token) { setFailed(true); setMessage(copy.pageError) } }
    finally { if (generation.current === token) setLoading(false) }
  }
  useEffect(() => { void load(); return () => { generation.current += 1 } }, [load])
  useEffect(() => { if (data && storage.current) { try { sessionStorage.setItem(storage.current, JSON.stringify({ draft, pending })) } catch { /* Keep the in-memory draft. */ } } }, [data, draft, pending])
  useEffect(() => { if (fresh) passwordInput.current?.focus(); else if (message) notice.current?.focus() }, [fresh, message])
  const change = (name: keyof Draft, value: string) => setDraft(old => ({ ...old, [name]: value }))
  const tracked = [...(data?.tracking ?? []), ...(data?.supervision ?? [])]
  const select = async (mode: Mode, id: string) => {
    setDraft(old => ({ ...empty, mode, [mode === "request" ? "findingId" : "requestId"]: id, ...(old.mode === mode && (old.findingId === id || old.requestId === id) ? old : {}), ...(mode === "replace" ? { revision: tracked.find(row => row.requestId === id)?.assignment?.revision } : {}) }))
    setMessage(""); setFresh(false); setDetail(null); setChecked(false)
    if (mode !== "review") return
    setBusy(true)
    try { const result = await getCloseEvidenceReviewAction({ requestId: id }); if (!result.success || !result.data) throw new Error(); setDetail(result.data) }
    catch { setFailed(true); setMessage(copy.stale) }
    finally { setBusy(false) }
  }
  const confirm = async () => {
    if (busy || fresh || !draft.mode || !data || !data.writable || !(draft.mode === "request" ? data.canRequest : draft.mode === "respond" ? data.canRespond : draft.mode === "replace" ? data.canReplace : data.canReview)) return
    let command = pending
    if (!command) {
      const correlationId = crypto.randomUUID()
      if (draft.mode === "request") {
        const dueAt = new Date(draft.due)
        if (!draft.recipientId || !draft.findingId || draft.text.trim().length < 10 || !Number.isFinite(dueAt.getTime()) || dueAt <= new Date()) { setFailed(true); setMessage(copy.requestHelp); return }
        command = { mode: "request", input: { findingId: draft.findingId, requestedFromId: draft.recipientId, requestText: draft.text.trim(), dueAt: dueAt.toISOString(), correlationId } }
      } else if (draft.mode === "replace") {
        const current = tracked.find(row => row.requestId === draft.requestId)
        if (!draft.revision || !draft.recipientId || draft.text.trim().length < 10 || current?.state !== "AWAITING_RESPONSE" || !current.assignment || draft.recipientId === current.assignment.recipientId || draft.revision !== current.assignment.revision) { setFailed(true); setMessage(copy.stale); return }
        command = { mode: "replace", input: { requestId: draft.requestId, expectedRevision: draft.revision, requestedFromId: draft.recipientId, reason: draft.text.trim(), correlationId } }
      } else if (draft.mode === "respond") {
        if (draft.text.trim().length < 3) return
        command = { mode: "respond", input: { requestId: draft.requestId, responseText: draft.text.trim(), correlationId } }
      } else {
        if (!detail?.canAccept || detail.replacement.status !== "AVAILABLE" || !checked || draft.notes.trim().length < 10) return
        command = { mode: "review", input: { requestId: detail.item.request.requestId, responseId: detail.item.response.responseId, resolutionNotes: draft.notes.trim(), replacement: detail.replacement.selection, correlationId } }
      }
    }
    setPending(command); setBusy(true); setFailed(false); setMessage("")
    try {
      const action = command.mode === "request" ? requestCloseEvidenceAction : command.mode === "respond" ? respondCloseEvidenceAction : command.mode === "replace" ? replaceCloseEvidenceRecipientAction : acceptCloseEvidenceAction
      const result = await action(command.input)
      if (!result.success) {
        setFailed(true)
        if (result.code === "FRESH_AUTH_REQUIRED") { setFresh(true); setMessage(copy.fresh) }
        else if (result.code === "REVIEW_REQUIRED") { setPending(null); setDetail(null); setChecked(false); setMessage(copy.trackingReviewHelp) }
        else if (["FORBIDDEN", "CONFLICT", "NOT_FOUND", "VALIDATION_ERROR", "BUSINESS_RULE_VIOLATION"].includes(result.code || "")) { setPending(null); setDetail(null); setChecked(false); setMessage(result.code === "CONFLICT" && command.mode === "request" ? copy.requestConflict : copy.stale) }
        else setMessage(copy.failed)
        return
      }
      setPending(null); setDraft(empty); setDetail(null); setMessage(command.mode === "request" ? copy.requestSaved : command.mode === "respond" ? copy.responseSaved : command.mode === "replace" ? copy.replaceSaved : copy.accepted)
      await load()
    } catch { setFailed(true); setMessage(copy.failed) }
    finally { setBusy(false) }
  }
  const verify = async () => {
    if (!password || busy) return
    setBusy(true)
    try { const result = await stepUpWithPasswordAction({ password }); if (!result.success) throw new Error(); setFresh(false); setFailed(false); setMessage(copy.verified) }
    catch { setFailed(true); setMessage(copy.fresh) }
    finally { setPassword(""); setBusy(false) }
  }
  const disabled = busy || loading || !!pending
  const canOperate = !!data?.writable && (draft.mode === "request" ? data.canRequest : draft.mode === "respond" ? data.canRespond : draft.mode === "replace" ? data.canReplace : data.canReview)
  const changing = tracked.find(row => row.requestId === draft.requestId)
  const request = data?.requests.find(row => row.requestId === draft.requestId)
  const finding = data?.findings.find(row => row.id === draft.findingId)
  const context = (runId: string, reference: string, assessments = data?.assessments) => {
    const assessment = assessments?.[runId]
    return <div className="my-2 space-y-1 break-words text-sm text-[var(--dash-text-muted)]">
      {assessment ? <p>{copy.assessment}: <time dateTime={assessment.asOf}>{new Date(assessment.asOf).toLocaleString(locale)}</time></p> : <p>{copy.assessmentUnavailable}</p>}
      {runId && <p>{copy.assessmentReference}: {runId}</p>}
      <p>{copy.reference}: {reference}</p>
    </div>
  }
  const title = (value: string) => closeEvidenceFindingTitle(value, locale)
  return <section aria-labelledby="close-evidence-title" className="dashboard-glass-panel min-w-0 space-y-4 rounded-2xl p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="close-evidence-title" className="text-xl font-semibold">{copy.title}</h2><button type="button" className={button} disabled={busy || loading} onClick={() => void load()}>{copy.refresh}</button></div>
    <CloseEvidenceNotifications key={periodId} periodId={periodId} locale={locale} />
    {data?.canReview && <CloseNotificationOperations key={`delivery-${periodId}`} periodId={periodId} locale={locale} />}
    <p>{copy.scope}</p><p className="text-sm">{copy.dates}</p>
    {message && <p ref={notice} tabIndex={-1} role={failed ? "alert" : "status"} className="break-words rounded-lg border border-[var(--dash-border)] p-3">{message}</p>}
    {loading && <p role="status">{copy.loading}</p>}
    {data?.partial && <p role="alert" className="text-[var(--dash-warning)]">{copy.partial}</p>}
    {data && !data.findings.length && !data.requests.length && !data.reviews.length && !tracked.length && <p>{copy.empty}</p>}
    {data && <ul className="space-y-3">
      {data.findings.map(row => <li key={row.id} className="min-w-0 break-words rounded-lg border border-[var(--dash-border)] p-3"><p className="font-semibold">{title(row.title)}</p>{context(row.closeRunId, row.id)}<details className="mb-2 text-sm"><summary>{copy.sourceText}</summary>{title(row.title) !== row.title && <p>{row.title}</p>}<p>{row.detail}</p></details><button className={button} disabled={disabled} onClick={() => void select("request", row.id)}>{copy.request}</button></li>)}
      {data.requests.map(row => <li key={row.requestId} className="min-w-0 break-words rounded-lg border border-[var(--dash-border)] p-3"><p className="font-semibold">{title(row.finding.title)}</p>{context(row.closeRunId, row.requestId)}<p>{row.requestText}</p><p>{copy.dueLabel}: <time dateTime={row.dueAt}>{new Date(row.dueAt).toLocaleString(locale)}</time></p><div className="mt-2">{row.workflowState === "RESPONSE_SUBMITTED" ? <p>{copy.submitted}</p> : data.canRespond && <button className={button} disabled={disabled} onClick={() => void select("respond", row.requestId)}>{copy.respond}</button>}</div></li>)}
      {data.reviews.map(row => <li key={row.response.responseId} className="min-w-0 break-words rounded-lg border border-[var(--dash-border)] p-3"><p className="font-semibold">{title(row.finding.title)}</p>{context(row.closeRunId, row.request.requestId)}<button className={button} disabled={disabled} onClick={() => void select("review", row.request.requestId)}>{copy.review}</button></li>)}
    </ul>}
    {data && <div className="flex flex-wrap gap-3">{(["findings", "requests", "reviews"] as const).map(kind => data.cursors?.[kind] && <button key={kind} type="button" className={button} disabled={disabled} onClick={() => void loadMore(kind)}>{copy.more[kind]}</button>)}</div>}
    {data?.canReview && <CloseEvidenceInvestigationPanel key={`${data.organizationId}:${data.actorId}:${periodId}`} periodId={periodId} locale={locale} writable={data.writable} draftIdentity={{ organizationId: data.organizationId, actorId: data.actorId }} />}
    {data && (["tracking", "supervision"] as const).map(kind => (kind === "tracking" ? data.canTrack : data.canSupervise) && <section key={kind} aria-labelledby={`close-request-${kind}-title`} className="space-y-3 border-t border-[var(--dash-border)] pt-4">
      <h3 id={`close-request-${kind}-title`} className="font-semibold">{kind === "tracking" ? copy.trackingTitle : copy.supervisionTitle}</h3><p className="text-sm">{kind === "tracking" ? copy.trackingScope : copy.supervisionScope}</p>
      {!data[kind]?.length && <p>{kind === "tracking" ? copy.trackingEmpty : copy.supervisionEmpty}</p>}
      <ul className="space-y-3">{data[kind]?.map(row => <li key={row.requestId} className="min-w-0 break-words rounded-lg border border-[var(--dash-border)] p-3">
        <p className="font-semibold">{row.title ? title(row.title) : copy.finding}</p>{context(row.closeRunId, row.requestId)}
        {row.requester && <><p>{copy.requester}: {row.requester.name || copy.requesterUnknown}</p>{row.requester.available === false && <p className="text-[var(--dash-warning)]">{copy.requesterUnavailable}</p>}{row.requester.available === null && <p>{copy.requesterUnknown}</p>}</>}
        <p>{copy.trackingStates[row.state]}</p>
        {row.recipientName && <p>{copy.recipient}: {row.recipientName}</p>}
        {row.state === "AWAITING_RESPONSE" && !row.recipientAvailable && <p className="text-[var(--dash-warning)]">{copy.recipientUnavailable}</p>}
        {row.state === "REVIEW_REQUIRED" && <p>{copy.trackingReviewHelp}</p>}
        {row.dueAt && <p>{copy.dueLabel}: <time dateTime={row.dueAt}>{new Date(row.dueAt).toLocaleString(locale)}</time></p>}
        {row.respondedAt && <p>{copy.responseRecorded}: <time dateTime={row.respondedAt}>{new Date(row.respondedAt).toLocaleString(locale)}</time></p>}
        {row.acceptedAt && <p>{copy.acceptanceRecorded}: <time dateTime={row.acceptedAt}>{new Date(row.acceptedAt).toLocaleString(locale)}</time></p>}
        {row.assignment?.changedAt && <><p>{copy.ownerChanged}: <time dateTime={row.assignment.changedAt}>{new Date(row.assignment.changedAt).toLocaleString(locale)}</time></p><p>{copy.changeReason}: {row.assignment.reason}</p></>}
        {data.canReplace && row.state === "AWAITING_RESPONSE" && row.assignment && <button type="button" className={button} disabled={disabled} onClick={() => void select("replace", row.requestId)}>{copy.replace}</button>}
      </li>)}</ul>
      {data.cursors?.[kind] && <button type="button" className={button} disabled={disabled} onClick={() => void loadMore(kind)}>{copy.more[kind]}</button>}
    </section>)}
    {data && draft.mode && <form className="min-w-0 space-y-4 border-t border-[var(--dash-border)] pt-4" onSubmit={event => { event.preventDefault(); void confirm() }}>
      <h3 className="font-semibold">{copy[draft.mode]}</h3>
      {draft.mode === "request" && finding && <><p>{title(finding.title)}</p>{context(finding.closeRunId, finding.id)}</>}
      {draft.mode === "respond" && request && context(request.closeRunId, request.requestId)}
      {draft.mode === "replace" && changing && <>{context(changing.closeRunId, changing.requestId)}<p>{copy.recipient}: {changing.recipientName || copy.retainedRecipient}</p><p>{copy.replaceHelp}</p><label className="block">{copy.recipient}<select className={field} value={draft.recipientId} required disabled={disabled} onChange={event => change("recipientId", event.target.value)}><option value="">{copy.choose}</option>{data.recipients.filter(row => row.id !== changing.assignment?.recipientId).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>{data.cursors?.recipients && <button type="button" className={button} disabled={disabled} onClick={() => void loadMore("recipients")}>{copy.more.recipients}</button>}</>}
      {draft.mode === "review" && detail && context(detail.item.closeRunId, detail.item.request.requestId, detail.assessments)}
      {!canOperate && <p role="status">{copy.denied}</p>}
      {draft.mode === "request" && <><p>{copy.requestHelp}</p><label className="block">{copy.recipient}<select className={field} value={draft.recipientId} disabled={disabled} required onChange={event => change("recipientId", event.target.value)}><option value="">{copy.choose}</option>{draft.recipientId && !data.recipients.some(row => row.id === draft.recipientId) && <option value={draft.recipientId}>{copy.retainedRecipient}</option>}{data.recipients.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>{!data.recipients.length && <p>{data.cursors?.recipients ? copy.moreRecipientsHelp : copy.noRecipients}</p>}{data.cursors?.recipients && <button type="button" className={button} disabled={disabled} onClick={() => void loadMore("recipients")}>{copy.more.recipients}</button>}<label className="block">{copy.due}<input className={field} type="datetime-local" value={draft.due} required disabled={disabled} onChange={event => change("due", event.target.value)} /></label></>}
      {draft.mode === "respond" && <><p>{copy.responseHelp}</p>{request && <blockquote className="break-words">{request.requestText}</blockquote>}</>}
      {draft.mode !== "review" && <label className="block">{draft.mode === "replace" ? copy.replaceReason : copy.text}<textarea className={`${field} min-h-28`} value={draft.text} required minLength={draft.mode === "respond" ? 3 : 10} maxLength={4000} disabled={disabled} onChange={event => change("text", event.target.value)} /></label>}
      {draft.mode === "review" && <>{detail && <><h4>{copy.original}</h4><p className="break-words">{detail.item.request.requestText}</p><h4>{copy.response}</h4><p className="break-words">{detail.item.response.responseText}</p>{!detail.canAccept && <p>{copy.independent}</p>}{detail.replacement.status === "AVAILABLE" ? <><p>{copy.observation}: {new Date(detail.replacement.observedAt).toLocaleString(locale)}</p><p>{copy.controls}: {copy.outcomes[detail.replacement.controlStatus]}</p><label className="flex items-start gap-2"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={checked} disabled={disabled || !detail.canAccept} onChange={event => setChecked(event.target.checked)} />{copy.checked}</label></> : <p>{copy.unavailable}</p>}</>}<label className="block">{copy.notes}<textarea className={`${field} min-h-28`} value={draft.notes} minLength={10} maxLength={4000} required disabled={disabled} onChange={event => change("notes", event.target.value)} /></label></>}
      {pending && <p>{copy.pending}</p>}
      {fresh && <div className="space-y-3"><label className="block">{copy.password}<input ref={passwordInput} type="password" autoComplete="current-password" className={field} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label><button type="button" className={button} disabled={busy || !password} onClick={() => void verify()}>{copy.verify}</button></div>}
      <div className="flex flex-wrap gap-3"><button className={button} type="submit" disabled={busy || loading || fresh || !canOperate || (!pending && draft.mode === "review" && (!detail?.canAccept || detail.replacement.status !== "AVAILABLE" || !checked))}>{busy ? copy.working : pending ? copy.retry : draft.mode === "request" ? copy.submit : draft.mode === "respond" ? copy.submitResponse : draft.mode === "replace" ? copy.confirmReplace : copy.accept}</button>{!pending && <button type="button" className={button} disabled={busy} onClick={() => { setDraft(empty); setDetail(null); setPassword(""); setFresh(false) }}>{copy.cancel}</button>}</div>
    </form>}
    <p className="text-sm">{copy.history}</p>
  </section>
}
