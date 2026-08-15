import Link from "next/link"
import { ArrowLeft, History, ShieldCheck } from "lucide-react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { HrisMovementHistoryView } from "@/components/hris/HrisMovementHistory"
import { localizePath, pickLocale } from "@/i18n/routing"
import { getHrisMovementHistory } from "@/services/hris/movement-history.service"
import { routeByKey, withPeopleSurfaceAccess } from "../people-route-access"

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

  const surface = routeByKey("people-history")

  if (!surface) {
    throw new Error("Missing people route surface definition: people-history")
  }

  return withPeopleSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async (ctx) => {
      let history
      try {
        history = await getHrisMovementHistory({
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          actorPermissions: ctx.permissions,
          limit: 100,
        })
      } catch (error) {
        return (
          <DashboardRouteState
            kind="permission_denied"
            title="Movement history is unavailable"
            message="No movement history was available for your current account and tenant context."
            primaryHref={localizePath("/dashboard/people", locale)}
          />
        )
      }

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
    },
  })
}
