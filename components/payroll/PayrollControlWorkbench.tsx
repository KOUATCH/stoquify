import Link from "next/link"
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  FileText,
  Landmark,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  UsersRound,
} from "lucide-react"

import type { PayrollWorkbenchData } from "@/actions/payroll/payroll-control.actions"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"

type Props = {
  data: PayrollWorkbenchData | null
  error?: string | null
  locale: Locale
}

function money(amount: string, currency: string) {
  return `${amount} ${currency}`
}

function dateLabel(value: string | null) {
  if (!value) return "Pending"
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
}

function statusTone(status: string | null | undefined) {
  const normalized = (status ?? "").toUpperCase()
  if (["POSTED", "PAID", "SETTLED", "RECONCILED", "ACCEPTED", "RELEASED"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["FAILED", "REJECTED", "CANCELLED", "LEDGER_BLOCKED", "BLOCKED_PENDING_RULES"].includes(normalized)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100"
  }
  if (["PREPARED", "CALCULATED", "REVIEWED", "AWAITING_STATEMENT_MATCH", "PENDING"].includes(normalized)) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100"
  }
  return "border-white/12 bg-white/8 text-slate-200"
}

function Badge({ value }: { value: string | null | undefined }) {
  return (
    <span className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(value)}`}>
      <span className="truncate">{value ?? "Pending"}</span>
    </span>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof UsersRound
  tone: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

export default function PayrollControlWorkbench({ data, error, locale }: Props) {
  const paymentsHref = localizePath("/dashboard/finance/payments", locale)

  if (error) {
    return (
      <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold">Payroll workbench unavailable</h1>
            <p className="mt-1 text-sm text-rose-100">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.06] p-5 text-slate-200">
        <h1 className="text-base font-semibold text-white">Payroll workbench</h1>
        <p className="mt-1 text-sm text-slate-400">No payroll control data is available.</p>
      </section>
    )
  }

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-sky-200">OHADA payroll control</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Payroll, presence, payments, and declarations</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            As of {dateLabel(data.asOf)}. Ledger, reconciliation, country-pack, and declaration blockers remain visible until cleared by service evidence.
          </p>
        </div>
        <Link
          href={paymentsHref}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <Landmark className="h-4 w-4" />
          Reconciliation
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open periods" value={data.counts.openPeriods} icon={CalendarClock} tone="bg-sky-400/12 text-sky-200" />
        <Metric label="Calculated runs" value={data.counts.calculatedRuns} icon={UsersRound} tone="bg-violet-400/12 text-violet-200" />
        <Metric label="Posted runs" value={data.counts.postedRuns} icon={ShieldCheck} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label="Payment batches" value={data.counts.releasedPaymentBatches} icon={Banknote} tone="bg-amber-400/12 text-amber-200" />
        <Metric label="Open declarations" value={data.counts.openDeclarations} icon={FileText} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label="Ledger blockers" value={data.counts.ledgerBlockers} icon={LockKeyhole} tone="bg-rose-400/12 text-rose-200" />
        <Metric label="Recon exceptions" value={data.counts.reconciliationExceptions} icon={AlertTriangle} tone="bg-orange-400/12 text-orange-200" />
        <Metric label="Recent runs" value={data.queues.recentRuns.length} icon={ReceiptText} tone="bg-slate-400/12 text-slate-200" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Payroll runs</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.queues.recentRuns.length ? (
              data.queues.recentRuns.map((run) => (
                <div key={run.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{run.runNumber}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{run.periodName} - {dateLabel(run.payDate)}</p>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <Badge value={run.status} />
                    <Badge value={run.ledgerPostingBatchId ? "LEDGER_EVIDENCE" : "LEDGER_PENDING"} />
                  </div>
                  <div className="min-w-0 text-right md:text-left">
                    <p className="text-sm font-semibold text-white">{money(run.netPayableAmount, run.currency)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {run.payslipCount} payslips / {run.paymentBatchCount} payments / {run.declarationCount} declarations
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-400">No payroll runs found.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Ledger blockers</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.queues.ledgerBlockers.length ? (
              data.queues.ledgerBlockers.map((blocker) => (
                <div key={blocker.id} className="px-4 py-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{blocker.sourceType}</p>
                      <p className="mt-1 text-xs text-slate-400">{blocker.postingPurpose} - {dateLabel(blocker.createdAt)}</p>
                    </div>
                    <Badge value={blocker.status} />
                  </div>
                  {blocker.errorMessage ? <p className="mt-2 text-xs text-rose-100">{blocker.errorMessage}</p> : null}
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 px-4 py-6 text-sm text-emerald-100">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                No payroll ledger blockers are currently queued.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Payment batches</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.queues.paymentBatches.length ? (
              data.queues.paymentBatches.map((batch) => (
                <div key={batch.id} className="px-4 py-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{batch.batchNumber}</p>
                      <p className="mt-1 text-xs text-slate-400">{batch.runNumber} - {dateLabel(batch.paymentDate)}</p>
                    </div>
                    <p className="text-sm font-semibold text-white">{money(batch.amount, batch.currency)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge value={batch.status} />
                    <Badge value={batch.ledgerStatus ?? (batch.ledgerPostingBatchId ? "LEDGER_EVIDENCE" : "LEDGER_PENDING")} />
                    <Badge value={batch.reconciliationStatus} />
                  </div>
                  {batch.ledgerBlockerMessage ? <p className="mt-2 text-xs text-rose-100">{batch.ledgerBlockerMessage}</p> : null}
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-400">No payroll payment batches found.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.05]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Declarations</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.queues.declarations.length ? (
              data.queues.declarations.map((declaration) => (
                <div key={declaration.id} className="px-4 py-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{declaration.declarationType}</p>
                      <p className="mt-1 text-xs text-slate-400">{declaration.authority} - due {dateLabel(declaration.dueDate)}</p>
                    </div>
                    <p className="text-sm font-semibold text-white">{money(declaration.amount, declaration.currency)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge value={declaration.status} />
                    <Badge value={declaration.expertReviewRequired ? "EXPERT_REVIEW" : "PACK_RESOLVED"} />
                  </div>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-400">No payroll declarations found.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
