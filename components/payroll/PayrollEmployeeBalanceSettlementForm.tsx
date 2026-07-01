"use client"

import type { FormEvent } from "react"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, LockKeyhole } from "lucide-react"

import { settlePayrollEmployeeBalanceCaseAction } from "@/actions/payroll/payroll-control.actions"

type SettlementMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "PAYROLL_DEDUCTION"

type Props = {
  balanceCaseId: string
  caseNumber: string
  employeeId: string
  outstandingAmount: string
  currency: string
  disabled?: boolean
}

type FormNotice =
  | { kind: "success"; message: string }
  | { kind: "fresh-auth" | "error"; message: string; correlationId?: string }

const settlementMethods: Array<{ value: SettlementMethod; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank" },
  { value: "MOBILE_MONEY", label: "Mobile" },
  { value: "PAYROLL_DEDUCTION", label: "Deduction" },
]

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function numericDefault(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value) ? value : ""
}

function nextIdempotencyKey(balanceCaseId: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `payroll-balance-settlement:${balanceCaseId}:${random}`
}

export default function PayrollEmployeeBalanceSettlementForm({
  balanceCaseId,
  caseNumber,
  employeeId,
  outstandingAmount,
  currency,
  disabled = false,
}: Props) {
  const router = useRouter()
  const defaultAmount = useMemo(() => numericDefault(outstandingAmount), [outstandingAmount])
  const [settledById, setSettledById] = useState(employeeId)
  const [settlementDate, setSettlementDate] = useState(todayInputValue)
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod>("CASH")
  const [amount, setAmount] = useState(defaultAmount)
  const [settlementEvidenceHash, setSettlementEvidenceHash] = useState("")
  const [documentHash, setDocumentHash] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [idempotencyKey, setIdempotencyKey] = useState(() => nextIdempotencyKey(balanceCaseId))
  const [notice, setNotice] = useState<FormNotice | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)

    const payload = {
      balanceCaseId,
      settledById: settledById.trim(),
      settlementDate,
      settlementMethod,
      amount: amount.trim(),
      settlementEvidenceHash: settlementEvidenceHash.trim(),
      ...(documentHash.trim() ? { documentHash: documentHash.trim() } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      idempotencyKey,
      metadata: {
        sourceSurface: "/dashboard/payroll/payments",
        caseNumber,
      },
    }

    startTransition(async () => {
      const response = await settlePayrollEmployeeBalanceCaseAction(payload)
      if (response.success) {
        setNotice({
          kind: "success",
          message: response.data.idempotent
            ? "Settlement evidence was already recorded for this request."
            : "Settlement evidence recorded.",
        })
        setIdempotencyKey(nextIdempotencyKey(balanceCaseId))
        setSettlementEvidenceHash("")
        setDocumentHash("")
        setReference("")
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
    <form onSubmit={submitSettlement} className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate-400">
        <LockKeyhole className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
        <span>Fresh-auth settlement</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Settlement amount</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            inputMode="decimal"
            placeholder={currency}
            disabled={disabled || isPending}
            className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
          />
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Settlement date</span>
          <input
            type="date"
            value={settlementDate}
            onChange={(event) => setSettlementDate(event.target.value)}
            required
            disabled={disabled || isPending}
            className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Method</span>
          <select
            value={settlementMethod}
            onChange={(event) => setSettlementMethod(event.target.value as SettlementMethod)}
            disabled={disabled || isPending}
            className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
          >
            {settlementMethods.map((method) => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Settled by ID</span>
          <input
            value={settledById}
            onChange={(event) => setSettledById(event.target.value)}
            required
            disabled={disabled || isPending}
            className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
          />
        </label>
      </div>

      <label className="grid gap-1 text-xs text-slate-400">
        <span>Evidence hash</span>
        <input
          value={settlementEvidenceHash}
          onChange={(event) => setSettlementEvidenceHash(event.target.value)}
          required
          placeholder="sha256:..."
          disabled={disabled || isPending}
          className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Document hash</span>
          <input
            value={documentHash}
            onChange={(event) => setDocumentHash(event.target.value)}
            placeholder="optional"
            disabled={disabled || isPending}
            className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
          />
        </label>
        <label className="grid gap-1 text-xs text-slate-400">
          <span>Reference</span>
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="optional"
            maxLength={200}
            disabled={disabled || isPending}
            className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60"
          />
        </label>
      </div>

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
        Record settlement
      </button>
    </form>
  )
}