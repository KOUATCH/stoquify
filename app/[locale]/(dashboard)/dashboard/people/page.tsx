import Link from "next/link"
import { ArrowRight, CircleAlert, ClipboardCheck, History, ShieldCheck, UserCheck, UsersRound } from "lucide-react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { getHrisEmployeeDirectory } from "@/services/hris/employee.service"
import { routeByKey, withPeopleSurfaceAccess } from "./people-route-access"

export const metadata = {
  title: "People | Stoquify",
  description: "Permission-gated HRIS employee directory and people-readiness workspace.",
}

function readinessLabel(blockers: readonly string[]) {
  return blockers.length === 0 ? "Ready" : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`
}

export default async function PeopleWorkspacePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  const surface = routeByKey("people-workspace")

  if (!surface) {
    throw new Error("Missing people route surface definition: people-workspace")
  }

  return withPeopleSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async (ctx) => {
      const directory = await getHrisEmployeeDirectory({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        actorPermissions: ctx.permissions,
        limit: 50,
      })
      const locationScoped = directory.accessScope.authority.kind === "LOCATION_RESPONSIBILITY_COMPATIBILITY"
      const scopeDescription = locationScoped
        ? "Current employees in locations assigned to you. This is location responsibility, not direct-report authority."
        : "Tenant-scoped identity, employment, mapping, and readiness status."

      return (
        <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
            <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-emerald-200">
                  <UsersRound className="h-4 w-4" aria-hidden="true" />
                  People core
                </div>
                <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">Employee directory</h1>
                <p className="mt-2 text-sm text-slate-300">{scopeDescription}</p>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={localizePath("/dashboard/people/history", locale)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                  >
                    <History className="h-4 w-4" aria-hidden="true" />
                    History
                  </Link>
                  <Link
                    href={localizePath("/dashboard/people/approvals", locale)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-400/20 px-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/10"
                  >
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                    Approvals
                  </Link>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{directory.accessScope.authority.label}</p>
                  {locationScoped ? <p>{directory.accessScope.managedLocations.length} managed location(s)</p> : null}
                  <p>As of {new Date(directory.asOf).toLocaleDateString(locale)}</p>
                </div>
              </div>
            </header>

            <section aria-label="People summary" className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-3">
              <div className="bg-slate-950/90 p-4">
                <p className="text-xs uppercase tracking-normal text-slate-400">Employees</p>
                <p className="mt-1 text-2xl font-semibold text-white">{directory.summary.totalEmployees}</p>
              </div>
              <div className="bg-slate-950/90 p-4">
                <p className="text-xs uppercase tracking-normal text-slate-400">Linked users</p>
                <p className="mt-1 text-2xl font-semibold text-white">{directory.summary.linkedUsers}</p>
              </div>
              <div className="bg-slate-950/90 p-4">
                <p className="text-xs uppercase tracking-normal text-slate-400">Ready candidates</p>
                <p className="mt-1 text-2xl font-semibold text-white">{directory.summary.payrollReadyCandidates}</p>
              </div>
            </section>

            <section aria-labelledby="employee-directory-heading" className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 id="employee-directory-heading" className="text-base font-semibold tracking-normal text-white">People</h2>
                  <p className="mt-1 text-sm text-slate-400">Current workforce identity and readiness records.</p>
                </div>
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-200" aria-label="Redacted directory" />
              </div>

              {directory.employees.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/60 px-5 py-10 text-center">
                  <UsersRound className="mx-auto h-7 w-7 text-slate-500" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-white">No employees found</p>
                  <p className="mt-1 text-sm text-slate-400">People records will appear here after an HRIS profile is created.</p>
                </div>
              ) : (
                <div className="min-w-0 overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                    <thead className="bg-slate-950 text-xs uppercase tracking-normal text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Employee</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Job</th>
                        <th className="px-4 py-3 font-medium">Department</th>
                        <th className="px-4 py-3 font-medium">User mapping</th>
                        <th className="px-4 py-3 font-medium">Readiness</th>
                        <th className="w-12 px-3 py-3"><span className="sr-only">Open profile</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-slate-950/70 text-slate-200">
                      {directory.employees.map((employee) => (
                        <tr key={employee.id} className="transition-colors hover:bg-white/[0.03]">
                          <td className="px-4 py-3">
                            <p className="font-medium text-white">{employee.displayName}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{employee.employment.countryCode ?? "Country not set"}</p>
                          </td>
                          <td className="px-4 py-3">{employee.status}</td>
                          <td className="px-4 py-3">{employee.employment.jobTitle ?? "Not assigned"}</td>
                          <td className="px-4 py-3">{employee.employment.department ?? "Not assigned"}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              {employee.userMapping.state === "LINKED" ? (
                                <UserCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                              ) : (
                                <CircleAlert className="h-4 w-4 text-amber-300" aria-hidden="true" />
                              )}
                              {employee.userMapping.state}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={employee.blockers.length === 0 ? "text-emerald-200" : "text-amber-200"}>
                              {readinessLabel(employee.blockers)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Link
                              href={localizePath(`/dashboard/people/${employee.id}`, locale)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white"
                              title={`Open ${employee.displayName} profile`}
                            >
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Open {employee.displayName} profile</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      )
    },
  })
}
