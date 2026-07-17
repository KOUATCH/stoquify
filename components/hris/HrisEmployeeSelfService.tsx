import Link from "next/link"
import {
  BadgeCheck,
  CalendarClock,
  CreditCard,
  FileText,
  LockKeyhole,
  ReceiptText,
  UserRound,
} from "lucide-react"

import type { HrisEmployeeSelfServiceResult } from "@/services/hris/self-service.service"

type Props = {
  model: HrisEmployeeSelfServiceResult
  payslipsHref: string
  locale: string
}

function formatDate(value: string | null, locale = "en") {
  return value ? new Date(value).toLocaleDateString(locale) : "Not set"
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

function yesNo(value: boolean) {
  return value ? "On file" : "Not on file"
}

export function HrisEmployeeSelfService({ model, payslipsHref, locale }: Props) {
  const employment = model.profile.employment
  const attendance = model.attendance
  const payment = model.paymentDestination
  const profileDetails = [
    ["Employee number", model.profile.employeeNumber],
    ["Job title", employment.jobTitle ?? "Not assigned"],
    ["Department", employment.department ?? "Not assigned"],
    ["Cost center", employment.costCenter ?? "Not assigned"],
    ["Country", employment.countryCode ?? "Not set"],
    ["Location", employment.locationAssigned ? "Assigned" : "Not assigned"],
    ["Hire date", formatDate(employment.hireDate, locale)],
    ["Contract", model.contract.latestStatus ?? "Not active"],
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1180px] min-w-0 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-emerald-200">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Employee self-service
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">My HR</h1>
          <p className="mt-2 break-words text-sm text-slate-300">{model.profile.displayName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-400/20 px-3 text-sm font-medium text-emerald-100">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {model.profile.status}
          </span>
          {model.capabilities.payslips.canRead ? (
            <Link
              href={payslipsHref}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-100 transition hover:bg-white/5"
            >
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
              Payslips
            </Link>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="self-profile-heading">
        <h2 id="self-profile-heading" className="mb-3 text-base font-semibold tracking-normal text-white">Employment profile</h2>
        <dl className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {profileDetails.map(([label, value]) => (
            <div key={label} className="min-w-0 bg-slate-950/80 p-4">
              <dt className="text-xs uppercase tracking-normal text-slate-400">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="documents-heading" className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-200" aria-hidden="true" />
            <h2 id="documents-heading" className="text-base font-semibold tracking-normal text-white">Documents</h2>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-400">References</dt><dd className="mt-1 font-medium text-white">{model.documents.referenceCount}</dd></div>
            <div><dt className="text-slate-400">Signed contract</dt><dd className="mt-1 font-medium text-white">{yesNo(model.documents.signedContractEvidenceOnFile)}</dd></div>
            <div><dt className="text-slate-400">Tax identifier</dt><dd className="mt-1 font-medium text-white">{yesNo(model.documents.taxIdentifierOnFile)}</dd></div>
            <div><dt className="text-slate-400">Social identifier</dt><dd className="mt-1 font-medium text-white">{yesNo(model.documents.socialIdentifierOnFile)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            {model.documents.referenceTypes.length
              ? model.documents.referenceTypes.join(" / ")
              : "No document categories recorded"}
          </p>
        </section>

        <section aria-labelledby="attendance-heading" className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-sky-200" aria-hidden="true" />
            <h2 id="attendance-heading" className="text-base font-semibold tracking-normal text-white">Latest certified attendance</h2>
          </div>
          {attendance ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-white">{formatDate(attendance.periodStart, locale)} to {formatDate(attendance.periodEnd, locale)}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-slate-400">Worked</dt><dd className="mt-1 text-white">{formatMinutes(attendance.totals.workedMinutes)}</dd></div>
                <div><dt className="text-slate-400">Overtime</dt><dd className="mt-1 text-white">{formatMinutes(attendance.totals.overtimeMinutes)}</dd></div>
                <div><dt className="text-slate-400">Leave</dt><dd className="mt-1 text-white">{formatMinutes(attendance.totals.leaveMinutes)}</dd></div>
              </dl>
              <p className="mt-4 text-xs text-slate-500">{attendance.certificationStatus}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No certified attendance snapshot is available.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="payment-heading" className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-amber-200" aria-hidden="true" />
          <h2 id="payment-heading" className="text-base font-semibold tracking-normal text-white">Payment destination</h2>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><p className="text-slate-400">Status</p><p className="mt-1 font-medium text-white">{payment?.state ?? "Not applicable"}</p></div>
          <div><p className="text-slate-400">Method</p><p className="mt-1 font-medium text-white">{payment?.method ?? "Not set"}</p></div>
          <div><p className="text-slate-400">Destination</p><p className="mt-1 font-medium text-white">{payment?.maskedDestination ?? "Not set"}</p></div>
        </div>
        {payment?.latestChange ? (
          <p className="mt-4 text-xs text-slate-500">Latest request: {payment.latestChange.status}</p>
        ) : null}
      </section>

      <section aria-labelledby="requests-heading" className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-slate-300" aria-hidden="true" />
          <h2 id="requests-heading" className="text-base font-semibold tracking-normal text-white">Requests</h2>
        </div>
        <div className="mt-4 divide-y divide-white/10 border-y border-white/10 text-sm">
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">Payment destination change</span><span className="text-right text-amber-200">{model.capabilities.paymentDestinationRequest.canRequest ? "Evidence workflow required" : "Permission required"}</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">Leave request</span><span className="text-right text-slate-500">Not configured</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">Attendance correction</span><span className="text-right text-slate-500">Not configured</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">Profile correction</span><span className="text-right text-slate-500">Not configured</span></div>
        </div>
      </section>
    </div>
  )
}
