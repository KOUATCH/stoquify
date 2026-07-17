"use client"

import type { FormEvent, ReactNode } from "react"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, LockKeyhole, PanelRightOpen } from "lucide-react"

import {
  approveAndPostPayrollRunAction,
  calculatePayrollRunAction,
  preparePayrollDeclarationsAction,
  releasePayrollPaymentBatchAction,
  type PayrollRunWorkbenchResult,
} from "@/actions/payroll/payroll-control.actions"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type RunRow = PayrollRunWorkbenchResult["runs"][number]
type RunAction = RunRow["nextActions"][number]
type PaymentRequesterCandidate = PayrollRunWorkbenchResult["paymentRequesterCandidates"][number]
type Notice =
  | { kind: "success"; message: string }
  | { kind: "fresh-auth" | "error"; message: string; correlationId?: string }

type ActionResponse = {
  success: boolean
  error?: string | null
  code?: string
  correlationId?: string
}

type Props = {
  run: RunRow
  action: RunAction
  paymentRequesterCandidates?: PaymentRequesterCandidate[]
  disabled?: boolean
}

type PaymentMethodValue = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CHEQUE"

const paymentMethods: Array<{ value: PaymentMethodValue; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "CHEQUE", label: "Cheque" },
]

const actionCopy = {
  calculate: {
    trigger: "Open calculation drawer",
    title: "Calculation drawer",
    description: "Request a protected payroll calculation for the service-owned period and run type.",
  },
  "approve-post": {
    trigger: "Open approval drawer",
    title: "Approval and posting drawer",
    description: "Approve and post a calculated run through the fresh-auth protected action boundary.",
  },
  "prepare-declarations": {
    trigger: "Open declaration drawer",
    title: "Declaration preparation drawer",
    description: "Prepare statutory declaration rows from the locked payroll run proof.",
  },
  "release-payments": {
    trigger: "Open payment drawer",
    title: "Payment release drawer",
    description: "Release a payment batch from service-owned emitted payslip allocations and destination proof.",
  },
} as const

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function nextKey(actionId: string, runId: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `payroll-run:${actionId}:${runId}:${random}`
}

function isRedacted(value: string) {
  return value.includes("[REDACTED")
}

function splitDeclarationTypes(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function noticeFromResponse(response: ActionResponse, fallback: string): Notice {
  if (response.success) return { kind: "success", message: fallback }
  return {
    kind: response.code === "FRESH_AUTH_REQUIRED" ? "fresh-auth" : "error",
    message: response.error || "Payroll action could not be completed.",
    correlationId: response.correlationId,
  }
}

function NoticePanel({ notice }: { notice: Notice | null }) {
  if (!notice) return null

  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${notice.kind === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>
      {notice.kind === "success" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <div className="min-w-0">
        <p className="break-words font-semibold">{notice.message}</p>
        {notice.kind !== "success" && notice.correlationId ? <p className="mt-1 break-all text-slate-400">{notice.correlationId}</p> : null}
      </div>
    </div>
  )
}

function SubmitButton({ label, pending, disabled }: { label: string; pending: boolean; disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/15 px-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
      {label}
    </button>
  )
}

function ControlPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 max-w-full items-center rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-100">
      <span className="truncate">{children}</span>
    </span>
  )
}

function IdempotencyProof({ value }: { value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-slate-500">
      <p className="font-semibold uppercase tracking-normal">Idempotency key</p>
      <p className="mt-1 break-all">{value}</p>
    </div>
  )
}

function DrawerControlSummary({ run, action }: { run: RunRow; action: RunAction }) {
  const sourceRegisterProof = run.proof.componentRegisterProofHash || run.proof.calculationHash || null

  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex flex-wrap gap-2">
        <ControlPill>{action.requiredPermission}</ControlPill>
        {action.requiresFreshAuth ? <ControlPill>Fresh auth</ControlPill> : <ControlPill>Protected action</ControlPill>}
        {action.requiresSeparateApprover ? <ControlPill>Maker-checker</ControlPill> : null}
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="min-w-0 rounded-md border border-white/10 bg-slate-950/30 p-2">
          <p className="font-semibold uppercase tracking-normal text-slate-500">Source register proof</p>
          <p className="mt-1 break-all text-slate-200">{sourceRegisterProof || "Pending"}</p>
        </div>
        <div className="min-w-0 rounded-md border border-white/10 bg-slate-950/30 p-2">
          <p className="font-semibold uppercase tracking-normal text-slate-500">Accounting source link</p>
          <p className="mt-1 break-all text-slate-200">{run.accounting.accountingSourceLinkId || "Pending"}</p>
        </div>
      </div>
    </div>
  )
}

