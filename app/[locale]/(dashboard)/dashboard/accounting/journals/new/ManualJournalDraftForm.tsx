"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { getModuleOperationErrorReason } from "@/lib/modules/module-operation-error"

type SubmissionResult = { success: true } | { success: false; error: string; code?: string; reason?: string }
type Labels = {
  stoppedTitle: string; stoppedDescription: string; reviewAccess: string; openQueue: string
  failedTitle: string; connectionFailure: string; creating: string; createDraft: string
}

export default function ManualJournalDraftForm({ children, submitAction, queueHref, successHref, labels }: {
  children: ReactNode; submitAction: (form: FormData) => Promise<SubmissionResult>
  queueHref: string; successHref: string; labels: Labels
}) {
  const router = useRouter()
  const submitting = useRef(false)
  const alert = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<{ stopped: boolean; message: string } | null>(null)

  useEffect(() => { setReady(true) }, [])
  useEffect(() => { if (failure) alert.current?.focus() }, [failure])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || submitting.current) return
    const form = new FormData(event.currentTarget)
    submitting.current = true
    setPending(true)
    setFailure(null)
    let confirmed = false
    try {
      const result = await submitAction(form)
      if (result.success) {
        confirmed = true
        router.push(successHref)
        return
      }
      const stopped = getModuleOperationErrorReason(result) === "MODULE_NEW_WORK_STOPPED"
      setFailure({ stopped, message: stopped ? labels.stoppedDescription : result.error })
    } catch {
      // An unknown transport outcome is not a safe automatic retry. Keep all
      // fields and direct the user to existing records before another attempt.
      setFailure({ stopped: false, message: labels.connectionFailure })
    } finally {
      if (!confirmed) {
        submitting.current = false
        setPending(false)
      }
    }
  }

  return <form onSubmit={submit} className="space-y-5 p-5" aria-busy={pending || !ready}>
    <fieldset disabled={pending || !ready} className="min-w-0 space-y-5">{children}</fieldset>
    {failure ? <div ref={alert} role="alert" tabIndex={-1} className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4 text-sm leading-6 text-[var(--dash-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">
      <p className="font-semibold">{failure.stopped ? labels.stoppedTitle : labels.failedTitle}</p>
      <p>{failure.message}</p>
      {failure.stopped ? <p>{labels.reviewAccess}</p> : null}
      <a href={queueHref} className="mt-2 inline-block underline underline-offset-4">{labels.openQueue}</a>
    </div> : null}
    <button type="submit" disabled={pending || !ready} className="dashboard-button-create h-10 rounded-lg px-4 text-sm font-medium disabled:opacity-60">{pending ? labels.creating : labels.createDraft}</button>
  </form>
}
