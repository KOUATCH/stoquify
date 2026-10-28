import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  BadgeCheck,
  Calculator,
  ClipboardCheck,
  FileLock2,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react"

import type { CompensationWorkflowResult } from "@/actions/payroll/payroll-compensation.actions"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"

type Props = {
  data: CompensationWorkflowResult | null
  error?: string | null
  locale: Locale
}

function statusTone(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase()
  if (["ACTIVE", "APPROVED", "APPLIED", "SUPPORTED", "PUBLISHED", "READY"].includes(normalized)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
  }
  if (["RETIRED", "REJECTED", "CANCELLED", "BLOCKED", "MISSING", "NOT_SUPPORTED"].includes(normalized)) {
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
          <h1 className="text-base font-semibold">Payroll compensation unavailable</h1>
          <p className="mt-1 break-words text-sm text-rose-100">{message}</p>
        </div>
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5 text-slate-200">
      <h1 className="text-base font-semibold text-white">Payroll compensation</h1>
      <p className="mt-1 text-sm text-slate-400">No compensation workflow records are available.</p>
    </section>
  )
}

function policyLabel(redactions: readonly { reasonCode: string }[]) {
  return redactions.length ? `Redacted: ${redactions.map((redaction) => redaction.reasonCode).join(", ")}` : "Visible by permission"
}

function provenanceLabel(value: string | null | undefined) {
  return value ?? "Tenant-defined"
}

export default function PayrollCompensationWorkbench({ data, error, locale }: Props) {
  if (error) return <ErrorPanel message={error} />
  if (!data) return <EmptyState />

  const salaryChangeRows = data.salaryChanges
  const hasRedaction = data.summary.redactedSalaryChanges > 0 || data.assignments.some((assignment) => assignment.redactions.length > 0)

  return (
    <main className="flex min-w-0 flex-col gap-4 text-slate-100">
      <section className="flex flex-col gap-3 border-b border-white/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200">Payroll compensation</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Compensation approval readiness</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            Rubrique catalog, employee assignments, statutory provenance, and maker-checker salary changes as of {dateLabel(data.asOf)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge value={hasRedaction ? "SALARY REDACTED" : "SALARY VISIBLE"} />
          <Link
            href={localizePath("/dashboard/payroll/contracts", locale)}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/12 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Contracts
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Rubriques" value={data.summary.rubriques} icon={Calculator} tone="bg-sky-400/12 text-sky-200" />
        <Metric label="Active rubriques" value={data.summary.activeRubriques} icon={BadgeCheck} tone="bg-emerald-400/12 text-emerald-200" />
        <Metric label="Assignments" value={data.summary.assignments} icon={ClipboardCheck} tone="bg-cyan-400/12 text-cyan-200" />
        <Metric label="Requested changes" value={data.summary.requestedSalaryChanges} icon={AlertTriangle} tone="bg-amber-400/12 text-amber-200" />
        <Metric label="Approved changes" value={data.summary.approvedSalaryChanges} icon={ShieldCheck} tone="bg-teal-400/12 text-teal-200" />
        <Metric label="Redacted changes" value={data.summary.redactedSalaryChanges} icon={FileLock2} tone="bg-violet-400/12 text-violet-200" />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Landmark className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Rubrique catalog</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[210px] px-4 py-3 font-semibold">Rubrique</th>
                <th className="w-[150px] px-4 py-3 font-semibold">Kind</th>
                <th className="w-[180px] px-4 py-3 font-semibold">Bases</th>
                <th className="w-[220px] px-4 py-3 font-semibold">Posting</th>
                <th className="w-[260px] px-4 py-3 font-semibold">Country pack</th>
                <th className="w-[160px] px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.rubriques.length ? (
                data.rubriques.map((rubrique) => (
                  <tr key={rubrique.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{rubrique.code}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{rubrique.label}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <Badge value={rubrique.kind} />
                        <p className="break-words text-xs text-slate-500">{rubrique.valueType}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-300">Taxable: {rubrique.taxableBase ? "yes" : "no"}</p>
                      <p className="mt-1 text-xs text-slate-300">Social: {rubrique.socialBase ? "yes" : "no"}</p>
                      <p className="mt-1 text-xs text-slate-500">Employer charge: {rubrique.employerCharge ? "yes" : "no"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-300">Payslip: {rubrique.payslipLabel ?? rubrique.label}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">Dr {rubrique.postingDebitAccountCode ?? "unset"} / Cr {rubrique.postingCreditAccountCode ?? "unset"}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{rubrique.statutoryParameterPath ?? "No statutory path"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <p className="break-words text-xs text-slate-300">{rubrique.countryCode ?? "No country"} / {rubrique.countryPackVersion ?? "No pack version"}</p>
                        <p className="break-words text-xs text-slate-500">{rubrique.countryPackSchemaVersion ?? "No schema"} / {provenanceLabel(rubrique.countryPackResolutionHash)}</p>
                        <p className="break-words text-xs text-slate-500">{rubrique.countryPackLegalRef ?? "No legal reference"}</p>
                        <Badge value={rubrique.countryPackVerificationStatus ?? "TENANT_DEFINED"} />
                        <Badge value={rubrique.countryPackCapabilityStatus ?? "CONFIGURED"} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={rubrique.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>No rubriques are available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Employee assignments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[170px] px-4 py-3 font-semibold">Employee</th>
                <th className="w-[150px] px-4 py-3 font-semibold">Rubrique</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Value</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Period</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Policy</th>
                <th className="w-[150px] px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.assignments.length ? (
                data.assignments.map((assignment) => (
                  <tr key={assignment.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{assignment.employeeNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-300">{assignment.rubriqueCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-300">{assignment.amount ?? "No fixed amount"} {assignment.currency}</p>
                      <p className="mt-1 text-xs text-slate-500">Rate bps: {assignment.rateBps ?? "none"} / Qty: {assignment.quantity ?? "none"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-300">{dateLabel(assignment.effectiveFrom)}</p>
                      <p className="mt-1 text-xs text-slate-500">to {dateLabel(assignment.effectiveTo)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-400">{policyLabel(assignment.redactions)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={assignment.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={6}>No employee rubrique assignments are available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.05]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Scale className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Salary change queue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="w-[170px] px-4 py-3 font-semibold">Employee</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Status</th>
                <th className="w-[190px] px-4 py-3 font-semibold">Amounts</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Effective</th>
                <th className="w-[230px] px-4 py-3 font-semibold">Approval chain</th>
                <th className="w-[170px] px-4 py-3 font-semibold">Evidence</th>
                <th className="w-[180px] px-4 py-3 font-semibold">Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {salaryChangeRows.length ? (
                salaryChangeRows.map((change) => (
                  <tr key={change.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="break-words font-semibold text-white">{change.employeeNumber}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">Contract {change.sourceContractId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={change.status} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-300">Current {change.currentBaseSalary} {change.currency}</p>
                      <p className="mt-1 break-words text-xs text-slate-300">Proposed {change.proposedBaseSalary} {change.currency}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-300">{dateLabel(change.effectiveFrom)}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">New contract: {change.supersedingContractId ?? "pending"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-300">Requested by {change.requestedById}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">Approved by {change.approvedById ?? "pending"}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">Applied by {change.appliedById ?? "pending"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-300">Request: {change.evidenceDocumentHashPresent ? "yes" : "no"}</p>
                      <p className="mt-1 text-xs text-slate-500">Approval: {change.approvalEvidenceHashPresent ? "yes" : "no"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="break-words text-xs text-slate-400">{policyLabel(change.redactions)}</p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-400" colSpan={7}>No salary change requests are available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
