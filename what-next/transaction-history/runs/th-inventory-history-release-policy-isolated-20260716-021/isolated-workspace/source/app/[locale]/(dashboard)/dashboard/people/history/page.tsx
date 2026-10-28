import Link from "next/link"
import { ArrowLeft, History, ShieldCheck } from "lucide-react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { HrisMovementHistoryView } from "@/components/hris/HrisMovementHistory"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getHrisMovementHistory } from "@/services/hris/movement-history.service"

export const metadata = {
  title: "People History | Stoquify",
  description: "Scoped and redacted HRIS movement evidence history.",
}

export default async function PeopleHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  let access
  try {
    access = await requireAnyPermission(["hris.people.read"], {
      resource: "HrisMovementHistory",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"
      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "People history needs an active organization" : "People history is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your dashboard session before loading HRIS movement evidence."
              : "Movement history visibility requires HRIS people read access."
          }
          primaryHref={localizePath("/dashboard/people", locale)}
        />
      )
    }
    throw error
  }

  const history = await getHrisMovementHistory({
    organizationId: access.orgId,
    actorId: access.userId,
    actorPermissions: access.permissions,
    limit: 100,
  })

  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Link
              href={localizePath("/dashboard/people", locale)}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              People
            </Link>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-emerald-200">
              <History className="h-4 w-4" aria-hidden="true" />
              People core
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">Movement history</h1>
          </div>
          <div className="flex items-center gap-2 text-right text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            <div>
              <p>{history.accessScope.authority.label}</p>
              <p>As of {new Date(history.asOf).toLocaleDateString(locale)}</p>
            </div>
          </div>
        </header>

        <HrisMovementHistoryView history={history} locale={locale} />
      </div>
    </main>
  )
}
