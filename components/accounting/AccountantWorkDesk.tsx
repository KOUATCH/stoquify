"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import {
  acceptAccountantWorkItemAction, getAccountantWorkDeskAction, getAccountantWorkDetailAction,
} from "@/actions/accounting/accountant-work-desk.actions"
import type { AccountantWorkDesk as WorkDeskData, AccountantWorkDetail, AccountantWorkClientPage } from "@/services/accounting/accountant-work-desk.contracts"
import { accountantWorkDeskCopy } from "./accountant-work-desk-copy"
import { AccountantNotificationHistory } from "./AccountantNotificationHistory"

const button = "dashboard-button-primary inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"

export function AccountantWorkDesk({ locale = "en" }: { locale?: string }) {
  const language = locale === "fr" ? "fr" : "en"
  const copy = accountantWorkDeskCopy[language]
  const [data, setData] = useState<WorkDeskData | null>(null)
  const [detail, setDetail] = useState<AccountantWorkDetail | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [notes, setNotes] = useState("")
  const [command, setCommand] = useState<{ notes: string; key: string; replacement: { checklistItemId: string; bindingHash: string } } | null>(null)
  const [replacementReviewed, setReplacementReviewed] = useState(false)
  const [needsIdentity, setNeedsIdentity] = useState(false)
  const [password, setPassword] = useState("")
  const [pageIncomplete, setPageIncomplete] = useState(false)
  const revision = useRef(0)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const identityInput = useRef<HTMLInputElement>(null)
  const acceptButton = useRef<HTMLButtonElement>(null)

  function forgetClient(clientOrganizationId: string) {
    setData(current => current ? { ...current, items: current.items.filter(item => item.clientOrganizationId !== clientOrganizationId), clientContinuations: current.clientContinuations.filter(item => item.clientOrganizationId !== clientOrganizationId) } : null)
    if (detail?.clientOrganizationId === clientOrganizationId) { setDetail(null); setNotes(""); setCommand(null); setNeedsIdentity(false); setPassword("") }
    setMessage(copy.denied)
  }

  async function load(afterGrantId?: string) {
    const current = ++revision.current
    setPending(true); setDetail(null); setData(null); setMessage(""); setCommand(null); setNotes("")
    setNeedsIdentity(false); setPassword("")
    setPageIncomplete(false)
    try {
      const response = await getAccountantWorkDeskAction(afterGrantId ? { afterGrantId } : {})
      if (current !== revision.current) return
      if (response.success) setData(response.data)
      else setMessage(response.code === "FORBIDDEN" ? copy.denied : copy.error)
    } catch { if (current === revision.current) setMessage(copy.error) }
    finally { if (current === revision.current) setPending(false) }
  }
  async function loadClient(page: AccountantWorkClientPage) {
    if (!data || pending) return
    const current = ++revision.current
    setPending(true); setMessage("")
    try {
      const response = await getAccountantWorkDeskAction({ clientPage: page })
      if (current !== revision.current) return
      if (!response.success) {
        if (response.code === "FORBIDDEN" || response.code === "AUTH_REQUIRED") {
          setData({ ...data, items: data.items.filter(item => item.clientOrganizationId !== page.clientOrganizationId), clientContinuations: data.clientContinuations.filter(item => item.clientOrganizationId !== page.clientOrganizationId) })
          if (detail?.clientOrganizationId === page.clientOrganizationId) { setDetail(null); setNotes(""); setCommand(null); setNeedsIdentity(false); setPassword("") }
          setMessage(copy.denied)
        } else setMessage(copy.pageError)
        return
      }
      const next = response.data
      const continuation = next.clientContinuations.find(item => item.clientOrganizationId === page.clientOrganizationId)
      if (!continuation || next.items.some(item => item.clientOrganizationId !== page.clientOrganizationId)) throw new Error()
      const items = Array.from(new Map([...data.items, ...next.items].map(item => [`${item.clientOrganizationId}:${item.requestId}`, item])).values())
      const rank = { OVERDUE: 0, DUE_SOON: 1, SCHEDULED: 2 }
      items.sort((a, b) => rank[a.urgency] - rank[b.urgency] || Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.clientOrganizationId.localeCompare(b.clientOrganizationId) || a.requestId.localeCompare(b.requestId))
      setData({ ...data, generatedAt: next.generatedAt, items, clientContinuations: data.clientContinuations.map(item => item.clientOrganizationId === page.clientOrganizationId ? { ...item, [page.kind]: continuation[page.kind] } : item) })
      setPageIncomplete(old => old || next.incompleteClients > 0 || next.unavailableClients > 0)
      setMessage(copy.pageLoaded)
    } catch { if (current === revision.current) setMessage(copy.pageError) }
    finally { if (current === revision.current) setPending(false) }
  }
  useEffect(() => {
    void load()
    return () => { revision.current += 1 }
    // Reload when the language/context page remounts; actions own authorization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])
  useEffect(() => { setReplacementReviewed(false); if (detail) detailHeading.current?.focus() }, [detail])
  useEffect(() => {
    if (pending) return
    if (needsIdentity) identityInput.current?.focus()
    else if (message === copy.authenticated) acceptButton.current?.focus()
  }, [needsIdentity, pending, message, copy.authenticated])

  async function open(clientOrganizationId: string, requestId: string) {
    const current = ++revision.current
    setPending(true); setDetail(null); setMessage(""); setNotes(""); setCommand(null)
    setNeedsIdentity(false); setPassword("")
    try {
      const response = await getAccountantWorkDetailAction({ clientOrganizationId, requestId })
      if (current !== revision.current) return
      if (response.success) setDetail(response.data)
      else { setData(null); setMessage(response.code === "FORBIDDEN" ? copy.denied : copy.stale) }
    } catch { if (current === revision.current) setMessage(copy.error) }
    finally { if (current === revision.current) setPending(false) }
  }
  async function accept() {
    if (!detail || pending || detail.replacement?.status !== "AVAILABLE" || !replacementReviewed) return
    const current = ++revision.current
    const submitted = command ?? { notes: notes.trim(), key: crypto.randomUUID(), replacement: detail.replacement.selection }
    setCommand(submitted); setPending(true); setMessage("")
    try {
      const response = await acceptAccountantWorkItemAction({
        clientOrganizationId: detail.clientOrganizationId,
        requestId: detail.item.request.requestId,
        responseId: detail.item.response.responseId,
        resolutionNotes: submitted.notes,
        correlationId: submitted.key,
        replacement: submitted.replacement,
      })
      if (current !== revision.current) return
      if (response.success) { setDetail(null); setData(null); setMessage(copy.saved) }
      else if (response.code === "FRESH_AUTH_REQUIRED") { setMessage(copy.fresh); setNeedsIdentity(true) }
      else if (response.code === "FORBIDDEN") { setDetail(null); setData(null); setMessage(copy.denied) }
      else if (response.code === "CONFLICT") {
        setCommand(null); setReplacementReviewed(false); setMessage(copy.sourceChanged)
        setDetail({ ...detail, replacement: { status: "UNAVAILABLE", reason: "COLLECTION_UNVERIFIED" } })
        const refreshed = await getAccountantWorkDetailAction({ clientOrganizationId: detail.clientOrganizationId, requestId: detail.item.request.requestId })
        if (current === revision.current) {
          if (refreshed.success) setDetail(refreshed.data)
          else if (refreshed.code === "FORBIDDEN") { setDetail(null); setData(null); setMessage(copy.denied) }
          else setMessage(copy.sourceChanged)
        }
      }
      else setMessage(copy.retry)
    } catch { if (current === revision.current) setMessage(copy.retry) }
    finally { if (current === revision.current) setPending(false) }
  }
  async function refreshReplacement() {
    if (!detail || pending) return
    const current = ++revision.current
    setPending(true); setMessage(""); setCommand(null); setReplacementReviewed(false)
    try {
      const response = await getAccountantWorkDetailAction({ clientOrganizationId: detail.clientOrganizationId, requestId: detail.item.request.requestId })
      if (current !== revision.current) return
      if (response.success) setDetail(response.data)
      else if (response.code === "FORBIDDEN") { setDetail(null); setData(null); setMessage(copy.denied) }
      else setMessage(copy.stale)
    } catch { if (current === revision.current) setMessage(copy.error) }
    finally { if (current === revision.current) setPending(false) }
  }
  async function confirmIdentity() {
    if (pending || !password) return
    const current = ++revision.current
    const enteredPassword = password
    setPassword(""); setPending(true)
    try {
      const result = await stepUpWithPasswordAction({ password: enteredPassword })
      if (current !== revision.current) return
      setNeedsIdentity(!result.success)
      setMessage(result.success ? copy.authenticated : copy.authFailed)
    } catch { if (current === revision.current) setMessage(copy.authFailed) }
    finally { if (current === revision.current) setPending(false) }
  }
  function date(value: string) { return new Date(value).toLocaleString(language === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC" }) }

  return <section className="dashboard-glass-panel mb-6 min-w-0 rounded-lg p-5" aria-labelledby="accountant-work-title" aria-busy={pending}>
    <h2 id="accountant-work-title" className="text-lg font-semibold">{copy.title}</h2>
    <p className="mt-2 text-sm text-[var(--dash-text-soft)]">{copy.scope}</p>
    <div className="my-4 flex flex-wrap gap-2">
      <button className={`${button} aria-disabled:opacity-50`} onClick={() => { if (!pending) void load() }} aria-disabled={pending}>{copy.refresh}</button>
      {data?.nextCursor && <button className={button} disabled={pending} onClick={() => void load(data.nextCursor!)}>{copy.next}</button>}
    </div>
    <p role="status" aria-live="polite">{pending ? copy.loading : message}</p>
    {data && (data.unavailableClients > 0 || data.incompleteClients > 0 || pageIncomplete) && <p role="status" className="my-3">{copy.partial}</p>}
    {data && data.items.length === 0 && <p className="py-3">{copy.empty}</p>}
    <ul className="grid gap-3 lg:grid-cols-2">
      {data?.items.map(item => <li key={`${item.clientOrganizationId}:${item.requestId}`} className="min-w-0 break-words rounded-lg border p-4">
        <h3 className="font-semibold">{item.clientName}</h3>
        <p>{copy.period}: {item.periodName}</p>
        <p>{copy.urgency[item.urgency]}</p>
        <p>{copy.due}: <time dateTime={item.dueAt}>{date(item.dueAt)}</time></p>
        {item.submittedAt && <p>{copy.submitted}: <time dateTime={item.submittedAt}>{date(item.submittedAt)}</time></p>}
        <p>{item.evidenceState === "AWAITING_RESPONSE" ? copy.clientOwner : copy.owner}</p><p>{item.requestedByYou ? copy.yours : copy.other}</p>
        <p>{item.evidenceState === "AWAITING_RESPONSE" ? copy.awaiting : copy.evidence}</p>
        <p>{item.evidenceState === "RESPONSE_SUBMITTED" ? copy.responseNotification : copy.requestNotification}: {copy.delivery[item.delivery ?? "UNKNOWN"]}</p>
        <p>{item.publication ? <>{copy.published}: <time dateTime={item.publication.publishedAt}>{date(item.publication.publishedAt)}</time></> : copy.notPublished}</p>
        {item.publication && <p className="text-sm text-[var(--dash-text-soft)]">{copy.publicationHelp}</p>}
        {item.evidenceState !== "AWAITING_RESPONSE" && <button className={`${button} mt-3`} disabled={pending} onClick={() => void open(item.clientOrganizationId, item.requestId)} aria-label={`${copy.review}: ${item.clientName}, ${item.periodName}`}>{copy.review}</button>}
      </li>)}
    </ul>
    {!!data?.clientContinuations?.length && <div className="my-4 space-y-3">
      {data.clientContinuations.some(client => client.requests || client.reviews) && <p className="text-sm">{copy.moreScope}</p>}
      {data.clientContinuations.map(client => <div key={client.clientOrganizationId} className="min-w-0 space-y-3 rounded-lg border p-3">
        <p className="break-words font-medium">{client.clientName}</p>
        <div className="mt-2 flex flex-wrap gap-2">{(["requests", "reviews"] as const).map(kind => client[kind] && <button key={kind} type="button" className={`${button} max-w-full whitespace-normal text-left`} disabled={pending} onClick={() => void loadClient({ clientOrganizationId: client.clientOrganizationId, kind, cursor: client[kind]! })} aria-label={`${copy.more[kind]}: ${client.clientName}`}>{copy.more[kind]}</button>)}</div>
        <AccountantNotificationHistory clientOrganizationId={client.clientOrganizationId} clientName={client.clientName} locale={language} disabled={pending} onDenied={() => forgetClient(client.clientOrganizationId)} />
      </div>)}
    </div>}
    {detail && <section className="mt-6 rounded-lg border p-4" aria-labelledby="accountant-work-detail">
      <h3 id="accountant-work-detail" ref={detailHeading} tabIndex={-1} className="font-semibold">{copy.review} — {detail.item.period.name}</h3>
      <p className="my-2">{copy.caution}</p>
      <h4 className="font-medium">{copy.request}</h4><p className="whitespace-pre-wrap break-words">{detail.item.request.requestText}</p>
      <h4 className="mt-3 font-medium">{copy.response}</h4><p className="whitespace-pre-wrap break-words">{detail.item.response.responseText}</p>
      <Link className="my-3 inline-flex min-h-11 items-center underline" href={`/${language}/dashboard/accounting/accountant-portal?clientOrganizationId=${encodeURIComponent(detail.clientOrganizationId)}&periodId=${encodeURIComponent(detail.item.period.id)}`}>{copy.proof}</Link>
      <div className="my-3 rounded-lg border p-3">
        <h4 className="font-medium">{copy.replacementTitle}</h4>
        <p className="mt-2">{copy.replacementScope}</p>
        {detail.replacement?.status === "AVAILABLE" ? <>
          <p className="mt-2 font-medium">{copy.collectors[detail.replacement.checklistKey as keyof typeof copy.collectors] ?? copy.replacementTitle}</p>
          <p>{copy.controlOutcome}: {copy.controlStatuses[detail.replacement.controlStatus]}</p>
          <p className="mt-2">{copy.collectedAt}: <time dateTime={detail.replacement.observedAt}>{date(detail.replacement.observedAt)}</time></p>
          <p>{copy.recoveredCount}: {detail.replacement.recoveredEvidenceCount}</p>
          <label className="mt-3 flex items-start gap-2">
            <input type="checkbox" className="mt-1 size-5 shrink-0" checked={replacementReviewed} disabled={pending || command !== null} onChange={event => setReplacementReviewed(event.target.checked)} />
            <span>{copy.reviewReplacement}</span>
          </label>
        </> : <p role="status" className="mt-2">{copy.replacementUnavailable}</p>}
        <button className={`${button} mt-3`} disabled={pending || command !== null} onClick={() => void refreshReplacement()}>{copy.refreshEvidence}</button>
      </div>
      <label htmlFor="accountant-work-notes" className="block">{copy.notes}</label>
      <textarea id="accountant-work-notes" className="mt-2 w-full rounded-lg border bg-transparent p-3" rows={4} value={notes} onChange={event => setNotes(event.target.value)} minLength={10} maxLength={4000} disabled={pending || command !== null} />
      {needsIdentity && <form className="mt-3 grid gap-2" onSubmit={event => { event.preventDefault(); void confirmIdentity() }}>
        <label htmlFor="accountant-work-password">{copy.password}</label>
        <input id="accountant-work-password" ref={identityInput} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={pending} className="min-w-0 rounded-lg border bg-transparent p-3" />
        <button className={button} disabled={pending || !password} type="submit">{copy.confirmIdentity}</button>
      </form>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button ref={acceptButton} className={button} disabled={pending || needsIdentity || notes.trim().length < 10 || detail.replacement?.status !== "AVAILABLE" || !replacementReviewed} onClick={() => void accept()}>{pending ? copy.accepting : copy.accept}</button>
        <button className={button} disabled={pending} onClick={() => { setDetail(null); setCommand(null); setNotes(""); setPassword(""); setNeedsIdentity(false) }}>{copy.close}</button>
      </div>
    </section>}
  </section>
}
