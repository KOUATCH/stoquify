"use client"

import { payrollUiText, payrollStatusText } from "./payroll-ui-copy"

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
import {
  HrPayrollTableControls,
  HrPayrollTablePagination,
  useHrPayrollTable,
} from "@/components/hr-payroll/HrPayrollTableControls"

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

function Badge({ locale = "en", value }: { value: string | null | undefined } & { locale?: Locale }) {
  return (
    <span className={`inline-flex min-h-7 max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(value)}`}>
      <span className="truncate">{payrollStatusText(value, locale)}</span>
    </span>
  )
}

function dateLabel(value: string | null | undefined, locale: Locale = "en") {
  if (!value) return payrollUiText("Open", locale)
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value))
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

function ErrorPanel({ locale = "en", message }: { message: string } & { locale?: Locale }) {
  return (
    <section className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-5 text-rose-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-base font-semibold">{payrollUiText("Payroll employee balance workbench unavailable", locale)}</h1>
          <p className="mt-1 break-words text-sm text-rose-100">{message}</p>
        </div>
      </div>
    </section>
  )
}

function EmptyState({ locale = "en" }: { locale?: Locale }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h1 className="text-base font-semibold text-white">{payrollUiText("Payroll employee balance workbench", locale)}</h1>
      <p className="mt-1 text-sm text-slate-400">{payrollUiText("No employee recovery cases are available for the selected scope.", locale)}</p>
    </section>
  )
}

function ProofList({ locale = "en", balanceCase }: { balanceCase: BalanceCase } & { locale?: Locale }) {
  const latest = balanceCase.proof.latestEvent
  const rows: Array<[string, string | null | undefined]> = [
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
          <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">{payrollUiText(label, locale)}</span>
          <span className="min-w-0 break-all text-xs text-slate-200">{value || payrollUiText("Pending", locale)}</span>
        </div>
      ))}
      {latest ? (
        <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
          {latest.eventType}  {payrollUiText("on", locale)} {dateLabel(latest.eventDate, locale)}
        </div>
      ) : null}
    </div>
  )
}

