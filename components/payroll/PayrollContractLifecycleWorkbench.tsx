import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  FileLock2,
  Link2,
  ShieldCheck,
  UsersRound,
} from "lucide-react"

import type { PayrollEmployeeContractWorkflowResult } from "@/actions/payroll/payroll-contract.actions"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"

type Props = {
  data: PayrollEmployeeContractWorkflowResult | null
  error?: string | null
  locale: Locale
}

function statusTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase()
  if (["ACTIVE", "LINKED", "READY", "SIGNED"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["ENDED", "CANCELLED", "TERMINATED", "ARCHIVED", "UNLINKED", "MISSING"].includes(normalized)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100"
  }
  return "border-amber-400/30 bg-amber-400/10 text-amber-100"
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
          <h1 className="text-base font-semibold">Payroll contracts unavailable</h1>
          <p className="mt-1 break-words text-sm text-rose-100">{message}</p>
        </div>
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h1 className="text-base font-semibold text-white">Payroll contracts</h1>
      <p className="mt-1 text-sm text-slate-400">No employee contract workflow records are available.</p>
    </section>
  )
}

function contractCountLabel(count: number) {
  return `${count} contract${count === 1 ? "" : "s"}`
}

export default function PayrollContractLifecycleWorkbench({ data, error, locale }: Props) {
  if (error) return <ErrorPanel message={error} />
  if (!data) return <EmptyState />

  const contractRows = data.employees.flatMap((employee) =>
    employee.contracts.map((contract) => ({
      employee,
      contract,
    })),
  )

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">Payroll contracts</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Contract lifecycle readiness</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Tenant-scoped contract state, employee-user mapping, payroll eligibility, signed evidence presence, and redacted person-level amounts as of {dateLabel(data.asOf)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={data.summary.redactedContracts > 0 ? "SALARY REDACTED" : "SALARY VISIBLE"} />
          <Link
            href={localizePath("/dashboard/payroll/employees", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Employees
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Employees" value={data.summary.totalEmployees} icon={UsersRound} tone="bg-sky-400/12 text-sky-200" />
        <Metric label="Linked users" value={data.summary.linkedEmployees} icon={Link2} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label="Active contracts" value={data.summary.activeContracts} icon={BriefcaseBusiness} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label="Payroll eligible" value={data.summary.payrollEligible} icon={ShieldCheck} tone="bg-teal-400/12 text-teal-200" />
        <Metric label="Redacted contracts" value={data.summary.redactedContracts} icon={FileLock2} tone="bg-amber-400/12 text-amber-200" />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Employee readiness</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1020px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[230px] px-4 py-3 font-semibold">Employee</th>
                <th className="w-[150px] px-4 py-3 font-semibold">User mapping</th>
                <th className="w-[150px] px-4 py-3 font-semibold">Eligibility</th>
                <th className="w-[180px] px-4 py-3 font-semibold">Contracts</th>
                <th className="w-[310px] px-4 py-3 font-semibold">Active contract</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.employees.map((employee) => {
                const activeContract = employee.contracts.find((contract) => contract.id === employee.activeContractId)

                return (
                  <tr key={employee.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{employee.displayName}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{employee.employeeNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={employee.userMappingStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={employee.payrollEligible ? "READY" : "MISSING"} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-300">{contractCountLabel(employee.contracts.length)}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">Active ID: {employee.activeContractId ?? "None"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {activeContract ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge value={activeContract.status} />
                            <Badge value={activeContract.signedDocumentHashPresent ? "SIGNED" : "MISSING"} />
                          </div>
                          <p className="break-words text-xs text-slate-300">{activeContract.contractNumber} / {activeContract.type}</p>
                          <p className="text-xs text-slate-400">{dateLabel(activeContract.effectiveFrom)} to {dateLabel(activeContract.effectiveTo)}</p>
                          <p className="break-words text-xs text-slate-500">Amount: {activeContract.baseSalary} {activeContract.currency}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No active contract.</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <BadgeCheck className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Contract rows</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[230px] px-4 py-3 font-semibold">Employee</th>
                <th className="w-[180px] px-4 py-3 font-semibold">Contract</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Period</th>
                <th className="w-[180px] px-4 py-3 font-semibold">Classification</th>
                <th className="w-[180px] px-4 py-3 font-semibold">Amount policy</th>
                <th className="w-[160px] px-4 py-3 font-semibold">Evidence</th>
                <th className="w-[180px] px-4 py-3 font-semibold">Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {contractRows.length ? (
                contractRows.map(({ employee, contract }) => (
                  <tr key={contract.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{employee.displayName}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{employee.employeeNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <Badge value={contract.status} />
                        <p className="break-words text-xs text-slate-400">{contract.contractNumber} / {contract.type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-300">{dateLabel(contract.effectiveFrom)}</p>
                      <p className="mt-1 text-xs text-slate-500">to {dateLabel(contract.effectiveTo)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-300">{contract.classification ?? "No classification"}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{contract.echelon ?? "No echelon"} / {contract.convention ?? "No convention"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-300">{contract.baseSalary} {contract.currency}</p>
                      <p className="mt-1 text-xs text-slate-500">{contract.redactions.length ? "Redacted by policy" : "Visible by permission"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={contract.signedDocumentHashPresent ? "SIGNED" : "MISSING"} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-400">{contract.activatedBusinessEventId ?? "No activation event"}</p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={7}>No contracts are available for the selected payroll employees.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