function ActionDrawer({
  action,
  children,
  disabled,
  onOpenChange,
  open,
  run,
}: {
  action: RunAction
  children: ReactNode
  disabled: boolean
  onOpenChange: (open: boolean) => void
  open: boolean
  run: RunRow
}) {
  const copy = actionCopy[action.id as keyof typeof actionCopy]
  if (!copy) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(true)}
        className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/12 px-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
        {copy.trigger}
      </button>
      <SheetContent className="w-full overflow-y-auto border-white/10 bg-[#101820] text-slate-100 sm:max-w-xl">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-white">{copy.title}</SheetTitle>
          <SheetDescription className="text-slate-400">{copy.description}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-3">
          <DrawerControlSummary run={run} action={action} />
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function PayrollRunActionPanel({ run, action, paymentRequesterCandidates = [], disabled = false }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => nextKey(action.id, run.id))
  const [runDate, setRunDate] = useState(todayInputValue)
  const [documentHash, setDocumentHash] = useState("")
  const [declarationTypes, setDeclarationTypes] = useState("")
  const [paymentDate, setPaymentDate] = useState(todayInputValue)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>("BANK_TRANSFER")
  const [requestedById, setRequestedById] = useState(() => paymentRequesterCandidates[0]?.userId ?? "")
  const [bankFileHash, setBankFileHash] = useState("")
  const [paymentDocumentHash, setPaymentDocumentHash] = useState("")
  const [notes, setNotes] = useState("")

  const paymentAllocations = useMemo(
    () =>
      run.paymentAllocationCandidates.map((candidate) => ({
        payslipId: candidate.payslipId,
        employeeId: candidate.employeeId,
        amount: candidate.amount,
      })),
    [run.paymentAllocationCandidates],
  )
  const selectedRequester = paymentRequesterCandidates.find((candidate) => candidate.userId === requestedById) ?? null
  const paymentProofBlocked =
    !paymentAllocations.length ||
    paymentAllocations.some((allocation) => isRedacted(allocation.amount)) ||
    run.paymentAllocationCandidates.some((candidate) => !candidate.paymentDestinationProofPresent)
  const paymentDisabled = disabled || isPending || paymentProofBlocked || !selectedRequester

  function finish(response: ActionResponse, successMessage: string) {
    const nextNotice = noticeFromResponse(response, successMessage)
    setNotice(nextNotice)
    if (nextNotice.kind === "success") {
      setIdempotencyKey(nextKey(action.id, run.id))
      router.refresh()
    }
  }

  function submitCalculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    startTransition(async () => {
      const response = await calculatePayrollRunAction({
        payrollPeriodId: run.period.id,
        runType: run.runType === "CORRECTION" ? "CORRECTION" : "ORDINARY",
        ...(run.correction.originalRunId ? { originalRunId: run.correction.originalRunId } : {}),
        runDate,
        idempotencyKey,
        metadata: { sourceSurface: "/dashboard/payroll/runs", runNumber: run.runNumber },
      })
      finish(response, "Payroll calculation requested.")
    })
  }

  function submitApprove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    startTransition(async () => {
      const response = await approveAndPostPayrollRunAction({
        payrollRunId: run.id,
        idempotencyKey,
        ...(documentHash.trim() ? { documentHash: documentHash.trim() } : {}),
        metadata: { sourceSurface: "/dashboard/payroll/runs", runNumber: run.runNumber },
      })
      finish(response, "Payroll run approval/posting requested.")
    })
  }

  function submitDeclarations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    startTransition(async () => {
      const declarationTypeList = splitDeclarationTypes(declarationTypes)
      const response = await preparePayrollDeclarationsAction({
        payrollRunId: run.id,
        idempotencyKey,
        ...(declarationTypeList.length ? { declarationTypes: declarationTypeList } : {}),
        metadata: { sourceSurface: "/dashboard/payroll/runs", runNumber: run.runNumber },
      })
      finish(response, "Declaration preparation requested.")
    })
  }

  function submitRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    startTransition(async () => {
      const response = await releasePayrollPaymentBatchAction({
        payrollRunId: run.id,
        requestedById: requestedById.trim(),
        method: paymentMethod,
        paymentDate,
        idempotencyKey,
        allocations: paymentAllocations,
        ...(bankFileHash.trim() ? { bankFileHash: bankFileHash.trim() } : {}),
        ...(paymentDocumentHash.trim() ? { documentHash: paymentDocumentHash.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        metadata: { sourceSurface: "/dashboard/payroll/runs", runNumber: run.runNumber },
      })
      finish(response, "Payroll payment release requested.")
    })
  }

  const copy = actionCopy[action.id as keyof typeof actionCopy]
  if (!copy) return null

  const commonHeader = (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate-400">
      <LockKeyhole className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
      <span>{action.requiresFreshAuth ? "Fresh-auth action" : "Protected action"}</span>
    </div>
  )

  if (action.id === "calculate") {
    return (
      <ActionDrawer action={action} disabled={disabled} open={open} onOpenChange={setOpen} run={run}>
        <form onSubmit={submitCalculate} className="grid gap-2">
          {commonHeader}
          <label className="grid gap-1 text-xs text-slate-400">
            <span>Run date</span>
            <input type="date" value={runDate} onChange={(event) => setRunDate(event.target.value)} disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
          </label>
          <IdempotencyProof value={idempotencyKey} />
          <NoticePanel notice={notice} />
          <SubmitButton label="Calculate run" pending={isPending} disabled={disabled} />
        </form>
      </ActionDrawer>
    )
  }

  if (action.id === "approve-post") {
    return (
      <ActionDrawer action={action} disabled={disabled} open={open} onOpenChange={setOpen} run={run}>
        <form onSubmit={submitApprove} className="grid gap-2">
          {commonHeader}
          <label className="grid gap-1 text-xs text-slate-400">
            <span>Document hash</span>
            <input value={documentHash} onChange={(event) => setDocumentHash(event.target.value)} placeholder="optional sha256:..." disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
          </label>
          <IdempotencyProof value={idempotencyKey} />
          <NoticePanel notice={notice} />
          <SubmitButton label="Approve and post" pending={isPending} disabled={disabled} />
        </form>
      </ActionDrawer>
    )
  }

  if (action.id === "prepare-declarations") {
    return (
      <ActionDrawer action={action} disabled={disabled} open={open} onOpenChange={setOpen} run={run}>
        <form onSubmit={submitDeclarations} className="grid gap-2">
          {commonHeader}
          <label className="grid gap-1 text-xs text-slate-400">
            <span>Declaration types</span>
            <input value={declarationTypes} onChange={(event) => setDeclarationTypes(event.target.value)} placeholder="optional comma-separated list" disabled={disabled || isPending} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
          </label>
          <IdempotencyProof value={idempotencyKey} />
          <NoticePanel notice={notice} />
          <SubmitButton label="Prepare declarations" pending={isPending} disabled={disabled} />
        </form>
      </ActionDrawer>
    )
  }

  if (action.id === "release-payments") {
    return (
      <ActionDrawer action={action} disabled={disabled} open={open} onOpenChange={setOpen} run={run}>
        <form onSubmit={submitRelease} className="grid gap-2">
          {commonHeader}
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-2 text-xs text-slate-300">
            {run.paymentAllocationCandidates.length ? `${run.paymentAllocationCandidates.length} payslip allocation(s) from service-owned payslip proof.` : "No emitted payslip allocation candidates are available."}
          </div>
          <label className="grid gap-1 text-xs text-slate-400">
            <span>Requested by</span>
            <select value={requestedById} onChange={(event) => setRequestedById(event.target.value)} required disabled={disabled || isPending || !paymentRequesterCandidates.length} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60">
              {paymentRequesterCandidates.length ? null : <option value="">No separate requester available</option>}
              {paymentRequesterCandidates.map((candidate) => (
                <option key={candidate.userId} value={candidate.userId}>{candidate.displayName} ({candidate.email})</option>
              ))}
            </select>
          </label>
          {selectedRequester ? (
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-2 text-xs text-slate-300">
              <p className="font-semibold text-white">Requester evidence</p>
              <p className="mt-1 break-words">{selectedRequester.roleLabels.join(", ") || "Role evidence unavailable"}</p>
              <p className="mt-1 break-words text-slate-400">{selectedRequester.matchedPermissions.join(", ")}</p>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-slate-400">
              <span>Payment date</span>
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required disabled={paymentDisabled} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
            </label>
            <label className="grid gap-1 text-xs text-slate-400">
              <span>Method</span>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethodValue)} disabled={paymentDisabled} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60">
                {paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-slate-400">
              <span>Bank file hash</span>
              <input value={bankFileHash} onChange={(event) => setBankFileHash(event.target.value)} placeholder="optional" disabled={paymentDisabled} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
            </label>
            <label className="grid gap-1 text-xs text-slate-400">
              <span>Document hash</span>
              <input value={paymentDocumentHash} onChange={(event) => setPaymentDocumentHash(event.target.value)} placeholder="optional" disabled={paymentDisabled} className="min-h-9 rounded-md border border-white/10 bg-slate-950/60 px-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
            </label>
          </div>
          <label className="grid gap-1 text-xs text-slate-400">
            <span>Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={2} disabled={paymentDisabled} className="min-h-16 resize-y rounded-md border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-white outline-none focus:border-cyan-300/60 disabled:opacity-60" />
          </label>
          <IdempotencyProof value={idempotencyKey} />
          {paymentDisabled ? <p className="text-xs text-amber-100">Payment release requires a separate service-backed requester, visible payroll amounts, emitted payslips, and payment destination proof.</p> : null}
          <NoticePanel notice={notice} />
          <SubmitButton label="Release payments" pending={isPending} disabled={paymentDisabled} />
        </form>
      </ActionDrawer>
    )
  }

  return null
}
