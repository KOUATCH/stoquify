import Link from "next/link"
import {
  AlertTriangle,
  BadgeCheck,
  Building2,

  ClipboardCheck,
  LockKeyhole,
  UsersRound,
} from "lucide-react"

import { localizePath } from "@/i18n/routing"
import { HrisOperationalTimeApprovalPanel } from "@/components/hris/HrisOperationalTimeApprovalPanel"
import type { HrisManagerSelfServiceResult } from "@/services/hris/manager-self-service.service"
import type { Locale } from "@/types/bilingual"

type Props = {
  model: HrisManagerSelfServiceResult
  approvalsHref: string
  locale: Locale
}

function formatDate(value: string | null, locale: string) {
  return value ? new Date(value).toLocaleDateString(locale) : "Not available"
}

function formatCode(value: string) {
  return value.toLowerCase().replaceAll("_", " ")
}

export function HrisManagerSelfService({ model, approvalsHref, locale }: Props) {
  const summaryItems = [
    ["Visible workforce", model.summary.workforceCount],
    ["Payroll-input ready", model.summary.readyCount],
    ["Needs attention", model.summary.attentionCount],
    ["Pending approvals", model.summary.visiblePendingApprovals],
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-emerald-200">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            Manager self-service
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">Managed workforce</h1>
          <p className="mt-2 max-w-3xl break-words text-sm text-slate-300">
            {model.scope.authority.label}. This is current location responsibility, not direct-report authority.
          </p>
        </div>
        <Link
          href={approvalsHref}
          className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-md border border-emerald-400/20 px-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/10 lg:self-auto"
        >
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          Approval inbox
        </Link>
      </header>

      <section aria-label="Managed workforce summary">
        <dl className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {summaryItems.map(([label, value]) => (
            <div key={label} className="min-w-0 bg-slate-950/80 p-4">
              <dt className="break-words text-xs uppercase tracking-normal text-slate-400">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="scope-heading" className="border-y border-white/10 py-4">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="scope-heading" className="text-base font-semibold tracking-normal text-white">Responsibility scope</h2>
            <p className="mt-1 text-sm text-slate-300">
              {model.scope.managedLocations.length
                ? model.scope.managedLocations.map((location) => `${location.name} (${location.code})`).join(" / ")
                : "Tenant-wide HRIS administration"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {model.scope.authority.effectiveDating === "CURRENT_ONLY" ? "Current assignments only" : "Administrative scope"}
              {" / "}No historical or delegated authority
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="workforce-heading" className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="workforce-heading" className="text-base font-semibold tracking-normal text-white">Workforce readiness</h2>
          <span className="text-xs text-slate-500">As of {formatDate(model.asOf, locale)}</span>
        </div>
        {model.workforce.length ? (
          <div className="min-w-0 overflow-x-auto border-y border-white/10">
            <table className="w-full min-w-[860px] table-fixed text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase text-slate-400">
                <tr>
                  <th className="w-[23%] px-3 py-3 font-medium">Employee</th>
                  <th className="w-[20%] px-3 py-3 font-medium">Role</th>
                  <th className="w-[14%] px-3 py-3 font-medium">Location</th>
                  <th className="w-[15%] px-3 py-3 font-medium">Contract</th>
                  <th className="w-[15%] px-3 py-3 font-medium">Attendance</th>
                  <th className="w-[13%] px-3 py-3 font-medium">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {model.workforce.map((employee) => (
                  <tr key={employee.profileHref} className="align-top text-slate-200">
                    <td className="px-3 py-3">
                      <Link href={localizePath(employee.profileHref, locale)} className="break-words font-medium text-white hover:text-emerald-200">
                        {employee.displayName}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{employee.status}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="break-words">{employee.employment.jobTitle ?? "Not assigned"}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{employee.employment.department ?? "No department"}</p>
                    </td>
                    <td className="px-3 py-3 break-words">
                      {employee.employment.location
                        ? `${employee.employment.location.name} (${employee.employment.location.code})`
                        : "Not assigned"}
                    </td>
                    <td className="px-3 py-3">
                      <p>{employee.contract.latestStatus ?? "No active contract"}</p>
                      <p className="mt-1 text-xs text-slate-500">{employee.contract.signedEvidenceOnFile ? "Signed evidence on file" : "Signed evidence missing"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>{formatDate(employee.attendance.latestCertifiedPeriodEnd, locale)}</p>
                      <p className="mt-1 text-xs text-slate-500">{employee.attendance.frozenSnapshotCount} certified snapshot(s)</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={employee.readiness.status === "READY" ? "text-emerald-200" : "text-amber-200"}>
                        {employee.readiness.status === "READY" ? "Ready" : "Attention"}
                      </span>
                      {employee.readiness.blockerCodes.length ? (
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {employee.readiness.blockerCodes.map(formatCode).join(" / ")}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="border-y border-white/10 py-6 text-sm text-slate-400">No employees are visible in the current responsibility scope.</p>
        )}
      </section>

      <HrisOperationalTimeApprovalPanel requests={model.operationalTime.requests} />

      <section aria-labelledby="pending-heading">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-200" aria-hidden="true" />
          <h2 id="pending-heading" className="text-base font-semibold tracking-normal text-white">Pending HRIS changes</h2>
        </div>
        {model.approvals.length ? (
          <div className="divide-y divide-white/10 border-y border-white/10">
            {model.approvals.slice(0, 8).map((item, index) => (
              <div key={`${item.domain}:${item.employee.profileHref}:${index}`} className="grid gap-2 py-3 text-sm md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center md:gap-4">
                <div className="min-w-0">
                  <p className="break-words font-medium text-white">{item.title}</p>
                  <p className="mt-1 break-words text-xs text-slate-500">{item.subject}</p>
                </div>
                <Link href={localizePath(item.employee.profileHref, locale)} className="break-words text-slate-300 hover:text-white">
                  {item.employee.displayName}
                </Link>
                <div className="text-left md:text-right">
                  <p className={item.decision.eligible ? "text-emerald-200" : "text-amber-200"}>
                    {item.decision.eligible ? "Action permitted" : "HR admin review required"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(item.requestedAt, locale)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-y border-white/10 py-6 text-sm text-slate-400">No pending HRIS changes are visible in this scope.</p>
        )}
      </section>

      <section aria-labelledby="boundaries-heading" className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-slate-300" aria-hidden="true" />
          <h2 id="boundaries-heading" className="text-base font-semibold tracking-normal text-white">Operational boundaries</h2>
        </div>
        <div className="mt-4 divide-y divide-white/10 border-y border-white/10 text-sm">
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">Approval decisions</span><span className={model.capabilities.approvalDecisions.available ? "text-emerald-200" : "text-amber-200"}>{model.capabilities.approvalDecisions.available ? "Authorized items only" : "HR admin authority required"}</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">Reporting-line workflows</span><span className="text-right text-slate-500">Not modeled</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">Leave, overtime and corrections</span><span className="text-right text-emerald-200">Operational</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">Onboarding and offboarding tasks</span><span className="text-right text-slate-500">Not configured</span></div>
          <div className="flex items-center justify-between gap-4 py-3"><span className="text-slate-200">Raw documents</span><span className="text-right text-slate-500">Excluded</span></div>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
          {model.summary.attentionCount ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" /> : <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />}
          <span>Salary, personal identifiers, payment destinations, document hashes, and raw documents are excluded from this workspace.</span>
        </div>
      </section>
    </div>
  )
}
