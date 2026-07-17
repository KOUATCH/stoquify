import Link from "next/link"
import {
  AlertTriangle,
  CalendarClock,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react"

import type { PayrollEmployeeSourceDataResult } from "@/actions/payroll/payroll-employee.actions"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"

type Props = {
  data: PayrollEmployeeSourceDataResult | null
  error?: string | null
  locale: Locale
}

function statusTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase()
  if (["ACTIVE", "LINKED", "READY", "CLEAN", "ALLOW"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["ORPHANED", "TERMINATED", "ARCHIVED", "BLOCKED", "MISSING"].includes(normalized)) {
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
  if (!value) return "Pending"
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
  icon: typeof UsersRound
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
          <h1 className="text-base font-semibold">Payroll employees unavailable</h1>
          <p className="mt-1 break-words text-sm text-rose-100">{message}</p>
        </div>
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h1 className="text-base font-semibold text-white">Payroll employees</h1>
      <p className="mt-1 text-sm text-slate-400">No employee source-data records are available.</p>
    </section>
  )
}

function blockerLabel(blockers: readonly string[]) {
  return blockers.length ? blockers.join(", ") : "READY"
}

export default function PayrollEmployeeSourceWorkbench({ data, error, locale }: Props) {
  if (error) return <ErrorPanel message={error} />
  if (!data) return <EmptyState />

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">Payroll employees</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Employee source-data readiness</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Tenant-owned employee records, user mapping, contract evidence, attendance freeze state, and payment destination proof as of {dateLabel(data.asOf)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={data.redaction.salaryDecision.mode.toUpperCase()} />
          <Link
            href={localizePath("/dashboard/payroll/setup", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Setup
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Employees" value={data.summary.totalEmployees} icon={UsersRound} tone="bg-sky-400/12 text-sky-200" />
        <Metric label="Linked users" value={data.summary.linkedUsers} icon={UserCheck} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label="Active contract ready" value={data.summary.activeContractReady} icon={FileCheck2} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label="Frozen attendance" value={data.summary.frozenAttendanceReady} icon={CalendarClock} tone="bg-violet-400/12 text-violet-200" />
        <Metric label="Ready candidates" value={data.summary.payrollReadyCandidates} icon={ShieldCheck} tone="bg-teal-400/12 text-teal-200" />
        <Metric label="Unmapped" value={data.summary.unmappedEmployees} icon={AlertTriangle} tone="bg-amber-400/12 text-amber-200" />
        <Metric label="Orphaned mappings" value={data.summary.orphanedUserMappings} icon={LockKeyhole} tone="bg-rose-400/12 text-rose-200" />
        <Metric label="Source records" value={data.employees.length} icon={UsersRound} tone="bg-slate-400/12 text-slate-200" />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Readiness rows</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[220px] px-4 py-3 font-semibold">Employee</th>
                <th className="w-[170px] px-4 py-3 font-semibold">User mapping</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Employment</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Contract</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Attendance</th>
                <th className="w-[180px] px-4 py-3 font-semibold">Evidence</th>
                <th className="w-[260px] px-4 py-3 font-semibold">Blockers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.employees.map((employee) => (
                <tr key={employee.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="break-words font-semibold text-white">{employee.displayName}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">{employee.employeeNumber} / {employee.employment.costCenter ?? "No cost center"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Badge value={employee.userMapping.state} />
                      <p className="break-words text-xs text-slate-400">{employee.userMapping.userDisplayName ?? "No linked user"}</p>
                      <p className="break-words text-xs text-slate-500">{employee.userMapping.userEmailMasked ?? "No masked email"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Badge value={employee.status} />
                      <p className="text-xs text-slate-400">Hire {dateLabel(employee.employment.hireDate)}</p>
                      <p className="break-words text-xs text-slate-500">{employee.employment.department ?? "No department"} / {employee.employment.jobTitle ?? "No job title"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Badge value={employee.contractReadiness.latestContractStatus ?? "MISSING"} />
                      <p className="text-xs text-slate-400">{employee.contractReadiness.activeContractCount} active contract(s)</p>
                      <p className="text-xs text-slate-500">Signed evidence: {employee.contractReadiness.hasSignedDocumentEvidence ? "yes" : "no"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Badge value={employee.attendanceReadiness.frozenSnapshotCount > 0 ? "FROZEN" : "MISSING"} />
                      <p className="text-xs text-slate-400">{employee.attendanceReadiness.frozenSnapshotCount} frozen snapshot(s)</p>
                      <p className="text-xs text-slate-500">Latest {dateLabel(employee.attendanceReadiness.latestFrozenPeriodEnd)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Badge value={employee.evidence.hasPaymentDestinationHash ? "PAYMENT_READY" : "PAYMENT_MISSING"} />
                      <p className="break-words text-xs text-slate-400">{employee.evidence.referenceCount} reference(s)</p>
                      <p className="break-all text-xs text-slate-500">{employee.evidence.latestDocumentHash ?? "No document hash"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="break-words text-xs text-slate-300">{blockerLabel(employee.blockers)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
