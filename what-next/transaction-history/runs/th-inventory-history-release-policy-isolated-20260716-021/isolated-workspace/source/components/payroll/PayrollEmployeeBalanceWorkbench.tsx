import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  FileText,
  Fingerprint,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react"

import type { PayrollEmployeeBalanceWorkbenchResult } from "@/actions/payroll/payroll-control.actions"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"
import PayrollEmployeeBalanceSettlementForm from "./PayrollEmployeeBalanceSettlementForm"

type Props = {
  data: PayrollEmployeeBalanceWorkbenchResult | null
  error?: string | null
  locale: Locale
}

type BalanceCase = PayrollEmployeeBalanceWorkbenchResult["cases"][number]

function statusTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase()
  if (["READY", "SETTLED", "POSTED", "CALCULATED", "APPROVED", "NONE"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["OPEN", "PARTIALLY_SETTLED", "REVIEW", "ACTION_REQUIRED"].includes(normalized)) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100"
  }
  if (["CANCELLED", "WRITTEN_OFF", "BLOCKED", "ERROR"].includes(normalized)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100"
  }
  return "border-slate-400/30 bg-slate-400/10 text-slate-100"
}

function Badge({ value }: { value: string | null | undefined }) {
  return (
    <span className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(value)}`}>
      <span className="truncate">{value ?? "Pending"}</span>
    </span>
  )
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Open"
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone: string
}) {
  return (
    <div className="min-h-[104px] rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold text-white">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-base font-semibold">Payroll employee balance workbench unavailable</h1>
          <p className="mt-1 break-words text-sm text-rose-100">{message}</p>
        </div>
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h1 className="text-base font-semibold text-white">Payroll employee balance workbench</h1>
      <p className="mt-1 text-sm text-slate-400">No employee recovery cases are available for the selected scope.</p>
    </section>
  )
}

function ProofList({ balanceCase }: { balanceCase: BalanceCase }) {
  const latest = balanceCase.proof.latestEvent
  const rows = [
    ["Case document", balanceCase.proof.documentHash],
    ["Case evidence", balanceCase.proof.evidenceHash],
    ["Ledger batch", balanceCase.proof.ledgerPostingBatchId],
    ["Journal entry", balanceCase.proof.journalEntryId],
    ["Source link", balanceCase.proof.accountingSourceLinkId],
    ["Opened event", balanceCase.proof.openedBusinessEventId],
    ["Latest event", latest?.evidenceHash ?? null],
  ]

  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 sm:grid-cols-[120px_minmax(0,1fr)]">
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</span>
          <span className="min-w-0 break-all text-xs text-slate-200">{value || "Pending"}</span>
        </div>
      ))}
      {latest ? (
        <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
          {latest.eventType} on {dateLabel(latest.eventDate)}
        </div>
      ) : null}
    </div>
  )
}

export default function PayrollEmployeeBalanceWorkbench({ data, error, locale }: Props) {
  if (error) return <ErrorPanel message={error} />
  if (!data) return <EmptyState />

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">Payroll payments</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Employee balance recovery</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Open employee receivable cases, settlement state, ledger proof, and recovery actions as of {dateLabel(data.asOf)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={data.summary.activeCases > 0 ? "ACTION_REQUIRED" : "READY"} />
          <Badge value={data.redaction.payrollAmounts.mode} />
          <Link
            href={localizePath("/dashboard/payroll/register", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Register
          </Link>
          <Link
            href={localizePath("/dashboard/payroll/attendance", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Attendance
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Active cases" value={data.summary.activeCases} icon={WalletCards} tone="bg-amber-400/12 text-amber-200" />
        <Metric label="Open cases" value={data.summary.openCases} icon={AlertTriangle} tone="bg-rose-400/12 text-rose-200" />
        <Metric label="Partial settlements" value={data.summary.partiallySettledCases} icon={BadgeCheck} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label="Returned cases" value={data.summary.returnedCases} icon={ReceiptText} tone="bg-sky-400/12 text-sky-200" />
        <Metric label="Outstanding" value={data.summary.activeOutstandingAmount} icon={Banknote} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label="Coverage" value={data.summary.coverageComplete ? "complete" : "partial"} icon={ShieldCheck} tone="bg-violet-400/12 text-violet-200" />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <FileText className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Recovery cases</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[190px] px-4 py-3 font-semibold">Case</th>
                <th className="w-[210px] px-4 py-3 font-semibold">Employee</th>
                <th className="w-[240px] px-4 py-3 font-semibold">Run and payslip</th>
                <th className="w-[220px] px-4 py-3 font-semibold">Amounts</th>
                <th className="w-[300px] px-4 py-3 font-semibold">Proof</th>
                <th className="w-[160px] px-4 py-3 font-semibold">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.cases.length ? (
                data.cases.map((balanceCase) => (
                  <tr key={balanceCase.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{balanceCase.caseNumber}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge value={balanceCase.caseType} />
                        <Badge value={balanceCase.status} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Opened {dateLabel(balanceCase.timeline.openedAt)}</p>
                      <p className="text-xs text-slate-500">Age {balanceCase.timeline.ageDays} day(s)</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{balanceCase.employee.employeeNumber ?? "Unnumbered"}</p>
                      <p className="mt-1 break-words text-xs text-slate-400">{balanceCase.employee.displayName ?? balanceCase.employee.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{balanceCase.payrollRun.runNumber}</p>
                      <p className="mt-1 text-xs text-slate-400">{balanceCase.payrollRun.periodName ?? "No period"}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {dateLabel(balanceCase.payrollRun.periodStart)} to {dateLabel(balanceCase.payrollRun.periodEnd)}
                      </p>
                      <div className="mt-2">
                        <Badge value={balanceCase.payslip?.payslipNumber ?? "No payslip"} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500">Amount</p>
                      <p className="break-words font-semibold text-white">{balanceCase.amounts.amount} {balanceCase.amounts.currency}</p>
                      <p className="mt-2 text-xs text-slate-500">Settled</p>
                      <p className="break-words text-sm text-slate-200">{balanceCase.amounts.settledAmount}</p>
                      <p className="mt-2 text-xs text-slate-500">Outstanding</p>
                      <p className="break-words text-sm text-slate-200">{balanceCase.amounts.outstandingAmount}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ProofList balanceCase={balanceCase} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <Badge value={balanceCase.nextAction.id} />
                        <p className="break-words text-xs text-slate-300">{balanceCase.nextAction.label}</p>
                        <p className="break-words text-xs text-slate-500">
                          {balanceCase.nextAction.requiredPermission ?? "No permission required"}
                        </p>
                        {balanceCase.nextAction.id === "settle" ? (
                          <PayrollEmployeeBalanceSettlementForm
                            balanceCaseId={balanceCase.id}
                            caseNumber={balanceCase.caseNumber}
                            employeeId={balanceCase.employee.id}
                            outstandingAmount={balanceCase.amounts.outstandingAmount}
                            currency={balanceCase.amounts.currency}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>
                    No employee balance recovery cases match this scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Source scope</h2>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Limit</p>
            <p className="mt-1 text-sm text-slate-100">{data.sourceScope.limit}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Returned</p>
            <p className="mt-1 text-sm text-slate-100">{data.sourceScope.returned}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Service</p>
            <p className="mt-1 break-all text-sm text-slate-100">{data.sourceScope.sourceService}</p>
          </div>
        </div>
      </section>
    </main>
  )
}