"use client"

import type { FormEvent } from "react"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, LockKeyhole } from "lucide-react"

import { recordPayrollPaymentSettlementEvidenceAction } from "@/actions/payroll/payroll-payment-reconciliation.actions"

type SettlementStatus = "settled" | "partially_settled"

type Props = {
  payrollPaymentBatchId: string
  batchNumber: string
  amount: string
  currency: string
  defaultMatchRecordId?: string | null
  defaultProviderAccountId?: string | null
  defaultProviderTransactionId?: string | null
  defaultProviderReference?: string | null
  defaultProviderEventId?: string | null
  defaultStatementLineId?: string | null
  defaultStatementFileHash?: string | null
  disabled?: boolean
}

type FormNotice =
  | { kind: "success"; message: string }
  | { kind: "fresh-auth" | "error"; message: string; correlationId?: string }

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
  defaultMatchRecordId = null,
  defaultProviderAccountId = null,
  defaultProviderTransactionId = null,
  defaultProviderReference = null,
  defaultProviderEventId = null,
  defaultStatementLineId = null,
  defaultStatementFileHash = null,
  disabled = false,
}: Props) {
  const router = useRouter()
  const defaultAmount = useMemo(() => numericDefault(amount), [amount])
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus>("settled")
  const [settlementAmount, setSettlementAmount] = useState(defaultAmount)
  const [sourceRegisterHash, setSourceRegisterHash] = useState("")
  const [evidenceHash, setEvidenceHash] = useState("")
  const [providerAccountId, setProviderAccountId] = useState(defaultProviderAccountId ?? "")
  const [providerTransactionId, setProviderTransactionId] = useState(defaultProviderTransactionId ?? "")
  const [providerReference, setProviderReference] = useState(defaultProviderReference ?? "")
  const [providerEventId, setProviderEventId] = useState(defaultProviderEventId ?? "")
  const [statementLineId, setStatementLineId] = useState(defaultStatementLineId ?? "")
  const [statementFileHash, setStatementFileHash] = useState(defaultStatementFileHash ?? "")
  const [matchRecordId, setMatchRecordId] = useState(defaultMatchRecordId ?? "")
  const [notes, setNotes] = useState("")
  const [idempotencyKey, setIdempotencyKey] = useState(() => nextIdempotencyKey(payrollPaymentBatchId))
  const [notice, setNotice] = useState<FormNotice | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)

    const payload = {
      payrollPaymentBatchId,
      settlementStatus,
      ...(settlementAmount.trim() ? { settlementAmount: settlementAmount.trim() } : {}),
      evidenceHash: evidenceHash.trim(),
      sourceRegisterHash: sourceRegisterHash.trim(),
      ...(providerAccountId.trim() ? { providerAccountId: providerAccountId.trim() } : {}),
      ...(providerTransactionId.trim() ? { providerTransactionId: providerTransactionId.trim() } : {}),
      ...(providerReference.trim() ? { providerReference: providerReference.trim() } : {}),
      ...(providerEventId.trim() ? { providerEventId: providerEventId.trim() } : {}),
      ...(statementLineId.trim() ? { statementLineId: statementLineId.trim() } : {}),
      ...(statementFileHash.trim() ? { statementFileHash: statementFileHash.trim() } : {}),
      ...(matchRecordId.trim() ? { matchRecordId: matchRecordId.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      idempotencyKey,
      metadata: {
        sourceSurface: "/dashboard/payroll/payments",
        batchNumber,
      },
    }

    startTransition(async () => {
      const response = await recordPayrollPaymentSettlementEvidenceAction(payload)
      if (response.success) {
        setNotice({
          kind: "success",
          message: response.data.idempotent
            ? "Settlement evidence was already recorded for this request."
            : "Settlement evidence recorded.",
        })
        setIdempotencyKey(nextIdempotencyKey(payrollPaymentBatchId))
        setEvidenceHash("")
        setSourceRegisterHash("")
        setNotes("")
        router.refresh()
        return
      }

      setNotice({
        kind: response.code === "FRESH_AUTH_REQUIRED" ? "fresh-auth" : "error",
        message: response.error || "Settlement evidence could not be recorded.",
        correlationId: response.correlationId,
      })
    })
  }

  return (
    <form onSubmit={submitSettlement} className="mt-3 grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate-400">
        <LockKeyhole className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
        <span>Fresh-auth settlement proof</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Settlement status</span>
          <select
            value={settlementStatus}
            onChange={(event) => setSettlementStatus(event.target.value as SettlementStatus)}
            disabled={disabled || isPending}
            className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
          >
            <option value="settled">Settled</option>
            <option value="partially_settled">Partially settled</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Settlement amount</span>
          <input
            value={settlementAmount}
            onChange={(event) => setSettlementAmount(event.target.value)}
            inputMode="decimal"
            placeholder={currency}
            disabled={disabled || isPending}
            className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
          />
        </label>
      </div>

      <label className="grid gap-1 text-xs text-slate-400">
        <span>Source register hash</span>
        <input
          value={sourceRegisterHash}
          onChange={(event) => setSourceRegisterHash(event.target.value)}
          required
          placeholder="sha256:..."
          disabled={disabled || isPending}
          className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
        />
      </label>

      <label className="grid gap-1 text-xs text-slate-400">
        <span>Evidence hash</span>
        <input
          value={evidenceHash}
          onChange={(event) => setEvidenceHash(event.target.value)}
          required
          placeholder="sha256:..."
          disabled={disabled || isPending}
          className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Provider event ID</span>
          <input value={providerEventId} onChange={(event) => setProviderEventId(event.target.value)} disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Statement line ID</span>
          <input value={statementLineId} onChange={(event) => setStatementLineId(event.target.value)} disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Statement file hash</span>
          <input value={statementFileHash} onChange={(event) => setStatementFileHash(event.target.value)} placeholder="optional" disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Match record ID</span>
          <input value={matchRecordId} onChange={(event) => setMatchRecordId(event.target.value)} placeholder="optional" disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Provider account ID</span>
          <input value={providerAccountId} onChange={(event) => setProviderAccountId(event.target.value)} placeholder="optional" disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Provider transaction ID</span>
          <input value={providerTransactionId} onChange={(event) => setProviderTransactionId(event.target.value)} placeholder="optional" disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
        </label>
      </div>

      <label className="grid gap-1 text-xs text-slate-400">
        <span>Provider reference</span>
        <input value={providerReference} onChange={(event) => setProviderReference(event.target.value)} placeholder="optional" disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
      </label>

      <label className="grid gap-1 text-xs text-slate-400">
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={2000}
          rows={2}
          disabled={disabled || isPending}
          className="min-h-16 resize-y rounded-md border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
        />
      </label>

      <p className="break-all text-[11px] text-slate-500">{idempotencyKey}</p>

      {notice ? (
        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${notice.kind === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>
          {notice.kind === "success" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="break-words font-semibold">{notice.message}</p>
            {notice.kind !== "success" && notice.correlationId ? <p className="mt-1 break-all text-slate-400">{notice.correlationId}</p> : null}
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={disabled || isPending}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/15 px-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
        Record settlement proof
      </button>
    </form>
  )
}