export default function PayrollEmployeeBalanceWorkbench({ data, error, locale }: Props) {
  const balanceTable = useHrPayrollTable({
    rows: data?.cases ?? [],
    searchText: (balanceCase) => JSON.stringify(balanceCase),
    dateValue: (balanceCase) => balanceCase.timeline.openedAt,
    sortOptions: [
      { key: "case", label: payrollUiText("Case", locale), value: (balanceCase) => balanceCase.caseNumber },
      { key: "employee", label: payrollUiText("Employee", locale), value: (balanceCase) => balanceCase.employee.displayName ?? balanceCase.employee.employeeNumber },
      { key: "opened", label: payrollUiText("Opened date", locale), value: (balanceCase) => balanceCase.timeline.openedAt },
      { key: "outstanding", label: payrollUiText("Outstanding amount", locale), value: (balanceCase) => Number(balanceCase.amounts.outstandingAmount) },
      { key: "status", label: payrollUiText("Status", locale), value: (balanceCase) => balanceCase.status },
    ],
  })

  if (error) return <ErrorPanel locale={locale} message={error} />
  if (!data) return <EmptyState locale={locale} />

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">{payrollUiText("Payroll payments", locale)}</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{payrollUiText("Employee balance recovery", locale)}</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
             {payrollUiText("Open employee receivable cases, settlement state, ledger proof, and recovery actions as of", locale)} {dateLabel(data.asOf, locale)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge locale={locale} value={data.summary.activeCases > 0 ? "ACTION_REQUIRED" : "READY"} />
          <Badge locale={locale} value={data.redaction.payrollAmounts.mode} />
          <Link
            href={localizePath("/dashboard/payroll/register", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
             {payrollUiText("Register", locale)} </Link>
          <Link
            href={localizePath("/dashboard/payroll/attendance", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
             {payrollUiText("Attendance", locale)} </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label={payrollUiText("Active cases", locale)} value={data.summary.activeCases} icon={WalletCards} tone="bg-amber-400/12 text-amber-200" />
        <Metric label={payrollUiText("Open cases", locale)} value={data.summary.openCases} icon={AlertTriangle} tone="bg-rose-400/12 text-rose-200" />
        <Metric label={payrollUiText("Partial settlements", locale)} value={data.summary.partiallySettledCases} icon={BadgeCheck} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label={payrollUiText("Returned cases", locale)} value={data.summary.returnedCases} icon={ReceiptText} tone="bg-sky-400/12 text-sky-200" />
        <Metric label={payrollUiText("Outstanding", locale)} value={data.summary.activeOutstandingAmount} icon={Banknote} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label={payrollUiText("Coverage", locale)} value={data.summary.coverageComplete ? payrollStatusText("complete", locale) : payrollStatusText("partial", locale)} icon={ShieldCheck} tone="bg-violet-400/12 text-violet-200" />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <FileText className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">{payrollUiText("Recovery cases", locale)}</h2>
        </div>
        <HrPayrollTableControls table={balanceTable} locale={locale} tableLabel={payrollUiText("employee recovery cases", locale)} />
        <div className="dashboard-data-table dashboard-table-shell overflow-x-auto">
          <table className="min-w-[1280px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[190px] px-4 py-3 font-semibold">{payrollUiText("Case", locale)}</th>
                <th className="w-[210px] px-4 py-3 font-semibold">{payrollUiText("Employee", locale)}</th>
                <th className="w-[240px] px-4 py-3 font-semibold">{payrollUiText("Run and payslip", locale)}</th>
                <th className="w-[220px] px-4 py-3 font-semibold">{payrollUiText("Amounts", locale)}</th>
                <th className="w-[300px] px-4 py-3 font-semibold">{payrollUiText("Proof", locale)}</th>
                <th className="w-[160px] px-4 py-3 font-semibold">{payrollUiText("Next action", locale)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {balanceTable.rows.length ? (
                balanceTable.rows.map((balanceCase) => (
                  <tr key={balanceCase.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{balanceCase.caseNumber}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge locale={locale} value={balanceCase.caseType} />
                        <Badge locale={locale} value={balanceCase.status} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{payrollUiText("Opened", locale)} {dateLabel(balanceCase.timeline.openedAt, locale)}</p>
                      <p className="text-xs text-slate-500">{payrollUiText("Age", locale)} {balanceCase.timeline.ageDays}  {payrollUiText("day(s)", locale)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{balanceCase.employee.employeeNumber ?? "Unnumbered"}</p>
                      <p className="mt-1 break-words text-xs text-slate-400">{balanceCase.employee.displayName ?? balanceCase.employee.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{balanceCase.payrollRun.runNumber}</p>
                      <p className="mt-1 text-xs text-slate-400">{balanceCase.payrollRun.periodName ?? "No period"}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {dateLabel(balanceCase.payrollRun.periodStart, locale)}  {payrollUiText("to", locale)} {dateLabel(balanceCase.payrollRun.periodEnd, locale)}
                      </p>
                      <div className="mt-2">
                        <Badge locale={locale} value={balanceCase.payslip?.payslipNumber ?? "No payslip"} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500">{payrollUiText("Amount", locale)}</p>
                      <p className="break-words font-semibold text-white">{balanceCase.amounts.amount} {balanceCase.amounts.currency}</p>
                      <p className="mt-2 text-xs text-slate-500">{payrollUiText("Settled", locale)}</p>
                      <p className="break-words text-sm text-slate-200">{balanceCase.amounts.settledAmount}</p>
                      <p className="mt-2 text-xs text-slate-500">{payrollUiText("Outstanding", locale)}</p>
                      <p className="break-words text-sm text-slate-200">{balanceCase.amounts.outstandingAmount}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ProofList locale={locale} balanceCase={balanceCase} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <Badge locale={locale} value={balanceCase.nextAction.id} />
                        <p className="break-words text-xs text-slate-300">{balanceCase.nextAction.label}</p>
                        <p className="break-words text-xs text-slate-500">
                          {balanceCase.nextAction.requiredPermission ?? "No permission required"}
                        </p>
                        {balanceCase.nextAction.id === "settle" ? (
                          <PayrollEmployeeBalanceSettlementForm locale={locale}
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
                     {payrollUiText("No employee balance recovery cases match this scope.", locale)} </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <HrPayrollTablePagination table={balanceTable} locale={locale} />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">{payrollUiText("Source scope", locale)}</h2>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{payrollUiText("Limit", locale)}</p>
            <p className="mt-1 text-sm text-slate-100">{data.sourceScope.limit}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{payrollUiText("Returned", locale)}</p>
            <p className="mt-1 text-sm text-slate-100">{data.sourceScope.returned}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{payrollUiText("Service", locale)}</p>
            <p className="mt-1 break-all text-sm text-slate-100">{data.sourceScope.sourceService}</p>
          </div>
        </div>
      </section>
    </main>
  )
}
