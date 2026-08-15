import Link from "next/link"
import { ArrowLeft, CircleAlert, ShieldCheck, UserRound } from "lucide-react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { getHrisEmployeeProfile } from "@/services/hris/employee.service"
import { routeByKey, withPeopleSurfaceAccess } from "../people-route-access"

export const metadata = {
  title: "Employee profile | Stoquify",
  description: "Tenant-scoped and redacted HRIS employee identity profile.",
}

const blockerLabels: Record<string, string> = {
  EMPLOYEE_NOT_ACTIVE: "Employee is not active",
  USER_MAPPING_NOT_READY: "User mapping is not ready",
  ACTIVE_CONTRACT_MISSING: "Active contract is missing",
  CONTRACT_EVIDENCE_MISSING: "Contract evidence is missing",
  FROZEN_ATTENDANCE_MISSING: "Frozen attendance input is missing",
  PAYMENT_DESTINATION_EVIDENCE_MISSING: "Payment destination evidence is missing",
}

function formatDate(value: string | null, locale: string) {
  return value ? new Date(value).toLocaleDateString(locale) : "Not set"
}

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ locale: string; employeeId: string }>
}) {
  const { locale: rawLocale, employeeId } = await params
  const locale = pickLocale(rawLocale)
  const peopleHref = localizePath("/dashboard/people", locale)

  const surface = routeByKey("people-employee-profile")

  if (!surface) {
    throw new Error("Missing people route surface definition: people-employee-profile")
  }

  return withPeopleSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    permissionOptions: {
      resourceId: employeeId,
    },
    onAllowed: async (ctx) => {
      let profile

      try {
        profile = await getHrisEmployeeProfile({
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          actorPermissions: ctx.permissions,
          employeeId,
        })
      } catch (error) {
        if (error instanceof NotFoundError) {
          return (
            <DashboardRouteState
              kind="not_found"
              title="Employee profile not found"
              message="No employee profile with this reference exists in the active organization."
              primaryHref={peopleHref}
              primaryLabel="Back to people"
            />
          )
        }
        if (error instanceof ForbiddenError) {
          return (
            <DashboardRouteState
              kind="permission_denied"
              title="Employee profile is outside your current responsibility"
              message="Your HRIS access is limited to employees in locations currently assigned to you. Location responsibility is not reporting-line authority."
              primaryHref={peopleHref}
              primaryLabel="Back to people"
            />
          )
        }
        throw error
      }

      const employee = profile.employee
      const details = [
        ["Department", employee.employment.department ?? "Not assigned"],
        ["Job title", employee.employment.jobTitle ?? "Not assigned"],
        ["Cost center", employee.employment.costCenter ?? "Not assigned"],
        ["Country", employee.employment.countryCode ?? "Not set"],
        ["Location", employee.employment.locationId ? "Assigned" : "Not assigned"],
        ["Hire date", formatDate(employee.employment.hireDate, locale)],
        ["Termination date", formatDate(employee.employment.terminationDate, locale)],
        ["User mapping", employee.userMapping.state],
      ]

      return (
        <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[1100px] min-w-0 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
            <Link href={peopleHref} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-300 hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              People
            </Link>

            <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-normal text-emerald-200">Employee profile</p>
                  <h1 className="mt-1 break-words text-2xl font-semibold tracking-normal text-white sm:text-3xl">{employee.displayName}</h1>
                  <p className="mt-1 text-sm text-slate-400">{employee.status}</p>
                  <p className="mt-1 text-xs text-slate-500">{profile.accessScope.authority.label}</p>
                </div>
              </div>
              <span className={`inline-flex w-fit items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm ${employee.blockers.length === 0 ? "text-emerald-200" : "text-amber-200"}`}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {employee.blockers.length === 0 ? "Ready" : `${employee.blockers.length} blockers`}
              </span>
            </header>

            <section aria-labelledby="employment-heading">
              <h2 id="employment-heading" className="mb-3 text-base font-semibold tracking-normal text-white">Employment</h2>
              <dl className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">
                {details.map(([label, value]) => (
                  <div key={label} className="bg-slate-950/80 p-4">
                    <dt className="text-xs uppercase tracking-normal text-slate-400">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="readiness-heading">
              <h2 id="readiness-heading" className="mb-3 text-base font-semibold tracking-normal text-white">Readiness</h2>
              <div className="rounded-lg border border-white/10 bg-slate-950/80 p-4">
                {employee.blockers.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-emerald-100">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Identity and source-data readiness checks currently pass.
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {employee.blockers.map((blocker) => (
                      <li key={blocker} className="flex items-start gap-2 text-sm text-amber-100">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{blockerLabels[blocker] ?? blocker}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </main>
      )
    },
  })
}
