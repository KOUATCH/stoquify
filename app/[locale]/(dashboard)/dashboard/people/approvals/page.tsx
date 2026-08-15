import Link from "next/link"
import { ArrowLeft, ClipboardCheck, ShieldCheck } from "lucide-react"

import { HrisApprovalInboxView } from "@/components/hris/HrisApprovalInbox"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { getHrisApprovalInbox } from "@/services/hris/approval-inbox.service"
import { routeByKey, withPeopleSurfaceAccess } from "../people-route-access"

export const metadata = {
  title: "People Approvals | Stoquify",
  description: "Scoped HRIS review and apply queue.",
}

export default async function PeopleApprovalsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  const surface = routeByKey("people-approvals")

  if (!surface) {
    throw new Error("Missing people route surface definition: people-approvals")
  }

  return withPeopleSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async (ctx) => {
      let inbox
      try {
        inbox = await getHrisApprovalInbox({
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          actorPermissions: ctx.permissions,
          limit: 100,
        })
      } catch (error) {
        return (
          <DashboardRouteState
            kind="permission_denied"
            title="Unable to load approval queue"
            message="This account does not have approval-read access to this people scope."
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
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  People core
                </div>
                <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">Approval inbox</h1>
              </div>
              <div className="flex items-center gap-2 text-right text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                <div>
                  <p>{inbox.accessScope.authority.label}</p>
                  <p>As of {new Date(inbox.asOf).toLocaleDateString(locale)}</p>
                </div>
              </div>
            </header>

            <HrisApprovalInboxView inbox={inbox} locale={locale} />
          </div>
        </main>
      )
    },
  })
}
