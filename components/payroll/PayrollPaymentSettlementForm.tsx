"use client"

import type { FormEvent } from "react"
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, LockKeyhole } from "lucide-react"

import { recordPayrollPaymentSettlementEvidenceAction } from "@/actions/payroll/payroll-payment-reconciliation.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { Locale } from "@/types/bilingual"
import { payrollSettlementCopy } from "./payroll-settlement-copy"
import type { SettlementProofOptions, SettlementProofSelection } from "@/services/payroll/payment-settlement-proof-contracts"
import { PayrollSettlementProofSelector } from "./PayrollSettlementProofSelector"

type SettlementStatus = "settled" | "partially_settled"

type Props = {
  payrollPaymentBatchId: string
  batchNumber: string
  amount: string
  currency: string
  locale?: Locale
  balanceRevision?: string | null
  proofOptions?: SettlementProofOptions
  disabled?: boolean
}

type FormNotice =
  | { kind: "success"; message: string }
  | { kind: "fresh-auth" | "error" | "unknown" | "authenticated"; message: string; correlationId?: string }

function numericDefault(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value) ? value : ""
}

function nextIdempotencyKey(batchId: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `payroll-payment-settlement:${batchId}:${random}`
}

export default function PayrollPaymentSettlementForm({
  payrollPaymentBatchId,
  batchNumber,
  amount,
  currency,
  locale = "en",
  balanceRevision = null,
  proofOptions,
  disabled = false,
}: Props) {
  const router = useRouter()
  const copy = payrollSettlementCopy(locale)
  const hintId = useId()
  const defaultAmount = useMemo(() => numericDefault(amount), [amount])
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus>("settled")
  const [settlementAmount, setSettlementAmount] = useState(defaultAmount)
  const [proofSelection, setProofSelection] = useState<SettlementProofSelection | null>(null)
  const [notes, setNotes] = useState("")
  const [idempotencyKey, setIdempotencyKey] = useState(() => nextIdempotencyKey(payrollPaymentBatchId))
  const [notice, setNotice] = useState<FormNotice | null>(null)
  const [isPending, startTransition] = useTransition()
  const [completed, setCompleted] = useState(false)
  const [reviewed, setReviewed] = useState({ amount, revision: balanceRevision })
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null)
  const [password, setPassword] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)
  const restoreSubmitFocus = useRef(false)
  useEffect(() => setHydrated(true), [])
  const uncertain = notice?.kind === "unknown"
  const changed = amount !== reviewed.amount || balanceRevision !== reviewed.revision
  const locked = !hydrated || disabled || isPending || uncertain || completed
  const proofCurrent = Boolean(proofSelection && proofOptions?.register?.id === proofSelection.payrollRunId &&
    proofOptions.register.version === proofSelection.runVersion && proofOptions.register.revision === proofSelection.runRevision &&
    proofOptions.matches.some(match => match.id === proofSelection.matchRecordId && match.revision === proofSelection.matchRevision))

  useEffect(() => {
    if (isPending || !notice) return
    const restore = restoreSubmitFocus.current
    restoreSubmitFocus.current = false
    // Some browsers drop focus when the invoking button becomes disabled.
    // Restore only that lost focus, never an operator's intervening choice.
    if (restore && document.activeElement === document.body && !submitRef.current?.disabled) submitRef.current?.focus()
  }, [isPending, notice])

  function submitSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || isPending || completed || (!uncertain && (changed || !proofCurrent))) return
    restoreSubmitFocus.current = document.activeElement === submitRef.current
    setNotice(null)

    const payload = uncertain && submitted ? submitted : {
      payrollPaymentBatchId,
      settlementStatus,
      expectedBalanceEventId: reviewed.revision,
      ...(settlementAmount.trim() ? { settlementAmount: settlementAmount.trim() } : {}),
      proofSelection,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      idempotencyKey,
      metadata: {
        sourceSurface: "/dashboard/payroll/payments",
        batchNumber,
      },
    }
    setSubmitted(payload)

    startTransition(async () => {
      try {
      const response = await recordPayrollPaymentSettlementEvidenceAction(payload)
      if (response.success) {
        setNotice({
          kind: "success",
          message: response.data.idempotent
            ? copy.replay
            : copy.success,
        })
        setCompleted(true)
        router.refresh()
        return
      }
      if (response.status >= 500) {
        setNotice({ kind: "unknown", message: copy.unknown, correlationId: response.correlationId })
        return
      }

      setNotice({
        kind: response.code === "FRESH_AUTH_REQUIRED" ? "fresh-auth" : "error",
        message: response.code === "FRESH_AUTH_REQUIRED" ? copy.fresh : ["AUTH_REQUIRED", "FORBIDDEN", "SOD_VIOLATION"].includes(response.code) ? copy.denied : ["CONFLICT", "CONCURRENCY_CONFLICT", "IDEMPOTENCY_CONFLICT"].includes(response.code) ? copy.conflict : copy.validation,
        correlationId: response.correlationId,
      })
      } catch { setNotice({ kind: "unknown", message: copy.unknown }) }
    })
  }
  function adoptBalance() {
    setReviewed({ amount, revision: balanceRevision }); setSettlementAmount(amount); setSettlementStatus("settled")
    setIdempotencyKey(nextIdempotencyKey(payrollPaymentBatchId)); setSubmitted(null); setNotice(null)
    setProofSelection(null)
    if (completed) {
      setNotes(""); setCompleted(false)
    }
  }
  function authenticate() {
    if (!password || isPending) return
    const enteredPassword = password
    setPassword("")
    startTransition(async () => {
      try {
        const result = await stepUpWithPasswordAction({ password: enteredPassword })
        setNotice({ kind: result.success ? "authenticated" : "fresh-auth", message: result.success ? copy.authenticated : copy.authFailed })
      } catch { setNotice({ kind: "fresh-auth", message: copy.authFailed }) }
    })
  }

  return (
    <form onSubmit={submitSettlement} aria-label={copy.title} className="mt-3 grid min-w-0 gap-3 rounded-lg border border-[var(--dash-border-subtle)] p-3 text-[var(--dash-text)]">
      <p className="text-sm">{copy.remaining}: <strong>{amount} {currency}</strong></p>
      <p id={hintId} className="text-xs text-[var(--dash-text-soft)]">{copy.hint}</p>
      {changed && !uncertain ? <div className="rounded-lg border border-[var(--dash-info)] bg-[var(--dash-info-soft)] p-3 text-sm"><p>{copy.stale}</p><button type="button" disabled={disabled || isPending} onClick={adoptBalance} className="mt-2 min-h-10 rounded-lg border px-3">{copy.adopt}</button></div> : null}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[var(--dash-text-soft)]">
        <LockKeyhole className="h-3.5 w-3.5 text-[var(--dash-brand-strong)]" aria-hidden="true" />
        <span>{copy.title}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1 text-xs text-[var(--dash-text-soft)]">
          <span>{copy.status}</span>
          <select
            value={settlementStatus}
            onChange={(event) => setSettlementStatus(event.target.value as SettlementStatus)}
            disabled={locked}
            className="min-h-10 rounded-md border border-[var(--dash-border-subtle)] dashboard-control w-full min-w-0 px-2 text-sm text-[var(--dash-text)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-brand)] disabled:opacity-60"
          >
            <option value="settled">{copy.settled}</option>
            <option value="partially_settled">{copy.partial}</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-xs text-[var(--dash-text-soft)]">
          <span>{copy.amount}</span>
          <input
            value={settlementAmount}
            aria-describedby={hintId}
            required
            onChange={(event) => setSettlementAmount(event.target.value)}
            inputMode="decimal"
            placeholder={currency}
            disabled={locked}
            className="min-h-10 rounded-md border border-[var(--dash-border-subtle)] dashboard-control w-full min-w-0 px-2 text-sm text-[var(--dash-text)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-brand)] disabled:opacity-60"
          />
        </label>
      </div>

      <PayrollSettlementProofSelector options={proofOptions} value={proofSelection} onChange={setProofSelection} disabled={locked} current={proofCurrent} locale={locale} />

      <label className="grid min-w-0 gap-1 text-xs text-[var(--dash-text-soft)]">
        <span>{copy.notes}</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={2000}
          rows={2}
          disabled={locked}
          className="min-h-16 resize-y rounded-md border border-[var(--dash-border-subtle)] dashboard-control w-full min-w-0 px-2 py-2 text-sm text-[var(--dash-text)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-brand)] disabled:opacity-60"
        />
      </label>

      <p className="text-xs text-[var(--dash-text-soft)]">{copy.evidenceHelp}</p>

      {notice ? (
        <div role={notice.kind === "success" || notice.kind === "authenticated" ? "status" : "alert"} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${notice.kind === "success" ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)]" : notice.kind === "authenticated" ? "border-[var(--dash-info)] bg-[var(--dash-info-soft)]" : "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)]"}`}>
          {notice.kind === "success" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="break-words font-semibold">{notice.message}</p>
            {notice.kind === "fresh-auth" ? <p>{copy.freshHelp}</p> : null}
            {notice.kind !== "success" && notice.correlationId ? <p className="mt-1 break-all text-[var(--dash-text-soft)]">{notice.correlationId}</p> : null}
          </div>
        </div>
      ) : null}
      {notice?.kind === "fresh-auth" ? <div className="grid gap-2"><label className="grid gap-1 text-xs"><span>{copy.password}</span><input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={isPending} className="dashboard-control min-h-10 min-w-0 rounded-lg px-3" /></label><button type="button" disabled={isPending || !password} onClick={authenticate} className="min-h-10 rounded-lg border border-[var(--dash-brand)] px-3">{copy.authenticate}</button></div> : null}

      <button
        ref={submitRef}
        type="submit"
        disabled={!hydrated || disabled || isPending || completed || (!uncertain && (changed || !proofCurrent))}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--dash-brand)] bg-[var(--dash-brand-soft)] px-3 text-sm font-semibold text-[var(--dash-text)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
        {isPending ? copy.pending : uncertain ? copy.retry : copy.submit}
      </button>
      {!uncertain ? <button type="button" onClick={() => router.refresh()} disabled={isPending} className="min-h-10 rounded-lg border border-[var(--dash-border-subtle)] px-3 text-sm">{copy.refresh}</button> : null}
    </form>
  )
}
