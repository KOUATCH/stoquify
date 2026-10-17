"use client"

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { postJournalEntryAction, reverseJournalEntryAction } from "@/actions/accounting/journals.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getJournalWorkflowCopy } from "./journal-workflow-copy"

type Props = { locale: string; entryId: string; entryNumber: string; operation: "post" | "reverse" }
type Recovery = "none" | "identity" | "session" | "refresh"
const commandKey = ({ entryId, operation }: Props) => `${entryId}:${operation}`
const WorkflowFeedback = createContext<{
  openReview: (command: Props) => void
  registerTrigger: (key: string, element: HTMLButtonElement | null) => void
  activeKey: string | null
  completed: ReadonlySet<string>
} | null>(null)

// Table cells can remount when fresh RSC columns arrive. Own the command and
// dialog outside those cells, including while authentication or a write waits.
export function JournalWorkflowFeedback({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [commands, setCommands] = useState<ReadonlyMap<string, Props>>(() => new Map())
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() => new Set())
  const status = useRef<HTMLParagraphElement>(null)
  const region = useRef<HTMLDivElement>(null)
  const triggers = useRef(new Map<string, HTMLButtonElement>())
  const registerTrigger = useCallback((key: string, element: HTMLButtonElement | null) => {
    if (element) triggers.current.set(key, element)
    else triggers.current.delete(key)
  }, [])
  const openReview = useCallback((selected: Props) => {
    const key = commandKey(selected)
    setCommands(current => new Map(current).set(key, selected))
    setActiveKey(key)
  }, [])
  useEffect(() => { if (message) status.current?.focus() }, [message])
  return <WorkflowFeedback.Provider value={{ openReview, registerTrigger, completed, activeKey }}>
    <div ref={region} tabIndex={-1} data-journal-workflow-region className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">
      {message && <p ref={status} role="status" aria-live="polite" tabIndex={-1} data-journal-workflow-feedback
        className="dashboard-landing-theme dark mb-4 rounded-lg border border-[var(--dash-success)] bg-[var(--dash-success-soft)] p-3 text-sm text-[var(--dash-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{message}</p>}
      {children}
    </div>
    {[...commands].map(([key, command]) => <JournalEntryReview key={key} {...command} open={activeKey === key} onOpenChange={next => setActiveKey(next ? key : null)}
      onSuccess={receipt => { setMessage(receipt); setCompleted(current => new Set([...current, commandKey(command)])) }}
      focusSuccess={() => status.current?.focus()}
      returnFocus={() => {
        const currentTrigger = triggers.current.get(commandKey(command))
        if (currentTrigger?.isConnected && !currentTrigger.disabled) currentTrigger.focus()
        else region.current?.focus()
      }} />)}
  </WorkflowFeedback.Provider>
}

export function JournalEntryActions(props: Props) {
  const workflow = useContext(WorkflowFeedback)
  // The journals page supplies the stable provider; keep isolated consumers usable.
  return workflow ? <JournalEntryTrigger {...props} /> : <JournalWorkflowFeedback><JournalEntryTrigger {...props} /></JournalWorkflowFeedback>
}

function JournalEntryTrigger(props: Props) {
  const workflow = useContext(WorkflowFeedback)!
  const key = commandKey(props)
  const copy = getJournalWorkflowCopy(props.locale).actions
  const label = props.operation === "reverse" ? copy.reverse : copy.post
  const register = useCallback((element: HTMLButtonElement | null) => workflow.registerTrigger(key, element), [workflow.registerTrigger, key])
  return <div className="min-w-0" data-journal-entry-action={props.entryId}>
    <Button ref={register} type="button" variant="outline" size="sm" disabled={workflow.completed.has(key)}
      className="dashboard-button-secondary min-h-9 whitespace-normal" aria-label={`${label} — ${props.entryNumber}`}
      aria-haspopup="dialog" aria-expanded={workflow.activeKey === key} onClick={() => workflow.openReview(props)}>{label}</Button>
  </div>
}

function JournalEntryReview({ locale, entryId, entryNumber, operation, open, onOpenChange, onSuccess, returnFocus, focusSuccess }: Props & {
  open: boolean; onOpenChange: (open: boolean) => void; onSuccess: (receipt: string) => void; returnFocus: () => void; focusSuccess: () => void
}) {
  const copy = getJournalWorkflowCopy(locale).actions
  const router = useRouter()
  const id = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const confirm = useRef<HTMLButtonElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const inFlight = useRef(false)
  const returnToConfirm = useRef(false)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState("")
  const [date, setDate] = useState("")
  const [password, setPassword] = useState("")
  const [recovery, setRecovery] = useState<Recovery>("none")
  const [message, setMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const reversing = operation === "reverse"
  const confirmLabel = reversing ? copy.confirmReverse : copy.confirmPost

  useEffect(() => {
    if (!open || busy) return
    if (recovery === "identity") passwordInput.current?.focus()
    else if (returnToConfirm.current) { returnToConfirm.current = false; confirm.current?.focus() }
    else if (message) feedback.current?.focus()
  }, [open, busy, recovery, message])

  function changeOpen(next: boolean) {
    if (inFlight.current) return
    onOpenChange(next)
    setPassword("")
    if (next && recovery === "none") { setMessage(null); setNotice(null) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || recovery !== "none" || completed) return
    const reversalDate = new Date(`${date}T00:00:00.000Z`)
    if (reversing && (!reason.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(reversalDate.getTime()) || reversalDate.toISOString().slice(0, 10) !== date)) {
      setMessage(copy.invalid)
      return
    }
    inFlight.current = true
    setBusy(true); setMessage(null); setNotice(null)
    try {
      const result = reversing
        ? await reverseJournalEntryAction({ journalEntryId: entryId, reason: reason.trim(), reversalDate: `${date}T00:00:00.000Z` })
        : await postJournalEntryAction({ journalEntryId: entryId })
      if (result.success) {
        const receipt = `${entryNumber}: ${reversing ? copy.reversed : copy.posted}`
        setCompleted(true); onSuccess(receipt); onOpenChange(false)
        router.refresh()
      } else if (result.code === "FRESH_AUTH_REQUIRED") {
        setPassword(""); setRecovery("identity"); setMessage(copy.fresh)
      } else if (result.code === "AUTH_REQUIRED") {
        setRecovery("session"); setMessage(copy.authRequired)
      } else if (result.code === "FORBIDDEN") {
        setRecovery("refresh"); setMessage(copy.denied)
      } else if (result.code === "CONFLICT" || result.code === "CONCURRENCY_CONFLICT") {
        setRecovery("refresh"); setMessage(copy.changed)
      } else if (result.code === "SOD_VIOLATION") {
        setRecovery("refresh"); setMessage(copy.independent)
      } else if (result.code === "BUSINESS_RULE_VIOLATION" || result.code === "VALIDATION_ERROR") {
        setMessage(copy.rule)
      } else {
        setRecovery("refresh"); setMessage(copy.uncertain)
      }
    } catch {
      setRecovery("refresh"); setMessage(copy.uncertain)
    } finally { inFlight.current = false; setBusy(false) }
  }

  async function confirmIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || !password || recovery !== "identity") return
    const enteredPassword = password
    setPassword(""); setBusy(true); setMessage(null); inFlight.current = true
    try {
      const result = await stepUpWithPasswordAction({ password: enteredPassword })
      if (result.success) {
        setRecovery("none"); setNotice(copy.verified); returnToConfirm.current = true
      } else if (result.code === "AUTH_REQUIRED") {
        setRecovery("session"); setMessage(copy.authRequired)
      } else setMessage(result.code === "RATE_LIMITED" ? copy.identityRateLimited : copy.identityFailed)
    } catch { setMessage(copy.identityFailed) }
    finally { inFlight.current = false; setBusy(false) }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="dashboard-landing-theme dark max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text)] motion-reduce:animate-none motion-reduce:transition-none [overflow-wrap:anywhere]" closeLabel={copy.close} closeDisabled={busy}
        onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus() }}
        onCloseAutoFocus={event => {
          event.preventDefault()
          if (completed) focusSuccess()
          else returnFocus()
        }}
        onEscapeKeyDown={event => { if (inFlight.current) event.preventDefault() }}
        onInteractOutside={event => { if (inFlight.current) event.preventDefault() }}>
        <DialogHeader className="pr-6 text-left">
          <DialogTitle ref={heading} tabIndex={-1} className="leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{reversing ? copy.reviewReverse : copy.reviewPost} — {entryNumber}</DialogTitle>
          <DialogDescription className="text-[var(--dash-text-soft)]">{reversing ? copy.reverseDescription : copy.postDescription}</DialogDescription>
        </DialogHeader>
        <form id={`${id}-review`} aria-label={reversing ? copy.reviewReverse : copy.reviewPost} aria-busy={busy} onSubmit={submit}>
          {reversing && <fieldset disabled={busy || recovery !== "none"} className="min-w-0 space-y-4">
            <div className="space-y-2"><label htmlFor={`${id}-reason`} className="text-sm font-medium">{copy.reason}</label>
              <Textarea id={`${id}-reason`} required value={reason} onChange={event => setReason(event.target.value)} className="dashboard-control min-h-24" /></div>
            <div className="space-y-2"><label htmlFor={`${id}-date`} className="text-sm font-medium">{copy.date}</label>
              <Input id={`${id}-date`} type="date" required value={date} onChange={event => setDate(event.target.value)} aria-describedby={`${id}-date-help`} className="dashboard-control" />
              <p id={`${id}-date-help`} className="text-sm text-[var(--dash-text-soft)]">{copy.dateHelp}</p></div>
          </fieldset>}
        </form>
        {message && <div ref={feedback} role="alert" tabIndex={-1} className="rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{message}</div>}
        {recovery === "identity" && <form onSubmit={confirmIdentity} aria-label={copy.identity} aria-busy={busy} className="space-y-3 rounded-lg border border-[var(--dash-border)] p-3">
          <label htmlFor={`${id}-password`} className="block text-sm font-medium">{copy.password}</label>
          <Input ref={passwordInput} id={`${id}-password`} type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} className="dashboard-control" />
          <Button type="submit" disabled={busy || !password} className="dashboard-button-primary h-auto min-h-10 w-full whitespace-normal">{busy ? copy.verifying : copy.identity}</Button>
        </form>}
        {notice && <p role="status" aria-live="polite" className="text-sm text-[var(--dash-info)]">{notice}</p>}
        {recovery === "session" && <a className="text-sm text-[var(--dash-brand)] underline underline-offset-4" href={`/${locale === "fr" ? "fr" : "en"}/login`}>{copy.signIn}</a>}
        {recovery === "refresh" && <Button type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-10 whitespace-normal" onClick={() => { setRecovery("none"); setMessage(null); changeOpen(false); router.refresh() }}>{copy.refresh}</Button>}
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-10 whitespace-normal" disabled={busy} onClick={() => changeOpen(false)}>{copy.cancel}</Button>
          <Button ref={confirm} type="submit" form={`${id}-review`} className="dashboard-button-primary h-auto min-h-10 whitespace-normal" disabled={busy || recovery !== "none" || completed}>{busy ? copy.working : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
}
